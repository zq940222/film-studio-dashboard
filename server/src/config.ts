import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** 用户级配置：最近工作目录 + 当前激活目录（仪表盘自身的记忆，与工作区无关） */
export interface UserConfig {
  active: string | null;
  recent: string[];
}

const CONFIG_DIR = path.join(os.homedir(), '.film-studio-dashboard');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const MAX_RECENT = 8;

export function loadConfig(): UserConfig {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<UserConfig>;
    return {
      active: typeof parsed.active === 'string' ? parsed.active : null,
      recent: Array.isArray(parsed.recent) ? parsed.recent.filter((r) => typeof r === 'string') : [],
    };
  } catch {
    return { active: null, recent: [] };
  }
}

export function saveConfig(config: UserConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function rememberWorkspace(config: UserConfig, workspace: string): UserConfig {
  const normalized = path.resolve(workspace);
  const recent = [normalized, ...config.recent.filter((r) => path.resolve(r) !== normalized)].slice(
    0,
    MAX_RECENT,
  );
  const next: UserConfig = { active: normalized, recent };
  saveConfig(next);
  return next;
}
