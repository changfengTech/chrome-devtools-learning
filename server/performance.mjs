import { readFile } from "node:fs/promises";
import { randomInt, randomUUID } from "node:crypto";
const book = JSON.parse(
  await readFile(
    new URL("../src/data/performance.json", import.meta.url),
    "utf8",
  ),
);
export const performanceIds = book.map((x) => x.id);
const localOrigins = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://127.0.0.1:4174",
  "http://localhost:4174",
]);
export function assessPerformance(id, variant, m, expected = m?.expected) {
  const valid =
    m &&
    Number.isFinite(m.duration) &&
    m.duration >= 0 &&
    m.duration < 120000 &&
    m.checksum === expected &&
    m.expected === expected &&
    m.expected > 0 &&
    m.visible === true;
  let healthy = false;
  switch (id) {
    case "27":
      healthy =
        m.discoveryDelay < 250 &&
        m.cpuMs < 80 &&
        m.shiftPx < 2 &&
        m.heroLoaded === true;
      break;
    case "28":
      healthy =
        m.operationCount === 1 && m.renderCalls === 1 && m.markCount === 2;
      break;
    case "29":
      healthy = variant === 0 ? m.normalizeMs < 70 : m.normalizeCalls === 1;
      break;
    case "30":
      healthy = m.yields >= 5 && m.maxBlock < 65;
      break;
    case "31":
      healthy =
        m.discoveryDelay < 250 && m.renderDelay < 90 && m.heroLoaded === true;
      break;
    case "32":
      healthy = m.shiftPx < 2 && m.heroLoaded === true;
      break;
    case "33":
      healthy =
        variant === 0
          ? m.layoutReads <= m.frames + 1 && m.frames >= 12
          : m.animatedProperty === "transform" && m.frames >= 12;
      break;
    case "34":
      healthy =
        variant === 0
          ? m.detailRequested === false && m.checkoutRequested === false
          : m.themeRequested === false;
      break;
    case "51":
      healthy =
        variant === 0
          ? (m.animationDuration > 0 && m.animationDuration <= 450) ||
            (m.motionSuppressed === true &&
              m.reducedPreview === true &&
              m.configuredDuration > 0 &&
              m.configuredDuration <= 450)
          : m.motionSuppressed === true && m.reducedPreview === true;
      break;
  }
  return { valid: Boolean(valid), healthy: Boolean(healthy) };
}
export function createPerformanceHandler({
  sessions = new Map(),
  origins = localOrigins,
  ttl = 30 * 60_000,
  variantForChallenge = () => randomInt(2),
  chapterLesson = () => ["29", "30", "33"][randomInt(3)],
} = {}) {
  const session = (t) => {
    const s = sessions.get(t);
    if (!s || Date.now() - s.created > ttl) {
      sessions.delete(t);
      return null;
    }
    return s;
  };
  return async function handle({ request, response, url, json, bodyJson }) {
    const control = url.pathname.startsWith("/api/performance/"),
      match = url.pathname.match(/^\/performance\/([\w-]+)\/(.*)$/),
      asset = url.pathname.match(
        /^\/lab\/performance\/(runtime.js|style.css)$/,
      );
    if (!control && !match && !asset) return false;
    const origin = request.headers.origin;
    if (origin && !origins.has(origin)) {
      json({ error: "不允许此来源操作性能实验" }, 403);
      return true;
    }
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return true;
    }
    if (asset) {
      response.setHeader(
        "Content-Type",
        asset[1].endsWith(".js")
          ? "text/javascript; charset=utf-8"
          : "text/css; charset=utf-8",
      );
      response.end(
        await readFile(
          new URL("../public/lab/performance/" + asset[1], import.meta.url),
        ),
      );
      return true;
    }
    if (control) {
      const input =
        request.method === "POST"
          ? await bodyJson(request)
          : Object.fromEntries(url.searchParams);
      if (
        ["/api/performance/sessions", "/api/performance/chapter"].includes(
          url.pathname,
        ) &&
        request.method === "POST"
      ) {
        const chapter = url.pathname.endsWith("/chapter");
        if (chapter) {
          if (input.chapter !== "performance") {
            json({ error: "性能章末类型无效" }, 400);
            return true;
          }
          input.lesson = chapterLesson();
          input.mode = "challenge";
        }
        if (
          !performanceIds.includes(input.lesson) ||
          !["practice", "challenge"].includes(input.mode)
        ) {
          json({ error: "课程或模式无效" }, 400);
          return true;
        }
        for (const [t, s] of sessions)
          if (Date.now() - s.created > ttl) sessions.delete(t);
        if (sessions.size >= 500) {
          json({ error: "会话过多，请等待过期" }, 429);
          return true;
        }
        const token = randomUUID(),
          seed = input.mode === "practice" ? 42 : randomInt(101, 9999),
          s = {
            token,
            created: Date.now(),
            lesson: input.lesson,
            mode: input.mode,
            chapter,
            seed,
            sku: "CUP-" + seed,
            quantity: 2 + (seed % 3),
            variant: input.mode === "practice" ? 0 : variantForChallenge(),
            runs: new Map(),
            baseline: false,
            fixed: false,
          };
        sessions.set(token, s);
        json(
          {
            token,
            mode: s.mode,
            ...(chapter ? { chapter: "performance" } : { lesson: s.lesson }),
            expiresAt: new Date(Date.now() + ttl).toISOString(),
          },
          201,
        );
        return true;
      }
      const s = session(input.token);
      if (!s) {
        json({ error: "性能会话已过期或服务重启，请重新准备" }, 404);
        return true;
      }
      if (url.pathname === "/api/performance/lesson") {
        const run = s.runs.get(input.runId);
        json({
          ...book.find((x) => x.id === s.lesson),
          token: s.token,
          chapter: s.chapter ? "performance" : null,
          mode: s.mode,
          sku: s.sku,
          quantity: s.quantity,
          seed: s.seed,
          ...(run
            ? {
                run: {
                  id: run.id,
                  phase: run.phase,
                  variant: s.variant,
                  good: run.good,
                  correction: run.correction,
                },
              }
            : {}),
        });
        return true;
      }
      if (
        url.pathname === "/api/performance/begin" &&
        request.method === "POST"
      ) {
        if (
          !["baseline", "fixed"].includes(input.phase) ||
          s.runs.size >= 100
        ) {
          json({ error: "阶段无效或次数已满" }, 400);
          return true;
        }
        const id = randomUUID();
        s.runs.set(id, {
          id,
          phase: input.phase,
          correction: ["a", "b", "c"].includes(input.correction)
            ? input.correction
            : "",
          good:
            input.phase === "fixed" &&
            input.correction === (s.variant === 0 ? "a" : "b"),
          visited: false,
          reported: false,
          resources: [],
        });
        json({ runId: id, phase: input.phase });
        return true;
      }
      if (
        url.pathname === "/api/performance/report" &&
        request.method === "POST"
      ) {
        const run = s.runs.get(input.runId),
          m = input.metrics;
        if (
          !run ||
          run.reported ||
          !run.visited ||
          !m ||
          typeof m !== "object" ||
          Array.isArray(m) ||
          Object.keys(m).length > 40 ||
          Object.values(m).some(
            (v) => !["number", "boolean", "string"].includes(typeof v),
          ) ||
          Object.values(m).some(
            (v) => typeof v === "number" && !Number.isFinite(v),
          ) ||
          Object.values(m).some((v) => typeof v === "string" && v.length > 200)
        ) {
          json({ error: "缺少实验页面、报告无效或重复提交" }, 400);
          return true;
        }
        const result = assessPerformance(
          s.lesson,
          s.variant,
          m,
          s.seed * s.quantity,
        );
        if (!result.valid) {
          json({ error: "结果或可见性不符合实验条件，请检查环境后重跑" }, 400);
          return true;
        }
        const passed =
          run.phase === "baseline" ? !result.healthy : result.healthy;
        run.reported = true;
        run.metrics = m;
        if (passed) s[run.phase] = true;
        json({
          passed,
          phase: run.phase,
          checks: [
            { label: "输入与业务校验值一致", passed: result.valid },
            {
              label:
                run.phase === "baseline"
                  ? "目标异常已在本次观察中出现"
                  : "目标对照条件成立",
              passed,
            },
          ],
        });
        return true;
      }
      if (
        url.pathname === "/api/performance/grade" &&
        request.method === "POST"
      ) {
        const expected = s.variant === 0 ? "a" : "b",
          checks = [
            { label: "本会话已观察故障", passed: s.baseline },
            {
              label: "根因与本次案例一致",
              passed: input.diagnosis === expected,
            },
            {
              label: "证据与本次案例一致",
              passed: input.evidence === expected,
            },
            {
              label: "验证针对实际原因",
              passed: input.verification === expected,
            },
            { label: "本会话正常对照已通过", passed: s.fixed },
          ];
        json({
          passed: checks.every((x) => x.passed),
          checks,
          expectedChoice: expected,
          explanation: "保持相同环境，关联实际轨道和业务结果。",
          boundary:
            "服务校验会话、实验文档与页面指标；报告可被修改，不证明使用过 DevTools，不代替人工解读 trace。",
        });
        return true;
      }
      json({ error: "未知性能接口" }, 404);
      return true;
    }
    const s = session(match[1]),
      task = match[2];
    if (!s) {
      json(
        { error: "性能会话已过期，请回课程重新准备；本页任务在离页时自动停止" },
        404,
      );
      return true;
    }
    const run = s.runs.get(url.searchParams.get("run"));
    if (task === "" || task === "index.html") {
      if (run) run.visited = true;
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(
        await readFile(
          new URL("../public/lab/performance/index.html", import.meta.url),
        ),
      );
      return true;
    }
    if (!run) {
      json({ error: "缺少本会话运行编号" }, 400);
      return true;
    }
    response.once("finish", () => run.resources.push(task));
    if (task === "recommendations") {
      await new Promise((r) => setTimeout(r, 360));
      json({ items: ["帆布袋", "台灯"] });
      return true;
    }
    if (task === "hero.svg") {
      response.setHeader("Content-Type", "image/svg+xml");
      response.end(
        '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400" viewBox="0 0 800 400"><rect width="800" height="400" fill="#dce7ed"/><path d="M290 80h180v140a85 85 0 0 1-170 0V80m170 20h30a45 45 0 0 1 0 100h-30" fill="#fff" stroke="#6c8b99" stroke-width="8"/><text x="400" y="350" text-anchor="middle" font-size="28" fill="#355365">晨间陶瓷杯</text></svg>',
      );
      return true;
    }
    if (["details.js", "checkout.js"].includes(task)) {
      const name = task === "details.js" ? "details" : "checkout";
      response.setHeader("Content-Type", "text/javascript; charset=utf-8");
      response.end(
        `export function openFeature(sku,quantity){return {screen:'${name}',sku,quantity,ok:true}}\n` +
          Array.from(
            { length: 180 },
            (_, i) =>
              `export function optional${name}${i}(value){return value.split('').reverse().join('')+'${i}'}\n`,
          ).join(""),
      );
      return true;
    }
    if (task === "themes.css") {
      response.setHeader("Content-Type", "text/css");
      response.end(
        ".detail-screen{border-left:4px solid #245de8;padding:12px;background:#edf3fd}\n" +
          Array.from(
            { length: 260 },
            (_, i) =>
              `.optional-theme-${i}{border-color:rgb(${i % 255},110,140);padding:${i % 10}px}\n`,
          ).join(""),
      );
      return true;
    }
    json({ error: "性能资源不存在" }, 404);
    return true;
  };
}
