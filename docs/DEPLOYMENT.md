# ChatGPT 站点部署

更新：2026-10-25。公开访问范围由维护者明确选择，持链接者可学习；不需要业务账号或真实支付资料。

## 三个来源

| 用途 | 地址 | Sites 项目 ID |
| --- | --- | --- |
| 课程与学习记录 | https://devtools-learning-changfeng.cloudysky2.chatgpt.site | `appgprj_6adcca5cf76c8191af7d5b385eade324` |
| 商城与实验接口 | https://devtools-shop-changfeng.cloudysky2.chatgpt.site | `appgprj_6adccda9d5508191836e3b4ec32da060` |
| CORS 同伴 | https://devtools-cors-changfeng.cloudysky2.chatgpt.site | `appgprj_6adccdb98d9c819199e7653ae09ee1ef` |

来源配置在 [online.json](../.openai/online.json)，课程 Site 身份在 [hosting.json](../.openai/hosting.json)。维护复用这三个 ID，不创建替代站点。发布结果和源码 SHA 见 [发布记录](qa/site/deployments.json)，在线检查见 [验收记录](qa/site/browser.json)。

## 功能与数据边界

63 课、逐课实战、独立挑战和八个章末沿用本地教学流程与证据检查。真实商城运行于 Workers：HTTP 等待与分块下载、OPTIONS / POST、缓存头、SSE、WebSocket 都由真实请求产生。跨域同伴只转发会话对应的 `/labs/<token>/remote`，保留浏览器实际 Origin，不接受任意目标 URL。浏览器端 postMessage 仍检查来源、窗口和会话。

课程前端使用 Vite `site` 模式连接 HTTPS 商城，不请求访客电脑的 localhost。商城复用原 Node handlers，以请求 / 响应适配器和内嵌公开资源运行；本地模式仍使用 Node HTTP / ws。在线 WebAuthn 的 RP 固定为商城 HTTPS hostname，本地独立页仍使用 localhost；不放宽客户端数据的 origin 或一次性挑战检查。

线上会话以不可猜测 token 隔离，D1 持久保存约 30 分钟。Map、Set、公钥和二进制显式序列化；revision 条件更新合并并行资源观察，避免请求互相覆盖证据。会话总量有上限、请求体有限长、过期行按批清理。迁移由 Sites 发布阶段执行，运行时不建表。使用新会话恢复过期实验，不把短期实验当成长期云端学习档案。

阅读、笔记、练习与挑战记录保存在教程来源的 localStorage；Sites、5173、4173 彼此独立，可用 JSON 导入 / 导出迁移。导入会替换目标记录，请先备份。用于检查的实验报告、合成表单字段与虚拟认证器公钥会进入短期实验会话；不要填写个人地址、支付资料或真实凭据。服务器不保存学习笔记，不收集浏览器个人资料，不提供真实交易。

## 本次验证范围

课程 / 商城版本 2、CORS 同伴版本 3 的原生部署均返回 `succeeded`，公开权限保持。CORS 同伴原本只提供接口，直接访问首页会 404；版本 3 新增用途说明、课程入口及健康链接，限定转发规则保持。

独立 GitHub-hosted Ubuntu 网络已执行[线上 HTTP 检查](https://github.com/changfengTech/chrome-devtools-learning/actions/runs/40110980968)，**79/79 通过**：三个首页 200、健康状态、真实慢请求故障 / 修复和挑战判定、CORS 预检 403→204 与固定来源业务响应、SSE、62 课普通会话 / 实验文档以及第 21 课真实请求挑战、8 章末会话。见[机器结果](qa/site/http-github-2026-10-25-v2.json)。脚本不提交伪造浏览器检查报告，不写学习记录。

本机仍在 TLS 握手阶段连接重置。对照发现 Sites 地址走 `en0`，可访问的文档域名走 `utun0`；同一环境连官方文档示例的 Sites 域名也重置。用户已确认电脑使用公司 VPN，但手机访问也失败。因此问题不能唯一归因于公司 VPN；独立网络成功与用户电脑 / 手机访问失败的差异（手机连接方式未确认），还需要继续定位网络链路或平台公网入口的可达性。公司网络核对所需的精确域名和复测步骤见 [NETWORK-ACCESS](NETWORK-ACCESS.md)。[诊断记录](qa/site/network-2026-10-25.json) 不保留私网地址和凭据。[待提交的平台报告](SITES-SUPPORT-REPORT.md) 汇总了精确站点与复现证据。没有修改系统代理、DNS、路由或证书检查。

**浏览器完整实战仍待验**：HTTP 成功不能证明 Vue 页面已正确挂载、浏览器实际执行了 CORS、跨窗口回传、Cookie / IndexedDB / Service Worker 或 DevTools 原生操作。网络恢复后必须完成浏览器流程再关闭这些项目。完整范围见 [QA-SITES](QA-SITES.md)。

手动运行 HTTP 检查：`node scripts/qa-online.mjs <输出JSON路径>`。这会在已发布商城创建合成的短期实验会话。独立网络的手动工作流为 `.github/workflows/online-diagnostic.yml`，不设定时任务，不读取账户秘密，不自动发布站点。

## 原生工具与额外条件

在线可直接打开商城并使用 Chrome DevTools；网站无法读取或自动替你操作 DevTools，教学模型不等同于原生工具证据。

| 项目 | 额外条件 / 操作 |
| --- | --- |
| Android 远程调试 T02 | Android 真机、数据线、USB 调试和桌面 Chrome；无设备时标记待验 |
| Sensors 定位 | Chrome 权限与地理位置模拟；方向和定位分别验证 |
| Workspaces / Overrides / Changes（52、T03） | 用户专用本地目录、明确目录授权；源码保存须下载本地工程，托管站点不能代写用户磁盘 |
| Autofill T05 | 独立 Chrome 测试资料或 Guest，使用合成地址；面板和预测能力随版本变化 |
| WebAuthn T06 | HTTPS 独立实验页，以及 DevTools 虚拟认证器或可用认证设备；不使用个人通行密钥 |
| AI assistance T07 | 功能可用的 Chrome、支持的地区和账户；课程预置建议继续明确标为示例 |
| Lighthouse / Performance / Memory / Recorder | 在独立商城页自行运行、保存 / 导入实际报告；在线迁移测试不替代原生录制 |

本地原生证据仍见 [整体验收](QA-RELEASE.md) 与 [补验](QA-NATIVE-TOOLS.md)。此次发布不把历史本地原生通过自动改成线上原生通过；未重新操作的条件项目保持原状态。

## 构建和回归

```sh
pnpm install --frozen-lockfile
pnpm build:site       # out/，教程连接线上商城
pnpm preview:site     # 4176，仅课程静态预览
pnpm build:shop       # .sites/build-shop/server/index.js + D1 迁移
pnpm build:cors       # .sites/build-cors/server/index.js
pnpm test            # 本地 Node 合同与判定
pnpm test:hosted      # 本地 Workers / D1，需允许 workerd 绑定回环端口
```

`pnpm build`、`pnpm dev`、`pnpm preview:all` 保留本地完整运行。安装时仅允许必要的 workerd 构建脚本，声明见 `pnpm-workspace.yaml`。

## 源码和发布维护

GitHub 是主源码仓库。三个 Site 各有专用源码 Git 仓库与独立构建副本，均放在被忽略的 `.sites/` 下，不能把嵌套 Git、凭据、个人数据、依赖或历史 QA 大文件提交到 Site 源码。

1. 读取现有 ID，通过 Sites 获取同一项目的新源码凭据，使用插件 source workflow 打开原仓库；凭据仅经隐藏标准输入传递，不写文件、命令行或日志。
2. 同步公开源码。课程与 CORS 副本排除 `drizzle/`；商城副本包含 schema-only 迁移。不要复制主仓库 `.git`、`.sites`、`node_modules`、构建目录、环境文件或 `docs/qa` 历史大文件。
3. 课程副本 manifest 声明 `static.directory: "out"`，默认 build 使用 `--mode site`；商城副本 manifest 声明 `d1: "DB"`，默认 build 为 `node scripts/build-hosted.mjs shop --dist`；CORS 副本默认 build 为 `node scripts/build-hosted.mjs cors --dist`，不绑定数据库。
4. 通过 source workflow 的原生 build helper 构建、提交、推送和打包。只使用其返回的准确 project ID、commit SHA、archive 保存版本；归档必须来自已推送的同一源码。
5. 保持已有公开访问范围，调用保存版本与公开部署工具。只轮询非终态部署，失败先读日志；成功后验证课程到后端的实际链路。
6. 将实际返回的版本、部署状态、SHA 和验证范围写入发布记录，再提交 / 推送 GitHub。更新课程或后端时仅重新发布受影响的 Site；共享协议变化须一起核对。

依赖的兼容 API 依据 [Workers Node.js 兼容说明](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)。适配器不打开 TCP 服务、不依赖 Workers 本地文件可写状态；静态资源在构建时内嵌，实验状态写入 D1。
