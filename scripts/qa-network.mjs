// 本地验收夹具；正常启动不会固定挑战配置。
import { createLabServer } from "../server/lab.mjs";
if (!["0", "1"].includes(process.argv[2]))
  throw new Error("用法：node scripts/qa-network.mjs 0|1");
const variant = Number(process.argv[2]),
  server = createLabServer({
    networkOptions: { variantForChallenge: () => variant },
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
  console.log(`网络/状态验收配置 ${variant + 1}：4174 + 4175`),
);
server.companion.listen(4175, "127.0.0.1");
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, stop);
