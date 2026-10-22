# 项目文档入口

| 文档 | 用途 |
| --- | --- |
| [PRODUCT.md](PRODUCT.md) | 已确认的用户、范围、教学与产品约定 |
| [CURRICULUM.md](CURRICULUM.md) | 63 节逐课四要素与前置关系 |
| [ROADMAP.md](ROADMAP.md) | 开发阶段和退出条件 |
| [ACCEPTANCE.md](ACCEPTANCE.md) | 验收标准、评分和八个面板章末挑战 |
| [LESSON-21.md](LESSON-21.md) | 首个样板课详细脚本与实验合同 |
| [FOUNDATIONS-01-18.md](FOUNDATIONS-01-18.md) | 基础课共同合同与 18 份详细脚本入口 |
| [NETWORK-APPLICATION.md](NETWORK-APPLICATION.md) | Network / Application 的 12 份新脚本、21 课回归及两个章末合同 |
| [QA-NETWORK-APPLICATION.md](QA-NETWORK-APPLICATION.md) | 网络与状态浏览器验收、协议证据及检查边界 |
| [PERFORMANCE-RENDERING.md](PERFORMANCE-RENDERING.md) | 9 课性能 / 渲染脚本与章末合同 |
| [QA-PERFORMANCE.md](QA-PERFORMANCE.md) | 三轮对照、两组挑战、原生 trace、Coverage、布局与媒体验证 |
| [MEMORY-REGRESSION.md](MEMORY-REGRESSION.md) | 6 课内存 / 回归脚本、真实引用与检查边界 |
| [QA-MEMORY.md](QA-MEMORY.md) | 三轮引导、两组挑战、原生快照证据与待补事项 |
| [QA-FOUNDATIONS.md](QA-FOUNDATIONS.md) | 逐课演示、两种变体、重复运行及边界检查 |
| [DESIGN.md](DESIGN.md) | 界面与可读性设计 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 当前三个本地服务的架构、接口和检查边界 |
| [STATUS.md](STATUS.md) | 已实现、已验证与剩余工作 |

课程目录由 `src/data/curriculum.json` 生成，基础课脚本由 `src/data/foundations.json` 与合同补充生成。网络与状态脚本由 `src/data/network-state.json` 和生成器维护。性能脚本由 `src/data/performance.json` 和生成器维护。内存脚本由 `src/data/memory.json` 与生成器维护。当前 01–44、50–51 共 46 课开放，17 课规划；正式范围保持 55 主线 + 8 专题及 8 个章末题。
