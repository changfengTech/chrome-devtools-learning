import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createLabServer } from "../server/lab.mjs";

async function fixture(t, options = {}) {
  const server = createLabServer({
    waitingMs: 130,
    chunkMs: 20,
    fixedMs: 3,
    ...options,
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  return `http://127.0.0.1:${server.address().port}`;
}
async function timed(url) {
  const start = performance.now();
  const response = await fetch(url);
  const headers = performance.now() - start;
  const data = await response.json();
  return {
    response,
    data,
    headers,
    transfer: performance.now() - start - headers,
  };
}
test("故障实际发生在响应头前或响应主体中，修复改变对应阶段", async (t) => {
  const base = await fixture(t);
  for (let cycle = 0; cycle < 3; cycle++) {
    const waiting = await timed(`${base}/api/products?scenario=waiting`);
    const download = await timed(`${base}/api/products?scenario=download`);
    const fixed = await timed(`${base}/api/products?scenario=download&fixed=1`);
    const waitingFixed = await timed(
      `${base}/api/products?scenario=waiting&fixed=1`,
    );
    assert.ok(waiting.headers >= 110, `waiting headers ${waiting.headers}`);
    assert.ok(download.transfer >= 130, `download body ${download.transfer}`);
    assert.ok(waiting.headers > download.headers);
    assert.ok(download.data.padding.length > fixed.data.padding.length);
    assert.ok(download.transfer > fixed.transfer);
    assert.equal(waiting.response.headers.get("cache-control"), "no-store");
    assert.equal(waiting.data.products.length, 3);
    assert.ok(waiting.headers > waitingFixed.headers);
  }
});
test("没有真实故障和修复请求，选择正确答案也不能通过挑战", async (t) => {
  const base = await fixture(t);
  const post = async (path, body) =>
    (
      await fetch(base + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
    ).json();
  const session = await post("/api/challenges", {});
  assert.deepEqual(Object.keys(session).sort(), ["id", "title"]);
  const waitingAnswer = {
    id: session.id,
    diagnosis: "waiting",
    evidence: "ttfb",
    verification: "service",
  };
  const before = await post("/api/challenges/grade", waitingAnswer);
  assert.equal(before.passed, false);
  assert.equal(before.checks[0].passed, false);
  assert.equal(before.checks[4].passed, false);
  await timed(`${base}/api/products?scenario=challenge&token=${session.id}`);
  const noFix = await post("/api/challenges/grade", waitingAnswer);
  assert.equal(noFix.passed, false);
  await timed(
    `${base}/api/products?scenario=challenge&token=${session.id}&fixed=1`,
  );
  const first = await post("/api/challenges/grade", waitingAnswer);
  const correct = first.checks[1].passed
    ? first
    : await post("/api/challenges/grade", {
        id: session.id,
        diagnosis: "download",
        evidence: "content",
        verification: "payload",
      });
  assert.equal(correct.passed, true);
  const wrongEvidence = await post("/api/challenges/grade", {
    id: session.id,
    diagnosis: "waiting",
    evidence: "invalid",
    verification: "service",
  });
  assert.equal(wrongEvidence.passed, false);
});
test("未知场景、过期挑战、无效 JSON 与外部来源得到明确错误", async (t) => {
  const base = await fixture(t, { challengeTtl: -1 });
  assert.equal(
    (await fetch(`${base}/api/products?scenario=unknown`)).status,
    400,
  );
  assert.equal(
    (await fetch(`${base}/api/products?scenario=challenge&token=missing`))
      .status,
    404,
  );
  const created = await (
    await fetch(`${base}/api/challenges`, { method: "POST" })
  ).json();
  assert.equal(
    (await fetch(`${base}/api/products?scenario=challenge&token=${created.id}`))
      .status,
    404,
  );
  assert.equal(
    (await fetch(`${base}/api/challenges/grade`, { method: "POST", body: "{" }))
      .status,
    400,
  );
  assert.equal(
    (
      await fetch(`${base}/api/challenges`, {
        method: "POST",
        headers: { Origin: "https://example.com" },
      })
    ).status,
    403,
  );
  const allowed = await fetch(`${base}/health`, {
    headers: { Origin: "http://127.0.0.1:5173" },
  });
  assert.equal(
    allowed.headers.get("access-control-allow-origin"),
    "http://127.0.0.1:5173",
  );
});
test("实验页面是独立静态入口，无教学应用或热更新注入", async (t) => {
  const base = await fixture(t);
  const response = await fetch(`${base}/shop/`);
  const page = await response.text();
  assert.equal(response.status, 200);
  assert.match(page, /\/lab\/shop.js/);
  assert.doesNotMatch(page, /@vite|src\/main|vue-devtools/);
  assert.equal((await fetch(`${base}/server/lab.mjs`)).status, 404);
});
