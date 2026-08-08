import fs from 'node:fs';
import path from 'node:path';
import type {
  DesignInfo,
  EpisodeInfo,
  FileEntry,
  Medium,
  OverviewResponse,
  ProjectDetail,
  ProjectJson,
  ProjectSummary,
  PublishInfo,
  Shot,
  ShotCounts,
  ShotStatus,
  StageKey,
  StageStatus,
} from '../../shared/types.js';
import { STAGE_ORDER } from '../../shared/types.js';

/** 全部扫描为只读；任何异常降级为空数据，绝不让单个坏文件拖垮总览 */

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const AUDIO_EXT = new Set(['.mp3', '.wav', '.m4a', '.flac', '.aac', '.ogg']);

function toRel(workspace: string, abs: string): string {
  return path.relative(workspace, abs).split(path.sep).join('/');
}

/**
 * shotlist.json 的 shot.file 由插件写入，其路径基准未在契约里钦定（可能是纯文件名
 * `shNN.mp4`、相对 ep 目录/项目目录、或工作区相对，甚至含反斜杠）。/media 需要的是
 * 「工作区相对、正斜杠」路径。这里按多个基准探测真实存在的那个并归一化；找不到就退回
 * 归一化原值（不劣于旧行为）。这是“镜头视频播放不了”的根因修复。
 */
function resolveShotFile(
  workspace: string,
  projectDir: string,
  epDir: string,
  file: unknown,
): string | null {
  if (typeof file !== 'string' || !file.trim()) return null;
  const norm = file.trim().replace(/\\/g, '/'); // 兼容 Windows 写入的反斜杠
  const bases = path.isAbsolute(norm)
    ? [norm]
    : [path.resolve(epDir, norm), path.resolve(projectDir, norm), path.resolve(workspace, norm)];
  for (const abs of bases) {
    try {
      if (fs.statSync(abs).isFile()) {
        const rel = toRel(workspace, abs);
        if (!rel.startsWith('../')) return rel; // 必须在工作区内（/media 的 root=workspace）
      }
    } catch {
      // 该基准不存在，试下一个
    }
  }
  return norm; // 落盘位置没找到：退回归一化原值（与旧行为一致）
}

/**
 * 契约（插件仓 agents/cinematographer.md）规定镜头字段是 `id` / `status` / `file`，四态为
 * pending|submitted|success|failed。但实际落盘的 shotlist.json 存在别名漂移——同一工作区里
 * 见过：路径写成 `output`、镜号写成 `shot_id`/`shot`、状态写成 `done`/`querying`。
 * 仪表盘是只读观测面、不回写工作区，所以容错只能做在读取侧：契约名优先、别名兜底，
 * 未知值一律原样透传（计数落进 pending 桶，与旧行为一致）。
 */
const ID_KEYS = ['id', 'shot_id', 'shot'] as const;
const FILE_KEYS = ['file', 'output'] as const;
const CONTRACT_STATUS = new Set<string>(['pending', 'submitted', 'success', 'failed']);
const STATUS_ALIAS: Record<string, ShotStatus> = {
  done: 'success', // 已下载收货
  querying: 'submitted', // 已提交、轮询中
};

function firstString(raw: Record<string, unknown>, keys: readonly string[]): unknown {
  for (const k of keys) {
    const v = raw[k];
    if (typeof v === 'string' && v.trim()) return v;
  }
  return undefined;
}

function normalizeStatus(raw: unknown): ShotStatus | undefined {
  if (typeof raw !== 'string' || !raw.trim()) return undefined;
  const v = raw.trim().toLowerCase();
  if (CONTRACT_STATUS.has(v)) return v as ShotStatus;
  // 未知状态保留原文：界面照旧显示该字符串，countShots 仍按 pending 计
  return STATUS_ALIAS[v] ?? (raw as ShotStatus);
}

function normalizeShot(
  workspace: string,
  projectDir: string,
  epDir: string,
  raw: Shot,
  index: number,
): Shot {
  const r = raw as Record<string, unknown>;
  const id = firstString(r, ID_KEYS);
  return {
    ...raw,
    // 兜底用序号，保证镜号非空、前端 key 唯一（缺 id 的 shotlist 见过）
    id: typeof id === 'string' ? id.trim() : `#${index + 1}`,
    status: normalizeStatus(r.status),
    file: resolveShotFile(workspace, projectDir, epDir, firstString(r, FILE_KEYS)),
  };
}

function safeReadJson<T>(file: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8')) as T;
  } catch {
    return null;
  }
}

function listFiles(workspace: string, dir: string, extFilter?: Set<string>): FileEntry[] {
  try {
    return fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile())
      .filter((e) => !extFilter || extFilter.has(path.extname(e.name).toLowerCase()))
      .map((e) => {
        const abs = path.join(dir, e.name);
        const st = fs.statSync(abs);
        return { path: toRel(workspace, abs), name: e.name, size: st.size, mtimeMs: st.mtimeMs };
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  } catch {
    return [];
  }
}

function countShots(shots: Shot[]): ShotCounts {
  const counts: ShotCounts = { total: shots.length, success: 0, submitted: 0, failed: 0, pending: 0 };
  for (const s of shots) {
    if (s.status === 'success') counts.success += 1;
    else if (s.status === 'submitted') counts.submitted += 1;
    else if (s.status === 'failed') counts.failed += 1;
    else counts.pending += 1;
  }
  return counts;
}

function mergeCounts(list: ShotCounts[]): ShotCounts {
  return list.reduce(
    (acc, c) => ({
      total: acc.total + c.total,
      success: acc.success + c.success,
      submitted: acc.submitted + c.submitted,
      failed: acc.failed + c.failed,
      pending: acc.pending + c.pending,
    }),
    { total: 0, success: 0, submitted: 0, failed: 0, pending: 0 },
  );
}

function scanEpisodes(workspace: string, projectDir: string): EpisodeInfo[] {
  const footageDir = path.join(projectDir, '04-footage');
  let epDirs: string[] = [];
  try {
    epDirs = fs
      .readdirSync(footageDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && /^ep\d+$/i.test(e.name))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }

  return epDirs.map((ep) => {
    const epDir = path.join(footageDir, ep);
    const shotlistFile = path.join(epDir, 'shotlist.json');
    const shotlist = safeReadJson<{ ratio?: string; shots?: Shot[] }>(shotlistFile);
    const shots = (Array.isArray(shotlist?.shots) ? shotlist.shots : []).map((s, i) =>
      normalizeShot(workspace, projectDir, epDir, s, i),
    );
    const srtFiles = listFiles(workspace, epDir, new Set(['.srt']));
    const videos = listFiles(workspace, epDir, new Set(['.mp4', '.mov', '.webm']));
    // 音频：ep 目录直放的 + bgm/ 子目录里的（两处目录不重叠），按名排序
    const audio = [
      ...listFiles(workspace, epDir, AUDIO_EXT),
      ...listFiles(workspace, path.join(epDir, 'bgm'), AUDIO_EXT),
    ].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    return {
      ep,
      shotlistPath: fs.existsSync(shotlistFile) ? toRel(workspace, shotlistFile) : null,
      ratio: shotlist?.ratio,
      shots,
      counts: countShots(shots),
      srt: srtFiles[0]?.path ?? null,
      audio,
      videos: videos.map((f) => f.path),
    };
  });
}

function readStages(pj: ProjectJson): Record<StageKey, StageStatus> {
  const stages = {} as Record<StageKey, StageStatus>;
  for (const key of STAGE_ORDER) {
    const value = pj.status?.[key];
    stages[key] =
      value === 'in_progress' || value === 'approved' || value === 'done' ? value : 'pending';
  }
  return stages;
}

/** 复刻 /studio-status 的"卡在哪、下一步"判断（只读推断，不承载门禁本身） */
function deriveNextStep(
  stages: Record<StageKey, StageStatus>,
  counts: ShotCounts,
): ProjectSummary['nextStep'] {
  const passed = (s: StageStatus) => s === 'approved' || s === 'done';

  if (!passed(stages.script)) {
    return {
      command: '/script',
      label: stages.script === 'in_progress' ? '剧本创作中，迭代至定稿' : '开始剧本创作',
      gate: stages.script === 'in_progress' ? '门禁① 剧本定稿' : null,
    };
  }
  if (!passed(stages.storyboard)) {
    return { command: '/storyboard', label: '拆分镜表', gate: null };
  }
  if (!passed(stages.design)) {
    return {
      command: '/design',
      label: stages.design === 'in_progress' ? '设定图迭代至定稿' : '生成角色/场景设定图',
      gate: stages.design === 'in_progress' ? '门禁② 设定图定稿' : null,
    };
  }
  if (stages.footage !== 'done') {
    if (counts.submitted > 0) {
      return { command: '/studio-status', label: `收割 ${counts.submitted} 个挂起任务`, gate: null };
    }
    const remaining = counts.pending + counts.failed;
    if (counts.total === 0) {
      return { command: '/shoot', label: '生成视频镜头（先过报价）', gate: '门禁③ 积分报价确认' };
    }
    if (remaining > 0) {
      return { command: '/shoot', label: `补 ${remaining} 镜`, gate: '门禁③ 积分报价确认' };
    }
    return { command: '/review', label: '镜头齐了，进入审片', gate: null };
  }
  if (stages.final !== 'done') {
    return { command: '/finalcut', label: '精剪成片', gate: null };
  }
  return { command: '/publish', label: '发布（或已完结）', gate: '门禁④ 发布确认' };
}

function latestMtime(dir: string, depth = 3): number {
  let latest = 0;
  if (depth < 0) return latest;
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return latest;
  }
  for (const e of entries) {
    const abs = path.join(dir, e.name);
    try {
      const st = fs.statSync(abs);
      latest = Math.max(latest, st.mtimeMs);
      if (e.isDirectory()) latest = Math.max(latest, latestMtime(abs, depth - 1));
    } catch {
      // 跳过不可读条目
    }
  }
  return latest;
}

function summarize(workspace: string, dir: string): ProjectSummary | null {
  const projectDir = path.join(workspace, 'projects', dir);
  const pj = safeReadJson<ProjectJson>(path.join(projectDir, 'project.json'));
  if (!pj) return null;

  const stages = readStages(pj);
  const episodes = scanEpisodes(workspace, projectDir);
  const shotCounts = mergeCounts(episodes.map((e) => e.counts));
  const medium: Medium = pj.format?.medium ?? 'short-drama'; // 老项目默认短剧（契约见插件 producer.md）

  return {
    dir,
    title: pj.title ?? dir,
    medium,
    ratio: pj.format?.ratio ?? '9:16',
    episodes: pj.format?.episodes ?? episodes.length,
    styleName: pj.format?.style?.name ?? null,
    stages,
    shotCounts,
    creditsSpent: pj.credits?.spent ?? 0,
    created: pj.created ?? null,
    nextStep: deriveNextStep(stages, shotCounts),
    updatedAtMs: latestMtime(projectDir),
  };
}

export function scanOverview(workspace: string): OverviewResponse {
  const projectsDir = path.join(workspace, 'projects');
  let dirs: string[] = [];
  try {
    dirs = fs
      .readdirSync(projectsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    dirs = [];
  }
  const projects = dirs
    .map((d) => summarize(workspace, d))
    .filter((p): p is ProjectSummary => p !== null)
    .sort((a, b) => b.updatedAtMs - a.updatedAtMs);
  return { workspace, scannedAt: Date.now(), projects };
}

function scanDesign(workspace: string, projectDir: string): DesignInfo {
  const designDir = path.join(projectDir, '03-design');
  const styleBible = path.join(designDir, 'style-bible.md');
  return {
    styleBible: fs.existsSync(styleBible) ? toRel(workspace, styleBible) : null,
    characters: listFiles(workspace, path.join(designDir, 'characters'), IMAGE_EXT),
    scenes: listFiles(workspace, path.join(designDir, 'scenes'), IMAGE_EXT),
    keyframes: listFiles(workspace, path.join(designDir, 'keyframes'), IMAGE_EXT),
    raw: listFiles(workspace, path.join(designDir, '_raw'), IMAGE_EXT),
  };
}

function scanDocs(workspace: string, projectDir: string): ProjectDetail['docs'] {
  const groups: { group: string; sub: string }[] = [
    { group: '剧本', sub: '01-script' },
    { group: '分镜', sub: '02-storyboard' },
    { group: '设定', sub: '03-design' },
    { group: '审片与生成', sub: '04-footage' },
    { group: '成片交付', sub: '05-final' },
    { group: '发布', sub: '06-publish' },
  ];
  const mdIn = (dir: string, depth: number): FileEntry[] => {
    let out: FileEntry[] = listFiles(workspace, dir, new Set(['.md']));
    if (depth > 0) {
      try {
        for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          if (e.isDirectory()) out = out.concat(mdIn(path.join(dir, e.name), depth - 1));
        }
      } catch {
        // 忽略
      }
    }
    return out;
  };
  return groups
    .map(({ group, sub }) => ({ group, files: mdIn(path.join(projectDir, sub), 2) }))
    .filter((g) => g.files.length > 0);
}

function scanPublish(workspace: string, projectDir: string): PublishInfo[] {
  const pubDir = path.join(projectDir, '06-publish');
  let epDirs: string[] = [];
  try {
    epDirs = fs
      .readdirSync(pubDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && /^ep\d+$/i.test(e.name))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
  return epDirs.map((ep) => {
    const rel = (f: string) => {
      const abs = path.join(pubDir, ep, f);
      return fs.existsSync(abs) ? toRel(workspace, abs) : null;
    };
    return { ep, copy: rel('copy.md'), cover: rel('cover.png'), log: rel('publish-log.md') };
  });
}

export function scanProject(workspace: string, dir: string): ProjectDetail | null {
  const summary = summarize(workspace, dir);
  if (!summary) return null;
  const projectDir = path.join(workspace, 'projects', dir);
  const pj = safeReadJson<ProjectJson>(path.join(projectDir, 'project.json'))!;
  return {
    ...summary,
    projectJson: pj,
    episodesInfo: scanEpisodes(workspace, projectDir),
    design: scanDesign(workspace, projectDir),
    docs: scanDocs(workspace, projectDir),
    finals: listFiles(workspace, path.join(projectDir, '05-final'), new Set(['.mp4', '.mov', '.webm'])),
    publish: scanPublish(workspace, projectDir),
    creditsNotes: pj.credits?.notes ?? null,
  };
}
