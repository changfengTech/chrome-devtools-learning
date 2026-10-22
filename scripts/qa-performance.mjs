// 仅本地 QA 注入，不提供通过 HTTP 固定随机答案的入口。
import { createLabServer } from "../server/lab.mjs";
if (!["0", "1"].includes(process.argv[2]))
  throw new Error("用法：node scripts/qa-performance.mjs 0|1");
const variant = Number(process.argv[2]),
  server = createLabServer({
    performanceOptions: {
      variantForChallenge: () => variant,
      chapterLesson: () => "30",
    },
  });
const stop = () => {
  server.close();
  server.closeAllConnections();
};
server.on("error", (e) => {
  console.error(e.message);
  server.companion.close();
  process.exitCode = 1;
});
server.companion.on("error", (e) => {
  console.error(e.message);
  stop();
  process.exitCode = 1;
});
server.listen(4174, "127.0.0.1", () =>
  console.log(`性能验收配置 ${variant + 1}：4174 / 4175`),
);
server.companion.listen(4175, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, stop);
