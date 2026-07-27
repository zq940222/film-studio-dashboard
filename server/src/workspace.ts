import fs from 'node:fs';
import path from 'node:path';

/**
 * 工作区 = film-studio 插件 /new-drama 生成的创作根目录（含 projects/）。
 * 校验规则：目录存在，且含 projects/ 子目录（允许暂时没有任何项目——空工作区也合法）。
 */
export interface WorkspaceCheck {
  ok: boolean;
  reason?: string;
  projectCount?: number;
}

export function checkWorkspace(dir: string): WorkspaceCheck {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(dir);
  } catch {
    return { ok: false, reason: '目录不存在或不可访问' };
  }
  if (!stat.isDirectory()) return { ok: false, reason: '路径不是目录' };

  const projectsDir = path.join(dir, 'projects');
  if (!fs.existsSync(projectsDir) || !fs.statSync(projectsDir).isDirectory()) {
    return { ok: false, reason: '缺少 projects/ 子目录——请选择 /new-drama 初始化过的工作区根目录' };
  }

  let projectCount = 0;
  try {
    for (const entry of fs.readdirSync(projectsDir, { withFileTypes: true })) {
      if (entry.isDirectory() && fs.existsSync(path.join(projectsDir, entry.name, 'project.json'))) {
        projectCount += 1;
      }
    }
  } catch {
    // projects/ 不可读时按 0 个项目处理
  }
  return { ok: true, projectCount };
}
