// 可选真实审计重复检查。先启动 qa-quality.mjs 1；本脚本只准备本地会话和调用官方 CLI，不操作浏览器 UI。
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";
import { summarizeLighthouse } from "../public/lab/quality/report.js";
const directory = resolve(
  process.argv[2] || "/private/tmp/quality-audit-repeat",
);
await mkdir(directory, { recursive: true });
const base = "http://127.0.0.1:4174";
async function post(path, data) {
  const response = await fetch(base + "/api/quality/" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await response.json();
  if (!response.ok) throw Error(body.error);
  return body;
}
const cases = [
  { id: "45", mode: "practice", v: 0 },
  { id: "45", mode: "challenge", v: 1 },
  { id: "46", mode: "practice", v: 0 },
  { id: "46", mode: "challenge", v: 1 },
];
const summaries = [];
async function check(item) {
  const { token } = await post("sessions", {
    lesson: item.id,
    mode: item.mode,
  });
  assert.equal((await fetch(`${base}/quality/${token}/`)).status, 200);
  for (const phase of ["baseline", "fixed"]) {
    const { runId } = await post("begin", {
      token,
      phase,
      correction: item.v ? "b" : "a",
    });
    await fetch(`${base}/quality/${token}/activate?run=${runId}`);
    const target = `${base}/quality/${token}/audit/?run=${runId}`;
    for (let cycle = 1; cycle <= 3; cycle++) {
      const file = resolve(
        directory,
        `${item.id}-${item.mode}-${phase}-${cycle}.json`,
      );
      const form =
        item.id === "45" && item.v === 0 && phase === "fixed"
          ? "mobile"
          : "desktop";
      const categories =
        item.id === "45" && item.v === 1 && phase === "baseline"
          ? "performance"
          : "all";
      await new Promise((resolve, reject) => {
        const p = spawn(
          process.execPath,
          ["scripts/qa-lighthouse.mjs", target, file, form, categories],
          { stdio: "ignore" },
        );
        p.on("error", reject);
        p.on("exit", (code) =>
          code === 0 ? resolve() : reject(Error("Lighthouse 未完成：" + file)),
        );
      });
      const raw = JSON.parse(await readFile(file, "utf8")),
        summary = summarizeLighthouse(raw, target);
      if (item.id === "45") {
        assert.equal(summary.formFactor, form);
        assert.equal(
          Object.keys(summary.categories).length,
          categories === "all" ? 4 : 1,
        );
      } else
        assert.equal(
          item.v ? summary.description : summary.buttonName,
          phase === "fixed" ? 1 : 0,
        );
      const { details, ...report } = summary;
      await post("audit", { token, runId, report });
      summaries.push({
        lesson: item.id,
        mode: item.mode,
        variant: item.v,
        phase,
        cycle,
        file,
        report,
      });
      console.log(
        `${item.id} ${item.mode} ${phase} ${cycle}/3：实际审计条件 / 检查项通过`,
      );
    }
  }
}
// 两条普通质量案例可并行；不用于47的性能比较。
for (let i = 0; i < cases.length; i += 2)
  await Promise.all(cases.slice(i, i + 2).map(check));
await writeFile(
  resolve(directory, "summary.json"),
  JSON.stringify(
    {
      boundary:
        "Actual CLI navigation repetitions + audit API import; tutorial UI and manual checks are recorded separately",
      summaries,
    },
    null,
    2,
  ),
);
