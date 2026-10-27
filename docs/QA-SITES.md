# ChatGPT Sites 发布验收

更新：2026-10-27。三个原站点已恢复可访问。范围：实际线上课程 / 商城闭环与选定浏览器能力；不把 63 课的接口检查、历史本地原生证据或这一轮抽样说成全部原生工具重新通过。

## 当前结果

| 检查 | 结果 | 依据与边界 |
| --- | --- | --- |
| 三个公开站点 | 本机浏览器可访问 | 课程 Vue 挂载、商城首页、CORS 同伴说明页和课程健康连接；用户也确认三站恢复 |
| 当前部署 | 教程 v3 / 商城 v5 / 同伴 v3 | 保留原项目与公开权限；[精确发布记录](qa/site/deployments.json) |
| 构建与类型检查 | 通过 | 本次 site 生产构建、Vue / TS、商城 TS / Source Map；商城 v5 Worker 打包与 runtime 语法检查；本次修复后本地构建 / 类型检查通过 |
| 本机线上 HTTP | 79/79 通过 | [教程 / 商城 v3 结果](qa/site/http-local-2026-10-27-v3.json)：三首页、实际前端资源、63 课会话 / 请求、8 章末会话、真实请求挑战、CORS 与 SSE；没有写学习记录或提交伪造观察 |
| 浏览器引导流程 | 9 课通过 | 05、21、24、26、35–39；真实运行故障 / 修复、选择证据、跨窗口回传与练习保存 |
| 浏览器独立挑战 | 05 / 26 通过 | 05 的错误证据拒绝；26 实际 WebSocket 消息与修复；不是全部逐课挑战的重测 |
| 浏览器状态与缓存 | 选定流程通过 | HttpOnly Cookie、Local Storage 刷新 / 新标签、IndexedDB 刷新读取、worker v1→v2 和原生 Offline 回退 |
| 学习记录 | 导出 / 导入 / 保留通过 | 实际 JSON 下载；非法版本拒绝并保留原记录；有效备份重新导入；最终刷新显示 9 条引导、2 条挑战 |
| 本次修复合同测试 | Node 61 / Workers 10 通过 | [本次输出](QA-SITES-NATIVE.md#lighthouse-模式校验修复)；新增跨审计模式拒绝与报告名额回归，协议测试与原生报告分别记录 |
| 线上高级原生 | Performance / Memory 核心通过 | 第 29 课两轮录制 / Bottom-up / 源码 / 保存与故障回载；第 41 课三快照 / Retainers / Comparison / 保存回载。Lighthouse 原生、Performance 两项细节与其余分支继续待验 |
| v5 发布后 HTTP | 79/79 + 模式拒绝通过 | [79 项结果](qa/site/native-2026-10-27/http-v5.json)、[第 47 课模式拒绝](qa/site/native-2026-10-27/lighthouse-mode-http.json)；不提交合成有效审计或写学习记录 |

详细机器记录：[本轮浏览器结果](qa/site/online-2026-10-27/browser.json)、[全阶段汇总](qa/site/browser.json)。本轮始于教程 / 商城 v2；26、35–36 使用 v3，37–39 与存储刷新修复复验使用商城 v4。v4 仅补存储页刷新入口；79 项 HTTP 结果对应教程 / 商城 v3，不冒称 v4 的所有浏览器流程都重跑。

## 已取得的真实证据

- 05：实际 ID 规则覆盖 class，计算颜色从 `rgb(184, 65, 84)` 修复为 `rgb(22, 130, 103)`；商城结果经真实 opener / postMessage 回到课程。正确原因配错误证据会被拒绝，改为实际证据后挑战通过，刷新保留记录。[挑战截图](qa/site/online-2026-10-27/05-challenge.png)。
- 21：真实请求响应前等待约 1617 ms，首次修复受公网波动影响为 3027 ms，复测为 170 ms；主体传输约 1159→1 ms。保留异常样本，不将本机数字当作跨网络性能保证。[真实下载对照](qa/site/online-2026-10-27/21-download.png)。
- 24：浏览器预检 403，报告 `PreflightMissingAllowOriginHeader`；修复后 OPTIONS 204、POST 200，JSON 实际可读取，结果回传并保存练习。[脱敏浏览器网络事件](qa/site/online-2026-10-27/cors-browser.json)、[页面结果](qa/site/online-2026-10-27/24-cors.png)。没有仅凭 `requestWillBeSent` 就断言业务 POST 已抵达服务。
- 26：真实 SSE 收到 stock=2、3，错误监听时页面为 0，修复后为 3；独立挑战使用真实 WebSocket，错误字段导致 undefined，修复后为 3，挑战通过。[SSE](qa/site/online-2026-10-27/26-sse.png)、[WebSocket](qa/site/online-2026-10-27/26-websocket.png)。
- 35：profile 从未认证变为已认证；CDP 只读取本合成会话在 profile 路径匹配的 Cookie 属性，确认 HttpOnly 与正确 Path，没有保存 Cookie 值。[Cookie 属性](qa/site/online-2026-10-27/35-cookie.json)。
- 36：购物车从仅在 sessionStorage 改为 localStorage，刷新后保留 2；实际点击 `rel=noopener` 链接，新标签仍读到本地购物车，session cart 为 null。会话筛选的第二变体未在本轮重测，不据此宣布所有 Session Storage 分支通过。
- 37：当前 SKU 读取 undefined，统一写读键后得到真实提交的收藏记录，刷新仍可读。通过实验页实际 IndexedDB API 验证；工具不提供 IndexedDB raw CDP 方法，未将其记成 Application 面板手工检查。
- 38：实际 v1 active / v2 waiting，激活后 controller 和返回版本为 v2；原生浏览器网络事件确认 `fromServiceWorker: true`。[worker 证据](qa/site/online-2026-10-27/38-worker.json)。
- 39：cache-first 读旧版本 1，network-first 更新为版本 2，Manifest 图标为 HTTP 200。另在独立 Chrome 无痕窗口设置原生 Network Offline，确认 worker 的请求 `ERR_INTERNET_DISCONNECTED`，页面请求仍从 ServiceWorker 返回 200，内容为版本 2 / `cache-storage-fallback`。[原生 Offline 与清理记录](qa/site/online-2026-10-27/39-native-offline.json)。不是仅对页面设置 CDP Offline 后推断 worker 也断网。

上述 9 课抽样只操作合成会话。该阶段 Chrome 网络条件与原筛选已还原，实验缓存 / 注册已清理，专用无痕窗口已关闭；未修改系统 VPN、DNS、路由或证书信任。公开证据不含个人页面、浏览器资料、Cookie 值或源码凭据。

## 追加：线上 Performance / Memory 原生补验

第 29 课原生 Record / Stop 故障及修复，consumeCPU Total time 177.8 → 59.6 ms，两轮业务校验值 84；Bottom-up 展开 normalizeProduct、打开实际源码、保存两份 trace，故障文件回载一致。第 41 课同文档空闲 / 故障 / 修复三快照，实际引用链到 Window / GC roots；Comparison 新增 1、删除 5、净减 4；三快照保存，修复快照回载一致。[原生截图、哈希与细项](QA-SITES-NATIVE.md)。

Lighthouse 原生复验在准备时再次被其他页面切换中断，未生成本轮报告。Memory 实验负载已停止清理并关闭标签，整个访客窗口已包含其他工作页面而保留，不将历史本地 Lighthouse 报告充作线上完成。

## 本轮修复与复验

1. 在线会话准备沿用 5 秒本地超时，公网偶发较慢时会误报失败；在线上限改为 30 秒，本地仍为 5 秒，不自动重放 POST。
2. 在线准备失败原本建议运行 pnpm，改为重试在线实验并检查商城可达性。实际临时阻断会话请求，验证新提示；阻断已撤销。[线上失败提示](qa/site/online-2026-10-27/online-error.png)。
3. CORS 文案区分本地端口 4175 与在线独立 HTTPS 来源，实验商城称呼不再限定“本地”。教程与商城 v3 发布成功。
4. 第 36 课刷新后数据存在但新标签入口消失；商城 v4 恢复入口，不重写存储。已在原会话刷新后确认入口可见、`rel=noopener` 和购物车值不变。

5. Lighthouse condition 遗漏 gatherMode，跨模式可得到相同条件键；商城 v5 增加模式字段与显示、第 47 课仅接受 Navigation，并加测试及线上拒绝检查。

## 下一阶段与验收门槛

1. **高级原生 HTTPS 实战**：补 Performance 修复文件回载 / Call tree 详细展开；完成 Lighthouse 三模式原生运行、真实报告导入 / 修复与 47 同条件三次中位数。Performance / Memory 已完成项沿用本次真实证据，不重复标待验；其他 Memory 变体与分配工具单列。
2. **补齐剩余浏览器分支**：HTTP 缓存真实 304、Session Storage 每标签筛选变体、其余课章入口与八章末的浏览器作答 / 报告 / 恢复。当前 63 课和 8 章末均已检查会话 / 协议入口，不能替代这些 UI 流程。
3. **整理发布验收**：仅按真实证据更新 README / 状态，保留异常样本与恢复说明；所有需要关闭的浏览器链路通过后，再标记整体验收完成。
4. **条件项目单列**：Android 真机、定位授权、AI 可用账户、目录授权及跨设备性能差异按[额外条件](DEPLOYMENT.md#原生工具与额外条件)补验，不编造设备或账户证据。

## 可达性历史

10-25 的连接重置、独立公网 79 项成功与原站点管理检查保留在[历史诊断](qa/site/network-2026-10-25.json)、[管理页截图](qa/site/manager-url-settings.png)和[历史支持报告](SITES-SUPPORT-REPORT.md)。10-27 用户和本机浏览器均确认恢复；根因仍未确定，未把问题归因于某一 VPN 规则或声称做过平台修复。支持报告未外发。
