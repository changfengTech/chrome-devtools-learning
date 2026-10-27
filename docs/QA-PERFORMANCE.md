# Performance / 渲染验收记录

日期：2026-10-22。本批 27–34、51 共 9 课及 Performance 章末任务。当前全站 40/63 课可实战，其余 23 课规划。

## 环境、范围与边界

本地 Node.js 25.9.0、pnpm 12.14.0，生产构建后的教程 4173、独立商城 4174。使用应用内 Chromium；浏览器 UA 报告 Chrome/155.0.0.0，这是缩减后的 UA，不作为完整引擎补丁版本。独立 Chrome 英文面板、保存 / 加载 trace 按钮逐项人工复核仍待补；本轮实际捕获原生 CDP trace、CPU 采样、布局 / 绘制事件、JS / CSS 覆盖及媒体条件。

页面无 Vue、HMR 或 Service Worker，性能路径与现有 worker scope 隔离。每次运行新建导航和 runId；业务结果固定校验值，挑战随机输入及两组故障。CPU 循环使用墙钟预算，限速不会保证按倍率放大循环时长；它用于定位调用与任务结构，不用于设备跑分。CPU 时间为有界的受控教学负载，不代表真实商城算法或线上性能预算。正常对照针对当前问题，不保证所有长任务消失。

模型操作不计完成。服务校验会话、实际文档访问、单次指标报告、业务校验值、目标条件及结构化判断。指标来自页面，可被主动修改；不是可信监考，不证明操作过面板，不替代自由解释。Node 测试使用受控报告验证接口和判定，下面浏览器证据另列。

## 逐课矩阵

| 课次 | 实际故障与对照 | 模型 | 同会话三轮 | 挑战两组 |
| --- | --- | --- | --- | --- |
| 27 | 发现主图迟 / 搜索占用主线程，分别观察加载、交互及占位 | 通过 | 通过 | 通过 |
| 28 | 重复搜索 / 重复渲染，按同一动作与 User Timing 选区 | 通过 | 通过 | 通过 |
| 29 | 重复归一化子工作 / 直接重复调用，缓存或复用且结果一致 | 通过 | 通过 | 通过 |
| 30 | 同步工作 / 微任务链，任务级让出后仍完成相同校验 | 通过 | 通过 | 通过 |
| 31 | 无关请求阻塞发现 / 到达后 CPU 阻塞呈现，保留工作而改变顺序 | 通过 | 通过 | 通过 |
| 32 | 图片无占位 / 促销条无占位，目标位移归零 | 通过 | 通过 | 通过 |
| 33 | 交错布局读写 / left 与大阴影，批处理或 transform 对照 | 通过 | 通过 | 通过 |
| 34 | 提前加载模块 / 专用样式，按需加载并实际打开后续流程 | 通过 | 通过 | 通过 |
| 51 | 动画过久 / 忽略 reduce，时长与无位移反馈分别核对 | 通过 | 通过 | 通过 |

[模型操作](qa/performance-models.json) · [9 课各三轮](qa/performance-guides.json) · [配置一](qa/performance-challenge-a.json) · [配置二](qa/performance-challenge-b.json)。

观察例子：28 重复搜索约 360→120ms，29 单次归一化约 180→60ms、另一配置调用 6→1。30 总工作约 206ms 不变，但连续阻塞约 204→34ms，反馈机会约 206→35ms。31 发现延迟约 390→20ms，另一配置到达后的呈现等待约 230→30ms。数值是本次受控观察，不是跨设备承诺；120ms / 60ms 仍可能为长任务，后续任务切分课继续处理这一问题。

## 原生浏览器证据

### CPU 与录制范围

[原生 trace](qa/performance-cpu-trace.json) 为 CDP Tracing 返回的 traceEvents JSON；[摘要](qa/performance-trace-summary.json) 包含目标 User Timing、约 181ms EventDispatch / FunctionCall，以及采样到的 targetOperation → filterCatalog → normalizeProduct → consumeCPU。

只保留目标标记所属 renderer，包含同进程的本地教程与商城，源 URL 仅为本机 4173 / 4174；没有录制截图或外部站点。原始 trace 约 1.6 MB。判断时选目标标记范围；录制启动中的 CpuProfiler::StartProfiling 约 83ms 是工具开销，不能当作业务根因。原生 Chrome 的导入 / 导出界面操作未冒称本轮已人工验收。

[页面原始条目](qa/performance-browser-entries.json) 另记录 LongTask 约 181ms，以及 UA、视口、DPR、可见性。页面导出的观察 JSON 与 Chrome trace 是不同文件。

### 布局与绘制

[布局读写对照](qa/performance-layout-native.json)：同一次 24 帧更新中，页面显式几何读取 864→24；原生 Performance.getMetrics 的 LayoutCount 增量 832→27，LayoutDuration 约 28.6→3.4ms。trace 中 Paint 均为 55；这组改动主要减少布局，不能据此声称重绘次数也减少。

[运动属性对照](qa/performance-paint-native.json)：另一配置同样 24 帧，left / 阴影换成 transform 后，本次 trace 的 Layout 事件 28→5、Paint 57→10。整体约 428ms 基本不变，因为帧数相同；没有把这些数值冒充 FPS 或全设备保证。

### 布局偏移与仪器干扰

[第 32 课原始条目](qa/performance-layout-shift.json)：促销条目标移动 64px，浏览器记录 hadRecentInput=false 的 LayoutShift（本次约 0.0284）；正常占位对照目标移动 0px，未再记录非交互偏移。图片配置在三轮引导中也从目标位移归零。

初次检查发现工具栏、占位和结果区初始化会制造无关偏移，最终将初始元数据与占位准备在首个场景呈现前完成，反馈区预留高度，原始数据按需展开。没有隐藏或过滤浏览器原始条目来伪造结果。展开原始数据等用户操作可能产生 recent-input 条目，原始文件保留它们。本页不把位移 px 或条目简单求和称为正式 CLS。

### Coverage 与后续功能

[原生 JS / CSS 覆盖](qa/performance-coverage-native.json)：录制首页时未执行详情 / 结算模块；实际打开两个流程后，各 openFeature 调用 1 次，仍有各 180 个未调用的可选函数。themes.css 在打开详情后出现使用区间 0–77；保留样式表 ID 与 URL 关联。

[按需对照后的流程](qa/performance-lazy-flows.json) 核对首页不提前请求对应资源，详情与结算仍显示正确 SKU、数量和可用状态。覆盖范围依赖录制路径，未使用不等于可删除。

### Animations 与真实 reduce

[实际媒体条件](qa/performance-reduced-motion.json)：通过 CDP 模拟 prefers-reduced-motion: reduce，关闭站内预览复测；故障仍有 650ms ×3 的 cart-feedback，原生 computed style 含位移矩阵。修复后 animation-name=none、duration=0s、transform=none，数量和侧栏结果保留。

[已有减弱动态偏好的兼容检查](qa/performance-animation-accessibility.json)：第 51 课引导在 reduce 下也能完成。1600ms 配置不被视为正常对照；正确配置 360ms 实际抑制运动后通过，而不要求学习者关闭减弱动态。媒体模拟、CSS / DOM / Profiler / Tracing 调试状态均已恢复。Animation 原生 CDP 域在本工具不支持，因此用实际 CSSAnimation 及原生 computed style 交叉核对，不冒称已操作独立 Chrome Animations 时间线控件。

## 失败、章末与记录

[错误与辅助](qa/performance-failure-assisted.json)：第 29 课错误对照不通过，错误答案显示缺证据；查看解析后正确完成保存辅助标志。
[停止与重试](qa/performance-stop.json)：在帧更新中停止，本次没有回传故障完成；重新运行恢复正常复现。

[性能章末](qa/performance-chapter.json)：初始隐藏课号与步骤，测试抽到微任务链。案例通过但 0 分自评仍不记完成；补齐报告与五维分数后记录，刷新保留。10/10 为验收流程自评，不是能力认证。

[导入导出样本](qa/performance-progress-sample.json) 仅含 QA 数据，包含旧第 21 课格式、已交付课程和 Network / Application / Performance 三个章末。
[兼容检查](qa/performance-progress-import.json)：非法分数被拒且旧记录保留；导入保留三个章末，更新课程笔记并刷新后仍保留三个章末。验收前原记录另行备份，结束后通过导入恢复，不保留测试完成状态。

## 布局、工程与发布前检查

- [响应式 30 项](qa/performance-responsive.json)：9 课模型页 + 性能章末 × 实际 320 / 768 / 1440，主文档均无横向溢出。
- [商城独立视口](qa/performance-shop-responsive.json)：实际 320 和 1440，运行故障 / 对照均可用，文档宽度 305 / 1425；临时视口覆盖已恢复。
- pnpm build：商城 TS、Source Map、Vue 类型及 Vite 生产构建通过。
- pnpm test：35/35，包括全部既有回归、性能两组会话、预期业务值、可见性、非法报告、资源、过期、章末、减弱动态。
- 文档生成：63 节目录、39 份详细脚本（第 21 课另有既有样板）。
- 正常随机服务的 28 / 30 / 31 课已通过教程→商城→回传→证据记录。28 课的新导航保留所选方案，独立打开页面准确显示未连接教程；最终记录恢复与备份一致。详见[最终生产检查](qa/performance-production.json)。

当前保留 pnpm preview:all，教程 [127.0.0.1:4173](http://127.0.0.1:4173/#chapter/performance)。独立 Chrome 版本、英文面板按钮逐项人工复核仍待整体验收补齐；以上原生协议和页面浏览器检查已实际执行。

## 2026-10-22 整体验收补充

本轮 27–34、51 与 Performance 章末功能回归通过；补原生 Performance Record / Save / Load、Bottom-up 业务成本，Coverage Reload / Stop 、Animations 分组 / 暂停 / Replay 和 Rendering 开关 / 恢复。新录制只有故障侧，不冒称已补同条件原生修复 trace；阶段 4 原协议证据仍独立保留。

最新逐项证据、剩余项和用户状态恢复见 [整体验收记录](QA-RELEASE.md)。本文件前文保留当批历史结论，不计作本轮重复三轮。

## 2026-10-27 线上原生补验

第 29 课已取得线上原生故障 / 修复 trace、Bottom-up 调用链、实际源码、保存与故障文件回载；Total time 177.8 → 59.6 ms，业务校验均 84。修复文件回载和 Call tree 详细展开待补。 证据、阻塞与继续条件见[线上原生验收](QA-SITES-NATIVE.md)。
