<script setup lang="ts">
import { computed, ref } from "vue";
const props = defineProps<{ lesson: string }>();
const mode = ref("temporary"),
  batches = ref(0),
  collected = ref(false),
  rootA = ref(true),
  rootB = ref(false),
  connected = ref(true),
  registry = ref(true),
  disposed = ref(false),
  resource = ref("listener"),
  order = ref(false),
  slow = ref(false),
  stable = ref(false),
  output = ref("先预测结果，再操作。");
const live = computed(() =>
  mode.value === "temporary"
    ? collected.value
      ? 0
      : batches.value * 5
    : mode.value === "cache"
      ? Math.min(batches.value * 5, 3)
      : batches.value * 5,
);
const retained = computed(() => rootA.value || rootB.value);
const snapshotA = ref<number | null>(null),
  snapshotB = ref<number | null>(null);
const allocationSite = ref("createPreviewAllocation");
const points = computed(() =>
  Array.from({ length: Math.max(1, batches.value + 1) }, (_, i) => ({
    x: 22 + i * 42,
    y:
      142 -
      (mode.value === "leak"
        ? i * 20
        : mode.value === "cache"
          ? Math.min(i * 20, 40)
          : collected.value
            ? 0
            : i * 14),
  })),
);
function batch() {
  batches.value = Math.min(7, batches.value + 1);
  collected.value = false;
}
function play() {
  output.value =
    !stable.value && order.value
      ? "定位失败：第一项已是另一个 SKU。"
      : !stable.value && slow.value
        ? "等待失败：150ms 时结果尚未就绪。"
        : "业务断言通过：目标 CUP-42，数量 2，总额 84。";
}
</script>
<template>
  <section class="memory-model" :aria-label="`第 ${lesson} 课原理模型`">
    <p class="mm-boundary">
      原理模型 · 数量与大小为示意，不读取浏览器堆，不计实战完成。
    </p>
    <template v-if="lesson === '40' || lesson === '42'">
      <div class="mm-controls">
        <label
          >生命周期<select
            v-model="mode"
            @change="
              batches = 0;
              collected = false;
            "
          >
            <option value="temporary">临时分配</option>
            <option value="cache">有界缓存</option>
            <option value="leak">持续保留</option>
          </select></label
        ><button :disabled="batches >= 7" @click="batch">重复 5 次操作</button
        ><button @click="collected = true">模拟 GC</button>
      </div>
      <svg
        viewBox="0 0 350 175"
        role="img"
        aria-label="相同批次后的示意存活趋势"
      >
        <path d="M20 15V145H330" fill="none" stroke="#c5d0df" />
        <polyline
          :points="points.map((p) => `${p.x},${p.y}`).join(' ')"
          fill="none"
          stroke="#245de8"
          stroke-width="3"
        />
        <circle
          v-for="p in points"
          :key="p.x"
          :cx="p.x"
          :cy="p.y"
          r="4"
          fill="#245de8"
        />
        <text x="22" y="168">相同操作批次（示意）</text>
      </svg>
      <div class="mm-readout">
        <strong>{{ batches * 5 }} 个累计分配</strong
        ><span>{{ live }} 个当前可达</span
        ><span>{{
          lesson === "42"
            ? "Comparison 要比较空闲且相同 VM；分配区间只缩小来源。"
            : "GC 不会回收仍从根可达的对象。缓存可以有正常平台。"
        }}</span>
      </div>
      <template v-if="lesson === '42'">
        <div class="mm-controls" style="margin-top: 18px">
          <button @click="snapshotA = live">保存快照 A</button>
          <button @click="snapshotB = live">保存快照 B</button>
          <label
            >查看分配位置<select v-model="allocationSite">
              <option value="createPreviewAllocation">
                createPreviewAllocation
              </option>
              <option value="retainPreviewSnapshot">
                retainPreviewSnapshot
              </option>
            </select></label
          >
        </div>
        <p>
          Comparison：A {{ snapshotA ?? "待记录" }} / B
          {{ snapshotB ?? "待记录" }}；存活增量
          {{
            snapshotA !== null && snapshotB !== null
              ? snapshotB - snapshotA
              : "待比较"
          }}。
        </p>
        <p>
          分配来源 {{ allocationSite }} →
          {{
            allocationSite === "createPreviewAllocation"
              ? "previewHistory / latestPreview"
              : "snapshotCache"
          }}。区间与来源只能缩小候选，还需追到实际保留根。
        </p>
      </template>
    </template>
    <template v-else-if="lesson === '41'">
      <div class="mm-controls">
        <label><input type="checkbox" v-model="rootA" />主缓存引用</label
        ><label><input type="checkbox" v-model="rootB" />审计缓存引用</label>
      </div>
      <div class="mm-graph">
        <div :class="{ off: !rootA }">
          Window → 主缓存 owner<small>Shallow 2 单位</small>
        </div>
        <span>↘</span>
        <div class="mm-payload" :class="{ off: !retained }">
          共享载荷<small
            >100 示意单位 ·
            {{ retained ? "仍可达" : "已不可达，等待回收" }}</small
          >
        </div>
        <span>↗</span>
        <div :class="{ off: !rootB }">
          Window → 审计 owner<small>Shallow 2 单位</small>
        </div>
      </div>
      <p>
        主 owner 的示意 Retained：{{
          rootA && !rootB ? 102 : rootA ? 2 : 0
        }}。共享载荷有第二条根路径时，不能重复计入每个 owner 的独占保留。
      </p>
    </template>
    <template v-else-if="lesson === '43'">
      <div class="mm-controls">
        <label><input type="checkbox" v-model="connected" />节点连接文档</label
        ><label
          ><input type="checkbox" v-model="rootA" />closedDialogs
          数组引用</label
        ><label
          ><input type="checkbox" v-model="rootB" />selectedDetails Map
          引用</label
        >
      </div>
      <div class="mm-graph">
        <div :class="{ off: !connected }">
          Document<small>DOM 父子关系</small>
        </div>
        <div class="mm-payload" :class="{ off: !connected && !retained }">
          商品弹窗 → 子树<small>{{
            connected
              ? "在文档中"
              : retained
                ? "Detached，但仍可达"
                : "Detached 且无示意根引用"
          }}</small>
        </div>
        <div :class="{ off: !retained }">
          Window → 外部容器<small>数组 / Map 强引用</small>
        </div>
      </div>
      <p>
        remove() 只改变文档关系。还要检查调试器的 $0、Console
        输出和全局变量是否保留节点。
      </p>
    </template>
    <template v-else-if="lesson === '44'">
      <div class="mm-controls">
        <label
          >资源<select v-model="resource">
            <option value="listener">事件监听器</option>
            <option value="timer">定时器</option>
          </select></label
        ><button @click="connected = false">仅移除 DOM</button
        ><button
          @click="
            disposed = true;
            registry = false;
            connected = false;
          "
        >
          完整 dispose
        </button>
      </div>
      <div class="mm-graph">
        <div :class="{ off: disposed }">
          {{ resource === "listener" ? "window 事件目标" : "调度器" }} →
          callback<small>{{ disposed ? "注册已撤销" : "仍在注册" }}</small>
        </div>
        <div class="mm-payload" :class="{ off: !registry }">
          闭包 → 会话 → 数据<small>{{
            registry ? "仍可达" : "清理登记也已释放"
          }}</small>
        </div>
        <div :class="{ off: !connected }">
          DOM<small>{{ connected ? "可见" : "已移除" }}</small>
        </div>
      </div>
      <p>
        清理使用原函数或原 timer ID；完成后丢弃 cleanup
        闭包，重新打开仍要有一次有效订阅。
      </p>
    </template>
    <template v-else>
      <div class="mm-controls">
        <label><input type="checkbox" v-model="order" />商品换序</label
        ><label><input type="checkbox" v-model="slow" />搜索变慢</label
        ><label
          ><input type="checkbox" v-model="stable" />SKU 定位 + 条件等待</label
        ><button @click="play">演算流程</button>
      </div>
      <ol class="mm-flow">
        <li>重置购物车</li>
        <li>搜索“杯”</li>
        <li>{{ stable ? "等待结果已就绪" : "等待固定 150ms" }}</li>
        <li>{{ stable ? "查看 CUP-42" : "查看第一项" }}</li>
        <li>加购并核对 SKU / 数量 / 总额</li>
      </ol>
      <p role="status" class="mm-readout">{{ output }}</p>
      <p>
        这是流程模型。真实 Recorder 的录制、编辑、Replay 与导出在 Chrome 进行。
      </p>
    </template>
  </section>
</template>
<style scoped>
.memory-model {
  border: 1px solid #dce4ef;
  border-radius: 8px;
  padding: 24px;
  background: #f7faff;
  margin: 24px 0;
  color: #344b68;
  font-size: 14px;
  line-height: 1.8;
}
.mm-boundary {
  font-size: 12px;
  color: #647892;
  margin: 0 0 18px;
}
.mm-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: end;
}
.mm-controls label {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.mm-controls select,
.mm-controls button {
  font: inherit;
  color: #284a76;
  background: #fff;
  border: 1px solid #c9d6e8;
  padding: 8px 12px;
  border-radius: 5px;
}
.mm-controls button {
  cursor: pointer;
}
.mm-controls :focus-visible {
  outline: 3px solid #90acf6;
  outline-offset: 3px;
}
.mm-controls button:disabled {
  opacity: 0.5;
}
.memory-model svg {
  display: block;
  width: 100%;
  max-width: 550px;
  margin: 20px auto;
}
.memory-model text {
  font-size: 10px;
  fill: #687f9a;
}
.mm-readout {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  padding: 16px;
  background: #eaf0fc;
  border-left: 3px solid #245de8;
}
.mm-readout span:last-child {
  flex-basis: 100%;
}
.mm-graph {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin: 26px 0;
}
.mm-graph > div {
  border: 1px solid #b7cce1;
  background: white;
  padding: 16px;
  flex: 1;
  min-width: 140px;
  text-align: center;
}
.mm-graph small {
  display: block;
  color: #627995;
  font-size: 12px;
}
.mm-graph .mm-payload {
  border-color: #6698b5;
  background: #e4f0f5;
}
.mm-graph .off {
  opacity: 0.4;
  border-style: dashed;
}
.mm-flow {
  padding-left: 22px;
  line-height: 2.3;
}
.memory-model > p:last-child {
  font-size: 13px;
}
@media (max-width: 500px) {
  .memory-model {
    padding: 16px;
  }
  .mm-controls label {
    width: 100%;
  }
  .mm-graph > div {
    flex-basis: 100%;
  }
  .mm-graph > span {
    display: none;
  }
}
</style>
