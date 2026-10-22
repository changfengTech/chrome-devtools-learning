import { readFile, mkdir, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = async (path) =>
  JSON.parse(await readFile(new URL(path, root), "utf8"));
const book = await read("src/data/foundations.json");
const curriculum = await read("src/data/curriculum.json");
// 页面的结构化脚本与这里的实验合同共同维护；生成文档不冒充验收记录。
const contracts = {
  "01": [
    "一次加购后，计数等于数量；数值总额等于单价 × 数量 − 优惠。",
    "不按面板顺序盲逛；先说清希望验证的事实。",
    "计数错误或价格拼接；检查真实 DOM 文本与 calculateTotal。",
  ],
  "02": [
    "每次单击只执行一次对应加购处理。",
    "Console 清空只清显示；恢复现场要用商城「恢复故障」。",
    "在 #add 的 Event Listeners 与 [cart] 日志中区分重复绑定和缺失绑定。",
  ],
  "03": [
    "相同数量、正常请求条件下再比较结果。",
    "本课等待来自服务端注入约 450ms；不是浏览器限速造成的真实线上诊断。",
    "配置一在响应头前实际等待；配置二实际更改 quantity，保留 baselineQuantity 供对照。",
  ],
  "04": [
    "价格和标题分别与 data 响应中的 price、name 一致。",
    "编辑 DOM 是临时实验；刷新或恢复会重新渲染，不会修改业务源文件。",
    "Inspect、Ctrl/Cmd+F 搜索 data-sku，修改对应文本，不删除相邻商品。",
  ],
  "05": [
    "#price-value 的最终计算颜色为 rgb(22, 130, 103)。",
    "模型只讨论相同 origin、layer、重要性下的权重和顺序；完整 cascade 还涉及这些前提。",
    "配置一 ID 权重覆盖 class；配置二同权重后置覆盖。用 Styles 找来源、Computed 验证。",
  ],
  "06": [
    "网格 scrollWidth ≤ clientWidth + 1，商品内容保持可读。",
    "Grid overlay 是辅助观察；修改 grid 后还要查看 min-width 与 gap。仅缩小字号不解决原因。",
    "固定最大宽度 360px 的真实网格；250px 子项最小宽度或 480px 列间距造成溢出。",
  ],
  "07": [
    "可用按钮能收到点击，并使购物车数量增加。",
    ":hover / :focus 强制状态用于查看样式，不能修复透明覆盖层或 disabled。",
    "覆盖层与禁用属性是真实 DOM；可在 Elements 去除拦截/属性后再触发一次业务并检查。",
  ],
  "08": [
    "收藏按钮存在准确 name；label.control 指向数量输入。",
    "自动检查只覆盖名称与关联；键盘操作、焦点顺序及语义仍需人工检查。",
    "用 Accessibility 与 Tab/Space 验证，区分缺失 aria-label 与错误 label[for]。",
  ],
  "09": [
    "优惠使用正确输入；缺货订单不被接受。",
    "日志级别是作者选择；一条红日志本身不证明根因，需和表格输入及结果对应。",
    "真实 group/table/warn/error；配置一读取不存在的 couponCode，配置二错误使用 available。",
  ],
  10: [
    "结算生成当前商品的大写名称摘要。",
    "堆栈最上方是抛出位置，调用者负责传入数据；不要只修最后一行日志。",
    "readProductName ← buildSummary ← checkout；真实 TypeError，分别为 name 为 null 与 title 为 undefined。",
  ],
  11: [
    "在目标 iframe document 中能查到价格节点。",
    "查询结果为 null 也可能是选择器错误、运行时机或上下文问题；不能直接断言节点不存在。",
    "同源 iframe 是真实独立 document；切换 Console JavaScript context 后验证同一选择器。",
  ],
  12: [
    "用于取证的快照保留记录时 price；完整计时包含 await。",
    "对象展开受浏览器呈现时机影响；优先比较保存的原始字段。约 40ms 定时器不是性能基准。",
    "真实对象后续变化与 Promise 定时任务；可在 Snippet 保存 JSON 快照再复测。",
  ],
  13: [
    "优惠只应用一次，合计等于单价 × 数量 − 优惠。",
    "Source Map 提供映射，不改变正在执行的编译代码；pretty print 不等于恢复 TypeScript。",
    "真实 TS 编译 JS + .map + sourcesContent；Sources 开启 JavaScript source maps，定位 calculateTotal。",
  ],
  14: [
    "multiplyPrice 返回数值乘积，再应用一次优惠。",
    "暂停停在下一条尚未执行的语句；Step over 仍会执行被跨过的调用。",
    "配置一 price 为字符串导致拼接，配置二使用加法；Step into / over / out 与调用栈对应。",
  ],
  15: [
    "实际读取的 discount 等于当前 config.discount。",
    "同名变量不等于同一个绑定；切换调用帧后 Watch 表达式的可见作用域可能改变。",
    "配置一 Local 遮蔽，配置二 Closure 保存创建时的旧值；分别检查局部、调用者与闭包。",
  ],
  16: [
    "价格类型规范为 number；负库存不计入可售商品。",
    "Logpoint 不主动暂停；条件断点的表达式应基于当前执行位置已存在的变量。",
    "真实 auditInventory 六条循环；条件用 typeof item.price 或 item.stock < 0，SKU 随会话变化。",
  ],
  17: [
    "单次动作只有一次状态变化与一次 trace 请求。",
    "DOM 断点会在修改处暂停；XHR/fetch 断点按 URL 子串匹配，在发起调用前暂停。",
    "配置一两个监听器修改 #cart-count；配置二真实发两次 /api/foundations/trace HTTP 请求。",
  ],
  18: [
    "解析成功且结果正确；异步完成顺序变化后仍保留最新任务结果。",
    "异常被 catch 仍可能留下业务问题；caught 开关影响暂停。异步调用栈不等于完整历史录像。",
    "配置一真实 JSON.parse 抛出后被捕获；配置二真实 15/90ms 定时异步任务竞争，不伪称 HTTP 搜索请求。",
  ],
};
await mkdir(new URL("docs/lessons/", root), { recursive: true });
let index =
  "# 第 01–18 课实现与实验合同\n\n本批覆盖排查入门、Elements、Console、Sources。每课包含独立原理模型、真实商城案例、两组故障配置的迁移题、三级提示和复盘。第 21 课保持可用。关联的 48、52 节完整独立课及章末题仍按路线后续实施。\n\n";
index +=
  "## 共同运行与验收约定\n\n从教程准备会话，再点击打开商城。引导题固定配置一和 seed=42；迁移题随机配置一/二及价格、数量、SKU，不承诺每次都抽到不同配置。运行故障会实际渲染并触发一次业务，检查目标故障存在。应用对照会重新渲染并触发一次业务；手工修改后点「检查当前页面」则保持当前 DOM。重复触发会累积动作次数。恢复故障重新获取数据、清空场景并重绑监听器。教程刷新后学习记录保留，临时会话需要重新准备。\n\n";
index +=
  "引导完成要求本会话观察、正确修复和证据选择全部成立。迁移题五项检查要求全部通过：故障报告、原因、证据、验证方案、修复报告。错误答案不显示正确选项；主动查看解析记录为辅助。服务校验请求完成、会话、报告格式和结构化答案；DOM/计算检查来自实验页，不是可信监考，更不证明操作过 DevTools。自由笔记不自动打理解分。\n\n";
index += "| 课次 | 详细脚本 | 原理模型 |\n| --- | --- | --- |\n";
for (const content of book) {
  const lesson = curriculum.find((item) => item.id === content.id);
  const [normal, pitfall, implementation] = contracts[content.id];
  index += `| ${lesson.id} | [${lesson.title}](lessons/${lesson.id}.md) | ${content.kind} |\n`;
  const choices = ["a", "b", "c"]
    .map(
      (key, i) =>
        `| ${key === "c" ? "干扰项" : `配置${i + 1}`} | ${content.diagnoses[i].label} | ${content.evidences[i].label} | ${content.fixes[i].label} |`,
    )
    .join("\n");
  let text = `# ${lesson.id} · ${lesson.title}\n\n由 \`pnpm docs:lessons\` 生成。脚本数据：\`src/data/foundations.json\`；实验合同补充：\`scripts/generate-foundations.mjs\`。本页含教师参考答案，独立挑战前可先不阅读。\n\n`;
  text += `## 学习目标与先修\n\n${lesson.goal}。前置：${Number(lesson.id) === 1 ? "懂一点 HTML、CSS 和 JavaScript，普通语法随例子解释" : `已完成前 ${Number(lesson.id) - 1} 课或掌握等效基础`}。\n\n## 原理与交互演示\n\n${content.principle}\n\n页面演示：${lesson.demo}。这是可重置的教学模型，演示本身不写入实战完成记录。\n\n${content.demoSteps.map((step, i) => `${i + 1}. ${step}。`).join("\n")}\n\n操作时先预测结果，再改变一个条件，比较输出；可用「重置演示」恢复初始模型。\n\n`;
  text += content.concepts
    .map((concept) => `### ${concept.title}\n\n${concept.body}\n\n`)
    .join("");
  text += `## 商城实战与实验合同\n\n症状：${content.symptom}\n\n正常结果：${normal}\n\n实现与可观察对象：${implementation}\n\n${content.steps.map((step, i) => `${i + 1}. ${step}`).join("\n")}\n\n固定数据：单价 34、数量 2、优惠 7，适用计算课的正常总额 61。第 03 课配置二故意改变数量；随机题使用本会话实际数据。\n\n## 独立挑战与答案\n\n${lesson.challenge}。挑战变更输入与故障配置，不能仅凭引导案例的位置或数值选择。先复现并修复，再回教程选择原因、证据和验证。\n\n| 配置 | 原因 | 可核对证据 | 参考修复/验证 |\n| --- | --- | --- | --- |\n${choices}\n\n`;
  text += `## 三级提示\n\n${content.hints.map((hint, i) => `${i + 1}. ${hint}`).join("\n")}\n\n## 误区、重置与复盘\n\n${pitfall}\n\n点商城「恢复故障」可重新渲染初始案例；重新准备会话会清空当前观察与选择，不删除已保存学习记录。会话 30 分钟失效，服务重启后重新准备。修复完成后清除本课断点、恢复 caught 异常开关及网络条件；刷新清除临时 DOM/CSS 修改。\n\n复盘记录：症状、实际证据、首次偏离位置、最小改动、复测结果，以及尚不能确定的范围。\n\n## 验收与来源\n\n逐课实测见 [基础课验收记录](../QA-FOUNDATIONS.md)。自动检查边界见 [共同合同](../FOUNDATIONS-01-18.md)。\n\n[Chrome 官方参考](${content.source})。工具英文名称以实际 Chrome 版本为准。\n`;
  await writeFile(new URL(`docs/lessons/${lesson.id}.md`, root), text);
}
index +=
  "\n## 来源与验证范围\n\n课程链接使用 Chrome 官方文档。2026-10-20 复核 [Source Maps](https://developer.chrome.com/docs/devtools/javascript/source-maps)、[Breakpoints](https://developer.chrome.com/docs/devtools/javascript/breakpoints)、[Console reference](https://developer.chrome.com/docs/devtools/console/reference)、[Accessibility reference](https://developer.chrome.com/docs/devtools/accessibility/reference)。浏览器验收使用应用内 Chromium；准确引擎版本未由工具返回，不能声称已逐项验证某个独立 Chrome Stable 版本。详见 [验收记录](QA-FOUNDATIONS.md)。\n";
await writeFile(new URL("docs/FOUNDATIONS-01-18.md", root), index);
console.log(`已生成 ${book.length} 课脚本与实验合同。`);
