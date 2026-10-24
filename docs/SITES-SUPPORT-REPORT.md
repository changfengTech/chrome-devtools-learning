# 待提交：ChatGPT Sites 默认域名跨网络连接重置

整理日期：2026-10-25（Asia/Shanghai）。本报告尚未发送给外部客服。

## 请求排查

三个公开 Sites 在用户的电脑（公司 VPN）无法打开，桌面浏览器显示 `ERR_CONNECTION_RESET`。用户另外报告手机访问同一网址也失败，但手机是否关闭 Wi-Fi、具体连接方式和错误码未确认。请协助检查这些默认域名的公网 TLS 入口、边缘路由及网络 / 地区可达性，判断需要平台调整还是网络侧处理。

## 站点信息

| 角色 | 公开 URL | 项目 ID | 当前版本 |
| --- | --- | --- | --- |
| 教程 | https://devtools-learning-changfeng.cloudysky2.chatgpt.site | `appgprj_6adcca5cf76c8191af7d5b385eade324` | 2 |
| 商城 | https://devtools-shop-changfeng.cloudysky2.chatgpt.site | `appgprj_6adccda9d5508191836e3b4ec32da060` | 2 |
| 跨源同伴 | https://devtools-cors-changfeng.cloudysky2.chatgpt.site | `appgprj_6adccdb98d9c819199e7653ae09ee1ef` | 3 |

三项目均为 `active / public`，原生部署返回 `succeeded`。没有自定义域名，也没有被平台或工作区管理员停用。商城 D1 绑定 `DB` 与表 `lab_sessions` 已存在。

## 客户端现象

- 本机 Node、curl 与应用内浏览器均失败；DNS 能解析、TCP 443 能连接，TLS 握手阶段收到连接重置，尚未收到 HTTP 响应。
- IPv4 `104.18.22.186` / `104.18.23.186` 与默认 TLS / TLS 1.2 组合均失败。没有关闭证书校验。
- `chatgpt.site` 主域及官方文档示例 `goblin-tales.openai.chatgpt.site` 在本机也出现重置。后者只用于域名族对照，不假定示例站点的业务状态。
- 同机 `learn.chatgpt.com` 和 `developers.cloudflare.com` TLS 连接正常。Sites 公网地址走 `en0`，可工作的文档地址走 `utun0`；具体分流策略尚未确认。
- 用户确认电脑使用公司 VPN，也报告手机访问同一个 Sites 地址失败。因此不能将原因唯一归于公司 VPN。手机是否使用蜂窝网络、运营商、地理位置、错误码和完整路由均未确认。

## 独立公网对照

GitHub-hosted Ubuntu runner 对上述三个 **chatgpt.site 地址**进行无登录、无凭据的访问。GitHub 只是测试执行位置，测试对象不是 GitHub 网站。

- [运行 1](https://github.com/changfengTech/chrome-devtools-learning/actions/runs/40110497699)：78/78 HTTP 检查通过。
- [运行 2](https://github.com/changfengTech/chrome-devtools-learning/actions/runs/40110980968)：79/79 HTTP 检查通过，新增实际前端 JS / CSS 可下载及跨窗口响应头检查。教程和商城均未设置 COOP 响应头。
- 三个首页均为 HTTP 200；商城真实故障 / 修复请求、挑战判定、CORS OPTIONS / POST、SSE、各课会话与八章末入口工作。
- 检查脚本不携带登录信息，不读取账户秘密，不提交伪造浏览器观察，不写学习记录。合成实验会话约 30 分钟过期。

对应机器结果在公开仓库 `docs/qa/site/http-github-2026-10-25*.json`，本机失败结果为 `http-local-2026-10-25.json`。部署 ID、版本 ID、源码 SHA 与归档哈希见 `docs/qa/site/deployments.json`。

## 当前结论与边界

已证实独立网络能访问托管应用，无法据此声称用户网络已恢复，也不能单凭本机分流差异确定故障责任方。CORS 首页原本的 404 已独立修复，不会解释 TLS 重置。浏览器完整商城实战、跨窗口结果回传与原生工具验收仍未关闭。

没有变更系统代理、DNS、路由、证书信任、防火墙或公司 VPN 策略；没有通过新建项目、猜测替代租户域名或修改访问权限掩盖问题。

## 管理入口检查

用户已自行完成拥有这三个站点的账户登录。已在 `https://chatgpt.com/space/sites` 逐一打开三个原项目的设置页：均显示“所有人可见”，URL 与上表一致，没有绑定自定义域名。原生 API 再次确认三项目 `active / public`，`disabled_by: null`。

教程的“更改 URL”对话框只允许编辑前缀，`.cloudysky2.chatgpt.site` 后缀固定。设置页可操作名称、URL 前缀、自定义域名、共享、环境变量和删除；未发现默认域名证书重签、TLS / 边缘入口重置或切换托管域名后缀的按钮。未进行无依据的改名、删除、权限变更或重复发布。

登录后在网络沙箱外再次访问三个公开 URL，仍均为 `ECONNRESET`；公开课程的浏览器导航仍为 `net::ERR_CONNECTION_RESET`，已登录的跨源同伴预览也显示加载失败。见 `docs/qa/site/http-local-after-login-2026-10-25.json` 和仅包含目标站点设置的 `manager-url-settings.png`。

请求平台检查三个默认域名的证书 / SNI、边缘路由和不同网络的入口可达性，并提供可执行的修复措施。当前工具和已检查的管理界面没有相应修复操作。没有收集密码或验证码，也没有将本报告提交给外部客服。
