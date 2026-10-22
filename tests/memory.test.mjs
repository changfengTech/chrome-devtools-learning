import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createLabServer } from "../server/lab.mjs";
import { assessMemory, memoryIds } from "../server/memory.mjs";
import { parseProgress } from "../src/lib/progress.ts";
const samples = (id, v, good, expected) => ({
  duration: 500,
  visible: true,
  expected,
  checksum: expected,
  cycles: 5,
  featureWorks: true,
  history: 0,
  cacheEntries: 0,
  owners: 0,
  auditOwners: 0,
  previewHistory: 0,
  snapshotCache: 0,
  latestPreview: 0,
  detached: 0,
  listeners: 0,
  timers: 0,
  successfulFlows: 0,
  failedFlows: 0,
  ordersSeen: 0,
  delaysSeen: 0,
  ...{
    40: v
      ? { cacheEntries: good ? 1 : 5 }
      : { history: good ? 0 : 5, cacheEntries: 2 },
    41: v
      ? { owners: good ? 1 : 5, auditOwners: good ? 0 : 5 }
      : { owners: good ? 1 : 5 },
    42: v
      ? { snapshotCache: good ? 1 : 5 }
      : { previewHistory: good ? 0 : 5, latestPreview: 1 },
    43: { detached: good ? 0 : 5 },
    44: v ? { timers: good ? 0 : 5 } : { listeners: good ? 0 : 5 },
    50: {
      successfulFlows: good ? 2 : 0,
      failedFlows: good ? 0 : 1,
      ordersSeen: good ? 2 : 0,
      delaysSeen: good ? 2 : 0,
      checksum: good ? expected : 0,
    },
  }[id],
});
async function fixture(t, v = 0, options = {}) {
  const server = createLabServer({
    memoryOptions: { variantForChallenge: () => v, ...options },
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
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, data) =>
    fetch(base + "/api/memory/" + path, {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:4173",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  const create = async (id) =>
    (await post("sessions", { lesson: id, mode: "challenge" })).json();
  const visit = (token) => fetch(`${base}/memory/${token}/`);
  const begin = async (token, phase = "baseline", correction = "") =>
    (await post("begin", { token, phase, correction })).json();
  const activate = (token, runId) =>
    fetch(`${base}/memory/${token}/activate?run=${runId}`);
  return { base, post, create, visit, begin, activate };
}
for (const v of [0, 1])
  test(`内存与回归 6 课配置 ${v + 1}：文档、实际运行与完整证据共同通过`, async (t) => {
    const f = await fixture(t, v);
    for (const id of memoryIds) {
      const { token } = await f.create(id);
      assert.equal(
        (await f.post("begin", { token, phase: "baseline" })).status,
        400,
      );
      const html = await (await f.visit(token)).text();
      assert.match(html, /重复 5 次开关/);
      assert.doesNotMatch(html, /@vite\/client|serviceWorker.register/);
      const meta = await (
          await fetch(f.base + "/api/memory/lesson?token=" + token)
        ).json(),
        expected = meta.seed * meta.quantity,
        choice = v ? "b" : "a",
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
      const run = await f.begin(token);
      assert.equal(
        (
          await f.post("report", {
            token,
            runId: run.runId,
            metrics: samples(id, v, false, expected),
          })
        ).status,
        400,
      );
      await f.activate(token, run.runId);
      assert.equal(
        (
          await (
            await f.post("report", {
              token,
              runId: run.runId,
              metrics: samples(id, v, false, expected),
            })
          ).json()
        ).passed,
        true,
      );
      assert.equal(
        (
          await f.post("report", {
            token,
            runId: run.runId,
            metrics: samples(id, v, false, expected),
          })
        ).status,
        400,
      );
      const wrong = await f.begin(token, "fixed", v ? "a" : "b");
      await f.activate(token, wrong.runId);
      assert.equal(
        (
          await (
            await f.post("report", {
              token,
              runId: wrong.runId,
              metrics: samples(id, v, false, expected),
            })
          ).json()
        ).passed,
        false,
      );
      const fixed = await f.begin(token, "fixed", choice);
      await f.activate(token, fixed.runId);
      const current = await (
        await fetch(
          f.base + `/api/memory/lesson?token=${token}&runId=${fixed.runId}`,
        )
      ).json();
      assert.equal(current.run.correction, choice);
      assert.equal(
        (
          await (
            await f.post("report", {
              token,
              runId: fixed.runId,
              metrics: samples(id, v, true, expected),
            })
          ).json()
        ).passed,
        true,
      );
      assert.equal(
        (await (await f.post("grade", { ...answer, evidence: "c" })).json())
          .passed,
        false,
      );
      assert.equal((await (await f.post("grade", answer)).json()).passed, true);
    }
  });
test("指标拒绝缺字段、负数、错误结果、不可见页和仅一次成功回归", () => {
  for (const id of memoryIds)
    for (const v of [0, 1]) {
      const good = samples(id, v, true, 84);
      assert.equal(assessMemory(id, v, good, 84).healthy, true, id);
      assert.equal(
        assessMemory(id, v, { ...good, cycles: 0 }, 84).valid,
        false,
      );
      assert.equal(
        assessMemory(id, v, { ...good, listeners: -1 }, 84).valid,
        false,
      );
      assert.equal(
        assessMemory(id, v, { ...good, visible: false }, 84).valid,
        false,
      );
      assert.equal(
        assessMemory(id, v, { ...good, expected: 85 }, 84).valid,
        false,
      );
      const missing = { ...good };
      delete missing.detached;
      assert.equal(assessMemory(id, v, missing, 84).valid, false);
    }
  assert.equal(
    assessMemory(
      "50",
      0,
      { ...samples("50", 0, true, 84), successfulFlows: 1 },
      84,
    ).healthy,
    false,
  );
  assert.equal(
    assessMemory("50", 0, { ...samples("50", 0, true, 84), ordersSeen: 1 }, 84)
      .healthy,
    false,
  );
  assert.equal(
    assessMemory("50", 1, { ...samples("50", 1, true, 84), delaysSeen: 1 }, 84)
      .healthy,
    false,
  );
  assert.equal(
    assessMemory(
      "43",
      0,
      { ...samples("43", 0, false, 84), detached: undefined },
      84,
    ).fault,
    false,
  );
});
test("隔离与失效：来源、模式、跨会话、过期、嵌套报告和越界拒绝", async (t) => {
  const f = await fixture(t),
    a = await f.create("43"),
    b = await f.create("43");
  await f.visit(a.token);
  const run = await f.begin(a.token);
  await f.activate(a.token, run.runId);
  assert.equal(
    (await f.post("sessions", { lesson: "51", mode: "challenge" })).status,
    400,
  );
  assert.equal(
    (await f.post("sessions", { lesson: "40", mode: "wrong" })).status,
    400,
  );
  assert.equal(
    (await f.post("begin", { token: a.token, phase: "wrong" })).status,
    400,
  );
  assert.equal(
    (
      await f.post("report", {
        token: b.token,
        runId: run.runId,
        metrics: samples("43", 0, false, 84),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.post("report", {
        token: a.token,
        runId: run.runId,
        metrics: { x: {} },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(f.base + "/api/memory/sessions", {
        method: "POST",
        headers: { Origin: "https://outside.example" },
        body: "{}",
      })
    ).status,
    403,
  );
  assert.equal(
    (await fetch(f.base + `/memory/${a.token}/worker.js?run=${run.runId}`))
      .status,
    404,
  );
  const ex = await fixture(t, 0, { ttl: -1 }),
    s = await ex.create("44");
  assert.equal((await ex.visit(s.token)).status, 404);
});
test("Memory 章末初始隐藏课程；旧 v1 和四个章末记录兼容且拒绝非法分数", async (t) => {
  const f = await fixture(t, 1, { chapterLesson: () => "44" });
  const s = await (await f.post("chapter", { chapter: "memory" })).json();
  assert.equal(s.lesson, undefined);
  assert.equal(s.chapter, "memory");
  const meta = await (
    await fetch(f.base + "/api/memory/lesson?token=" + s.token)
  ).json();
  assert.equal(meta.id, "44");
  assert.equal(meta.chapter, "memory");
  assert.equal(
    (await f.post("chapter", { chapter: "performance" })).status,
    400,
  );
  const state = {
    version: 1,
    records: { 21: { hints: 0, note: "旧记录" } },
    chapters: Object.fromEntries(
      ["network", "application", "performance", "memory"].map((id) => [
        id,
        {
          note: "实际证据",
          scores: [2, 2, 2, 1, 2],
          assisted: false,
          completedAt: "2026-10-22T08:00:00.000Z",
        },
      ]),
    ),
  };
  assert.deepEqual(parseProgress(JSON.stringify(state), ["21"]), state);
  state.chapters.memory.scores = [3, 2, 2, 2, 2];
  assert.throws(() => parseProgress(JSON.stringify(state), ["21"]));
  assert.deepEqual(parseProgress('{"version":1,"records":{}}', []), {
    version: 1,
    records: {},
  });
});
