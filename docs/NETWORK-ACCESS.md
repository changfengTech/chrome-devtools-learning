# 公司网络访问对照与放行信息

更新：2026-10-25。用途：将访问失败的范围、公开域名和可复现证据交给公司网络管理员核对；不包含内部地址、账户、令牌或浏览器资料。

## 已确认的现象

独立 GitHub-hosted Ubuntu 网络的三个首页均返回 200，79 项线上 HTTP 检查通过（第二次增加真实前端资源与 COOP 响应头检查）。实际商城的第 21 课已完成故障请求、修复请求、正确挑战判定与错误答案拒绝；CORS 同伴完成失败预检 403、修复预检 204 和业务响应 200；SSE、其他 62 课会话 / 文档与八个章末入口通过。

- [独立检查运行](https://github.com/changfengTech/chrome-devtools-learning/actions/runs/40110980968)
- [独立网络结果](qa/site/http-github-2026-10-25-v2.json)
- [本机 HTTP 结果](qa/site/http-local-2026-10-25.json)
- [分层连接与接口对照](qa/site/network-2026-10-25.json)

同一电脑对这三个站点的 DNS 和 TCP 443 成功，TLS 握手被重置，尚未收到 HTTP 页面。站点公网地址走 `en0`，可工作的文档地址走 `utun0`。用户确认使用公司 VPN；用户也报告手机访问同一个 Sites 地址失败，因此不能将故障唯一归因于公司 VPN。这种接口差异只是排查线索，尚不能据此断言某一条公司规则或平台入口的责任；需要公司网络与平台侧结合对照继续定位。

## 需要核对的最小范围

| 精确主机名 | 端口 / 协议 | 用途 |
| --- | --- | --- |
| `devtools-learning-changfeng.cloudysky2.chatgpt.site` | TCP 443 / HTTPS | 课程 HTML、JS、CSS 与学习入口 |
| `devtools-shop-changfeng.cloudysky2.chatgpt.site` | TCP 443 / HTTPS、WSS | 商城页面、实验 API、流式响应、SSE / WebSocket |
| `devtools-cors-changfeng.cloudysky2.chatgpt.site` | TCP 443 / HTTPS | CORS 预检 OPTIONS 与业务 POST 的独立来源 |

请管理员确认这三个 FQDN 在公司批准的访问策略中采用正确路径，且 TLS SNI、DNS 策略、HTTPS 检查、OPTIONS / POST、SSE / WebSocket 不被非预期重置。无需放行整个 `*.chatgpt.site`，不应把共享 CDN 的公网 IP 固定成系统路由。

本次没有修改公司 VPN 配置、系统代理、DNS、路由、证书信任或防火墙。若规则由管理员维护，请由管理员通过公司支持的配置方式处理；不需要向教程提供公司 VPN 凭据。

## 调整后的验收

1. 浏览器打开三个首页：课程显示完整目录，商城显示独立实验页，同伴显示用途说明；不能只检查管理平台的部署状态。
2. 教程显示实验服务已连接。商城 `/health` 与同伴 `/health` 可读取；课程请求的 ACAO 仍为准确来源。
3. 从教程完成第 21 课故障 / 修复 / 独立挑战，再完成第 24 课跨域实验，并核对结果回传至原教程窗口。
4. 检查 Cookie、IndexedDB、Service Worker、SSE / WebSocket；原生 DevTools 项目依照各课单独取证。
5. 将实际浏览器结果、网络环境和截图追加到 [QA-SITES](QA-SITES.md)，再关闭“本机访问与浏览器全流程待验”。HTTP 客户端通过不替代这些步骤。

如需在另一台获准设备复现 HTTP 检查，可克隆公开仓库后运行：

```sh
node scripts/qa-online.mjs online-http.json
```

该脚本只使用 Node 标准库与公开地址，会创建约 30 分钟后过期的合成实验会话，不提交伪造页面观察，也不修改学习记录。
