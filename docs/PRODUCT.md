# DevTools 实验室：产品约定

状态：2026-10-20 用户确认；先落实文档，再按阶段开发。

## 目标与用户

面向懂一点 HTML、CSS、JavaScript，但未系统学习 Chrome DevTools 的学习者。解决“看过教程不会用”“遇到问题不知道从何查起”。最终能力：选择工具、收集证据、解释根因、验证修复。

- 中文讲解，英文面板、按钮和术语；Mac 快捷键优先，附其他平台对照。
- 浅色、安静、桌面优先；适配 DevTools 停靠后的窄窗口。
- 小型商城贯穿：商品、搜索、详情、购物车、模拟结算。
- 每课：故障现场 → 猜想 → 原理交互 → 真实实战 → 修复对比 → 迁移挑战 → 复盘。
- 普通课目标 15–20 分钟；综合实战约 45–60 分钟。

## 确认的完整范围

55 节主线（含 3 节综合实战）、8 节专题、8 个面板章末挑战。Elements、Console、Sources、Network、Performance、Memory、Application、Lighthouse 均为正式必修。Network 与 Performance 深入讲解；完整课程不能只交付这两章。

辅助工具必须有任务：Device Mode、Rendering、Coverage、Accessibility、Issues、Privacy and security、Recorder、Performance monitor、Animations、Local Overrides、Changes、Command Menu、Search、Snippets。

专题：Sensors、Android 真机、Workspaces / Source Maps、Media、Autofill、WebAuthn、AI assistance、Protocol Monitor / CDP。需要硬件或账号的专题独立标注条件，不阻塞本地主线。

逐课目录见 [CURRICULUM.md](CURRICULUM.md)，进度见 [STATUS.md](STATUS.md)。

## 交互与评估

站内原理演示明确标记“教学模拟”；真实实战在独立商城标签页使用实际 DevTools。实验可重置，修复可验证。三级提示按需展开：方向 → 工具与证据 → 具体步骤。允许跳课、重试、看答案，不强制锁课。

分别记录已阅读、已练习、挑战通过，查看目录不算完成。每课更换数据或触发条件做迁移挑战；八个面板各有章末独立挑战。评分、自动检查和自查边界见 [ACCEPTANCE.md](ACCEPTANCE.md)。

## 技术与隔离

沿用 Vue 3、TypeScript、Vite、pnpm。教程与商城使用不同源；商城无教学框架、热更新或 Vue DevTools 注入。故障暂停、卡顿、存储清理与 Service Worker 不得破坏教程进度。真实接口由本地 Node 服务提供，控制延迟、响应头、缓存、跨域和流式连接。

正式性能实验使用构建后的实验页，记录视口、缓存、限速与操作；内存实验有正常对照。模拟时间不能伪装成实测值；本地测量不能当作真实用户数据。DevTools 用户设置的恢复需要明确说明，不能宣称网页已代替用户恢复。

首版本地单人学习；记录保存在本机并支持导入导出。不以账号、云服务或浏览器扩展作为基础依赖。

## 文档维护

- `src/data/curriculum.json` 是逐课目录的数据源；`pnpm docs:curriculum` 生成目录文档。
- 功能未实现时在界面标记“课程规划”，不能以空白课或完成标记冒充交付。
- 开发阶段及退出条件见 [ROADMAP.md](ROADMAP.md)。第 21 课先验证整条学习链路，详见 [LESSON-21.md](LESSON-21.md)。
