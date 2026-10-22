const query = new URLSearchParams(location.search);
const token = query.get("token");
const scenario = token
  ? "challenge"
  : query.get("scenario") === "download"
    ? "download"
    : "waiting";
const tutorial = query.get("tutorial");
const origins = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);
let fixed = false;
let baseline = null;
let busy = false;
let cartCount = 0;
const $ = (id) => document.getElementById(id);
$("scenario-description").textContent = token
  ? "独立挑战：原因暂不揭示，请检查实际请求。"
  : scenario === "waiting"
    ? "场景 A：观察响应开始前的等待。"
    : "场景 B：观察响应开始后的主体传输。";

function productCard(product) {
  const card = document.createElement("article");
  const illustration = document.createElement("div");
  illustration.className = `product-art ${product.shape}`;
  illustration.style.backgroundColor = product.color;
  const object = document.createElement("span");
  object.className = "object";
  illustration.append(object);
  const category = document.createElement("p");
  category.className = "category";
  category.textContent = product.category;
  const title = document.createElement("h3");
  title.textContent = product.name;
  const bottom = document.createElement("div");
  bottom.className = "product-bottom";
  const price = document.createElement("strong");
  price.textContent = `¥ ${product.price}`;
  const button = document.createElement("button");
  button.textContent = "加入购物车";
  button.addEventListener("click", () => {
    cartCount++;
    $("status").textContent =
      `已加入购物车，本次共 ${cartCount} 件。这不会触发商品列表请求。`;
  });
  bottom.append(price, button);
  card.append(illustration, category, title, bottom);
  return card;
}

async function load() {
  if (busy) return;
  busy = true;
  for (const id of ["load", "fix", "reset"]) $(id).disabled = true;
  $("status").textContent = fixed
    ? "正在加载修复后的商品…"
    : "正在加载商品，请观察请求…";
  $("products").replaceChildren();
  const params = new URLSearchParams({
    scenario,
    fixed: fixed ? "1" : "0",
    run: String(Date.now()),
  });
  if (token) params.set("token", token);
  const requestUrl = `/api/products?${params}`;
  const start = performance.now();
  try {
    const response = await fetch(requestUrl);
    const responseAt = performance.now();
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || `请求失败：${response.status}`);
    const end = performance.now();
    const entry = performance
      .getEntriesByName(new URL(requestUrl, location.href).href)
      .at(-1);
    const measurement = {
      waiting:
        entry && entry.responseStart > 0
          ? entry.responseStart - entry.requestStart
          : responseAt - start,
      download:
        entry && entry.responseEnd > 0
          ? entry.responseEnd - entry.responseStart
          : end - responseAt,
      total: end - start,
      fixed,
    };
    if (!fixed) baseline = measurement;
    $("products").replaceChildren(...data.products.map(productCard));
    $("status").textContent =
      `已加载 ${data.products.length} 件商品。${fixed ? "这是修复对照请求。" : "这是故障请求。"}`;
    $("metrics").textContent =
      `响应前等待 ${measurement.waiting.toFixed(0)} ms　·　主体传输 ${measurement.download.toFixed(0)} ms　·　页面请求总用时 ${measurement.total.toFixed(0)} ms`;
    $("comparison").textContent =
      fixed && baseline
        ? `对照：故障等待 ${baseline.waiting.toFixed(0)} → ${measurement.waiting.toFixed(0)} ms；故障传输 ${baseline.download.toFixed(0)} → ${measurement.download.toFixed(0)} ms。两次操作需保持相同限速条件。`
        : "记录 Timing 的主要阶段，再应用修复并比较。";
    if (window.opener && tutorial && origins.has(tutorial)) {
      window.opener.postMessage(
        {
          type: "devtools-lab-result",
          lesson: "21",
          token,
          scenario,
          measurement,
        },
        tutorial,
      );
    }
  } catch (error) {
    $("status").textContent =
      `${error.message} 请检查本地服务、DevTools 离线/阻断设置，或返回教程新建挑战。`;
  } finally {
    busy = false;
    for (const id of ["load", "fix", "reset"]) $(id).disabled = false;
  }
}
$("load").addEventListener("click", load);
$("fix").addEventListener("click", () => {
  fixed = true;
  load();
});
$("reset").addEventListener("click", () => {
  fixed = false;
  baseline = null;
  $("products").replaceChildren();
  $("status").textContent = "已恢复故障。请清空 Network，再重新加载商品。";
  $("metrics").textContent = "运行请求后显示测量结果。";
  $("comparison").textContent = "";
});
