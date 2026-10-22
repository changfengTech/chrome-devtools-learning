# 第 01–18 课实现与实验合同

本批覆盖排查入门、Elements、Console、Sources。每课包含独立原理模型、真实商城案例、两组故障配置的迁移题、三级提示和复盘。第 21 课保持可用。关联的 48、52 节完整独立课及章末题仍按路线后续实施。

## 共同运行与验收约定

从教程准备会话，再点击打开商城。引导题固定配置一和 seed=42；迁移题随机配置一/二及价格、数量、SKU，不承诺每次都抽到不同配置。运行故障会实际渲染并触发一次业务，检查目标故障存在。应用对照会重新渲染并触发一次业务；手工修改后点「检查当前页面」则保持当前 DOM。重复触发会累积动作次数。恢复故障重新获取数据、清空场景并重绑监听器。教程刷新后学习记录保留，临时会话需要重新准备。

引导完成要求本会话观察、正确修复和证据选择全部成立。迁移题五项检查要求全部通过：故障报告、原因、证据、验证方案、修复报告。错误答案不显示正确选项；主动查看解析记录为辅助。服务校验请求完成、会话、报告格式和结构化答案；DOM/计算检查来自实验页，不是可信监考，更不证明操作过 DevTools。自由笔记不自动打理解分。

| 课次 | 详细脚本 | 原理模型 |
| --- | --- | --- |
| 01 | [认识 DevTools](lessons/01.md) | panels |
| 02 | [用证据排查问题](lessons/02.md) | evidence |
| 03 | [管理实验条件](lessons/03.md) | origin |
| 04 | [从页面定位 DOM](lessons/04.md) | dom |
| 05 | [为什么样式没生效](lessons/05.md) | cascade |
| 06 | [看懂布局](lessons/06.md) | layout |
| 07 | [检查状态与事件](lessons/07.md) | states |
| 08 | [页面是否容易使用](lessons/08.md) | a11y |
| 09 | [从日志中找线索](lessons/09.md) | logs |
| 10 | [阅读错误与堆栈](lessons/10.md) | stack |
| 11 | [用表达式验证猜想](lessons/11.md) | context |
| 12 | [记录可信的值和耗时](lessons/12.md) | snapshot |
| 13 | [找到值得看的源码](lessons/13.md) | sourcemap |
| 14 | [暂停与单步执行](lessons/14.md) | stepper |
| 15 | [检查变量与调用关系](lessons/15.md) | scope |
| 16 | [只在需要时停下来](lessons/16.md) | conditional |
| 17 | [从行为追到代码](lessons/17.md) | triggers |
| 18 | [捕获异常与异步问题](lessons/18.md) | async |

## 来源与验证范围

课程链接使用 Chrome 官方文档。2026-10-20 复核 [Source Maps](https://developer.chrome.com/docs/devtools/javascript/source-maps)、[Breakpoints](https://developer.chrome.com/docs/devtools/javascript/breakpoints)、[Console reference](https://developer.chrome.com/docs/devtools/console/reference)、[Accessibility reference](https://developer.chrome.com/docs/devtools/accessibility/reference)。浏览器验收使用应用内 Chromium；准确引擎版本未由工具返回，不能声称已逐项验证某个独立 Chrome Stable 版本。详见 [验收记录](QA-FOUNDATIONS.md)。
