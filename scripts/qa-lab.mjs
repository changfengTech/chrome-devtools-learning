// 仅用于本地验收：固定随机题配置，不能通过 HTTP 参数切换。
import { createLabServer } from "../server/lab.mjs";
const variant = Number(process.argv[2]);
if (!["0", "1"].includes(process.argv[2]))
  throw new Error("用法：node scripts/qa-lab.mjs 0|1");
const server = createLabServer({
  foundationOptions: { variantForChallenge: () => variant },
});
server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(4174, "127.0.0.1", () =>
  console.log(`验收商城配置 ${variant + 1}：http://127.0.0.1:4174/`),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => server.close());
