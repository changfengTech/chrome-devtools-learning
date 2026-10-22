import { readFile } from "node:fs/promises";
import { randomInt, randomUUID } from "node:crypto";
const book = JSON.parse(
  await readFile(new URL("../src/data/memory.json", import.meta.url), "utf8"),
);
export const memoryIds = book.map((x) => x.id);
const origins = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://127.0.0.1:4174",
  "http://localhost:4174",
]);
export function assessMemory(id, variant, m, expected = m?.expected) {
  const common =
    m &&
    Number.isFinite(m.duration) &&
    m.duration >= 0 &&
    m.duration < 1800000 &&
    m.visible === true &&
    m.expected === expected &&
    Number.isInteger(m.cycles) &&
    m.cycles >= (id === "50" ? 1 : 5) &&
    m.cycles <= 20 &&
    m.featureWorks === true;
  const countFields = [
    "history",
    "cacheEntries",
    "owners",
    "auditOwners",
    "previewHistory",
    "snapshotCache",
    "latestPreview",
    "detached",
    "listeners",
    "timers",
    "successfulFlows",
    "failedFlows",
    "ordersSeen",
    "delaysSeen",
  ];
  const valid = Boolean(
    common &&
      Number.isInteger(expected) &&
      expected > 0 &&
      Number.isFinite(m.checksum) &&
      m.checksum >= 0 &&
      countFields.every(
        (k) => Number.isInteger(m[k]) && m[k] >= 0 && m[k] <= 500,
      ) &&
      (id === "50" || m.checksum === expected),
  );
  let healthy = false,
    fault = false;
  if (id === "40") {
    healthy =
      variant === 0
        ? m.history === 0 && m.cacheEntries <= 3
        : m.cacheEntries <= 1;
    fault = variant === 0 ? m.history >= 5 : m.cacheEntries >= 5;
  }
  if (id === "41") {
    healthy =
      variant === 0 ? m.owners <= 1 : m.auditOwners === 0 && m.owners <= 1;
    fault = variant === 0 ? m.owners >= 5 : m.auditOwners >= 5;
  }
  if (id === "42") {
    healthy =
      variant === 0
        ? m.previewHistory === 0 && m.latestPreview <= 1
        : m.snapshotCache <= 1;
    fault = variant === 0 ? m.previewHistory >= 5 : m.snapshotCache >= 5;
  }
  if (id === "43") {
    healthy = m.detached === 0;
    fault = m.detached >= 5;
  }
  if (id === "44") {
    healthy = m.listeners === 0 && m.timers === 0;
    fault = variant === 0 ? m.listeners >= 5 : m.timers >= 5;
  }
  if (id === "50") {
    healthy =
      m.successfulFlows >= 2 &&
      (variant === 0 ? m.ordersSeen === 2 : m.delaysSeen === 2) &&
      m.checksum === expected;
    fault = m.failedFlows >= 1;
  }
  return { valid, healthy: Boolean(healthy), fault: Boolean(fault) };
}
export function createMemoryHandler({
  ttl = 30 * 60_000,
  variantForChallenge = () => randomInt(2),
  chapterLesson = () => ["42", "43", "44"][randomInt(3)],
} = {}) {
  const sessions = new Map();
  const session = (t) => {
    const s = sessions.get(t);
    if (!s || Date.now() - s.created > ttl) {
      sessions.delete(t);
      return null;
    }
    return s;
  };
  return async function handle({ request, response, url, json, bodyJson }) {
    const control = url.pathname.startsWith("/api/memory/"),
      match = url.pathname.match(/^\/memory\/([\w-]+)\/(.*)$/),
      asset = url.pathname.match(/^\/lab\/memory\/(runtime.js|style.css)$/);
    if (!control && !match && !asset) return false;
    const origin = request.headers.origin;
    if (origin && !origins.has(origin)) {
      json({ error: "不允许此来源操作内存实验" }, 403);
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
          new URL("../public/lab/memory/" + asset[1], import.meta.url),
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
        ["/api/memory/sessions", "/api/memory/chapter"].includes(
          url.pathname,
        ) &&
        request.method === "POST"
      ) {
        const chapter = url.pathname.endsWith("/chapter");
        if (chapter) {
          if (input.chapter !== "memory") {
            json({ error: "内存章末类型无效" }, 400);
            return true;
          }
          input.lesson = chapterLesson();
          input.mode = "challenge";
        }
        if (
          !memoryIds.includes(input.lesson) ||
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
            visited: false,
            baseline: false,
            fixed: false,
          };
        sessions.set(token, s);
        json(
          {
            token,
            mode: s.mode,
            ...(chapter ? { chapter: "memory" } : { lesson: s.lesson }),
            expiresAt: new Date(Date.now() + ttl).toISOString(),
          },
          201,
        );
        return true;
      }
      const s = session(input.token);
      if (!s) {
        json({ error: "内存会话已过期或服务重启，请重新准备" }, 404);
        return true;
      }
      if (url.pathname === "/api/memory/lesson") {
        const run = s.runs.get(input.runId);
        json({
          ...book.find((x) => x.id === s.lesson),
          token: s.token,
          expiresAt: new Date(s.created + ttl).toISOString(),
          chapter: s.chapter ? "memory" : null,
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
      if (url.pathname === "/api/memory/begin" && request.method === "POST") {
        if (
          !["baseline", "fixed"].includes(input.phase) ||
          s.runs.size >= 100
        ) {
          json({ error: "阶段无效或次数已满" }, 400);
          return true;
        }
        if (!s.visited) {
          json({ error: "先从课程入口打开实验文档" }, 400);
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
      if (url.pathname === "/api/memory/report" && request.method === "POST") {
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
        const result = assessMemory(
          s.lesson,
          s.variant,
          m,
          s.seed * s.quantity,
        );
        if (!result.valid) {
          json({ error: "结果或可见性不符合实验条件，请检查环境后重跑" }, 400);
          return true;
        }
        const passed = run.phase === "baseline" ? result.fault : result.healthy;
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
      if (url.pathname === "/api/memory/grade" && request.method === "POST") {
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
          explanation:
            "保持相同 VM 与操作批次，关联存活增量、Retainers 和正常业务；Recorder 另需实际回放。",
          boundary:
            "服务校验本页自有资源与业务报告，报告可被修改；不证明 GC、真实堆字节或 Recorder 操作。",
        });
        return true;
      }
      json({ error: "未知内存接口" }, 404);
      return true;
    }
    const s = session(match[1]),
      task = match[2];
    if (!s) {
      json(
        { error: "内存会话已过期，请回课程重新准备；本页任务在离页时自动停止" },
        404,
      );
      return true;
    }
    const run = s.runs.get(url.searchParams.get("run"));
    if (task === "" || task === "index.html") {
      s.visited = true;
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(
        await readFile(
          new URL("../public/lab/memory/index.html", import.meta.url),
        ),
      );
      return true;
    }
    if (!run) {
      json({ error: "缺少本会话运行编号" }, 400);
      return true;
    }
    if (task === "activate") {
      run.visited = true;
      json({ ok: true });
      return true;
    }
    json({ error: "内存资源不存在" }, 404);
    return true;
  };
}
