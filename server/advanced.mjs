import { readFile } from "node:fs/promises";
import { randomInt, randomUUID } from "node:crypto";
import {
  authOptions,
  registerCredential,
  verifyCredential,
} from "./advanced-webauthn.mjs";
const book = JSON.parse(
  await readFile(new URL("../src/data/advanced.json", import.meta.url), "utf8"),
);
const foundation = JSON.parse(
  await readFile(
    new URL("../src/data/foundations.json", import.meta.url),
    "utf8",
  ),
);
export const advancedIds = book.map((x) => x.id);
const chapterLessons = {
  elements: ["05", "07"],
  console: ["09", "12"],
  sources: ["16", "18"],
};
const localOrigins = new Set([
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:4174",
  "http://localhost:4174",
]);
const metricsKeys = {
  53: ["latest", "restored", "cart"],
  54: ["retained", "subscriptions", "checksum", "work"],
  55: ["total", "name", "overflow", "schema", "handlers", "retained"],
  T01: ["coordinates", "fallbacks"],
  T02: ["reachable", "mapping"],
  T03: ["mapStatus", "sourceMatches", "total"],
  T04: ["mediaError", "advanced", "forcedPause"],
  T05: ["semanticErrors", "fixtureMatches"],
  T06: ["credentialMatch", "uv"],
  T07: ["clicks", "hit", "disabled"],
  T08: ["matched", "fresh"],
  "05": ["color"],
  "07": ["clicks", "hit", "disabled"],
  "09": ["total", "stockBlocked"],
  12: ["snapshot", "awaited"],
  16: ["accepted", "normalized"],
  18: ["latest", "parsed"],
};
export function assessAdvanced(id, v, m, expected) {
  const scalar =
    m &&
    typeof m === "object" &&
    !Array.isArray(m) &&
    Object.keys(m).length <= 40 &&
    Object.values(m).every(
      (x) =>
        typeof x === "boolean" ||
        (typeof x === "number" && Number.isFinite(x)) ||
        (typeof x === "string" && x.length <= 200),
    );
  const strings = new Set([
    "restored",
    "work",
    "coordinates",
    "color",
    "snapshot",
    "hit",
  ]);
  const booleans = new Set([
    "name",
    "reachable",
    "sourceMatches",
    "advanced",
    "forcedPause",
    "fixtureMatches",
    "credentialMatch",
    "uv",
    "disabled",
    "matched",
    "fresh",
    "stockBlocked",
    "awaited",
    "normalized",
    "parsed",
  ]);
  const shape =
    scalar &&
    metricsKeys[id]?.every(
      (k) =>
        Object.hasOwn(m, k) &&
        (strings.has(k)
          ? typeof m[k] === "string"
          : booleans.has(k)
            ? typeof m[k] === "boolean"
            : typeof m[k] === "number" && m[k] >= 0 && m[k] <= 1e8),
    );
  const valid = Boolean(
    shape &&
      m.visible === true &&
      m.expected === expected &&
      Number.isFinite(m.duration) &&
      m.duration >= 0 &&
      m.duration < 1800000,
  );
  if (!valid) return { valid: false, fault: false, healthy: false };
  let fault = false,
    healthy = false;
  switch (id) {
    case "53":
      fault = v === 0 ? m.latest !== 2 : m.restored !== "current";
      healthy =
        m.latest === 2 && m.restored === "current" && m.cart === expected;
      break;
    case "54":
      fault = v === 0 ? m.retained >= 5 : m.subscriptions >= 5;
      healthy =
        m.retained === 0 &&
        m.subscriptions === 0 &&
        m.checksum === expected &&
        m.work === "chunked";
      break;
    case "55":
      fault =
        v === 0
          ? m.total !== expected && m.name === false && m.overflow > 2
          : m.schema === 1 && m.handlers === 2 && m.retained >= 5;
      healthy =
        m.total === expected &&
        m.name === true &&
        m.overflow <= 1 &&
        m.schema === 2 &&
        m.handlers === 1 &&
        m.retained === 0 &&
        m.releaseChecked === true;
      break;
    case "T01":
      fault = v === 0 ? m.coordinates === "swapped" : m.fallbacks < 3;
      healthy = m.coordinates === "correct" && m.fallbacks === 3;
      break;
    case "T02":
      fault = m.reachable === true && m.mapping !== 4174;
      healthy = m.reachable === true && m.mapping === 4174;
      break;
    case "T03":
      fault = v === 0 ? m.mapStatus === 404 : m.sourceMatches === false;
      healthy =
        m.mapStatus === 200 && m.sourceMatches === true && m.total === expected;
      break;
    case "T04":
      fault = v === 0 ? m.mediaError > 0 : m.forcedPause === true;
      healthy =
        m.mediaError === 0 && m.advanced === true && m.forcedPause === false;
      break;
    case "T05":
      fault = m.semanticErrors > 0 && m.fixtureMatches === false;
      healthy = m.semanticErrors === 0 && m.fixtureMatches === true;
      break;
    case "T06":
      fault = v === 0 ? m.credentialMatch === false : m.uv === false;
      healthy = m.credentialMatch === true && m.uv === true;
      break;
    case "T07":
    case "07":
      fault = v === 0 ? m.hit !== "add" : m.disabled === true;
      healthy = m.clicks === 1 && m.hit === "add" && m.disabled === false;
      break;
    case "T08":
      fault = v === 0 ? m.matched === false : m.fresh === false;
      healthy = m.matched === true && m.fresh === true;
      break;
    case "05":
      fault = m.color === "rgb(184, 65, 84)";
      healthy = m.color === "rgb(22, 130, 103)";
      break;
    case "09":
      fault = v === 0 ? m.total !== expected - 5 : m.stockBlocked === false;
      healthy =
        v === 0
          ? m.total === expected - 5
          : m.stockBlocked === true && m.total === 0;
      break;
    case "12":
      fault = v === 0 ? m.snapshot === "changed" : m.awaited === false;
      healthy = m.snapshot === "original" && m.awaited === true;
      break;
    case "16":
      fault = m.accepted !== expected || m.normalized === false;
      healthy = m.accepted === expected && m.normalized === true;
      break;
    case "18":
      fault = v === 0 ? m.parsed === false : m.latest !== 2;
      healthy = m.parsed === true && m.latest === 2;
      break;
  }
  return { valid, healthy: Boolean(healthy), fault: Boolean(fault) };
}
export function createAdvancedHandler({
  sessions = new Map(),
  origins = localOrigins,
  ttl = 1800000,
  variantForChallenge = () => randomInt(2),
  chapterLesson = (c) => chapterLessons[c][randomInt(2)],
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
    const control = url.pathname.startsWith("/api/advanced/"),
      match = url.pathname.match(/^\/advanced\/([\w-]+)\/(.*)$/),
      asset = url.pathname.match(
        /^\/lab\/advanced\/(runtime.js|business.js|style.css|workspace\/cart.ts)$/,
      );
    if (!control && !match && !asset) return false;
    if (request.headers.origin && !origins.has(request.headers.origin)) {
      json({ error: "不允许此来源操作实验" }, 403);
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
          : asset[1].endsWith(".css")
            ? "text/css; charset=utf-8"
            : "text/plain; charset=utf-8",
      );
      response.end(
        await readFile(
          new URL("../public/lab/advanced/" + asset[1], import.meta.url),
        ),
      );
      return true;
    }
    if (control) {
      const input =
          request.method === "POST"
            ? await bodyJson(request)
            : Object.fromEntries(url.searchParams),
        action = url.pathname.slice("/api/advanced/".length);
      if (
        ["sessions", "chapter"].includes(action) &&
        request.method === "POST"
      ) {
        const chapter = action === "chapter";
        if (chapter) {
          if (!Object.hasOwn(chapterLessons, input.chapter)) {
            json({ error: "章末类型无效" }, 400);
            return true;
          }
          input.lesson = chapterLesson(input.chapter);
          input.mode = "challenge";
          if (!chapterLessons[input.chapter].includes(input.lesson))
            throw Error("Invalid chapter factory");
        }
        if (
          !(chapter
            ? foundation.some((x) => x.id === input.lesson)
            : advancedIds.includes(input.lesson)) ||
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
          seed = input.mode === "practice" ? 42 : randomInt(101, 9999);
        const s = {
          token,
          seed,
          quantity: 2 + (seed % 3),
          lesson: input.lesson,
          mode: input.mode,
          chapter: chapter ? input.chapter : null,
          variant: input.mode === "practice" ? 0 : variantForChallenge(),
          created: Date.now(),
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
            ...(chapter ? { chapter: s.chapter } : { lesson: s.lesson }),
            expiresAt: new Date(s.created + ttl).toISOString(),
          },
          201,
        );
        return true;
      }
      const s = session(input.token);
      if (!s) {
        json({ error: "会话已过期或服务重启，请回课程准备" }, 404);
        return true;
      }
      const data = (s.chapter ? foundation : book).find(
        (x) => x.id === s.lesson,
      );
      if (action === "lesson" && request.method === "GET") {
        const run = s.runs.get(input.runId);
        json({
          ...data,
          chapter: s.chapter,
          mode: s.mode,
          seed: s.seed,
          quantity: s.quantity,
          variant: s.variant,
          expected: s.seed * s.quantity,
          expiresAt: new Date(s.created + ttl).toISOString(),
          ...(run && s.currentRun === run.id
            ? { runId: run.id, phase: run.phase, good: run.good }
            : {}),
        });
        return true;
      }
      if (request.method !== "POST") {
        json({ error: "方法不支持" }, 405);
        return true;
      }
      if (action === "begin") {
        if (
          !s.visited ||
          !["baseline", "fixed"].includes(input.phase) ||
          s.runs.size >= 100 ||
          (input.phase === "fixed" && !s.baseline)
        ) {
          json({ error: "先打开实验并记录故障，或运行次数已满" }, 400);
          return true;
        }
        const run = {
          id: randomUUID(),
          phase: input.phase,
          good:
            input.phase === "fixed" &&
            input.correction === (s.variant === 0 ? "a" : "b"),
          visited: false,
          reported: false,
          resources: new Set(),
        };
        s.runs.set(run.id, run);
        s.currentRun = run.id;
        s.currentGood = run.good;
        json({ runId: run.id, phase: run.phase });
        return true;
      }
      const run = s.runs.get(input.runId || s.currentRun);
      if (
        action === "native-options" ||
        action === "native-register" ||
        action === "native-verify"
      ) {
        if (
          action === "native-options" &&
          !["register", "authenticate"].includes(input.action)
        ) {
          json({ error: "认证动作无效" }, 400);
          return true;
        }
        if (s.lesson !== "T06" || !run?.visited || s.currentRun !== run.id) {
          json({ error: "仅在当前 WebAuthn 运行使用" }, 400);
          return true;
        }
        const origin = "http://" + request.headers.host;
        if (
          !["http://127.0.0.1:4174", "http://localhost:4174"].includes(origin)
        ) {
          json({ error: "真实认证仅支持本地 4174" }, 400);
          return true;
        }
        try {
          json(
            action === "native-options"
              ? authOptions(s, input.action, origin)
              : action === "native-register"
                ? registerCredential(s, input, origin)
                : verifyCredential(s, input, origin),
          );
        } catch (e) {
          json({ error: e.message }, 400);
        }
        return true;
      }
      if (action === "report") {
        if (
          !run ||
          s.currentRun !== run.id ||
          !run.visited ||
          run.reported ||
          !run.resources.has("product.json")
        ) {
          json({ error: "缺少当前实验文档、资源或重复报告" }, 400);
          return true;
        }
        const result = assessAdvanced(
          s.lesson,
          s.variant,
          input.metrics,
          s.seed * s.quantity,
        );
        const needed =
          s.lesson === "53"
            ? ["search-old", "search-new"]
            : s.lesson === "T02"
              ? ["probe"]
              : s.lesson === "T03"
                ? ["cart.js", "cart.js.map"]
                : [];
        if (!result.valid || !needed.every((k) => run.resources.has(k))) {
          json({ error: "报告或实际资源条件不完整" }, 400);
          return true;
        }
        const passed = run.phase === "baseline" ? result.fault : result.healthy;
        run.reported = true;
        run.metrics = input.metrics;
        if (passed) s[run.phase] = true;
        json({
          passed,
          phase: run.phase,
          checks: [
            { label: "当前运行、输入与实际资源一致", passed: true },
            {
              label:
                run.phase === "baseline" ? "目标故障已观察" : "正常对照成立",
              passed,
            },
          ],
        });
        return true;
      }
      if (action === "grade") {
        const expected = s.variant === 0 ? "a" : "b",
          checks = [
            { label: "本会话已记录实际故障", passed: s.baseline },
            { label: "根因符合本次配置", passed: input.diagnosis === expected },
            { label: "证据符合本次配置", passed: input.evidence === expected },
            {
              label: "验证针对实际原因",
              passed: input.verification === expected,
            },
            { label: "正常对照已通过", passed: s.fixed },
          ];
        json({
          passed: checks.every((x) => x.passed),
          checks,
          expectedChoice: expected,
          explanation: data.principle,
          boundary:
            "页面结果与结构化判断可被主动修改；原生面板、设备、AI、Autofill 与认证器操作需独立取证，不是能力认证。",
        });
        return true;
      }
      json({ error: "未知实验接口" }, 404);
      return true;
    }
    const s = session(match[1]);
    if (!s) {
      json({ error: "会话已过期，请回课程准备" }, 404);
      return true;
    }
    const task = match[2];
    if (task === "" || task === "index.html") {
      s.visited = true;
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(
        await readFile(
          new URL("../public/lab/advanced/index.html", import.meta.url),
        ),
      );
      return true;
    }
    const run = s.runs.get(url.searchParams.get("run"));
    if (!run || s.currentRun !== run.id) {
      json({ error: "运行已失效" }, 409);
      return true;
    }
    if (task === "activate") {
      run.visited = true;
      json({ ok: true });
      return true;
    }
    if (!run.visited) {
      json({ error: "先进入当前实验" }, 400);
      return true;
    }
    run.resources.add(task);
    if (task === "product.json") {
      json({
        sku: "CUP-" + s.seed,
        price:
          s.lesson === "55" && !run.good && !s.variant
            ? String(s.seed)
            : s.seed,
        quantity: s.quantity,
        expected: s.seed * s.quantity,
      });
      return true;
    }
    if (task === "search-old" || task === "search-new") {
      await new Promise((r) => setTimeout(r, task === "search-old" ? 180 : 20));
      if (!response.destroyed)
        json({
          sequence: task === "search-old" ? 1 : 2,
          query: task === "search-old" ? "杯" : "杯子",
          sku: "CUP-" + s.seed,
        });
      return true;
    }
    if (task === "probe") {
      json({ ok: true, service: "local-shop", port: 4174 });
      return true;
    }
    if (task === "cart.js") {
      response.setHeader("Content-Type", "text/javascript; charset=utf-8");
      response.end(
        "export function total(price, quantity) {\n  return price * quantity;\n}\n//# sourceMappingURL=" +
          (!run.good && s.variant === 0 ? "missing.map" : "cart.js.map") +
          "?run=" +
          run.id +
          "\n",
      );
      return true;
    }
    if (task === "cart.js.map") {
      if (!run.good && s.variant === 0) {
        json({ error: "Missing map fixture" }, 404);
        return true;
      }
      json({
        version: 3,
        file: "cart.js",
        sources: ["/lab/advanced/workspace/cart.ts"],
        sourcesContent: [
          !run.good && s.variant === 1
            ? "export function total(price: number, quantity: number) {\n  return price + quantity;\n}\n"
            : await readFile(
                new URL(
                  "../public/lab/advanced/workspace/cart.ts",
                  import.meta.url,
                ),
                "utf8",
              ),
        ],
        names: [],
        mappings: "AAAA;AACA;AACA",
      });
      return true;
    }
    json({ error: "资源不存在" }, 404);
    return true;
  };
}
