# ChatGPT 站点部署

更新：2026-10-24。公开访问范围由维护者明确选择，持链接者可学习；不需要业务账号或真实支付资料。

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

三次原生部署均返回 `succeeded`，`get_site` 确认为 `active`、公开访问和已发布 URL。本机的 Node fetch、curl（IPv4 / 默认地址选择）与 IAB 访问在 HTTP 响应前遇到连接重置。没有修改系统代理、DNS 或证书设置，也没有用模型点击替代线上实战。

平台日志能看到独立商城文档、脚本、样式和健康端点的成功请求；这些证明相应路由已在托管端运行，**不足以证明浏览器中的课程到商城完整交互通过**。本地自动检查与部署确认分别记账，线上实战、跨窗口回传和浏览器存储在可达网络补验前保持待验。详细结果见 [验收记录](qa/site/browser.json)。

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
