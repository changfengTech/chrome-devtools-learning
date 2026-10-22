# 实施状态

更新：2026-10-22。**63/63 课和 8/8 章末的本轮功能回归通过**，修复两处问题；阶段 8 的原生验收已补齐多项，设备、账户、授权和部分面板细项仍未全部关闭。当前依据为 [整体验收](QA-RELEASE.md)，不把功能通过等同于原生能力认证。

## 本轮交付

63 课均检查原理模型与复位、引导故障 / 修复、两种迁移配置及教程保存。8 个面板章末均检查两种配置，空报告 / 零分门槛及有效自评。三视口共 213 项无整页溢出；学习记录导入导出、非法导入保护、跨窗口与重载通过。测试合成记录已移除，用户原记录通过实际导入恢复，再次导出与备份完全一致。

补验取得独立 Chrome 156 英文面板证据：三份 Heap snapshot 的 Comparison、数组 / Map Retainers、Allocation sampling / timeline、Performance monitor 多点趋势；Recorder 原生录制、编辑、导入导出及两条件 Replay；Performance 录制保存重载、Coverage、Animations；Lighthouse 三模式原生运行与 JSON 导出；Sources 的 TS 断点与单步；Application worker 等待 / 激活与原生 Offline 缓存回退；Rendering 开关；Issues / Security、Sensors 方向、Media、WebAuthn 虚拟认证器、Protocol monitor 部分命令链；Workspaces 实际编辑、磁盘保存与目录移除。

修复 Memory 新运行残留上一批功能提示；修复 WebAuthn 默认 IP 页面无法使用有效 RP 域名的问题，补充 localhost 独立原生页、服务端 origin 约束与测试。**60/60 自动测试和生产构建通过**。本轮新生成 34 份 Lighthouse CLI 报告与 3 份原生报告，分别保留条件、摘要及哈希；不混同历史批次的报告数量。

## 尚需条件或继续补验

Android 真机、Sensors 定位权限、Autofill 实际填充、可用账户下的 AI assistance；Overrides / Changes 完整覆盖闭环及 Workspace 自动映射；Protocol monitor 导航后旧 nodeId 的实际错误，以及其他断点类型、网络 / worker 等未在本轮逐个重走的原生按钮。逐项结果、原因、关闭条件见 [原生剩余项](QA-RELEASE.md#尚未关闭的验收项)。没有用本地夹具替代这些步骤。

阶段 0–7 的实现与历史三轮引导保留；62 份生成脚本 + 第 21 课样板覆盖全部 63 课。各批 [基础](QA-FOUNDATIONS.md)、[网络状态](QA-NETWORK-APPLICATION.md)、[性能](QA-PERFORMANCE.md)、[内存](QA-MEMORY.md)、[质量工具](QA-LIGHTHOUSE-TOOLS.md)、[综合专题](QA-CAPSTONE-TOPICS.md) 仍为历史记录；本轮新增和关闭项以 QA-RELEASE 为准。

## 运行

项目目录运行 `pnpm dev`，或 `pnpm build && pnpm preview:all`。生产教程 http://127.0.0.1:4173/，商城 4174，同伴服务 4175。真实 WebAuthn 原生取证使用 localhost:4174 的独立页，按 T06 入口打开。日常服务保持随机挑战；[整体验收夹具](../scripts/qa-release.mjs)只在显式启动时控制 QA 配置。

公开仓库：[changfengTech/chrome-devtools-learning](https://github.com/changfengTech/chrome-devtools-learning)。依赖、构建产物、用户学习记录、完整堆 / trace、个人浏览器资料与本地环境文件不提交。
