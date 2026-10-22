import { readFile, writeFile, mkdir } from "node:fs/promises";
const root = new URL("../", import.meta.url),
  read = async (name) =>
    JSON.parse(await readFile(new URL(name, root), "utf8"));
const curriculum = await read("src/data/curriculum.json"),
  book = await read("src/data/memory.json");
await mkdir(new URL("docs/lessons/", root), { recursive: true });
let index = `# Memory / 回归阶段实验合同

本阶段 40–44、50 共 6 课，以及 Memory 章末挑战。模型不计完成。

## 同一文档、相同批次

路径为 /memory/<token>/，原生页面，无框架、HMR 或 worker。40–44 在同一文档做故障、重复批次、正常对照与恢复；应用方案先清理本页旧根和资源，不刷新 VM。每批真实 5 次开关，每运行最多 20 次，载荷有界。先预热、拍 A，再做相同批次拍 B，清理并同工作量拍 C；结合 GC 后多点趋势与 Retainers，不用单次堆涨跌下结论。

页面只统计自有对象容器、Detached 根、监听器和 interval，不把它们当浏览器总 DOM / listeners，不估造 Shallow / Retained Size，也不以零容器证明对象已 GC。MemoryLabState 是显式业务根；实际分配构造函数、DOM、事件和 timer 可检查。快照前排除 Console、$0、选中节点等调试器引用。统计报告只含标量，不输出或缓存目标对象的日志。

50 提供真实异步搜索、可换序商品、详情、加购、结果断言及会话专用 Recorder JSON 示例。两种脆弱脚本和条件脚本仅为教学对照，不冒充 Recorder。真实录制、编辑、Replay、导出须在 Chrome Recorder 操作。正常对照需两种排序或两种延迟下都完成目标 SKU、数量和总额。每次回放先重置购物车；JSON 示例导航含本轮 runId 和条件，过期需重建，不是长期测试地址。

引导固定配置一，挑战随机两组故障与输入；Memory 章末取 42 / 43 / 44，初始隐藏课号和步骤。会话 30 分钟、500 个上限、每会话 100 次运行；离页、手动停止或到期清理本页资源。API 超时 6 秒；错误报告不计完成。恢复不删除教程或别的会话数据。

服务验证实际文档访问、运行编号、单次报告、指标结构、业务校验值和本课目标。页面报告可被修改，不是可信监考，不证明 GC、面板操作或自由解释。章末案例检查、非空报告、五维自评至少 8 且证据 / 验证非零共同记录完成；自评不称为能力认证。

| 课次 | 脚本 |
| --- | --- |
`;
for (const item of book) {
  const lesson = curriculum.find((x) => x.id === item.id);
  index += `| ${item.id} | [${lesson.title}](lessons/${item.id}.md) |\n`;
  let text = `# ${item.id} · ${lesson.title}\n\n由 pnpm docs:lessons 生成。内容源 src/data/memory.json；生成与合同 scripts/generate-memory.mjs。本页含教师参考答案。\n\n## 学习目标与原理\n\n${lesson.goal}。${item.principle}\n\n${item.concepts.map((x) => `### ${x.title}\n\n${x.body}\n`).join("\n")}\n## 交互演示\n\n${lesson.demo}。${item.demoSteps.join("；")}。模型不计完成。\n\n## 商城实战\n\n${item.symptom}\n\n${item.steps.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n## 独立挑战与答案\n\n${lesson.challenge}。输入与故障随机变化，可能再次抽到同类。\n\n| 配置 | 根因 | 证据 | 针对性验证 |\n| --- | --- | --- | --- |\n`;
  for (let i = 0; i < 3; i++)
    text += `| ${i < 2 ? "配置" + (i + 1) : "干扰项"} | ${item.diagnoses[i].label} | ${item.evidences[i].label} | ${item.fixes[i].label} |\n`;
  text += `\n## 三级提示\n\n${item.hints.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n## 边界、恢复与来源\n\n正常结果保持 SKU、数量与业务校验值一致。相同 VM、批次和空闲条件比较；停止只清理本页资源。实际 GC、快照与 Recorder 证据须在工具核对，页面容器计数不等于堆快照。\n\n[共同合同](../MEMORY-REGRESSION.md) · [验收记录](../QA-MEMORY.md) · [官方参考](${item.source})。\n`;
  await writeFile(new URL(`docs/lessons/${item.id}.md`, root), text);
}
index += `\n## 开发退出条件\n\n6 个模型可操作；引导三轮、两组挑战有实际浏览器结果。Memory 章末核对案例与自评门槛，旧 v1 与四章末兼容。原生快照检查命名对象、引用路径及释放后趋势；分配分析与页面计数分开。Recorder 实际 Chrome 面板验证情况如实记录，示例脚本不能代替工具验收。320 / 768 / 1440 可用；停止 / 恢复不残留任务。\n`;
await writeFile(new URL("docs/MEMORY-REGRESSION.md", root), index);
console.log(`已生成 ${book.length} 课内存脚本与实验合同。`);
