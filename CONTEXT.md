# film-studio-dashboard 仪表盘

film-studio 影视工作台的只读观测面。上游领域词汇（工作区/项目/门禁/镜头/shotlist/风格锁）以插件仓 `CONTEXT.md` 为准，本表只收仪表盘自身的概念。

## Language

**工作目录**:
仪表盘的观测单元——film-studio `/new-drama` 生成的工作区根目录（含 `projects/`）。同一时刻只有一个激活的工作目录，可快速切换。
_Avoid_: 工程目录、项目目录（"项目"指 projects/ 下的一部剧）

**轻操作**:
仪表盘允许的全部非只读动作：复制建议命令、刷新积分（`dreamina user_credit`）。此外一切皆只读；任何会触发生成、确认门禁、写工作区文件的能力都在边界之外。
_Avoid_: 写操作、控制

**镜头四态**:
shotlist 中单镜的生命周期状态：`pending 待生成 → submitted 生成中 → success 已收货 / failed 失败`。由插件的视频生成师维护，仪表盘只染色展示。
_Avoid_: 任务状态（易与阶段状态混淆）

**阶段状态**:
project.json 五阶段（剧本/分镜/设定/生成/成片）各自的 `pending | in_progress | approved | done`。
_Avoid_: 进度（泛指时另说）

**收割**:
把已提交未取回的生成任务查询并下载落盘的动作——属于插件 `/studio-status` 与视频生成师的职责，仪表盘只提示"有 N 个挂起任务"，不代为收割。
