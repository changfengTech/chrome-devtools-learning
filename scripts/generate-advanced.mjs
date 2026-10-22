import { readFile, writeFile } from "node:fs/promises";
const root = new URL("../", import.meta.url),
  book = JSON.parse(
    await readFile(new URL("src/data/advanced.json", root), "utf8"),
  ),
  curriculum = JSON.parse(
    await readFile(new URL("src/data/curriculum.json", root), "utf8"),
  );
let index = `# 综合实战与专题实验合同

53–55、T01–T08 共 11 课；Elements / Console / Sources 三章末补齐，正式范围为 63 课与另列的 8 章末。功能开放不代表所有原生工具退出验收完成。

## 共同运行合同

路径 /advanced/<token>/，独立原生页面，无 Vue、HMR 或 worker。固定引导 seed=42 / 配置一，迁移题更换 seed 并随机两种故障。30 分钟、500 会话、100 运行上限；运行编号绑定当前文档、实际商品资源及报告。先记录故障才能应用对照；错方案保持故障。旧运行、重复报告、错误来源、非法模式和过期会话拒绝。页面报告可主动修改，不是可信监考。

综合挑战同时核对非空报告与五维自评 ≥8/10，证据 / 修复验证非零；分数明确为自评，可随 v1 导出。综合题初始不指定面板和根因；商城隐藏步骤与修复选项，故障记录后才显示方案。教程在提交判断后解锁因果重放；模型只用于解释，不产生通过状态。55 的八面板和辅助工具矩阵逐项填写证据或未检查原因，明确人工自报；不伪造 Lighthouse、trace、堆数据或工具点击。

53 发出两个真实 HTTP 搜索请求，先新后旧完成；Storage 仅使用本会话键。54 同一文档五次开关保留真实详情对象或事件订阅，正常对照清理本页资源并拆分工作。页面 taskDuration 是自定义计时，不是 INP / JS heap size；资源数不证明 GC。55 提供实际错误响应、按钮名称 / 布局，或旧状态、重复处理与引用残留；修复后必须填发布矩阵。

## 专题可用性与证据边界

- T01：位置 / 错误夹具运行真实业务函数；原生 getCurrentPosition / deviceorientation 由按钮主动触发，Sensors 与权限需要人工验证。方向角度不同于视口方向。
- T02：本地健康请求和转发拓扑准备练习可用；USB、Android Chrome、实际 Inspect、端口转发与真机差异独立自报。无设备标记待验证，不称已连接。
- T03：真实 JS、404 / 旧版本 map、TS 下载和实际计算。Workspace 只授权独立练习目录，保存后在磁盘确认；自动映射检查不证明目录保存。
- T04：用户点击后通过 canvas.captureStream / MediaRecorder 生成短 WebM，实际 video 加载 / 播放。故障为媒体 404 或业务 play 监听器 pause；不关闭播放保护。不支持录制的环境提示限制，不伪造播放结果。
- T05：真实收货 form 的 label、name、autocomplete 与虚构地址夹具。夹具不是 Chrome Autofill；原生填充与面板需测试资料并单独取证，不保存私人地址。
- T06：课堂候选 ID / UV 协议夹具与真实 WebAuthn 两条路径。真实 create/get 仅允许本地 4174，120 秒一次性挑战，ES256 / P-256 / none attestation；校验 clientData 的 type、challenge、origin、RP hash、UP / UV、credential ID、签名与计数。只供虚拟认证器学习；不实现生产身份、恢复、风险控制或 attestation 信任。
- T07：预置待验证建议不冒充 AI 回答；实际 DOM 命中、disabled 与购物结果支撑批判。AI assistance 受地区、版本、账号与策略影响，不自动启用或传出上下文。
- T08：站内消息配对是明确标注的教学数据；真实 Protocol monitor / CDP 使用只读 DOM 命令人工观察。页面观察不是 CDP，不开放远程调试端口。

原生状态、文字证据和真实 WebAuthn 结果独立导出，不混入页面自动完成判据。结束清理本页引用 / 订阅 / Blob / tracks；停止清理本会话 Storage，离页保留该键供刷新练习。Geo 单次请求可在 8 秒内返回，离页不再展示。另手工恢复 Sensors、Workspace、虚拟认证器、端口转发和 DevTools 实验选项。

## 剩余三章末

Elements 抽取样式覆盖或交互阻断（05 / 07）；Console 抽取输入契约或可信取证（09 / 12）；Sources 抽取条件断点或异常 / 异步（16 / 18）。初始不显示课号、步骤与根因；两种故障配置和新数据。结构化案例检查、报告、自评分别记录。五维自评至少 8/10 且证据 / 修复验证非零，非空报告；不是自动能力认证。学习记录 v1 兼容 8 章末和 63 课。

| 课次 | 前置 | 详细脚本 |
| --- | --- | --- |
`;
for (const b of book) {
  const lesson = curriculum.find((x) => x.id === b.id);
  index += `| ${b.id} | ${b.prerequisites} | [${lesson.title}](lessons/${b.id}.md) |\n`;
  let text = `# ${b.id} · ${lesson.title}

由 pnpm docs:lessons 生成；内容源 src/data/advanced.json，合同源 scripts/generate-advanced.mjs。含教师参考答案。前置：${b.prerequisites}。

## 目标与原理

${lesson.goal}。${b.principle}

${b.concepts.map((c) => `### ${c.title}\n\n${c.body}`).join("\n\n")}

## 交互演示

${lesson.demo}。${b.demoSteps.join("；")}。综合题先提交判断再解锁因果模型，所有模型不计完成。

## 商城实战

${b.symptom}

${b.steps.map((x, i) => `${i + 1}. ${x}`).join("\n")}

## 独立挑战与参考答案

${lesson.challenge}。新输入与两种故障随机；可能再次抽到同种，不保证轮流。

| 配置 | 根因 | 实际证据 | 针对性验证 |
| --- | --- | --- | --- |
`;
  for (let i = 0; i < 3; i++)
    text += `| ${i < 2 ? "配置" + (i + 1) : "干扰项"} | ${b.diagnoses[i].label} | ${b.evidences[i].label} | ${b.fixes[i].label} |\n`;
  text += `\n## 三级提示\n\n${b.hints.map((x, i) => `${i + 1}. ${x}`).join("\n")}\n\n## 验收、边界与恢复\n\n${b.boundary} 保持输入、数量、环境一致；完成故障与正常对照，选择一致证据；三轮引导和两配置挑战分别取证，原生步骤与本地结果分列。停止后清理本会话资源，再恢复浏览器设置。\n\n[共同合同](../CAPSTONE-TOPICS.md) · [本批验收](../QA-CAPSTONE-TOPICS.md) · [官方参考](${b.source})。\n`;
  await writeFile(new URL(`docs/lessons/${b.id}.md`, root), text);
}
index += `\n## 退出条件\n\n11 课五步流程、两配置挑战、3 章末与自评门槛可运行；模型复位不写完成；实际请求 / 媒体 / map / 资源清理与 WebAuthn 校验有证据；320 / 768 / 1440 响应式检查；旧 v1 导入、跨窗口进度同步和原始记录恢复。真实 Android、目录保存、Autofill、Sensors、AI、Protocol monitor 未验证部分保留人工待办。详见 [验收记录](QA-CAPSTONE-TOPICS.md)。\n`;
await writeFile(new URL("docs/CAPSTONE-TOPICS.md", root), index);
console.log(`已生成 ${book.length} 课综合 / 专题脚本。`);
