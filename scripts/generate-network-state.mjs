import { readFile, writeFile, mkdir } from "node:fs/promises";
const root = new URL("../", import.meta.url),
  read = async (file) =>
    JSON.parse(await readFile(new URL(file, root), "utf8"));
const content = await read("src/data/network-state.json"),
  curriculum = await read("src/data/curriculum.json");
const contracts = {
  19: [
    "一次搜索仅产生一个含 q=cup 的 search 请求，返回一件目标商品。",
    "实际 analytics 噪声与 search 请求。配置一遗漏参数，配置二重复调用。",
    "关闭录制/过滤只改变可见记录；HAR 可能含敏感数据，分享前检查。",
  ],
  20: [
    "正确 quantity 得到订单；业务缺货时不显示创建成功。",
    "真实 POST、422 参数失败与 200/ok=false。",
    "Edit and resend 仅在本地教学接口重放；真实交易不可随意重复。",
  ],
  22: [
    "主图不等待无关推荐，库存只读取一次。",
    "推荐请求默认延迟约 350ms，主图是实际 SVG 资源。",
    "本例用解除无关串行证明启动时机；不能将 350ms 当作线上性能阈值。",
  ],
  23: [
    "服务发布版本 2 后页面也读取 2；条件验证可产生真实 304。",
    "同一 run 的同一 price.json URL；max-age/no-cache、ETag、If-None-Match。",
    "先取消 Disable cache 再复现。fetch 看到的状态可能是浏览器合并后的 200，Network 可显示 304。",
  ],
  24: [
    "OPTIONS 满足需要，POST 实际响应允许来源，浏览器可读取 JSON。",
    "实际 4174→4175 跨源。配置一预检拒绝，配置二实际响应缺少 CORS 头。",
    "端口跨源不等同跨站。no-cors 产生 opaque 响应，不当作业务修复。",
  ],
  25: [
    "失败后结束等待并可重试，图片失败保留可读替代。",
    "submit 首次真实 503，下一次重试 200；图片真实 404。",
    "弱网/Offline/阻断由实际 DevTools 操作。固定服务错误与真正断网分别记录，恢复网络后再提交。",
  ],
  26: [
    "SSE 或 WebSocket 消息中的 stock=3 更新到页面。",
    "SSE 自定义 inventory 事件；WebSocket 握手 101 与两条 JSON 消息。",
    "流连接在两条消息或上限等待后关闭，pagehide 也清理；不把连接成功当成处理成功。",
  ],
  35: [
    "当前 Cookie 随 account/profile 发出，authenticated=true。",
    "HttpOnly Cookie 的 Path 错误或 Max-Age=0；profile 核对真正 Cookie 请求头。",
    "只操作本会话 Cookie。端口不隔离 Cookie；完整第三方/SameSite/Secure 政策不在这两个故障中模拟。",
  ],
  36: [
    "购物车保存到 localStorage；每标签筛选保存到 sessionStorage。",
    "真实 Storage API，键前缀含 token；刷新只重新读取，不偷偷重写。",
    "新标签链接 rel=noopener，避免 opener 初始复制干扰实验。只清理命名空间，不调用全源 clear。",
  ],
  37: [
    "当前 SKU 的 favorite/price 记录事务提交且可读，刷新仍存在。",
    "独立数据库、favorites keyPath=sku；错误键与真实 transaction.abort。",
    "request success 不等于 transaction complete；DevTools 视图需手动 Refresh。清理只删自己的数据库。",
  ],
  38: [
    "本页面 controller 指向目标 worker，受控接口返回 workerVersion=2。",
    "每个 token 独立 scope；v1 活动/v2 waiting，或 narrow scope 未覆盖当前页面。",
    "恢复故障在必要时注销本会话并刷新释放旧 controller。skipWaiting/claim 为教学对照，不建议无条件套到生产升级。",
  ],
  39: [
    "商品与缓存更新到版本 2，Manifest 图标实际 200，网络失败可回退到缓存副本。",
    "真实 Cache Storage、network-first/cache-first worker、Manifest 与图标请求。",
    "缓存回退标为 cache-storage-fallback。仅页面 CDP Offline 不保证 worker 网络也被阻断；验收需确认真正网络失败。",
  ],
};
await mkdir(new URL("docs/lessons/", root), { recursive: true });
let index =
  "# Network / Application 阶段实验合同\n\n新增 19、20、22–26、35–39 共 12 课，保留并回归第 21 课，合计本阶段 13 课。当前全站 31/63 课可实战。\n\n## 共同约定\n\n教程 5173/4173、商城 4174、跨源服务 4175，统一启动和停止。每次准备使用独立 `/labs/<token>/` 路径；Cookie、Storage、IndexedDB、Cache Storage、worker scope 仅属于当前实验。核心实验不需要真实账号和交易。\n\n引导案例固定配置一、seed=42；独立挑战随机两组故障与输入。故障报告、原因、证据、验证和修复五项全部成立才记录通过。服务校验会话、请求与报告格式；浏览器报告可被主动修改，不是可信监考，不证明实际点击过 DevTools。文字笔记不做关键词评分。\n\n恢复故障重新运行本案例；存储课刷新只读取已有状态。清理按钮仅处理本会话命名空间和注册，当前 controller 关闭或刷新后释放。即使会话过期，仍可打开原实验路径执行本会话清理。限速、离线、资源阻断需自行恢复；Offline 下可先观察，恢复 Online 后再报告。\n\n";
index += "| 课次 | 脚本 | 正常结果 |\n| --- | --- | --- |\n";
for (const item of content) {
  const lesson = curriculum.find((c) => c.id === item.id),
    [normal, real, boundary] = contracts[item.id];
  index += `| ${item.id} | [${lesson.title}](lessons/${item.id}.md) | ${normal} |\n`;
  let text = `# ${item.id} · ${lesson.title}\n\n由 \`pnpm docs:lessons\` 生成。教学脚本在 \`src/data/network-state.json\`，合同补充在 \`scripts/generate-network-state.mjs\`。本页含教师参考答案。\n\n## 目标与原理\n\n${lesson.goal}。先修按 [完整目录](../CURRICULUM.md) 的章节关系；基础操作、原理关系随本课讲解。\n\n${item.principle}\n\n${item.concepts.map((c) => `### ${c.title}\n\n${c.body}\n`).join("\n")}\n## 交互演示\n\n${lesson.demo}。模型不改变真实浏览器设置，不计为实战完成。\n\n${item.demoSteps.map((x, i) => `${i + 1}. ${x}。`).join("\n")}\n\n## 真实商城合同\n\n症状：${item.symptom}\n\n正常结果：${normal}\n\n真实机制：${real}\n\n${item.steps.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n## 独立挑战与参考答案\n\n${lesson.challenge}。新会话改变输入与故障配置，可能再次抽到同一类型；按实际证据判断。\n\n| 配置 | 原因 | 证据 | 修复/验证 |\n| --- | --- | --- | --- |\n`;
  for (let i = 0; i < 3; i++)
    text += `| ${i < 2 ? "配置" + (i + 1) : "干扰项"} | ${item.diagnoses[i].label} | ${item.evidences[i].label} | ${item.fixes[i].label} |\n`;
  text += `\n## 分级提示\n\n${item.hints.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n## 边界与恢复\n\n${boundary}\n\n清理与会话约定见 [共同合同](../NETWORK-APPLICATION.md)。请在复盘写下条件、观察对象、实际值、根因、最小修改与恢复设置；将 HTTP 缓存、Cache Storage、内存状态分开。\n\n[官方参考](${item.source})。实测范围见 [验收记录](../QA-NETWORK-APPLICATION.md)。\n`;
  await writeFile(new URL(`docs/lessons/${item.id}.md`, root), text);
}
index +=
  "\n第 21 课沿用 [完整样板脚本](LESSON-21.md)，等待/传输故障与迁移题不被新模板替代。\n\n## 两个章末任务\n\n从 Network 或 Application 章节底部生成独立会话；初始不返回具体课号、不提供分步取证。先自行定义正常行为、选择工具并观察，再读取诊断选项。章末案例在所属已交付场景中随机选择，输入与故障均变化。\n\n自动检查仍要求真实故障/修复报告和原因/证据/验证一致。报告由学习者填写，五维各 0–2 分自评：复现准确、工具选择、证据有效、根因解释、修复验证；总分至少 8，证据和验证非零，才记录完成。自评分数不冒称自动能力认证。解析使用单独标记。章末报告与自评可随 v1 学习记录导入导出，兼容既有课程记录。\n\n## 验收与来源\n\n验证环境与逐项结果见 [QA-NETWORK-APPLICATION.md](QA-NETWORK-APPLICATION.md)。课程使用 Chrome 官方文档；worker 生命周期参考 [web.dev](https://web.dev/articles/service-worker-lifecycle)，Cache Storage 参考 [Chrome 文档](https://developer.chrome.com/docs/devtools/storage/cache)。不引用已移除的 AppCache 作为本课实现。\n";
await writeFile(new URL("docs/NETWORK-APPLICATION.md", root), index);
console.log(`已生成 ${content.length} 课网络与状态脚本及两个章末合同。`);
