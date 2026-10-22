// 官方 Lighthouse CLI 的本地审计入口；独立临时 Chrome 配置，不连接用户已有浏览器。
import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { readFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
const [target, output, device = "desktop", categories = "all"] =
  process.argv.slice(2);
const url = new URL(target);
if (
  url.origin !== "http://127.0.0.1:4174" ||
  !/^\/quality\/[\w-]+\/audit\/$/.test(url.pathname) ||
  !url.searchParams.get("run") ||
  !["mobile", "desktop"].includes(device) ||
  !["all", "performance"].includes(categories) ||
  !output
)
  throw Error(
    "用法：node scripts/qa-lighthouse.mjs 本轮本机审计地址 输出.json [desktop|mobile] [all|performance]",
  );
const file = resolve(output);
await mkdir(dirname(file), { recursive: true });
const args = [
  "dlx",
  "lighthouse@13.0.1",
  url.href,
  "--quiet",
  "--chrome-flags=--headless --disable-extensions --disable-background-networking",
  "--throttling-method=provided",
  "--output=json",
  "--output-path=" + file,
  device === "desktop" ? "--preset=desktop" : "--form-factor=mobile",
  "--only-categories=" +
    (categories === "performance"
      ? "performance"
      : "performance,accessibility,best-practices,seo"),
];
const child = spawn("pnpm", args, { stdio: ["ignore", "pipe", "pipe"] });
let diagnostic = "";
child.stdout.on("data", (data) => {
  diagnostic = (diagnostic + data).slice(-4000);
});
child.stderr.on("data", (data) => {
  diagnostic = (diagnostic + data).slice(-4000);
});
const timer = setTimeout(() => child.kill("SIGTERM"), 90000);
const code = await new Promise((resolve, reject) => {
  child.on("error", reject);
  child.on("exit", resolve);
});
clearTimeout(timer);
if (code !== 0) throw Error("Lighthouse 未完成：" + diagnostic);
const report = JSON.parse(await readFile(file, "utf8"));
if (report.runtimeError) throw Error(report.runtimeError.message);
console.log(
  JSON.stringify({
    file,
    version: report.lighthouseVersion,
    url: report.finalDisplayedUrl,
    formFactor: report.configSettings.formFactor,
    categories: Object.fromEntries(
      Object.entries(report.categories).map(([id, item]) => [id, item.score]),
    ),
    lcp: report.audits["largest-contentful-paint"]?.numericValue,
    tbt: report.audits["total-blocking-time"]?.numericValue,
  }),
);
