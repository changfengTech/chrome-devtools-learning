import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const lessons = JSON.parse(
  await readFile(new URL("src/data/curriculum.json", root), "utf8"),
);
const chapters = {
  intro: "排查入门",
  elements: "Elements",
  console: "Console",
  sources: "Sources",
  network: "Network",
  performance: "Performance",
  application: "Application",
  memory: "Memory",
  lighthouse: "Lighthouse",
  tools: "辅助工具",
  capstone: "综合实战",
  topics: "专题拓展",
};
const prerequisites = {
  intro: "无；按顺序建立排查与实验习惯。",
  elements: "01–03。",
  console: "01–08。",
  sources: "01–12；普通 JavaScript 函数与异步基础随案例补齐。",
  network: "01–03、09–11；19–26 顺序学习。",
  performance: "01–03、19–25；事件循环与渲染原理在章内补齐。",
  application: "19–25；先学存储，再学离线与 worker。",
  memory: "13–18、27–30；引用与垃圾回收在章内补齐。",
  lighthouse: "Elements、Network、Performance 基础。",
  tools:
    "跟随关联章节；48 关联 Elements，49 关联 Network/Application，50 关联复测，51 关联渲染，52 关联 Sources。",
  capstone: "八大面板主课与相应章末挑战。",
  topics: "按专题标注设备、账号、浏览器与服务条件；不阻塞主线。",
};
let text =
  "# 完整课程目录\n\n由 `src/data/curriculum.json` 生成，执行 `pnpm docs:curriculum` 更新。55 节主线（含 3 综合）、8 专题；8 个面板章末题见 [ACCEPTANCE.md](ACCEPTANCE.md)。目录不代表功能已实现，实施状态见 [STATUS.md](STATUS.md)。\n\n";
for (const [id, title] of Object.entries(chapters)) {
  text += `## ${title}\n\n前置：${prerequisites[id]}\n\n| 课次 | 名称 | 学习目标 | 交互演示 | 商城实战 | 迁移挑战 | 状态 |\n| --- | --- | --- | --- | --- | --- | --- |\n`;
  for (const lesson of lessons.filter((item) => item.chapter === id)) {
    text += `| ${[lesson.id, lesson.title, lesson.goal, lesson.demo, lesson.lab, lesson.challenge, lesson.status === "ready" ? "可实战" : "课程规划"].join(" | ")} |\n`;
  }
  text += "\n";
}
text +=
  "## 实施前逐课脚本要求\n\n每课实现前补齐：正常/故障合同、可调条件、观察证据、修复对照、恢复、三级提示、挑战答案与误区、自动检查边界、官方来源与实测 Chrome 版本。第 01–18 课见 [基础课脚本](FOUNDATIONS-01-18.md)，第 21 课见 [LESSON-21.md](LESSON-21.md)。\n";
await writeFile(new URL("docs/CURRICULUM.md", root), text);
console.log(`已生成 ${lessons.length} 节课目录。`);
