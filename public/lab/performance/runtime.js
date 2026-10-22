const token = location.pathname.split("/")[2],
  query = new URLSearchParams(location.search),
  runId = query.get("run"),
  tutorial = query.get("tutorial");
const allowed = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);
const $ = (id) => document.getElementById(id),
  round = (n) => Math.round(n * 10) / 10;
let meta,
  run,
  busy = false,
  initializing = true,
  cancelled = false,
  controller = new AbortController(),
  observers = [],
  animations = [],
  metrics = {},
  entries = { lcp: [], events: [], shifts: [], longtasks: [] },
  prepared = {};
const environment = {
  viewport: innerWidth + " × " + innerHeight,
  dpr: devicePixelRatio,
  visibility: document.visibilityState,
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  userAgent: navigator.userAgent,
  conditions: "CPU / Network / 缓存条件请在 DevTools 手工记录",
};
function observe(type, key, mapper, extra = {}) {
  if (!PerformanceObserver.supportedEntryTypes.includes(type)) {
    entries[key] = { unsupported: true };
    return;
  }
  const o = new PerformanceObserver((list) => {
    if (Array.isArray(entries[key]))
      entries[key].push(...list.getEntries().map(mapper));
  });
  try {
    o.observe({ type, buffered: true, ...extra });
    observers.push(o);
  } catch (error) {
    entries[key] = { unsupported: true, reason: error.name };
  }
}
observe("largest-contentful-paint", "lcp", (e) => ({
  startTime: round(e.startTime),
  renderTime: round(e.renderTime),
  loadTime: round(e.loadTime),
  size: e.size,
  element: e.element?.id || e.element?.tagName,
  url: e.url,
}));
observe(
  "event",
  "events",
  (e) => ({
    name: e.name,
    startTime: round(e.startTime),
    duration: e.duration,
    processingStart: round(e.processingStart),
    processingEnd: round(e.processingEnd),
    interactionId: e.interactionId,
  }),
  { durationThreshold: 16 },
);
observe("layout-shift", "shifts", (e) => ({
  startTime: round(e.startTime),
  value: e.value,
  hadRecentInput: e.hadRecentInput,
  sources: e.sources?.map((s) => ({
    node: s.node?.id || s.node?.tagName,
    previous: s.previousRect?.toJSON(),
    current: s.currentRect?.toJSON(),
  })),
}));
observe("longtask", "longtasks", (e) => ({
  startTime: round(e.startTime),
  duration: round(e.duration),
  name: e.name,
}));
async function api(path, body) {
  const response = await fetch("/api/performance/" + path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.any([controller.signal, AbortSignal.timeout(6000)]),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "实验请求失败");
  return data;
}
function resource(name) {
  return `/performance/${token}/${name}?run=${run.id}`;
}
function delay(ms) {
  return new Promise((resolve, reject) => {
    const signal = controller.signal;
    if (signal.aborted) return reject(new DOMException("已停止", "AbortError"));
    const done = () => {
      signal.removeEventListener("abort", abort);
      resolve();
    };
    const timer = setTimeout(done, ms),
      abort = () => {
        clearTimeout(timer);
        reject(new DOMException("已停止", "AbortError"));
      };
    signal.addEventListener("abort", abort, { once: true });
  });
}
function frame() {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("未取得绘制帧；请保持商城可见再重跑")),
      2500,
    );
    requestAnimationFrame((time) => {
      clearTimeout(timer);
      cancelled ? reject(new Error("任务已停止")) : resolve(time);
    });
  });
}
async function painted() {
  await frame();
  await frame();
}
function consumeCPU(ms) {
  const start = performance.now();
  let value = 0;
  while (performance.now() - start < ms) {
    for (let i = 0; i < 1000; i++) value = (value + i) % 997;
  }
  return value;
}
function checksum() {
  return meta.seed * meta.quantity;
}
function toggle() {
  for (const id of [
    "run",
    "apply",
    "reset",
    "target",
    "correction",
    "detail",
    "checkout",
    "pause",
    "replay",
    "export",
  ])
    $(id).disabled =
      initializing ||
      busy ||
      !meta ||
      (id === "target" && (run?.reported || cancelled)) ||
      (["target", "detail", "checkout", "pause", "replay", "export"].includes(
        id,
      ) &&
        !run);
  $("stop").disabled = initializing || !run;
}
function stop() {
  cancelled = true;
  controller.abort();
  for (const o of observers) o.disconnect();
  for (const a of document.getAnimations()) a.cancel();
  $("status").textContent = "本页任务与动画已停止。需要继续时重新运行故障。";
  $("run").disabled = false;
  $("reset").disabled = false;
  $("apply").disabled = false;
  $("correction").disabled = false;
}
window.addEventListener("pagehide", () => {
  controller.abort();
  for (const o of observers) o.disconnect();
  for (const a of document.getAnimations()) a.cancel();
});
async function perform(action) {
  if (busy) return;
  busy = true;
  toggle();
  try {
    await action();
  } catch (error) {
    $("status").textContent =
      error.name === "AbortError"
        ? "本页任务已停止，请重新运行。"
        : error.message;
    console.warn("[performance-lab]", error);
  } finally {
    busy = false;
    toggle();
  }
}
async function start(phase, correction = "") {
  if (controller.signal.aborted) controller = new AbortController();
  const next = await api("begin", { token, phase, correction });
  const url = new URL(location.href);
  url.searchParams.set("run", next.runId);
  location.assign(url);
}
function drawResult(text) {
  $("feedback").textContent = text;
}
async function loadHero() {
  const image = new Image();
  image.id = "product-hero";
  image.alt = "晨间陶瓷杯实物示意";
  const loaded = new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("主图未加载；请恢复资源阻断与网络"));
  });
  prepared.heroRequested = performance.now();
  image.src = resource("hero.svg");
  $("hero").append(image);
  await loaded;
  prepared.heroLoaded = performance.now();
  await painted();
  prepared.heroPainted = performance.now();
}
async function setupLoad() {
  const begin = performance.now(),
    id = meta.id,
    good = run.good;
  prepared.begin = begin;
  const reserve = good || id === "31" || (id === "32" && run.variant === 1);
  $("hero").classList.toggle("reserved", reserve);
  $("promotion").classList.toggle("reserved", good);
  document.body.classList.add("ready");
  await painted();
  const before = $("target").getBoundingClientRect().top;
  if (id === "31") {
    if (good) {
      if (run.variant === 0)
        await Promise.all([
          loadHero(),
          fetch(resource("recommendations"), {
            signal: controller.signal,
          }).then((r) => r.json()),
        ]);
      else {
        await loadHero();
        await delay(0);
        consumeCPU(220 + (meta.seed % 30));
      }
    } else {
      if (!good && run.variant === 0)
        await fetch(resource("recommendations"), {
          signal: controller.signal,
        }).then((r) => r.json());
      if (!good && run.variant === 1) {
        const image = new Image();
        image.id = "product-hero";
        image.alt = "晨间陶瓷杯实物示意";
        const wait = new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
        });
        prepared.heroRequested = performance.now();
        image.src = resource("hero.svg");
        await wait;
        prepared.heroLoaded = performance.now();
        consumeCPU(220 + (meta.seed % 30));
        $("hero").append(image);
        await painted();
        prepared.heroPainted = performance.now();
      } else await loadHero();
    }
  } else if (id === "32") {
    if (run.variant === 0) {
      await delay(750);
      await loadHero();
    } else {
      await loadHero();
      await delay(750);
      $("promotion").innerHTML =
        '<div class="offer">今日包邮 · 促销信息已到达</div>';
      await painted();
    }
  } else {
    if (!good) await delay(run.variant === 0 ? 380 : 50);
    await loadHero();
    await delay(650);
    $("promotion").innerHTML =
      '<div class="offer">今日包邮 · 固定数据下比较体验目标</div>';
    await painted();
  }
  prepared.shiftPx = Math.abs($("target").getBoundingClientRect().top - before);
  prepared.discoveryDelay = prepared.heroRequested - begin;
  prepared.renderDelay = prepared.heroPainted - prepared.heroLoaded;
  prepared.heroLoadedOK = true;
}
const normalizationCache = new Map();
function normalizeProduct(cost) {
  metrics.normalizeCalls++;
  const t = performance.now();
  let normalized = { sku: meta.sku, quantity: meta.quantity };
  if (run.variant === 0) {
    for (let i = 0; i < 3; i++) {
      if (run.good && normalizationCache.has(meta.sku)) {
        normalized = normalizationCache.get(meta.sku);
        continue;
      }
      consumeCPU(60);
      normalized = {
        sku: meta.sku.trim().toUpperCase(),
        quantity: Number(meta.quantity),
      };
      if (run.good) normalizationCache.set(meta.sku, normalized);
    }
  } else consumeCPU(cost);
  metrics.normalizeMs += performance.now() - t;
  return { ...normalized, value: meta.seed * normalized.quantity };
}
function filterCatalog() {
  metrics.normalizeCalls = 0;
  metrics.normalizeMs = 0;
  let result;
  const count = !run.good && run.variant === 1 ? 6 : 1;
  for (let i = 0; i < count; i++) result = normalizeProduct(28);
  return result;
}
function renderResults() {
  metrics.renderCalls++;
  consumeCPU(45);
  drawResult(`${meta.sku} · 数量 ${meta.quantity} · 校验值 ${checksum()}`);
}
function searchCatalog() {
  metrics.operationCount++;
  consumeCPU(75);
  renderResults();
}
async function searchWithYield() {
  metrics.yields = 0;
  metrics.maxBlock = 0;
  let result = 0;
  drawResult("搜索中…等待主线程有机会绘制");
  const started = performance.now();
  let feedbackAt;
  const feedbackPaint = painted().then(() => {
    feedbackAt = performance.now() - started;
  });
  for (let i = 0; i < 6; i++) {
    const t = performance.now();
    consumeCPU(34);
    metrics.maxBlock = Math.max(metrics.maxBlock, performance.now() - t);
    result += checksum() / 6;
    if (run.good) {
      await delay(0);
      metrics.yields++;
    } else if (run.variant === 1) await Promise.resolve();
  }
  if (!run.good) metrics.maxBlock = performance.now() - started;
  await feedbackPaint;
  metrics.feedbackPaint = feedbackAt;
  drawResult(`${meta.sku} · 计算完成，校验值 ${Math.round(result)}`);
  return Math.round(result);
}
async function updateFloating() {
  const host = $("workbench");
  host.innerHTML =
    '<div class="scroll-scene" id="scroll-scene"><div class="floating" id="floating">商品浮层</div><div id="layout-items"></div></div>';
  const nodes = [];
  for (let i = 0; i < 36; i++) {
    const node = document.createElement("div");
    node.className = "layout-item";
    $("layout-items").append(node);
    nodes.push(node);
  }
  await painted();
  metrics.layoutReads = 0;
  metrics.frames = 0;
  metrics.animatedProperty = run.good ? "transform" : "left";
  for (let i = 0; i < 24; i++) {
    if (cancelled) throw new Error("任务已停止");
    $("scroll-scene").scrollTop = i * 4;
    const width = 100 + (i % 2) * 30;
    if (run.variant === 0) {
      if (run.good) {
        nodes[0].getBoundingClientRect();
        metrics.layoutReads++;
        for (const node of nodes) node.style.width = width + "px";
      } else
        for (const node of nodes) {
          node.style.width = width + "px";
          node.getBoundingClientRect();
          metrics.layoutReads++;
        }
    } else {
      const floating = $("floating");
      if (run.good) {
        floating.style.transform = `translateX(${i * 4}px)`;
        floating.style.left = "0px";
        floating.style.boxShadow = "none";
      } else {
        floating.style.left = i * 4 + "px";
        floating.style.boxShadow = `0 0 ${30 + i}px rgba(30,90,160,.6)`;
      }
    }
    metrics.frames++;
    await frame();
  }
  drawResult(
    `${meta.sku} · 浮层更新完成；显式几何读取 ${metrics.layoutReads} 次`,
  );
}
let detailModule,
  checkoutModule,
  themeLoaded = false;
async function loadTheme() {
  if (themeLoaded) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = resource("themes.css");
  await new Promise((resolve, reject) => {
    link.onload = resolve;
    link.onerror = () => reject(new Error("详情样式未加载"));
    document.head.append(link);
  });
  themeLoaded = true;
}
async function setupCoverage() {
  if (!run.good && run.variant === 0) {
    [detailModule, checkoutModule] = await Promise.all([
      import(resource("details.js")),
      import(resource("checkout.js")),
    ]);
  }
  if (!run.good && run.variant === 1) await loadTheme();
  $("detail").hidden = false;
  $("checkout").hidden = false;
  await painted();
}
function requested(name) {
  return performance
    .getEntriesByType("resource")
    .some((e) => e.name.includes(`/performance/${token}/${name}`));
}
async function openFeature(kind) {
  if (kind === "details") {
    detailModule ||= await import(resource("details.js"));
    await loadTheme();
  } else checkoutModule ||= await import(resource("checkout.js"));
  const module = kind === "details" ? detailModule : checkoutModule;
  const result = module.openFeature(meta.sku, meta.quantity);
  $("secondary").classList.add("detail-screen");
  $("secondary").textContent =
    `${result.screen === "details" ? "详情" : "结算"}正常：${result.sku} / 数量 ${result.quantity} / ${result.ok ? "可用" : "失败"}`;
}
function startAnimations() {
  const bench = $("workbench");
  for (const a of bench.getAnimations({ subtree: true })) a.cancel();
  bench.className = "";
  bench.innerHTML =
    '<span class="cart-chip">已加购 ' +
    meta.quantity +
    '</span><aside class="drawer">购物车侧栏 · ' +
    meta.sku +
    "</aside>";
  bench.style.setProperty("--motion-duration", run.good ? "360ms" : "1600ms");
  if (run.variant === 1 && !run.good) bench.classList.add("ignore-reduce");
  if (run.good) bench.classList.add("honor-reduce");
  if ($("reduce-preview").checked) bench.classList.add("reduce-preview");
  bench.offsetWidth;
  bench.classList.add("animating");
  animations = bench.getAnimations({ subtree: true });
  $("pause").textContent = "暂停动画";
  $("pause").hidden = false;
  $("replay").hidden = false;
  return animations;
}
async function setupAnimation() {
  $("reduce-control").hidden = false;
  $("reduce-preview").checked = run.variant === 1;
  drawResult("先打开 Animations，再执行目标操作。站内预览不改变系统偏好。");
}
async function targetOperation() {
  if (!run) throw new Error("先运行故障");
  metrics = {
    duration: 0,
    checksum: checksum(),
    expected: checksum(),
    visible: document.visibilityState === "visible",
  };
  performance.clearMarks();
  performance.clearMeasures();
  const mark = `devtools:${meta.id}:target`;
  performance.mark(mark + ":start");
  console.timeStamp(mark + ":start");
  const t = performance.now();
  if (meta.id === "27") {
    const cpu = performance.now();
    consumeCPU(run.good ? 4 : run.variant === 0 ? 110 : 230 + (meta.seed % 20));
    metrics.cpuMs = round(performance.now() - cpu);
    Object.assign(metrics, {
      discoveryDelay: round(prepared.discoveryDelay),
      shiftPx: round(prepared.shiftPx),
      heroLoaded: prepared.heroLoadedOK,
    });
    drawResult(`${meta.sku} · 已完成搜索，保持校验值 ${checksum()}`);
  }
  if (meta.id === "28") {
    metrics.operationCount = 0;
    metrics.renderCalls = 0;
    const count = !run.good && run.variant === 0 ? 3 : 1;
    for (let i = 0; i < count; i++) searchCatalog();
    if (!run.good && run.variant === 1) {
      renderResults();
      renderResults();
    }
  }
  if (meta.id === "29") {
    const result = filterCatalog();
    metrics.checksum = result.value;
    drawResult(
      `${result.sku} · 数量 ${result.quantity} · 校验值 ${result.value}`,
    );
  }
  if (meta.id === "30") metrics.checksum = await searchWithYield();
  if (meta.id === "31") {
    Object.assign(metrics, {
      discoveryDelay: round(prepared.discoveryDelay),
      renderDelay: round(prepared.renderDelay),
      heroLoaded: prepared.heroLoadedOK,
    });
    drawResult(`${meta.sku} · 主图已呈现，比较请求与 Main`);
  }
  if (meta.id === "32") {
    Object.assign(metrics, {
      shiftPx: round(prepared.shiftPx),
      heroLoaded: prepared.heroLoadedOK,
    });
    drawResult(`${meta.sku} · 按钮几何位移 ${metrics.shiftPx}px`);
  }
  if (meta.id === "33") await updateFloating();
  if (meta.id === "34") {
    Object.assign(metrics, {
      detailRequested: requested("details.js"),
      checkoutRequested: requested("checkout.js"),
      themeRequested: requested("themes.css"),
    });
    drawResult(`${meta.sku} · 首页已记录；继续验证详情和结算`);
  }
  if (meta.id === "51") {
    const animations = startAnimations();
    const timings = animations.map((a) => a.effect.getTiming());
    metrics.animationDuration = timings.length
      ? Math.max(...timings.map((x) => Number(x.duration)))
      : 0;
    metrics.reducedPreview =
      $("reduce-preview").checked ||
      matchMedia("(prefers-reduced-motion: reduce)").matches;
    metrics.configuredDuration = parseFloat(
      getComputedStyle($("workbench")).getPropertyValue("--motion-duration"),
    );
    metrics.motionSuppressed = animations.length === 0;
    drawResult(`${meta.sku} · 已加购 ${meta.quantity} 件，侧栏可用`);
  }
  metrics.duration = round(performance.now() - t);
  performance.mark(mark + ":end");
  performance.measure(mark, mark + ":start", mark + ":end");
  console.timeStamp(mark + ":end");
  metrics.markCount = 2;
  await painted();
  await delay(30);
  metrics.visible = document.visibilityState === "visible";
  show();
  await report();
}
function show() {
  const m = metrics;
  const summaries = {
    27: `主图发现等待 ${m.discoveryDelay}ms；搜索处理 ${m.cpuMs}ms；按钮移动 ${m.shiftPx}px。分别选择加载、交互与稳定性的证据。`,
    28: `一次动作执行 ${m.operationCount} 次搜索、${m.renderCalls} 次渲染。用目标标记缩小选区，再关联 Main 和截图。`,
    29: `normalizeProduct 调用 ${m.normalizeCalls} 次，累计约 ${round(m.normalizeMs || 0)}ms。区分单次成本和调用次数。`,
    30: `总操作约 ${m.duration}ms，最长连续分块约 ${round(m.maxBlock || 0)}ms；反馈绘制机会约 ${round(m.feedbackPaint || 0)}ms。校验值 ${m.checksum}。`,
    31: `主图发现约 ${m.discoveryDelay}ms；资源到达后的呈现等待约 ${m.renderDelay}ms。请求与 Main 要一起看。`,
    32: `目标按钮移动 ${m.shiftPx}px。请检查 LayoutShift 原始条目与触发内容；这里没有把 px 换算成 CLS。`,
    33: `${m.frames} 帧更新中显式读取几何 ${m.layoutReads} 次，运动属性 ${m.animatedProperty}。浏览器 Layout / Paint 次数仍需实际录制。`,
    34: `首页详情模块${m.detailRequested ? "已" : "未"}请求，结算模块${m.checkoutRequested ? "已" : "未"}请求，详情样式${m.themeRequested ? "已" : "未"}请求。继续验证其他流程。`,
    51: `浏览器动画时长 ${m.animationDuration}ms；${m.motionSuppressed ? "当前没有位移动画" : "当前有 CSS 动画"}。确认最终加购和侧栏功能仍可用。`,
  };
  $("summary").textContent = summaries[meta.id];
  const resourceEntries = performance
    .getEntriesByType("resource")
    .filter((e) => e.name.includes("/performance/"))
    .map((e) => ({
      name: e.name,
      startTime: round(e.startTime),
      duration: round(e.duration),
      transferSize: e.transferSize,
    }));
  $("metrics").textContent = JSON.stringify(metrics, null, 2);
  $("entries").textContent = JSON.stringify(
    {
      environment: { ...environment, visibility: document.visibilityState },
      browser: entries,
      resources: resourceEntries,
      userTiming: performance.getEntriesByType("measure").map((e) => ({
        name: e.name,
        startTime: round(e.startTime),
        duration: round(e.duration),
      })),
      scope:
        "原始 LCP 候选 / Event Timing / LayoutShift / LongTask；不输出正式 INP 或 CLS",
    },
    null,
    2,
  );
}
async function report() {
  const result = await api("report", { token, runId: run.id, metrics });
  $("checks").replaceChildren(
    ...result.checks.map((c) => {
      const li = document.createElement("li");
      li.className = c.passed ? "pass" : "fail";
      li.textContent = (c.passed ? "✓ " : "○ ") + c.label;
      return li;
    }),
  );
  const connected =
    window.opener && !window.opener.closed && allowed.has(tutorial);
  if (result.passed && connected)
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
    ? run.phase === "baseline"
      ? "故障已复现并记录。请保留录制，再运行正常对照。"
      : connected
        ? "修复检查通过，已回传教程。请核对真实录制与结果。"
        : "修复检查通过。当前页面未连接教程，请从课程入口重新打开实验。"
    : "当前对照未通过，请核对原因、环境与目标行为后重新运行。";
  $("target").disabled = true;
  run.reported = true;
}
$("run").onclick = () => perform(() => start("baseline"));
$("reset").onclick = $("run").onclick;
$("apply").onclick = () =>
  perform(() => {
    if (!$("correction").value) throw new Error("先选择对照方案");
    return start("fixed", $("correction").value);
  });
$("target").onclick = () => perform(targetOperation);
$("stop").onclick = stop;
$("detail").onclick = () => perform(() => openFeature("details"));
$("checkout").onclick = () => perform(() => openFeature("checkout"));
$("pause").onclick = () => {
  const pause = animations.some((a) => a.playState === "running");
  for (const a of animations) pause ? a.pause() : a.play();
  $("pause").textContent = pause ? "继续动画" : "暂停动画";
};
$("replay").onclick = () => startAnimations();
$("reduce-preview").onchange = () => {
  if (animations.length) startAnimations();
};
$("export").onclick = () => {
  show();
  const blob = new Blob(
      [
        JSON.stringify(
          { lesson: meta.id, run: run.id, metrics, entries, environment },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = `devtools-observation-${meta.id}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
toggle();
try {
  meta = await api(`lesson?token=${token}${runId ? "&runId=" + runId : ""}`);
  run = meta.run;
  $("course").textContent = meta.chapter
    ? "Performance 章末任务"
    : `第 ${meta.id} 课 · ${meta.mode === "practice" ? "引导实战" : "独立挑战"}`;
  document.title = $("course").textContent + " · 日常好物";
  $("title").textContent = meta.chapter
    ? "请独立分析本次商城性能问题"
    : meta.hook;
  $("brief").textContent = meta.chapter
    ? "先定义正常表现并选择录制方法；初始不提供课号与操作步骤。"
    : meta.symptom;
  $("sku").textContent =
    `${meta.sku} / 数量 ${meta.quantity} / 固定业务校验值 ${checksum()}`;
  $("guide").hidden = Boolean(meta.chapter);
  $("environment").textContent =
    `${environment.viewport} / DPR ${environment.dpr} / visibility=${environment.visibility} / 当前媒体 reduced motion=${environment.reducedMotion}。没有读取 DevTools 的 CPU / Network 设置。`;
  for (const fix of meta.fixes) {
    const o = document.createElement("option");
    o.value = fix.id;
    o.textContent = fix.label;
    $("correction").append(o);
  }
  for (const step of meta.steps) {
    const li = document.createElement("li");
    li.textContent = step;
    $("steps").append(li);
  }
  if (run?.phase === "fixed") $("correction").value = run.correction || "";
  if (run) {
    if (["27", "31", "32"].includes(meta.id)) await setupLoad();
    if (meta.id === "34") await setupCoverage();
    if (meta.id === "51") await setupAnimation();
    $("status").textContent =
      "场景已准备。录制后点击执行目标操作；加载场景的准备过程也应纳入录制。";
  } else
    $("status").textContent =
      "尚未运行。先打开 DevTools 开始录制，再运行故障。";
} catch (error) {
  $("status").textContent = error.message;
  console.warn("[setup]", error);
} finally {
  initializing = false;
  document.body.classList.add("ready");
  toggle();
}
