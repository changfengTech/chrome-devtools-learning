<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { chapters, lessons, type Lesson } from "../data/curriculum";
import book from "../data/foundations.json";
import networkBook from "../data/network-state.json";
import NetworkStateDemo from "./NetworkStateDemo.vue";
import performanceBook from "../data/performance.json";
import PerformanceDemo from "./PerformanceDemo.vue";
import memoryBook from "../data/memory.json";
import MemoryDemo from "./MemoryDemo.vue";
import advancedBook from "../data/advanced.json";
import AdvancedDemo from "./AdvancedDemo.vue";
import qualityBook from "../data/quality.json";
import QualityDemo from "./QualityDemo.vue";
import AppIcon from "./AppIcon.vue";
import FoundationDemo from "./FoundationDemo.vue";
import { assessmentComplete } from "../lib/progress";
import { useLearning } from "../composables/useLearning";
import { isHosted, labOrigin, labRequest, labWindowName } from "../lib/lab";
const props = defineProps<{ lesson: Lesson }>();
const content = computed(
  () =>
    [
      ...book,
      ...networkBook,
      ...performanceBook,
      ...memoryBook,
      ...qualityBook,
      ...advancedBook,
    ].find((item) => item.id === props.lesson.id)!,
);
const isAdvanced = computed(() =>
  advancedBook.some((item) => item.id === props.lesson.id),
);
const attempted = ref(
  Boolean(
    useLearning().record(props.lesson.id).practiceAt ||
      useLearning().record(props.lesson.id).challengeAt,
  ),
);
const prerequisites = computed(
  () => advancedBook.find((item) => item.id === props.lesson.id)?.prerequisites,
);
const advancedBoundary = computed(
  () => advancedBook.find((item) => item.id === props.lesson.id)?.boundary,
);
const isQuality = computed(() =>
  qualityBook.some((item) => item.id === props.lesson.id),
);
const isMemory = computed(() =>
  memoryBook.some((item) => item.id === props.lesson.id),
);
const isPerformance = computed(() =>
  performanceBook.some((item) => item.id === props.lesson.id),
);
const isNetworkState = computed(() =>
  networkBook.some((item) => item.id === props.lesson.id),
);
const apiBase = computed(() =>
  isAdvanced.value
    ? "/api/advanced"
    : isQuality.value
      ? "/api/quality"
      : isMemory.value
        ? "/api/memory"
        : isPerformance.value
          ? "/api/performance"
          : isNetworkState.value
            ? "/api/network-state"
            : "/api/foundations",
);
const learning = useLearning();
const step = ref(0),
  demoKey = ref(0),
  hintLevel = ref(learning.record(props.lesson.id).hints);
const steps = ["故障现场", "理解与演示", "商城实战", "独立挑战", "排查复盘"];
const practiceToken = ref(""),
  challengeToken = ref(""),
  busy = ref(false),
  feedback = ref("");
const observed = ref({ baseline: false, fixed: false });
const challengeObserved = ref({ baseline: false, fixed: false });
const practiceEvidence = ref(""),
  diagnosis = ref(""),
  evidence = ref(""),
  verification = ref("");
const answerViewed = ref(false);
let labWindow: Window | null = null;
interface Result {
  passed: boolean;
  checks: { label: string; passed: boolean }[];
  explanation: string;
  expectedChoice: string;
  boundary: string;
}
const result = ref<Result | null>(null);
const note = computed({
  get: () => learning.record(props.lesson.id).note,
  set: (value) => learning.update(props.lesson.id, { note: value }),
});
const isCapstone = computed(() => ["53", "54", "55"].includes(props.lesson.id));
const rubric = ["复现准确", "工具选择", "证据有效", "根因解释", "修复验证"];
const selfScores = computed(
  () => learning.record(props.lesson.id).capstoneScores || [0, 0, 0, 0, 0],
);
const selfTotal = computed(() => selfScores.value.reduce((a, b) => a + b, 0));
function score(index: number, event: Event) {
  const scores = [...selfScores.value];
  scores[index] = Number((event.target as HTMLSelectElement).value);
  learning.update(props.lesson.id, {
    capstoneScores: scores,
    challengeAt: undefined,
  });
}
const nextId = computed(
  () =>
    lessons[lessons.findIndex((item) => item.id === props.lesson.id) + 1]?.id ||
    "01",
);
function showHint() {
  hintLevel.value = Math.min(3, hintLevel.value + 1);
  learning.update(props.lesson.id, { hints: hintLevel.value });
}
async function prepare(mode: "practice" | "challenge") {
  busy.value = true;
  feedback.value = "";
  try {
    const session = await labRequest(`${apiBase.value}/sessions`, {
      lesson: props.lesson.id,
      mode,
    });
    if (mode === "practice") {
      practiceToken.value = session.token;
      observed.value = { baseline: false, fixed: false };
      practiceEvidence.value = "";
    } else {
      challengeToken.value = session.token;
      challengeObserved.value = { baseline: false, fixed: false };
      diagnosis.value = "";
      evidence.value = "";
      verification.value = "";
      result.value = null;
      answerViewed.value = false;
    }
    feedback.value =
      "实验已准备。打开独立商城，先运行故障；保留教程窗口用于接收结果。";
  } catch (error) {
    const reason = error instanceof Error ? error.message : "连接失败";
    feedback.value = isHosted
      ? `在线实验准备失败：${reason}。请稍后重新准备；若持续失败，请检查商城站点是否能打开。`
      : `无法准备实验：${reason}。请确认已运行 pnpm dev 或 pnpm preview:all。`;
  } finally {
    busy.value = false;
  }
}
function open(mode: "practice" | "challenge") {
  const token =
    mode === "practice" ? practiceToken.value : challengeToken.value;
  const query = new URLSearchParams({
    lesson: props.lesson.id,
    token,
    tutorial: location.origin,
  });
  labWindow = window.open(
    isAdvanced.value
      ? `${labOrigin}/advanced/${token}/?${query}`
      : isQuality.value
        ? `${labOrigin}/quality/${token}/?${query}`
        : isMemory.value
          ? `${labOrigin}/memory/${token}/?${query}`
          : isPerformance.value
            ? `${labOrigin}/performance/${token}/?${query}`
            : isNetworkState.value
              ? `${labOrigin}/labs/${token}/?${query}`
              : `${labOrigin}/foundations/?${query}`,
    `${labWindowName}-lesson`,
  );
  if (!labWindow)
    feedback.value = "窗口被拦截，请允许当前站点打开实验窗口后重试。";
}
function receive(event: MessageEvent) {
  const data = event.data;
  if (
    event.origin !== labOrigin ||
    event.source !== labWindow ||
    data?.type !== "devtools-foundation-result" ||
    data.lesson !== props.lesson.id ||
    data.passed !== true ||
    !["baseline", "fixed"].includes(data.phase)
  )
    return;
  if (data.token === practiceToken.value && data.mode === "practice")
    observed.value = { ...observed.value, [data.phase]: true };
  if (data.token === challengeToken.value && data.mode === "challenge")
    challengeObserved.value = {
      ...challengeObserved.value,
      [data.phase]: true,
    };
}
async function completePractice() {
  if (
    !practiceToken.value ||
    !observed.value.baseline ||
    !observed.value.fixed
  ) {
    feedback.value = "先在商城完成故障观察与修复后的页面检查，再提交证据。";
    return;
  }
  busy.value = true;
  try {
    const checked = await labRequest(`${apiBase.value}/grade`, {
      token: practiceToken.value,
      diagnosis: "a",
      evidence: practiceEvidence.value,
      verification: "a",
    });
    attempted.value = true;
    if (checked.passed) {
      learning.update(props.lesson.id, {
        practiceAt: new Date().toISOString(),
      });
      feedback.value = "引导练习已记录：商城观察与修复检查完成，证据选择一致。";
    } else
      feedback.value =
        "证据还没有对应上。回看实际节点、规则、日志或变量，再选择最直接的依据。";
  } catch (error) {
    feedback.value =
      error instanceof Error ? error.message : "检查失败，请重试。";
  } finally {
    busy.value = false;
  }
}
async function grade(reveal = false) {
  busy.value = true;
  try {
    const checked: Result = await labRequest(`${apiBase.value}/grade`, {
      token: challengeToken.value,
      diagnosis: diagnosis.value,
      evidence: evidence.value,
      verification: verification.value,
    });
    attempted.value = true;
    if (reveal) {
      answerViewed.value = true;
      learning.update(props.lesson.id, { hints: 3 });
      hintLevel.value = 3;
    }
    const selfComplete =
      !isCapstone.value || assessmentComplete(selfScores.value, note.value);
    result.value = {
      ...checked,
      passed: checked.passed && selfComplete,
      checks: [
        ...checked.checks,
        ...(isCapstone.value
          ? [
              {
                label: "综合报告与五维自评 ≥8/10，证据和验证非零（自评）",
                passed: selfComplete,
              },
            ]
          : []),
      ],
    };
    if (checked.passed && selfComplete && !reveal)
      learning.update(props.lesson.id, {
        challengeAt: new Date().toISOString(),
        challengeAssisted: answerViewed.value,
      });
    feedback.value =
      isCapstone.value && !selfComplete
        ? "案例与自评分别核对：请补齐综合报告和五维自评，不能把结构化答案当作能力认证。"
        : "";
  } catch (error) {
    feedback.value =
      error instanceof Error ? error.message : "检查失败，请重试。";
  } finally {
    busy.value = false;
  }
}
onMounted(() => window.addEventListener("message", receive));
onBeforeUnmount(() => window.removeEventListener("message", receive));
</script>
<template>
  <div class="lesson-page foundation-lesson">
    <a class="back-link" :href="`#chapter/${lesson.chapter}`"
      ><AppIcon name="arrow" class="reverse" :size="15" />返回本章</a
    >
    <div class="lesson-heading">
      <div>
        <div class="lesson-meta">
          <span class="panel-label">{{
            chapters.find((chapter) => chapter.id === lesson.chapter)?.title
          }}</span
          ><span>第 {{ lesson.id }} 课</span
          ><span>约 {{ lesson.minutes }} 分钟</span>
        </div>
        <h1>{{ content.hook }}</h1>
        <p v-if="isHosted && ['T02', 'T03', 'T06', '52'].includes(lesson.id)" class="setup-note">
          {{ lesson.id === 'T02' ? '在线环境：手机可以直接打开本次 HTTPS 商城地址，再从桌面 Chrome Inspect 目标页；端口转发练习仍需本地服务和 Android 真机。'
            : lesson.id === 'T06' ? '在线环境：真实 WebAuthn 使用商城 HTTPS 来源的独立原生页和对应 RP 域名，无需改成 localhost；课堂夹具与原生认证分别记录。'
            : '在线环境：覆盖响应与源码映射仍需你授权专用本地目录。Workspaces 保存工程源码需要下载本地项目；站点不会代写你的磁盘。' }}
        </p>
        <p>{{ lesson.goal }}</p>
        <p v-if="prerequisites" class="boundary-note">
          前置课程：{{ prerequisites }}。专题原生步骤按当前环境分别记录。
        </p>
      </div>
      <span class="ready-badge"><span class="status-dot"></span>可实战</span>
    </div>
    <nav class="lesson-steps" aria-label="学习步骤">
      <button
        v-for="(title, index) in steps"
        :key="title"
        :class="{ active: step === index }"
        :aria-current="step === index ? 'step' : undefined"
        @click="
          step = index;
          feedback = '';
        "
      >
        <span>{{ index + 1 }}</span
        >{{ title }}
      </button>
    </nav>
    <div class="lesson-layout">
      <section class="lesson-content">
        <template v-if="step === 0"
          ><p class="section-kicker">先确定正常行为，再复现</p>
          <h2>{{ lesson.title }}</h2>
          <div class="foundation-incident">
            <span>来自商城的一条问题</span>
            <p>{{ content.symptom }}</p>
          </div>
          <p class="body-copy">{{ content.principle }}</p>
          <div class="foundation-goal">
            <AppIcon name="compass" :size="23" />
            <div>
              <h3>这一课需要留下什么证据？</h3>
              <p>
                {{
                  lesson.goal
                }}。实战中请记录实际节点、属性、变量或调用；工具操作本身由你在
                DevTools 完成。
              </p>
            </div>
          </div>
          <button class="button primary" @click="step = 1">
            先动手理解原理<AppIcon name="arrow" :size="16" /></button
        ></template>
        <template v-else-if="step === 1"
          ><p class="section-kicker">用一个小模型理解关键关系</p>
          <h2>{{ lesson.demo }}</h2>
          <p class="body-copy">{{ content.principle }}</p>
          <AdvancedDemo
            v-if="isAdvanced"
            :key="`${lesson.id}-${demoKey}`"
            :lesson="lesson.id"
            :unlocked="attempted" />
          <QualityDemo
            v-else-if="isQuality"
            :key="`${lesson.id}-${demoKey}`"
            :lesson="lesson.id" />
          <MemoryDemo
            v-else-if="isMemory"
            :key="`${lesson.id}-${demoKey}`"
            :lesson="lesson.id" />
          <PerformanceDemo
            v-else-if="isPerformance"
            :key="`${lesson.id}-${demoKey}`"
            :lesson="lesson.id" />
          <NetworkStateDemo
            v-else-if="isNetworkState"
            :key="`${lesson.id}-${demoKey}`"
            :lesson="lesson.id" />
          <FoundationDemo
            v-else
            :key="`${lesson.id}-${demoKey}`"
            :lesson="lesson.id" />
          <div class="foundation-demo-actions">
            <button class="button secondary small" @click="demoKey++">
              重置演示</button
            ><span>先预测改变的结果，再操作验证。</span>
          </div>
          <section class="foundation-explanations" aria-label="关键原理">
            <article v-for="concept in content.concepts" :key="concept.title">
              <h3>{{ concept.title }}</h3>
              <p>{{ concept.body }}</p>
            </article>
          </section>
          <button class="button primary" @click="step = 2">
            进入真实商城实战<AppIcon name="external" :size="16" /></button
        ></template>
        <template v-else-if="step === 2"
          ><p class="section-kicker">使用真实的页面与 DevTools</p>
          <h2>{{ lesson.lab }}</h2>
          <ol class="foundation-steps">
            <li v-for="instruction in content.steps" :key="instruction">
              {{ instruction }}
            </li>
          </ol>
          <div class="foundation-runner">
            <div>
              <h3>引导案例</h3>
              <p>
                固定故障配置，先找证据，再修改并检查。实验与教程使用不同源。
              </p>
            </div>
            <button
              class="button primary"
              :disabled="busy"
              @click="prepare('practice')"
            >
              {{ practiceToken ? "重新准备引导实验" : "准备引导实验" }}</button
            ><button
              v-if="practiceToken"
              class="button secondary"
              @click="open('practice')"
            >
              打开引导商城<AppIcon name="external" :size="15" />
            </button>
            <div class="foundation-observations" aria-live="polite">
              <span>{{
                observed.baseline ? "✓ 故障已复现" : "○ 等待故障观察"
              }}</span
              ><span>{{
                observed.fixed ? "✓ 页面修复检查通过" : "○ 等待修复检查"
              }}</span>
            </div>
          </div>
          <label class="fd-label"
            >你观察到的关键证据<select v-model="practiceEvidence">
              <option value="" disabled>根据真实观察选择</option>
              <option
                v-for="option in content.evidences"
                :key="option.id"
                :value="option.id"
              >
                {{ option.label }}
              </option>
            </select></label
          ><button
            class="button primary"
            :disabled="busy || !practiceEvidence"
            @click="completePractice"
          >
            检查证据并记录练习<AppIcon name="check" :size="16" />
          </button>
          <p v-if="isAdvanced" class="boundary-note">
            {{ advancedBoundary }} 原生结果与本地练习分列，模型不计完成。
          </p>
          <p v-else-if="isQuality" class="boundary-note">
            Lighthouse
            只展示导入的真实报告；页面不生成模拟分数。服务器对照、手工 Overrides
            和原生工具操作分别取证；固定条件再复测。
          </p>
          <p v-else-if="isMemory" class="boundary-note">
            内存课在同一文档比较多批开关和清理后的引用；页面只统计自有资源，不能证明
            GC 或工具操作。第 50 课需在 Chrome Recorder
            实际录制、编辑和回放；页面示例不等于 Recorder。
          </p>
          <p v-else-if="isPerformance" class="boundary-note">
            商城每次运行会重新导航；在录制中准备加载场景，再执行目标操作。页面核对实际计时、几何、资源与业务结果，不读取
            DevTools 点击，也不代替你解释 trace。
          </p>
          <p v-else class="boundary-note">
            商城检查实际
            DOM、计算结果或请求次数，服务记录请求与检查报告。它不读取你的
            DevTools
            操作。手工修改后可点商城「检查当前页面」，也可应用对照方案验证。
          </p></template
        >
        <template v-else-if="step === 3"
          ><p class="section-kicker">换一组条件，自己来排查</p>
          <h2>这次，把证据串起来。</h2>
          <p class="body-copy">
            {{
              lesson.challenge
            }}。新案例更换数据，并可能采用本课另一种故障。先完成真实观察，再选择原因、证据和验证方案。
          </p>
          <button
            class="button primary"
            :disabled="busy"
            @click="prepare('challenge')"
          >
            {{ challengeToken ? "重新生成独立挑战" : "生成独立挑战"
            }}<AppIcon name="flag" :size="16" />
          </button>
          <div v-if="challengeToken" class="challenge-form">
            <button class="button secondary" @click="open('challenge')">
              打开挑战商城<AppIcon name="external" :size="16" />
            </button>
            <div class="foundation-observations">
              <span>{{
                challengeObserved.baseline ? "✓ 故障已观察" : "○ 待观察故障"
              }}</span
              ><span>{{
                challengeObserved.fixed ? "✓ 修复检查通过" : "○ 待完成修复检查"
              }}</span>
            </div>
            <label
              >最符合证据的原因<select v-model="diagnosis">
                <option value="" disabled>先观察，再判断</option>
                <option
                  v-for="option in content.diagnoses"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.label }}
                </option>
              </select></label
            ><label
              >支持这个判断的证据<select v-model="evidence">
                <option value="" disabled>选择直接依据</option>
                <option
                  v-for="option in content.evidences"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.label }}
                </option>
              </select></label
            ><label
              >如何验证修复<select v-model="verification">
                <option value="" disabled>选择针对性对照</option>
                <option
                  v-for="option in content.fixes"
                  :key="option.id"
                  :value="option.id"
                >
                  {{ option.label }}
                </option>
              </select></label
            >
            <section v-if="isCapstone" class="capstone-assessment">
              <h3>综合排查报告与五维自评</h3>
              <label class="note-label" for="capstone-report"
                >综合排查报告<span
                  >起始条件 / 工具 / 原始证据 / 根因 /
                  同条件复测与遗留问题</span
                ></label
              ><textarea
                id="capstone-report"
                v-model="note"
                maxlength="4000"
                rows="5"
                class="capstone-report"
              ></textarea>
              <div class="chapter-rubric">
                <label v-for="(dimension, index) in rubric" :key="dimension"
                  >{{ dimension
                  }}<select
                    :value="selfScores[index]"
                    @change="score(index, $event)"
                  >
                    <option :value="0">0 · 缺失或错误</option>
                    <option :value="1">1 · 部分成立</option>
                    <option :value="2">2 · 有充分依据</option>
                  </select></label
                >
              </div>
              <p class="boundary-note">
                自评 {{ selfTotal }}/10；目标 ≥8，证据与修复验证不得为
                0。报告与分数用于自查，不自动评分理解，也不证明原生工具操作。旧记录不会补造历史自评。
              </p>
            </section>
            <div class="fd-controls">
              <button
                class="button primary"
                :disabled="busy || !diagnosis || !evidence || !verification"
                @click="grade()"
              >
                检查挑战结果<AppIcon name="check" :size="16" /></button
              ><button
                class="button secondary"
                :disabled="busy"
                @click="grade(true)"
              >
                查看案例解析（记为辅助）
              </button>
            </div>
          </div>
          <section
            v-if="result"
            class="challenge-result"
            :class="{ passed: result.passed }"
          >
            <h3>
              {{
                result.passed
                  ? "挑战检查通过，证据与结果一致。"
                  : "还有证据需要补齐。"
              }}
            </h3>
            <ul>
              <li v-for="check in result.checks" :key="check.label">
                {{ check.passed ? "✓" : "○" }} {{ check.label }}
              </li>
            </ul>
            <p v-if="answerViewed || result.passed">
              {{
                content.diagnoses.find(
                  (option) => option.id === result?.expectedChoice,
                )?.label
              }}。证据：{{
                content.evidences.find(
                  (option) => option.id === result?.expectedChoice,
                )?.label
              }}。验证：{{
                content.fixes.find(
                  (option) => option.id === result?.expectedChoice,
                )?.label
              }}。
            </p>
            <p v-if="answerViewed">已查看解析；通过后会记录为使用辅助完成。</p>
            <p class="boundary-note">{{ result.boundary }}</p>
          </section></template
        >
        <template v-else
          ><p class="section-kicker">把方法用于下一次问题</p>
          <h2>留下你的排查路径。</h2>
          <div class="recap-list">
            <div>
              <span>观察</span>
              <p>{{ content.symptom }}</p>
            </div>
            <div>
              <span>理解</span>
              <p>{{ content.principle }}</p>
            </div>
            <div>
              <span>验证</span>
              <p>
                保持输入和条件一致，只改变相关原因；重新运行，再检查正常结果。
              </p>
            </div>
          </div>
          <label class="note-label" for="foundation-note"
            >我的排查笔记<span
              >现象 / 证据 / 根因 / 对照 / 还不能确定什么</span
            ></label
          ><textarea
            id="foundation-note"
            v-model="note"
            maxlength="4000"
            rows="7"
            placeholder="记录具体节点、声明、日志值、调用帧或复测结果。"
          ></textarea
          ><button
            class="button primary"
            @click="
              learning.update(lesson.id, { readAt: new Date().toISOString() })
            "
          >
            {{
              learning.record(lesson.id).readAt
                ? "已记录阅读完成"
                : "记录阅读完成"
            }}<AppIcon name="check" :size="16" /></button
          ><a class="text-link next-lesson" :href="`#lesson/${nextId}`"
            >下一课<AppIcon name="arrow" :size="16" /></a
        ></template>
        <p v-if="feedback" class="inline-feedback" role="status">
          {{ feedback }}
        </p>
      </section>
      <aside class="lesson-aside">
        <div class="aside-block">
          <AppIcon name="compass" :size="23" />
          <h3>本课学习目标</h3>
          <p>{{ lesson.goal }}</p>
          <h3>原理实验可以试试</h3>
          <ul>
            <li v-for="item in content.demoSteps" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div class="aside-block hint-block">
          <h3>按需展开提示</h3>
          <div
            v-for="(hint, index) in content.hints.slice(0, hintLevel)"
            :key="hint"
            class="hint"
          >
            <span>提示 {{ index + 1 }}</span>
            <p>{{ hint }}</p>
          </div>
          <button
            class="button secondary small"
            :disabled="hintLevel === 3"
            @click="showHint"
          >
            {{
              hintLevel === 3
                ? "提示已全部展开"
                : `展开第 ${hintLevel + 1} 级提示`
            }}
          </button>
        </div>
        <div class="aside-block lesson-checklist">
          <h3>我的学习记录</h3>
          <p>{{ learning.record(lesson.id).readAt ? "✓" : "○" }} 已阅读</p>
          <p>
            {{ learning.record(lesson.id).practiceAt ? "✓" : "○" }}
            已完成引导练习
          </p>
          <p>
            {{ learning.record(lesson.id).challengeAt ? "✓" : "○" }}
            已通过迁移挑战{{
              learning.record(lesson.id).challengeAssisted ? "（使用解析）" : ""
            }}
          </p>
        </div>
        <a
          class="source-link"
          :href="content.source"
          target="_blank"
          rel="noreferrer"
          >Chrome 官方参考<AppIcon name="external" :size="13"
        /></a>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.capstone-assessment {
  margin: 24px 0;
  border-top: 1px solid var(--border);
  padding-top: 20px;
}
.capstone-report {
  width: 100%;
  font: inherit;
  line-height: 1.8;
  padding: 14px;
  border: 1px solid #cbd8ec;
  border-radius: 6px;
  resize: vertical;
}
</style>
