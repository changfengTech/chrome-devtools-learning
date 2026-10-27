# Memory / 回归验收记录

日期：2026-10-22。本批 40–44、50 共 6 课及 Memory 章末挑战；全站 46/63 课可实战，17 课规划。功能交付与原生工具人工复核分开记录，未完成的项目不写成通过。

## 环境与检查边界

Node.js 25.9.0、pnpm 12.14.0，构建预览教程 4173、原生商城 4174。浏览器流程使用应用内 Chromium；原生 Heap snapshot / Retainers 另在 Google Chrome 英文 Memory 面板实际检查。Chrome 完整版本未读取，不从日期或 frontend hash 推断版本。

内存课保持同一文档；每批 5 次开关，运行上限 20 次，每会话 30 分钟。商品、数组、Map、DOM、订阅和 interval 为真实对象与注册。页面报告只有标量，不输出对象到 Console；不会把自有容器数等同整个 JS heap、浏览器 DOM / listeners 或已 GC 数量。强制 GC、快照及分配分析必须另在工具检查。服务不能抵御主动修改报告，不是可信监考。

## 逐课流程

| 课次 | 配置一 | 配置二 | 三轮引导 | 两组独立挑战 |
| --- | --- | --- | --- | --- |
| 40 | history 累积 MemoryVisit，正常缓存有界 | 每次访问新缓存键，改为商品键复用 | 通过 | 通过 |
| 41 | 小 owner 保留 ProductPayload | owners / audit 共享载荷，清理所有过期根 | 通过 | 通过 |
| 42 | previewHistory 存活增量 | snapshotCache 按访问键增长，改为商品复用 | 通过 | 通过 |
| 43 | 数组持有真实 detached 弹窗 | Map 持有关闭节点 | 通过 | 通过 |
| 44 | 事件回调未移除 | interval 未清理 | 通过 | 通过 |
| 50 | 第一项定位在换序后买错 SKU | 固定等待早于搜索结果 | 通过 | 通过 |

[引导三轮](qa/memory-guides.json) · [挑战配置一](qa/memory-challenge-a.json) · [挑战配置二](qa/memory-challenge-b.json) · [模型操作](qa/memory-models.json)。引导在同一会话三轮重做；每次正常对照先清理本页旧资源，再执行相同 10 次开关。50 的引导与挑战页面脚本使用两种顺序和两种延迟，均核对真实购物车结果；这不算原生 Recorder 回放证明。

实际例子：43 的数组配置在 10 次关闭后自有保留根为 10，正常对照同 10 次为 0；44 的定时配置从 10 个仍注册 interval 到 0，同时每次新预览至少收到一次刷新。41 / 42 的正常当前载荷或缓存可保留一个，不把正常平台强行设为全零。

## 原生 Memory 证据

已在 Google Chrome 的 Memory > Heap snapshot 采集 A、B。B 的 Summary 按 DetachedProductDialog 筛选，实际显示 5 个实例，组 Shallow Size 约 0.2 kB、Retained Size 约 23.0 kB；这是本次环境的显示值，不是项目预算或通用大小。

展开实例后 Retainers 实际显示：[0] in Array → closedDialogs in MemoryLabState → memoryLab in Window → GC roots。详见[原生观察摘要](qa/memory-native-snapshot.json)和[面板截图](images/memory-retainers.png)。这里引用的是 Chrome 面板实际观察，不是页面的计数器。

之后已在同一文档点“停止并清理本页”，页面自有根归零，再在 Memory 点 Collect garbage 并采集 Snapshot 3。第三份快照已生成；其构造函数筛选与 Comparison 结果尚未完成复核，因此不能据此声称 GC 后实例为零。原始整堆包含浏览器扩展对象，不向公共仓库发布全堆内容；仅保存本项目筛选后的截图与摘要。

原生 Allocation timeline / sampling 的分配栈、其余配置的逐项 Retainers、Performance monitor 多点趋势，以及第三份快照的原生比较仍待补充。应用内 raw CDP 的 HeapProfiler 域不支持，本轮没有把页面计数冒充原生分配 / 堆证据。

## Recorder 与回归边界

50 提供真实异步搜索（450 / 1200ms）、换序、详情和购物车。页面脆弱示例按首项或固定 150ms 继续，分别得到错误 SKU 或未就绪；条件示例等待实际结果、使用目标 SKU 定位，再核对数量和总额。正常条件需要至少两轮成功和两种排序 / 延迟，单次成功不能通过。

[下载的 Recorder JSON 示例](qa/memory-recorder-example.json)包含本会话导航、重置、输入、搜索、waitForElement、稳定业务定位及结果属性断言；click 带必需坐标。已将下载文件中的导航与各个 selector 通过浏览器 UI 逐步执行，实际结果为 CUP-42、数量 2、总额 84，见[格式与逐步执行证据](qa/memory-recorder-schema-playback.json)。**这不是 Chrome Recorder 面板的原生 Replay**，原生录制、编辑、导入 / 导出及多条件 Replay 人工复核待补。

开始准备后 URL 带本轮 runId，Recorder 默认导航后能恢复可操作实验上下文；默认 navigate 会重置页面条件。跨条件回放需移除 navigate（保留重置）或编辑导航 URL 条件，课程已说明。会话地址 30 分钟过期，不应复制成长期回归入口。

## 章末、兼容与响应式

[Memory 章末](qa/memory-chapter.json)实际抽到定时器配置；初始隐藏课号与步骤，故障和正常对照回传。案例通过但报告 / 自评不足时不完成；非空报告及五维自评达到门槛后记录，刷新保留文字和五项分数。样本 10/10 只用于检查记录流程，不是能力认证。

[四章末导入样本](qa/memory-progress-sample.json)只含 QA 数据，合并旧 21 课和 Network / Application / Performance / Memory。导入后四章末可见；非法分数被拒且原记录保留，见[导入检查](qa/memory-progress-import.json)。验收前记录已另备份；最终通过导入恢复，再导出比较，JSON 与原备份一致。

[三视口布局](qa/memory-responsive.json)：6 课模型 + Memory 章末 × 320 / 768 / 1440，共 21 项无整页横向溢出。最初窗口覆盖没有改变页面实际宽度，已作废并通过逐标签页覆盖重新执行；最终文件每项 innerWidth 均等于 320 / 768 / 1440。

[独立商城](qa/memory-shop-responsive.json)另检查 44 与 50 × 实际 320 / 1440，4 项无整页溢出。

[失败与辅助](qa/memory-failure-assisted.json)：错误清理不通过，错误证据不记完成；查看解析再完成后 challengeAssisted 持久化为 true。[中途停止](qa/memory-stop.json)：interval 运行中停止后自有 timer 为零，教程仍显示待观察；重跑可正常复现。

[最终正常随机服务](qa/memory-production.json)：44 引导库存订阅、50 换序 / 慢搜索通过教程→商城→回传→证据记录。50 漏重置后真实累加到数量 4、总额 168，结果断言失败；重置后恢复数量 2、总额 84。视口覆盖已撤销，验收前学习记录恢复并精确比较一致。

## 工程

- pnpm test：40/40，含既有基础、Network / Application、Performance、第 21 课回归及新的内存 / Recorder 会话判定。
- pnpm build：商城 TS / Source Map、Vue 类型与生产构建通过。
- 文档生成：完整 63 节目录，45 份详细脚本，另有第 21 课样板。
- 未完成的原生工具人工复核保留为阶段验收待办；不把完整正式范围或所有面板章末任务标为全部完成。

## 2026-10-22 整体验收补充

本轮 40–44、50 与 Memory 章末功能回归通过，修复新运行残留上一批功能提示。新增第三份 Heap snapshot Comparison（删除 5 个 DetachedProductDialog）、Map 引用配置、Allocation sampling / timeline、Performance monitor 多点趋势，以及原生 Recorder 录制、UI 编辑、导入导出与换序 / 延迟两条件 Replay。以下历史待办已由新证据部分关闭；分配窄选区等细项仍保留。

最新逐项证据、剩余项和用户状态恢复见 [整体验收记录](QA-RELEASE.md)。本文件前文保留当批历史结论，不计作本轮重复三轮。

## 2026-10-27 线上原生补验

第 41 课已取得线上同文档空闲 / 故障 / 修复三快照、实际 owners → memoryLab → Window / GC roots 引用链与 Comparison。故障 5 个 owner；修复后新增 1、删除 5、净减 4，只保留当前 owner。三快照保存，修复文件回载仍显示 1 个 owner / 16.7 kB，两轮业务校验均为 84。Allocation 工具、Detached DOM 和第二根配置未在本轮重测。 证据、阻塞与继续条件见[线上原生验收](QA-SITES-NATIVE.md)。
