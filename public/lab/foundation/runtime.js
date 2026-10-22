import {
  calculateTotal,
  expectedTotal,
  checkout,
  auditInventory,
  mutateCart,
  parseDiscount,
  commitSearch,
} from "./cart-compiled.js";
const params = new URLSearchParams(location.search);
const token = params.get("token");
const tutorial = params.get("tutorial");
const allowed = new Set([
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  "http://127.0.0.1:4173",
  "http://localhost:4173",
]);
const $ = (id) => document.getElementById(id);
let meta,
  config,
  correction = "",
  busy = false,
  actionCount = 0,
  audit,
  liveSnapshot,
  lastQuery = null,
  traceCount = 0,
  measuredAwait = false;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function api(path, body) {
  const response = await fetch(
    path,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : {},
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "实验服务返回错误");
  return result;
}
function setBusy(value) {
  busy = value;
  for (const id of [
    "run",
    "trigger",
    "inspect",
    "correction",
    "apply",
    "reset",
  ])
    $(id).disabled = value || !meta;
}
function shieldBlocks() {
  const shield = $("click-shield");
  return (
    shield &&
    !shield.hidden &&
    getComputedStyle(shield).display !== "none" &&
    getComputedStyle(shield).pointerEvents !== "none"
  );
}
function corrected() {
  return correction === (config.variant === 0 ? "a" : "b");
}
function currentTotal() {
  return Number($("total").textContent);
}
function check(name, passed, actual = "") {
  return {
    name,
    passed: Boolean(passed),
    actual: String(actual).slice(0, 150),
  };
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
async function renderScene() {
  $("workspace").innerHTML =
    `<style id="fault-style"></style><div class="condition-line"><span id="condition">相同输入、正常网络条件</span><span id="query-context"></span></div><div id="product-grid"><article class="product" data-sku="${config.sku}"><div class="product-illustration"><span></span></div><p class="category">桌面 / 本地实验商品</p><h2 id="product-title"></h2><p class="price">¥ <strong id="price-value" class="sale-price"></strong></p><label id="quantity-label" for="quantity">商品数量</label><input id="quantity" type="number" min="1" max="9" value="${config.quantity}"><div class="add-wrap"><button id="add" class="primary">加入购物车</button><div id="click-shield" hidden></div></div><button id="icon-favorite" aria-label="收藏商品"><span aria-hidden="true">♡</span></button></article><article class="product companion"><div class="product-illustration small"><span></span></div><p>一起挑选</p><h2>日常帆布袋</h2><p>相邻内容也需要保持正常。</p></article></div><div id="frame-host"></div><div id="inventory"></div>`;
  $("product-title").textContent = config.name;
  $("price-value").textContent = String(config.price);
  $("cart-count").textContent = "0";
  $("total").textContent = "0";
  $("result").textContent = "尚未操作";
  $("business-message").textContent = "";
  actionCount = 0;
  const id = meta.id,
    fixed = corrected();
  if (id === "04" && !fixed)
    (config.variant === 0 ? $("price-value") : $("product-title")).textContent =
      config.variant === 0 ? String(config.price + 99) : "旧商品标题";
  if (id === "05") {
    $("fault-style").textContent =
      config.variant === 0
        ? `.sale-price{color:rgb(22,130,103)} #product-grid #price-value{color:${correction === "a" ? "rgb(22,130,103)" : "#b84154"}}`
        : `.sale-price{color:rgb(22,130,103)} .sale-price{color:${correction === "b" ? "rgb(22,130,103)" : "#b84154"}}`;
  }
  if (id === "06") {
    $("product-grid").classList.add("layout-case");
    if (!fixed) {
      if (config.variant === 0)
        for (const item of document.querySelectorAll(".product"))
          item.style.minWidth = "250px";
      else $("product-grid").style.gap = "480px";
    }
  }
  if (id === "07" && !fixed) {
    if (config.variant === 0) $("click-shield").hidden = false;
    else $("add").disabled = true;
  }
  if (id === "08" && !fixed) {
    if (config.variant === 0) $("icon-favorite").removeAttribute("aria-label");
    else $("quantity-label").htmlFor = "quantity-other";
  }
  $("icon-favorite").addEventListener("click", () => {
    $("icon-favorite").setAttribute(
      "aria-pressed",
      $("icon-favorite").getAttribute("aria-pressed") === "true"
        ? "false"
        : "true",
    );
  });
  const addHandler = () => {
    console.info("[cart] add", { sku: config.sku, quantity: config.quantity });
    if (id === "01" && config.variant === 0 && !fixed)
      $("product-title").dataset.count = String(config.quantity);
    else mutateCart($("cart-count"), config.quantity);
  };
  if (!(id === "02" && config.variant === 1 && !fixed))
    $("add").addEventListener("click", addHandler);
  if ((id === "02" || id === "17") && config.variant === 0 && !fixed)
    $("add").addEventListener("click", () => {
      console.info("[cart] duplicate handler");
      mutateCart($("cart-count"), config.quantity);
    });
  if (id === "11") {
    const frame = document.createElement("iframe");
    frame.title = "商品预览 iframe";
    frame.src = `/lab/foundation/frame.html?price=${config.price}`;
    $("frame-host").append(frame);
    await new Promise((resolve, reject) => {
      frame.addEventListener("load", resolve, { once: true });
      frame.addEventListener(
        "error",
        () => reject(new Error("iframe 未能加载")),
        { once: true },
      );
    });
  }
}
async function triggerBusiness() {
  if (!config) throw new Error("请先运行故障");
  const id = meta.id,
    fixed = corrected();
  const quantity = Number($("quantity").value);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 9)
    throw new Error("请输入 1 到 9 的整数数量");
  config.quantity = quantity;
  actionCount++;
  if (["01", "02", "07", "08", "17"].includes(id)) {
    if (!shieldBlocks()) $("add").click();
  }
  $("total").textContent = String(calculateTotal(config, correction));
  $("result").textContent =
    `预期合计 ${expectedTotal(config)}，当前结果 ${$("total").textContent}`;
  console.debug("[heartbeat] 页面保持连接");
  if (id === "03") {
    const abnormal = !fixed;
    $("condition").textContent = abnormal
      ? config.variant === 0
        ? "本次含额外网络等待"
        : `本次数量 ${config.quantity}，基线 ${config.baselineQuantity}`
      : "相同输入、正常网络条件";
    $("condition").dataset.normal = String(!abnormal);
    $("query-context").textContent = `页面 origin：${location.origin}`;
  }
  if (id === "09") {
    console.groupCollapsed("[checkout] 本次结算");
    const order = {
      sku: config.sku,
      coupon: config.discount,
      stock: 0,
      available: true,
    };
    console.table([order]);
    if (config.variant === 0) {
      const coupon = fixed ? order.coupon : order.couponCode;
      console.warn("[checkout] 优惠输入", {
        coupon,
        expected: config.discount,
      });
      $("total").textContent = String(
        config.price * config.quantity - (coupon || 0),
      );
    } else {
      const accepted = fixed ? order.stock > 0 : order.available;
      if (fixed)
        console.info("[checkout] 库存已正确拦截", {
          stock: order.stock,
          accepted,
        });
      else
        console.error("[checkout] 库存检查", { stock: order.stock, accepted });
      $("business-message").textContent = accepted
        ? "错误：缺货订单被接受"
        : "库存不足，未创建订单";
    }
    console.groupEnd();
  }
  if (id === "10") {
    try {
      $("business-message").textContent = checkout(config, fixed);
    } catch (error) {
      console.error("[checkout] 有意设置的教学异常", error);
      $("business-message").textContent =
        "结算未完成：查看实际 TypeError 和调用堆栈";
    }
  }
  if (id === "11") {
    const frameDoc = document.querySelector("iframe").contentDocument;
    const root = config.variant === 0 && !fixed ? document : frameDoc;
    const selector =
      config.variant === 1 && !fixed ? "#frame-prcie" : "#frame-price";
    lastQuery = root.querySelector(selector);
    $("query-context").textContent =
      `查询结果：${lastQuery?.textContent ?? "null"}`;
    console.info(
      `[context] selector=${selector} document=${root.URL}`,
      lastQuery,
    );
  }
  if (id === "12") {
    const object = { price: config.price };
    const snapshot = JSON.stringify(object);
    console.log("[snapshot]", snapshot);
    console.log("[live]", object);
    const started = performance.now();
    const task = sleep(40).then(() => {
      object.price += 5;
    });
    console.time("checkout-time");
    if (config.variant === 1 && !fixed) {
      console.timeEnd("checkout-time");
      measuredAwait = false;
      await task;
    } else {
      await task;
      console.timeEnd("checkout-time");
      measuredAwait = performance.now() - started >= 30;
    }
    liveSnapshot = fixed ? JSON.parse(snapshot) : object;
    $("business-message").textContent =
      `记录时 price=${config.price}；用于取证的记录 price=${liveSnapshot.price}；计时${measuredAwait ? "包含" : "未包含"}异步等待。`;
  }
  if (id === "16") {
    audit = auditInventory(config, fixed);
    console.table(audit.items);
    $("inventory").textContent =
      `已接受 ${audit.accepted} 条商品；价格类型${audit.normalized ? "已规范" : "存在异常"}。`;
  }
  if (id === "17") {
    const requests = config.variant === 1 && !fixed ? 2 : 1;
    traceCount = 0;
    async function traceCart() {
      await api(
        `/api/foundations/trace?token=${encodeURIComponent(token)}&action=add`,
      );
      traceCount++;
    }
    await Promise.all(Array.from({ length: requests }, traceCart));
    $("business-message").textContent =
      `本次动作实际发起 ${traceCount} 次 trace 请求。`;
  }
  if (id === "18") {
    if (config.variant === 0) {
      try {
        const discount = parseDiscount(
          fixed ? JSON.stringify({ amount: config.discount }) : "{invalid-json",
        );
        $("total").textContent = String(
          config.price * config.quantity - discount.amount,
        );
        $("business-message").textContent = "优惠配置已解析，结算结果正确";
      } catch (error) {
        console.warn("[caught] 有意设置的解析异常", error);
        $("business-message").textContent = "";
        $("total").textContent = "未完成";
      }
    } else {
      const output = $("business-message");
      const oldRequest = sleep(90).then(() =>
        commitSearch(output, `旧结果 ${config.sku}`, 1, 2, fixed),
      );
      const newRequest = sleep(15).then(() =>
        commitSearch(output, `新结果 ${config.sku}`, 2, 2, fixed),
      );
      await Promise.all([oldRequest, newRequest]);
    }
  }
  window.shopLab.last = {
    config: { ...config },
    total: $("total").textContent,
    traceCount,
  };
}
function healthyChecks() {
  const id = meta.id;
  switch (id) {
    case "01":
      return config.variant === 0
        ? [
            check(
              "实际计数与动作一致",
              Number($("cart-count").textContent) ===
                config.quantity * actionCount,
              $("cart-count").textContent,
            ),
          ]
        : [
            check(
              "数值合计正确",
              currentTotal() === expectedTotal(config),
              $("total").textContent,
            ),
          ];
    case "02":
      return [
        check(
          "一次动作只处理一次",
          Number($("cart-count").textContent) === config.quantity * actionCount,
          $("cart-count").textContent,
        ),
      ];
    case "03":
      return [
        check(
          "实验条件恢复一致",
          $("condition").dataset.normal === "true",
          $("condition").textContent,
        ),
      ];
    case "04":
      return [
        check(
          "价格数字节点正确",
          $("price-value").textContent === String(config.price),
          $("price-value").textContent,
        ),
        check(
          "标题节点正确",
          $("product-title").textContent === config.name,
          $("product-title").textContent,
        ),
      ];
    case "05":
      return [
        check(
          "最终颜色符合预期",
          getComputedStyle($("price-value")).color === "rgb(22, 130, 103)",
          getComputedStyle($("price-value")).color,
        ),
      ];
    case "06":
      return [
        check(
          "商品网格无横向溢出",
          $("product-grid").scrollWidth <= $("product-grid").clientWidth + 1,
          `${$("product-grid").scrollWidth} / ${$("product-grid").clientWidth}`,
        ),
      ];
    case "07":
      return [
        check("按钮可以接收交互", !$("add").disabled && !shieldBlocks()),
        check("点击能改变数量", Number($("cart-count").textContent) > 0),
      ];
    case "08":
      return [
        check(
          "图标按钮有准确名称",
          Boolean($("icon-favorite").getAttribute("aria-label")?.trim()),
        ),
        check(
          "数量标签正确关联",
          $("quantity-label").control === $("quantity"),
        ),
      ];
    case "09":
      return config.variant === 0
        ? [
            check(
              "优惠输入被正确使用",
              currentTotal() === expectedTotal(config),
            ),
          ]
        : [
            check(
              "缺货订单被阻止",
              $("business-message").textContent === "库存不足，未创建订单",
            ),
          ];
    case "10":
      return [
        check(
          "结算摘要正确生成",
          $("business-message").textContent === config.name.toUpperCase(),
        ),
      ];
    case "11":
      return [
        check(
          "在目标上下文查到正确价格",
          lastQuery?.textContent === String(config.price),
          $("query-context").textContent,
        ),
      ];
    case "12":
      return config.variant === 0
        ? [check("取证保留了当时值", liveSnapshot?.price === config.price)]
        : [check("计时包含实际异步任务", measuredAwait)];
    case "13":
    case "14":
    case "15":
      return [
        check(
          "业务合计与独立预期一致",
          currentTotal() === expectedTotal(config),
          `${$("total").textContent} / ${expectedTotal(config)}`,
        ),
      ];
    case "16":
      return [
        check(
          "库存检查及类型规范正确",
          audit && audit.accepted === audit.expected && audit.normalized,
          $("inventory").textContent,
        ),
      ];
    case "17":
      return config.variant === 0
        ? [
            check(
              "一次动作一次状态变化",
              Number($("cart-count").textContent) ===
                config.quantity * actionCount,
            ),
          ]
        : [check("一次动作一次真实请求", traceCount === 1, traceCount)];
    case "18":
      return config.variant === 0
        ? [
            check(
              "解析与错误状态得到处理",
              currentTotal() === expectedTotal(config) &&
                $("business-message").textContent.length > 0,
            ),
          ]
        : [
            check(
              "保留最新搜索结果",
              $("business-message").textContent === `新结果 ${config.sku}`,
            ),
          ];
    default:
      return [check("未知实验", false)];
  }
}
function displayChecks(checks) {
  $("checks").replaceChildren(
    ...checks.map((item) => {
      const li = document.createElement("li");
      li.className = item.passed ? "pass" : "fail";
      li.textContent = `${item.passed ? "✓" : "○"} ${item.name}${item.actual ? `：${item.actual}` : ""}`;
      return li;
    }),
  );
}
async function observe(run, baseline = false) {
  const healthy = healthyChecks();
  const checks = baseline
    ? [
        check(
          "目标故障可复现",
          healthy.some((item) => !item.passed),
        ),
      ]
    : healthy;
  displayChecks(checks);
  const result = await api("/api/foundations/observe", {
    token,
    runId: run.runId,
    checks,
  });
  notify(baseline ? "baseline" : "fixed", result.passed);
  $("status").textContent = result.passed
    ? baseline
      ? "故障已复现并记录。请使用 DevTools 找证据，再验证修复。"
      : "页面结果检查通过，已记录修复对照。请回课程提交观察。"
    : "页面结果尚未符合目标。请检查未通过项目，再修改并重新检查。";
}
async function perform(action) {
  if (busy) return;
  setBusy(true);
  try {
    await action();
  } catch (error) {
    $("status").textContent =
      `${error.message} 若服务已重启，请回教程重新准备实验。`;
  } finally {
    setBusy(false);
  }
}
async function runFault() {
  correction = "";
  $("correction").value = "";
  config = await api(
    `/api/foundations/data?token=${encodeURIComponent(token)}&phase=baseline`,
  );
  await renderScene();
  await triggerBusiness();
  await observe(config, true);
}
$("run").addEventListener("click", () => perform(runFault));
$("reset").addEventListener("click", () => perform(runFault));
$("trigger").addEventListener("click", () =>
  perform(async () => {
    await triggerBusiness();
    $("status").textContent =
      "业务已再次触发，请在 DevTools 检查节点、日志或断点。";
  }),
);
$("inspect").addEventListener("click", () =>
  perform(async () => {
    if (!config) throw new Error("请先运行故障");
    const run = await api(
      `/api/foundations/data?token=${encodeURIComponent(token)}&phase=fixed`,
    );
    await observe(run);
  }),
);
$("apply").addEventListener("click", () =>
  perform(async () => {
    if (!config) throw new Error("请先运行故障");
    if (!$("correction").value) throw new Error("先根据证据选择一个对照方案");
    correction = $("correction").value;
    const run = await api(
      `/api/foundations/data?token=${encodeURIComponent(token)}&phase=fixed`,
    );
    config = run;
    await renderScene();
    await triggerBusiness();
    await observe(run);
  }),
);
window.shopLab = {
  last: null,
  expectedTotal: () => (config ? expectedTotal(config) : null),
  trigger: () => perform(triggerBusiness),
};
try {
  meta = await api(
    `/api/foundations/lesson?token=${encodeURIComponent(token)}`,
  );
  $("course-label").textContent =
    `第 ${meta.id} 课 · ${meta.mode === "challenge" ? "独立挑战" : "引导实战"}`;
  $("title").textContent = meta.hook;
  $("brief").textContent =
    meta.mode === "challenge"
      ? "数据和故障配置已更换。先观察实际结果，再判断原因。"
      : meta.symptom;
  document.title = `第 ${meta.id} 课 · 日常好物实验`;
  for (const option of meta.fixes) {
    const node = document.createElement("option");
    node.value = option.id;
    node.textContent = option.label;
    $("correction").append(node);
  }
  for (const text of meta.steps) {
    const li = document.createElement("li");
    li.textContent = text;
    $("steps").append(li);
  }
  setBusy(false);
} catch (error) {
  $("status").textContent = error.message;
  $("title").textContent = "实验尚未准备";
}
