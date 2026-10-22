<script setup lang="ts">
import { computed, ref } from "vue";
const props = defineProps<{ lesson: string }>();
const panel = ref("Elements");
const symptom = ref("style");
const panelFor: Record<string, string> = {
  style: "Elements",
  error: "Console",
  value: "Sources",
  request: "Network",
  speed: "Performance",
  leak: "Memory",
  state: "Application",
  audit: "Lighthouse",
};
const picked = computed(() => panelFor[symptom.value] === panel.value);
const count = ref(0),
  duplicate = ref(true),
  filtered = ref(false);
const host = ref("shop.test"),
  port = ref("443"),
  protocol = ref("https:");
const origin = computed(() => {
  try {
    return new URL(`${protocol.value}//${host.value}:${port.value}`).origin;
  } catch {
    return "地址格式无效";
  }
});
const selectedNode = ref("price"),
  nodeValue = ref("89"),
  priceText = ref("68"),
  productTitle = ref("晨间陶瓷杯");
function editNode() {
  if (selectedNode.value === "price") priceText.value = nodeValue.value;
  else if (selectedNode.value === "title") productTitle.value = nodeValue.value;
}
const specificity = ref(true),
  later = ref(true);
const winner = computed(() =>
  specificity.value
    ? "#product .sale-price"
    : later.value
      ? ".sale-price 红色规则（后声明）"
      : ".sale-price 绿色规则（后声明）",
);
const red = computed(() => specificity.value || later.value);
const width = ref(300),
  minimum = ref(true),
  gap = ref(12);
const overflowing = computed(
  () => (minimum.value ? 180 * 2 : 0) + gap.value + 20 > width.value,
);
const shield = ref(true),
  disabled = ref(false),
  clicks = ref(0);
const named = ref(false),
  labeled = ref(false);
const logQuery = ref(""),
  logLevel = ref("all");
const logs = [
  { level: "debug", text: "[heartbeat] ping" },
  { level: "info", text: "[checkout] 读取购物车，sku=CUP-02" },
  { level: "warn", text: "[checkout] couponCode 为 undefined，预期 coupon=5" },
  { level: "info", text: "[image] 商品图加载完成" },
  { level: "error", text: "[checkout] stock=0，订单却被接受" },
];
const visibleLogs = computed(() =>
  logs.filter(
    (log) =>
      (logLevel.value === "all" || log.level === logLevel.value) &&
      log.text.toLowerCase().includes(logQuery.value.toLowerCase()),
  ),
);
const frame = ref(0),
  context = ref("top");
const objectPrice = ref(68),
  snapshot = ref(68),
  captured = ref(false),
  awaited = ref(false);
function capture() {
  snapshot.value = objectPrice.value;
  captured.value = true;
}
const mapped = ref(true),
  mapLine = ref(1);
const sourceLines = [
  "export function calculateTotal(price: number, quantity: number) {",
  "  const subtotal = multiply(price, quantity);",
  "  return subtotal - 5;",
  "}",
];
const generatedLines = [
  "export function calculateTotal(price, quantity) {",
  "    const subtotal = multiply(price, quantity);",
  "    return subtotal - 5;",
  "}",
];
const pc = ref(0);
const execution = [
  { code: 'const price = "68"', fn: "checkout", depth: 0 },
  { code: "const quantity = 2", fn: "checkout", depth: 0 },
  {
    code: "const subtotal = multiply(price, quantity)",
    fn: "checkout",
    depth: 0,
  },
  { code: "return Number(price) * quantity", fn: "multiply", depth: 1 },
  { code: "const total = subtotal - 5", fn: "checkout", depth: 0 },
  { code: "renderReceipt(total)", fn: "checkout", depth: 0 },
  { code: "node.textContent = String(total)", fn: "renderReceipt", depth: 1 },
  { code: "结算完成", fn: "checkout", depth: 0 },
];
function advance(mode: string) {
  if (mode === "out") {
    if (pc.value === 3) pc.value = 4;
    else pc.value = 7;
  } else if (mode === "over" && pc.value === 2) pc.value = 4;
  else if (mode === "over" && pc.value === 5) pc.value = 7;
  else pc.value = Math.min(7, pc.value + 1);
}
const scope = ref("local");
const condition = ref("type"),
  breakpoint = ref("break"),
  ran = ref(false);
const items = [
  { sku: "CUP-01", price: 68, stock: 5 },
  { sku: "CUP-02", price: "89", stock: 3 },
  { sku: "BAG-03", price: 48, stock: -2 },
  { sku: "LAMP-04", price: 128, stock: 6 },
];
const matches = computed(() =>
  items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) =>
      condition.value === "type"
        ? typeof item.price === "string"
        : condition.value === "stock"
          ? item.stock < 0
          : item.sku === "LAMP-04",
    ),
);
const triggerType = ref("dom"),
  triggerResult = ref("");
function fire(type: string) {
  triggerResult.value =
    triggerType.value === type
      ? (
          {
            event: "在 onAddClick 暂停：click 事件触发",
            dom: "在 mutateCart 暂停：目标子树被修改",
            xhr: "在 traceCart 暂停：发起匹配 URL 的请求",
          } as Record<string, string>
        )[type] || ""
      : "该行为没有命中所选断点。检查断点观察的对象。";
}
const oldDelay = ref(150),
  newDelay = ref(30),
  discardOld = ref(false),
  completed = ref(false),
  pauseCaught = ref(false);
const lastResult = computed(() =>
  discardOld.value || newDelay.value >= oldDelay.value
    ? "新搜索结果"
    : "旧搜索结果",
);
const order = computed(() =>
  oldDelay.value <= newDelay.value ? "旧请求 → 新请求" : "新请求 → 旧请求",
);
</script>
<template>
  <div class="foundation-demo">
    <div class="fd-toolbar">
      <span class="browser-dots"><i></i><i></i><i></i></span
      ><strong>原理实验</strong
      ><span class="model-tag">教学模拟 · 不计入真实实战</span>
    </div>
    <div class="fd-body">
      <template v-if="lesson === '01'">
        <label class="fd-label"
          >症状<select v-model="symptom">
            <option value="style">价格颜色不对</option>
            <option value="error">页面出现报错</option>
            <option value="value">计算中间值异常</option>
            <option value="request">接口返回异常</option>
            <option value="speed">输入明显卡顿</option>
            <option value="leak">反复操作后内存增长</option>
            <option value="state">刷新后登录状态丢失</option>
            <option value="audit">检查网站整体质量</option>
          </select></label
        >
        <div class="panel-picker">
          <button
            v-for="name in [
              'Elements',
              'Console',
              'Sources',
              'Network',
              'Performance',
              'Memory',
              'Application',
              'Lighthouse',
            ]"
            :key="name"
            :class="{ active: panel === name }"
            @click="panel = name"
          >
            {{ name }}
          </button>
        </div>
        <div class="fd-result" aria-live="polite">
          {{
            picked
              ? `${panel} 能提供第一组相关证据。接下来仍需验证具体原因。`
              : `${panel} 也可能参与排查。当前症状可以先从 ${panelFor[symptom]} 收集直接证据。`
          }}
        </div>
      </template>
      <template v-else-if="lesson === '02'">
        <div class="fd-controls">
          <label
            ><input
              v-model="duplicate"
              type="checkbox"
            />绑定两个加购监听器</label
          ><label
            ><input v-model="filtered" type="checkbox" />只看本次操作</label
          >
        </div>
        <button class="button primary" @click="count += duplicate ? 2 : 1">
          单击一次加购</button
        ><button class="button secondary" @click="count = 0">
          恢复起始状态
        </button>
        <div class="fd-result">
          点击结果：{{ count }} 件；每次单击{{
            duplicate ? "触发两次处理" : "只处理一次"
          }}。
        </div>
        <pre class="fd-code"
          >{{ !filtered ? "[heartbeat] 页面保持连接\n" : "" }}[cart] 当前数量 {{
            count
          }}{{ duplicate && count ? "\n[cart] 同一动作第二个处理器" : "" }}</pre
        >
      </template>
      <template v-else-if="lesson === '03'">
        <p>基线：<code>https://shop.test:443</code></p>
        <div class="fd-three">
          <label class="fd-label"
            >协议<select v-model="protocol">
              <option>https:</option>
              <option>http:</option>
            </select></label
          ><label class="fd-label">主机<input v-model="host" /></label
          ><label class="fd-label"
            >端口<input v-model="port" inputmode="numeric"
          /></label>
        </div>
        <div class="origin-compare">
          <span>基线源<strong>https://shop.test</strong></span
          ><span>{{ origin === "https://shop.test" ? "同源" : "不同源" }}</span
          ><span
            >当前源<strong>{{ origin }}</strong></span
          >
        </div>
        <p class="fd-note">
          默认端口会被标准化。端口不同也会改变 origin；判断同源还不能代替 Cookie
          的同站规则。
        </p>
      </template>
      <template v-else-if="lesson === '04'">
        <div class="fd-two">
          <div class="dom-tree">
            <button
              v-for="node in [
                { id: 'card', text: 'article.product' },
                { id: 'title', text: '  h2#product-title' },
                { id: 'price', text: '  strong#price-value' },
              ]"
              :key="node.id"
              :class="{ active: selectedNode === node.id }"
              @click="selectedNode = node.id"
            >
              {{ node.text }}
            </button>
          </div>
          <div class="fd-product">
            <p>商品卡片</p>
            <h3 :class="{ marked: selectedNode === 'title' }">
              {{ productTitle }}
            </h3>
            <strong :class="{ marked: selectedNode === 'price' }"
              >¥ {{ priceText }}</strong
            >
          </div>
        </div>
        <div class="fd-controls">
          <label
            >新文本<input v-model="nodeValue" aria-label="节点新文本" /></label
          ><button class="button secondary" @click="editNode">
            修改选中节点
          </button>
        </div>
        <div class="fd-result">
          {{
            selectedNode === "card"
              ? "选中的是整个容器。请先找到要修改的精确文本节点，保留其他内容。"
              : `只修改 ${selectedNode === "price" ? "价格数字" : "商品标题"}，其他节点保持原样。`
          }}
        </div>
      </template>
      <template v-else-if="lesson === '05'">
        <div class="fd-controls">
          <label
            ><input v-model="specificity" type="checkbox" />存在 ID
            选择器规则</label
          ><label
            ><input v-model="later" type="checkbox" />同级红色规则后声明</label
          >
        </div>
        <div class="fd-two">
          <pre class="fd-code">{{
            specificity
              ? ".sale-price { color: green; }\n#product .sale-price { color: red; }"
              : later
                ? ".sale-price { color: green; }\n.sale-price { color: red; }"
                : ".sale-price { color: red; }\n.sale-price { color: green; }"
          }}</pre>
          <div class="fd-product">
            <p>最终样式</p>
            <strong :style="{ color: red ? '#b84154' : '#168267' }"
              >¥ 68</strong
            >
          </div>
        </div>
        <div class="fd-result">
          胜出：{{ winner }}。{{
            specificity
              ? "更高优先级先决定结果。"
              : "相同权重时继续看来源与声明顺序。"
          }}
        </div>
      </template>
      <template v-else-if="lesson === '06'">
        <label class="fd-label"
          >容器宽度 {{ width }} px<input
            v-model.number="width"
            type="range"
            min="240"
            max="440"
            step="10"
        /></label>
        <div class="fd-controls">
          <label
            ><input v-model="minimum" type="checkbox" />子项 min-width:
            180px</label
          ><label
            >gap<select v-model.number="gap">
              <option :value="12">12 px</option>
              <option :value="100">100 px</option>
            </select></label
          >
        </div>
        <div class="layout-demo-scroll">
          <div
            class="layout-demo-grid"
            :style="{ width: `${width}px`, gap: `${gap}px` }"
          >
            <div
              v-for="n in 2"
              :key="n"
              :style="{ minWidth: minimum ? '180px' : '0' }"
            >
              商品 {{ n }}
            </div>
          </div>
        </div>
        <div class="fd-result">
          {{
            overflowing
              ? "最小宽度与间距超过容器约束，会出现溢出。"
              : "当前约束允许内容在可用空间中分配。"
          }}
          继续调整宽度，验证其他条件。
        </div>
      </template>
      <template v-else-if="lesson === '07'">
        <div class="fd-controls">
          <label><input v-model="shield" type="checkbox" />透明层覆盖按钮</label
          ><label><input v-model="disabled" type="checkbox" />disabled</label>
        </div>
        <div class="state-target">
          <button class="button primary" :disabled="disabled" @click="clicks++">
            加入购物车
          </button>
          <div v-if="shield" class="state-shield" aria-label="覆盖层">
            覆盖层
          </div>
        </div>
        <div class="fd-result" aria-live="polite">
          已接收 {{ clicks }} 次点击。{{
            shield
              ? "先检查点击落在哪个元素。"
              : disabled
                ? "检查按钮的 disabled 属性。"
                : "可以点击，也请用 Tab 和 Enter 验证。"
          }}
        </div>
      </template>
      <template v-else-if="lesson === '08'">
        <div class="fd-controls">
          <label
            ><input v-model="named" type="checkbox" />添加准确的
            aria-label</label
          ><label
            ><input v-model="labeled" type="checkbox" />关联数量 label</label
          >
        </div>
        <div class="fd-controls">
          <button
            class="button secondary"
            :aria-label="named ? '收藏商品' : undefined"
          >
            <span aria-hidden="true">♡</span></button
          ><label :for="labeled ? 'model-quantity' : undefined">数量</label
          ><input id="model-quantity" type="number" value="2" min="1" />
        </div>
        <pre class="fd-code">
role: button   name: {{ named ? "收藏商品" : "（空）" }}
role: spinbutton   name: {{ labeled ? "数量" : "（空）" }}</pre
        >
        <p class="fd-note">
          这两个控件也实际应用了所选属性。用键盘移动焦点，再在真实商城检查
          Accessibility 树。
        </p>
      </template>
      <template v-else-if="lesson === '09'">
        <div class="fd-three">
          <label class="fd-label"
            >筛选日志<input
              v-model="logQuery"
              placeholder="试试 checkout" /></label
          ><label class="fd-label"
            >日志级别<select v-model="logLevel">
              <option value="all">全部</option>
              <option value="debug">debug</option>
              <option value="info">info</option>
              <option value="warn">warn</option>
              <option value="error">error</option>
            </select></label
          >
        </div>
        <div class="log-model">
          <p v-for="log in visibleLogs" :key="log.text" :class="log.level">
            <span>{{ log.level }}</span
            >{{ log.text }}
          </p>
          <p v-if="!visibleLogs.length">没有匹配日志，检查筛选条件。</p>
        </div>
        <div class="fd-result">
          {{
            visibleLogs.length
          }}
          条可见。噪声变少以后，仍需对照本次操作、输入和真实结果。
        </div>
      </template>
      <template v-else-if="lesson === '10'">
        <div class="fd-two">
          <div class="dom-tree">
            <button
              v-for="(fn, index) in [
                'readProductName',
                'buildSummary',
                'checkout',
              ]"
              :key="fn"
              :class="{ active: frame === index }"
              @click="frame = index"
            >
              {{ fn }}<small>{{ index === 0 ? "抛出点" : "调用者" }}</small>
            </button>
          </div>
          <pre class="fd-code">{{
            frame === 0
              ? "product.name = null\nproduct.name.toUpperCase()\nTypeError: name 无法读取"
              : frame === 1
                ? "const product = { name: null }\nreadProductName(product)"
                : "buildSummary(cart.product)"
          }}</pre>
        </div>
        <div class="fd-result">
          当前检查
          {{
            ["readProductName", "buildSummary", "checkout"][frame]
          }}。沿调用者追入参，区分抛出位置与数据来源。
        </div>
      </template>
      <template v-else-if="lesson === '11'">
        <label class="fd-label"
          >Console 执行上下文<select v-model="context">
            <option value="top">top · 商城外层</option>
            <option value="frame">商品预览 iframe</option>
          </select></label
        >
        <div class="context-model">
          <span>top document：商品列表</span>
          <div>
            <span>iframe document：预览价格</span
            ><code>&lt;strong id="frame-price"&gt;68&lt;/strong&gt;</code>
          </div>
        </div>
        <pre class="fd-code">document.querySelector('#frame-price')
{{ context === 'top' ? '→ null（当前 document 不含该节点）' : '→ <strong id="frame-price">68</strong>' }}</pre>
        <p class="fd-note">
          模型解释上下文；真实商城提供一个实际 iframe，可在 Console
          上下文菜单切换。
        </p>
      </template>
      <template v-else-if="lesson === '12'">
        <div class="fd-controls">
          <button class="button secondary" @click="capture">保存当前快照</button
          ><button class="button primary" @click="objectPrice += 5">
            稍后把对象价格加 5
          </button>
        </div>
        <div class="snapshot-pair">
          <div>
            当前引用<strong>{ price: {{ objectPrice }} }</strong>
          </div>
          <div>
            保存的快照<strong>{{
              captured ? `{ price: ${snapshot} }` : "尚未保存"
            }}</strong>
          </div>
        </div>
        <label class="fd-controls"
          ><input v-model="awaited" type="checkbox" />先 await 完成，再执行
          timeEnd</label
        >
        <pre class="fd-code">
time → {{
            awaited ? "等待异步操作 → timeEnd" : "timeEnd → 异步操作才完成"
          }}</pre
        >
        <div class="fd-result">
          对象引用会变化。需要当时证据就保存当时值；需要操作耗时就让计时包含真正的完成时刻。
        </div>
      </template>
      <template v-else-if="lesson === '13'">
        <label class="fd-controls"
          ><input v-model="mapped" type="checkbox" />启用 Source Map 视角</label
        >
        <div class="fd-two">
          <div>
            <p class="code-filename">cart-compiled.js</p>
            <button
              v-for="(line, index) in generatedLines"
              :key="index"
              class="code-line"
              :class="{ active: mapLine === index }"
              @click="mapLine = index"
            >
              <span>{{ index + 1 }}</span
              >{{ line }}
            </button>
          </div>
          <div>
            <p class="code-filename">
              {{ mapped ? "shop-cart.ts" : "尚未映射到原始源码" }}
            </p>
            <pre class="fd-code">{{
              mapped
                ? sourceLines[mapLine]
                : "检查 Source Map 是否加载、路径是否正确。"
            }}</pre>
          </div>
        </div>
        <p class="fd-note">
          点击左侧行查看对应位置。这是关系模型；商城的 .map 文件由 TypeScript
          真实生成，并包含原始源码。
        </p>
      </template>
      <template v-else-if="lesson === '14'">
        <div class="fd-controls">
          <button class="button secondary" @click="advance('into')">
            Step into</button
          ><button class="button secondary" @click="advance('over')">
            Step over</button
          ><button class="button secondary" @click="advance('out')">
            Step out</button
          ><button class="button secondary" @click="pc = 0">重置执行</button>
        </div>
        <div class="fd-two">
          <div>
            <div
              v-for="(item, index) in execution"
              :key="index"
              class="code-line"
              :class="{ active: pc === index }"
            >
              <span>{{ index + 1 }}</span
              >{{ item.code }}
            </div>
          </div>
          <div class="scope-box">
            <h4>当前帧：{{ execution[pc]?.fn }}</h4>
            <p>price: {{ pc > 0 ? '"68"' : "尚未赋值" }}</p>
            <p>quantity: {{ pc > 1 ? 2 : "尚未赋值" }}</p>
            <p>subtotal: {{ pc >= 4 ? 136 : "尚未返回" }}</p>
            <p>total: {{ pc >= 5 ? 131 : "尚未计算" }}</p>
          </div>
        </div>
        <p class="fd-note">
          指示行表示下一步要执行的语句；Step over 越过调用，Step into 进入，Step
          out 返回调用者。
        </p>
      </template>
      <template v-else-if="lesson === '15'">
        <div class="panel-picker">
          <button
            v-for="item in [
              { id: 'local', text: 'readDiscount · Local' },
              { id: 'parent', text: 'checkout · Local' },
              { id: 'closure', text: 'reader · Closure' },
            ]"
            :key="item.id"
            :class="{ active: scope === item.id }"
            @click="scope = item.id"
          >
            {{ item.text }}
          </button>
        </div>
        <pre class="fd-code">{{
          scope === "local"
            ? "discount: 0\nconfig.discount: 5\n局部 discount 遮蔽了你以为使用的值"
            : scope === "parent"
              ? "discount: 5\n传给 readDiscount(config)\n调用者的同名值不等于被调用者局部值"
              : "discount: 8\nconfig.discount: 5\n闭包仍保留创建时的旧值"
        }}</pre>
        <div class="fd-result">
          切换帧，确认自己正在检查哪一个作用域，再选择要修改的来源。
        </div>
      </template>
      <template v-else-if="lesson === '16'">
        <div class="fd-two">
          <label class="fd-label"
            >条件<select v-model="condition" @change="ran = false">
              <option value="type">typeof item.price === 'string'</option>
              <option value="stock">item.stock &lt; 0</option>
              <option value="sku">item.sku === 'LAMP-04'</option>
            </select></label
          ><label class="fd-label"
            >方式<select v-model="breakpoint" @change="ran = false">
              <option value="break">Conditional breakpoint</option>
              <option value="log">Logpoint</option>
            </select></label
          >
        </div>
        <button class="button primary" @click="ran = true">运行循环</button>
        <div class="inventory-model">
          <div
            v-for="(item, index) in items"
            :key="item.sku"
            :class="{
              marked: ran && matches.some((match) => match.index === index),
            }"
          >
            <code>{{ item.sku }}</code
            ><span
              >price:
              {{
                typeof item.price === "string" ? `"${item.price}"` : item.price
              }}</span
            ><span>stock: {{ item.stock }}</span>
          </div>
        </div>
        <div v-if="ran" class="fd-result">
          {{
            breakpoint === "break"
              ? `首次暂停在 ${matches[0]?.item.sku}，可继续运行。`
              : `记录 ${matches.length} 条匹配日志，不暂停程序。`
          }}
        </div>
      </template>
      <template v-else-if="lesson === '17'">
        <label class="fd-label"
          >监听的断点<select v-model="triggerType">
            <option value="event">Event Listener → click</option>
            <option value="dom">DOM → Subtree modifications</option>
            <option value="xhr">XHR/fetch → /trace</option>
          </select></label
        >
        <div class="fd-controls">
          <button class="button secondary" @click="fire('event')">
            触发点击</button
          ><button class="button secondary" @click="fire('dom')">
            修改计数节点</button
          ><button class="button secondary" @click="fire('xhr')">
            发起 /trace 请求
          </button>
        </div>
        <div class="fd-result" aria-live="polite">
          {{
            triggerResult ||
            "选择断点，再触发一个行为。这里是模型，真实商城会实际改变 DOM 与发起请求。"
          }}
        </div>
      </template>
      <template v-else-if="lesson === '18'">
        <div class="fd-two">
          <label class="fd-label"
            >旧请求完成 {{ oldDelay }} ms<input
              v-model.number="oldDelay"
              type="range"
              min="10"
              max="200"
              step="10"
              @input="completed = false" /></label
          ><label class="fd-label"
            >新请求完成 {{ newDelay }} ms<input
              v-model.number="newDelay"
              type="range"
              min="10"
              max="200"
              step="10"
              @input="completed = false"
          /></label>
        </div>
        <label class="fd-controls"
          ><input
            v-model="discardOld"
            type="checkbox"
          />提交状态时忽略旧请求结果</label
        ><button class="button primary" @click="completed = true">
          按完成顺序执行
        </button>
        <div v-if="completed" class="fd-result">
          完成顺序：{{ order }}。最终显示：{{ lastResult }}。
        </div>
        <label class="fd-controls"
          ><input v-model="pauseCaught" type="checkbox" />Pause on caught
          exceptions</label
        >
        <pre class="fd-code">
try { JSON.parse('{invalid-json') }
catch (error) { /* 隐藏错误状态 */ }
{{
            pauseCaught
              ? "会在抛出点暂停，之后仍可继续进入 catch。"
              : "错误被捕获后，页面可能没有明显提示。"
          }}</pre
        >
      </template>
    </div>
  </div>
</template>
