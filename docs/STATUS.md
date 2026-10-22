# 实施状态

更新：2026-10-22。**63/63 节学习流程已开放**：01–55、T01–T08；另列的 **8/8 面板章末功能已接入**。这表示本地课程与检查流程可用，不表示原生工具、真机与整体验收全部完成。

## 本批交付

阶段 7 增加 53–55 综合实战、T01–T08 专题，以及 Elements / Console / Sources 三章末。每课含目标、前置关系、可复位模型、固定引导、两种迁移故障、三级提示、解析与复盘。综合现场先隐藏面板与根因，提交判断后解锁因果重放；发布题用可选证据生成关系图和遗漏提示，另填实际发布矩阵。综合挑战及八章末均要求报告与五维自评 ≥8/10，证据 / 修复验证非零；分数明确为自评。

真实场景含搜索响应乱序、会话独有 Storage、详情对象 / 订阅保留、多项发布故障、JS / map / TS、实际本地视频与收货表单。WebAuthn 提供真实 create/get 入口与 ES256 签名验证；其原生虚拟认证器实操和课堂条件夹具分列。Android、Sensors、Autofill、AI 与 Protocol monitor 原生状态独立记录，不能用本地模型冒充完成。症状导航、速查、实验入口与 README 同步。

62 份生成详细脚本 + 独立的第 21 课样板覆盖全部 63 课。共同合同见 [CAPSTONE-TOPICS.md](CAPSTONE-TOPICS.md)，本批证据见 [QA-CAPSTONE-TOPICS.md](QA-CAPSTONE-TOPICS.md)。学习 v1 保持向后兼容，新综合自评为可选字段；不会补造旧记录的历史分数。

## 验证与待办

本批 11 课各三轮完整引导、两配置独立挑战，以及三章末共 12 组病例有浏览器证据；自评门槛、八章末导入往返、非法导入保护与跨窗口同步分别核对。响应式检查与最终构建 / 测试数量以本批 QA 表为准，不把页面结果等同原生面板操作。

阶段 8 继续补齐原生退出验收：本批 Android 真机、Sensors 权限 / 方向、Workspace 实际落盘、Media / Autofill 面板、WebAuthn 虚拟认证器、可用地区 AI assistance 与 Protocol monitor 面板。IAB 可用的真实 CDP DOM 命令、属性与导航失效已有证据；不能冒称 Protocol monitor UI 已操作。

阶段 5 待办保留：第三份 Heap snapshot 的 Comparison、Allocation timeline / sampling、Performance monitor 多点趋势、其他 Retainers 配置及 Recorder 原生录制 / 编辑 / Replay / 导出。见 [QA-MEMORY.md](QA-MEMORY.md)。阶段 6 的原生 Lighthouse 三模式、Issues / Privacy and security、Overrides / Changes / Workspaces 按 [QA-LIGHTHOUSE-TOOLS.md](QA-LIGHTHOUSE-TOOLS.md) 补复核；既有 CLI、协议与页面证据保留。

更早的 [基础](QA-FOUNDATIONS.md)、[网络状态](QA-NETWORK-APPLICATION.md)、[性能渲染](QA-PERFORMANCE.md) 记录仍为各批历史实测，不声称这轮重新全部人工验证。

## 运行

项目目录运行 `pnpm dev`，或 `pnpm build && pnpm preview:all`。生产预览 http://127.0.0.1:4173/ ，商城 4174，同伴服务 4175。日常服务保持随机挑战；受控 QA 配置不作为日常默认。

公开仓库：[changfengTech/chrome-devtools-learning](https://github.com/changfengTech/chrome-devtools-learning)。会话、依赖、构建产物、个人记录与本地环境文件不提交。
