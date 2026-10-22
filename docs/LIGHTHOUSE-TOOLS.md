# Lighthouse / 辅助工具实验合同

本阶段 45–49、52 共 6 课及 Lighthouse 章末。模型不计完成。

## 真实证据与环境

路径 `/quality/<token>/`。原生商城、审计目标与教程分离；无框架、HMR 或 worker。每运行有不透明编号，报告与本轮审计 URL、时间对应；30 分钟、500 会话、100 次运行上限，重启失效。停止 / pagehide 取消本页请求、关闭本页打开的审计目标并只清理本会话 Cookie；工具视口、限速、覆盖目录需要手工恢复。

45–47 只解析导入的真实 Lighthouse JSON，不生成模拟分数。检查 URL、runId、fetchTime、版本、条件与类别；同一报告不能重复导入。47 需要每阶段三份独立报告，在相同条件下比较 LCP 或 TBT 中位数；本地受控成本不是线上预算。导入不验证报告来源，不证明实际点击面板，不是可信监考。CLI Navigation 与 DevTools Timespan / Snapshot 分别记录。人工键盘 / 业务检查为明确自报，不靠关键词评分。

48 使用实际 CSS、srcset、筛选和购物车；窄屏检查需 innerWidth 280–500，DPR / 方向 / 指针与 CSS 像素分开。桌面与窄屏另测，不把模拟称为真机。49 真实 CSP 拒绝 inline，或 Cookie Domain 不匹配而被拒；正常对照为同源外部脚本或 host-only Cookie。localhost 安全上下文不等于 TLS，没有绕过证书警告或关闭保护。

52 的 product.json 在会话内 URL 稳定，提供 HTTP 200 的真实错误字段。“应用所选服务器对照”改变服务响应；“检查手工覆盖”保持故障服务，重新读取同一地址以供 Local overrides。页面不能检测 Overrides 开关；需在 Network 看覆盖标记、禁用后复现，并在 Changes 查看 CSS / JS 修改，说明与 Workspaces / 仓库保存的区别。

章末从 46 / 47 抽取，初始隐藏课号与步骤。案例检查、非空报告与五维自评 ≥8 且证据 / 验证非零分别记录，不称为全面质量认证。学习 v1 兼容旧记录与五章末。

| 课次 | 脚本 |
| --- | --- |
| 45 | [正确运行一次审计](lessons/45.md) |
| 46 | [读懂四类结果](lessons/46.md) |
| 47 | [排序、修复与复测](lessons/47.md) |
| 48 | [Device Mode 与响应式检查](lessons/48.md) |
| 49 | [Issues 与 Privacy and security](lessons/49.md) |
| 52 | [Overrides 与 Changes](lessons/52.md) |

## 开发退出条件

6 个模型、三轮引导与两组挑战有浏览器结果。Lighthouse 导入真实报告，47 比较三轮中位数；受阻脚本 / Cookie、实际窄视口及错误响应均可复现。手工 Overrides 与服务器对照分开取证，原生面板未验证项如实保留。章末门槛、五章末导入兼容与非法记录保护通过；320 / 768 / 1440 无整页非预期溢出。
