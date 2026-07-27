[English](README.md) | **中文** | [日本語](README.ja.md)

# film-studio-dashboard 影视工作台仪表盘

[film-studio](https://github.com/zq940222/Claude-Code-Film-Studio) 影视工作台的**只读可观测仪表盘**：本地 web 应用，启动后选择工作目录，即可图形化观测其中所有项目——阶段进度与门禁卡点、镜头四态网格与成片播放、设定图画廊与风格锁、剧本/审片文档预览、成片发布物料与积分看板。

## 边界（刻在门框上）

- **只读 + 轻操作**：轻操作仅限"复制建议命令"与"刷新积分"（`dreamina user_credit` 只读查询）
- **不触发生成、不确认门禁、不回写工作区任何文件**——四道门禁的确认永远发生在 Claude Code 对话里
- 服务只绑定 `127.0.0.1`，媒体接口有路径穿越防护
- 与插件的唯一契约是工作区文件格式（`project.json` / `shotlist.json` / 目录规范），见插件仓 ADR-0001

## 安装与使用（命令行，全平台含 Windows）

前置：本机已装 Node ≥ 18。安装时会在本机自动构建，首次稍慢。

```bash
# 安装（从 GitHub 直装，无需 npm 账号）
npm i -g --install-links github:zq940222/film-studio-dashboard

# 运行（工作目录可省略，启动后在页面里选择）
film-studio-dashboard "D:/你的创作工作区"
# 短别名亦可：fsd "D:/你的创作工作区"

# 更新到最新版（重新拉取 GitHub 并构建）
film-studio-dashboard update
```

> `--install-links` 不能省：否则 npm 会把全局包软链到一个用完即删的临时 git 克隆，装完即失效。`film-studio-dashboard update` 已自动带上该参数。

打开 <http://127.0.0.1:5799>。最近使用的工作目录会记在 `~/.film-studio-dashboard/config.json`，下次一点即开。环境变量 `PORT` 可改端口。

其他子命令：`film-studio-dashboard version` / `help`。

## 从源码运行 / 开发

```bash
git clone https://github.com/zq940222/film-studio-dashboard.git
cd film-studio-dashboard
npm install          # 会自动构建 web/dist 与 server/dist（prepare 钩子）
npm start -- "D:/你的创作工作区"

npm run dev          # 开发模式：server(5799, tsx watch) + web(5173, vite) 并行，前端代理 /api 与 /media
```

## 技术栈

- 前端：Vite + React + TypeScript，手写 CSS（设计系统见 `design-system/`，由 ui-ux-pro-max 生成）
- 后端：Express + TypeScript，纯文件只读扫描 + mtime/TTL 缓存，前端 3s 轮询
- 共享类型：`shared/types.ts`（工作区文件格式契约的 TS 化）
