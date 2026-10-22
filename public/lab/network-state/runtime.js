const token = location.pathname.split("/")[2],
  params = new URLSearchParams(location.search),
  tutorial = params.get("tutorial");
const allowed = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);
const prefix = `/labs/${token}/`,
  key = `devtools-lab:${token}:`,
  cacheName = `devtools-${token}-products`,
  databaseName = `devtools-${token}-favorites`;
const $ = (id) => document.getElementById(id),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let meta,
  run,
  checks = [],
  busy = false,
  initializing = true,
  connections = [],
  lastStock = 0;
function log(text) {
  const li = document.createElement("li");
  li.textContent = text;
  $("events").append(li);
  console.info("[shop-lab]", text);
}
function outcome(text) {
  $("outcome").textContent = text;
}
async function control(path, body) {
  const response = await fetch("/api/network-state/" + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(6000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "实验服务错误");
  return data;
}
function url(task) {
  return prefix + task + "?run=" + encodeURIComponent(run.runId);
}
async function read(task, options) {
  const response = await fetch(url(task), options);
  const data = await response.json();
  log(`${options?.method || "GET"} ${task} → ${response.status}`);
  return { response, data };
}
function setChecks(items) {
  checks = items.map(([name, passed]) => ({ name, passed: Boolean(passed) }));
  display(checks);
}
function display(items) {
  $("checks").replaceChildren(
    ...items.map((c) => {
      const li = document.createElement("li");
      li.className = c.passed ? "pass" : "fail";
      li.textContent = `${c.passed ? "✓" : "○"} ${c.name}`;
      return li;
    }),
  );
}
function disconnect() {
  for (const close of connections) close();
  connections = [];
}
function toggle() {
  for (const id of [
    "run",
    "apply",
    "inspect",
    "reset",
    "correction",
    "cleanup",
    "revalidate",
    "retry",
    "reread",
    "offline",
  ])
    $(id).disabled = initializing || busy || (!meta && id !== "cleanup");
}
async function perform(action) {
  if (busy) return;
  busy = true;
  toggle();
  try {
    await action();
  } catch (error) {
    $("status").textContent =
      `${error.message}。若设置过 Offline 或阻断，请先恢复；会话失效则回课程重新准备。`;
    console.warn("[experiment]", error);
  } finally {
    busy = false;
    toggle();
  }
}
async function ownedRegistrations() {
  if (!("serviceWorker" in navigator)) return [];
  return (await navigator.serviceWorker.getRegistrations()).filter((r) =>
    r.scope.startsWith(location.origin + prefix),
  );
}
async function cleanupOwned() {
  disconnect();
  for (const registration of await ownedRegistrations())
    await registration.unregister();
  for (const name of await caches.keys())
    if (name.startsWith(`devtools-${token}-`)) await caches.delete(name);
  for (const storage of [localStorage, sessionStorage])
    for (const name of Object.keys(storage))
      if (name.startsWith(key)) storage.removeItem(name);
  await new Promise((resolve, reject) => {
    const req = indexedDB.deleteDatabase(databaseName);
    req.onsuccess = resolve;
    req.onerror = () => reject(req.error);
    req.onblocked = () =>
      reject(new Error("本会话数据库仍有打开连接，请关闭验证标签后重试"));
  });
  if (!meta || meta.id === "35") {
    const response = await fetch(prefix + "logout", { method: "POST" });
    if (!response.ok)
      throw new Error(
        "本地数据已清理，但本会话 Cookie 清理失败，请恢复服务后重试",
      );
  }
}
async function waitFor(test, message, timeout = 4500) {
  const start = performance.now();
  while (!test()) {
    if (performance.now() - start > timeout) throw new Error(message);
    await sleep(25);
  }
  return test();
}
async function worker(
  build,
  takeover = true,
  scope = prefix,
  strategy = "cache-first",
) {
  if (!("serviceWorker" in navigator))
    throw new Error(
      "当前环境不支持 Service Worker，请使用 Chrome 的本机 HTTP 地址",
    );
  const scriptURL = new URL(
    prefix +
      `worker.js?build=${build}&takeover=${takeover ? "1" : "0"}&strategy=${strategy}`,
    location.origin,
  ).href;
  const registration = await navigator.serviceWorker.register(scriptURL, {
    scope,
    updateViaCache: "none",
  });
  await waitFor(
    () => registration.active || registration.waiting,
    "worker 未完成安装",
  );
  if (takeover) {
    if (registration.waiting)
      registration.waiting.postMessage({ type: "ACTIVATE", token });
    if (scope === prefix)
      await waitFor(
        () => navigator.serviceWorker.controller?.scriptURL === scriptURL,
        "当前页面尚未由预期 worker 控制",
      );
  }
  return registration;
}
// URL helper 对有参数的任务保留真实查询字段，便于 Network → Payload 定位。
async function searchAction() {
  const request = async () => {
    const response = await fetch(
      url("search") + (run.good || run.variant === 1 ? "&q=cup" : ""),
    );
    const data = await response.json();
    log(
      `search query=${data.query || "(missing)"} results=${data.items.length}`,
    );
    return data;
  };
  await fetch(url("analytics"));
  const calls = !run.good && run.variant === 1 ? 2 : 1;
  let result;
  for (let i = 0; i < calls; i++) result = await request();
  outcome(
    `搜索 cup；实际返回 ${result.items.length} 件商品；本次搜索请求 ${calls} 次。`,
  );
  setChecks([
    ["搜索条件正确且只发送一次", result.items.length === 1 && calls === 1],
  ]);
}
async function checkout() {
  const payload =
    !run.good && run.variant === 0
      ? { qty: meta.quantity }
      : { quantity: meta.quantity };
  const { response, data } = await read("checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const created = run.good ? response.ok && data.ok : response.ok;
  outcome(
    `HTTP ${response.status} / ${data.code || "OK"}\n页面判定：${created ? "订单创建成功" : "未创建订单"}${run.good && data.code === "OUT_OF_STOCK" ? "，库存不足" : ""}`,
  );
  setChecks([
    [
      "参数与业务结果得到正确处理",
      run.variant === 0
        ? Boolean(data.order)
        : !created && data.code === "OUT_OF_STOCK",
    ],
  ]);
}
async function loadHero() {
  const image = new Image();
  image.alt = "晨间陶瓷杯主图";
  $("image-host").append(image);
  const ready = new Promise((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
  });
  image.src = url("hero.svg");
  return ready;
}
async function loadRecommendations() {
  return read("recommendations");
}
async function loadInventory() {
  return read("inventory");
}
async function dependencies() {
  if (run.variant === 0) {
    if (run.good) await Promise.all([loadHero(), loadRecommendations()]);
    else {
      await loadRecommendations();
      await loadHero();
    }
  } else {
    await loadInventory();
    if (!run.good) await loadInventory();
  }
  const { events } = await control(`log?token=${token}&runId=${run.runId}`);
  const hero = events.find((e) => e.task === "hero"),
    rec = events.find((e) => e.task === "recommendations"),
    count = events.filter((e) => e.task === "inventory").length;
  outcome(
    run.variant === 0
      ? `主图完成 ${hero?.at}ms；推荐接口完成 ${rec?.at}ms。\n请在 Initiator 区分串行与无关依赖。`
      : `本次库存请求 ${count} 次。`,
  );
  setChecks([
    [
      "消除无关串行或重复调用",
      run.variant === 0 ? hero && rec && hero.at < rec.at : count === 1,
    ],
  ]);
}
async function cacheExperiment() {
  const first = await read("price.json");
  await read("publish", { method: "POST" });
  const { data } = await read(
    "price.json",
    run.good ? { cache: "reload" } : undefined,
  );
  outcome(
    `初次版本 ${first.data.version}；服务已发布版本 2；当前价格版本 ${data.version}，¥${data.price}。`,
  );
  $("revalidate").hidden = false;
  setChecks([["当前价格与服务版本一致", data.version === 2]]);
}
async function crossOrigin() {
  const target = `http://127.0.0.1:4175${url("remote")}`;
  try {
    const response = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shop-Token": token },
      body: JSON.stringify({ sku: meta.sku }),
    });
    const data = await response.json();
    outcome(`跨源 JSON 可读取：${data.sku} / ¥${data.price}`);
    setChecks([
      ["浏览器允许读取本次跨源响应", response.ok && data.sku === meta.sku],
    ]);
  } catch (error) {
    log(`fetch 拒绝：${error.name}`);
    outcome(
      "浏览器无法读取响应。请比较 OPTIONS 是否通过，以及 POST 有没有真正发送。",
    );
    setChecks([["浏览器允许读取本次跨源响应", false]]);
  }
}
async function submitOrder() {
  const { response, data } = await read("submit", {
    method: "POST",
    signal: AbortSignal.timeout(8000),
  });
  return { response, data };
}
async function failureStates() {
  if (run.variant === 0) {
    outcome("正在处理…");
    try {
      const { response, data } = await submitOrder();
      if (run.good) {
        outcome(
          response.ok ? "订单创建成功" : "HTTP 503，已结束 loading，可重试。",
        );
        $("retry").hidden = response.ok;
      }
      setChecks([
        [
          "失败后结束等待且提供重试",
          !response.ok && run.good && data.code === "TEMPORARY_UNAVAILABLE",
        ],
      ]);
    } catch (error) {
      log(`网络请求未取得 HTTP 响应：${error.name}`);
      if (run.good) {
        outcome("未取得 HTTP 响应，已结束 loading。恢复网络或取消阻断后重试。");
        $("retry").hidden = false;
      }
      setChecks([["网络失败后结束等待且保留重试", run.good]]);
    }
  } else {
    const image = new Image();
    image.alt = "商品图片";
    $("image-host").append(image);
    const ok = new Promise((resolve) => {
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
    });
    image.src = url("asset.svg");
    const loaded = await ok;
    if (!loaded && run.good) {
      const fallback = document.createElement("p");
      fallback.className = "fallback";
      fallback.textContent = "图片暂不可用，商品信息仍可阅读。";
      $("image-host").replaceChildren(fallback);
    }
    outcome(
      loaded
        ? "图片加载成功"
        : run.good
          ? "图片失败，已显示替代内容。"
          : "图片失败，页面没有替代内容。",
    );
    setChecks([
      [
        "资源失败时保留可读替代",
        !loaded && Boolean($("image-host").querySelector(".fallback")),
      ],
    ]);
  }
}
async function streams() {
  lastStock = 0;
  await new Promise((resolve) => {
    let count = 0,
      finished = false;
    const done = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(done, 4500);
    if (run.variant === 0) {
      const source = new EventSource(url("events"));
      connections.push(() => {
        source.close();
        done();
      });
      source.addEventListener("inventory", (event) => {
        log(`SSE inventory: ${event.data}`);
        if (run.good) lastStock = JSON.parse(event.data).stock;
        if (++count === 2) {
          source.close();
          done();
        }
      });
      source.onmessage = (event) => {
        lastStock = JSON.parse(event.data).stock;
      };
      source.onerror = () => {
        source.close();
        done();
      };
    } else {
      const socket = new WebSocket(`ws://${location.host}${url("socket")}`);
      connections.push(() => {
        socket.close();
        done();
      });
      socket.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        log(`WS: ${event.data}`);
        lastStock = run.good ? payload.stock : payload.inventory;
        if (++count === 2) {
          socket.close();
          done();
        }
      };
      socket.onerror = () => {
        log("WebSocket 连接错误");
        done();
      };
      socket.onclose = done;
    }
  });
  outcome(`库存显示：${lastStock ?? "undefined"}；消息中的最终 stock 应为 3。`);
  setChecks([["实际消息被正确处理并更新页面", lastStock === 3]]);
}
async function cookieExperiment() {
  await read("logout");
  await read("login");
  const { data } = await read("account/profile");
  outcome(
    `profile.authenticated = ${data.authenticated}\nHttpOnly 登录状态要到 Cookies 与请求头核对。`,
  );
  setChecks([["本次登录 Cookie 随目标路径发送", data.authenticated === true]]);
}
function rereadStorage() {
  const cart = localStorage.getItem(key + "cart"),
    localFilter = localStorage.getItem(key + "filter"),
    filter = sessionStorage.getItem(key + "filter");
  outcome(
    `localStorage cart = ${cart}\nsessionStorage cart = ${sessionStorage.getItem(key + "cart")}\nlocalStorage filter = ${localFilter}\nsessionStorage filter = ${filter}`,
  );
  if (run)
    setChecks([
      [
        "存储层与目标生命周期一致",
        run.variant === 0
          ? cart === String(meta.quantity)
          : localFilter === null && filter === "cup",
      ],
    ]);
}
async function storageExperiment() {
  for (const store of [localStorage, sessionStorage]) {
    store.removeItem(key + "cart");
    store.removeItem(key + "filter");
  }
  if (run.variant === 0)
    (run.good ? localStorage : sessionStorage).setItem(
      key + "cart",
      String(meta.quantity),
    );
  else
    (run.good ? sessionStorage : localStorage).setItem(key + "filter", "cup");
  rereadStorage();
  $("reread").hidden = false;
  $("probe-tab").hidden = false;
  $("probe-tab").href = location.pathname + "?probe=1";
}
async function openDatabase() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(databaseName, 1);
    req.onupgradeneeded = () =>
      req.result.createObjectStore("favorites", { keyPath: "sku" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function readFavorite() {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("favorites"),
        req = tx.objectStore("favorites").get(meta.sku);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}
async function rereadDatabase() {
  const item = await readFavorite();
  outcome(
    `读取键：${meta.sku}\n实际已提交记录：${item ? JSON.stringify(item) : "undefined"}`,
  );
  if (run)
    setChecks([
      [
        "当前 SKU 的记录已提交且可读",
        item?.sku === meta.sku && item?.price === meta.price,
      ],
    ]);
}
async function databaseExperiment() {
  const db = await openDatabase();
  try {
    await new Promise((resolve) => {
      const tx = db.transaction("favorites", "readwrite"),
        store = tx.objectStore("favorites");
      store.clear();
      const req = store.put({
        sku: !run.good && run.variant === 0 ? "OLD-" + meta.sku : meta.sku,
        price: meta.price,
        favorite: true,
      });
      req.onsuccess = () => {
        log("IndexedDB request success");
        if (!run.good && run.variant === 1) tx.abort();
      };
      tx.oncomplete = () => {
        log("IndexedDB transaction complete");
        resolve();
      };
      tx.onabort = () => {
        log("IndexedDB transaction abort");
        resolve();
      };
    });
  } finally {
    db.close();
  }
  await rereadDatabase();
  $("reread").hidden = false;
}
async function workerExperiment() {
  if (run.good) {
    const registration = await navigator.serviceWorker.getRegistration(prefix);
    if (run.variant === 0 && registration?.waiting) {
      registration.waiting.postMessage({ type: "ACTIVATE", token });
      await waitFor(
        () => navigator.serviceWorker.controller?.scriptURL.includes("build=2"),
        "等待激活未完成",
      );
    } else await worker(2, true);
  } else if (run.variant === 0) {
    await worker(1, true);
    const registration = await worker(2, false);
    await waitFor(() => registration.waiting, "新版本未进入 waiting");
  } else await worker(2, true, prefix + "narrow/");
  const registrations = await ownedRegistrations();
  const { data } = await read("controlled-version.json");
  outcome(
    `当前返回 workerVersion=${data.workerVersion}\ncontroller=${navigator.serviceWorker.controller?.scriptURL ?? "null"}\n${registrations.map((r) => `scope=${r.scope}\nactive=${r.active?.scriptURL}\nwaiting=${r.waiting?.scriptURL ?? "none"}`).join("\n")}`,
  );
  setChecks([["当前页面由目标版本实际控制", data.workerVersion === 2]]);
}
async function cacheStorageExperiment() {
  const cache = await caches.open(cacheName);
  await cache.put(
    location.origin + prefix + "offline-product.json",
    new Response(
      JSON.stringify({
        version: run.variant === 0 ? 1 : 2,
        price: meta.price,
        source: "cache-storage",
        sku: meta.sku,
      }),
      { headers: { "Content-Type": "application/json" } },
    ),
  );
  await cache.add(prefix + "offline.html");
  await worker(2, true, prefix, run.good ? "network-first" : "cache-first");
  const manifestURL = url("manifest.webmanifest");
  let link = document.querySelector("link[rel=manifest]");
  if (!link) {
    link = document.createElement("link");
    link.rel = "manifest";
    document.head.append(link);
  }
  link.href = manifestURL;
  const manifest = await (await fetch(manifestURL)).json(),
    iconResponse = await fetch(manifest.icons[0].src);
  const { data } = await read("offline-product.json");
  outcome(
    `商品版本 ${data.version} / ${data.source}\nManifest 图标 HTTP ${iconResponse.status}\nscope=${manifest.scope}\nstart_url=${manifest.start_url}`,
  );
  setChecks([
    ["缓存商品与实际版本一致", data.version === 2],
    ["Manifest 图标资源可用", iconResponse.ok],
    [
      "修复后确实从网络更新缓存",
      run.phase === "baseline" || data.source === "network",
    ],
  ]);
  $("offline").hidden = false;
  $("offline-page").hidden = false;
  $("offline-page").href = prefix + "offline-view/";
}
const tasks = {
  19: searchAction,
  20: checkout,
  22: dependencies,
  23: cacheExperiment,
  24: crossOrigin,
  25: failureStates,
  26: streams,
  35: cookieExperiment,
  36: storageExperiment,
  37: databaseExperiment,
  38: workerExperiment,
  39: cacheStorageExperiment,
};
async function report() {
  if (!run) throw new Error("请先运行故障");
  await read("probe");
  const baseline = run.phase === "baseline",
    items = baseline
      ? [
          {
            name: "目标故障已在真实实验中复现",
            passed: checks.length > 0 && checks.some((c) => !c.passed),
          },
        ]
      : checks;
  display(items);
  const result = await control("report", {
    token,
    runId: run.runId,
    checks: items,
  });
  run.observed = true;
  if (result.passed && window.opener && allowed.has(tutorial))
    window.opener.postMessage(
      {
        type: "devtools-foundation-result",
        token,
        lesson: meta.id,
        mode: meta.mode,
        phase: run.phase,
        passed: true,
      },
      tutorial,
    );
  $("status").textContent = result.passed
    ? baseline
      ? "故障已复现并记录。请在 DevTools 保存证据，再验证修复。"
      : "修复检查通过，已回传教程。请提交原因、证据和验证。"
    : "当前结果未通过。检查差异或恢复实验条件后重试。";
}
async function start(phase, correction = "") {
  if (
    meta.id === "38" &&
    phase === "baseline" &&
    navigator.serviceWorker.controller
  ) {
    await cleanupOwned();
    sessionStorage.setItem(key + "resume", "1");
    location.reload();
    return;
  }
  disconnect();
  $("events").replaceChildren();
  $("image-host").replaceChildren();
  for (const id of [
    "retry",
    "revalidate",
    "reread",
    "offline",
    "probe-tab",
    "offline-page",
  ])
    $(id).hidden = true;
  run = await control("begin", { token, phase, correction });
  sessionStorage.setItem(key + "lastRun", JSON.stringify(run));
  outcome("正在执行本次真实业务…");
  await tasks[meta.id]();
  await report();
}
$("run").onclick = () => perform(() => start("baseline"));
$("reset").onclick = $("run").onclick;
$("apply").onclick = () =>
  perform(() => {
    if (!$("correction").value) throw new Error("先选择对照方案");
    return start("fixed", $("correction").value);
  });
$("inspect").onclick = () =>
  perform(async () => {
    if (run?.observed) {
      run = await control("begin", {
        token,
        phase: run.phase,
        correction: $("correction").value,
      });
    }
    await report();
  });
$("retry").onclick = () =>
  perform(async () => {
    try {
      const { response } = await submitOrder();
      outcome(
        response.ok
          ? "重试成功，订单已创建。"
          : "仍失败，已结束等待，可再次重试。",
      );
    } catch (error) {
      outcome(
        "仍未取得 HTTP 响应，已结束等待。恢复网络或取消阻断后可再次重试。",
      );
      log(`重试网络错误：${error.name}`);
    }
  });
$("revalidate").onclick = () =>
  perform(async () => {
    const { data } = await read("price.json", { cache: "no-cache" });
    log(
      `条件验证后页面读取版本 ${data.version}；Network 可显示真实 304，fetch 返回合并后的表示。`,
    );
  });
$("reread").onclick = () =>
  perform(() => (meta.id === "36" ? rereadStorage() : rereadDatabase()));
$("offline").onclick = () =>
  perform(async () => {
    const { data } = await read("offline-product.json");
    outcome(
      `本次离线/在线读取：版本 ${data.version}，${data.source}。\n请在 Network 核对 from ServiceWorker 与离线条件，恢复 Online 后再报告。`,
    );
    setChecks([["受控资源版本正确", data.version === 2]]);
  });
$("cleanup").onclick = () =>
  perform(async () => {
    await cleanupOwned();
    $("status").textContent =
      "已清理本会话存储、数据库、缓存和注册。当前 controller 在关闭或刷新页面后释放；教程学习记录保留。";
  });
window.addEventListener("pagehide", disconnect);
toggle();
try {
  meta = await control(`lesson?token=${token}`);
  $("title").textContent = meta.chapter ? "请独立排查本次商城问题" : meta.hook;
  document.title = meta.chapter
    ? `${meta.chapter} 章末任务 · 日常好物实验`
    : `第 ${meta.id} 课 · 日常好物实验`;
  $("brief").textContent = meta.chapter
    ? "先定义预期、复现一次操作，再选择工具和证据；本任务初始不提供操作步骤。"
    : meta.mode === "practice"
      ? meta.symptom
      : "数据与故障配置已变化，先用证据判断原因。";
  $("course-label").textContent = meta.chapter
    ? `${meta.chapter === "network" ? "Network" : "Application"} 章末任务`
    : `第 ${meta.id} 课 · ${meta.mode === "practice" ? "引导实战" : "独立挑战"}`;
  if (meta.chapter) document.querySelector("details").hidden = true;
  $("scope").textContent =
    Number(meta.id) >= 35
      ? `本会话路径 ${prefix}；存储仅使用 devtools-${token}-* 与 ${key}*`
      : "实验源 http://127.0.0.1:4174；本课跨源请求使用独立端口 4175。";
  $("product-meta").textContent =
    `${meta.sku} / 单价 ¥${meta.price} / 数量 ${meta.quantity}`;
  for (const option of meta.fixes) {
    const o = document.createElement("option");
    o.value = option.id;
    o.textContent = option.label;
    $("correction").append(o);
  }
  for (const text of meta.steps) {
    const li = document.createElement("li");
    li.textContent = text;
    $("steps").append(li);
  }
  toggle();
  if (sessionStorage.getItem(key + "resume")) {
    sessionStorage.removeItem(key + "resume");
    await perform(() => start("baseline"));
  } else if (params.get("probe")) {
    rereadStorage();
    $("status").textContent =
      "这是无 opener 的独立标签，只读取已有状态，不自动写入。";
  } else {
    const saved = sessionStorage.getItem(key + "lastRun");
    if (saved) {
      run = JSON.parse(saved);
      if (meta.id === "36") {
        rereadStorage();
        $("reread").hidden = false;
      }
      if (meta.id === "37") {
        await rereadDatabase();
        $("reread").hidden = false;
      }
    }
  }
} catch (error) {
  $("status").textContent = error.message;
  console.warn("[setup]", error);
} finally {
  initializing = false;
  toggle();
}
