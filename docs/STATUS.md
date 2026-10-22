# 实施状态

更新：2026-10-22。**46/63 课可实战**：01–44、50–51，其余 17 课规划。完整范围保持 55 主线 + 8 专题及另列的 8 个面板章末题。

## 本批交付

阶段 5 Memory / 回归功能已交付 40–44、50 共 6 课及 Memory 章末任务。每课有原理模型、固定引导、两组故障、三级提示、参考解析和复盘。覆盖可达性与 GC、正常缓存平台、Shallow / Retained Size、Retainers、Comparison、分配、Detached DOM、事件 / timer 清理和稳定流程回归。

独立商城使用同一文档做真实对象分配、关闭与引用清理；页面只报告自有资源计数，不伪造浏览器堆、Retained Size 或 GC 结果。50 提供可换序商品、异步搜索、真实详情 / 加购、结果断言及 Recorder 格式示例；页面脚本不冒充 Recorder。

Network / Application / Performance / Memory 四个章末已交付，其余四个仍规划。章末案例检查与非空报告、五维自评门槛分别核对，自评分数不称为能力认证。兼容已有 v1、四章末、笔记与辅助标记。

## 本次验证与待补

| 检查 | 结果 |
| --- | --- |
| 构建 / 测试 | 类型、Source Map、生产构建与 40 项测试通过 |
| 模型 / 引导 / 挑战 | 6 个模型可操作；6 课各三轮引导；两组挑战与证据判定通过 |
| 原生快照 | Chrome 英文 Memory 实际显示 5 个 DetachedProductDialog 及 closedDialogs → MemoryLabState → Window 路径 |
| 页面清理 | 相同 10 次开关后自有保留根、监听器、timer 对照；业务功能仍成立 |
| Recorder 格式 | 下载示例导航与逐步 UI 执行通过，SKU / 数量 / 总额一致；不计为原生 Replay |
| 章末 / 记录 | 低分门槛、报告、刷新及四章末导入兼容；非法分数保留旧记录 |
| 响应式 | 6 课 + 章末 × 实际三视口共 21 项，商城另 4 项，无整页溢出 |
| 文档 | 63 节目录、45 份详细脚本、架构、路线、验收与图文 README 同步 |

**阶段 5 原生工具人工复核尚未全部关闭**：第三份快照的筛选 / Comparison、Allocation timeline / sampling、Performance monitor 多点趋势、其余配置 Retainers，以及 Chrome Recorder 的实际录制 / 编辑 / Replay / 导出仍待补。本轮原生窗口复核未完成；已有实际证据与未完成项见 [QA-MEMORY.md](QA-MEMORY.md)，不把页面检查或示例脚本称为原生验收。

详见 [本批合同](MEMORY-REGRESSION.md) 与 [验收记录](QA-MEMORY.md)。既有阶段结果分别见 [基础课](QA-FOUNDATIONS.md)、[网络状态](QA-NETWORK-APPLICATION.md)、[性能渲染](QA-PERFORMANCE.md)；本轮没有将旧检查冒称重新全部实测。

## 后续与运行

阶段 0 / 1 已完成；阶段 2 指定 01–18 完成，关联 48、52 待补；阶段 3 / 4 功能已交付。阶段 5 功能可用，上述人工复核仍作为退出待办保留。接续质量与辅助工具 45–49、52，再推进综合、专题及其余四个面板章末，正式范围不缩减。

本地生产预览入口为教程 http://127.0.0.1:4173/ ，商城 4174，同伴服务 4175。请从课程准备会话；切换服务前停止旧服务。公开仓库：[changfengTech/chrome-devtools-learning](https://github.com/changfengTech/chrome-devtools-learning)。验收前学习记录已恢复且导出与备份一致；视口覆盖与临时商城窗口已清理。临时会话、依赖、构建产物和本地环境文件不提交。
