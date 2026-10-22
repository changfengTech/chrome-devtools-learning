import { readFile, writeFile } from "node:fs/promises";
import ts from "typescript";
const base = new URL("../public/lab/foundation/", import.meta.url);
const source = await readFile(new URL("shop-cart.ts", base), "utf8");
const output = ts.transpileModule(source, {
  fileName: "shop-cart.ts",
  compilerOptions: {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ES2022,
    sourceMap: true,
    inlineSources: true,
    strict: true,
  },
});
const map = JSON.parse(output.sourceMapText);
map.file = "cart-compiled.js";
await writeFile(
  new URL("cart-compiled.js", base),
  output.outputText.replace(
    "sourceMappingURL=shop-cart.js.map",
    "sourceMappingURL=cart-compiled.js.map",
  ),
);
await writeFile(new URL("cart-compiled.js.map", base), JSON.stringify(map));
console.log("已编译商城调试模块及真实 Source Map。");
