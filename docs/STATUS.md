# 实施状态

更新：2026-10-22。**52/63 课可实战**：01–52；其余 11 课（53–55、T01–T08）规划。完整范围仍为 55 主线、8 专题及另列的 8 个面板章末题。

## 本批功能

阶段 6 Lighthouse / 辅助工具已接入 45–49、52 六课及 Lighthouse 章末。每课有独立原理交互、固定引导、两种迁移故障、三级提示、解析和复盘。覆盖审计模式 / 条件、四类审计与具体证据、优先级和多轮比较、Device Mode、Issues / 连接与内容限制、Local overrides / Changes / Workspaces 的范围。

真实 Lighthouse 报告来自独立审计商品页，导入后显示原分数；47 每阶段三份 Navigation 报告比较中位数。48 是实际 CSS 溢出，49 是实际 CSP / Cookie Domain 拒绝，52 有稳定商品 URL，服务器对照与保持原始故障的手工覆盖入口分开。

Network / Application / Performance / Memory / Lighthouse 五个章末可用；Elements / Console / Sources 三个按原计划继续。旧 v1、笔记、提示标记与五章末兼容。阶段 2 关联的 48、52 功能随本批补齐。

## 验证与退出待办

构建、47 项测试、六个模型操作 / 复位及实际三视口检查已有记录。46 份真实审计、逐课流程与章末细项见 [QA-LIGHTHOUSE-TOOLS.md](QA-LIGHTHOUSE-TOOLS.md)；合同及 6 份脚本见 [LIGHTHOUSE-TOOLS.md](LIGHTHOUSE-TOOLS.md)。51 份生成详细脚本另加第 21 课样板，共覆盖 52 个开放课程。

原生 Lighthouse Navigation / Timespan / Snapshot、Issues / Privacy and security、Overrides / Changes / Workspaces 的面板按钮与本地目录操作需按验收表补充人工复核。CLI、协议和页面检查分别记录，不冒称原生操作或全面质量认证。阶段 6 的连续三轮和两配置实际覆盖以本批 QA 表为准，未完成项不关闭。

阶段 5 原有原生待办继续保留：第三份快照 Comparison、Allocation timeline / sampling、Performance monitor 多点趋势、其余配置 Retainers，以及 Recorder 实际录制 / 编辑 / Replay / 导出。已有证据见 [QA-MEMORY.md](QA-MEMORY.md)。前批 [基础](QA-FOUNDATIONS.md)、[网络状态](QA-NETWORK-APPLICATION.md)、[性能渲染](QA-PERFORMANCE.md) 的历史检查不称为本轮重新全部实测。

## 接续与运行

下一批是综合与专题 53–55、T01–T08，以及其余三章末；再完成完整正式范围和原生工具退出验收。

教程生产预览 http://127.0.0.1:4173/ ，商城 4174，同伴服务 4175。从课程准备会话；切换服务前停止旧服务。公开仓库：[changfengTech/chrome-devtools-learning](https://github.com/changfengTech/chrome-devtools-learning)。临时会话、依赖、构建产物、个人记录与本地环境文件不提交。
