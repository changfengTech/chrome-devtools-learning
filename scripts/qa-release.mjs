// 整体验收夹具：只在本机启动，HTTP 不提供固定答案入口。日常启动仍使用随机配置。
import { createLabServer } from "../server/lab.mjs";

const mode = process.argv[2] || "alternate";
if (!["0", "1", "alternate"].includes(mode)) {
  throw Error("用法：node scripts/qa-release.mjs [0|1|alternate]");
}

function variants() {
  let n = 0;
  return () => (mode === "alternate" ? n++ % 2 : Number(mode));
}

const server = createLabServer({
  foundationOptions: { variantForChallenge: variants() },
  networkOptions: { variantForChallenge: variants() },
  performanceOptions: { variantForChallenge: variants(), chapterLesson: () => "30" },
  memoryOptions: { variantForChallenge: variants(), chapterLesson: () => "44" },
  qualityOptions: { variantForChallenge: variants(), chapterLesson: () => "46" },
  advancedOptions: {
    variantForChallenge: variants(),
    chapterLesson: (chapter) =>
      ({ elements: "07", console: "12", sources: "18" })[chapter],
  },
});

const stop = () => {
  server.close();
  server.closeAllConnections();
  server.companion.close();
  server.companion.closeAllConnections();
};
const fail = (error) => {
  console.error(error.message);
  stop();
  process.exitCode = 1;
};
server.on("error", fail);
server.companion.on("error", fail);
server.listen(4174, "127.0.0.1", () => {
  console.log(
    `整体验收 ${mode}：商城 4174 / 同伴 4175；仅挑战故障配置受控，Network/Application 章末病例仍随机。`,
  );
});
server.companion.listen(4175, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, stop);
