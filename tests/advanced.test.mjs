import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import {
  createHash,
  generateKeyPairSync,
  sign,
  randomBytes,
} from "node:crypto";
import { createLabServer } from "../server/lab.mjs";
import { advancedIds, assessAdvanced } from "../server/advanced.mjs";
import {
  authOptions,
  registerCredential,
  verifyCredential,
  decodeCbor,
} from "../server/advanced-webauthn.mjs";
import { parseProgress } from "../src/lib/progress.ts";
async function fixture(t, v = 0, extra = {}) {
  const server = createLabServer({
    advancedOptions: { variantForChallenge: () => v, ...extra },
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
  const base = "http://127.0.0.1:" + server.address().port;
  const get = (p) => fetch(base + p);
  const post = (p, d) =>
    fetch(base + "/api/advanced/" + p, {
      method: "POST",
      headers: {
        Origin: "http://127.0.0.1:4173",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(d),
    });
  const create = async (id) =>
    (await post("sessions", { lesson: id, mode: "challenge" })).json();
  return { base, get, post, create };
}
function metrics(id, v, g, expected) {
  const data = {
    53: {
      latest: !g && !v ? 1 : 2,
      restored: !g && v ? "old" : "current",
      cart: expected,
    },
    54: {
      retained: !g && !v ? 5 : 0,
      subscriptions: !g && v ? 5 : 0,
      checksum: expected,
      work: g ? "chunked" : "synchronous",
    },
    55: {
      total: g ? expected : expected * 2,
      name: g || !!v,
      overflow: !g && !v ? 900 : 0,
      schema: !g && v ? 1 : 2,
      handlers: !g && v ? 2 : 1,
      retained: !g && v ? 5 : 0,
      releaseChecked: true,
    },
    T01: {
      coordinates: !g && !v ? "swapped" : "correct",
      fallbacks: !g && v ? 0 : 3,
    },
    T02: { reachable: true, mapping: g ? 4174 : v ? 4176 : 0 },
    T03: { mapStatus: !g && !v ? 404 : 200, sourceMatches: g, total: expected },
    T04: { mediaError: !g && !v ? 4 : 0, advanced: g, forcedPause: !g && !!v },
    T05: { semanticErrors: g ? 0 : 2, fixtureMatches: g },
    T06: { credentialMatch: g || !!v, uv: g || !v },
    T07: {
      clicks: g ? 1 : 0,
      hit: !g && !v ? "shield" : "add",
      disabled: !g && !!v,
    },
    T08: { matched: g || !!v, fresh: g || !v },
    "05": { color: g ? "rgb(22, 130, 103)" : "rgb(184, 65, 84)" },
    "07": {
      clicks: g ? 1 : 0,
      hit: !g && !v ? "shield" : "add",
      disabled: !g && !!v,
    },
    "09": {
      total: v ? (g ? 0 : expected) : g ? expected - 5 : expected,
      stockBlocked: !!v && g,
    },
    12: { snapshot: !g && !v ? "changed" : "original", awaited: g || !v },
    16: { accepted: g ? expected : expected / 2, normalized: g },
    18: { parsed: g || !!v, latest: !g && !!v ? 1 : 2 },
  }[id];
  return { expected, visible: true, duration: 100, ...data };
}
async function run(f, token, phase, correction, id, v, g) {
  const begin = await f.post("begin", { token, phase, correction });
  assert.equal(begin.status, 200);
  const { runId } = await begin.json();
  await f.get(`/advanced/${token}/activate?run=${runId}`);
  const meta = await (
    await f.get(`/api/advanced/lesson?token=${token}&runId=${runId}`)
  ).json();
  await f.get(`/advanced/${token}/product.json?run=${runId}`);
  for (const task of id === "53"
    ? ["search-old", "search-new"]
    : id === "T02"
      ? ["probe"]
      : id === "T03"
        ? ["cart.js", "cart.js.map"]
        : [])
    await f.get(`/advanced/${token}/${task}?run=${runId}`);
  const r = await f.post("report", {
    token,
    runId,
    metrics: metrics(id, v, g, meta.expected),
  });
  assert.equal(r.status, 200);
  assert.equal(
    (await r.json()).passed,
    phase === "baseline" ? !g : g,
    `${id} ${phase}`,
  );
  return runId;
}
for (const v of [0, 1])
  test(`综合与专题 11 课配置 ${v + 1}：真实资源与故障、对照、答案共同通过`, async (t) => {
    const f = await fixture(t, v);
    for (const id of advancedIds) {
      const { token } = await f.create(id);
      assert.equal(
        (await f.post("begin", { token, phase: "baseline" })).status,
        400,
      );
      await f.get(`/advanced/${token}/`);
      assert.equal(
        (await f.post("begin", { token, phase: "fixed", correction: "a" }))
          .status,
        400,
      );
      await run(f, token, "baseline", "", id, v, false);
      await run(f, token, "fixed", "c", id, v, false);
      let r = await (
        await f.post("grade", {
          token,
          diagnosis: v ? "b" : "a",
          evidence: v ? "b" : "a",
          verification: v ? "b" : "a",
        })
      ).json();
      assert.equal(r.passed, false);
      await run(f, token, "fixed", v ? "b" : "a", id, v, true);
      r = await (
        await f.post("grade", {
          token,
          diagnosis: v ? "b" : "a",
          evidence: v ? "b" : "a",
          verification: v ? "b" : "a",
        })
      ).json();
      assert.equal(r.passed, true);
      assert.equal(
        (
          await (
            await f.post("grade", {
              token,
              diagnosis: "c",
              evidence: "c",
              verification: "c",
            })
          ).json()
        ).passed,
        false,
      );
    }
  });
for (const [chapter, ids] of Object.entries({
  elements: ["05", "07"],
  console: ["09", "12"],
  sources: ["16", "18"],
}))
  test(`${chapter} 章末隐藏课程，两个病例各两故障可校验`, async (t) => {
    for (const id of ids)
      for (const v of [0, 1]) {
        const f = await fixture(t, v, { chapterLesson: () => id });
        const s = await (await f.post("chapter", { chapter })).json();
        assert.equal(s.lesson, undefined);
        await f.get(`/advanced/${s.token}/`);
        await run(f, s.token, "baseline", "", id, v, false);
        await run(f, s.token, "fixed", v ? "b" : "a", id, v, true);
        assert.equal(
          (
            await (
              await f.post("grade", {
                token: s.token,
                diagnosis: v ? "b" : "a",
                evidence: v ? "b" : "a",
                verification: v ? "b" : "a",
              })
            ).json()
          ).passed,
          true,
        );
      }
  });
test("运行隔离、资源前置、重复报告、过期和非法来源受保护", async (t) => {
  const f = await fixture(t);
  assert.equal(
    (await f.post("sessions", { lesson: "T09", mode: "practice" })).status,
    400,
  );
  const s = await f.create("T05");
  await f.get(`/advanced/${s.token}/`);
  const begin = await (
    await f.post("begin", { token: s.token, phase: "baseline" })
  ).json();
  const d = await (await f.get("/api/advanced/lesson?token=" + s.token)).json();
  assert.equal(
    (
      await f.post("report", {
        token: s.token,
        runId: begin.runId,
        metrics: metrics("T05", 0, false, d.expected),
      })
    ).status,
    400,
  );
  const run2 = await run(f, s.token, "baseline", "", "T05", 0, false);
  assert.equal(
    (await f.get(`/advanced/${s.token}/product.json?run=${begin.runId}`))
      .status,
    409,
  );
  assert.equal(
    (
      await f.post("report", {
        token: s.token,
        runId: run2,
        metrics: metrics("T05", 0, false, d.expected),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await fetch(f.base + "/api/advanced/lesson?token=" + s.token, {
        headers: { Origin: "https://evil.invalid" },
      })
    ).status,
    403,
  );
  const e = await fixture(t, 0, { ttl: 1 });
  const session = await e.create("53");
  await new Promise((r) => setTimeout(r, 5));
  assert.equal(
    (await e.get("/api/advanced/lesson?token=" + session.token)).status,
    404,
  );
});
test("标量类型与输入绑定拒绝无效页面报告，发布需要完整人工矩阵", () => {
  for (const id of advancedIds) {
    const m = metrics(id, 0, true, 126);
    assert.equal(assessAdvanced(id, 0, m, 126).valid, true);
    assert.equal(
      assessAdvanced(id, 0, { ...m, expected: 125 }, 126).valid,
      false,
    );
    assert.equal(
      assessAdvanced(id, 0, { ...m, visible: false }, 126).valid,
      false,
    );
    const key = Object.keys(m).find(
      (k) => !["expected", "visible", "duration", "releaseChecked"].includes(k),
    );
    assert.equal(assessAdvanced(id, 0, { ...m, [key]: {} }, 126).valid, false);
  }
  assert.equal(
    assessAdvanced(
      "55",
      0,
      { ...metrics("55", 0, true, 126), releaseChecked: false },
      126,
    ).healthy,
    false,
  );
});
test("v1 支持八章末与新专题，非法导入拒绝", () => {
  const chapters = Object.fromEntries(
    [
      "elements",
      "console",
      "sources",
      "network",
      "performance",
      "application",
      "memory",
      "lighthouse",
    ].map((x) => [
      x,
      { scores: [2, 2, 2, 2, 2], note: "test", assisted: false },
    ]),
  );
  assert.equal(
    Object.keys(
      parseProgress(
        JSON.stringify({
          version: 1,
          records: { T08: { note: "CDP", hints: 0 } },
          chapters,
        }),
        advancedIds,
      ).chapters,
    ).length,
    8,
  );
  assert.throws(() =>
    parseProgress(
      JSON.stringify({
        version: 1,
        records: {},
        chapters: {
          bad: { scores: [2, 2, 2, 2, 2], note: "x", assisted: false },
        },
      }),
      advancedIds,
    ),
  );
});
const b64 = (b) => Buffer.from(b).toString("base64url"),
  hash = (b) => createHash("sha256").update(b).digest();
function cbor(x) {
  if (Buffer.isBuffer(x)) return Buffer.concat([length(2, x.length), x]);
  if (typeof x === "string") {
    const b = Buffer.from(x);
    return Buffer.concat([length(3, b.length), b]);
  }
  if (typeof x === "number") return length(x < 0 ? 1 : 0, x < 0 ? -1 - x : x);
  if (x instanceof Map)
    return Buffer.concat([
      length(5, x.size),
      ...[...x].flatMap(([k, v]) => [cbor(k), cbor(v)]),
    ]);
  throw Error("fixture type");
}
function length(m, n) {
  return n < 24
    ? Buffer.from([m * 32 + n])
    : n < 256
      ? Buffer.from([m * 32 + 24, n])
      : Buffer.from([m * 32 + 25, n >> 8, n & 255]);
}
function cryptoFixture() {
  const s = { token: "test-token", seed: 42, variant: 1, currentGood: true };
  const origin = "http://127.0.0.1:4174";
  const { publicKey, privateKey } = generateKeyPairSync("ec", {
    namedCurve: "prime256v1",
  });
  const jwk = publicKey.export({ format: "jwk" }),
    id = randomBytes(16);
  const options = authOptions(s, "register", origin);
  const client = Buffer.from(
    JSON.stringify({
      type: "webauthn.create",
      origin,
      challenge: options.challenge,
      crossOrigin: false,
    }),
  );
  const header = Buffer.concat([
    hash("127.0.0.1"),
    Buffer.from([0x45]),
    Buffer.alloc(4),
    Buffer.alloc(16),
    Buffer.from([0, 16]),
    id,
  ]);
  const key = new Map([
    [1, 2],
    [3, -7],
    [-1, 1],
    [-2, Buffer.from(jwk.x, "base64url")],
    [-3, Buffer.from(jwk.y, "base64url")],
  ]);
  const attestation = cbor(
    new Map([
      ["fmt", "none"],
      ["attStmt", new Map()],
      ["authData", Buffer.concat([header, cbor(key)])],
    ]),
  );
  registerCredential(
    s,
    {
      id: b64(id),
      clientDataJSON: b64(client),
      attestationObject: b64(attestation),
    },
    origin,
  );
  function assertion(overrides = {}) {
    const o = authOptions(s, "authenticate", origin);
    const client = Buffer.from(
      JSON.stringify({
        type: "webauthn.get",
        origin,
        challenge: o.challenge,
        ...overrides.client,
      }),
    );
    const raw = Buffer.concat([
      hash(overrides.rp || "127.0.0.1"),
      Buffer.from([overrides.flags ?? 5]),
      Buffer.from([0, 0, 0, overrides.count ?? 1]),
    ]);
    const signature = sign(
      "sha256",
      Buffer.concat([raw, hash(client)]),
      privateKey,
    );
    return {
      id: b64(id),
      clientDataJSON: b64(client),
      authenticatorData: b64(raw),
      signature: b64(signature),
    };
  }
  return { s, origin, assertion };
}
test("真实 WebAuthn：ES256 注册与签名校验，挑战单次使用", () => {
  const { s, origin, assertion } = cryptoFixture();
  const a = assertion();
  assert.equal(verifyCredential(s, a, origin).signatureVerified, true);
  assert.throws(() => verifyCredential(s, a, origin));
  assert.throws(
    () => verifyCredential(s, assertion({ count: 1 }), origin),
    /counter/,
  );
});
test("真实 WebAuthn：拒绝伪造签名、错误 origin / challenge / RP、缺 UP / UV、错凭据", () => {
  for (const mismatch of [
    { client: { origin: "http://evil.invalid" } },
    { client: { challenge: "different" } },
    { rp: "localhost" },
    { flags: 4 },
    { flags: 1 },
  ]) {
    const { s, origin, assertion } = cryptoFixture();
    assert.throws(() => verifyCredential(s, assertion(mismatch), origin));
  }
  for (const field of ["signature", "id"]) {
    const { s, origin, assertion } = cryptoFixture();
    const a = assertion();
    a[field] = b64(randomBytes(64));
    assert.throws(() => verifyCredential(s, a, origin));
  }
  assert.throws(() => decodeCbor(Buffer.from([0xbf])));
  assert.throws(() => decodeCbor(Buffer.from([0xa1, 0x01])));
});

test("真实搜索提交路径：综合配置一与 Sources 配置二复现乱序，其余条件只提交最新结果", async () => {
  const { shouldCommitSearch } = await import(
    "../public/lab/advanced/business.js"
  );
  for (const lesson of ["53", "18"])
    for (const variant of [0, 1])
      for (const good of [false, true]) {
        let committed = 0;
        for (const sequence of [2, 1])
          if (shouldCommitSearch(lesson, variant, good, sequence, 2))
            committed = sequence;
        assert.equal(
          committed,
          !good &&
            ((lesson === "53" && variant === 0) ||
              (lesson === "18" && variant === 1))
            ? 1
            : 2,
        );
      }
});

test("综合自评与报告独立于案例答案：8分、证据、验证和非空报告必须共同成立", async () => {
  const { assessmentComplete } = await import("../src/lib/progress.ts");
  assert.equal(assessmentComplete([2, 2, 1, 1, 2], "有具体证据"), true);
  for (const [scores, note] of [
    [[2, 2, 1, 1, 1], "report"],
    [[2, 2, 0, 2, 2], "report"],
    [[2, 2, 2, 2, 0], "report"],
    [[2, 2, 2, 2, 2], "  "],
  ])
    assert.equal(assessmentComplete(scores, note), false);
  const input = {
    version: 1,
    records: {
      53: { hints: 0, note: "报告", capstoneScores: [2, 2, 1, 1, 2] },
    },
  };
  assert.deepEqual(parseProgress(JSON.stringify(input), advancedIds), input);
  for (const scores of [
    [3, 2, 2, 2, 2],
    ["2", 2, 2, 2, 2],
    [2, 2, 2],
  ])
    assert.throws(() =>
      parseProgress(
        JSON.stringify({
          version: 1,
          records: { 53: { hints: 0, note: "x", capstoneScores: scores } },
        }),
        advancedIds,
      ),
    );
});
