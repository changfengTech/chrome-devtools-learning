import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const vite = fileURLToPath(
  new URL("../node_modules/vite/bin/vite.js", import.meta.url),
);
const preview = process.argv.includes("--preview");
const children = [
  spawn(process.execPath, ["server/lab.mjs"], { stdio: "inherit" }),
  spawn(
    process.execPath,
    [
      vite,
      ...(preview ? ["preview"] : []),
      "--host",
      "127.0.0.1",
      "--port",
      preview ? "4173" : "5173",
      "--strictPort",
    ],
    { stdio: "inherit" },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (!child.killed) child.kill("SIGTERM");
  process.exitCode = code;
}
for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code, signal) => {
    if (!stopping) stop(signal ? 0 : code || 0);
  });
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
