# 当前实验架构

## 入口与隔离

- 教程：Vue / TypeScript / Vite；开发 127.0.0.1:5173，构建预览 4173。
- 商城：原生 HTML/CSS/JavaScript；Node HTTP 服务 127.0.0.1:4174；没有 Vue、HMR、Vue DevTools 注入。
- 教程与实验源隔离存储和控制范围。Service Worker 仅注册于商城 `/labs/<token>/`，不控制教程或其他会话。跨源同伴服务监听 127.0.0.1:4175，提供实际 CORS 预检和响应；端口跨源不等同跨站。
- `scripts/dev.mjs` 管理两个子进程和退出；固定端口用于严格的消息来源检查。

## 第 01–18 课

`FoundationLesson.vue` 提供共同五步流程，`FoundationDemo.vue` 提供 18 种原理模型；`src/data/foundations.json` 保存逐课脚本。模型不发出完成标志。商城 `/foundations/` 使用独立静态 `runtime.js`。`shop-cart.ts` 经 TypeScript 编译生成 `cart-compiled.js` 与 `.map`，包含原始源码供真实 Sources 映射；构建前执行类型检查和编译。

| 接口 | 用途 |
| --- | --- |
| POST /api/foundations/sessions | 指定课号与 practice/challenge；固定引导或随机故障/输入 |
| GET /api/foundations/lesson?token | 当前课脚本与会话模式 |
| GET /api/foundations/data?token&phase=baseline/fixed | 实际请求与不透明 runId，记录响应完成 |
| GET /api/foundations/trace?token | 第 17 课实际 HTTP 请求并返回次数序号 |
| POST /api/foundations/observe | 对应 runId 只接收一次 DOM/计算/请求检查报告 |
| POST /api/foundations/grade | 核对故障报告、诊断、证据、验证方案、修复报告 |

每会话 30 分钟、最多 150 次数据请求；最多 500 个活动会话，重启失效。引导 seed=42/配置一；随机题有两种配置，价格、数量、SKU 变化；可能连续随机到相同配置。不同课与模式不复用会话。HTTP 参数不能固定随机答案；`scripts/qa-lab.mjs 0|1` 仅供本地 QA 注入测试配置，日常启动不使用。

第 03 课额外等待来自服务端实际延迟或改变 quantity；第 11 课 iframe 是独立同源 document；第 17 课重复 trace 是真实 HTTP；第 18 课竞态是实际定时异步任务，没有伪造网络瀑布。每课正常结果与恢复见 [合同](FOUNDATIONS-01-18.md)。

商城运行实际故障并检查其存在，再报告 baseline；对照重新渲染并执行修复逻辑；手工编辑后「检查当前页面」保持当前内容。错误修复不记为 fixed。服务验证 runId 已完成响应、未重复且属于本会话，不能跨课使用。

**检查边界**：基础课报告来自实验页，服务没有独立读取 DOM，不能抵御主动篡改；业务源码和参考答案可检查，课程不是安全考试。教程校验 postMessage 的实验源、窗口、token、课号、模式、阶段及 passed 后更新观察，再经 grade 写练习状态。结构化答案检查不代替工具操作、自由解释或人工评分。错误提交只显示缺失检查；主动查看解析后记录辅助。

## 第 21 课接口

| 接口 | 用途 |
| --- | --- |
| GET /health | 健康检查，返回课程与协议版本 |
| GET /shop/ | 独立商城入口 |
| GET /api/products?scenario=waiting | 响应头前人为等待约 1200 ms |
| GET /api/products?scenario=download | 约 45 ms 后发响应头，再以 8 次间隔发送约 396 KB 数据 |
| 上述接口追加 fixed=1 | 去除对应受控故障，提供正常对照 |
| POST /api/challenges | 创建随机会话，仅返回不透明 ID 与题干 |
| GET /api/products?scenario=challenge&token=ID | 根据服务内会话执行未知案例 |
| POST /api/challenges/grade | 校验故障/修复响应完成、诊断、证据、验证选择 |

接口无 HTTP 缓存。挑战会话保存在进程内，30 分钟过期，服务重启后需重建；最多 500 会话，创建时清理过期记录。故障不需要真实交易或外部商品接口。

## 时序与完成记录

商城使用同源 Resource Timing 测量 requestStart→responseStart、responseStart→responseEnd。页面总用时另含解析等工作，不强行等同于 DevTools 某一行。教学模型的其他阶段固定 35 ms，明确标注简化。

页面只向允许的教程源发送 postMessage，教程同时检查来源、窗口引用、课程号、会话与数值格式。引导练习需要两种场景各完成故障与修复，并正确选择证据。挑战服务验证的是响应完成次数与答案，不等于验证用户操作过 DevTools。

## 进度

localStorage 键 `devtools-lab.learning.v1`。读取/导入有版本、课号、时间、提示数与笔记长度校验。可选布尔值 `challengeAssisted` 保存挑战是否查看解析，兼容已有 v1。导入先完整验证并写入成功再替换内存记录；失败保留旧记录。当前 01–44、50–51 可以写入完成状态，规划课没有完成按钮。阅读由用户主动记录，练习/挑战经检查后写入。

## 后续扩展

按 ROADMAP.md 增加场景合同，独立管理重置与生命周期。质量、HTTPS 等后续实验只有实现并验证后才列为开放；当前状态与验收见 STATUS.md。

## Network / Application 阶段

新增逻辑在 server/network-state.mjs，主服务优先交给此处理器，并使用 ws 接受真实 WebSocket Upgrade；4175 同伴复用会话数据。启动入口仍为 scripts/dev.mjs，管理教程和商城两个子进程，商城进程同时启动 4174、4175 并关联关闭。

| 接口 / 路径 | 用途 |
| --- | --- |
| POST /api/network-state/sessions | 指定逐课 practice/challenge |
| POST /api/network-state/chapter | 指定章节随机选案例，初始只返回会话标识 |
| GET /api/network-state/lesson?token | 实验页元数据与主动读取的诊断选项；章末界面隐藏课号和步骤 |
| POST /api/network-state/begin | 创建 baseline/fixed runId，选择实际对照 |
| POST /api/network-state/report | 核对会话、单次运行、实际资源记录与浏览器检查 |
| POST /api/network-state/grade | 故障、原因、证据、验证、修复五项共同成立 |
| /labs/<token>/ | 独立页面、资源、worker、Cookie 清理与各课业务 API |

会话 30 分钟、最多 500 个、每个最多 100 次运行。引导固定配置一，独立挑战随机两组；scripts/qa-network.mjs 0/1 只供测试注入，正常 HTTP 请求不能固定答案。runId、来源与窗口核对沿用逐课完成机制。章末只在学习者主动取诊断选项后暴露对应案例信息。

第 23 课价格 URL 刻意支持 max-age、ETag 和真实 304，不能套用第 21 课无缓存约定。4175 CORS 分别制造预检拒绝与实际响应缺头。SSE 发出命名 inventory 事件，WebSocket 发出真实消息；连接在完成观察或离页时关闭。

Storage 键带 token，IndexedDB 数据库名与 Cache Storage 名分会话，Cookie 独立命名及 Path，worker 使用默认脚本目录 scope。没有全源 clear 或根路径 worker。存储刷新仅重读，IDB 以 transaction complete 确认提交。worker 切换核对完整 scriptURL（含策略）；39 课修复仍从旧缓存开始，要求 network 来源实际更新，不预填成功值。恢复 worker 故障必要时刷新释放旧 controller。过期会话保留可访问的清理页面及仅注销自己 Cookie 的入口，其他资源拒绝继续运行。

学习 v1 可选 chapters 字段保存 network/application/performance 报告、五项 0–2 自评、辅助标记和完成时间；更新逐课记录保留章末字段，旧 v1 可直接导入。章末须案例检查通过、报告非空、自评分数至少 8，证据和验证非零；修改报告或分数撤销完成时间。自评不冒充自动监考。浏览器 DOM/Storage 检查报告仍可被主动修改，服务验证边界见 NETWORK-APPLICATION.md。

## Performance / 渲染阶段

server/performance.mjs 独立管理性能会话，主服务在通用 OPTIONS / 路由前分派。入口 /performance/<token>/ 与既有 /labs/<token>/ worker scope 没有覆盖关系；静态 HTML / CSS / 原生模块不包含框架、HMR 或 worker。每次 begin 创建 runId 后导航到新文档，只有真实文档访问过的 run 才允许报告。

| 接口 | 合同 |
| --- | --- |
| POST /api/performance/sessions | 指定课号与 practice / challenge；引导固定配置一，挑战随机输入和两组故障 |
| POST /api/performance/chapter | 从 29 / 30 / 33 抽取交互成本案例，初始不返回课号 |
| GET /api/performance/lesson?token&runId | 页面脚本与当前运行配置；章末界面隐藏课号与步骤 |
| POST /api/performance/begin | baseline / fixed，对照选择决定实际执行路径 |
| POST /api/performance/report | 核对单次文档访问、指标结构、可见性、服务端预期校验值和目标条件 |
| POST /api/performance/grade | 故障、原因、证据、验证、正常对照均成立才通过 |

会话 30 分钟、最多 500 个，每个 100 次运行；重启失效。scripts/qa-performance.mjs 0/1 仅为本地测试注入，不开放 HTTP 固定答案。CPU 负载有界、帧更新有限次，API 有超时；停止及 pagehide 取消本页请求、任务、观察器和 CSS 动画。无全源存储清理。

页面使用实际 PerformanceObserver 记录 LCP 候选、Event Timing、LayoutShift、LongTask；User Timing 和自定义指标单列。meta 与占位准备在首次场景呈现前完成，反馈区预留尺寸，原始 JSON 按需展开，减少仪器自身的布局干扰。任务级让出仍保留全部校验工作；31 对照保留推荐请求或非关键 CPU 工作，改变依赖 / 呈现顺序；29 使用同一 SKU 的实际缓存复用。

assessPerformance 的阈值仅用于本地受控素材，不是线上性能预算。服务可校验预期业务值与指标结构，但不能独立读取浏览器或抵御主动篡改。工具面板、选区、自由解释与 trace 解读需要学习者实际操作；五维自评不冒充自动认证。新 performance 章末兼容既有 v1 与两个旧章末。

## Memory / 回归阶段

server/memory.mjs 管理 40–44、50 与 Memory 章末会话。静态路径 /memory/<token>/ 与既有 worker scope 隔离，无 Vue / HMR / worker；40–44 的故障与对照在同一文档、同一 VM 内执行，不通过刷新偷偷换环境。

| 接口 | 用途 |
| --- | --- |
| POST /api/memory/sessions | 固定 practice 或随机 challenge，变化输入及两组故障 |
| POST /api/memory/chapter | 随机选 42 / 43 / 44，初始不返回课号 |
| GET /api/memory/lesson?token&runId | 当前脚本、输入、到期时间及本轮配置 |
| POST /api/memory/begin | 已访问文档后创建 baseline / fixed 运行编号 |
| GET /memory/<token>/activate?run=ID | 标记本会话运行已实际访问 |
| POST /api/memory/report | 校验单次运行、标量结构、业务结果、自有资源和课内条件 |
| POST /api/memory/grade | 真实故障 / 对照报告和原因、证据、验证共同检查 |

每会话 30 分钟、最多 100 次运行，全局 500 个活动会话；重启失效。仅本地 scripts/qa-memory.mjs 0/1 可注入测试配置，HTTP 不开放固定答案参数。正常服务保留随机行为。

MemoryLabState 是显式业务根。实际数组 / Map、命名载荷、DOM 子树、事件闭包和 interval 可沿 Retainers 检查。应用对照先取消旧注册与任务、清空旧根，再执行同样批次；每批 5 次、每运行上限 20 次。pagehide、手动停止和会话到期执行清理；API 超时 6 秒。没有全源清理，统计历史只保留标量，不把目标对象输出 Console。

50 使用实际 DOM 搜索结果及异步任务，可变商品顺序 / 延迟。业务断言由实际选择的 SKU、数量、单价产生；两种条件下至少两次成功才满足对照。下载 Recorder 示例带运行上下文和必需点击坐标，默认导航后可继续操作；跨条件需编辑 / 移除默认导航，参考课程说明。示例脚本、格式逐步执行和真正 Chrome Recorder Replay 分列。

服务校验不能独立读取整个堆或防止主动篡改页面报告。自有计数不称作浏览器整体 DOM / listener，容器归零不等于 GC 完成；快照、分配栈、面板操作与自由解释另行留证。学习 v1 新增可选 memory 章末，与旧三个章末及旧课程向后兼容。

## 质量与辅助工具

`quality.json`、`QualityDemo.vue` 与 `server/quality*.mjs` 服务 45–49、52；`/quality/:token/` 是无框架控制页，`/quality/:token/audit/?run=` 是不含控制面板的真实审计目标。`/api/quality/sessions|chapter|begin|audit|report|grade` 分别准备会话、抽题、开始运行、接收导入摘要、核对观察和检查结构化证据。Lighthouse 章末在五个已交付章末列表中，与旧 v1 兼容。

JSON 导入保留 Lighthouse 的版本、URL、时间、设备、类别、限速及环境条件；只显示真实报告的类别分数。服务限制本机当前运行、报告时间和数量，拒绝重复报告；47 要求两阶段各三份、条件一致并按 LCP / TBT 中位数比较。页面报告及导入文件都可被主动修改，系统不验证报告签名或面板点击，不作为监考或全面质量认证。

49 使用实际 CSP 响应头、实际内联阻断事件与 host-only / 无关 Domain Cookie；清理仅过期本会话 Cookie。52 的 `product.json` URL 在会话中稳定；服务器对照改变实际响应，“检查手工覆盖”保持故障数据，便于在 Chrome Local overrides 验证。工具内 CSS 用 `product.css`；Changes / Workspaces 的操作由学习者在工具中完成。

会话 30 分钟、每会话最多 100 次运行，全局最多 500 会话；报告限标量、审计限三份。停止 / 离页中止页面自有请求、脚本和定时清理；仅关闭本页打开的审计窗口。浏览器限速、覆盖目录、设备模拟与工作区映射需另在工具恢复。可选 `qa-lighthouse.mjs` 调官方 Lighthouse 13.0.1 CLI 在独立临时 Chrome 运行 Navigation，不连接已有用户浏览器，也不代表原生 Timespan / Snapshot 验收。

实验窗口名称在每个教程文档初始化时生成独立标识；同一教程内复用自己的课内 / 章末窗口，不与另一个教程窗口共用 opener。第 21 课及预览入口遵循同样隔离。结果仍核对实际 source、origin、token 和课程；窗口隔离不代替消息校验。
