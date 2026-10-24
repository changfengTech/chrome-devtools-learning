import { randomUUID, randomInt } from "node:crypto";
import { readFileSync } from "node:fs";
const book = JSON.parse(
  readFileSync(
    new URL("../src/data/foundations.json", import.meta.url),
    "utf8",
  ),
);

export const foundationIds = Array.from({ length: 18 }, (_, index) =>
  String(index + 1).padStart(2, "0"),
);
export function createFoundationHandler({
  sessions = new Map(),
  ttl = 30 * 60_000,
  variantForChallenge = () => randomInt(2),
} = {}) {
  function get(id) {
    const session = sessions.get(id);
    if (!session || Date.now() - session.created > ttl) {
      sessions.delete(id);
      return null;
    }
    return session;
  }
  return async function handle({ request, response, url, json, bodyJson }) {
    if (!url.pathname.startsWith("/api/foundations/")) return false;
    if (
      url.pathname === "/api/foundations/sessions" &&
      request.method === "POST"
    ) {
      const data = await bodyJson(request);
      if (
        !foundationIds.includes(data.lesson) ||
        !["practice", "challenge"].includes(data.mode)
      ) {
        json({ error: "课程或实验模式无效" }, 400);
        return true;
      }
      for (const [id, item] of sessions)
        if (Date.now() - item.created > ttl) sessions.delete(id);
      if (sessions.size >= 500) {
        json({ error: "实验过多，请稍后重试" }, 429);
        return true;
      }
      const token = randomUUID();
      const session = {
        lesson: data.lesson,
        mode: data.mode,
        variant: data.mode === "practice" ? 0 : variantForChallenge(),
        seed: data.mode === "practice" ? 42 : randomInt(101, 9999),
        created: Date.now(),
        runs: new Map(),
        baseline: false,
        fixed: false,
        traces: 0,
      };
      sessions.set(token, session);
      json(
        {
          token,
          lesson: data.lesson,
          mode: data.mode,
          expiresAt: new Date(session.created + ttl).toISOString(),
        },
        201,
      );
      return true;
    }
    const input =
      request.method === "POST"
        ? await bodyJson(request)
        : Object.fromEntries(url.searchParams);
    const session = get(input.token);
    if (!session) {
      json({ error: "实验已过期或服务重启，请返回课程重新准备实验。" }, 404);
      return true;
    }
    if (
      url.pathname === "/api/foundations/lesson" &&
      request.method === "GET"
    ) {
      json({
        ...book.find((item) => item.id === session.lesson),
        mode: session.mode,
      });
      return true;
    }
    if (url.pathname === "/api/foundations/data" && request.method === "GET") {
      if (!["baseline", "fixed"].includes(input.phase)) {
        json({ error: "无效实验阶段" }, 400);
        return true;
      }
      if (session.runs.size >= 150) {
        json({ error: "本次实验次数已满，请重新准备实验。" }, 429);
        return true;
      }
      const runId = randomUUID();
      const run = { phase: input.phase, delivered: false, observed: false };
      session.runs.set(runId, run);
      if (
        session.lesson === "03" &&
        input.phase === "baseline" &&
        session.variant === 0
      )
        await new Promise((resolve) => setTimeout(resolve, 450));
      if (response.destroyed) return true;
      response.setHeader(
        "X-Lab-Condition",
        session.lesson === "03" && input.phase === "baseline"
          ? session.variant === 0
            ? "extra-latency"
            : "quantity-changed"
          : "baseline-conditions",
      );
      response.once("finish", () => {
        run.delivered = true;
      });
      const price = 20 + (session.seed % 5) * 7;
      json({
        runId,
        lesson: session.lesson,
        mode: session.mode,
        variant: session.variant,
        seed: session.seed,
        price,
        baselineQuantity: 2 + (session.seed % 3),
        quantity:
          2 +
          (session.seed % 3) +
          (session.lesson === "03" &&
          session.variant === 1 &&
          input.phase === "baseline"
            ? 1
            : 0),
        discount: 5 + (session.seed % 5),
        sku: `GOOD-${session.seed}`,
        name: `晨间陶瓷杯 ${session.seed % 97}`,
        phase: input.phase,
      });
      return true;
    }
    if (url.pathname === "/api/foundations/trace" && request.method === "GET") {
      session.traces += 1;
      json({ ok: true, sequence: session.traces, lesson: session.lesson });
      return true;
    }
    if (
      url.pathname === "/api/foundations/observe" &&
      request.method === "POST"
    ) {
      const run = session.runs.get(input.runId);
      const checks = input.checks;
      if (
        !run?.delivered ||
        run.observed ||
        !Array.isArray(checks) ||
        checks.length < 1 ||
        checks.length > 12 ||
        checks.some(
          (check) =>
            typeof check?.passed !== "boolean" ||
            typeof check?.name !== "string" ||
            check.name.length > 100,
        )
      ) {
        json({ error: "观察记录缺少已完成请求、重复提交或格式不正确。" }, 400);
        return true;
      }
      run.observed = true;
      const passed = checks.every((check) => check.passed);
      if (passed) session[run.phase] = true;
      json({
        accepted: true,
        passed,
        phase: run.phase,
        baseline: session.baseline,
        fixed: session.fixed,
        boundary:
          "这里检查实验页报告的 DOM、计算或请求结果，不读取 DevTools 操作。",
      });
      return true;
    }
    if (
      url.pathname === "/api/foundations/grade" &&
      request.method === "POST"
    ) {
      const expected = session.variant === 0 ? "a" : "b";
      const checks = [
        { label: "完成本案例的实际故障与观察", passed: session.baseline },
        { label: "诊断符合本案例", passed: input.diagnosis === expected },
        { label: "证据与实际故障一致", passed: input.evidence === expected },
        {
          label: "验证方案针对本案例",
          passed: input.verification === expected,
        },
        { label: "页面修复检查与对照已完成", passed: session.fixed },
      ];
      const passed = checks.every((item) => item.passed);
      json({
        passed,
        checks,
        explanation: `本案例对应第 ${session.lesson} 课的第${session.variant === 0 ? "一" : "二"}种故障。请将所选原因、证据和修复与实际节点、变量、日志或调用对应。`,
        expectedChoice: expected,
        boundary:
          "自动检查验证本地请求、实验页结果与结构化判断；它不能证明你操作过某个 DevTools 控件。自由笔记用于自查。",
      });
      return true;
    }
    json({ error: "未知基础课接口或方法" }, 404);
    return true;
  };
}
