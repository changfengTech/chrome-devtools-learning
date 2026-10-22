import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { randomUUID, randomInt } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createFoundationHandler, foundationIds } from "./foundations.mjs";
import { createNetworkState, networkStateIds } from "./network-state.mjs";
import { createPerformanceHandler, performanceIds } from "./performance.mjs";

import { createMemoryHandler, memoryIds } from "./memory.mjs";

import { createQualityHandler, qualityIds } from "./quality.mjs";

const publicDirectory = fileURLToPath(new URL("../public/", import.meta.url));
const origins = new Set([
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:4174",
  "http://localhost:4174",
]);
const products = [
  {
    id: 1,
    name: "日常帆布袋",
    category: "随身",
    price: 89,
    shape: "bag",
    color: "#e9e2d7",
  },
  {
    id: 2,
    name: "晨间陶瓷杯",
    category: "桌面",
    price: 68,
    shape: "cup",
    color: "#dae7ec",
  },
  {
    id: 3,
    name: "点点台灯",
    category: "居家",
    price: 169,
    shape: "lamp",
    color: "#e5e3ee",
  },
];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function bodyJson(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 8192) throw new Error("请求内容过长");
  }
  return JSON.parse(body || "{}");
}

export function createLabServer({
  waitingMs = 1200,
  chunkMs = 145,
  fixedMs = 45,
  challengeTtl = 30 * 60_000,
  foundationOptions = {},
  networkOptions = {},
  performanceOptions = {},
  memoryOptions = {},
  qualityOptions = {},
} = {}) {
  const challenges = new Map();
  const foundations = createFoundationHandler(foundationOptions);
  const field = createNetworkState(networkOptions);
  const performanceLab = createPerformanceHandler(performanceOptions);
  const memoryLab = createMemoryHandler(memoryOptions);
  const qualityLab = createQualityHandler(qualityOptions);
  function session(id) {
    const entry = challenges.get(id);
    if (!entry || Date.now() - entry.created > challengeTtl) {
      challenges.delete(id);
      return null;
    }
    return entry;
  }
  const server = createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const origin = request.headers.origin;
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    if (origin && origins.has(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.setHeader("Access-Control-Allow-Headers", "Content-Type");
    }
    const json = (data, status = 200) => {
      response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
      });
      response.end(JSON.stringify(data));
    };
    try {
      if (await qualityLab({ request, response, url, json, bodyJson })) return;
      if (await memoryLab({ request, response, url, json, bodyJson })) return;
      if (await performanceLab({ request, response, url, json, bodyJson }))
        return;
      if (await field.handle({ request, response, url, json, bodyJson }))
        return;
      if (request.method === "OPTIONS") {
        response.writeHead(origins.has(origin) ? 204 : 403);
        response.end();
        return;
      }
      if (origin && !origins.has(origin) && request.method === "POST") {
        json({ error: "不允许此来源操作实验" }, 403);
        return;
      }
      if (url.pathname === "/health") {
        json({
          ok: true,
          lesson: "21",
          lessons: [
            ...foundationIds,
            "21",
            ...networkStateIds,
            ...performanceIds,
            ...memoryIds,
            ...qualityIds,
          ].sort(),
          version: 6,
        });
        return;
      }
      if (await foundations({ request, response, url, json, bodyJson })) return;
      if (url.pathname === "/api/challenges" && request.method === "POST") {
        for (const [id, entry] of challenges)
          if (Date.now() - entry.created > challengeTtl) challenges.delete(id);
        if (challenges.size >= 500) {
          json({ error: "实验会话过多，请稍后重试" }, 429);
          return;
        }
        const id = randomUUID();
        challenges.set(id, {
          kind: randomInt(2) ? "waiting" : "download",
          created: Date.now(),
          baseline: 0,
          fixed: 0,
        });
        json({ id, title: "商品列表加载较慢，请寻找主要耗时阶段。" }, 201);
        return;
      }
      if (
        url.pathname === "/api/challenges/grade" &&
        request.method === "POST"
      ) {
        const answer = await bodyJson(request);
        const entry = typeof answer.id === "string" ? session(answer.id) : null;
        if (!entry) {
          json({ error: "挑战已过期或不存在，请创建新挑战。" }, 404);
          return;
        }
        const waiting = entry.kind === "waiting";
        const checks = [
          { label: "已完成真实故障请求", passed: entry.baseline > 0 },
          {
            label: "诊断与实验主因一致",
            passed: answer.diagnosis === entry.kind,
          },
          {
            label: "选出了对应的时序证据",
            passed: answer.evidence === (waiting ? "ttfb" : "content"),
          },
          {
            label: "验证方案针对主要阶段",
            passed: answer.verification === (waiting ? "service" : "payload"),
          },
          { label: "已完成修复后的真实对照", passed: entry.fixed > 0 },
        ];
        json({
          passed: checks.every((check) => check.passed),
          checks,
          explanation: waiting
            ? "本例在人为等待后才发送响应头。应比较 Waiting (TTFB)，减少实验服务等待后复测。真实项目仍需区分往返延迟、服务处理等原因。"
            : "本例尽早发送响应头，再分块传输较大响应体。应比较 Content Download，减少实验响应体与传输间隔后复测。真实项目还需检查带宽与资源大小。",
          boundary:
            "自动检查验证了服务请求完成、对照运行和选择题，不能读取你在 DevTools 中的点击，也不评价自由笔记。",
        });
        return;
      }
      if (url.pathname === "/api/products" && request.method === "GET") {
        const scenario = url.searchParams.get("scenario") || "waiting";
        const entry =
          scenario === "challenge"
            ? session(url.searchParams.get("token"))
            : null;
        if (scenario === "challenge" && !entry) {
          json({ error: "挑战已过期，请返回教程重新创建。" }, 404);
          return;
        }
        if (!["waiting", "download", "challenge"].includes(scenario)) {
          json({ error: "未知实验场景" }, 400);
          return;
        }
        const kind = entry?.kind || scenario;
        const fixed = url.searchParams.get("fixed") === "1";
        response.once("finish", () => {
          if (entry) entry[fixed ? "fixed" : "baseline"] += 1;
        });
        const payload = JSON.stringify({
          products,
          padding:
            kind === "download" && !fixed ? "sample-data-".repeat(36000) : "",
        });
        await wait(kind === "waiting" && !fixed ? waitingMs : fixedMs);
        if (response.destroyed) return;
        response.writeHead(200, {
          "Content-Type": "application/json; charset=utf-8",
        });
        if (kind === "download" && !fixed) {
          response.flushHeaders();
          const size = Math.ceil(payload.length / 8);
          for (let offset = 0; offset < payload.length; offset += size) {
            await wait(chunkMs);
            if (response.destroyed) return;
            response.write(payload.slice(offset, offset + size));
          }
          response.end();
        } else response.end(payload);
        return;
      }
      if (url.pathname.startsWith("/api/")) {
        json({ error: "未知接口或方法" }, 404);
        return;
      }
      if (request.method !== "GET" && request.method !== "HEAD") {
        json({ error: "不支持的请求方法" }, 405);
        return;
      }
      const files = {
        "/": "lab/shop.html",
        "/shop/": "lab/shop.html",
        "/shop": "lab/shop.html",
        "/lab/shop.js": "lab/shop.js",
        "/lab/shop.css": "lab/shop.css",
        "/favicon.svg": "favicon.svg",
        "/foundations/": "lab/foundation/index.html",
        "/lab/foundation/runtime.js": "lab/foundation/runtime.js",
        "/lab/foundation/style.css": "lab/foundation/style.css",
        "/lab/foundation/frame.html": "lab/foundation/frame.html",
        "/lab/foundation/frame.js": "lab/foundation/frame.js",
        "/lab/foundation/cart-compiled.js": "lab/foundation/cart-compiled.js",
        "/lab/foundation/cart-compiled.js.map":
          "lab/foundation/cart-compiled.js.map",
        "/lab/foundation/shop-cart.ts": "lab/foundation/shop-cart.ts",
      };
      const filename = files[url.pathname];
      if (!filename) {
        json({ error: "资源不存在" }, 404);
        return;
      }
      const content = await readFile(path.join(publicDirectory, filename));
      const type = filename.endsWith(".map")
        ? "application/json"
        : filename.endsWith(".ts")
          ? "text/plain"
          : filename.endsWith(".html")
            ? "text/html"
            : filename.endsWith(".js")
              ? "text/javascript"
              : filename.endsWith(".svg")
                ? "image/svg+xml"
                : "text/css";
      response.writeHead(200, { "Content-Type": `${type}; charset=utf-8` });
      response.end(request.method === "HEAD" ? undefined : content);
    } catch (error) {
      if (!response.headersSent)
        json(
          {
            error:
              error instanceof SyntaxError
                ? "请求 JSON 格式不正确"
                : "实验服务处理失败",
          },
          400,
        );
      else response.end();
    }
  });
  field.attach(server);
  const companion = createServer(async (request, response) => {
    const url = new URL(request.url || "/", "http://127.0.0.1");
    const json = (data, status = 200) => {
      response.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      });
      response.end(JSON.stringify(data));
    };
    try {
      if (await field.handle({ request, response, url, json, bodyJson }))
        return;
      json({ error: "跨源实验资源不存在" }, 404);
    } catch {
      if (!response.headersSent) json({ error: "跨源实验请求格式错误" }, 400);
      else response.end();
    }
  });
  server.companion = companion;
  server.on("close", () => {
    if (companion.listening) {
      companion.close();
      companion.closeAllConnections();
    }
  });
  return server;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const port = Number(process.env.LAB_PORT || 4174);
  const server = createLabServer();
  server.on("error", (error) => {
    console.error(`实验服务启动失败：${error.message}`);
    process.exitCode = 1;
  });
  server.companion.on("error", (error) => {
    console.error(`跨源服务启动失败：${error.message}`);
    server.close();
    process.exitCode = 1;
  });
  server.on("error", () => {
    server.companion.close();
  });
  server.companion.listen(
    Number(process.env.CORS_PORT || 4175),
    "127.0.0.1",
    () => console.log("跨源实验：http://127.0.0.1:4175/"),
  );
  server.listen(port, "127.0.0.1", () =>
    console.log(`商城实验：http://127.0.0.1:${port}/shop/`),
  );
}
