<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { labOrigin, labRequest } from "../lib/lab";
import { useLearning } from "../composables/useLearning";
const props = defineProps<{ chapter: string }>();
const learning = useLearning(),
  token = ref(""),
  busy = ref(false),
  message = ref(""),
  options = ref<{
    diagnoses: { id: string; label: string }[];
    evidences: { id: string; label: string }[];
    fixes: { id: string; label: string }[];
  } | null>(null);
const selected = ref({ diagnosis: "", evidence: "", verification: "" }),
  result = ref<{
    passed: boolean;
    checks: { label: string; passed: boolean }[];
    expectedChoice: string;
  } | null>(null),
  observed = ref({ baseline: false, fixed: false }),
  reveal = ref(false);
const rubric = ["复现准确", "工具选择", "证据有效", "根因解释", "修复验证"];
const record = computed(() => learning.chapterRecord(props.chapter));
const total = computed(() => record.value.scores.reduce((a, b) => a + b, 0));
const note = computed({
  get: () => record.value.note,
  set: (value) => learning.updateChapter(props.chapter, { note: value }),
});
let popup: Window | null = null;
async function prepare() {
  busy.value = true;
  try {
    const data = await labRequest("/api/network-state/chapter", {
      chapter: props.chapter,
    });
    token.value = data.token;
    options.value = null;
    result.value = null;
    reveal.value = false;
    selected.value = { diagnosis: "", evidence: "", verification: "" };
    observed.value = { baseline: false, fixed: false };
    message.value = "新任务已准备。先独立观察，再读取结构化诊断选项。";
  } catch (e) {
    message.value = e instanceof Error ? e.message : "准备失败";
  } finally {
    busy.value = false;
  }
}
function open() {
  popup = window.open(
    `${labOrigin}/labs/${token.value}/?tutorial=${encodeURIComponent(location.origin)}`,
    "devtools-chapter-lab",
  );
}
function receive(event: MessageEvent) {
  const d = event.data;
  if (
    event.origin === labOrigin &&
    event.source === popup &&
    d?.type === "devtools-foundation-result" &&
    d.token === token.value &&
    d.mode === "challenge" &&
    d.passed === true &&
    ["baseline", "fixed"].includes(d.phase)
  )
    observed.value = { ...observed.value, [d.phase]: true };
}
async function loadOptions() {
  try {
    options.value = await labRequest(
      `/api/network-state/lesson?token=${token.value}`,
    );
  } catch (e) {
    message.value = e instanceof Error ? e.message : "读取失败";
  }
}
function score(index: number, event: Event) {
  const scores = [...record.value.scores];
  scores[index] = Number((event.target as HTMLSelectElement).value);
  learning.updateChapter(props.chapter, { scores });
}
async function grade(showAnswer = false) {
  busy.value = true;
  try {
    result.value = await labRequest("/api/network-state/grade", {
      token: token.value,
      ...selected.value,
    });
    if (showAnswer) {
      reveal.value = true;
      learning.updateChapter(props.chapter, { assisted: true });
    }
    const selfComplete =
      total.value >= 8 &&
      record.value.scores[2]! >= 1 &&
      record.value.scores[4]! >= 1 &&
      note.value.trim().length > 0;
    if (result.value?.passed && !showAnswer && selfComplete) {
      learning.updateChapter(props.chapter, {
        completedAt: new Date().toISOString(),
        assisted: reveal.value,
      });
      message.value =
        "案例检查与章末自评已完成。分数为自评，不是自动能力认证。";
    } else
      message.value = showAnswer
        ? "已查看解析，会标记辅助。"
        : result.value?.passed
          ? "案例检查通过；请补齐排查报告与自评，达到 8/10 且证据、验证非零后再记录。"
          : "案例证据或修复尚未对应，请检查反馈。";
  } catch (e) {
    message.value = e instanceof Error ? e.message : "检查失败";
  } finally {
    busy.value = false;
  }
}
onMounted(() => window.addEventListener("message", receive));
onBeforeUnmount(() => window.removeEventListener("message", receive));
</script>
<template>
  <section class="chapter-task">
    <p class="section-kicker">将一章的方法用于新案例</p>
    <h2>{{ chapter === "network" ? "Network" : "Application" }} 章末挑战</h2>
    <p>
      初始不指定具体课程与根因。自己选择工具，留下实际证据，再检查判断和修复。
    </p>
    <div class="fd-controls">
      <button class="button primary" :disabled="busy" @click="prepare">
        {{ token ? "重新生成章末任务" : "生成章末任务" }}</button
      ><button v-if="token" class="button secondary" @click="open">
        打开章末商城</button
      ><button
        v-if="token && !options"
        class="button secondary"
        @click="loadOptions"
      >
        读取诊断选项
      </button>
    </div>
    <p v-if="token" class="boundary-note">
      {{ observed.baseline ? "✓" : "○" }} 故障已观察　{{
        observed.fixed ? "✓" : "○"
      }}
      修复已回传
    </p>
    <div v-if="options" class="challenge-form">
      <label
        >章末原因<select v-model="selected.diagnosis">
          <option value="" disabled>依据观察选择</option>
          <option v-for="o in options.diagnoses" :key="o.id" :value="o.id">
            {{ o.label }}
          </option>
        </select></label
      ><label
        >章末证据<select v-model="selected.evidence">
          <option value="" disabled>选择实际依据</option>
          <option v-for="o in options.evidences" :key="o.id" :value="o.id">
            {{ o.label }}
          </option>
        </select></label
      ><label
        >章末验证<select v-model="selected.verification">
          <option value="" disabled>选择针对性复测</option>
          <option v-for="o in options.fixes" :key="o.id" :value="o.id">
            {{ o.label }}
          </option>
        </select></label
      >
    </div>
    <label class="note-label"
      >章末排查报告<span>起始条件 / 工具 / 实际证据 / 根因 / 修复与恢复</span
      ><textarea
        v-model="note"
        rows="5"
        maxlength="4000"
        placeholder="记录请求、存储条目、控制关系或响应来源的具体值。"
      ></textarea>
    </label>
    <div class="chapter-rubric">
      <label v-for="(dimension, index) in rubric" :key="dimension"
        >{{ dimension
        }}<select :value="record.scores[index]" @change="score(index, $event)">
          <option :value="0">0 · 缺失或错误</option>
          <option :value="1">1 · 部分成立</option>
          <option :value="2">2 · 有充分依据</option>
        </select></label
      >
    </div>
    <p>
      自评 {{ total }}/10；目标 ≥8，证据和修复验证均不得为 0。{{
        record.completedAt ? "已保存章末自评。" : ""
      }}{{ record.assisted ? "（使用解析）" : "" }}
    </p>
    <div v-if="token" class="fd-controls">
      <button
        class="button primary"
        :disabled="busy || !options"
        @click="grade()"
      >
        检查并记录章末自评</button
      ><button
        class="button secondary"
        :disabled="busy || !options"
        @click="grade(true)"
      >
        查看章末解析（记为辅助）
      </button>
    </div>
    <ul v-if="result">
      <li v-for="check in result.checks" :key="check.label">
        {{ check.passed ? "✓" : "○" }} {{ check.label }}
      </li>
    </ul>
    <p v-if="reveal && options && result">
      原因：{{
        options.diagnoses.find((o) => o.id === result?.expectedChoice)?.label
      }}。证据：{{
        options.evidences.find((o) => o.id === result?.expectedChoice)?.label
      }}。
    </p>
    <p v-if="message" role="status" class="inline-feedback">{{ message }}</p>
    <p class="boundary-note">
      服务检查案例请求与结构化答案。五维分数与文字报告由你自评，不靠关键词冒充理解评分。章末记录与课内状态分开，随学习记录一同导出。
    </p>
  </section>
</template>
<style>
.chapter-task {
  border-top: 1px solid var(--border);
  padding: 30px 0;
  margin-top: 30px;
}
.chapter-task > p {
  font-size: 14px;
  line-height: 1.9;
  color: #63748e;
  margin: 15px 0;
}
.chapter-task h2 {
  font-size: 26px;
  margin: 12px 0;
}
.chapter-task .challenge-form {
  max-width: 750px;
}
.chapter-task textarea {
  display: block;
  width: 100%;
  margin-top: 12px;
  border: 1px solid #dce4ef;
  border-radius: 6px;
  padding: 15px;
  font: inherit;
  line-height: 1.8;
  background: white;
}
.chapter-rubric {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin: 20px 0;
}
.chapter-rubric label {
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.chapter-rubric select {
  padding: 10px;
  border: 1px solid #dce4ef;
  background: white;
  border-radius: 5px;
  color: #48617f;
}
.chapter-task > ul {
  font-size: 13px;
  line-height: 2;
  color: #61748d;
}
</style>
