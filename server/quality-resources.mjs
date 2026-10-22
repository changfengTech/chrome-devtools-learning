import { readFile } from "node:fs/promises";
const hero = await readFile(
  new URL("../public/lab/quality/assets/hero.png", import.meta.url),
);
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function serveQualityResource({
  s,
  run,
  task,
  url,
  request,
  response,
  json,
  cookieName,
}) {
  const prefix = "/quality/" + s.token + "/",
    good = run.good;
  if (task === "product.json") {
    response.setHeader("X-Quality-Source", "server");
    run.resources.push(task);
    json({
      sku: s.sku,
      quantity: s.quantity,
      unitPrice:
        s.lesson === "52" && s.variant === 0 && !good ? String(s.seed) : s.seed,
      stock: s.lesson === "52" && s.variant === 1 && !good ? null : 9,
      currency: "CNY",
    });
    return true;
  }
  if (task === "cookie") {
    response.setHeader(
      "Set-Cookie",
      `${cookieName}=active; Path=${prefix}; SameSite=Lax${!good ? "; Domain=invalid.example" : ""}`,
    );
    json({ attempted: true, policy: good ? "host-only" : "unrelated-domain" });
    return true;
  }
  if (task === "profile") {
    const accepted = (request.headers.cookie || "")
      .split(";")
      .some((x) => x.trim() === cookieName + "=active");
    run.profileAccepted = accepted;
    json({ accepted });
    return true;
  }
  if (task === "offer.js") {
    response.setHeader("Content-Type", "text/javascript; charset=utf-8");
    response.end('document.documentElement.dataset.qualityOffer="ready";');
    return true;
  }
  if (
    task === "hero.svg" ||
    task === "hero-400.svg" ||
    task === "hero-800.svg"
  ) {
    if (s.lesson === "47" && s.variant === 0) await delay(good ? 20 : 1400);
    const width = task.includes("800") ? 800 : 400;
    response.setHeader("Content-Type", "image/svg+xml");
    response.end(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width * 0.6}" viewBox="0 0 400 240"><rect width="400" height="240" fill="#e5edf2"/><path d="M135 45h110v95a50 50 0 0 1-100 0V45m100 15h20a28 28 0 0 1 0 56h-20" fill="white" stroke="#7292a2" stroke-width="5"/><text x="200" y="220" text-anchor="middle" font-size="18" fill="#405f70">晨间陶瓷杯</text></svg>`,
    );
    return true;
  }
  if (task === "hero.png") {
    if (s.lesson === "47" && s.variant === 0) await delay(good ? 20 : 1400);
    response.setHeader("Content-Type", "image/png");
    response.end(hero);
    return true;
  }
  if (task === "work.js") {
    response.setHeader("Content-Type", "text/javascript; charset=utf-8");
    response.end(
      `function normalizeCatalog(){const end=performance.now()+120;while(performance.now()<end){}return ${s.seed * s.quantity}}setTimeout(()=>{let result;for(let i=0;i<${good ? 1 : 4};i++)result=normalizeCatalog();document.getElementById('workproof').textContent='校验值 '+result},200);`,
    );
    return true;
  }
  if (task === "audit/" || task === "audit/index.html") {
    run.targetVisits = (run.targetVisits || 0) + 1;
    const named = !(s.lesson === "46" && s.variant === 0 && !good),
      described = !(s.lesson === "46" && s.variant === 1 && !good);
    response.setHeader("Content-Type", "text/html; charset=utf-8");
    response.end(
      `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>晨间陶瓷杯 · 日常好物</title>${described ? '<meta name="description" content="日常好物的晨间陶瓷杯，包含商品详情、数量和购物车的本地教学页面。">' : ""}<style>body{font:17px/1.8 system-ui,sans-serif;margin:0;background:#f4f7fc;color:#2c4256}header,footer{padding:22px max(24px,calc((100vw - 900px)/2));background:white}main{max-width:900px;padding:30px 24px;margin:auto}section{background:white;padding:24px;border:1px solid #dce4ef;border-radius:8px}img{max-width:100%;height:auto;width:600px}button{font:inherit;padding:12px 20px;background:#245de8;color:white;border:0;border-radius:5px;margin:8px 8px 8px 0}button:focus-visible{outline:3px solid #df8d24;outline-offset:4px}a{color:#245de8}h1{font-size:30px}#detail[hidden]{display:none}</style></head><body><header>日常好物 <a href="#product">查看商品</a></header><main id="product"><h1>晨间陶瓷杯</h1><img src="${prefix}hero.png?run=${run.id}" width="600" height="360" alt="白色陶瓷杯"><section><h2>每天都能用的杯子</h2><p>SKU ${s.sku} · 单价 ${s.seed} · 数量 ${s.quantity}</p><button id="details" ${named ? 'aria-label="查看商品详情"' : ""}><span aria-hidden="true">◫</span></button><div id="detail" hidden><h3>商品详情</h3><p>陶瓷材质，可重复使用。</p></div><button id="add">加入购物车</button><p id="cart" aria-live="polite">购物车为空</p><p id="workproof">校验值 ${s.seed * s.quantity}</p></section></main><footer>本地教学商城 · 无真实交易</footer><script>document.getElementById('details').onclick=()=>{document.getElementById('detail').hidden=!document.getElementById('detail').hidden};document.getElementById('add').onclick=()=>{document.getElementById('cart').textContent='${s.sku} / 数量 ${s.quantity} / 总额 ${s.seed * s.quantity}'};</script>${s.lesson === "47" && s.variant === 1 ? `<script src="${prefix}work.js?run=${run.id}"></script>` : ""}</body></html>`,
    );
    return true;
  }
  return false;
}
