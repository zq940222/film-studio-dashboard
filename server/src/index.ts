import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig, rememberWorkspace, type UserConfig } from './config.js';
import { fetchCredit } from './credit.js';
import { scanOverview, scanProject } from './scan.js';
import { checkWorkspace } from './workspace.js';
import type { StateResponse } from '../../shared/types.js';

/** 版本号读自根 package.json（发布产物在包根、dev 时在仓库根），与包/tag 保持一致。
 *  按 name 匹配根包，跳过 dev 环境下先遇到的 server/package.json。 */
function readVersion(): string {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 8; i += 1) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf-8')) as {
        name?: string;
        version?: string;
      };
      if (parsed.name === 'film-studio-dashboard') return parsed.version ?? '0.0.0';
    } catch {
      // 该层没有 package.json，继续向上找
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return '0.0.0';
}

const VERSION = readVersion();
const PORT = Number(process.env.PORT ?? 5799);
const HOST = '127.0.0.1'; // 只绑本机，绝不对外暴露

// ---------- 启动参数：可选传工作目录（位置参数或 --workspace <path>） ----------
function workspaceFromArgs(): string | null {
  const args = process.argv.slice(2);
  const flagIdx = args.indexOf('--workspace');
  if (flagIdx >= 0 && args[flagIdx + 1]) return path.resolve(args[flagIdx + 1]);
  const positional = args.find((a) => !a.startsWith('-'));
  return positional ? path.resolve(positional) : null;
}

let config: UserConfig = loadConfig();
const argWorkspace = workspaceFromArgs();
if (argWorkspace) {
  const check = checkWorkspace(argWorkspace);
  if (check.ok) {
    config = rememberWorkspace(config, argWorkspace);
  } else {
    console.error(`[film-studio-dashboard] 启动参数指定的工作目录无效：${argWorkspace}（${check.reason}）`);
  }
}

function activeWorkspace(): string | null {
  if (!config.active) return null;
  return checkWorkspace(config.active).ok ? config.active : null;
}

// ---------- 轻量 TTL 缓存：轮询打满时也只按节奏读盘 ----------
const cache = new Map<string, { at: number; data: unknown }>();
function cached<T>(key: string, ttlMs: number, compute: () => T): T {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.data as T;
  const data = compute();
  cache.set(key, { at: Date.now(), data });
  return data;
}

const app = express();
app.use(express.json());

// ---------- 状态与工作区切换 ----------
app.get('/api/state', (_req, res) => {
  const state: StateResponse = {
    active: config.active,
    activeValid: activeWorkspace() !== null,
    recent: config.recent,
    version: VERSION,
  };
  res.json(state);
});

app.post('/api/workspace', (req, res) => {
  const p = typeof req.body?.path === 'string' ? req.body.path.trim() : '';
  if (!p) return res.status(400).json({ ok: false, error: '缺少 path' });
  const resolved = path.resolve(p);
  const check = checkWorkspace(resolved);
  if (!check.ok) return res.status(400).json({ ok: false, error: check.reason });
  config = rememberWorkspace(config, resolved);
  cache.clear();
  return res.json({ ok: true, active: resolved, projectCount: check.projectCount });
});

// ---------- 只读观测 ----------
app.get('/api/overview', (_req, res) => {
  const ws = activeWorkspace();
  if (!ws) return res.status(409).json({ error: '未选择有效的工作目录' });
  return res.json(cached(`overview:${ws}`, 1000, () => scanOverview(ws)));
});

app.get('/api/project/:dir', (req, res) => {
  const ws = activeWorkspace();
  if (!ws) return res.status(409).json({ error: '未选择有效的工作目录' });
  const dir = req.params.dir;
  if (dir.includes('..') || dir.includes('/') || dir.includes('\\')) {
    return res.status(400).json({ error: '非法项目名' });
  }
  const detail = cached(`project:${ws}:${dir}`, 1000, () => scanProject(ws, dir));
  if (!detail) return res.status(404).json({ error: '项目不存在或 project.json 不可读' });
  return res.json(detail);
});

const DOC_EXT = new Set(['.md', '.txt', '.srt', '.json']);
app.get('/api/doc', (req, res) => {
  const ws = activeWorkspace();
  if (!ws) return res.status(409).json({ error: '未选择有效的工作目录' });
  const rel = typeof req.query.p === 'string' ? req.query.p : '';
  const abs = path.resolve(ws, rel);
  // 路径穿越防护：解析后必须仍在工作区内
  if (!abs.startsWith(path.resolve(ws) + path.sep)) return res.status(400).json({ error: '非法路径' });
  if (!DOC_EXT.has(path.extname(abs).toLowerCase())) return res.status(400).json({ error: '仅支持文本类文件' });
  try {
    const st = fs.statSync(abs);
    if (st.size > 2 * 1024 * 1024) return res.status(413).json({ error: '文件过大' });
    return res.json({ path: rel, content: fs.readFileSync(abs, 'utf-8'), mtimeMs: st.mtimeMs });
  } catch {
    return res.status(404).json({ error: '文件不存在' });
  }
});

// ---------- 积分（唯一 CLI 调用，只读） ----------
app.get('/api/credit', async (_req, res) => {
  res.json(await fetchCredit());
});

// ---------- 媒体服务（sendFile + root 自带 Range 与穿越防护） ----------
app.get('/media/*', (req, res) => {
  const ws = activeWorkspace();
  if (!ws) return res.status(409).end();
  const rel = decodeURIComponent(req.path.replace(/^\/media\//, ''));
  return res.sendFile(rel, { root: ws, dotfiles: 'deny' }, (err) => {
    if (err && !res.headersSent) res.status(404).end();
  });
});

// ---------- 生产模式：伺服前端构建产物 ----------
function findWebDist(): string | null {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i += 1) {
    const candidate = path.join(dir, 'web', 'dist', 'index.html');
    if (fs.existsSync(candidate)) return path.dirname(candidate);
    dir = path.dirname(dir);
  }
  return null;
}

const webDist = findWebDist();
if (webDist) {
  app.use(express.static(webDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/media/')) return next();
    return res.sendFile(path.join(webDist, 'index.html'));
  });
}

app.listen(PORT, HOST, () => {
  console.log(`[film-studio-dashboard] http://${HOST}:${PORT}  workspace=${config.active ?? '(未选择)'}`);
  if (!webDist) console.log('[film-studio-dashboard] 未发现 web/dist，当前为纯 API 模式（开发时请另起 vite）');
});
