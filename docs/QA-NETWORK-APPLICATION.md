# Network / Application 验收记录

日期：2026-10-22。本批新增 19、20、22–26、35–39 共 12 课；第 21 课保留并回归，覆盖指定的 13 课。全站 31/63 课可实战，32 课规划。

## 环境与检查边界

本机 Node.js 25.9.0、pnpm 12.14.0；商城 TS、真实 Source Map、Vue 类型与 Vite 生产构建通过。使用应用内 Chromium，准确引擎版本未返回，未推断独立 Chrome 版本。英文面板按钮与版本差异仍需独立 Chrome 人工复核。

浏览器检查操作实际控件，覆盖 HTTP 缓存、CORS 限制、WS / SSE、Cookie、Storage、IndexedDB、Service Worker 和 Cache Storage。模型解释关系，不修改浏览器设置，也不产生完成记录。Node 测试用受控报告验证协议，不能替代浏览器 DOM / 存储结果。

服务核对会话、资源记录、单次运行报告与结构化答案；DOM / Storage 观察来自实验页，可被主动篡改，不是可信监考，不证明实际点击过 DevTools。章末分数与自由报告为学习者自评，不是自动能力认证。

## 逐课结果

每个新模型已操作输入并核对输出；每课引导在同一会话连续三轮运行故障、恢复及修复；两组独立挑战均完成实际观察、修复及原因 / 证据 / 验证检查。

| 课次 | 真实故障与正确对照 | 模型 | 引导三轮 | 挑战两组 |
| --- | --- | --- | --- | --- |
| 19 | 搜索参数遗漏 / 重复请求 → 单次正确搜索，干扰请求可筛选 | 通过 | 通过 | 通过 |
| 20 | HTTP 422 字段错误 / HTTP 200 业务拒绝 → 正确处理契约 | 通过 | 通过 | 通过 |
| 22 | 推荐阻塞主图 / 库存重复调用 → 并行启动与单次请求 | 通过 | 通过 | 通过 |
| 23 | 新鲜缓存复用 / 服务返回旧版本 → 版本 2 与条件验证 | 通过 | 通过 | 通过 |
| 24 | OPTIONS 拒绝 / POST 缺 CORS 头 → 方法、请求头及来源许可 | 通过 | 通过 | 通过 |
| 25 | 503 一直 loading / 图片 404 无替代 → 收尾、重试与替代 | 通过 | 通过 | 通过 |
| 26 | SSE 监听不匹配 / WS 读取错误字段 → 消息 stock=3 更新 | 通过 | 通过 | 通过 |
| 35 | Cookie Path 错误 / Max-Age=0 → profile 收到 HttpOnly Cookie | 通过 | 通过 | 通过 |
| 36 | 购物车未持久 / 筛选串标签 → local 与 session 分工 | 通过 | 通过 | 通过 |
| 37 | 写读键不一致 / request success 后 abort → 事务提交可读 | 通过 | 通过 | 通过 |
| 38 | v2 waiting / scope 不覆盖 → controller 与返回版本为 v2 | 通过 | 通过 | 通过 |
| 39 | cache-first 旧副本 / 图标 404 → 版本 2 与图标 200 | 通过 | 通过 | 通过 |

原始结果：[模型](qa/network-models.json)、[三轮引导](qa/network-practice.json)、[挑战一](qa/network-challenge-a.json)、[挑战二及清理](qa/network-challenge-b.json)。注入入口仅用于分别覆盖两组配置，正常启动随机；HTTP 参数不开放固定答案。

worker 最终复核按完整 scriptURL（含策略）等待控制切换，修复不预填新缓存值：38 / 39 重新完成三轮引导及两组挑战，39 必须显示 network 来源并实际更新旧缓存。[最终 worker 记录](qa/network-worker-final.json)。

第 21 课等待约 1207→47ms，主体传输约 1170→0ms；两种引导及随机等待挑战通过。[时序记录](qa/network-21-regression.json)。数值为本次观察，不是稳定性能阈值。

## 协议与状态补充取证

- 浏览器缓存：捕获 fromDiskCache=true 及实际条件响应头事件 304，fetch 合并表示可为 200。[协议记录](qa/network-cache-protocol.json)。
- 实际阻断：第 25 课 Network.loadingFailed / blockedReason=inspector；修复结束 loading 并保留重试。取消阻断后先收到固有 503，再次重试成功；设置已恢复。[阻断与重试](qa/network-blocked-recovery.json)。HTTP 错误和未取得 HTTP 响应分别显示。
- 跨标签：实际 rel=noopener 新页 localStorage cart=2、sessionStorage cart=null；刷新仍相同，不自动重写。[跨标签](qa/network-storage-tabs.json)。
- IDB：已提交 CUP-42 收藏与价格 36 在刷新重读后仍存在。[提交与刷新](qa/network-idb-reload.json)。事务 abort 由另一挑战覆盖。
- 作用域：worker、数据库、缓存和键分会话；重启后原实验路径仍可清理。检查 6 个已知过期测试会话。[过期清理](qa/network-expired-cleanup.json)。Cookie 清理范围另由接口测试核对。

### 离线验证的实际条件

本工具页面级 CDP Offline 未同时阻断 worker 网络：服务仍收到请求，页面返回 network。因此未把这次设置当作离线成功。

随后停止本地商城服务，使 worker fetch 实际连接失败，第 39 课离线读取返回版本 2、cache-storage-fallback。[初次文本](qa/network-offline.txt)、[最终商品与离线导航](qa/network-offline-final.json)、[截图](images/application-cache.png)。服务随后恢复。这证明网络失败时缓存回退；独立 Chrome 中 DevTools Offline 的人工复核仍待补。

## 章末与记录

| 项目 | 实际结果 |
| --- | --- |
| Network 章末 | 初始隐藏课号 / 步骤，抽到请求串行；案例通过但 0 分仍拒绝完成，补齐报告与自评后保存 |
| Application 章末 | 初始隐藏课号 / 步骤，抽到 waiting worker；控制版本修复后报告与自评保存 |
| 持久化 | 刷新保留两个章末记录；之后更新第 21 课记录仍保留章末字段 |
| 辅助 | 20 课错误修复拒绝，查看解析后通过保存辅助标记与提示级别 |
| 导入导出 | 12 课 + 两章末往返；非法分数拒绝且保留原记录；兼容旧 v1 |
| 恢复 | 5173 / 4173 原记录先备份，结束后通过导入恢复，不保留验收完成状态；[生产恢复](qa/network-production-restored.json) |

仅含本轮 QA 的[样本](qa/network-progress-sample.json)、[失败与辅助](qa/network-failure-assisted.json)、[导入检查](qa/network-progress-import.json)。章末 10/10 是流程验收自评，不代表能力评价。错误证据的可见拒绝反馈见下方生产记录。

## 布局、构建与生产

13 个课程模型页 + 两章末 × 320/768/1440，共 45 项主文档无横向溢出。[逐项记录](qa/network-responsive.json)。独立商城另以实际 320px 检查，文档宽度 305px，控件与长 scope 换行可用；视口覆盖已恢复。基础课此前 54 项另列，没有冒称本轮重测。

- pnpm build：商城 TS、Source Map、Vue 类型与生产构建通过。
- pnpm test：28/28，覆盖基础 / 21 回归、两组 12 课会话、错误条件、CORS、缓存、持续连接、Cookie、worker 路径、章末与过期清理。
- pnpm docs:curriculum / docs:lessons：63 节目录、30 份详细脚本及共同合同生成通过。
- 生产 4173→4174/4175→回传→证据：24、25、39 通过，24 错误证据拒绝，正确证据记录练习。[生产记录](qa/network-production.json)。
- 19 模型补查关闭录制后导航不添加记录；24 模型补充简单请求前提；25 真正网络拒绝和重试路径通过。

当前 pnpm preview:all，教程 [127.0.0.1:4173](http://127.0.0.1:4173/)。从课程准备会话；结束后只清理自己的实验并恢复网络、限速、阻断设置。

## 2026-10-22 整体验收补充

本轮 19–26、35–39 与 Network / Application 章末重新回归，课程两配置与章末两配置通过；独立 Chrome Timing 已补等待与下载区间证据。另补原生 Service Workers waiting / skipWaiting / fresh Console fetch 与 Offline 缓存回退，结束恢复设置和清理注册；限速 / 阻断及其他 worker 配置的细项单列。

最新逐项证据、剩余项和用户状态恢复见 [整体验收记录](QA-RELEASE.md)。本文件前文保留当批历史结论，不计作本轮重复三轮。
