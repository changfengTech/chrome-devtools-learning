import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import { createLabServer } from "../server/lab.mjs";
import { networkStateIds } from "../server/network-state.mjs";
async function fixture(t, variant = 0, extra = {}) {
  const server = createLabServer({
    networkOptions: {
      variantForChallenge: () => variant,
      delayMs: 55,
      ...extra,
    },
  });
  server.listen(0, "127.0.0.1");
  server.companion.listen(0, "127.0.0.1");
  await Promise.all([
    once(server, "listening"),
    once(server.companion, "listening"),
  ]);
  t.after(
    () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  );
  const base = `http://127.0.0.1:${server.address().port}`,
    remote = `http://127.0.0.1:${server.companion.address().port}`;
  const post = async (path, body) =>
    fetch(base + "/api/network-state/" + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://127.0.0.1:5173",
      },
      body: JSON.stringify(body),
    });
  const create = async (lesson, mode = "challenge") =>
    (await post("sessions", { lesson, mode })).json();
  const begin = async (token, phase = "baseline", correction = "") =>
    (await post("begin", { token, phase, correction })).json();
  const resource = (token, run, task, options) =>
    fetch(`${base}/labs/${token}/${task}?run=${run.runId}`, options);
  return { server, base, remote, post, create, begin, resource };
}
for (const variant of [0, 1])
  test(`网络与状态 12 课配置 ${variant + 1}：会话、故障报告、修复与证据同时满足才通过`, async (t) => {
    const f = await fixture(t, variant),
      choice = variant === 0 ? "a" : "b";
    for (const id of networkStateIds) {
      const { token } = await f.create(id),
        answer = {
          token,
          diagnosis: choice,
          evidence: choice,
          verification: choice,
        };
      assert.equal(
        (await (await f.post("grade", answer)).json()).passed,
        false,
      );
      const baseline = await f.begin(token);
      assert.equal(baseline.good, false);
      assert.equal(baseline.variant, variant);
      assert.equal(
        (
          await f.post("report", {
            token,
            runId: baseline.runId,
            checks: [{ name: "未执行请求", passed: true }],
          })
        ).status,
        400,
      );
      await f.resource(token, baseline, "probe");
      assert.equal(
        (
          await (
            await f.post("report", {
              token,
              runId: baseline.runId,
              checks: [{ name: "浏览器故障报告（协议测试）", passed: true }],
            })
          ).json()
        ).passed,
        true,
      );
      const wrong = await f.begin(token, "fixed", "c");
      assert.equal(wrong.good, false);
      await f.resource(token, wrong, "probe");
      await f.post("report", {
        token,
        runId: wrong.runId,
        checks: [{ name: "错误修复未通过", passed: false }],
      });
      assert.equal(
        (await (await f.post("grade", answer)).json()).passed,
        false,
      );
      const fixed = await f.begin(token, "fixed", choice);
      assert.equal(fixed.good, true);
      await f.resource(token, fixed, "probe");
      await f.post("report", {
        token,
        runId: fixed.runId,
        checks: [{ name: "浏览器结果报告（协议测试）", passed: true }],
      });
      assert.equal(
        (await (await f.post("grade", { ...answer, evidence: "c" })).json())
          .passed,
        false,
      );
      assert.equal((await (await f.post("grade", answer)).json()).passed, true);
      assert.equal(
        (
          await f.post("report", {
            token,
            runId: fixed.runId,
            checks: [{ name: "重复提交", passed: true }],
          })
        ).status,
        400,
      );
    }
  });
test("契约接口实际区分 HTTP 422、HTTP 200 业务拒绝与成功订单", async (t) => {
  for (const variant of [0, 1]) {
    const f = await fixture(t, variant),
      { token } = await f.create("20"),
      run = await f.begin(token);
    const invalid = await f.resource(token, run, "checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty: 2 }),
    });
    assert.equal(invalid.status, 422);
    assert.equal((await invalid.json()).code, "INVALID_QUANTITY");
    const valid = await f.resource(token, run, "checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 2 }),
    });
    assert.equal(valid.status, 200);
    assert.equal((await valid.json()).ok, variant === 0);
  }
});
test("HTTP 缓存头、价格发布、ETag 与 304 是真实响应；服务旧数据单独存在", async (t) => {
  for (const variant of [0, 1]) {
    const f = await fixture(t, variant),
      { token } = await f.create("23"),
      run = await f.begin(token);
    const first = await f.resource(token, run, "price.json"),
      etag = first.headers.get("etag");
    assert.match(
      first.headers.get("cache-control"),
      variant === 0 ? /max-age=600/ : /no-cache/,
    );
    assert.equal((await first.json()).version, 1);
    const same = await f.resource(token, run, "price.json", {
      headers: { "If-None-Match": etag },
    });
    assert.equal(same.status, 304);
    assert.equal(await same.text(), "");
    await f.resource(token, run, "publish", { method: "POST" });
    const updated = await f.resource(token, run, "price.json", {
      headers: { "If-None-Match": etag },
    });
    assert.equal(updated.status, variant === 0 ? 200 : 304);
    const fixed = await f.begin(token, "fixed", variant === 0 ? "a" : "b");
    await f.resource(token, fixed, "publish", { method: "POST" });
    const normal = await f.resource(token, fixed, "price.json");
    assert.equal(normal.headers.get("cache-control"), "private, no-cache");
    assert.equal((await normal.json()).version, 2);
  }
});
test("独立跨源服务分别制造预检失败和实际响应不可读，修复返回具体来源", async (t) => {
  for (const variant of [0, 1]) {
    const f = await fixture(t, variant),
      { token } = await f.create("24"),
      run = await f.begin(token);
    const path = `/labs/${token}/remote?run=${run.runId}`,
      headers = {
        Origin: "http://127.0.0.1:4174",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "x-shop-token, content-type",
      };
    const preflight = await fetch(f.remote + path, {
      method: "OPTIONS",
      headers,
    });
    assert.equal(preflight.status, variant === 0 ? 403 : 204);
    const actual = await fetch(f.remote + path, {
      method: "POST",
      headers: { Origin: headers.Origin },
    });
    assert.equal(actual.headers.get("access-control-allow-origin"), null);
    const fixed = await f.begin(token, "fixed", variant === 0 ? "a" : "b");
    const normal = await fetch(
      `${f.remote}/labs/${token}/remote?run=${fixed.runId}`,
      { method: "POST", headers: { Origin: headers.Origin } },
    );
    assert.equal(
      normal.headers.get("access-control-allow-origin"),
      headers.Origin,
    );
    assert.equal((await normal.json()).ok, true);
  }
});
test("SSE 发出自定义 inventory 事件，WebSocket 完成真实握手并传输两个 JSON 消息", async (t) => {
  const f = await fixture(t),
    { token } = await f.create("26"),
    run = await f.begin(token);
  const eventResponse = await f.resource(token, run, "events");
  assert.match(eventResponse.headers.get("content-type"), /text\/event-stream/);
  const stream = await eventResponse.text();
  assert.equal((stream.match(/event: inventory/g) || []).length, 2);
  assert.match(stream, /"stock":3/);
  const socket = new WebSocket(
    f.base.replace("http:", "ws:") + `/labs/${token}/socket?run=${run.runId}`,
    { origin: "http://127.0.0.1:4174" },
  );
  const messages = [];
  socket.on("message", (data) => messages.push(JSON.parse(data.toString())));
  await once(socket, "close");
  assert.deepEqual(
    messages.map((m) => m.stock),
    [2, 3],
  );
  const log = await (
    await fetch(
      `${f.base}/api/network-state/log?token=${token}&runId=${run.runId}`,
    )
  ).json();
  assert.ok(log.events.some((e) => e.task === "socket" && e.status === 101));
});
test("Cookie 的 Path、Max-Age、HttpOnly 和 profile 接收条件真实可检查", async (t) => {
  for (const variant of [0, 1]) {
    const f = await fixture(t, variant),
      { token } = await f.create("35"),
      run = await f.begin(token);
    const login = await f.resource(token, run, "login"),
      cookie = login.headers.get("set-cookie");
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, variant === 0 ? /unrelated\// : /Max-Age=0/);
    const missing = await (
      await f.resource(token, run, "account/profile")
    ).json();
    assert.equal(missing.authenticated, false);
    const fixed = await f.begin(token, "fixed", variant === 0 ? "a" : "b"),
      fixedLogin = await f.resource(token, fixed, "login"),
      normal = fixedLogin.headers.get("set-cookie");
    assert.match(normal, /account\//);
    assert.match(normal, /Max-Age=3600/);
    const profile = await (
      await f.resource(token, fixed, "account/profile", {
        headers: { Cookie: normal.split(";")[0] },
      })
    ).json();
    assert.equal(profile.authenticated, true);
  }
});
test("worker、Manifest、离线资源与 Cache Storage 路径只属于会话，不允许全源 scope", async (t) => {
  const f = await fixture(t),
    a = await f.create("38"),
    b = await f.create("39"),
    run = await f.begin(b.token);
  const worker = await fetch(`${f.base}/labs/${a.token}/worker.js?build=2`);
  assert.match(worker.headers.get("content-type"), /text\/javascript/);
  assert.equal(worker.headers.get("service-worker-allowed"), null);
  const source = await worker.text();
  assert.match(source, new RegExp(a.token));
  assert.doesNotMatch(source, new RegExp(b.token));
  const manifest = await (
    await f.resource(b.token, run, "manifest.webmanifest")
  ).json();
  assert.equal(manifest.scope, `/labs/${b.token}/`);
  assert.equal(manifest.start_url, manifest.scope);
  const foreign = await fetch(
    `${f.base}/labs/${a.token}/manifest.webmanifest?run=${run.runId}`,
  );
  assert.equal(foreign.status, 400);
  const page = await (await fetch(`${f.base}/labs/${a.token}/`)).text();
  assert.doesNotMatch(page, /@vite|vue-devtools/);
  assert.match(page, /network-state\/runtime/);
});
test("章末入口隐藏初始课程号、会话过期与非法模式得到明确错误", async (t) => {
  const f = await fixture(t);
  for (const chapter of ["network", "application"]) {
    const created = await (await f.post("chapter", { chapter })).json();
    assert.equal(created.lesson, undefined);
    assert.equal(created.chapter, chapter);
    const meta = await (
      await fetch(`${f.base}/api/network-state/lesson?token=${created.token}`)
    ).json();
    assert.equal(meta.chapter, chapter);
    assert.equal(Number(meta.id) < 30, chapter === "network");
  }
  for (const input of [
    { lesson: "21", mode: "practice" },
    { lesson: "35", mode: "bad" },
  ])
    assert.equal((await f.post("sessions", input)).status, 400);
  assert.equal((await f.post("chapter", { chapter: "memory" })).status, 400);
  const expired = await fixture(t, 0, { ttl: -1 }),
    { token } = await expired.create("35");
  assert.equal((await expired.begin(token)).error.includes("过期"), true);
});

test("失败恢复资源提供真实 503、重试 200 与图片 404，不混成模拟 Offline", async (t) => {
  const f = await fixture(t),
    { token } = await f.create("25"),
    run = await f.begin(token);
  assert.equal(
    (await f.resource(token, run, "submit", { method: "POST" })).status,
    503,
  );
  assert.equal(
    (await f.resource(token, run, "submit", { method: "POST" })).status,
    200,
  );
  assert.equal((await f.resource(token, run, "asset.svg")).status, 404);
});

test("服务重启或会话过期后仍能打开本会话清理页并只删除对应 Cookie", async (t) => {
  const f = await fixture(t, 0, { ttl: -1 }),
    { token } = await f.create("35");
  const page = await fetch(`${f.base}/labs/${token}/`);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /id="cleanup"/);
  const cleanup = await fetch(`${f.base}/labs/${token}/logout`, {
    method: "POST",
  });
  assert.equal(cleanup.status, 200);
  assert.ok(
    cleanup.headers
      .getSetCookie()
      .every(
        (cookie) =>
          cookie.includes(`/labs/${token}/`) && cookie.includes("Max-Age=0"),
      ),
  );
  assert.equal((await fetch(`${f.base}/labs/${token}/worker.js`)).status, 404);
});
