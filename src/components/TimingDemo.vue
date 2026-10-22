<script setup lang="ts">
import { computed, ref } from "vue";
const props = withDefaults(defineProps<{ compact?: boolean }>(), {
  compact: false,
});
const waiting = ref(900);
const download = ref(180);
const total = computed(() => 35 + waiting.value + download.value);
const preset = ref("waiting");
function select(value: string) {
  preset.value = value;
  waiting.value = value === "waiting" ? 900 : 80;
  download.value = value === "waiting" ? 180 : 1000;
}
</script>
<template>
  <div class="timing-demo" :class="{ compact: props.compact }">
    <div class="demo-chrome">
      <span class="browser-dots"><i></i><i></i><i></i></span
      ><span>Network <span class="demo-chrome-separator">/</span> Timing</span
      ><span class="model-tag">教学模拟</span>
    </div>
    <div class="demo-inner">
      <div class="demo-preset">
        <button
          :class="{ active: preset === 'waiting' }"
          @click="select('waiting')"
        >
          等待较长</button
        ><button
          :class="{ active: preset === 'download' }"
          @click="select('download')"
        >
          传输较慢
        </button>
      </div>
      <div class="request-title">
        <span class="request-method">GET</span><code>/api/products</code
        ><span class="status-code">200</span>
      </div>
      <div class="timing-axis">
        <span>0 ms</span><span>{{ Math.round(total / 2) }} ms</span
        ><span>{{ total }} ms</span>
      </div>
      <div class="timing-track">
        <span
          class="timing-connect"
          :style="{ width: `${(35 / total) * 100}%` }"
        ></span
        ><span
          class="timing-wait"
          :style="{ width: `${(waiting / total) * 100}%` }"
        ></span
        ><span
          class="timing-download"
          :style="{ width: `${(download / total) * 100}%` }"
        ></span>
      </div>
      <div class="timing-legend">
        <span
          ><i class="wait-dot"></i>Waiting (TTFB)<b>{{ waiting }} ms</b></span
        ><span
          ><i class="download-dot"></i>Content Download<b
            >{{ download }} ms</b
          ></span
        >
      </div>
      <template v-if="!props.compact">
        <div class="range-field">
          <label for="wait-range"
            >响应前等待 <strong>{{ waiting }} ms</strong></label
          ><input
            id="wait-range"
            v-model.number="waiting"
            type="range"
            min="30"
            max="1600"
            step="10"
            @input="preset = ''"
          />
        </div>
        <div class="range-field">
          <label for="download-range"
            >主体传输 <strong>{{ download }} ms</strong></label
          ><input
            id="download-range"
            v-model.number="download"
            type="range"
            min="30"
            max="1600"
            step="10"
            @input="preset = ''"
          />
        </div>
      </template>
      <p class="demo-explanation" aria-live="polite">
        {{
          waiting === download
            ? "两个阶段耗时相近，需要结合更多证据判断。"
            : waiting > download
              ? "响应开始前，时间主要花在等待。"
              : "响应开始后，时间主要花在传输。"
        }}<template v-if="!props.compact">
          灰色 35 ms 为简化的其他阶段；总时间 {{ total }} ms。实际请求需要在
          DevTools 中检查。</template
        >
      </p>
    </div>
  </div>
</template>
