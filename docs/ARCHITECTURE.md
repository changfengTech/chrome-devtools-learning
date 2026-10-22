# 当前实验架构

## 入口与隔离

- 教程：Vue / TypeScript / Vite；开发 127.0.0.1:5173，构建预览 4173。
- 商城：原生 HTML/CSS/JavaScript；Node HTTP 服务 127.0.0.1:4174；没有 Vue、HMR、Vue DevTools 注入。
- 两个源隔离存储和控制范围。未来的 Service Worker 仅注册于实验源。
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

localStorage 键 `devtools-lab.learning.v1`。读取/导入有版本、课号、时间、提示数与笔记长度校验。可选布尔值 `challengeAssisted` 保存挑战是否查看解析，兼容已有 v1。导入先完整验证并写入成功再替换内存记录；失败保留旧记录。当前 01–18、21 可以写入完成状态，规划课没有完成按钮。阅读由用户主动记录，练习/挑战经检查后写入。

## 后续扩展

按 ROADMAP.md 增加场景合同，独立管理重置与生命周期。状态、缓存、CORS、流式协议、内存、HTTPS 等实验只有实现并验证后才列为开放；当前 API 不暗示这些已交付。
