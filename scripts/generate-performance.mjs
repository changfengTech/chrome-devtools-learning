import { readFile, writeFile, mkdir } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const curriculum = JSON.parse(
  await readFile(new URL("src/data/curriculum.json", root), "utf8"),
);
const book = JSON.parse(
  await readFile(new URL("src/data/performance.json", root), "utf8"),
);
await mkdir(new URL("docs/lessons/", root), { recursive: true });
let index =
  "# Performance / 渲染阶段实验合同\n\n本阶段 27–34、51 共 9 课，以及 Performance 章末挑战。教程与真实实验分源；模型不计完成。\n\n## 实验与测量约定\n\n实验路径为 `/performance/<token>/`，没有框架、HMR 或 worker。每次故障 / 对照均新建一次导航，避免前一次资源、函数和观察条目混入。先打开 DevTools 开始录制，再点运行；新页自动准备加载场景，再点击“执行目标操作”。27 / 31 / 32 的加载和偏移在准备过程中发生；其他课在目标操作中产生主要成本。\n\n实际负载包含有界的受控 CPU 工作、HTTP 依赖、DOM 几何、布局读写、模块 / 样式和 CSS 动画。受控 CPU 循环采用墙钟预算，不适合验证限速倍率或设备跑分；它用于观察调用与任务结构。受控耗时是素材，不是优化线上代码的阈值。记录固定视口、DPR、可见性、缓存和手动设置的 CPU / Network 条件；先记录正常对照，多轮比较趋势。后台、遮挡或缺少观测 API 时明确提示，不把缺失数据记为零。\n\nLCP / Event Timing / LayoutShift / LongTask 来自浏览器 PerformanceObserver，原始条目与自定义计时分开。单次 handler 不是 INP，布局偏移条目之和不是正式 CLS，本页不输出伪造的 Web Vitals 成绩。浏览器 trace、录制截图、聚合树和 Coverage 需在 DevTools 实际操作。本页导出的观察 JSON 不是 Chrome trace。\n\n引导固定配置一，独立挑战随机两组故障和输入；章末从交互卡顿场景随机抽取，初始隐藏课号与步骤。每会话 30 分钟，最多 100 次运行；重启失效。恢复故障重新导航，停止 / 清理只处理本页任务、计时器、观察器和动画，不删除其他实验或教程记录。\n\n服务核对会话、实际实验文档访问、单次运行报告、指标结构、正常业务结果、故障 / 对照以及原因 / 证据 / 验证。指标来自本地页面，不是可信监考，不证明点击过 DevTools。章末使用独立报告和五维自评 ≥8/10，证据与验证均非零；自评不称为自动能力认证。\n\n| 课次 | 脚本 |\n| --- | --- |\n";
for (const item of book) {
  const lesson = curriculum.find((x) => x.id === item.id);
  index += `| ${item.id} | [${lesson.title}](lessons/${item.id}.md) |\n`;
  let text = `# ${item.id} · ${lesson.title}\n\n由 pnpm docs:lessons 生成。内容源：src/data/performance.json；生成与共同合同：scripts/generate-performance.mjs。本页包含教师参考答案。\n\n## 学习目标与原理\n\n${lesson.goal}。${item.principle}\n\n${item.concepts.map((c) => `### ${c.title}\n\n${c.body}\n`).join("\n")}\n## 交互演示\n\n${lesson.demo}。${item.demoSteps.join("；")}。模型不计实战完成。\n\n## 商城实战\n\n${item.symptom}\n\n${item.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n## 独立挑战与答案\n\n${lesson.challenge}。输入与故障随机变化；可能再次抽到同一类。\n\n| 配置 | 根因 | 证据 | 针对性验证 |\n| --- | --- | --- | --- |\n`;
  for (let i = 0; i < 3; i++)
    text += `| ${i < 2 ? "配置" + (i + 1) : "干扰项"} | ${item.diagnoses[i].label} | ${item.evidences[i].label} | ${item.fixes[i].label} |\n`;
  text += `\n## 三级提示\n\n${item.hints.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\n## 边界、恢复与来源\n\n正常结果要保持 SKU、数量与业务校验值一致；对照只改变本课对应成本。先固定条件再录制，停止录制后保存 trace；恢复限速、Rendering 高亮和媒体模拟。CPU / 帧率结果按实际观测和多轮趋势解释，不能把课堂耗时当线上目标。\n\n[共同合同](../PERFORMANCE-RENDERING.md) · [验收记录](../QA-PERFORMANCE.md) · [官方参考](${item.source})。\n`;
  await writeFile(new URL(`docs/lessons/${item.id}.md`, root), text);
}
index +=
  "\n## 开发退出条件\n\n9 个模型各有可操作输入；引导三轮复现 / 对照，两组独立挑战实际浏览器通过。Performance 章末实际案例检查及低分门槛通过，记录导入导出兼容既有 v1 和 Network / Application 章末。录制能看到命名 CPU 栈、任务切分、资源依赖、Layout / Paint、Coverage 与 CSSAnimation；真实 trace / 协议证据与页面自报分开记录。320 / 768 / 1440 的 9 课及章末无整页横向溢出。具体实测版本不推断，见验收记录。\n";
await writeFile(new URL("docs/PERFORMANCE-RENDERING.md", root), index);
console.log(`已生成 ${book.length} 课性能脚本与实验合同。`);
