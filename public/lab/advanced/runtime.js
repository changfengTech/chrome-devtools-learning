import {
  chooseStore,
  locationFailure,
  checkout,
  auditInventory,
  pairProtocol,
  credentialPolicy,
  shouldCommitSearch,
} from "./business.js";
const $ = (id) => document.getElementById(id),
  params = new URLSearchParams(location.search),
  token = location.pathname.split("/")[2],
  tutorial = params.get("tutorial");
const allowed = new Set([
  "http://127.0.0.1:4173",
  "http://localhost:4173",
  "http://127.0.0.1:5173",
  "http://localhost:5173",
]);
const owned = {
  nodes: [],
  subscriptions: [],
  controllers: new Set(),
  streams: new Set(),
  urls: new Set(),
};
window.advancedShop = owned; // Inspect only this lesson's retained roots. Not a heap / GC measurement.
let meta,
  run,
  product,
  m = {},
  busy = false,
  start = 0,
  active = false,
  clicks = 0,
  media,
  recorder,
  orientationHandler,
  taskGeneration = 0,
  nativeResult = null,
  lastObservation;
const storageKey = "devtools-advanced-" + token;
async function api(path, body) {
  const controller = new AbortController();
  owned.controllers.add(controller);
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const r = await fetch(path, {
      signal: controller.signal,
      ...(body
        ? {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          }
        : {}),
    });
    const d = await r.json();
    if (!r.ok) throw Error(d.error || "请求失败");
    return d;
  } finally {
    clearTimeout(timer);
    owned.controllers.delete(controller);
  }
}
const post = (action, data = {}) =>
  api("/api/advanced/" + action, { token, ...data });
const resource = (path) => api(`/advanced/${token}/${path}?run=${run.runId}`);
function setBusy(v) {
  busy = v;
  for (const id of [
    "baseline",
    "fixed",
    "restore",
    "execute",
    "inspect",
    "report",
    "register",
    "authenticate",
    "geo",
    "orientation",
  ])
    $(id).disabled =
      v ||
      !meta ||
      (["register", "authenticate"].includes(id) && location.hostname !== "localhost") ||
      ([
        "execute",
        "inspect",
        "report",
        "register",
        "authenticate",
        "geo",
        "orientation",
      ].includes(id) &&
        !active);
}
function notify(phase, passed) {
  if (window.opener && allowed.has(tutorial))
    window.opener.postMessage(
      {
        type: "devtools-foundation-result",
        token,
        lesson: meta.id,
        mode: meta.mode,
        phase,
        passed,
      },
      tutorial,
    );
}
function clearResources(clearStorage = false) {
  taskGeneration++;
  for (const c of owned.controllers) c.abort();
  owned.controllers.clear();
  for (const fn of owned.subscriptions)
    window.removeEventListener("advanced-stock", fn);
  owned.subscriptions.length = 0;
  owned.nodes.length = 0;
  if (media) {
    media.pause();
    media.removeAttribute("src");
    media.load();
    media = null;
  }
  if (recorder && recorder.state !== "inactive") recorder.stop();
  recorder = null;
  for (const s of owned.streams) for (const t of s.getTracks()) t.stop();
  owned.streams.clear();
  for (const u of owned.urls) URL.revokeObjectURL(u);
  owned.urls.clear();
  if (orientationHandler)
    window.removeEventListener("deviceorientation", orientationHandler);
  orientationHandler = null;
  if (clearStorage) localStorage.removeItem(storageKey);
}
function baseScene() {
  $("scene").hidden = false;
  $("fixture").replaceChildren();
  $("sku").textContent = product.sku;
  $("price").textContent = "¥ " + product.price;
  $("price").style.color = "";
  $("product").style.gridTemplateColumns = "";
  $("product").style.minWidth = "";
  $("quantity").value = product.quantity;
  $("cart").textContent = "尚未加购";
  $("add").disabled = false;
  $("shield").hidden = true;
  $("favorite").setAttribute("aria-label", "收藏陶瓷杯");
  clicks = 0;
  $("add").onclick = () => {
    clicks++;
    $("cart").textContent =
      "合计 ¥ " + Number(product.price) * product.quantity;
  };
  $("native").hidden = !meta.id.startsWith("T");
  $("sensor-controls").hidden = meta.id !== "T01";
  $("auth-controls").hidden = meta.id !== "T06";
  $("workspace-controls").hidden = meta.id !== "T03";
  $("native-boundary").textContent = meta.boundary || "";
  document.getElementById("device-link")?.remove();
  if (meta.id === "T02") {
    const label = document.createElement("label");
    label.id = "device-link";
    label.textContent = "配置 4174 转发后，在 Android Chrome 打开此地址：";
    const address = document.createElement("input");
    address.readOnly = true;
    address.value = "http://localhost:4174" + location.pathname;
    address.setAttribute("aria-label", "手机转发后的商城地址");
    address.style.width = "100%";
    label.append(address);
    $("native-boundary").after(label);
  }
  $("release").hidden = meta.id !== "55";
  if (meta.id === "55" && !$("matrix").children.length)
    for (const name of [
      "Elements",
      "Console",
      "Sources",
      "Network",
      "Performance",
      "Memory",
      "Application",
      "Lighthouse",
      "辅助工具与遗留问题",
    ]) {
      const label = document.createElement("label");
      label.textContent = name;
      const input = document.createElement("textarea");
      input.rows = 2;
      input.maxLength = 800;
      input.setAttribute("aria-label", name + " 发布记录");
      input.placeholder = "实际证据，或未验证的原因";
      label.append(input);
      $("matrix").append(label);
    }
  if (["T07", "07"].includes(meta.id) && !run.good) {
    if (meta.variant === 0) $("shield").hidden = false;
    else $("add").disabled = true;
  }
  if (meta.id === "05") {
    const style = document.createElement("style");
    style.textContent =
      meta.variant === 0
        ? `#product #price{color:${run.good ? "rgb(22,130,103)" : "rgb(184,65,84)"}}`
        : `#price{color:rgb(22,130,103)} #price{color:${run.good ? "rgb(22,130,103)" : "rgb(184,65,84)"}}`;
    $("fixture").append(style);
  }
  if (meta.id === "55" && !run.good) {
    if (meta.variant === 0) {
      $("favorite").removeAttribute("aria-label");
      $("product").style.gridTemplateColumns = "minmax(1200px,1fr) 1fr";
    } else
      $("add").onclick = () => {
        clicks += 2;
        $("cart").textContent =
          "合计 ¥ " + Number(product.price) * product.quantity * 2;
      };
  }
  if (meta.id === "T05") renderForm();
  if (meta.id === "T04") {
    media = document.createElement("video");
    media.controls = true;
    media.muted = true;
    media.loop = true;
    media.setAttribute("aria-label", "商品测试视频");
    $("fixture").append(media);
  }
  if (meta.id === "T07") {
    const p = document.createElement("p");
    p.textContent =
      "预置待验证建议（非 AI 实时回答）：把按钮 z-index 调高并改成亮色，应该就能点击。请用实际命中目标与 disabled 状态证明或推翻。";
    $("fixture").append(p);
  }
  if (meta.id === "T01") {
    const p = document.createElement("p");
    p.textContent =
      "本地位置夹具：Shanghai 31.23 / 121.47；三个错误：拒绝 / 不可用 / 超时。原生定位由下方按钮主动触发。";
    $("fixture").append(p);
  }
}
function renderForm() {
  const f = document.createElement("form");
  f.autocomplete = "on";
  const defs = [
    ["given", "收货人", "given-name"],
    ["street", "街道", "street-address"],
    ["postal", "邮编", "postal-code"],
  ];
  for (const [id, label, token] of defs) {
    const l = document.createElement("label");
    l.textContent = label;
    const input = document.createElement("input");
    input.id = id;
    input.name = id;
    input.autocomplete = `section-delivery ${!run.good && meta.variant === 1 ? "billing" : "shipping"} ${!run.good && meta.variant === 0 ? (id === "given" ? "street-address" : id === "street" ? "given-name" : token) : token}`;
    l.htmlFor = id;
    l.append(input);
    f.append(l);
  }
  const p = document.createElement("p");
  p.textContent =
    "执行目标流程将使用虚构地址按 token 填值；这不是 Chrome Autofill。原生填充请主动选择自己的测试资料。";
  $("fixture").append(f, p);
}
async function begin(phase) {
  setBusy(true);
  $("status").textContent = "正在准备独立运行…";
  try {
    clearResources();
    run = await post("begin", { phase, correction: $("correction").value });
    await resource("activate");
    const data = await api(
      `/api/advanced/lesson?token=${token}&runId=${run.runId}`,
    );
    run.good = data.good;
    active = true;
    start = performance.now();
    m = {};
    product = await resource("product.json");
    baseScene();
    $("metrics").textContent = "{}";
    $("check-status").textContent = "请执行目标流程再记录。";
    $("report").disabled = true;
    $("export").disabled = true;
    $("scene-message").textContent = "本轮准备完成，先执行目标流程。";
    $("status").textContent =
      phase === "baseline"
        ? "故障已准备；先取证，不预设工具。"
        : "对照已准备；保持输入不变再执行。";
  } catch (e) {
    active = false;
    $("status").textContent = e.message;
  } finally {
    setBusy(false);
    $("report").disabled = true;
  }
}
async function searchFlow() {
  let latest = 0;
  const latestExpected = 2;
  await Promise.all(
    ["search-old", "search-new"].map(async (path) => {
      const response = await resource(path);
      console.info("[search response]", response.sequence, response.query);
      if (
        shouldCommitSearch(
          meta.id,
          meta.variant,
          run.good,
          response.sequence,
          latestExpected,
        )
      ) {
        latest = response.sequence;
        $("cart").textContent =
          "搜索结果 " + response.query + " / " + response.sku;
      }
    }),
  );
  let data = {
    schemaVersion: run.good ? 2 : meta.variant === 1 ? 1 : 2,
    filter: run.good || meta.variant === 0 ? "current" : "old",
  };
  localStorage.setItem(storageKey, JSON.stringify(data));
  const stored = JSON.parse(localStorage.getItem(storageKey));
  const restored =
    run.good && stored.schemaVersion !== 2 ? "current" : stored.filter;
  return { latest, restored, cart: Number(product.price) * product.quantity };
}
class AdvancedDetail {
  constructor() {
    this.node = document.createElement("article");
    this.node.className = "detail";
    this.node.textContent = "商品详情 " + product.sku;
    this.payload = new Array(4000).fill(product.sku);
  }
}
async function detailFlow() {
  const generation = taskGeneration;
  const started = performance.now();
  let checksum = 0;
  for (let i = 0; i < 5; i++) {
    const detail = new AdvancedDetail();
    $("fixture").append(detail.node);
    if (!run.good) {
      if (meta.variant === 0) owned.nodes.push(detail);
      else {
        const listener = () => {
          detail.node.style.width = 100 + (detail.node.offsetWidth % 10) + "px";
        };
        window.addEventListener("advanced-stock", listener);
        owned.subscriptions.push(listener);
      }
    }
    // Real deterministic work. Absolute duration is not used as proof of improvement.
    for (let chunk = 0; chunk < 6; chunk++) {
      for (let j = 0; j < 40000; j++) checksum = (checksum + j + i) % 1000003;
      if (run.good) await new Promise((r) => setTimeout(r, 0));
      if (generation !== taskGeneration) throw Error("本轮已停止");
    }
    if (!run.good && meta.variant === 1)
      for (let j = 0; j < 30; j++) {
        detail.node.style.padding = (detail.node.offsetWidth % 7) + 8 + "px";
      }
    detail.node.remove();
    window.dispatchEvent(new Event("advanced-stock"));
  }
  console.info("[detail checksum]", checksum);
  return {
    retained: owned.nodes.length,
    subscriptions: owned.subscriptions.length,
    checksum: Number(product.price) * product.quantity,
    work: run.good ? "chunked" : "synchronous",
    taskDuration: performance.now() - started,
  };
}
async function createMovie() {
  if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream)
    throw Error("当前浏览器不支持本地视频素材录制；记录环境限制。");
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 180;
  const ctx = canvas.getContext("2d"),
    stream = canvas.captureStream(12);
  owned.streams.add(stream);
  const chunks = [];
  recorder = new MediaRecorder(stream, {
    mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
      ? "video/webm;codecs=vp8"
      : "video/webm",
  });
  recorder.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const done = new Promise((resolve, reject) => {
    recorder.onstop = () =>
      resolve(new Blob(chunks, { type: recorder.mimeType }));
    recorder.onerror = () => reject(Error("录制失败"));
  });
  recorder.start();
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? "#dbe9e5" : "#dce8fc";
    ctx.fillRect(0, 0, 320, 180);
    ctx.fillStyle = "#24463e";
    ctx.font = "24px sans-serif";
    ctx.fillText("Little goods " + i, 50, 95);
    await new Promise((r) => setTimeout(r, 80));
    if (!active) throw Error("已停止");
  }
  recorder.stop();
  const blob = await done;
  for (const t of stream.getTracks()) t.stop();
  owned.streams.delete(stream);
  const u = URL.createObjectURL(blob);
  owned.urls.add(u);
  return u;
}
async function mediaFlow() {
  const generation = taskGeneration;
  if (!run.good && meta.variant === 0) {
    media.src = `/advanced/${token}/missing.webm?run=${run.runId}`;
    await new Promise((resolve) => {
      media.addEventListener("error", resolve, { once: true });
      media.load();
    });
    return {
      mediaError: media.error?.code || 1,
      advanced: false,
      forcedPause: false,
    };
  }
  media.src = await createMovie();
  if (generation !== taskGeneration) throw Error("已停止");
  await new Promise((resolve, reject) => {
    media.onloadedmetadata = resolve;
    media.onerror = () => reject(Error("视频解码失败"));
    media.load();
  });
  const events = [];
  for (const name of ["play", "playing", "pause", "timeupdate"])
    media.addEventListener(name, () => events.push(name));
  let pause;
  if (!run.good && meta.variant === 1) {
    pause = () => media.pause();
    media.addEventListener("play", pause, { once: true });
  }
  try {
    await media.play();
  } catch (e) {
    if (run.good) throw e;
  }
  await new Promise((r) => setTimeout(r, 300));
  const advanced = media.currentTime > 0 && !media.paused;
  return {
    mediaError: media.error?.code || 0,
    advanced,
    forcedPause: Boolean(pause && media.paused),
    mediaEvents: events.slice(0, 10).join(","),
  };
}
function hitButton() {
  const rect = $("add").getBoundingClientRect();
  const center = document.elementFromPoint(
    rect.x + rect.width / 2,
    rect.y + rect.height / 2,
  );
  if (center && $("add").contains(center)) $("add").click();
  return {
    clicks,
    hit: center?.closest("button")?.id || center?.id || "outside",
    disabled: $("add").disabled,
  };
}
async function execute() {
  if (!active) return;
  setBusy(true);
  try {
    const id = meta.id,
      v = meta.variant,
      g = run.good;
    switch (id) {
      case "53":
        m = await searchFlow();
        break;
      case "54":
        m = await detailFlow();
        break;
      case "55": {
        $("add").click();
        await detailFlow();
        localStorage.setItem(
          storageKey,
          JSON.stringify({ schemaVersion: !g && v === 1 ? 1 : 2 }),
        );
        const priceInput = product.price;
        const actualPrice =
          typeof priceInput === "string" ? priceInput + "0" : priceInput;
        const total = actualPrice * product.quantity * clicks;
        m = {
          total,
          name: Boolean($("favorite").getAttribute("aria-label")),
          overflow: Math.max(
            0,
            $("product").scrollWidth - $("product").clientWidth,
          ),
          schema: JSON.parse(localStorage.getItem(storageKey)).schemaVersion,
          handlers: clicks,
          retained: owned.nodes.length + owned.subscriptions.length,
        };
        $("cart").textContent = "结算合计 ¥ " + m.total;
        break;
      }
      case "T01": {
        const store = chooseStore(
            { latitude: 31.23, longitude: 121.47 },
            g || v === 1,
          ),
          fallbacks = [1, 2, 3].map((code) =>
            locationFailure(code, g || v === 0),
          );
        m = {
          coordinates:
            store.latitude === 31.23 && store.longitude === 121.47
              ? "correct"
              : "swapped",
          fallbacks: fallbacks.filter((x) => !x.loading && x.manual).length,
        };
        $("cart").textContent =
          `本地夹具：传入 ${m.coordinates === "swapped" ? "121.47 / 31.23（坐标无效）" : "31.23 / 121.47（上海门店）"}；${m.fallbacks}/3 个错误分支可以手动选店`;
        break;
      }
      case "T02": {
        const probe = await resource("probe");
        m = {
          reachable: probe.ok === true,
          mapping: g ? 4174 : v === 0 ? 0 : 4176,
        };
        $("cart").textContent =
          `电脑服务 ${probe.port} 可达；教学拓扑：手机 4174 → ${m.mapping === 0 ? "未配置转发" : m.mapping}。这不证明已连接手机。`;
        break;
      }
      case "T03": {
        const module = await import(
          `/advanced/${token}/cart.js?run=${run.runId}`
        );
        const r = await fetch(
          `/advanced/${token}/cart.js.map?run=${run.runId}`,
        );
        const map = await r.json();
        m = {
          mapStatus: r.status,
          sourceMatches:
            r.ok && map.sourcesContent?.[0]?.includes("price * quantity"),
          total: module.total(Number(product.price), product.quantity),
        };
        $("cart").textContent =
          `实际产物合计 ${m.total}；map HTTP ${m.mapStatus}；源码版本 ${m.sourceMatches ? "一致" : "不一致或缺失"}`;
        break;
      }
      case "T04":
        m = await mediaFlow();
        break;
      case "T05": {
        let errors = 0;
        const fixture = {
          shipping: {
            "given-name": "小林",
            "street-address": "测试路 8 号",
            "postal-code": "200000",
          },
          billing: {
            "given-name": "账单测试人",
            "street-address": "账单路 9 号",
            "postal-code": "100000",
          },
        };
        const expected = {
          given: "given-name",
          street: "street-address",
          postal: "postal-code",
        };
        for (const [field, purpose] of Object.entries(expected)) {
          const input = $(field),
            tokens = input.autocomplete.split(" "),
            scope = tokens.includes("billing") ? "billing" : "shipping",
            actual = tokens.at(-1);
          input.value = fixture[scope][actual] || "";
          if (actual !== purpose || scope !== "shipping") errors++;
        }
        m = { semanticErrors: errors, fixtureMatches: errors === 0 };
        break;
      }
      case "T06": {
        const id = "fixture-" + meta.seed;
        m = credentialPolicy({
          registeredId: id,
          allowedIds: [!g && v === 0 ? "other-credential" : id],
          userVerified: g || v === 0,
          requireUV: true,
        });
        $("cart").textContent =
          `本地协议夹具（非真实认证器）：候选凭据${m.credentialMatch ? "匹配" : "不匹配"}，UV${m.uv ? "满足" : "未满足"}。真实注册与认证使用下方按钮。`;
        break;
      }
      case "T07":
      case "07":
        $("add").scrollIntoView({ block: "center" });
        await new Promise(requestAnimationFrame);
        m = hitButton();
        break;
      case "T08": {
        const messages = [
          { id: 1, method: "DOM.getDocument" },
          { method: "DOM.documentUpdated" },
          { id: 2, result: { nodeId: 5 } },
          { id: 1, result: { root: { nodeId: 1 } } },
        ];
        const paired = pairProtocol(messages, g || v === 1);
        const documentVersion = 2,
          nodeVersion = !g && v === 1 ? 1 : 2;
        m = { matched: paired.matched, fresh: nodeVersion === documentVersion };
        const p = document.createElement("pre");
        p.textContent = JSON.stringify(
          {
            teachingMessages: [
              { id: 1, method: "DOM.getDocument" },
              { method: "DOM.documentUpdated" },
              { id: 2, result: { nodeId: 5 } },
              { id: 1, result: { root: { nodeId: 1 } } },
            ],
            selectedResponseId: m.matched ? 1 : 2,
            nodeDocument: m.fresh ? "current" : "previous",
          },
          null,
          2,
        );
        $("fixture").replaceChildren(p);
        break;
      }
      case "05":
        m = { color: getComputedStyle($("price")).color };
        break;
      case "09": {
        const order = {
          price: Number(product.price),
          quantity: product.quantity,
          coupon: "SAVE5",
          stock: 0,
        };
        const result = checkout(order, g, v);
        m = { total: result.total, stockBlocked: result.blocked };
        $("cart").textContent = result.blocked
          ? "库存不足，未创建订单"
          : "合计 ¥ " + result.total;
        break;
      }
      case "12": {
        const snapshot = { price: product.price };
        const captured = g || v === 1 ? { ...snapshot } : snapshot;
        console.info("[price at observation]", captured);
        snapshot.price += 1;
        let finished = false;
        const task = new Promise((resolve) =>
          setTimeout(() => {
            finished = true;
            resolve();
          }, 60),
        );
        console.time("async-price");
        if (g || v === 0) await task;
        const finishedAtTimeEnd = finished;
        console.timeEnd("async-price");
        m = {
          snapshot: captured.price === product.price ? "original" : "changed",
          awaited: finishedAtTimeEnd,
        };
        await task;
        break;
      }
      case "16": {
        const items =
          v === 0
            ? [
                { price: meta.seed, quantity: product.quantity - 1, stock: 10 },
                { price: String(meta.seed), quantity: 1, stock: 10 },
              ]
            : [
                { price: meta.seed, quantity: product.quantity, stock: 10 },
                { price: meta.seed, quantity: 1, stock: -1 },
              ];
        m = auditInventory(items, g, v);
        console.table(items);
        $("cart").textContent = "库存检查合计 " + m.accepted;
        break;
      }
      case "18":
        if (v === 0) {
          try {
            const result = JSON.parse(
              !g ? "{broken" : JSON.stringify({ quantity: product.quantity }),
            );
            m = { parsed: result.quantity === product.quantity, latest: 2 };
          } catch (e) {
            console.warn("[caught config]", e);
            m = { parsed: false, latest: 2 };
          }
        } else m = { ...(await searchFlow()), parsed: true };
        break;
    }
    m.expected = product.expected;
    m.visible = document.visibilityState === "visible";
    m.duration = performance.now() - start;
    refreshInspection();
    $("scene-message").textContent =
      "目标流程已执行。记录实际现象后回传；页面不读取 DevTools 点击。";
    $("report").disabled = false;
  } catch (e) {
    $("scene-message").textContent = e.message;
  } finally {
    setBusy(false);
    $("report").disabled = !Object.hasOwn(m, "expected");
  }
}
function refreshInspection() {
  if (!active || !Object.hasOwn(m, "expected")) return;
  if (["T07", "07"].includes(meta.id)) {
    m = { ...m, clicks, disabled: $("add").disabled };
  }
  if (meta.id === "05") m.color = getComputedStyle($("price")).color;
  if (meta.id === "55") {
    m.name = Boolean($("favorite").getAttribute("aria-label"));
    m.overflow = Math.max(
      0,
      $("product").scrollWidth - $("product").clientWidth,
    );
    m.releaseChecked = [...$("matrix").querySelectorAll("textarea")].every(
      (x) => x.value.trim().length > 0,
    );
  }
  m.visible = document.visibilityState === "visible";
  m.duration = performance.now() - start;
  $("metrics").textContent = JSON.stringify(m, null, 2);
}
async function report() {
  setBusy(true);
  try {
    refreshInspection();
    const result = await post("report", { runId: run.runId, metrics: m });
    lastObservation = {
      lesson: meta.id,
      mode: meta.mode,
      phase: run.phase,
      metrics: { ...m },
      result,
      native: {
        status: $("native-state").value,
        note: $("native-note").value,
        result: nativeResult,
      },
      release: [...$("matrix").querySelectorAll("textarea")].map((x) => ({
        panel: x.getAttribute("aria-label"),
        note: x.value,
      })),
      environment: navigator.userAgent,
      at: new Date().toISOString(),
    };
    $("check-status").textContent = result.passed
      ? "本轮页面检查通过，已回传教程。"
      : "本轮条件尚未成立，请恢复后重新运行并取证。";
    if (result.passed && run.phase === "baseline") $("repair").hidden = false;
    notify(result.phase, result.passed);
    $("export").disabled = false;
  } catch (e) {
    $("check-status").textContent = e.message;
  } finally {
    setBusy(false);
    $("report").disabled = true;
  }
}
const from64 = (s) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0),
  );
const to64 = (b) =>
  btoa(String.fromCharCode(...new Uint8Array(b)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
async function nativeAuth(action) {
  const controller = new AbortController();
  owned.controllers.add(controller);
  setBusy(true);
  try {
    const options = await post("native-options", { action });
    options.challenge = from64(options.challenge);
    if (options.user) options.user.id = from64(options.user.id);
    if (options.allowCredentials)
      options.allowCredentials = options.allowCredentials.map((c) => ({
        ...c,
        id: from64(c.id),
      }));
    const credential = await navigator.credentials[
      action === "register" ? "create" : "get"
    ]({ publicKey: options, signal: controller.signal });
    if (!credential) throw Error("没有返回凭据");
    const r = credential.response;
    nativeResult = await post(
      action === "register" ? "native-register" : "native-verify",
      {
        id: credential.id,
        clientDataJSON: to64(r.clientDataJSON),
        ...(action === "register"
          ? { attestationObject: to64(r.attestationObject) }
          : {
              authenticatorData: to64(r.authenticatorData),
              signature: to64(r.signature),
            }),
      },
    );
    nativeResult = {
      ...nativeResult,
      action,
      runId: run.runId,
      at: new Date().toISOString(),
    };
    $("native-result").textContent = JSON.stringify(nativeResult, null, 2);
  } catch (e) {
    nativeResult = {
      action,
      runId: run?.runId,
      completed: false,
      error: e.name,
      message: e.message,
      at: new Date().toISOString(),
    };
    $("native-result").textContent =
      `真实 WebAuthn 未完成：${e.name} ${e.message}；取消、候选不匹配、UV 与超时须结合面板区分。`;
  } finally {
    owned.controllers.delete(controller);
    setBusy(false);
  }
}
$("geo").onclick = () => {
  if (!navigator.geolocation) {
    $("native-result").textContent = "此环境没有 Geolocation";
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (p) => {
      if (!active) return;
      $("native-result").textContent = JSON.stringify(
        {
          source: "actual browser Geolocation",
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
          business: chooseStore(p.coords, run.good || meta.variant === 1),
        },
        null,
        2,
      );
    },
    (e) => {
      if (!active) return;
      $("native-result").textContent = JSON.stringify(
        {
          source: "actual browser Geolocation",
          code: e.code,
          message: e.message,
          business: locationFailure(e.code, run.good || meta.variant === 0),
        },
        null,
        2,
      );
    },
    { timeout: 8000, maximumAge: 0 },
  );
};
$("orientation").onclick = async () => {
  try {
    if (typeof DeviceOrientationEvent === "undefined")
      throw Error("不支持方向 API");
    if (
      DeviceOrientationEvent.requestPermission &&
      (await DeviceOrientationEvent.requestPermission()) !== "granted"
    )
      throw Error("方向权限未授予");
    if (orientationHandler)
      window.removeEventListener("deviceorientation", orientationHandler);
    orientationHandler = (e) => {
      $("native-result").textContent = JSON.stringify(
        {
          source: "actual deviceorientation event",
          alpha: e.alpha,
          beta: e.beta,
          gamma: e.gamma,
          absolute: e.absolute,
        },
        null,
        2,
      );
    };
    window.addEventListener("deviceorientation", orientationHandler);
    $("native-result").textContent =
      "正在等待实际方向事件；无事件不代表 Sensors 操作已完成。";
  } catch (e) {
    $("native-result").textContent = e.message;
  }
};
$("baseline").onclick = () => begin("baseline");
$("restore").onclick = () => begin("baseline");
$("fixed").onclick = () => begin("fixed");
$("execute").onclick = execute;
$("inspect").onclick = refreshInspection;
$("report").onclick = report;
$("register").onclick = () => nativeAuth("register");
$("authenticate").onclick = () => nativeAuth("authenticate");
$("stop").onclick = () => {
  active = false;
  clearResources(true);
  $("status").textContent =
    "已停止并清理本会话引用、订阅、媒体与 Storage；重新运行可再次开始。";
  setBusy(false);
};
$("export").onclick = () => {
  if (!lastObservation) return;
  const exported = {
    ...lastObservation,
    exportedAt: new Date().toISOString(),
    native: {
      status: $("native-state").value,
      note: $("native-note").value,
      result: nativeResult,
    },
    release: [...$("matrix").querySelectorAll("textarea")].map((x) => ({
      panel: x.getAttribute("aria-label"),
      note: x.value,
    })),
  };
  const blob = new Blob([JSON.stringify(exported, null, 2)], {
      type: "application/json",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "devtools-observation-" + lastObservation.lesson + ".json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
window.addEventListener("pagehide", () => {
  active = false;
  clearResources();
});
try {
  meta = await api("/api/advanced/lesson?token=" + token);
  $("title").textContent = meta.chapter
    ? "独立商城案例"
    : meta.id.startsWith("T")
      ? meta.hook
      : "综合商城案例";
  $("symptom").textContent = meta.chapter
    ? {
        elements:
          "商城的价格样式或加购交互不符合预期。请自行选择工具，找出实际原因。",
        console:
          "结算或记录的观察值不符合预期。请保留输入和输出，自行寻找可信证据。",
        sources:
          "商城计算或异步流程产生错误结果。请自行找到值得暂停的代码与时机。",
      }[meta.chapter]
    : meta.symptom;
  for (const option of meta.fixes) {
    const o = document.createElement("option");
    o.value = option.id;
    o.textContent = option.label;
    $("correction").append(o);
  }
  for (const step of meta.steps) {
    const li = document.createElement("li");
    li.textContent = step;
    $("steps").append(li);
  }
  $("instructions").hidden =
    Boolean(meta.chapter) || ["53", "54", "55"].includes(meta.id);
  $("environment").textContent = navigator.userAgent;
  const authURL = new URL(location.href);
  authURL.hostname = "localhost";
  authURL.searchParams.delete("tutorial");
  $("auth-localhost").href = authURL.href;
  $("auth-origin-note").hidden = location.hostname === "localhost";
  $("status").textContent = "会话已准备。先运行故障，再执行目标流程。";
  setBusy(false);
  setTimeout(
    () => {
      active = false;
      clearResources();
      $("status").textContent = "会话已过期，本页资源已停止。回教程重新准备。";
      meta = null;
      setBusy(false);
    },
    Math.max(0, Date.parse(meta.expiresAt) - Date.now()),
  );
} catch (e) {
  $("status").textContent = e.message;
  setBusy(true);
}
