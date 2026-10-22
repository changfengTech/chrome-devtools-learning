# Network / Application 阶段实验合同

新增 19、20、22–26、35–39 共 12 课，保留并回归第 21 课，合计本阶段 13 课。全站开放状态以 [实施状态](STATUS.md) 为准。

## 共同约定

教程 5173/4173、商城 4174、跨源服务 4175，统一启动和停止。每次准备使用独立 `/labs/<token>/` 路径；Cookie、Storage、IndexedDB、Cache Storage、worker scope 仅属于当前实验。核心实验不需要真实账号和交易。

引导案例固定配置一、seed=42；独立挑战随机两组故障与输入。故障报告、原因、证据、验证和修复五项全部成立才记录通过。服务校验会话、请求与报告格式；浏览器报告可被主动修改，不是可信监考，不证明实际点击过 DevTools。文字笔记不做关键词评分。

恢复故障重新运行本案例；存储课刷新只读取已有状态。清理按钮仅处理本会话命名空间和注册，当前 controller 关闭或刷新后释放。即使会话过期，仍可打开原实验路径执行本会话清理。限速、离线、资源阻断需自行恢复；Offline 下可先观察，恢复 Online 后再报告。

| 课次 | 脚本 | 正常结果 |
| --- | --- | --- |
| 19 | [找到一次操作的请求](lessons/19.md) | 一次搜索仅产生一个含 q=cup 的 search 请求，返回一件目标商品。 |
| 20 | [检查请求与响应契约](lessons/20.md) | 正确 quantity 得到订单；业务缺货时不显示创建成功。 |
| 22 | [谁发起请求，为什么现在才发](lessons/22.md) | 主图不等待无关推荐，库存只读取一次。 |
| 23 | [为什么总是旧数据](lessons/23.md) | 服务发布版本 2 后页面也读取 2；条件验证可产生真实 304。 |
| 24 | [浏览器为什么拦截请求](lessons/24.md) | OPTIONS 满足需要，POST 实际响应允许来源，浏览器可读取 JSON。 |
| 25 | [弱网、断网和资源阻断](lessons/25.md) | 失败后结束等待并可重试，图片失败保留可读替代。 |
| 26 | [检查持续连接](lessons/26.md) | SSE 或 WebSocket 消息中的 stock=3 更新到页面。 |
| 35 | [登录状态与 Cookie](lessons/35.md) | 当前 Cookie 随 account/profile 发出，authenticated=true。 |
| 36 | [Local 与 Session Storage](lessons/36.md) | 购物车保存到 localStorage；每标签筛选保存到 sessionStorage。 |
| 37 | [检查 IndexedDB](lessons/37.md) | 当前 SKU 的 favorite/price 记录事务提交且可读，刷新仍存在。 |
| 38 | [Service Worker 如何接管请求](lessons/38.md) | 本页面 controller 指向目标 worker，受控接口返回 workerVersion=2。 |
| 39 | [离线资源与应用信息](lessons/39.md) | 商品与缓存更新到版本 2，Manifest 图标实际 200，网络失败可回退到缓存副本。 |

第 21 课沿用 [完整样板脚本](LESSON-21.md)，等待/传输故障与迁移题不被新模板替代。

## 两个章末任务

从 Network 或 Application 章节底部生成独立会话；初始不返回具体课号、不提供分步取证。先自行定义正常行为、选择工具并观察，再读取诊断选项。章末案例在所属已交付场景中随机选择，输入与故障均变化。

自动检查仍要求真实故障/修复报告和原因/证据/验证一致。报告由学习者填写，五维各 0–2 分自评：复现准确、工具选择、证据有效、根因解释、修复验证；总分至少 8，证据和验证非零，才记录完成。自评分数不冒称自动能力认证。解析使用单独标记。章末报告与自评可随 v1 学习记录导入导出，兼容既有课程记录。

## 验收与来源

验证环境与逐项结果见 [QA-NETWORK-APPLICATION.md](QA-NETWORK-APPLICATION.md)。课程使用 Chrome 官方文档；worker 生命周期参考 [web.dev](https://web.dev/articles/service-worker-lifecycle)，Cache Storage 参考 [Chrome 文档](https://developer.chrome.com/docs/devtools/storage/cache)。不引用已移除的 AppCache 作为本课实现。
