import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createLabServer } from "../server/lab.mjs";
import { foundationIds } from "../server/foundations.mjs";
import {
  calculateTotal,
  expectedTotal,
  auditInventory,
} from "../public/lab/foundation/cart-compiled.js";
async function fixture(t, variant = 0, extra = {}) {
  const server = createLabServer({
    foundationOptions: { variantForChallenge: () => variant, ...extra },
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
  const post = async (path, body) =>
    await fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://127.0.0.1:4174",
      },
      body: JSON.stringify(body),
    });
  return { base, post };
}
for (const variant of [0, 1])
  test(`18 课的迁移会话：配置 ${variant + 1} 不能跳过观察/修复，且错误证据不能通过`, async (t) => {
    const { base, post } = await fixture(t, variant);
    for (const lesson of foundationIds) {
      const created = await post("/api/foundations/sessions", {
        lesson,
        mode: "challenge",
      });
      assert.equal(created.status, 201);
      const { token } = await created.json();
      const expected = variant === 0 ? "a" : "b";
      const answer = {
        token,
        diagnosis: expected,
        evidence: expected,
        verification: expected,
      };
      assert.equal(
        (await (await post("/api/foundations/grade", answer)).json()).passed,
        false,
      );
      const config = await (
        await fetch(
          `${base}/api/foundations/data?token=${token}&phase=baseline`,
        )
      ).json();
      assert.equal(config.lesson, lesson);
      assert.equal(config.variant, variant);
      assert.ok(config.price > 0);
      const unissued = await post("/api/foundations/observe", {
        token,
        runId: "not-issued",
        checks: [{ name: "伪造观察", passed: true }],
      });
      assert.equal(unissued.status, 400);
      assert.equal(
        (
          await (
            await post("/api/foundations/observe", {
              token,
              runId: config.runId,
              checks: [{ name: "故障已复现", passed: true }],
            })
          ).json()
        ).passed,
        true,
      );
      assert.equal(
        (await (await post("/api/foundations/grade", answer)).json()).passed,
        false,
      );
      const badFix = await (
        await fetch(`${base}/api/foundations/data?token=${token}&phase=fixed`)
      ).json();
      await post("/api/foundations/observe", {
        token,
        runId: badFix.runId,
        checks: [{ name: "实际结果不正确", passed: false }],
      });
      assert.equal(
        (await (await post("/api/foundations/grade", answer)).json()).passed,
        false,
      );
      const fix = await (
        await fetch(`${base}/api/foundations/data?token=${token}&phase=fixed`)
      ).json();
      await post("/api/foundations/observe", {
        token,
        runId: fix.runId,
        checks: [{ name: "实际页面符合目标", passed: true }],
      });
      assert.equal(
        (
          await (
            await post("/api/foundations/grade", { ...answer, evidence: "c" })
          ).json()
        ).passed,
        false,
      );
      assert.equal(
        (await (await post("/api/foundations/grade", answer)).json()).passed,
        true,
      );
      assert.equal(
        (
          await post("/api/foundations/observe", {
            token,
            runId: fix.runId,
            checks: [{ name: "重复提交", passed: true }],
          })
        ).status,
        400,
      );
    }
  });
test("基础课接口拒绝无效课程、模式、阶段、过期与跨会话运行编号", async (t) => {
  const { base, post } = await fixture(t);
  for (const data of [
    { lesson: "19", mode: "practice" },
    { lesson: "01", mode: "bad" },
  ])
    assert.equal((await post("/api/foundations/sessions", data)).status, 400);
  const a = await (
    await post("/api/foundations/sessions", { lesson: "04", mode: "practice" })
  ).json();
  const b = await (
    await post("/api/foundations/sessions", { lesson: "05", mode: "practice" })
  ).json();
  assert.equal(
    (await fetch(`${base}/api/foundations/data?token=${a.token}&phase=bad`))
      .status,
    400,
  );
  const run = await (
    await fetch(`${base}/api/foundations/data?token=${a.token}&phase=baseline`)
  ).json();
  assert.equal(
    (
      await post("/api/foundations/observe", {
        token: b.token,
        runId: run.runId,
        checks: [{ name: "别的课", passed: true }],
      })
    ).status,
    400,
  );
  assert.equal(
    (await fetch(`${base}/api/foundations/lesson?token=expired`)).status,
    404,
  );
  const expired = await fixture(t, 0, { ttl: -1 });
  const entry = await (
    await expired.post("/api/foundations/sessions", {
      lesson: "01",
      mode: "practice",
    })
  ).json();
  assert.equal(
    (await fetch(`${expired.base}/api/foundations/lesson?token=${entry.token}`))
      .status,
    404,
  );
});
test("Sources 使用真实编译业务与 Source Map，原始源码可取回且未注入教学应用", async (t) => {
  const { base } = await fixture(t);
  const mapResponse = await fetch(
    `${base}/lab/foundation/cart-compiled.js.map`,
  );
  assert.equal(
    mapResponse.headers.get("content-type"),
    "application/json; charset=utf-8",
  );
  const map = await mapResponse.json();
  const source = await (
    await fetch(`${base}/lab/foundation/shop-cart.ts`)
  ).text();
  assert.equal(map.sources[0], "shop-cart.ts");
  assert.equal(map.sourcesContent[0], source);
  assert.ok(map.mappings.length > 100);
  const compiled = await (
    await fetch(`${base}/lab/foundation/cart-compiled.js`)
  ).text();
  assert.match(compiled, /sourceMappingURL=cart-compiled.js.map/);
  assert.doesNotMatch(compiled, /interface ShopConfig/);
  const html = await (await fetch(`${base}/foundations/`)).text();
  assert.match(html, /runtime.js/);
  assert.doesNotMatch(html, /@vite|src\/main|vue-devtools/);
});
test("Sources 运算、作用域与循环故障在多组真实输入中确实偏离，正确对照恢复结果", () => {
  for (const lesson of ["13", "14", "15"])
    for (const variant of [0, 1])
      for (const seed of [42, 113, 947]) {
        const config = {
          lesson,
          variant,
          seed,
          price: 20 + (seed % 5) * 7,
          quantity: 2 + (seed % 3),
          discount: 5 + (seed % 5),
          sku: `GOOD-${seed}`,
          name: "测试商品",
        };
        assert.notEqual(
          calculateTotal(config),
          expectedTotal(config),
          `${lesson}/${variant}/${seed}`,
        );
        assert.equal(
          calculateTotal(config, variant === 0 ? "a" : "b"),
          expectedTotal(config),
        );
        const audited = auditInventory(config, false),
          fixed = auditInventory(config, true);
        assert.ok(!audited.normalized || audited.accepted !== audited.expected);
        assert.equal(fixed.accepted, fixed.expected);
        assert.equal(fixed.normalized, true);
      }
});
test("18 课均有单独演示类型、操作步骤、分级提示与三组判定选项", async () => {
  const content = JSON.parse(
    await readFile(
      new URL("../src/data/foundations.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(content.length, 18);
  assert.equal(new Set(content.map((item) => item.kind)).size, 18);
  for (const item of content) {
    assert.ok(item.steps.length >= 5);
    assert.equal(item.hints.length, 3);
    for (const field of ["diagnoses", "evidences", "fixes"])
      assert.deepEqual(
        item[field].map((option) => option.id),
        ["a", "b", "c"],
      );
  }
});
test("条件实验确实改变输入或等待，并在正常对照恢复相同数量", async (t) => {
  for (const variant of [0, 1]) {
    const { base, post } = await fixture(t, variant);
    const { token } = await (
      await post("/api/foundations/sessions", {
        lesson: "03",
        mode: "challenge",
      })
    ).json();
    const started = performance.now();
    const response = await fetch(
      `${base}/api/foundations/data?token=${token}&phase=baseline`,
    );
    const elapsed = performance.now() - started;
    const baseline = await response.json();
    assert.equal(
      response.headers.get("x-lab-condition"),
      variant === 0 ? "extra-latency" : "quantity-changed",
    );
    assert.equal(
      baseline.quantity,
      baseline.baselineQuantity + (variant === 1 ? 1 : 0),
    );
    if (variant === 0)
      assert.ok(elapsed >= 350, "服务在响应头之前注入约 450ms 等待");
    const fixed = await (
      await fetch(`${base}/api/foundations/data?token=${token}&phase=fixed`)
    ).json();
    assert.equal(fixed.quantity, baseline.baselineQuantity);
  }
});
test("Source Map 将关键业务函数映射回实际 TypeScript 声明", async () => {
  const map = JSON.parse(
    await readFile(
      new URL("../public/lab/foundation/cart-compiled.js.map", import.meta.url),
      "utf8",
    ),
  );
  const compiled = (
    await readFile(
      new URL("../public/lab/foundation/cart-compiled.js", import.meta.url),
      "utf8",
    )
  ).split("\n");
  const source = map.sourcesContent[0].split("\n");
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let originalLine = 0,
    originalColumn = 0,
    sourceIndex = 0;
  const originalByGenerated = [];
  for (const line of map.mappings.split(";")) {
    const mapped = [];
    for (const segment of line.split(",").filter(Boolean)) {
      const fields = [];
      let value = 0,
        shift = 0;
      for (const char of segment) {
        const digit = alphabet.indexOf(char);
        assert.ok(digit >= 0);
        value |= (digit & 31) << shift;
        if (digit & 32) shift += 5;
        else {
          fields.push((value & 1 ? -1 : 1) * (value >> 1));
          value = 0;
          shift = 0;
        }
      }
      if (fields.length >= 4) {
        sourceIndex += fields[1];
        originalLine += fields[2];
        originalColumn += fields[3];
        assert.equal(sourceIndex, 0);
        assert.ok(originalColumn >= 0);
        mapped.push(originalLine);
      }
    }
    originalByGenerated.push(mapped);
  }
  for (const name of [
    "calculateTotal",
    "multiplyPrice",
    "readDiscount",
    "auditInventory",
    "mutateCart",
    "parseDiscount",
  ]) {
    const generatedLine = compiled.findIndex((line) =>
      line.startsWith(`export function ${name}(`),
    );
    assert.ok(generatedLine >= 0);
    assert.ok(
      originalByGenerated[generatedLine].some((index) =>
        source[index].includes(`function ${name}(`),
      ),
      `映射需回到 ${name} 声明`,
    );
  }
});
