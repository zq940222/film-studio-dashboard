#!/usr/bin/env node
// film-studio-dashboard 命令行入口：默认启动只读仪表盘服务，另有 update / version / help 子命令。
// 服务本体在 server/dist 里，会自己读 process.argv 里的工作目录（位置参数或 --workspace <path>）。
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url)); // .../<pkg>/bin
const PKG_ROOT = path.resolve(HERE, '..');
const REPO = 'github:zq940222/film-studio-dashboard'; // 更新时重新拉取的源

function pkgVersion() {
  try {
    return JSON.parse(readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf-8')).version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function printHelp() {
  console.log(`film-studio-dashboard v${pkgVersion()} — film-studio 影视工作台只读仪表盘

用法:
  film-studio-dashboard [工作目录]        启动仪表盘（默认 http://127.0.0.1:5799）
  film-studio-dashboard --workspace <路径>  同上，显式指定工作目录
  film-studio-dashboard update            更新到最新版（重新从 GitHub 拉取并构建）
  film-studio-dashboard version           显示版本号
  film-studio-dashboard help              显示本帮助

说明:
  · 工作目录可省略，启动后在页面里选择；最近用过的目录记在 ~/.film-studio-dashboard/config.json
  · 环境变量 PORT 可改端口（默认 5799），服务只绑定 127.0.0.1`);
}

function runUpdate() {
  console.log('[film-studio-dashboard] 正在更新：重新从 GitHub 拉取并本机构建，请稍候…');
  // --install-links 必须：否则 npm 会把全局包软链到一个用完即删的临时 git 克隆，装完即失效。
  // shell:true 必须：Windows 上 npm 即 npm.cmd，新版 Node 直接 spawn .cmd 会抛 EINVAL；
  // 加 shell 后 'npm' 跨平台可用。REPO 为固定的 github: 源，无空格、无注入风险。
  const r = spawnSync('npm', ['install', '-g', '--install-links', REPO], { stdio: 'inherit', shell: true });
  if (r.error) {
    console.error(`[film-studio-dashboard] 更新失败：${r.error.message}`);
    process.exit(1);
  }
  process.exit(r.status ?? 0);
}

const sub = process.argv[2];

if (sub === 'update' || sub === 'upgrade') {
  runUpdate();
} else if (sub === 'version' || sub === '--version' || sub === '-v') {
  console.log(pkgVersion());
} else if (sub === 'help' || sub === '--help' || sub === '-h') {
  printHelp();
} else {
  // 默认：启动服务。index.js 顶层会自行 app.listen 并读取 process.argv 里的工作目录参数。
  // 必须转成 file:// URL：Windows 上绝对路径形如 C:\...，直接 import() 会被 ESM 加载器当成
  // 协议 "c:" 而报 ERR_UNSUPPORTED_ESM_URL_SCHEME（POSIX 下能容忍绝对路径，Windows 不行）。
  const entry = path.join(PKG_ROOT, 'server', 'dist', 'server', 'src', 'index.js');
  await import(pathToFileURL(entry).href);
}
