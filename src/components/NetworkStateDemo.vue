<script setup lang="ts">
import { computed, reactive, ref } from "vue";
const props = defineProps<{ lesson: string }>();
const recording = ref(true),
  preserve = ref(false),
  filter = ref(""),
  rows = ref<string[]>([]);
function search() {
  if (recording.value)
    rows.value.push("Fetch /search?q=cup", "Fetch /analytics");
}
function navigateModel() {
  if (!recording.value) return;
  rows.value = preserve.value
    ? [...rows.value, "Document /shop/"]
    : ["Document /shop/"];
}
const filtered = computed(() =>
  rows.value.filter((row) =>
    row.toLowerCase().includes(filter.value.toLowerCase()),
  ),
);
const quantity = ref(2),
  wrongField = ref(true),
  businessOK = ref(false),
  checkBody = ref(false);
const http = computed(() => (wrongField.value ? 422 : 200)),
  created = computed(
    () => http.value === 200 && (!checkBody.value || businessOK.value),
  );
const scheduling = ref("serial"),
  latency = ref(500);
const age = ref(30),
  ttl = ref(60),
  disableCache = ref(false),
  etagMatches = ref(true);
const cacheResult = computed(() =>
  !disableCache.value && age.value < ttl.value
    ? "复用新鲜缓存：没有网络请求"
    : etagMatches.value
      ? "条件验证 304：复用已有响应体"
      : "服务器 200：传回新表示",
);
const cross = ref(true),
  custom = ref(true),
  allowHeader = ref(false),
  allowOrigin = ref(false);
const preflight = computed(() => cross.value && custom.value),
  sent = computed(() => !preflight.value || allowHeader.value);
const network = ref("slow"),
  blocked = ref(false),
  finallyHandled = ref(false);
const protocol = ref("sse"),
  correctListener = ref(false),
  messages = ref<string[]>([]),
  stock = ref(0);
function message() {
  messages.value.push(
    protocol.value === "sse"
      ? 'event: inventory / data: {"stock":3}'
      : '{"type":"inventory","stock":3}',
  );
  if (correctListener.value) stock.value = 3;
}
const path = ref("/other/"),
  maxAge = ref(3600),
  httpOnly = ref(true);
const cookieSent = computed(
  () =>
    maxAge.value > 0 &&
    ("/account/profile" === path.value ||
      ("/account/profile".startsWith(path.value) &&
        (path.value.endsWith("/") ||
          "/account/profile"[path.value.length] === "/"))),
);
const tab = ref<"A" | "B">("A"),
  layer = ref("local"),
  value = ref("2"),
  local = reactive<Record<string, string>>({}),
  sessions = reactive<Record<string, Record<string, string>>>({ A: {}, B: {} }),
  memory = ref("");
function save() {
  if (layer.value === "local") local.cart = value.value;
  else sessions[tab.value]!.cart = value.value;
  memory.value = value.value;
}
function refresh() {
  memory.value =
    (layer.value === "local" ? local.cart : sessions[tab.value]!.cart) ||
    "(empty)";
}
const writeKey = ref("CUP-42"),
  readKey = ref("CUP-42"),
  pending = ref(""),
  database = reactive<Record<string, string>>({}),
  readValue = ref("未读取");
const scope = ref("/shop/"),
  active = ref(1),
  waiting = ref(0),
  controller = ref(1),
  claim = ref(true);
function activate() {
  if (waiting.value) {
    active.value = waiting.value;
    waiting.value = 0;
    if (claim.value && "/shop/page".startsWith(scope.value))
      controller.value = active.value;
  }
}
const strategy = ref("cache-first"),
  online = ref(true),
  cachedVersion = ref(1),
  servedVersion = ref(0),
  icon = ref(false);
function fetchModel() {
  if (strategy.value === "cache-first" && cachedVersion.value)
    servedVersion.value = cachedVersion.value;
  else if (online.value) {
    servedVersion.value = 2;
    cachedVersion.value = 2;
  } else servedVersion.value = cachedVersion.value;
}
</script>
<template>
  <div class="foundation-demo field-demo">
    <div class="fd-toolbar">
      <span class="window-dots"><i></i><i></i><i></i></span
      ><strong>原理实验</strong
      ><span class="model-tag">教学模型，不改变浏览器设置</span>
    </div>
    <div class="fd-body">
      <template v-if="lesson === '19'">
        <div class="fd-controls">
          <label><input v-model="recording" type="checkbox" />录制</label
          ><label
            ><input v-model="preserve" type="checkbox" />Preserve log</label
          ><label
            >过滤<input v-model="filter" placeholder="search / analytics"
          /></label>
        </div>
        <button class="button secondary" @click="search">触发搜索</button
        ><button class="button secondary" @click="navigateModel">
          导航一次</button
        ><button class="button secondary" @click="rows = []">
          清空模型记录
        </button>
        <pre class="fd-code">{{
          filtered.join("\n") || "没有可见请求；检查录制开关和过滤条件。"
        }}</pre>
        <output class="fd-result"
          >实际模型记录 {{ rows.length }} 条；当前可见
          {{ filtered.length }} 条。过滤不删除原始记录。</output
        >
      </template>
      <template v-else-if="lesson === '20'">
        <div class="fd-controls">
          <label
            >数量<input
              v-model.number="quantity"
              type="number"
              min="1"
              max="9" /></label
          ><label
            ><input v-model="wrongField" type="checkbox" />发送错误字段
            qty</label
          ><label
            ><input v-model="businessOK" type="checkbox" />库存允许下单</label
          ><label
            ><input v-model="checkBody" type="checkbox" />同时判断
            data.ok</label
          >
        </div>
        <pre class="fd-code">
POST /checkout
{{ JSON.stringify(wrongField ? { qty: quantity } : { quantity }, null, 2) }}
HTTP {{ http }}
{{
            JSON.stringify(
              {
                ok: http === 200 && businessOK,
                code:
                  http === 422
                    ? "INVALID_QUANTITY"
                    : businessOK
                      ? "OK"
                      : "OUT_OF_STOCK",
              },
              null,
              2,
            )
          }}</pre
        >
        <output class="fd-result"
          >页面判定：{{ created ? "订单创建成功" : "未创建订单" }}。请比较 HTTP
          与业务状态，而不只看 200。</output
        >
      </template>
      <template v-else-if="lesson === '22'">
        <label class="fd-label"
          >调用安排<select v-model="scheduling">
            <option value="serial">无关任务串行</option>
            <option value="parallel">并行启动</option>
            <option value="duplicate">库存重复调用</option>
          </select></label
        ><label class="fd-label"
          >推荐接口耗时 {{ latency }} ms<input
            v-model.number="latency"
            type="range"
            min="100"
            max="1000"
            step="100"
        /></label>
        <div class="field-waterfall">
          <p>
            recommendations <span :style="{ width: `${latency / 12}%` }"></span>
          </p>
          <p>
            hero
            <span
              :style="{
                marginLeft: scheduling === 'serial' ? `${latency / 12}%` : '0',
                width: '8%',
              }"
            ></span>
          </p>
          <p v-if="scheduling === 'duplicate'">
            inventory × 2 <span style="width: 18%"></span>
          </p>
        </div>
        <output class="fd-result"
          >主图开始于
          {{ scheduling === "serial" ? latency : 0 }} ms，主图自身耗时固定为 80
          ms。解除依赖改变的是起点。</output
        >
      </template>
      <template v-else-if="lesson === '23'">
        <div class="fd-controls">
          <label
            >age 秒<input v-model.number="age" type="number" min="0" /></label
          ><label
            >max-age 秒<input
              v-model.number="ttl"
              type="number"
              min="0" /></label
          ><label
            ><input v-model="disableCache" type="checkbox" />需要网络验证</label
          ><label
            ><input v-model="etagMatches" type="checkbox" />ETag
            与当前表示一致</label
          >
        </div>
        <pre class="fd-code">
Cache-Control: max-age={{ ttl }}
ETag: "price-v1"
缓存年龄：{{ age }}s</pre
        >
        <output class="fd-result"
          >{{ cacheResult }}。304 通常没有新的响应体；no-cache
          表示重新验证。</output
        >
      </template>
      <template v-else-if="lesson === '24'">
        <div class="fd-controls">
          <label><input v-model="cross" type="checkbox" />跨源端口</label
          ><label
            ><input v-model="custom" type="checkbox" />X-Shop-Token
            自定义头</label
          ><label
            ><input
              v-model="allowHeader"
              type="checkbox"
            />预检允许所需方法与请求头</label
          ><label
            ><input
              v-model="allowOrigin"
              type="checkbox"
            />实际响应允许当前来源</label
          >
        </div>
        <div class="field-pipeline">
          <span>fetch</span><span>{{ preflight ? "OPTIONS" : "无需预检" }}</span
          ><span>{{ sent ? "POST 发出" : "POST 未发送" }}</span
          ><span>{{
            sent && (!cross || allowOrigin) ? "JSON 可读取" : "不可读取"
          }}</span>
        </div>
        <output class="fd-result"
          >先看 POST
          是否真的发送，再看实际响应是否可读取。同源、预检通过与实际响应许可不是同一个判断。本模型假设除自定义头外满足简单请求条件。</output
        >
      </template>
      <template v-else-if="lesson === '25'">
        <div class="fd-controls">
          <label
            >网络条件<select v-model="network">
              <option value="online">Online</option>
              <option value="slow">Slow network</option>
              <option value="offline">Offline</option>
              <option value="503">HTTP 503</option>
            </select></label
          ><label><input v-model="blocked" type="checkbox" />阻断目标资源</label
          ><label
            ><input
              v-model="finallyHandled"
              type="checkbox"
            />失败后收尾与重试</label
          >
        </div>
        <pre class="fd-code">{{
          blocked
            ? "浏览器阻断：没有正常 HTTP 响应"
            : network === "offline"
              ? "网络错误：没有 HTTP 响应"
              : network === "503"
                ? "服务器返回 HTTP 503"
                : network === "slow"
                  ? "请求仍在等待，不能立刻判为失败"
                  : "HTTP 200"
        }}</pre>
        <output class="fd-result">{{
          blocked || network === "offline" || network === "503"
            ? finallyHandled
              ? "已结束 loading，保留错误与重试入口"
              : "页面卡在 loading：业务处理需要修正"
            : network === "slow"
              ? "显示等待状态并允许取消；模型不实际限速"
              : "正常展示结果"
        }}</output>
      </template>
      <template v-else-if="lesson === '26'">
        <div class="fd-controls">
          <label
            >协议<select v-model="protocol">
              <option value="sse">SSE 自定义事件</option>
              <option value="ws">WebSocket JSON</option>
            </select></label
          ><label
            ><input v-model="correctListener" type="checkbox" />匹配事件名与
            stock 字段</label
          >
        </div>
        <button class="button secondary" @click="message">
          发送一条模型消息
        </button>
        <pre class="fd-code">{{ messages.join("\n") || "等待消息。" }}</pre>
        <output class="fd-result"
          >消息数 {{ messages.length }}；页面库存
          {{ stock }}。连接成功与界面更新需要分别验证。</output
        >
      </template>
      <template v-else-if="lesson === '35'">
        <div class="fd-controls">
          <label>Cookie Path<input v-model="path" /></label
          ><label>Max-Age<input v-model.number="maxAge" type="number" /></label
          ><label><input v-model="httpOnly" type="checkbox" />HttpOnly</label>
        </div>
        <pre class="fd-code">
请求：/account/profile
Set-Cookie: login=active; Path={{ path }}; Max-Age={{ maxAge
          }}{{ httpOnly ? "; HttpOnly" : "" }}</pre
        >
        <output class="fd-result"
          >请求{{ cookieSent ? "携带" : "不携带" }} Cookie；document.cookie
          {{
            httpOnly
              ? "无法读取此 HttpOnly 值"
              : "可读取此值（在路径与有效期等条件允许时）"
          }}。端口不隔离 Cookie；模型未模拟完整 SameSite/Secure 策略。</output
        >
      </template>
      <template v-else-if="lesson === '36'">
        <div class="fd-controls">
          <label
            >标签<select v-model="tab" @change="refresh">
              <option>A</option>
              <option>B</option>
            </select></label
          ><label
            >存储层<select v-model="layer" @change="refresh">
              <option value="local">localStorage</option>
              <option value="session">sessionStorage</option>
            </select></label
          ><label>购物车值<input v-model="value" /></label>
        </div>
        <button class="button secondary" @click="save">写入当前模型</button
        ><button class="button secondary" @click="refresh">刷新当前模型</button
        ><button
          class="button secondary"
          @click="
            sessions[tab] = {};
            refresh();
          "
        >
          关闭并新开当前标签
        </button>
        <pre class="fd-code">
local: {{ local }}
session A: {{ sessions.A }}
session B: {{ sessions.B }}</pre
        >
        <output class="fd-result"
          >标签 {{ tab }} 当前显示：{{
            memory || "(empty)"
          }}。这是独立模型；真实实验使用浏览器 Storage API。</output
        >
      </template>
      <template v-else-if="lesson === '37'">
        <div class="fd-controls">
          <label>写入 SKU<input v-model="writeKey" /></label
          ><label>读取 SKU<input v-model="readKey" /></label>
        </div>
        <button class="button secondary" @click="pending = writeKey">
          request success（待提交）</button
        ><button
          class="button secondary"
          @click="
            pending && (database[pending] = 'favorite');
            pending = '';
          "
        >
          提交事务</button
        ><button class="button secondary" @click="pending = ''">中止事务</button
        ><button
          class="button secondary"
          @click="readValue = database[readKey] || 'undefined'"
        >
          读取已提交记录
        </button>
        <pre class="fd-code">
待提交：{{ pending || "无" }}
已提交：{{ database }}</pre
        >
        <output class="fd-result"
          >get({{ readKey }}) = {{ readValue }}。request success 与 transaction
          complete 分开观察。</output
        >
      </template>
      <template v-else-if="lesson === '38'">
        <div class="fd-controls">
          <label>scope<input v-model="scope" /></label
          ><label
            ><input v-model="claim" type="checkbox" />激活后
            clients.claim</label
          >
        </div>
        <button class="button secondary" @click="waiting = 2">
          安装新版本 v2</button
        ><button class="button secondary" @click="activate">激活等待版本</button
        ><button
          class="button secondary"
          @click="controller = '/shop/page'.startsWith(scope) ? active : 0"
        >
          导航到 /shop/page
        </button>
        <div class="field-pipeline">
          <span>active v{{ active }}</span
          ><span>waiting {{ waiting ? "v" + waiting : "none" }}</span
          ><span
            >当前 controller
            {{
              "/shop/page".startsWith(scope) && controller
                ? "v" + controller
                : "null"
            }}</span
          >
        </div>
        <output class="fd-result"
          >注册、激活与当前页面控制分别判断。模型简化升级；真实实验可看到实际
          waiting worker 和响应来源。</output
        >
      </template>
      <template v-else-if="lesson === '39'">
        <div class="fd-controls">
          <label
            >策略<select v-model="strategy">
              <option value="cache-first">cache-first</option>
              <option value="network-first">network-first</option>
            </select></label
          ><label><input v-model="online" type="checkbox" />Online</label
          ><label
            ><input v-model="icon" type="checkbox" />Manifest 图标可访问</label
          >
        </div>
        <button class="button secondary" @click="fetchModel">读取商品</button
        ><button class="button secondary" @click="cachedVersion = 0">
          清理当前模型缓存
        </button>
        <div class="field-pipeline">
          <span>服务版本 2</span
          ><span>Cache Storage {{ cachedVersion || "empty" }}</span
          ><span>页面 {{ servedVersion || "无可用响应" }}</span>
        </div>
        <output class="fd-result"
          >图标：{{
            icon ? "200，可用" : "404，不可用"
          }}。网络不可用时回退取决于已有缓存；Disable cache 不等于删除 Cache
          Storage。</output
        >
      </template>
    </div>
  </div>
</template>
<style>
.field-demo .fd-result {
  display: block;
}
.field-demo select {
  max-width: 100%;
  border: 1px solid #dce4ef;
  border-radius: 5px;
  padding: 9px;
  background: white;
  color: #48617f;
}
.field-pipeline {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin: 20px 0;
}
.field-pipeline > span {
  padding: 12px 15px;
  background: #edf3fd;
  border: 1px solid #dce6f7;
  color: #476a9b;
  font-size: 12px;
  border-radius: 5px;
  overflow-wrap: anywhere;
}
.field-waterfall {
  background: #f4f7fc;
  border: 1px solid #dce5f1;
  padding: 15px;
}
.field-waterfall p {
  font:
    12px/1.9 ui-monospace,
    monospace;
  margin: 12px 0;
  color: #61789b;
}
.field-waterfall span {
  height: 14px;
  background: #709ae8;
  display: block;
  border-radius: 2px;
  max-width: 100%;
}
.field-demo .fd-label select {
  margin-top: 4px;
}
.field-demo .fd-controls input:not([type="checkbox"]) {
  max-width: 140px;
}
</style>
