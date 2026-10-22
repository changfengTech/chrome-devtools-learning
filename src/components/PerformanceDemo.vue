<script setup lang="ts">
import { computed, ref, watch } from "vue";
defineProps<{ lesson: string }>();
const load = ref(900),
  cpu = ref(240),
  shift = ref(180),
  goal = ref("load");
const recorded = ref(false),
  actions = ref<string[]>([]),
  selection = ref("target");
const self = ref(30),
  child = ref(120),
  calls = ref(4),
  view = ref("tree");
const yieldMode = ref("sync"),
  chunks = ref(6),
  chunkCost = ref(35);
const discovery = ref(400),
  request = ref(80),
  render = ref(200);
const reserve = ref(false),
  banner = ref(false),
  recent = ref(false);
const batch = ref(false),
  motion = ref("left"),
  nodes = ref(24);
const visited = ref("home"),
  lazy = ref(false),
  windowed = ref(false);
const duration = ref(1600),
  delay = ref(300),
  property = ref("left"),
  reduce = ref(false),
  honor = ref(false),
  position = ref(50);
const total = computed(() => self.value + child.value),
  largest = computed(() =>
    yieldMode.value === "task"
      ? chunkCost.value
      : chunks.value * chunkCost.value,
  );
const paths = ref(["home"]);
watch(visited, (path) => {
  paths.value = windowed.value ? [path] : [...new Set([...paths.value, path])];
});
watch(windowed, () => {
  paths.value = [visited.value];
});
const weights: Record<string, number> = { home: 20, detail: 35, checkout: 25 };
const used = computed(() =>
  paths.value.reduce((sum, path) => sum + (weights[path] || 0), 0),
);
const loaded = computed(() =>
  lazy.value
    ? 20 +
      (paths.value.includes("detail") ? 40 : 0) +
      (paths.value.includes("checkout") ? 40 : 0)
    : 100,
);
function act(name: string) {
  if (recorded.value) actions.value.push(name);
}
</script>
<template>
  <div class="foundation-demo perf-model">
    <div class="fd-toolbar">
      <strong>原理实验</strong
      ><span class="model-tag">教学模型，不改变 DevTools 设置</span>
    </div>
    <div class="fd-body">
      <template v-if="lesson === '27'">
        <div class="fd-controls">
          <label
            >观察目标<select v-model="goal">
              <option value="load">关键内容出现</option>
              <option value="input">交互响应</option>
              <option value="shift">布局稳定</option>
            </select></label
          ><label
            >主图延迟 ms<input
              v-model.number="load"
              type="number"
              min="0"
              max="5000" /></label
          ><label
            >任务耗时 ms<input
              v-model.number="cpu"
              type="number"
              min="0"
              max="1000" /></label
          ><label
            >偏移 px<input
              v-model.number="shift"
              type="number"
              min="0"
              max="300"
          /></label>
        </div>
        <output class="fd-result"
          >{{
            goal === "load"
              ? `先关联 LCP 候选与资源发现，模型延迟 ${load}ms`
              : goal === "input"
                ? `检查交互等待、处理、呈现，模型处理 ${cpu}ms`
                : `定位影响位置的内容，模型移动 ${shift}px`
          }}。这些模型输入不是实际 Web Vitals。</output
        >
      </template>
      <template v-else-if="lesson === '28'">
        <div class="fd-controls">
          <label><input v-model="recorded" type="checkbox" />录制中</label
          ><label
            >选区<select v-model="selection">
              <option value="target">只看目标动作</option>
              <option value="all">整个窗口</option>
            </select></label
          >
        </div>
        <button class="button secondary" @click="act('search')">
          执行目标搜索</button
        ><button class="button secondary" @click="act('noise')">
          执行无关动作</button
        ><button class="button secondary" @click="actions = []">
          清空模型录制
        </button>
        <div class="perf-track">
          <span
            v-for="(action, i) in actions"
            :key="i"
            :class="{ muted: selection === 'target' && action !== 'search' }"
            >{{ i + 1 }} · {{ action }}</span
          >
        </div>
        <output class="fd-result"
          >录到 {{ actions.length }} 次；当前选区
          {{
            selection === "target"
              ? actions.filter((x) => x === "search").length
              : actions.length
          }}
          次。未录到的动作不会因缩小选区重新出现。</output
        >
      </template>
      <template v-else-if="lesson === '29'">
        <div class="fd-controls">
          <label
            >父函数 Self ms<input
              v-model.number="self"
              type="number"
              min="0"
              max="500" /></label
          ><label
            >子函数 ms<input
              v-model.number="child"
              type="number"
              min="0"
              max="500" /></label
          ><label
            >调用次数<input
              v-model.number="calls"
              type="number"
              min="1"
              max="10" /></label
          ><label
            >聚合视角<select v-model="view">
              <option value="tree">Call tree</option>
              <option value="bottom">Bottom-up</option>
            </select></label
          >
        </div>
        <div class="perf-flame">
          <div :style="{ width: Math.max(10, total / 6) + '%' }">
            filterCatalog · Total {{ total }}ms
            <div :style="{ width: (child / Math.max(1, total)) * 100 + '%' }">
              normalizeProduct {{ child }}ms
            </div>
          </div>
        </div>
        <output class="fd-result"
          >{{
            view === "tree"
              ? `从 filterCatalog 追到子函数，父 Self=${self}ms，Total=${total}ms`
              : `按 normalizeProduct 聚合 ${calls} 次，累计 ${child * calls}ms`
          }}。不能把父子 Total 再相加。</output
        >
      </template>
      <template v-else-if="lesson === '30'">
        <div class="fd-controls">
          <label
            >切分方式<select v-model="yieldMode">
              <option value="sync">同一同步任务</option>
              <option value="micro">Promise 微任务</option>
              <option value="task">任务级让出</option>
            </select></label
          ><label
            >分块数量<input
              v-model.number="chunks"
              type="number"
              min="1"
              max="10" /></label
          ><label
            >每块 ms<input
              v-model.number="chunkCost"
              type="number"
              min="1"
              max="100"
          /></label>
        </div>
        <div class="perf-track">
          <span v-for="i in Number(chunks)" :key="i"
            >{{ chunkCost }}ms
            {{ yieldMode === "task" ? "→ 渲染机会" : "" }}</span
          >
        </div>
        <output class="fd-result"
          >模型连续阻塞约 {{ largest }}ms；总计算仍为
          {{
            chunks * chunkCost
          }}ms。微任务切分不保证让出渲染；防抖也不降低最后一次计算成本。</output
        >
      </template>
      <template v-else-if="lesson === '31'">
        <div class="fd-controls">
          <label
            >发现延迟 ms<input
              v-model.number="discovery"
              type="number"
              min="0"
              max="1000" /></label
          ><label
            >资源请求 ms<input
              v-model.number="request"
              type="number"
              min="0"
              max="1000" /></label
          ><label
            >到达后呈现等待 ms<input
              v-model.number="render"
              type="number"
              min="0"
              max="1000"
          /></label>
        </div>
        <div class="perf-track">
          <span>发现 {{ discovery }}</span
          ><span>请求 {{ request }}</span
          ><span>呈现 {{ render }}</span>
        </div>
        <output class="fd-result"
          >关键内容约在 {{ discovery + request + render }}ms
          出现；只优化请求不一定解决最主要阶段。模型未计算真实 LCP。</output
        >
      </template>
      <template v-else-if="lesson === '32'">
        <div class="fd-controls">
          <label><input v-model="reserve" type="checkbox" />图片预留空间</label
          ><label><input v-model="banner" type="checkbox" />插入促销条</label
          ><label
            ><input v-model="recent" type="checkbox" />最近有用户输入</label
          >
        </div>
        <div class="perf-layout">
          <div :style="{ height: reserve ? '80px' : '0px' }">主图占位</div>
          <p v-if="banner">促销条 +40px</p>
          <button class="button secondary">加入购物车</button>
        </div>
        <output class="fd-result"
          >模型目标位移 {{ (reserve ? 0 : 80) + (banner ? 40 : 0) }}px；{{
            recent
              ? "该次偏移可能因 recent input 排除"
              : "需检查偏移窗口与影响区域"
          }}。px 不是 CLS 分数。</output
        >
      </template>
      <template v-else-if="lesson === '33'">
        <div class="fd-controls">
          <label><input v-model="batch" type="checkbox" />集中读后再写</label
          ><label
            >节点数<input
              v-model.number="nodes"
              type="number"
              min="1"
              max="100" /></label
          ><label
            >运动属性<select v-model="motion">
              <option value="left">left + box-shadow</option>
              <option value="transform">transform</option>
            </select></label
          >
        </div>
        <pre class="fd-code">{{
          batch
            ? "read geometry → write all styles"
            : "write → read layout → write → read layout …"
        }}</pre>
        <output class="fd-result"
          >模型每帧显式读取 {{ batch ? 1 : nodes }} 次；{{
            motion === "transform"
              ? "尝试减少布局和绘制"
              : "检查布局与大面积重绘"
          }}。这不是浏览器实际 Layout / Paint 次数，需 trace 复核。</output
        >
      </template>
      <template v-else-if="lesson === '34'">
        <div class="fd-controls">
          <label
            >访问页面<select v-model="visited">
              <option value="home">首页</option>
              <option value="detail">详情</option>
              <option value="checkout">结算</option>
            </select></label
          ><label><input v-model="lazy" type="checkbox" />按需加载</label
          ><label
            ><input v-model="windowed" type="checkbox" />只录当前路径</label
          >
        </div>
        <div class="perf-coverage">
          <span :style="{ width: (used / loaded) * 100 + '%' }"
            >已使用 {{ used }}</span
          ><span>窗口内未使用 {{ loaded - used }}</span>
        </div>
        <output class="fd-result"
          >模型加载 {{ loaded }} 个单位；观察
          {{
            windowed ? "当前选择的路径" : "累计路径"
          }}。扩大路径后覆盖会增加，未使用不代表可安全删除。</output
        >
      </template>
      <template v-else-if="lesson === '51'">
        <div class="fd-controls">
          <label
            >duration ms<input
              v-model.number="duration"
              type="number"
              min="0"
              max="3000" /></label
          ><label
            >delay ms<input
              v-model.number="delay"
              type="number"
              min="0"
              max="1000" /></label
          ><label
            >属性<select v-model="property">
              <option value="left">left</option>
              <option value="transform">transform</option>
            </select></label
          ><label><input v-model="reduce" type="checkbox" />预览 reduce</label
          ><label><input v-model="honor" type="checkbox" />尊重减弱动态</label
          ><label
            >播放头 %<input
              v-model.number="position"
              type="range"
              min="0"
              max="100"
          /></label>
        </div>
        <div class="perf-motion">
          <span
            :style="{
              transform: `translateX(${reduce && honor ? 0 : position}px)`,
            }"
            >购物车</span
          >
        </div>
        <output class="fd-result"
          >{{
            reduce && honor
              ? "无位移反馈"
              : `模型时间 ${Math.round(delay + (duration * position) / 100)}ms，属性 ${property}`
          }}。播放头是静态模型；真实动画在商城中由 CSS 产生。</output
        >
      </template>
    </div>
  </div>
</template>
<style>
.perf-model select {
  max-width: 100%;
  padding: 8px;
  border: 1px solid #dce4ef;
  border-radius: 5px;
  background: #fff;
  color: #48617f;
}
.perf-model input:not([type="checkbox"]) {
  max-width: 135px;
}
.perf-model .fd-result {
  display: block;
}
.perf-track {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 20px 0;
  min-height: 40px;
}
.perf-track span {
  padding: 10px;
  border: 1px solid #cfdcf0;
  background: #edf3fd;
  font:
    12px/1.6 ui-monospace,
    monospace;
}
.perf-track .muted {
  opacity: 0.35;
}
.perf-flame {
  margin: 20px 0;
  min-height: 90px;
}
.perf-flame > div {
  max-width: 100%;
  background: #e3bf75;
  padding: 8px;
  min-width: 150px;
  font:
    12px/1.8 ui-monospace,
    monospace;
}
.perf-flame > div > div {
  background: #e7917d;
  padding: 6px;
  min-width: 130px;
}
.perf-layout {
  border: 1px solid #dce4ef;
  padding: 12px;
  margin: 18px 0;
  min-height: 160px;
}
.perf-layout > div {
  background: #edf3fd;
  overflow: hidden;
}
.perf-layout > p {
  background: #fcf2d9;
  padding: 10px;
}
.perf-coverage {
  display: flex;
  max-width: 100%;
  margin: 20px 0;
  background: #f6d8d5;
  font-size: 12px;
}
.perf-coverage > span {
  padding: 10px;
  overflow-wrap: anywhere;
}
.perf-coverage > span:first-child {
  background: #d0e9df;
}
.perf-motion {
  height: 70px;
  padding: 20px;
  border: 1px solid #dce4ef;
  margin: 15px 0;
  overflow: hidden;
}
.perf-motion span {
  display: inline-block;
  background: #edf3fd;
  padding: 8px;
  font-size: 12px;
}
</style>
