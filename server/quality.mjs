import { readFile } from "node:fs/promises";
import { randomInt, randomUUID } from "node:crypto";
import { median } from "../public/lab/quality/report.js";
import { serveQualityResource } from "./quality-resources.mjs";
const book = JSON.parse(
  await readFile(new URL("../src/data/quality.json", import.meta.url), "utf8"),
);
export const qualityIds = book.map((x) => x.id);
const origins = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://127.0.0.1:4174",
  "http://localhost:4174",
]);
export function assessQuality(
  id,
  variant,
  m,
  expected = m?.expected,
  reports = [],
  baseline = null,
) {
  const finite = (key) => Number.isFinite(m?.[key]) && m[key] >= 0;
  const shape =
    id === "48"
      ? ["width", "gridOverflow", "panelOverflow", "rootOverflow"].every(
          finite,
        ) &&
        ["filterWorked", "cartWorked", "imageLoaded"].every(
          (k) => typeof m?.[k] === "boolean",
        )
      : id === "49"
        ? variant === 0
          ? finite("violations") && typeof m?.offerReady === "boolean"
          : typeof m?.profileAccepted === "boolean"
        : id === "52"
          ? ["number", "string"].includes(m?.priceType) &&
            typeof m?.stockMissing === "boolean" &&
            typeof m?.cartWorked === "boolean" &&
            finite("actualTotal")
          : typeof m?.manualChecked === "boolean";
  const valid = Boolean(
    shape &&
      m &&
      m.visible === true &&
      Number.isFinite(m.duration) &&
      m.duration >= 0 &&
      m.duration < 1800000 &&
      m.checksum === expected &&
      m.expected === expected &&
      Number.isInteger(expected) &&
      expected > 0,
  );
  let healthy = false,
    fault = false;
  const allCategories = (r) =>
    ["performance", "accessibility", "best-practices", "seo"].every((c) =>
      Number.isFinite(r.categories[c]),
    );
  const r = reports.at(-1);
  if (id === "45" && r) {
    healthy =
      variant === 0
        ? r.formFactor === "mobile" && allCategories(r)
        : r.formFactor === "desktop" && allCategories(r);
    fault = variant === 0 ? r.formFactor === "desktop" : !allCategories(r);
  }
  if (id === "46" && r) {
    const score = variant === 0 ? r.buttonName : r.description;
    fault = score === 0;
    healthy = score === 1 && m.manualChecked === true;
  }
  if (id === "47" && reports.length === 3) {
    const values = reports.map((x) => (variant === 0 ? x.lcp : x.tbt));
    const mid = median(values);
    const consistent =
      reports.every((x) => x.condition === reports[0].condition) &&
      values.every((x) => Number.isFinite(x));
    fault = consistent && mid > (variant === 0 ? 400 : 100);
    healthy =
      consistent &&
      baseline &&
      baseline.condition === reports[0].condition &&
      mid <= baseline.median * 0.85 &&
      m.manualChecked === true;
  }
  if (id === "48") {
    const narrow = Number.isFinite(m.width) && m.width >= 280 && m.width <= 500;
    fault =
      narrow && (variant === 0 ? m.gridOverflow > 2 : m.panelOverflow > 2);
    healthy =
      narrow &&
      m.gridOverflow <= 1 &&
      m.panelOverflow <= 1 &&
      m.rootOverflow <= 1 &&
      m.filterWorked === true &&
      m.cartWorked === true &&
      m.imageLoaded === true;
  }
  if (id === "49") {
    fault =
      variant === 0
        ? m.violations >= 1 && m.offerReady === false
        : m.profileAccepted === false;
    healthy =
      variant === 0
        ? m.violations === 0 && m.offerReady === true
        : m.profileAccepted === true;
  }
  if (id === "52") {
    fault =
      variant === 0
        ? m.priceType === "string" && m.cartWorked === false
        : m.stockMissing === true && m.cartWorked === false;
    healthy =
      m.priceType === "number" &&
      m.stockMissing === false &&
      m.cartWorked === true &&
      m.actualTotal === expected;
  }
  return { valid, healthy: Boolean(healthy), fault: Boolean(fault) };
}
export function createQualityHandler({
  ttl = 30 * 60_000,
  variantForChallenge = () => randomInt(2),
  chapterLesson = () => ["46", "47"][randomInt(2)],
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
    const control = url.pathname.startsWith("/api/quality/"),
      match = url.pathname.match(/^\/quality\/([\w-]+)\/(.*)$/),
      asset = url.pathname.match(
        /^\/lab\/quality\/(runtime.js|style.css|report.js|product.css)$/,
      );
    if (!control && !match && !asset) return false;
    const origin = request.headers.origin;
    if (origin && !origins.has(origin)) {
      json({ error: "不允许此来源操作质量实验" }, 403);
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
          new URL("../public/lab/quality/" + asset[1], import.meta.url),
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
        ["/api/quality/sessions", "/api/quality/chapter"].includes(
          url.pathname,
        ) &&
        request.method === "POST"
      ) {
        const chapter = url.pathname.endsWith("/chapter");
        if (chapter) {
          if (input.chapter !== "lighthouse") {
            json({ error: "质量章末类型无效" }, 400);
            return true;
          }
          input.lesson = chapterLesson();
          input.mode = "challenge";
        }
        if (
          !qualityIds.includes(input.lesson) ||
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
            ...(chapter ? { chapter: "lighthouse" } : { lesson: s.lesson }),
            expiresAt: new Date(Date.now() + ttl).toISOString(),
          },
          201,
        );
        return true;
      }
      const s = session(input.token);
      if (!s) {
        json({ error: "质量会话已过期或服务重启，请重新准备" }, 404);
        return true;
      }
      if (url.pathname === "/api/quality/lesson") {
        const run = s.runs.get(input.runId);
        json({
          ...book.find((x) => x.id === s.lesson),
          token: s.token,
          expiresAt: new Date(s.created + ttl).toISOString(),
          chapter: s.chapter ? "lighthouse" : null,
          mode: s.mode,
          sku: s.sku,
          quantity: s.quantity,
          seed: s.seed,
          baselineAudit: s.baselineAudit || null,
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
      if (url.pathname === "/api/quality/audit" && request.method === "POST") {
        const run = s.runs.get(input.runId),
          r = input.report;
        let correctURL = false;
        try {
          const u = new URL(r?.url);
          correctURL =
            ["127.0.0.1", "localhost"].includes(u.hostname) &&
            u.host === request.headers.host &&
            u.pathname === "/quality/" + s.token + "/audit/" &&
            u.searchParams.get("run") === run?.id;
        } catch {}
        if (
          !run ||
          s.currentRun !== run.id ||
          !run.visited ||
          run.reported ||
          run.reports.length >= 3 ||
          !["45", "46", "47"].includes(s.lesson) ||
          !r ||
          !correctURL ||
          typeof r.version !== "string" ||
          r.version.length > 40 ||
          typeof r.condition !== "string" ||
          r.condition.length > 4000 ||
          !["mobile", "desktop"].includes(r.formFactor) ||
          !r.categories ||
          typeof r.categories !== "object" ||
          Array.isArray(r.categories) ||
          !Object.keys(r.categories).length ||
          Object.entries(r.categories).some(
            ([k, v]) =>
              ![
                "performance",
                "accessibility",
                "best-practices",
                "seo",
              ].includes(k) ||
              (v !== null && (!Number.isFinite(v) || v < 0 || v > 1)),
          ) ||
          ["buttonName", "description"].some(
            (k) => r[k] !== null && ![0, 1].includes(r[k]),
          ) ||
          ["lcp", "tbt"].some(
            (k) =>
              r[k] !== null &&
              (!Number.isFinite(r[k]) || r[k] < 0 || r[k] > 600000),
          ) ||
          !Number.isFinite(Date.parse(r.fetchTime)) ||
          Date.parse(r.fetchTime) < run.created - 5000 ||
          Date.parse(r.fetchTime) > Date.now() + 300000 ||
          run.reports.some((x) => x.fetchTime === r.fetchTime)
        ) {
          json({ error: "报告不属于本轮、重复、过期或字段无效" }, 400);
          return true;
        }
        run.reports.push({
          url: r.url,
          version: r.version,
          fetchTime: r.fetchTime,
          condition: r.condition,
          formFactor: r.formFactor,
          categories: r.categories,
          buttonName: r.buttonName,
          description: r.description,
          lcp: r.lcp,
          tbt: r.tbt,
        });
        json({
          accepted: true,
          count: run.reports.length,
          required: s.lesson === "47" ? 3 : 1,
        });
        return true;
      }
      if (url.pathname === "/api/quality/begin" && request.method === "POST") {
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
            : input.correction === "manual" && s.lesson === "52"
              ? "manual"
              : "",
          good:
            input.phase === "fixed" &&
            input.correction === (s.variant === 0 ? "a" : "b"),
          visited: false,
          reported: false,
          created: Date.now(),
          reports: [],
          resources: [],
        });
        s.currentRun = id;
        json({ runId: id, phase: input.phase });
        return true;
      }
      if (url.pathname === "/api/quality/report" && request.method === "POST") {
        const run = s.runs.get(input.runId),
          m = input.metrics;
        if (
          !run ||
          s.currentRun !== run.id ||
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
        const result = assessQuality(
          s.lesson,
          s.variant,
          m,
          s.seed * s.quantity,
          run.reports,
          s.baselineAudit,
        );
        if (!result.valid) {
          json({ error: "结果或可见性不符合实验条件，请检查环境后重跑" }, 400);
          return true;
        }
        const passed = run.phase === "baseline" ? result.fault : result.healthy;
        run.reported = true;
        run.metrics = m;
        if (passed) {
          s[run.phase] = true;
          if (s.lesson === "47" && run.phase === "baseline")
            s.baselineAudit = {
              condition: run.reports[0].condition,
              median: median(
                run.reports.map((r) => (s.variant === 0 ? r.lcp : r.tbt)),
              ),
            };
        }
        json({
          passed,
          phase: run.phase,
          checks: [
            { label: "实验输入校验值一致", passed: result.valid },
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
      if (url.pathname === "/api/quality/grade" && request.method === "POST") {
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
            "关联本次真实报告、元素、响应与业务结果；固定条件复测并说明检查边界。",
          boundary:
            "服务检查实验访问、导入摘要与页面报告；可被主动修改，不证明原生面板操作，不是全面质量认证。",
        });
        return true;
      }
      json({ error: "未知质量接口" }, 404);
      return true;
    }
    const task = match[2],
      cookieName = "quality_" + match[1].replaceAll("-", "");
    if (task === "cleanup") {
      response.setHeader(
        "Set-Cookie",
        cookieName +
          "=; Path=/quality/" +
          match[1] +
          "/; Max-Age=0; SameSite=Lax",
      );
      json({ cleaned: true });
      return true;
    }
    const s = session(match[1]);
    if (!s) {
      json(
        { error: "质量会话已过期，请回课程重新准备；本页任务在离页时自动停止" },
        404,
      );
      return true;
    }
    const run = s.runs.get(url.searchParams.get("run") || s.currentRun);
    if (task === "" || task === "index.html") {
      s.visited = true;
      if (s.lesson === "49")
        response.setHeader(
          "Content-Security-Policy",
          "script-src 'self'; object-src 'none'; base-uri 'self'",
        );
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(
        await readFile(
          new URL("../public/lab/quality/index.html", import.meta.url),
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
    if (
      await serveQualityResource({
        s,
        run,
        task,
        url,
        request,
        response,
        json,
        cookieName,
      })
    )
      return true;
    json({ error: "质量资源不存在" }, 404);
    return true;
  };
}
