import { randomUUID, randomInt } from "node:crypto";
import { readFile } from "node:fs/promises";
import { WebSocketServer } from "ws";
const book = JSON.parse(
  await readFile(
    new URL("../src/data/network-state.json", import.meta.url),
    "utf8",
  ),
);
export const networkStateIds = book.map((item) => item.id);
const allowedOrigins = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://127.0.0.1:4174",
  "http://localhost:4174",
  "http://127.0.0.1:4175",
]);
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const svg = (label = "日常好物") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" rx="36" fill="#e8efeb"/><path d="M75 75h95v66a44 44 0 0 1-88 0V75m88 8h13a25 25 0 0 1 0 50h-13" fill="#fff" stroke="#567669" stroke-width="6"/><text x="128" y="216" text-anchor="middle" font-size="20" fill="#355447">${label}</text></svg>`;
export function createNetworkState({
  ttl = 30 * 60_000,
  variantForChallenge = () => randomInt(2),
  delayMs = 350,
} = {}) {
  const sessions = new Map();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });
  const session = (token) => {
    const s = sessions.get(token);
    if (!s || Date.now() - s.created > ttl) {
      sessions.delete(token);
      return null;
    }
    return s;
  };
  const record = (run, task, status, method = "GET") => {
    if (run && run.events.length < 200)
      run.events.push({
        task,
        status,
        method,
        at: Math.round(performance.now() - run.started),
      });
  };
  function attach(server) {
    server.on("upgrade", (req, socket, head) => {
      const url = new URL(req.url, "http://127.0.0.1"),
        match = url.pathname.match(/^\/labs\/([\w-]+)\/socket$/),
        s = match && session(match[1]),
        run = s?.runs.get(url.searchParams.get("run"));
      if (
        !run ||
        s.lesson !== "26" ||
        (req.headers.origin && !allowedOrigins.has(req.headers.origin))
      ) {
        socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        record(run, "socket", 101);
        let tick = 0;
        const timer = setInterval(() => {
          if (ws.readyState !== 1) return;
          ws.send(
            JSON.stringify({
              type: "inventory",
              sku: s.sku,
              stock: ++tick + 1,
              sequence: tick,
            }),
          );
          if (tick === 2) {
            clearInterval(timer);
            ws.close(1000, "本次教学消息完成");
          }
        }, 70);
        ws.on("error", () => {});
        ws.on("close", () => clearInterval(timer));
      });
    });
    server.on("close", () => {
      for (const ws of wss.clients) ws.terminate();
    });
  }
  async function handle({ request, response, url, json, bodyJson }) {
    const control = url.pathname.startsWith("/api/network-state/"),
      match = url.pathname.match(/^\/labs\/([\w-]+)\/(.*)$/);
    if (!control && !match && !url.pathname.startsWith("/lab/network-state/"))
      return false;
    const origin = request.headers.origin;
    if (
      origin &&
      !allowedOrigins.has(origin) &&
      ["POST", "OPTIONS"].includes(request.method)
    ) {
      json({ error: "不允许此来源操作实验" }, 403);
      return true;
    }
    if (control) {
      if (origin && !allowedOrigins.has(origin)) {
        json({ error: "不允许此来源操作实验" }, 403);
        return true;
      }
      if (origin) {
        response.setHeader("Access-Control-Allow-Origin", origin);
        response.setHeader("Vary", "Origin");
        response.setHeader(
          "Access-Control-Allow-Methods",
          "GET, POST, OPTIONS",
        );
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");
      }
      if (request.method === "OPTIONS") {
        response.writeHead(204);
        response.end();
        return true;
      }
      const input =
        request.method === "POST"
          ? await bodyJson(request)
          : Object.fromEntries(url.searchParams);
      if (
        ["/api/network-state/sessions", "/api/network-state/chapter"].includes(
          url.pathname,
        ) &&
        request.method === "POST"
      ) {
        const chapter = url.pathname.endsWith("/chapter")
          ? input.chapter
          : null;
        if (chapter) {
          if (!["network", "application"].includes(chapter)) {
            json({ error: "章末类型无效" }, 400);
            return true;
          }
          const pool = networkStateIds.filter((id) =>
            chapter === "network" ? Number(id) < 30 : Number(id) > 30,
          );
          input.lesson = pool[randomInt(pool.length)];
          input.mode = "challenge";
        } else if (url.pathname.endsWith("/chapter")) {
          json({ error: "需要选择章节" }, 400);
          return true;
        }
        if (
          !networkStateIds.includes(input.lesson) ||
          !["practice", "challenge"].includes(input.mode)
        ) {
          json({ error: "课程或模式无效" }, 400);
          return true;
        }
        for (const [key, s] of sessions)
          if (Date.now() - s.created > ttl) sessions.delete(key);
        if (sessions.size >= 500) {
          json({ error: "实验过多，请清理或等待过期" }, 429);
          return true;
        }
        const token = randomUUID(),
          seed = input.mode === "practice" ? 42 : randomInt(101, 9999);
        sessions.set(token, {
          token,
          lesson: input.lesson,
          mode: input.mode,
          created: Date.now(),
          chapter,
          variant: input.mode === "practice" ? 0 : variantForChallenge(),
          seed,
          sku: `CUP-${seed}`,
          price: 34 + (seed % 5),
          quantity: 2 + (seed % 3),
          runs: new Map(),
          baseline: false,
          fixed: false,
        });
        json(
          {
            token,
            ...(chapter ? { chapter } : { lesson: input.lesson }),
            mode: input.mode,
            expiresAt: new Date(Date.now() + ttl).toISOString(),
          },
          201,
        );
        return true;
      }
      const s = session(input.token);
      if (!s) {
        json({ error: "实验会话已过期或服务重启，请重新准备。" }, 404);
        return true;
      }
      if (url.pathname === "/api/network-state/lesson") {
        json({
          ...book.find((c) => c.id === s.lesson),
          mode: s.mode,
          chapter: s.chapter,
          token: s.token,
          sku: s.sku,
          price: s.price,
          quantity: s.quantity,
        });
        return true;
      }
      if (
        url.pathname === "/api/network-state/begin" &&
        request.method === "POST"
      ) {
        if (
          !["baseline", "fixed"].includes(input.phase) ||
          s.runs.size >= 100
        ) {
          json({ error: "阶段无效或次数已满，请重新准备。" }, 400);
          return true;
        }
        const runId = randomUUID(),
          good =
            input.phase === "fixed" &&
            input.correction === (s.variant === 0 ? "a" : "b");
        const run = {
          id: runId,
          phase: input.phase,
          good,
          events: [],
          started: performance.now(),
          observed: false,
          revision: 1,
          attempts: 0,
        };
        s.runs.set(runId, run);
        json({
          runId,
          lesson: s.lesson,
          mode: s.mode,
          variant: s.variant,
          good,
          sku: s.sku,
          price: s.price,
          quantity: s.quantity,
          seed: s.seed,
          token: s.token,
          phase: input.phase,
        });
        return true;
      }
      const run = s.runs.get(input.runId);
      if (url.pathname === "/api/network-state/log" && run) {
        json({ events: run.events });
        return true;
      }
      if (
        url.pathname === "/api/network-state/report" &&
        request.method === "POST"
      ) {
        if (
          !run ||
          run.observed ||
          !run.events.some((e) => e.task === "probe") ||
          !Array.isArray(input.checks) ||
          !input.checks.length ||
          input.checks.length > 12 ||
          input.checks.some(
            (c) =>
              typeof c.passed !== "boolean" ||
              typeof c.name !== "string" ||
              c.name.length > 120,
          )
        ) {
          json({ error: "缺少已完成请求、检查格式错误或重复报告。" }, 400);
          return true;
        }
        run.observed = true;
        const passed = input.checks.every((c) => c.passed);
        if (passed) s[run.phase] = true;
        json({ passed, phase: run.phase });
        return true;
      }
      if (
        url.pathname === "/api/network-state/grade" &&
        request.method === "POST"
      ) {
        const expected = s.variant === 0 ? "a" : "b";
        const checks = [
          { label: "完成本会话的真实故障观察", passed: s.baseline },
          { label: "原因与案例对应", passed: input.diagnosis === expected },
          { label: "证据与案例对应", passed: input.evidence === expected },
          {
            label: "验证针对实际原因",
            passed: input.verification === expected,
          },
          { label: "本会话修复检查通过", passed: s.fixed },
        ];
        json({
          passed: checks.every((c) => c.passed),
          checks,
          expectedChoice: expected,
          explanation: "把原因、证据和复测与本次实际记录对应。",
          boundary:
            "服务校验会话与请求，页面检查来自实验页；不证明操作过 DevTools，不代替章末人工评分。",
        });
        return true;
      }
      json({ error: "未知接口或运行编号" }, 404);
      return true;
    }
    if (url.pathname.startsWith("/lab/network-state/")) {
      const files = {
        "/lab/network-state/runtime.js": "runtime.js",
        "/lab/network-state/style.css": "style.css",
      };
      const file = files[url.pathname];
      if (!file) {
        json({ error: "资源不存在" }, 404);
        return true;
      }
      response.setHeader(
        "Content-Type",
        file.endsWith(".js")
          ? "text/javascript; charset=utf-8"
          : "text/css; charset=utf-8",
      );
      response.end(
        await readFile(
          new URL(`../public/lab/network-state/${file}`, import.meta.url),
        ),
      );
      return true;
    }
    const s = session(match[1]),
      task = match[2],
      prefix = `/labs/${match[1]}/`;
    if (task === "" || task === "index.html") {
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(
        await readFile(
          new URL("../public/lab/network-state/index.html", import.meta.url),
        ),
      );
      return true;
    }
    // 过期实验仍可打开清理页；只删除 URL 所属的命名空间。
    if (task === "logout") {
      const name = `lab_${match[1].replaceAll("-", "")}`;
      response.setHeader("Set-Cookie", [
        `${name}=; Path=${prefix}account/; HttpOnly; Max-Age=0`,
        `${name}=; Path=${prefix}unrelated/; HttpOnly; Max-Age=0`,
      ]);
      json({ cleared: true });
      return true;
    }
    if (!s) {
      json({ error: "实验已过期，请返回课程重新准备；仍可清理本实验。" }, 404);
      return true;
    }
    const run = s.runs.get(url.searchParams.get("run"));
    if (task === "worker.js") {
      if (!["38", "39"].includes(s.lesson)) {
        json({ error: "本课没有 worker" }, 404);
        return true;
      }
      const template = await readFile(
        new URL("../public/lab/network-state/worker.js", import.meta.url),
        "utf8",
      );
      const config = {
        prefix,
        token: s.token,
        version: url.searchParams.get("build") === "2" ? 2 : 1,
        lesson: s.lesson,
        strategy: url.searchParams.get("strategy") || "cache-first",
        takeover: url.searchParams.get("takeover") === "1",
        cacheName: `devtools-${s.token}-products`,
      };
      response.setHeader("Content-Type", "text/javascript; charset=utf-8");
      response.end(`const CONFIG=${JSON.stringify(config)};\n${template}`);
      return true;
    }
    if (task === "controlled-version.json") {
      if (run) record(run, "controlled", 200);
      json({ workerVersion: 0, source: "network", sku: s.sku });
      return true;
    }
    if (task === "offline-product.json") {
      if (run) record(run, "offline-product", 200);
      json({ version: 2, price: s.price + 10, source: "network", sku: s.sku });
      return true;
    }
    if (task === "offline.html" || task === "offline-view/") {
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(
        task === "offline.html"
          ? '<html lang="zh-CN"><meta charset="utf-8"><title>离线副本</title><h1>当前为本会话离线副本</h1><p>资源来自独立 Cache Storage，恢复 Online 后返回课程。</p></html>'
          : '<html lang="zh-CN"><meta charset="utf-8"><title>在线对照</title><h1>当前为在线页面</h1><p>返回本会话商城启用 Offline 后，再打开离线页面验证。</p></html>',
      );
      return true;
    }
    if (!run) {
      json({ error: "缺少本会话运行编号" }, 400);
      return true;
    }
    const finished = (name, status = 200) =>
      response.once("finish", () => record(run, name, status, request.method));
    if (task === "remote") {
      response.removeHeader("Access-Control-Allow-Origin");
      response.removeHeader("Access-Control-Allow-Headers");
      const preflight = request.method === "OPTIONS",
        permit = run.good || s.variant === 1;
      if (preflight) {
        if (permit) {
          response.setHeader(
            "Access-Control-Allow-Origin",
            origin || "http://127.0.0.1:4174",
          );
          response.setHeader("Access-Control-Allow-Methods", "POST");
          response.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type, X-Shop-Token",
          );
          response.setHeader("Access-Control-Max-Age", "0");
        }
        finished("preflight", permit ? 204 : 403);
        response.writeHead(permit ? 204 : 403);
        response.end();
        return true;
      }
      if (request.method !== "POST") {
        json({ error: "需要 POST" }, 405);
        return true;
      }
      if (run.good)
        response.setHeader(
          "Access-Control-Allow-Origin",
          origin || "http://127.0.0.1:4174",
        );
      finished("remote");
      json({ ok: true, sku: s.sku, price: s.price });
      return true;
    }
    if (task === "probe") {
      finished("probe");
      json({ ok: true });
      return true;
    }
    if (task === "analytics") {
      finished("analytics", 204);
      response.writeHead(204);
      response.end();
      return true;
    }
    if (task === "search") {
      finished("search");
      const q = url.searchParams.get("q") || "";
      json({
        query: q,
        items:
          q === "cup"
            ? [{ sku: s.sku, name: "晨间陶瓷杯", price: s.price }]
            : [
                { sku: s.sku, name: "晨间陶瓷杯", price: s.price },
                { sku: "BAG", name: "帆布袋", price: 89 },
              ],
      });
      return true;
    }
    if (task === "checkout") {
      const payload = request.method === "POST" ? await bodyJson(request) : {};
      if (!Number.isInteger(payload.quantity)) {
        finished("checkout", 422);
        json(
          {
            ok: false,
            code: "INVALID_QUANTITY",
            expected: "quantity: integer",
          },
          422,
        );
        return true;
      }
      finished("checkout");
      json(
        s.variant === 1
          ? { ok: false, code: "OUT_OF_STOCK", order: null }
          : {
              ok: true,
              order: {
                sku: s.sku,
                quantity: payload.quantity,
                total: s.price * payload.quantity,
              },
            },
      );
      return true;
    }
    if (task === "recommendations") {
      await pause(delayMs);
      finished("recommendations");
      json({ items: ["BAG"] });
      return true;
    }
    if (task === "inventory") {
      finished("inventory");
      json({ stock: 3, sku: s.sku });
      return true;
    }
    if (task === "hero.svg") {
      finished("hero");
      response.setHeader("Content-Type", "image/svg+xml");
      response.end(svg());
      return true;
    }
    if (task === "price.json") {
      const current = s.variant === 1 && !run.good ? 1 : run.revision,
        etag = `"${s.token}-${current}"`;
      response.setHeader(
        "Cache-Control",
        s.variant === 0 && !run.good
          ? "private, max-age=600"
          : "private, no-cache",
      );
      response.setHeader("ETag", etag);
      const unchanged = request.headers["if-none-match"] === etag;
      finished("price", unchanged ? 304 : 200);
      if (unchanged) {
        response.writeHead(304);
        response.end();
      } else
        json({
          version: current,
          price: s.price + (current === 2 ? 10 : 0),
          sku: s.sku,
        });
      return true;
    }
    if (task === "publish" && request.method === "POST") {
      run.revision = 2;
      finished("publish");
      json({ published: 2 });
      return true;
    }
    if (task === "submit") {
      await pause(100);
      const retry = ++run.attempts > 1;
      finished("submit", retry ? 200 : 503);
      json(
        retry
          ? { ok: true, order: "LOCAL-ONLY" }
          : { ok: false, code: "TEMPORARY_UNAVAILABLE" },
        retry ? 200 : 503,
      );
      return true;
    }
    if (task === "asset.svg") {
      const good = run.good && s.lesson !== "25";
      finished("asset", good ? 200 : 404);
      if (!good) json({ error: "实验图片不可用" }, 404);
      else {
        response.setHeader("Content-Type", "image/svg+xml");
        response.end(svg());
      }
      return true;
    }
    if (task === "events") {
      response.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      });
      response.flushHeaders();
      let tick = 0;
      const timer = setInterval(() => {
        if (response.destroyed) {
          clearInterval(timer);
          return;
        }
        response.write(
          `event: inventory\nid: ${++tick}\ndata: ${JSON.stringify({ sku: s.sku, stock: tick + 1 })}\n\n`,
        );
        if (tick === 2) {
          clearInterval(timer);
          response.end();
        }
      }, 70);
      response.once("close", () => clearInterval(timer));
      finished("events");
      return true;
    }
    if (task === "login") {
      const name = `lab_${s.token.replaceAll("-", "")}`,
        path = run.good
          ? prefix + "account/"
          : s.variant === 0
            ? prefix + "unrelated/"
            : prefix + "account/";
      response.setHeader(
        "Set-Cookie",
        `${name}=active; Path=${path}; HttpOnly; SameSite=Lax; Max-Age=${!run.good && s.variant === 1 ? 0 : 3600}`,
      );
      finished("login");
      json({ set: true });
      return true;
    }
    if (task === "account/profile") {
      finished("profile");
      json({
        authenticated: (request.headers.cookie || "")
          .split(";")
          .some(
            (c) => c.trim() === `lab_${s.token.replaceAll("-", "")}=active`,
          ),
      });
      return true;
    }
    if (task === "manifest.webmanifest") {
      finished("manifest");
      response.setHeader("Content-Type", "application/manifest+json");
      response.end(
        JSON.stringify({
          id: prefix,
          name: "日常好物实验",
          short_name: "好物",
          start_url: prefix,
          scope: prefix,
          display: "standalone",
          icons: [
            {
              src: `${prefix}${!run.good && s.variant === 1 ? "missing-icon.svg" : "icon.svg"}?run=${run.id}`,
              sizes: "any",
              type: "image/svg+xml",
            },
          ],
        }),
      );
      return true;
    }
    if (task === "icon.svg") {
      finished("icon");
      response.setHeader("Content-Type", "image/svg+xml");
      response.end(svg("好物"));
      return true;
    }
    if (task === "missing-icon.svg") {
      finished("icon", 404);
      json({ error: "Manifest 图标不存在" }, 404);
      return true;
    }
    json({ error: "未知实验资源" }, 404);
    return true;
  }
  return { handle, attach };
}
