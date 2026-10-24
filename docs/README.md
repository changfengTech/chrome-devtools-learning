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
| [LIGHTHOUSE-TOOLS.md](LIGHTHOUSE-TOOLS.md) | 六课质量 / 辅助工具脚本、真实审计与检查边界 |
| [QA-LIGHTHOUSE-TOOLS.md](QA-LIGHTHOUSE-TOOLS.md) | 真实 Lighthouse、商城流程、三视口与待补原生工具复核 |
| [CAPSTONE-TOPICS.md](CAPSTONE-TOPICS.md) | 11 课综合 / 专题、三个新增章末合同与前置条件 |
| [QA-CAPSTONE-TOPICS.md](QA-CAPSTONE-TOPICS.md) | 完整流程、自评、三视口、真实协议与原生待办 |
| [DESIGN.md](DESIGN.md) | 界面与可读性设计 |
| [ARCHITECTURE.md](ARCHITECTURE.md) | 当前三个本地服务的架构、接口和检查边界 |
| [STATUS.md](STATUS.md) | 已实现、已验证与剩余工作 |
| [QA-SITES.md](QA-SITES.md) | ChatGPT Sites 发布结果、自动回归与线上待复验范围 |
| [SITES-SUPPORT-REPORT.md](SITES-SUPPORT-REPORT.md) | 待提交的平台默认域名访问故障报告（尚未外发） |
| [NETWORK-ACCESS.md](NETWORK-ACCESS.md) | 公司 VPN 下的精确域名范围、连接证据和恢复后验收步骤 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | ChatGPT 站点链接、在线 / 本地范围、构建与发布维护 |
| [QA-NATIVE-TOOLS.md](QA-NATIVE-TOOLS.md) | Guest 中 Overrides / Changes 与 Autofill 原生闭环、截图、清理和设备 / 账户条件 |
| [QA-RELEASE.md](QA-RELEASE.md) | 本轮 63 课 / 8 章末整体验收、两处修复、原生截图与剩余项 |

课程目录由 `src/data/curriculum.json` 生成，基础课脚本由 `src/data/foundations.json` 与合同补充生成。网络与状态脚本由 `src/data/network-state.json` 和生成器维护。性能脚本由 `src/data/performance.json` 和生成器维护。内存脚本由 `src/data/memory.json` 与生成器维护。质量脚本由 `src/data/quality.json` 与生成器维护。综合 / 专题脚本由 `src/data/advanced.json` 与生成器维护。当前 63 课学习流程与 8 章末功能开放，原生工具 / 设备退出验收仍分列；62 份生成脚本加第 21 课样板覆盖 55 主线 + 8 专题。
