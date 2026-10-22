const $ = (id) => document.getElementById(id);
const token = location.pathname.split("/")[2],
  query = new URLSearchParams(location.search),
  tutorial = query.get("tutorial");
const allowed = new Set([
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);
let expiryTimer;
let meta,
  run,
  running = false,
  cancelled = false,
  started = 0,
  lastMetrics = null,
  flowGeneration = 0,
  searchAbort = null;
const timers = new Map(),
  pendingRequests = new Set();
function wait(ms) {
  return new Promise((resolve) => {
    const id = setTimeout(() => {
      timers.delete(id);
      resolve();
    }, ms);
    timers.set(id, resolve);
  });
}
async function request(path, data) {
  const controller = new AbortController();
  pendingRequests.add(controller);
  const id = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch("/api/memory/" + path, {
      method: data ? "POST" : "GET",
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || "请求失败");
    return result;
  } finally {
    clearTimeout(id);
    pendingRequests.delete(controller);
  }
}
class MemoryVisit {
  constructor(index) {
    this.index = index;
    this.payload = new Array(4096).fill(index);
  }
}
class CatalogEntry {
  constructor(sku) {
    this.sku = sku;
    this.payload = new Array(4096).fill(sku.length);
  }
}
class ProductPayload {
  constructor(index) {
    this.index = index;
    this.values = new Array(4096).fill(index);
  }
}
class CatalogCacheOwner {
  constructor(payload) {
    this.entries = [payload];
  }
}
class PreviewAllocation {
  constructor(index) {
    this.index = index;
    this.values = new Array(4096).fill(index);
  }
}
class DetachedProductDialog {
  constructor(node) {
    this.node = node;
  }
}
class SubscriptionLease {
  constructor(index) {
    this.index = index;
    this.values = new Array(4096).fill(index);
    this.hits = 0;
  }
}
class TimerLease {
  constructor(index) {
    this.index = index;
    this.values = new Array(4096).fill(index);
    this.ticks = 0;
  }
}
class MemoryLabState {
  constructor() {
    this.history = [];
    this.cache = new Map();
    this.owners = [];
    this.audit = [];
    this.previewHistory = [];
    this.snapshotCache = new Map();
    this.latestPreview = null;
    this.closedDialogs = [];
    this.selectedDetails = new Map();
    this.subscriptions = new Set();
    this.intervals = new Set();
    this.cycles = 0;
    this.featureWorks = false;
    this.checksum = 0;
    this.samples = [];
    this.successfulFlows = 0;
    this.failedFlows = 0;
    this.orders = new Set();
    this.delays = new Set();
  }
  clear() {
    for (const fn of this.subscriptions)
      window.removeEventListener("inventory-change", fn);
    for (const id of this.intervals) clearInterval(id);
    this.subscriptions.clear();
    this.intervals.clear();
    this.history.length = 0;
    this.cache.clear();
    this.owners.length = 0;
    this.audit.length = 0;
    this.previewHistory.length = 0;
    this.snapshotCache.clear();
    this.latestPreview = null;
    this.closedDialogs.length = 0;
    this.selectedDetails.clear();
    $("preview-host").replaceChildren();
  }
}
// 唯一业务根便于沿 Retainers 追踪；不把对象打印到 Console，不保留关闭节点的调试日志。
const state = new MemoryLabState();
window.memoryLab = state;
const cartItems = new Map();
function resetCounters() {
  state.cycles = 0;
  state.featureWorks = false;
  state.checksum = 0;
  state.samples.length = 0;
  state.successfulFlows = 0;
  state.failedFlows = 0;
  state.orders.clear();
  state.delays.clear();
}
function snapshot() {
  return {
    duration: Math.round(performance.now() - started),
    visible: document.visibilityState === "visible",
    expected: meta.seed * meta.quantity,
    checksum: state.checksum,
    cycles: state.cycles,
    featureWorks: state.featureWorks,
    history: state.history.length,
    cacheEntries: state.cache.size,
    owners: state.owners.length,
    auditOwners: state.audit.length,
    previewHistory: state.previewHistory.length,
    snapshotCache: state.snapshotCache.size,
    latestPreview: state.latestPreview ? 1 : 0,
    detached:
      state.closedDialogs.filter((x) => !x.node.isConnected).length +
      [...state.selectedDetails.values()].filter((x) => !x.node.isConnected)
        .length,
    listeners: state.subscriptions.size,
    timers: state.intervals.size,
    successfulFlows: state.successfulFlows,
    failedFlows: state.failedFlows,
    ordersSeen: state.orders.size,
    delaysSeen: state.delays.size,
  };
}
function render() {
  lastMetrics = snapshot();
  $("metrics").textContent = JSON.stringify(lastMetrics, null, 2);
  $("summary").textContent =
    `已完成 ${state.cycles} 次开关；功能检查：${state.featureWorks ? "正常" : "待执行"}\n历史 ${lastMetrics.history} / 商品缓存 ${lastMetrics.cacheEntries} / owner ${lastMetrics.owners} / 审计引用 ${lastMetrics.auditOwners}\n预览历史 ${lastMetrics.previewHistory} / 快照缓存 ${lastMetrics.snapshotCache} / Detached ${lastMetrics.detached}\n本页仍注册监听器 ${lastMetrics.listeners} / 定时器 ${lastMetrics.timers}`;
  $("report").disabled =
    !run ||
    running ||
    cancelled ||
    run.reported ||
    state.cycles < (meta.id === "50" ? 1 : 5);
  $("batch").disabled =
    !run || running || cancelled || run.reported || state.cycles >= 20;
  $("export").disabled = !lastMetrics;
}
function dispose() {
  cartItems.clear();
  cancelled = true;
  flowGeneration++;
  searchAbort?.abort();
  for (const controller of pendingRequests) controller.abort();
  pendingRequests.clear();
  for (const [id, resolve] of timers) {
    clearTimeout(id);
    resolve();
  }
  timers.clear();
  state.clear();
  $("detail").replaceChildren();
  $("results").replaceChildren();
  $("results").dataset.ready = "false";
  running = false;
  if (meta) {
    render();
    $("status").textContent =
      "本页资源已停止并释放；快照中是否已回收需另行检查。准备故障可重新开始。";
  }
}
function previewNode(index) {
  const node = document.createElement("article");
  node.className = "product-preview";
  node.dataset.memoryDialog = String(index);
  const title = document.createElement("strong");
  title.textContent = "晨间陶瓷杯 · " + meta.sku;
  node.append(title);
  for (let i = 0; i < 12; i++) {
    const line = document.createElement("span");
    line.textContent = ` 商品细节 ${i + 1} `;
    node.append(line);
  }
  $("preview-host").append(node);
  return node;
}
function createPreviewAllocation(index) {
  return new PreviewAllocation(index);
}
function retainPreviewSnapshot(index) {
  const item = createPreviewAllocation(index);
  state.snapshotCache.set(run.good ? meta.sku : `visit-${index}`, item);
}
async function cycle(index) {
  const node = previewNode(index),
    bad = !run.good,
    v = run.variant;
  let close = () => {},
    functional = true;
  if (meta.id === "40") {
    if (v === 0) {
      if (bad) state.history.push(new MemoryVisit(index));
      state.cache.set("normal-" + (index % 2), new CatalogEntry(meta.sku));
    } else
      state.cache.set(
        bad ? "visit-" + index : meta.sku,
        new CatalogEntry(meta.sku),
      );
  }
  if (meta.id === "41") {
    const payload = new ProductPayload(index),
      owner = new CatalogCacheOwner(payload);
    if (v === 0) {
      if (!bad) state.owners.length = 0;
      state.owners.push(owner);
    } else {
      if (!bad) {
        state.owners.length = 0;
        state.audit.length = 0;
      }
      state.owners.push(owner);
      if (bad) state.audit.push(payload);
    }
  }
  if (meta.id === "42") {
    if (v === 0) {
      const item = createPreviewAllocation(index);
      state.latestPreview = item;
      if (bad) state.previewHistory.push(item);
    } else retainPreviewSnapshot(index);
  }
  if (meta.id === "44" && v === 0) {
    const lease = new SubscriptionLease(index);
    function inventorySubscription() {
      lease.hits++;
    }
    window.addEventListener("inventory-change", inventorySubscription);
    state.subscriptions.add(inventorySubscription);
    window.dispatchEvent(new Event("inventory-change"));
    functional = lease.hits === 1;
    node.dataset.stock = String(lease.hits);
    close = () => {
      if (!bad) {
        window.removeEventListener("inventory-change", inventorySubscription);
        state.subscriptions.delete(inventorySubscription);
      }
    };
  }
  if (meta.id === "44" && v === 1) {
    const lease = new TimerLease(index);
    function refreshInventory() {
      lease.ticks++;
    }
    const id = setInterval(refreshInventory, 40);
    state.intervals.add(id);
    await wait(95);
    functional = lease.ticks >= 1;
    node.dataset.stock = String(lease.ticks);
    close = () => {
      if (!bad) {
        clearInterval(id);
        state.intervals.delete(id);
      }
    };
  } else await wait(35);
  if (cancelled) {
    close();
    node.remove();
    return;
  }
  close();
  node.remove();
  if (meta.id === "43" && bad) {
    const dialog = new DetachedProductDialog(node);
    if (v === 0) state.closedDialogs.push(dialog);
    else state.selectedDetails.set("visit-" + index, dialog);
  }
  state.cycles++;
  state.featureWorks = functional;
  state.checksum = meta.seed * meta.quantity;
}
async function batch() {
  if (!run || running || cancelled || run.reported) return;
  running = true;
  render();
  $("status").textContent = "正在执行相同的 5 次开关…";
  try {
    for (let i = 0; i < 5 && state.cycles < 20 && !cancelled; i++)
      await cycle(state.cycles + 1);
    if (!cancelled) {
      state.samples.push(snapshot());
      $("feature").textContent =
        `已完成 ${state.cycles} 次真实开关；SKU ${meta.sku}，数量 ${meta.quantity}，校验值 ${state.checksum}。`;
      $("status").textContent =
        "本批已结束。记录浏览器快照 / 趋势，可追加相同批次或记录本轮检查。";
    }
  } finally {
    running = false;
    render();
  }
}
async function begin(phase) {
  if (running) return;
  $("status").textContent = "正在准备本轮…";
  try {
    const next = await request("begin", {
      token,
      phase,
      correction: $("correction").value,
    });
    const data = await request(`lesson?token=${token}&runId=${next.runId}`);
    await fetch(`/memory/${token}/activate?run=${next.runId}`);
    dispose();
    cancelled = false;
    run = { ...data.run, reported: false };
    state.clear();
    resetCounters();
    started = performance.now();
    $("correction").value = run.correction || $("correction").value;
    $("check-status").textContent = "尚未报告";
    $("status").textContent =
      meta.id === "50"
        ? "本轮已准备。先看脆弱示例，再用 Recorder 录制自己的稳定流程。"
        : "本轮已准备。先拍基线快照，再重复相同批次；本页保持同一文档。";
    if (meta.id === "50") {
      const url = new URL(location.href);
      url.searchParams.set("run", run.id);
      history.replaceState(null, "", url.href);
      resetFlow();
      $("reverse").checked = run.variant === 0;
      $("slow").checked = run.variant === 1;
    }
    render();
  } catch (error) {
    $("status").textContent = error.message;
  }
}
async function report() {
  if (!run || running || cancelled || run.reported) return;
  try {
    const metrics = snapshot();
    const result = await request("report", { token, runId: run.id, metrics });
    run.reported = true;
    lastMetrics = metrics;
    render();
    $("check-status").textContent =
      (result.passed ? "本轮检查通过。" : "目标条件尚未成立。") +
      result.checks.map((c) => `${c.passed ? "✓" : "○"} ${c.label}`).join("；");
    const connected =
      window.opener && !window.opener.closed && allowed.has(tutorial);
    if (result.passed && connected) {
      window.opener.postMessage(
        {
          type: "devtools-foundation-result",
          lesson: meta.id,
          token,
          mode: meta.mode,
          phase: run.phase,
          passed: true,
        },
        tutorial,
      );
      $("status").textContent =
        "检查通过，已回传教程。实际快照 / Recorder 证据请自行保存。";
    } else if (result.passed)
      $("status").textContent =
        "检查通过；当前页面未连接教程，请从课程入口重新打开实验。";
  } catch (error) {
    $("check-status").textContent = error.message;
  }
}
function resetFlow() {
  cartItems.clear();
  flowGeneration++;
  searchAbort?.abort();
  $("search").value = "";
  $("results").replaceChildren();
  $("results").dataset.ready = "false";
  $("detail").replaceChildren();
  $("cart").textContent = "购物车为空";
  $("cart").dataset.complete = "false";
  $("search-status").textContent = "尚未搜索";
  delete $("cart").dataset.sku;
  delete $("cart").dataset.quantity;
  delete $("cart").dataset.total;
}
async function searchProducts() {
  const generation = ++flowGeneration;
  searchAbort?.abort();
  searchAbort = new AbortController();
  $("results").replaceChildren();
  $("results").dataset.ready = "false";
  $("detail").replaceChildren();
  $("search-status").textContent = "正在搜索…";
  const delay = $("slow").checked ? 1200 : 450;
  const requestSlow = $("slow").checked,
    requestReverse = $("reverse").checked;
  await wait(delay);
  if (cancelled || generation !== flowGeneration || searchAbort.signal.aborted)
    return;
  if (!$("search").value.includes("杯")) {
    $("search-status").textContent = "没有匹配商品";
    return;
  }
  const primary = {
      sku: meta.sku,
      name: "晨间陶瓷杯",
      price: meta.seed,
      id: "primary",
    },
    secondary = {
      sku: "GIFT-" + meta.seed,
      name: "旅行随行杯",
      price: meta.seed + 7,
      id: "secondary",
    };
  for (const product of requestReverse
    ? [secondary, primary]
    : [primary, secondary]) {
    const article = document.createElement("article");
    article.className = "product-card";
    const heading = document.createElement("h3");
    heading.textContent = product.name;
    const info = document.createElement("p");
    info.textContent = `${product.sku} / 单价 ${product.price}`;
    const button = document.createElement("button");
    button.textContent = "查看 " + product.name;
    button.dataset.testid = "open-" + product.id;
    button.onclick = () => openDetail(product, requestSlow, requestReverse);
    article.append(heading, info, button);
    $("results").append(article);
  }
  $("results").dataset.ready = "true";
  $("search-status").textContent = "搜索结果已就绪";
}
function openDetail(product, requestSlow, requestReverse) {
  $("detail").replaceChildren();
  const heading = document.createElement("h3");
  heading.textContent = product.name + " · " + product.sku;
  const info = document.createElement("p");
  info.textContent = `数量 ${meta.quantity}，总额 ${product.price * meta.quantity}`;
  const add = document.createElement("button");
  add.textContent = "加入购物车";
  add.dataset.testid = "add-to-cart";
  add.onclick = () => {
    if (!run || cancelled || run.reported || state.cycles >= 20) return;
    const quantity =
      (cartItems.get(product.sku)?.quantity || 0) + meta.quantity;
    cartItems.set(product.sku, { price: product.price, quantity });
    const sum = [...cartItems.values()].reduce(
      (total, item) => total + item.price * item.quantity,
      0,
    );
    const passed =
      cartItems.size === 1 &&
      product.sku === meta.sku &&
      quantity === meta.quantity &&
      sum === meta.seed * meta.quantity;
    $("cart").textContent =
      `SKU ${[...cartItems.keys()].join(", ")} / 数量 ${[...cartItems.values()].reduce((n, item) => n + item.quantity, 0)} / 总额 ${sum}`;
    $("cart").dataset.sku = [...cartItems.keys()].join(",");
    $("cart").dataset.quantity = String(quantity);
    $("cart").dataset.total = String(sum);
    $("cart").dataset.complete = String(passed);
    state.cycles++;
    state.checksum = sum;
    state.featureWorks = true;
    if (passed) {
      state.successfulFlows++;
      state.orders.add(requestReverse);
      state.delays.add(requestSlow);
    } else state.failedFlows++;
    render();
  };
  $("detail").append(heading, info, add);
}
async function example(stable) {
  if (!run || running || cancelled || run.reported || state.cycles >= 20)
    return;
  running = true;
  render();
  try {
    resetFlow();
    $("search").value = "杯";
    const pending = searchProducts();
    if (stable) await pending;
    else if (run.variant === 0) await pending;
    else await wait(150);
    if (cancelled) return;
    const target = stable
      ? document.querySelector('[data-testid="open-primary"]')
      : document.querySelector("#results button");
    if (!target) {
      state.failedFlows++;
      state.cycles++;
      state.featureWorks = true;
      state.checksum = 0;
      $("search-status").textContent =
        "固定等待已结束，但结果尚未就绪。等待条件应针对实际结果。";
    } else {
      target.click();
      document.querySelector('[data-testid="add-to-cart"]').click();
    }
    if (!stable && run.variant === 0 && $("cart").dataset.complete !== "true")
      $("search-status").textContent = "第一项定位买错商品；核对 SKU 断言。";
  } finally {
    running = false;
    render();
  }
}
function download(value, name) {
  const blob = new Blob([JSON.stringify(value, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function recorderExample() {
  if (!run) return;
  const url = new URL(location.href);
  url.searchParams.set("run", run.id);
  url.searchParams.set("reverse", String($("reverse").checked));
  url.searchParams.set("slow", String($("slow").checked));
  const select = (s) => [[s]];
  const steps = [
    { type: "navigate", url: url.href },
    {
      type: "click",
      offsetX: 8,
      offsetY: 8,
      selectors: select('[data-testid="reset-flow"]'),
    },
    {
      type: "change",
      selectors: select('[data-testid="search"]'),
      value: "杯",
    },
    {
      type: "click",
      offsetX: 8,
      offsetY: 8,
      selectors: select('[data-testid="search-submit"]'),
    },
    {
      type: "waitForElement",
      selectors: select('#results[data-ready="true"]'),
      visible: true,
    },
    {
      type: "click",
      offsetX: 8,
      offsetY: 8,
      selectors: select('[data-testid="open-primary"]'),
    },
    {
      type: "click",
      offsetX: 8,
      offsetY: 8,
      selectors: select('[data-testid="add-to-cart"]'),
    },
    {
      type: "waitForElement",
      selectors: select('[data-testid="cart"][data-complete="true"]'),
      attributes: {
        "data-sku": meta.sku,
        "data-quantity": String(meta.quantity),
        "data-total": String(meta.seed * meta.quantity),
      },
      visible: true,
    },
  ];
  download(
    {
      title: "日常好物：目标 SKU 的稳定购物流程（会话专用示例）",
      timeout: 5000,
      steps,
    },
    "memory-recorder-example.json",
  );
}
$("baseline").onclick = () => begin("baseline");
$("restore").onclick = () => begin("baseline");
$("fixed").onclick = () => begin("fixed");
$("dispose").onclick = dispose;
$("batch").onclick = batch;
$("report").onclick = report;
$("reset-flow").onclick = resetFlow;
$("search-form").onsubmit = (e) => {
  e.preventDefault();
  if (run && !cancelled) searchProducts();
};
$("fragile").onclick = () => example(false);
$("stable").onclick = () => example(true);
$("recorder").onclick = recorderExample;
$("export").onclick = () =>
  download(
    {
      kind: "owned-resource-observation",
      lesson: meta.id,
      mode: meta.mode,
      phase: run?.phase,
      metrics: lastMetrics,
      samples: state.samples,
      environment: {
        userAgent: navigator.userAgent,
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio,
      },
    },
    "memory-observation.json",
  );
window.addEventListener(
  "pagehide",
  () => {
    clearTimeout(expiryTimer);
    dispose();
  },
  { once: true },
);
try {
  meta = await request(
    "lesson?token=" + token + "&runId=" + (query.get("run") || ""),
  );
  $("context").textContent = meta.chapter
    ? "Memory 章末挑战"
    : `第 ${meta.id} 课 · ${meta.mode === "practice" ? "引导实战" : "独立挑战"}`;
  $("title").textContent = meta.chapter
    ? "关闭预览后，资源为什么还在？"
    : meta.hook;
  $("symptom").textContent = meta.chapter
    ? "重复操作，选择工具，追到不必要的保留路径，再验证正常功能。"
    : meta.symptom;
  for (const fix of meta.fixes) {
    const option = document.createElement("option");
    option.value = fix.id;
    option.textContent = fix.label;
    $("correction").append(option);
  }
  if (meta.chapter) $("instructions").hidden = true;
  else
    for (const step of meta.steps) {
      const li = document.createElement("li");
      li.textContent = step;
      $("steps").append(li);
    }
  $("memory-scene").hidden = meta.id === "50";
  $("flow-scene").hidden = meta.id !== "50";
  if (meta.id === "50") {
    $("intro-kicker").textContent = "让同一流程稳定重现";
    $("observation-label").textContent = "流程执行与实际购物结果";
    $("observation-boundary").textContent =
      "本页核对真实购物结果；示例脚本和观察 JSON 不证明原生 Recorder Replay。请另行保存录制与回放证据。";
    $("recovery-title").textContent = "回放与恢复边界";
    $("recovery-behavior").textContent =
      "每轮先重置购物流程；漏掉重置时重复加购会累加，数量与总额断言会失败。切换顺序或延迟后，移除 Recorder 默认 navigate（保留重置），或编辑它的导航条件，再验证目标 SKU。";
    $("recovery-limits").textContent =
      "本轮最多 20 次加购 / 失败尝试。会话 30 分钟过期，示例地址仅供本会话使用。停止与离页会取消本页异步任务；录制、编辑、Replay 与导出请在 Chrome Recorder 完成。";
  }
  $("product").textContent =
    `${meta.sku} / 数量 ${meta.quantity} / 预期校验值 ${meta.seed * meta.quantity}`;
  $("environment").textContent =
    `${innerWidth} × ${innerHeight} / DPR ${devicePixelRatio} / visibility=${document.visibilityState}；未读取 DevTools 的 GC 或 Recorder 状态。`;
  $("status").textContent = "会话就绪。先准备故障，再开始测量。";
  started = performance.now();
  if (meta.id === "50" && meta.run) {
    run = { ...meta.run, reported: false };
    await fetch(`/memory/${token}/activate?run=${run.id}`);
    $("correction").value = run.correction || "a";
    $("reverse").checked = query.get("reverse") === "true";
    $("slow").checked = query.get("slow") === "true";
  }
  expiryTimer = setTimeout(
    dispose,
    Math.max(1, Date.parse(meta.expiresAt) - Date.now()),
  );
  render();
} catch (error) {
  $("title").textContent = "实验未就绪";
  $("status").textContent = error.message;
  for (const id of [
    "baseline",
    "fixed",
    "restore",
    "batch",
    "report",
    "recorder",
    "fragile",
    "stable",
  ])
    $(id).disabled = true;
}
