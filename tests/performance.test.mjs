import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { createLabServer } from "../server/lab.mjs";
import { assessPerformance, performanceIds } from "../server/performance.mjs";
import { parseProgress } from "../src/lib/progress.ts";
test("已启用减弱动态时，正确抑制运动仍能完成时长课，过长配置不能蒙混通过", () => {
  const reduced = {
    duration: 2,
    checksum: 84,
    expected: 84,
    visible: true,
    animationDuration: 0,
    reducedPreview: true,
    motionSuppressed: true,
    configuredDuration: 360,
  };
  assert.equal(assessPerformance("51", 0, reduced, 84).healthy, true);
  assert.equal(
    assessPerformance("51", 0, { ...reduced, configuredDuration: 1600 }, 84)
      .healthy,
    false,
  );
  assert.equal(
    assessPerformance("51", 0, { ...reduced, reducedPreview: false }, 84)
      .healthy,
    false,
  );
});
const samples = (id, v, good, expected) => ({
  duration: good ? 40 : 240,
  checksum: expected,
  expected,
  visible: true,
  ...{
    27: {
      discoveryDelay: good ? 15 : v ? 50 : 380,
      cpuMs: good ? 4 : v ? 230 : 110,
      shiftPx: good ? 0 : 200,
      heroLoaded: true,
    },
    28: {
      operationCount: !good && v === 0 ? 3 : 1,
      renderCalls: good ? 1 : 3,
      markCount: 2,
    },
    29: {
      normalizeCalls: !good && v === 1 ? 6 : 1,
      normalizeMs: good ? 60 : 180,
    },
    30: { yields: good ? 6 : 0, maxBlock: good ? 34 : 210 },
    31: {
      discoveryDelay: !good && v === 0 ? 380 : 15,
      renderDelay: !good && v === 1 ? 240 : 30,
      heroLoaded: true,
    },
    32: { shiftPx: good ? 0 : 180, heroLoaded: true },
    33: {
      frames: 24,
      layoutReads: good ? 24 : 864,
      animatedProperty: good ? "transform" : "left",
    },
    34: {
      detailRequested: !good && v === 0,
      checkoutRequested: !good && v === 0,
      themeRequested: !good && v === 1,
    },
    51: {
      animationDuration: good ? 360 : 1600,
      motionSuppressed: good && v === 1,
      reducedPreview: v === 1,
    },
  }[id],
});
async function fixture(t, variant = 0, options = {}) {
  const server = createLabServer({
    performanceOptions: { variantForChallenge: () => variant, ...options },
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(
    () =>
      new Promise((r) => {
        server.close(r);
        server.closeAllConnections();
      }),
  );
  const base = `http://127.0.0.1:${server.address().port}`,
    post = (path, body) =>
      fetch(base + "/api/performance/" + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "http://127.0.0.1:4173",
        },
        body: JSON.stringify(body),
      }),
    create = async (id, mode = "challenge") =>
      (await post("sessions", { lesson: id, mode })).json(),
    begin = async (token, phase = "baseline", correction = "") =>
      (await post("begin", { token, phase, correction })).json();
  const visit = (token, runId) =>
    fetch(`${base}/performance/${token}/?run=${runId}`);
  return { base, post, create, begin, visit };
}
for (const variant of [0, 1])
  test(`性能 9 课配置 ${variant + 1}：真实文档访问、故障、对照和证据缺一不可`, async (t) => {
    const f = await fixture(t, variant);
    for (const id of performanceIds) {
      const { token } = await f.create(id),
        meta = await (
          await fetch(f.base + "/api/performance/lesson?token=" + token)
        ).json(),
        expected = meta.seed * meta.quantity,
        choice = variant ? "b" : "a",
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
      const { runId } = await f.begin(token);
      assert.equal(
        (
          await f.post("report", {
            token,
            runId,
            metrics: samples(id, variant, false, expected),
          })
        ).status,
        400,
      );
      await f.visit(token, runId);
      assert.equal(
        (
          await (
            await f.post("report", {
              token,
              runId,
              metrics: samples(id, variant, false, expected),
            })
          ).json()
        ).passed,
        true,
      );
      assert.equal(
        (
          await f.post("report", {
            token,
            runId,
            metrics: samples(id, variant, false, expected),
          })
        ).status,
        400,
      );
      const wrong = await f.begin(token, "fixed", variant ? "a" : "b");
      await f.visit(token, wrong.runId);
      assert.equal(
        (
          await (
            await f.post("report", {
              token,
              runId: wrong.runId,
              metrics: samples(id, variant, false, expected),
            })
          ).json()
        ).passed,
        false,
      );
      const fixed = await f.begin(token, "fixed", choice);
      await f.visit(token, fixed.runId);
      assert.equal(
        (
          await (
            await f.post("report", {
              token,
              runId: fixed.runId,
              metrics: samples(id, variant, true, expected),
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
test("性能指标校验拒绝错误业务结果、后台观测、NaN 与缺失目标条件", () => {
  for (const id of performanceIds)
    for (const variant of [0, 1]) {
      const good = samples(id, variant, true, 84);
      assert.equal(assessPerformance(id, variant, good, 84).healthy, true, id);
      assert.equal(
        assessPerformance(id, variant, { ...good, checksum: 85 }, 84).valid,
        false,
      );
      assert.equal(
        assessPerformance(
          id,
          variant,
          { ...good, expected: 85, checksum: 85 },
          84,
        ).valid,
        false,
      );
      assert.equal(
        assessPerformance(id, variant, { ...good, visible: false }, 84).valid,
        false,
      );
      assert.equal(
        assessPerformance(id, variant, { ...good, duration: NaN }, 84).valid,
        false,
      );
    }
  assert.equal(
    assessPerformance("30", 0, samples("30", 0, false, 84)).healthy,
    false,
  );
  assert.equal(
    assessPerformance("32", 0, {
      ...samples("32", 0, true, 84),
      heroLoaded: false,
    }).healthy,
    false,
  );
});
test("性能会话拒绝非法来源、模式、跨会话运行编号、过期与不合法报告", async (t) => {
  const f = await fixture(t);
  assert.equal(
    (await f.post("sessions", { lesson: "T08", mode: "challenge" })).status,
    400,
  );
  assert.equal(
    (await f.post("sessions", { lesson: "29", mode: "other" })).status,
    400,
  );
  const a = await f.create("29"),
    b = await f.create("29"),
    run = await f.begin(a.token);
  await f.visit(a.token, run.runId);
  assert.equal(
    (
      await f.post("report", {
        token: b.token,
        runId: run.runId,
        metrics: samples("29", 0, false, 84),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.post("report", {
        token: a.token,
        runId: run.runId,
        metrics: { ...samples("29", 0, false, 84), nested: { bad: true } },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(f.base + "/api/performance/sessions", {
        method: "POST",
        headers: {
          Origin: "https://outside.example",
          "Content-Type": "application/json",
        },
        body: "{}",
      })
    ).status,
    403,
  );
  assert.equal(
    (await f.post("begin", { token: a.token, phase: "wrong" })).status,
    400,
  );
  const expired = await fixture(t, 0, { ttl: -1 }),
    s = await expired.create("30");
  assert.equal(
    (await expired.post("begin", { token: s.token, phase: "baseline" })).status,
    404,
  );
});
test("资源依赖、模块和样式是独立真实资源，且旧 worker 路径不覆盖性能实验", async (t) => {
  const f = await fixture(t),
    s = await f.create("34"),
    run = await f.begin(s.token),
    prefix = `${f.base}/performance/${s.token}/`,
    html = await (await f.visit(s.token, run.runId)).text();
  assert.match(html, /执行目标操作/);
  assert.doesNotMatch(
    html,
    /@vite\/client|vue-devtools|serviceWorker.register/,
  );
  for (const name of ["details.js", "checkout.js"]) {
    const r = await fetch(prefix + name + "?run=" + run.runId);
    assert.match(r.headers.get("content-type"), /javascript/);
    const source = await r.text();
    assert.match(source, /export function openFeature/);
    assert.match(source, /optional/);
  }
  const css = await (
    await fetch(prefix + "themes.css?run=" + run.runId)
  ).text();
  assert.match(css, /detail-screen/);
  assert.match(css, /optional-theme-259/);
  assert.equal((await fetch(prefix + "details.js?run=unknown")).status, 400);
  const hero = await (await fetch(prefix + "hero.svg?run=" + run.runId)).text();
  assert.match(hero, /width="800" height="400"/);
  assert.equal(
    (await fetch(prefix + "worker.js?run=" + run.runId)).status,
    404,
  );
});
test("性能章末初始隐藏课号，三个章末与旧 v1 记录可一起导入导出", async (t) => {
  const f = await fixture(t, 1, { chapterLesson: () => "30" }),
    response = await (
      await f.post("chapter", { chapter: "performance" })
    ).json();
  assert.equal(response.chapter, "performance");
  assert.equal(response.lesson, undefined);
  const meta = await (
    await fetch(f.base + "/api/performance/lesson?token=" + response.token)
  ).json();
  assert.equal(meta.id, "30");
  assert.equal(meta.chapter, "performance");
  assert.equal((await f.post("chapter", { chapter: "network" })).status, 400);
  const state = {
    version: 1,
    records: { 21: { note: "旧时序记录", hints: 0 } },
    chapters: Object.fromEntries(
      ["network", "application", "performance"].map((chapter) => [
        chapter,
        {
          note: "固定条件、有效选区、结果校验",
          scores: [2, 2, 2, 1, 2],
          assisted: false,
          completedAt: "2026-10-22T08:00:00.000Z",
        },
      ]),
    ),
  };
  assert.deepEqual(parseProgress(JSON.stringify(state), ["21"]), state);
  assert.deepEqual(
    parseProgress(JSON.stringify({ version: 1, records: {} }), []),
    { version: 1, records: {} },
  );
});
