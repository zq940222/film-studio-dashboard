#!/usr/bin/env node
// 无 workspace 依赖的构建：逐个进入 web / server 子目录，各自装依赖并构建。
// 之所以不用 `npm run build -w web`：`npm i -g github:...` 走 git 依赖 prepare 时，
// npm 会报 "Workspaces not supported for global packages"，工作区命令在全局安装场景下不可用。
// 逐目录 `npm install` + `npm run build` 则与工作区无关，本地开发和全局安装两条路都走得通。
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// 构建工具（tsc/vite）是各子包的 devDependencies。`npm i -g github:...` 走 git 依赖
// prepare 时，外层是全局安装，会往环境里注入 npm_config_global / npm_config_prefix /
// npm_config_omit 等。嵌套的 npm install 一旦继承这些，就会把 web 的 devDeps 装到全局
// 目录、且以 production 模式跳过 devDeps —— 表现为 "tsc: command not found"。
// 解法：给嵌套 npm 调用一个干净环境，剥掉所有 npm_config_* / npm_package_* / npm_lifecycle_*，
// 让它按默认的“本地、含 dev”方式装到各自的 node_modules 里。
const BUILD_ENV = { NODE_ENV: 'development' };
for (const [k, v] of Object.entries(process.env)) {
  const lower = k.toLowerCase();
  if (lower.startsWith('npm_config_') || lower.startsWith('npm_package') || lower.startsWith('npm_lifecycle')) continue;
  if (lower === 'npm_command' || lower === 'node_env') continue;
  BUILD_ENV[k] = v;
}

function run(cwd, args) {
  console.log(`\n[build] (${path.basename(cwd)}) npm ${args.join(' ')}`);
  // shell:true 是必须的：Windows 上 npm 是 npm.cmd，Node 20.12+/21.7+/24 直接 spawn .cmd 会抛 EINVAL；
  // 加 shell 后 'npm' 在两个平台都能解析（Windows 靠 PATHEXT 命中 npm.cmd）。参数都是固定 flag，无注入风险。
  const r = spawnSync('npm', args, { cwd, stdio: 'inherit', env: BUILD_ENV, shell: true });
  if (r.error) {
    console.error(`[build] 启动 npm 失败：${r.error.message}`);
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}

// web 先构建（server 只是把它的 dist 一并交付，无编译依赖），再构建 server。
for (const pkg of ['web', 'server']) {
  const dir = path.join(ROOT, pkg);
  run(dir, ['install', '--include=dev', '--no-audit', '--no-fund']);
  run(dir, ['run', 'build']);
}

console.log('\n[build] 完成：web/dist 与 server/dist 均已生成。');
