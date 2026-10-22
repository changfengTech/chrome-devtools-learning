// 自有程序绘制教学商品图；渐变、阴影与表面纹理使其具有可辨别的真实图像内容。
import { writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
const width = 800,
  height = 480,
  raw = Buffer.alloc((width * 3 + 1) * height);
for (let y = 0; y < height; y++) {
  raw[y * (width * 3 + 1)] = 0;
  for (let x = 0; x < width; x++) {
    const u = x / width,
      v = y / height;
    let seed = (Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) >>> 0;
    const grain = (seed % 19) - 9;
    let c = [224 + 15 * v, 232 + 10 * v, 236 + 8 * v];
    const shadow = Math.exp(
      -(((u - 0.5) / 0.22) ** 2 + ((v - 0.79) / 0.045) ** 2),
    );
    c = c.map((n) => n - 36 * shadow);
    const handle = ((u - 0.655) / 0.105) ** 2 + ((v - 0.44) / 0.19) ** 2;
    if (handle < 1 && handle > 0.39 && u > 0.61)
      c = [207 + 24 * u, 215 + 22 * u, 220 + 21 * u];
    const a = (u - 0.46) / 0.2,
      b = (v - 0.47) / 0.31;
    if (
      Math.abs(a) < 1 &&
      v > 0.19 &&
      v < 0.76 &&
      a * a + (Math.max(0, b) / 1.01) ** 6 < 1.12
    ) {
      const shine = 235 + 18 * Math.cos(a * 1.9) - 24 * (u - 0.3);
      c = [shine, shine + 1, shine + 2];
    }
    if (((u - 0.46) / 0.2) ** 2 + ((v - 0.205) / 0.045) ** 2 < 1)
      c = [137 + 30 * u, 158 + 24 * u, 168 + 20 * u];
    if (((u - 0.46) / 0.18) ** 2 + ((v - 0.205) / 0.028) ** 2 < 1)
      c = [93 + 36 * u, 120 + 25 * u, 133 + 15 * u];
    const p = y * (width * 3 + 1) + 1 + x * 3;
    c.forEach(
      (n, k) =>
        (raw[p + k] = Math.max(0, Math.min(255, Math.round(n + grain * 0.4)))),
    );
  }
}
const crcTable = Array.from({ length: 256 }, (_, n) => {
  for (let i = 0; i < 8; i++) n = n & 1 ? 0xedb88320 ^ (n >>> 1) : n >>> 1;
  return n >>> 0;
});
const chunk = (type, data) => {
  const b = Buffer.concat([Buffer.from(type), data]);
  let crc = 0xffffffff;
  for (const n of b) crc = crcTable[(crc ^ n) & 255] ^ (crc >>> 8);
  const out = Buffer.alloc(data.length + 12);
  out.writeUInt32BE(data.length);
  b.copy(out, 4);
  out.writeUInt32BE((crc ^ 0xffffffff) >>> 0, out.length - 4);
  return out;
};
const header = Buffer.alloc(13);
header.writeUInt32BE(width);
header.writeUInt32BE(height, 4);
header[8] = 8;
header[9] = 2;
await writeFile(
  new URL("../public/lab/quality/assets/hero.png", import.meta.url),
  Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]),
);
