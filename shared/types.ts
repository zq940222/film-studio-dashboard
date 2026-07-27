/**
 * 工作区文件格式契约（与 film-studio 插件的唯一隐式契约）。
 * 来源：插件 agents/producer.md（project.json）、agents/cinematographer.md（shotlist.json）。
 * 仪表盘对这些文件严格只读。
 */

export type StageStatus = 'pending' | 'in_progress' | 'approved' | 'done';
export type ShotStatus = 'pending' | 'submitted' | 'success' | 'failed';
export type ShotMode =
  | 'multimodal2video'
  | 'text2video'
  | 'image2video'
  | 'frames2video'
  | 'multiframe2video';

export type Medium = 'short-drama' | 'short-film' | 'anime';

/** projects/<片名>/project.json（老项目可能缺 medium/style/editing 字段） */
export interface ProjectJson {
  title?: string;
  genre?: string;
  format?: {
    medium?: Medium;
    ratio?: string;
    episode_duration_sec?: number;
    episodes?: number;
    style?: { preset?: string; name?: string };
  };
  editing?: {
    episode_overlap?: { enabled?: boolean; seconds?: number };
    intro_outro?: { enabled?: boolean };
  };
  status?: Partial<Record<StageKey, StageStatus>>;
  credits?: { spent?: number; notes?: string };
  created?: string;
}

export type StageKey = 'script' | 'storyboard' | 'design' | 'footage' | 'final';
export const STAGE_ORDER: StageKey[] = ['script', 'storyboard', 'design', 'footage', 'final'];

/** 04-footage/ep{NN}/shotlist.json 中的单镜（只挑仪表盘展示所需字段） */
export interface Shot {
  id: string;
  mode?: ShotMode;
  prompt?: string | null;
  duration?: number;
  model?: string | null;
  resolution?: string | null;
  silent?: boolean;
  status?: ShotStatus;
  submit_id?: string | null;
  file?: string | null;
  /** 质检/失败备注等未知字段原样透传 */
  [k: string]: unknown;
}

export interface ShotCounts {
  total: number;
  success: number;
  submitted: number;
  failed: number;
  pending: number;
}

export interface EpisodeInfo {
  ep: string; // "ep01"
  shotlistPath: string | null; // workspace 相对路径
  ratio?: string;
  shots: Shot[];
  counts: ShotCounts;
  srt: string | null;
  audio: FileEntry[]; // ep 目录及 bgm/ 下的音频文件（BGM 等，供试听）
  videos: string[]; // ep 目录下全部 mp4（含未收编中间产物）
}

export interface FileEntry {
  /** workspace 相对路径（正斜杠） */
  path: string;
  name: string;
  size: number;
  mtimeMs: number;
}

export interface DesignInfo {
  styleBible: string | null;
  characters: FileEntry[];
  scenes: FileEntry[];
  keyframes: FileEntry[];
  raw: FileEntry[];
}

export interface PublishInfo {
  ep: string;
  copy: string | null;
  cover: string | null;
  log: string | null;
}

export interface ProjectSummary {
  /** projects/ 下目录名 */
  dir: string;
  title: string;
  medium: Medium;
  ratio: string;
  episodes: number;
  styleName: string | null;
  stages: Record<StageKey, StageStatus>;
  shotCounts: ShotCounts;
  creditsSpent: number;
  created: string | null;
  /** 卡点与下一步建议 */
  nextStep: { command: string; label: string; gate: string | null };
  updatedAtMs: number;
}

export interface ProjectDetail extends ProjectSummary {
  projectJson: ProjectJson;
  episodesInfo: EpisodeInfo[];
  design: DesignInfo;
  /** 分组的 markdown 文档（工作区相对路径） */
  docs: { group: string; files: FileEntry[] }[];
  finals: FileEntry[];
  publish: PublishInfo[];
  creditsNotes: string | null;
}

export interface OverviewResponse {
  workspace: string;
  scannedAt: number;
  projects: ProjectSummary[];
}

export interface StateResponse {
  active: string | null;
  activeValid: boolean;
  recent: string[];
  version: string;
}

/** 目录浏览：仅用于在页面里挑选工作目录，只列子目录名、不涉及文件内容 */
export interface FsEntry {
  name: string;
  path: string;
  /** 该子目录看起来是个 film-studio 工作区（含 projects/） */
  isWorkspace: boolean;
}

export interface FsListResponse {
  /** 当前目录绝对路径 */
  path: string;
  /** 上一级目录；已是文件系统根时为 null */
  parent: string | null;
  /** 当前目录本身是否为有效工作区 */
  isWorkspace: boolean;
  entries: FsEntry[];
}

export interface CreditResponse {
  ok: boolean;
  balance: number | null;
  raw: string;
  checkedAt: number;
  error?: string;
}
