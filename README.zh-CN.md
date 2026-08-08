[English](README.md) | **中文** | [日本語](README.ja.md)

# film-studio-dashboard 影视工作台仪表盘

[film-studio](https://github.com/zq940222/Claude-Code-Film-Studio) 影视工作台的**只读可观测仪表盘**：本地 web 应用，启动后选择工作目录，即可图形化观测其中所有项目——阶段进度与门禁卡点、镜头四态网格与成片播放、设定图画廊与风格锁、剧本/审片文档预览、成片发布物料与积分看板。

## 边界（刻在门框上）

- **只读 + 轻操作**：轻操作仅限"复制建议命令"与"刷新积分"（`dreamina user_credit` 只读查询）
- **不触发生成、不确认门禁、不回写工作区任何文件**——四道门禁的确认永远发生在 Claude Code 对话里
- 服务只绑定 `127.0.0.1`，媒体接口有路径穿越防护
- 与插件的唯一契约是工作区文件格式（`project.json` / `shotlist.json` / 目录规范），见插件仓 ADR-0001

## 安装与使用（命令行，全平台含 Windows）

前置：本机已装 Node ≥ 18。发布包是预构建的，安装很快。

```bash
# 安装（从 GitHub Release 装预构建包，无需 npm 账号）
npm i -g https://github.com/zq940222/film-studio-dashboard/releases/latest/download/film-studio-dashboard.tgz
```

装完之后，**日常启动只要三个字母**：

```bash
fsd
```

裸敲即可——自动打开上次用过的工作目录（记在 `~/.film-studio-dashboard/config.json`）并弹出浏览器。只有换目录或做别的事时才需要带参数：

```bash
fsd "D:/你的创作工作区"   # 切换工作目录（也可省略，启动后在页面里"浏览…"挑选）
fsd update               # 更新到最新发布版（重新拉取同一条 Release URL）
fsd version              # 版本号
fsd help                 # 帮助
```

> `fsd` 是 `film-studio-dashboard` 的短别名，随全局安装一起装好；上面每条命令里两者完全等价。

打开 <http://127.0.0.1:5799>。环境变量 `PORT` 可改端口；加 `--no-open` 则启动但不自动弹浏览器。

## 从源码运行 / 开发

```bash
git clone https://github.com/zq940222/film-studio-dashboard.git
cd film-studio-dashboard
npm install
npm run build        # 构建 web/dist 与 server/dist
npm start -- "D:/你的创作工作区"

npm run dev          # 开发模式（免构建，实时编译）：server(5799, tsx watch) + web(5173, vite) 并行，前端代理 /api 与 /media
```

## 技术栈

- 前端：Vite + React + TypeScript，手写 CSS（设计系统见 `design-system/`，由 ui-ux-pro-max 生成）
- 后端：Express + TypeScript，纯文件只读扫描 + mtime/TTL 缓存，前端 3s 轮询
- 共享类型：`shared/types.ts`（工作区文件格式契约的 TS 化）
