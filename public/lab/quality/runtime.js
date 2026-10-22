import { summarizeLighthouse, median, qualityCategories } from "./report.js";
const $ = (id) => document.getElementById(id),
  token = location.pathname.split("/")[2],
  tutorial = new URLSearchParams(location.search).get("tutorial"),
  allowed = new Set([
    "http://127.0.0.1:4173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://localhost:5173",
  ]);
let meta,
  run,
  product,
  busy = false,
  stopped = false,
  targetDone = false,
  started = 0,
  quantity = 0,
  filterWorked = false,
  violations = 0,
  offerReady = false,
  profileAccepted = false,
  expiry,
  auditWindow = null,
  reports = [],
  latestDetails = null;
const controllers = new Set(),
  ownedScripts = new Set();
async function api(path, data) {
  const c = new AbortController();
  controllers.add(c);
  const t = setTimeout(() => c.abort(), 6000);
  try {
    const r = await fetch("/api/quality/" + path, {
      method: data ? "POST" : "GET",
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      signal: c.signal,
    });
    const value = await r.json();
    if (!r.ok) throw Error(value.error || "请求失败");
    return value;
  } finally {
    clearTimeout(t);
    controllers.delete(c);
  }
}
async function resource(path, options = {}) {
  const c = new AbortController();
  controllers.add(c);
  const t = setTimeout(() => c.abort(), 6000);
  try {
    const r = await fetch(`/quality/${token}/${path}`, {
      ...options,
      signal: c.signal,
    });
    if (!r.ok) throw Error("资源请求失败 " + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
    controllers.delete(c);
  }
}
function cartWorked() {
  return Boolean(
    product &&
      typeof product.unitPrice === "number" &&
      product.stock !== null &&
      product.stock >= meta.quantity &&
      quantity === meta.quantity &&
      product.sku === meta.sku &&
      product.unitPrice * quantity === meta.seed * meta.quantity,
  );
}
function metrics() {
  const width = innerWidth,
    grid = $("product-grid").getBoundingClientRect(),
    panel = $("filter-panel").getBoundingClientRect();
  return {
    visible: document.visibilityState === "visible",
    duration: Math.round(performance.now() - started),
    checksum: meta.seed * meta.quantity,
    expected: meta.seed * meta.quantity,
    manualChecked: $("manual-check").checked,
    width,
    dpr: devicePixelRatio,
    gridOverflow: Math.max(0, Math.round(grid.right - width)),
    panelOverflow: $("filter-panel").hidden
      ? 0
      : Math.max(0, Math.round(panel.right - width)),
    rootOverflow: Math.max(0, document.documentElement.scrollWidth - width),
    filterWorked,
    cartWorked: cartWorked(),
    imageLoaded: $("hero").complete && $("hero").naturalWidth > 0,
    violations,
    offerReady,
    profileAccepted,
    priceType: typeof product?.unitPrice,
    stockMissing: product?.stock === null,
    actualTotal:
      typeof product?.unitPrice === "number" ? product.unitPrice * quantity : 0,
    currentSrc: $("hero").currentSrc.slice(-180),
  };
}
function refresh() {
  if (!meta) return;
  const m = metrics();
  $("metrics").textContent = JSON.stringify(
    { page: m, importedReports: reports.map(({ details, ...r }) => r) },
    null,
    2,
  );
  $("report").disabled =
    !run ||
    busy ||
    stopped ||
    run.reported ||
    !targetDone ||
    (run?.phase === "fixed" &&
      ["46", "47"].includes(meta.id) &&
      !$("manual-check").checked) ||
    (Number(meta.id) <= 47 && reports.length < (meta.id === "47" ? 3 : 1));
  $("execute").disabled = !run || busy || stopped || run.reported;
  $("import-audit").disabled =
    !run || busy || stopped || run.reported || reports.length >= 3;
  $("export").disabled = !run;
}
function clearOwned() {
  for (const c of controllers) c.abort();
  controllers.clear();
  for (const script of ownedScripts) script.remove();
  ownedScripts.clear();
  delete document.documentElement.dataset.qualityOffer;
  quantity = 0;
  filterWorked = false;
  violations = 0;
  offerReady = false;
  profileAccepted = false;
  $("filter-panel").hidden = true;
  $("cart").textContent = "购物车为空";
}
function stop() {
  stopped = true;
  clearOwned();
  busy = false;
  fetch(`/quality/${token}/cleanup`, { keepalive: true }).catch(() => {});
  if (auditWindow && !auditWindow.closed) auditWindow.close();
  auditWindow = null;
  if (meta) {
    $("status").textContent =
      "本页任务已停止，本会话 Cookie 已请求清理。工具中的限速、覆盖与视口设置请手动恢复。";
    refresh();
  }
}
function showProduct() {
  if (!product) return;
  $("product-context").textContent =
    `${product.sku} / 数量 ${product.quantity} / 输入校验值 ${meta.seed * meta.quantity}`;
  $("price").textContent =
    typeof product.unitPrice === "number"
      ? `单价 ${product.unitPrice}`
      : "计算失败：unitPrice 应为数值";
  $("stock").textContent =
    product.stock === null
      ? "库存缺失，页面错误地当作售罄"
      : `库存 ${product.stock}`;
  $("add-cart").disabled =
    typeof product.unitPrice !== "number" ||
    product.stock === null ||
    product.stock < meta.quantity;
}
async function begin(phase, manual = false) {
  if (busy) return;
  busy = true;
  refresh();
  try {
    const response = await api("begin", {
      token,
      phase,
      correction: manual ? "manual" : $("correction").value,
    });
    const data = await api(`lesson?token=${token}&runId=${response.runId}`);
    meta.baselineAudit = data.baselineAudit;
    clearOwned();
    stopped = false;
    run = { ...data.run, reported: false };
    await resource("activate?run=" + run.id);
    started = performance.now();
    reports = [];
    latestDetails = null;
    targetDone = false;
    $("manual-check").checked = false;
    $("check-status").textContent = "尚未记录";
    $("audit-scores").textContent = "只有真实导入后才显示类别分数。";
    $("audit-details").textContent = "尚无报告";
    $("audit-metrics").textContent = "导入后显示真实指标与样本中位数。";
    $("audit-checks").textContent = "";
    $("audit-status").textContent = "尚未导入报告。";
    $("shop-stage").className =
      meta.id === "48" && !run.good
        ? run.variant === 0
          ? "grid-fault"
          : "panel-fault"
        : "";
    product = await resource("product.json");
    showProduct();
    $("hero").srcset =
      `/quality/${token}/hero-400.svg?run=${run.id} 400w, /quality/${token}/hero-800.svg?run=${run.id} 800w`;
    $("hero").sizes = "(max-width: 500px) 90vw, 400px";
    $("hero").src = `/quality/${token}/hero-400.svg?run=${run.id}`;
    const target = new URL(
      `/quality/${token}/audit/?run=${run.id}`,
      location.origin,
    ).href;
    $("audit-target").href = target;
    $("audit-url").value = target;
    $("audit-goal").textContent =
      meta.id === "45"
        ? run.variant === 0
          ? "本次目标：Mobile 首次加载与四类结果。故障报告用 Desktop；正常对照固定 Mobile。"
          : "本次目标：Desktop 四类结果。故障报告只跑 Performance；正常对照补齐四类。"
        : meta.id === "47"
          ? "本轮需三份独立 Navigation 报告，固定版本、Desktop、四类结果及限速方式；实际操作后勾选人工检查。"
          : "在相同条件下审计四类结果，追到具体 audit 与元素，再完成键盘 / 业务人工检查。";
    $("status").textContent = manual
      ? "手工覆盖验证：服务器保持故障数据，当前重新读取同一 product.json。"
      : "本轮已准备。先完成实际操作 / 审计，再记录检查。";
    $("scene-message").textContent =
      meta.id === "48"
        ? "把实际视口设到 390 CSS px，再打开筛选、加入购物车，执行检查。"
        : meta.id === "49"
          ? "执行目标检查，关联真实阻断提示、响应与请求。"
          : "检查 product.json 的实际字段，再加入购物车并执行检查。";
    if (manual) {
      targetDone = true;
    }
  } catch (e) {
    $("status").textContent = e.message;
  } finally {
    busy = false;
    refresh();
  }
}
async function execute() {
  if (!run || busy || stopped || run.reported) return;
  busy = true;
  refresh();
  try {
    if (meta.id === "49") {
      await resource("cleanup");
      if (run.variant === 0) {
        delete document.documentElement.dataset.qualityOffer;
        violations = 0;
        const script = document.createElement("script");
        if (run.good) {
          script.src = `/quality/${token}/offer.js?run=${run.id}`;
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(Error("同源优惠脚本未加载"));
            ownedScripts.add(script);
            document.body.append(script);
          });
        } else {
          script.textContent =
            'document.documentElement.dataset.qualityOffer="ready"';
          ownedScripts.add(script);
          document.body.append(script);
          await new Promise((resolve) => setTimeout(resolve, 60));
        }
        offerReady = document.documentElement.dataset.qualityOffer === "ready";
        $("scene-message").textContent = offerReady
          ? "同源外部优惠逻辑已执行。"
          : "优惠逻辑未执行；到 Console / Issues 检查 CSP 拒绝的 inline。";
      } else {
        await resource("cookie?run=" + run.id);
        profileAccepted = (await resource("profile?run=" + run.id)).accepted;
        $("scene-message").textContent = profileAccepted
          ? "后续 profile 请求已接收本会话 Cookie。"
          : "后续 profile 请求没有收到本会话 Cookie。检查 Set-Cookie Domain 与被拒原因。";
      }
    } else {
      $("scene-message").textContent =
        meta.id === "48"
          ? `实际视口 ${innerWidth}px / DPR ${devicePixelRatio}；筛选和加购分别检查。`
          : `实际数据类型 ${typeof product?.unitPrice}；${cartWorked() ? "购物结果一致。" : "尚未得到正常购物结果。"}`;
    }
    targetDone = true;
  } catch (e) {
    $("scene-message").textContent = e.message;
  } finally {
    busy = false;
    refresh();
  }
}
async function importAudit(file) {
  if (!run || busy || stopped || run.reported) return;
  busy = true;
  refresh();
  try {
    if (!file || file.size > 8 * 1024 * 1024)
      throw Error("请使用不超过 8 MiB 的 Lighthouse JSON。");
    const summary = summarizeLighthouse(
        JSON.parse(await file.text()),
        $("audit-url").value,
      ),
      { details, ...report } = summary;
    const accepted = await api("audit", { token, runId: run.id, report });
    reports.push(report);
    latestDetails = details;
    targetDone = true;
    $("audit-status").textContent =
      `已接收 ${accepted.count} / ${accepted.required} 份报告；版本 ${report.version}，${report.formFactor}。`;
    $("audit-scores").replaceChildren();
    for (const id of qualityCategories) {
      const item = document.createElement("div"),
        name = document.createElement("span"),
        value = document.createElement("strong");
      name.textContent = id;
      value.textContent = Object.hasOwn(report.categories, id)
        ? report.categories[id] === null
          ? "不适用"
          : String(Math.round(report.categories[id] * 100))
        : "未运行";
      item.append(name, value);
      $("audit-scores").append(item);
    }
    const lcpMedian = median(reports.map((r) => r.lcp).filter(Number.isFinite));
    const tbtMedian = median(reports.map((r) => r.tbt).filter(Number.isFinite));
    const formatMs = (value) =>
      value === null ? "未提供" : Math.round(value) + " ms";
    $("audit-metrics").textContent =
      `本轮 ${reports.length} 份实际报告：LCP 中位数 ${formatMs(lcpMedian)}；TBT 中位数 ${formatMs(tbtMedian)}。` +
      (meta.id === "47" && meta.baselineAudit
        ? ` 故障基线 ${run.variant === 0 ? "LCP" : "TBT"} 中位数 ${formatMs(meta.baselineAudit.median)}；请在相同条件下比较。`
        : "");
    const state = (score) =>
      score === 1
        ? "自动检查通过"
        : score === 0
          ? "发现问题"
          : "未提供此项结果";
    $("audit-checks").textContent =
      `button-name：${state(report.buttonName)}；meta-description：${state(report.description)}。自动通过后仍需人工补查。`;
    $("audit-details").textContent = JSON.stringify(
      {
        condition: JSON.parse(report.condition),
        checks: details,
        samples: reports.map((r) => ({
          fetchTime: r.fetchTime,
          lcp: r.lcp,
          tbt: r.tbt,
        })),
        medians: {
          lcp: median(reports.map((r) => r.lcp).filter(Number.isFinite)),
          tbt: median(reports.map((r) => r.tbt).filter(Number.isFinite)),
        },
      },
      null,
      2,
    );
  } catch (e) {
    $("audit-status").textContent = "导入未完成：" + e.message;
  } finally {
    $("audit-file").value = "";
    busy = false;
    refresh();
  }
}
async function report() {
  if (!run || busy || stopped || run.reported) return;
  busy = true;
  refresh();
  try {
    const result = await api("report", {
      token,
      runId: run.id,
      metrics: metrics(),
    });
    run.reported = true;
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
        "检查通过，已回传教程。请保留实际报告与工具证据。";
    } else if (result.passed)
      $("status").textContent =
        "检查通过；当前页面未连接教程，请从课程入口重新打开实验。";
  } catch (e) {
    $("check-status").textContent = e.message;
  } finally {
    busy = false;
    refresh();
  }
}
function exportObservation() {
  const blob = new Blob(
      [
        JSON.stringify(
          {
            kind: "quality-observation",
            lesson: meta.id,
            phase: run?.phase,
            metrics: metrics(),
            reports,
            details: latestDetails,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "quality-observation.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("baseline").onclick = () => begin("baseline");
$("restore").onclick = () => begin("baseline");
$("fixed").onclick = () => begin("fixed");
$("manual").onclick = () => begin("fixed", true);
$("stop").onclick = stop;
$("execute").onclick = execute;
$("report").onclick = report;
$("manual-check").onchange = refresh;
$("import-audit").onclick = () => $("audit-file").click();
$("audit-file").onchange = (e) => importAudit(e.target.files?.[0]);
$("audit-target").onclick = (e) => {
  e.preventDefault();
  auditWindow = window.open($("audit-target").href, "quality-audit-target");
};
$("filter").onclick = () => {
  $("filter-panel").hidden = false;
  filterWorked = true;
  refresh();
};
$("close-filter").onclick = () => {
  $("filter-panel").hidden = true;
  refresh();
};
$("add-cart").onclick = () => {
  if (
    !run ||
    stopped ||
    run.reported ||
    typeof product?.unitPrice !== "number" ||
    product.stock === null
  )
    return;
  quantity += meta.quantity;
  $("cart").textContent =
    `${product.sku} / 数量 ${quantity} / 总额 ${product.unitPrice * quantity}`;
  refresh();
};
$("reset-cart").onclick = () => {
  quantity = 0;
  $("cart").textContent = "购物车为空";
  refresh();
};
$("export").onclick = exportObservation;
function policyViolation(e) {
  if (
    e.effectiveDirective === "script-src-elem" ||
    e.effectiveDirective === "script-src"
  )
    violations++;
}
window.addEventListener("securitypolicyviolation", policyViolation);
window.addEventListener(
  "pagehide",
  () => {
    clearTimeout(expiry);
    window.removeEventListener("securitypolicyviolation", policyViolation);
    stop();
  },
  { once: true },
);
try {
  meta = await api("lesson?token=" + token);
  $("context").textContent = meta.chapter
    ? "Lighthouse 章末挑战"
    : `第 ${meta.id} 课 · ${meta.mode === "practice" ? "引导实战" : "独立挑战"}`;
  $("title").textContent = meta.chapter
    ? "从检查项走到证据与复测。"
    : meta.hook;
  $("symptom").textContent = meta.chapter
    ? "自己选择质量检查路径，解释原因，再用相同条件验证改善。"
    : meta.symptom;
  for (const option of meta.fixes) {
    const el = document.createElement("option");
    el.value = option.id;
    el.textContent = option.label;
    $("correction").append(el);
  }
  if (meta.chapter) $("instructions").hidden = true;
  else
    for (const step of meta.steps) {
      const li = document.createElement("li");
      li.textContent = step;
      $("steps").append(li);
    }
  $("audit-panel").hidden = Number(meta.id) > 47;
  $("shop-panel").hidden = Number(meta.id) <= 47;
  $("manual").hidden = meta.id !== "52";
  $("scene-boundary").textContent =
    meta.id === "49"
      ? "这是本机 HTTP，没有 TLS 证书；安全上下文、CSP 与 Cookie 接收分别判断。"
      : meta.id === "52"
        ? "服务器对照不等于 Local overrides。“检查手工覆盖”保持故障服务器响应；在 Network 查看覆盖标记，并在 Changes 核对工具内编辑。"
        : "Device Mode 是模拟；DPR、触摸、方向与视口分别记录，最后仍需真机验证。";
  $("environment").textContent =
    `${innerWidth} × ${innerHeight} / DPR ${devicePixelRatio} / isSecureContext=${isSecureContext} / ${location.protocol}；工具设置请另记。`;
  $("status").textContent = "会话就绪。先运行故障，再开始观察。";
  started = performance.now();
  expiry = setTimeout(
    stop,
    Math.max(1, Date.parse(meta.expiresAt) - Date.now()),
  );
  refresh();
} catch (e) {
  $("title").textContent = "实验未就绪";
  $("status").textContent = e.message;
  for (const id of [
    "baseline",
    "fixed",
    "restore",
    "manual",
    "execute",
    "report",
  ])
    $(id).disabled = true;
}
