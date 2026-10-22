import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseProgress } from "../src/lib/progress.ts";

test("记录校验保留独立完成状态、中文笔记和提示记录", () => {
  const input = {
    version: 1,
    records: {
      21: {
        note: "比较响应前等待与传输",
        hints: 2,
        practiceAt: "2026-10-20T12:00:00.000Z",
      },
    },
  };
  const output = parseProgress(JSON.stringify(input), ["21"]);
  assert.deepEqual(output, input);
  assert.equal(output.records["21"].challengeAt, undefined);
});
test("拒绝损坏、未知版本、未知课程、过长笔记与非法完成时间", () => {
  const values = [
    "{",
    JSON.stringify({ version: 2, records: {} }),
    JSON.stringify({ version: 1, records: { bad: { note: "", hints: 0 } } }),
    JSON.stringify({
      version: 1,
      records: { 21: { note: "a".repeat(4001), hints: 0 } },
    }),
    JSON.stringify({
      version: 1,
      records: { 21: { note: "", hints: 0, challengeAt: true } },
    }),
    JSON.stringify({ version: 1, records: { 21: { note: "", hints: 9 } } }),
  ];
  for (const value of values) assert.throws(() => parseProgress(value, ["21"]));
});
test("课程交付合同包含 55 主线、8 专题和唯一课号，仅开放已实现课程", async () => {
  const lessons = JSON.parse(
    await readFile(
      new URL("../src/data/curriculum.json", import.meta.url),
      "utf8",
    ),
  );
  assert.equal(lessons.filter((item) => !item.id.startsWith("T")).length, 55);
  assert.equal(lessons.filter((item) => item.id.startsWith("T")).length, 8);
  assert.equal(new Set(lessons.map((item) => item.id)).size, 63);
  assert.deepEqual(
    lessons.filter((item) => item.status === "ready").map((item) => item.id),
    [
      ...Array.from({ length: 55 }, (_, index) =>
        String(index + 1).padStart(2, "0"),
      ),
      ...Array.from(
        { length: 8 },
        (_, i) => `T${String(i + 1).padStart(2, "0")}`,
      ),
    ],
  );
  for (const item of lessons)
    for (const field of ["goal", "demo", "lab", "challenge"])
      assert.ok(item[field]?.length > 5, `${item.id} ${field}`);
});

test("基础课完成记录与辅助标记可往返，旧版 21 课记录仍兼容", () => {
  const input = {
    version: 1,
    records: {
      "04": {
        note: "检查 Computed",
        hints: 3,
        challengeAssisted: true,
        challengeAt: "2026-10-20T13:00:00.000Z",
      },
      21: { note: "", hints: 0 },
    },
  };
  assert.deepEqual(parseProgress(JSON.stringify(input), ["04", "21"]), input);
  assert.throws(() =>
    parseProgress(
      JSON.stringify({
        version: 1,
        records: { "04": { note: "", hints: 0, challengeAssisted: "yes" } },
      }),
      ["04"],
    ),
  );
});

test("章末自评与报告随 v1 导出往返；非法分数、章节和时间不覆盖合法记录", () => {
  const state = {
    version: 1,
    records: { 21: { note: "旧版记录", hints: 0 } },
    chapters: {
      network: {
        note: "请求及修复证据",
        scores: [2, 2, 2, 1, 2],
        assisted: false,
        completedAt: "2026-10-22T03:00:00.000Z",
      },
    },
  };
  assert.deepEqual(parseProgress(JSON.stringify(state), ["21"]), state);
  for (const bad of [
    {
      ...state,
      chapters: {
        network: { ...state.chapters.network, scores: [2, 2, 3, 2, 2] },
      },
    },
    { ...state, chapters: { invalid: state.chapters.network } },
    {
      ...state,
      chapters: { network: { ...state.chapters.network, completedAt: "bad" } },
    },
  ])
    assert.throws(() => parseProgress(JSON.stringify(bad), ["21"]));
});
