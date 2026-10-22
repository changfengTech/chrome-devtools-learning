# Lighthouse / 辅助工具验收

日期：2026-10-22。本批 45–49、52 六课及 Lighthouse 章末功能。累计 52/63 课（01–52），11 课规划；五个面板章末可用。功能、协议 / CLI 证据、原生面板人工复核分别记录。

## 环境与边界

Node 25.9.0、pnpm 12.14.0、Vite 8.3.4；教程生产预览 4173、独立商城 4174、同伴服务 4175。流程 UI 使用应用内 Chromium。实际审计由官方 Lighthouse **13.0.1 CLI** 在独立临时 Headless Chrome 运行 Navigation；报告环境 UA 为 **Chrome/156.0.0.0**，不将其推断为应用内浏览器或用户 Chrome 的完整版本。

审计使用 `throttlingMethod=provided`：不额外施加 Lighthouse 限速，不能把 settings 中模拟预设数值称作实际启用的限速。Desktop / Mobile 与类别按案例指定；47 两阶段固定 Desktop、四类、同一 Lighthouse 版本、屏幕及限速方式。三份报告取中位数，不能复制同一 fetchTime 的报告。报告导入说明本机当前运行、字段与时间检查，明确不验证文件来源签名，也不证明原生面板操作。

CLI 只审计本机专用静态商品页，无教程框架、HMR 或 Service Worker；没有连接用户已有浏览器、关闭沙箱或忽略证书错误。可复现入口：`node scripts/qa-lighthouse.mjs 本轮审计地址 输出.json desktop all`；需本机 Chrome、首次从包仓库取得官方 CLI。运行前从课程准备会话，地址 30 分钟后或服务重启失效。

## 六课证据

| 课次 | 实际故障与对照 | 已取得证据 |
| --- | --- | --- |
| 45 | Desktop 回答 Mobile 目标；Performance 单类误当四类 | 引导与第二配置挑战的真实 JSON 导入、类别 / formFactor、教程回传与证据判定 |
| 46 | button-name 为 0；meta-description 为 0 | 两项实际审计分别从 0 到 1，目标元素 / head；实际 Tab / Enter、详情和正确 SKU / 数量 / 总额；未勾人工检查时固定阶段回传禁用 |
| 47 | 图片响应等待；normalizeCatalog 重复四次 | 每配置两阶段各三份独立 Navigation；LCP / TBT 中位数、相同条件和正常业务；未将示意模型值当审计值 |
| 48 | 760px 网格；660px 筛选面板 | 实际 390px 故障与对照，真实筛选和加购；三轮引导、两配置浏览器操作；错误对照不通过 |
| 49 | CSP 拒绝 inline；Cookie Domain 无关 | 三轮引导、两配置浏览器操作；CSP Issue 原始事件，Network ExtraInfo 的拒收原因；同源脚本 / host-only 对照恢复 |
| 52 | unitPrice 字符串；stock=null | 三轮引导、两配置浏览器操作；稳定商品 URL、实际数据和购物结果；保持服务器故障的单字段浏览器响应替换及撤销后复现 |

[模型操作与复位](qa/quality-models.json)六项全部改变输出，重置回原始状态；模型不改完成记录。[教程流程](qa/quality-flows.json)保存引导和挑战结果；[三轮页面引导](qa/quality-repeat.json)是 48 / 49 / 52 各三轮、每轮故障与正常对照。45 / 46 / 47 的教程引导各完整走通一轮，Lighthouse 的重复验证按独立 Navigation 单列，不能把三份报告称为三次教程控制流程。

[第二配置](qa/quality-variant-b.json)记录 48 / 49 / 52 的故障、错误修复、正确修复；[随后服务端判定](qa/quality-variant-b-grade.json)中错误证据均 false、正确均 true。这三项另从教程完整提交了第二配置挑战，结果见教程流程文件；直接实验页及 Grade API 的证据保留作交叉检查。45 / 46 / 47 第二配置也从教程独立挑战全程通过。

### 实际性能样本

主图配置三份 LCP 为 **1449.740、1425.606、1426.425ms**，中位数 **1426.425ms**；同条件正常对照 **65.149、49.813、58.655ms**，中位数 **58.655ms**。这是本机受控请求等待的结果，不是线上预算或用户体验保证。TBT 配置三份基线为 431.117、430.413、430.433ms，中位数 **430.433ms**；对照为 70.873、70.338、70.336ms，中位数 **70.338ms**。全部 46 份有效报告的条件、原始文件哈希与指标见 [真实审计汇总](qa/quality-lighthouse.json)，另附一份[未经改写的完整 Lighthouse JSON](qa/quality-lighthouse-example.json)。

其中 24 份来自 `qa-quality-audits.mjs`：45 / 46 × 两配置 × 两阶段 × 每阶段三次独立导航，逐份检查真实条件 / audit 并经导入接口接收。普通质量重复案例可并行；47 的 12 份性能对照另按顺序运行，没有把并发批次作为其性能基准。

早期 SVG 主图虽然实际等待 1400ms，但 Chrome 仍选文字作为 LCP；三次结果约 40–52ms，不能支持本课判定，已作废。改为仓库自有程序生成的带表面纹理 PNG 后，真实报告确认图像成为候选，才重新取得以上三份样本。没有修改 Lighthouse 指标或放宽趋势规则来通过。

[实际 CPU 采样](qa/quality-cpu-profile.json)取得本课 work.js 的 normalizeCatalog 节点及 281 个命中；这是 CDP Profiler 采样，未冒称原生 Performance 面板录制。首次过短采样未覆盖 200ms 后任务，已丢弃并重采完整区间。

部分 Best Practices 实际为 96，本批不要求四类全 100；导入显示原值，目标 audit 与人工路径分别检查。图片等待缩短不证明其它性能成本全部消失；CPU 工作减少也不把 TBT 称为 INP。

## 浏览器规则与响应替换

[CSP 事件](qa/quality-browser-issues.json)为 Chrome `Audits.issueAdded → ContentSecurityPolicyIssue`，`kInlineViolation`、`script-src-elem` 指向本课内联脚本插入；不是模拟 Issues 数字。

[Cookie 证据](qa/quality-cookie-issues.json)在此环境未观察到相应 `Audits.issueAdded`，因此不宣称出现 Issues 卡片；实际 `Network.responseReceivedExtraInfo` 含被拒 Set-Cookie 与 blockedCookies 原因，页面后续 profile 不接收，host-only 对照恢复。没有绕过证书警告、放宽 CSP 或关闭隐私保护。本机 HTTP 的 isSecureContext=true 不等于 TLS。

[响应替换](qa/quality-response-interception.json)使用仅本课 product.json 的 CDP Fetch Response 拦截，将字符串单价转换为数值，实际加购总额 84；清除规则后同一服务仍返回字符串并恢复故障。这证明手工验证入口能在服务器保持故障时使用替换后的数据，**不算 Chrome Local overrides 目录配置 / 覆盖标记的 UI 验收**。未修改真实业务服务或源仓库来冒充覆盖。拦截规则已清除；第一次分步尝试因本页 6 秒超时作废，之后在一次有界操作中完成替换，正常超时恢复保留。

## 章末、失败与记录

[章末流程](qa/quality-chapter.json)初始隐藏课号与步骤；实际抽到无名称按钮。两份真实审计与人工键盘路径通过后，案例正确但报告 / 评分不足仍不完成；补齐非空报告及五维自评后保存，刷新保留。10/10 为 QA 自评样本，不是自动能力认证。

[无效报告导入](qa/quality-invalid-import.json)显示运行错误、保持回传禁用；[错误证据与辅助标记](qa/quality-failure-assisted.json)确认错误选项不通过，查看解析后记录辅助；[中途停止](qa/quality-stop.json)确认检查入口禁用且当前会话未回传。

[人工门槛](qa/quality-manual-gate.json)显示未勾自报检查时正常阶段禁用，实际业务后可提交。自动测试还覆盖异源 / 旧运行 / 重复 / 过期报告、缺字段 / 负数、宽屏冒充窄屏、条件不一致、中位数样本不足、跨会话、非法模式和五章末 v1 兼容。

[三视口布局](qa/quality-responsive.json)：六课模型加章末 × 实际 320 / 768 / 1440，共 21 项无整页横向溢出，记录 innerWidth 与请求宽度一致。[设备条件](qa/quality-device.json)另检查 320、390@DPR2 + touch、768、1440；CSS 宽度、粗指针 / hover、currentSrc 与购物结果分列。浏览器增大 DPR 后再缩回可继续使用已缓存大图，不强行要求 currentSrc 随 DPR 降低。[商城三视口](qa/quality-shop-responsive.json)另有商品实验 / 审计控制 / 审计商品页 × 三尺寸共 9 项，无整页溢出；负的宽度差表示滚动条占位。视口和触摸设置已恢复；真机软键盘 / 手势仍需单独覆盖。

[五章末兼容样本](qa/quality-progress-sample.json)只含 QA 数据；[实际导入结果](qa/quality-progress-import.json)保留五章末、旧 21 课及 52 辅助标记，非法分数导入后再次导出与原样本一致。

[最终生产服务](qa/quality-production.json)已恢复正常随机工厂，49 / 52 教程→商城→回传→证据记录通过；购物结果为 CUP-42、数量 2、总额 84。所有临时实验标签页关闭，原学习记录经导入恢复并再次导出，与验收前备份完全一致。

## 工程与尚待人工复核

`pnpm test` 47/47；`pnpm build` 商城类型 / Source Map、Vue 类型与生产构建通过。生成 51 份详细脚本，另有第 21 课样板；目录 63 节。原学习记录在验收前备份，结束后恢复并导出核对；临时浏览器协议设置和验收服务恢复情况见最终生产记录。

尚待原生英文面板复核：Lighthouse Navigation / Timespan / Snapshot 的界面选择与导出；Issues 卡片展开、Privacy and security 的连接 / 证书界面；Sources Overrides 专用目录、Network 覆盖标记、Changes diff 与 Workspaces 的实际映射保存。CLI、CDP 或页面模型不冒称完成这些操作。45 / 46 / 47 连续三次完整教程控制流程重建仍列为补充流程检查，不能把三次独立审计换称为三次完整引导。

阶段 5 的原生堆 / 分配 / Recorder 待办保留在 [QA-MEMORY.md](QA-MEMORY.md)。阶段 6 功能交付与上述退出待办分开；本批没有把全部课程或所有原生面板标为最终验收关闭。
