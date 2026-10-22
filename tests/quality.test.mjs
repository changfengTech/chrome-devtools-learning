import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createLabServer } from "../server/lab.mjs";
import { assessQuality, qualityIds } from "../server/quality.mjs";
import { summarizeLighthouse, median } from "../public/lab/quality/report.js";
import { parseProgress } from "../src/lib/progress.ts";
async function fixture(t, v = 0, options = {}) {
  const server = createLabServer({
    qualityOptions: { variantForChallenge: () => v, ...options },
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
    fetch(base + "/api/quality/" + path, {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:4173",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
  const create = async (id) =>
    (await post("sessions", { lesson: id, mode: "challenge" })).json();
  const get = (path) => fetch(base + path);
  const prepare = async (token, phase = "baseline", correction = "") => {
    const r = await (await post("begin", { token, phase, correction })).json();
    await get(`/quality/${token}/activate?run=${r.runId}`);
    return r.runId;
  };
  return { base, post, create, get, prepare };
}
const metrics = (id, v, good, expected) => ({
  duration: 500,
  visible: true,
  checksum: expected,
  expected,
  manualChecked: true,
  ...{
    48: {
      width: 390,
      gridOverflow: !good && !v ? 370 : 0,
      panelOverflow: !good && v ? 270 : 0,
      rootOverflow: good ? 0 : 370,
      filterWorked: true,
      cartWorked: true,
      imageLoaded: true,
    },
    49: v
      ? { profileAccepted: good }
      : { violations: good ? 0 : 1, offerReady: good },
    52: {
      priceType: !good && !v ? "string" : "number",
      stockMissing: !good && !!v,
      cartWorked: good,
      actualTotal: good ? expected : 0,
    },
  }[id],
});
const report = (f, token, run, id, v, good, i = 0) => ({
  url: `${f.base}/quality/${token}/audit/?run=${run}`,
  version: "contract-fixture",
  fetchTime: new Date(Date.now() + i).toISOString(),
  condition: "same-test-condition",
  formFactor: id === "45" && !v && good ? "mobile" : "desktop",
  categories: Object.fromEntries(
    (id === "45" && v && !good
      ? ["performance"]
      : ["performance", "accessibility", "best-practices", "seo"]
    ).map((k) => [k, 1]),
  ),
  buttonName: id === "46" && !v && !good ? 0 : 1,
  description: id === "46" && v && !good ? 0 : 1,
  lcp: good ? 300 : 1400,
  tbt: good ? 40 : 400,
});
for (const v of [0, 1])
  test(`质量工具六课配置 ${v + 1}：两阶段、审计导入与答案共同决定通过`, async (t) => {
    const f = await fixture(t, v);
    for (const id of qualityIds) {
      const { token } = await f.create(id);
      assert.equal(
        (await f.post("begin", { token, phase: "baseline" })).status,
        400,
      );
      const root = await f.get(`/quality/${token}/`);
      assert.equal(root.status, 200);
      if (id === "49")
        assert.match(
          root.headers.get("content-security-policy"),
          /script-src 'self'/,
        );
      const meta = await (
          await f.get("/api/quality/lesson?token=" + token)
        ).json(),
        expected = meta.seed * meta.quantity,
        choice = v ? "b" : "a";
      for (const good of [false, true]) {
        const runId = await f.prepare(
          token,
          good ? "fixed" : "baseline",
          good ? choice : "",
        );
        if (["45", "46", "47"].includes(id)) {
          for (let i = 0; i < (id === "47" ? 3 : 1); i++) {
            const r = report(f, token, runId, id, v, good, i);
            assert.equal(
              (await f.post("audit", { token, runId, report: r })).status,
              200,
            );
            assert.equal(
              (await f.post("audit", { token, runId, report: r })).status,
              400,
            );
          }
        }
        const m = metrics(id, v, good, expected),
          payload = { token, runId, metrics: m };
        assert.equal(
          (await (await f.post("report", payload)).json()).passed,
          true,
          id,
        );
        assert.equal((await f.post("report", payload)).status, 400);
      }
      const answer = {
        token,
        diagnosis: choice,
        evidence: choice,
        verification: choice,
      };
      assert.equal(
        (await (await f.post("grade", { ...answer, evidence: "c" })).json())
          .passed,
        false,
      );
      assert.equal((await (await f.post("grade", answer)).json()).passed, true);
    }
  });
test("审计导入拒绝异源、旧运行、运行错误和非法分数；中位数与条件一致性", () => {
  const target = "http://127.0.0.1:4174/quality/test/audit/?run=one",
    raw = {
      finalUrl: target,
      lighthouseVersion: "13.0.1",
      fetchTime: new Date().toISOString(),
      configSettings: { formFactor: "desktop" },
      categories: { performance: { score: 0.8 } },
      audits: { "largest-contentful-paint": { numericValue: 1200 } },
    };
  assert.equal(summarizeLighthouse(raw, target).lcp, 1200);
  for (const change of [
    { finalUrl: target.replace("4174", "4175") },
    { finalUrl: target.replace("one", "two") },
    { runtimeError: { code: "FAILED" } },
    { categories: { performance: { score: 2 } } },
  ])
    assert.throws(() => summarizeLighthouse({ ...raw, ...change }, target));
  assert.equal(median([9, 1, 3]), 3);
  assert.equal(median([9, 1]), 5);
  assert.equal(median([]), null);
  const m = metrics("47", 0, true, 84),
    rs = [1, 2, 3].map(() => ({ condition: "same", lcp: 600 }));
  assert.equal(
    assessQuality("47", 0, m, 84, rs, { condition: "same", median: 1000 })
      .healthy,
    true,
  );
  rs[1].condition = "different";
  assert.equal(
    assessQuality("47", 0, m, 84, rs, { condition: "same", median: 1000 })
      .healthy,
    false,
  );
  assert.equal(
    assessQuality("47", 0, m, 84, rs.slice(0, 2), {
      condition: "same",
      median: 1000,
    }).healthy,
    false,
  );
});
test("资源是实际响应：Cookie 范围、稳定商品 URL、人工覆盖与 CSP", async (t) => {
  for (const v of [0, 1]) {
    const f = await fixture(t, v);
    for (const id of ["49", "52"]) {
      const { token } = await f.create(id);
      await f.get(`/quality/${token}/`);
      let run = await f.prepare(token);
      if (id === "49" && v) {
        const r = await f.get(`/quality/${token}/cookie?run=${run}`);
        assert.match(r.headers.get("set-cookie"), /Domain=invalid.example/);
        run = await f.prepare(token, "fixed", "b");
        const good = await f.get(`/quality/${token}/cookie?run=${run}`);
        assert.doesNotMatch(good.headers.get("set-cookie"), /Domain=/);
        assert.match(
          (await f.get(`/quality/${token}/cleanup`)).headers.get("set-cookie"),
          /Max-Age=0/,
        );
      }
      if (id === "52") {
        const path = `/quality/${token}/product.json`;
        const bad = await (await f.get(path)).json();
        assert.equal(
          v ? bad.stock === null : typeof bad.unitPrice === "string",
          true,
        );
        await f.prepare(token, "fixed", "manual");
        assert.deepEqual(await (await f.get(path)).json(), bad);
        await f.prepare(token, "fixed", v ? "b" : "a");
        const good = await (await f.get(path)).json();
        assert.equal(typeof good.unitPrice, "number");
        assert.notEqual(good.stock, null);
      }
    }
  }
});
test("缺少业务证据、宽屏冒充窄屏、不可见页不能通过", () => {
  for (const id of qualityIds) {
    const m = metrics(id, 0, true, 84);
    assert.equal(
      assessQuality(id, 0, { ...m, visible: false }, 84).valid,
      false,
    );
    assert.equal(assessQuality(id, 0, { ...m, checksum: 0 }, 84).valid, false);
  }
  const m = metrics("48", 0, true, 84);
  assert.equal(
    assessQuality("48", 0, { ...m, gridOverflow: -1 }, 84).valid,
    false,
  );
  assert.equal(
    assessQuality("48", 0, { ...m, imageLoaded: undefined }, 84).valid,
    false,
  );
  assert.equal(
    assessQuality("48", 0, { ...m, width: 1440 }, 84).healthy,
    false,
  );
  assert.equal(
    assessQuality("48", 0, { ...m, cartWorked: false }, 84).healthy,
    false,
  );
  assert.equal(
    assessQuality(
      "52",
      0,
      { ...metrics("52", 0, true, 84), actualTotal: 0 },
      84,
    ).healthy,
    false,
  );
});
test("来源、嵌套报告、过期与章末隐藏课程；五章 v1 记录兼容", async (t) => {
  const f = await fixture(t, 1, { chapterLesson: () => "46" });
  const s = await (await f.post("chapter", { chapter: "lighthouse" })).json();
  assert.equal(s.lesson, undefined);
  assert.equal(s.chapter, "lighthouse");
  assert.equal((await f.post("chapter", { chapter: "memory" })).status, 400);
  await f.get(`/quality/${s.token}/`);
  const runId = await f.prepare(s.token);
  assert.equal(
    (await f.post("report", { token: s.token, runId, metrics: { nested: {} } }))
      .status,
    400,
  );
  const r = report(f, s.token, runId, "46", 1, false);
  assert.equal(
    (
      await f.post("audit", {
        token: s.token,
        runId,
        report: { ...r, url: r.url.replace("127.0.0.1", "outside.example") },
      })
    ).status,
    400,
  );
  await f.prepare(s.token);
  assert.equal(
    (await f.post("audit", { token: s.token, runId, report: r })).status,
    400,
  );
  assert.equal(
    (
      await f.post("report", {
        token: s.token,
        runId,
        metrics: metrics("46", 1, false, 84),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(f.base + "/api/quality/sessions", {
        method: "POST",
        headers: { Origin: "https://outside.example" },
        body: "{}",
      })
    ).status,
    403,
  );
  const ex = await fixture(t, 0, { ttl: -1 }),
    old = await ex.create("49");
  assert.equal((await ex.get(`/quality/${old.token}/`)).status, 404);
  assert.equal((await ex.get(`/quality/${old.token}/cleanup`)).status, 200);
  const state = {
    version: 1,
    records: {},
    chapters: Object.fromEntries(
      ["network", "application", "performance", "memory", "lighthouse"].map(
        (id) => [
          id,
          {
            note: "证据",
            scores: [2, 2, 2, 2, 2],
            assisted: false,
            completedAt: "2026-10-22T08:00:00.000Z",
          },
        ],
      ),
    ),
  };
  assert.deepEqual(parseProgress(JSON.stringify(state), []), state);
});
test("六份质量课脚本字段与生成稿完整且原理模型不填充审计分数", async () => {
  const book = JSON.parse(
    await readFile(
      new URL("../src/data/quality.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(book.length, 6);
  for (const item of book) {
    assert.equal(item.steps.length, 6);
    for (const field of ["diagnoses", "evidences", "fixes"])
      assert.equal(item[field].length, 3);
    const doc = await readFile(
      new URL(`../docs/lessons/${item.id}.md`, import.meta.url),
      "utf8",
    );
    assert.match(doc, /独立挑战/);
  }
  const demo = await readFile(
    new URL("../src/components/QualityDemo.vue", import.meta.url),
    "utf8",
  );
  assert.match(demo, /不生成 Lighthouse 分数/);
});
