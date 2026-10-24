<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import AppIcon from "./AppIcon.vue";
import TimingDemo from "./TimingDemo.vue";
import { useLearning } from "../composables/useLearning";
import { isHosted, labOrigin, labRequest, labUrl, labWindowName } from "../lib/lab";
const learning = useLearning();
const step = ref(0);
const steps = ["故障现场", "理解时序", "真实实战", "独立挑战", "排查复盘"];
const guess = ref("");
const feedback = ref("");
const practiceWaiting = ref("");
const practiceDownload = ref("");
interface Measurement {
  waiting: number;
  download: number;
  total: number;
  fixed: boolean;
}
const measurements = ref<
  Record<string, { baseline?: Measurement; fixed?: Measurement }>
>({});
let labWindow: Window | null = null;
const challengeId = ref("");
const diagnosis = ref("");
const evidence = ref("");
const verification = ref("");
const pending = ref(false);
const challengeMessage = ref("");
const result = ref<{
  passed: boolean;
  checks: { label: string; passed: boolean }[];
  explanation: string;
  boundary: string;
} | null>(null);
const note = computed({
  get: () => learning.record("21").note,
  set: (value) => learning.update("21", { note: value }),
});
const hints = [
  "总耗时相近不代表原因相同。先找请求中最长的阶段。",
  "检查 Timing 的 Waiting (TTFB) 与 Content Download，并比较响应体大小。",
  "清空 Network，重新加载商品，选择 products 请求并打开 Timing；只改变一个条件，再重复相同操作。",
];
const hintLevel = ref(learning.record("21").hints);
function showHint() {
  hintLevel.value = Math.min(3, hintLevel.value + 1);
  learning.update("21", { hints: hintLevel.value });
}
function openLab(scenario: string, token?: string) {
  labWindow = window.open(labUrl(scenario, token), `${labWindowName}-21`);
  if (!labWindow) {
    const message = "实验窗口被拦截，请允许此页面打开实验窗口后重试。";
    if (token) challengeMessage.value = message;
    else feedback.value = message;
  }
}
function onLabResult(event: MessageEvent) {
  if (
    event.origin !== labOrigin ||
    event.source !== labWindow ||
    event.data?.type !== "devtools-lab-result"
  )
    return;
  const data = event.data;
  const m = data.measurement;
  if (
    data.lesson !== "21" ||
    !m ||
    typeof m.fixed !== "boolean" ||
    ![m.waiting, m.download, m.total].every(
      (v) => typeof v === "number" && Number.isFinite(v) && v >= 0,
    )
  )
    return;
  const id = data.token ? `challenge-${data.token}` : data.scenario;
  if (data.token && data.token !== challengeId.value) return;
  if (!data.token && !["waiting", "download"].includes(id)) return;
  measurements.value = {
    ...measurements.value,
    [id]: { ...measurements.value[id], [m.fixed ? "fixed" : "baseline"]: m },
  };
}
function finishPractice() {
  if (
    !["waiting", "download"].every(
      (id) => measurements.value[id]?.baseline && measurements.value[id]?.fixed,
    )
  ) {
    feedback.value =
      "请先在两种场景分别完成故障请求和修复对照。实验页会传回实测结果。";
    return;
  }
  if (
    practiceWaiting.value !== "ttfb" ||
    practiceDownload.value !== "content"
  ) {
    feedback.value = "证据选择还不一致，请回看 Timing 中主要缩短的阶段。";
    return;
  }
  learning.update("21", { practiceAt: new Date().toISOString() });
  feedback.value = "引导练习已记录：两种实际请求与修复对照完成，证据选择正确。";
}
async function createChallenge() {
  pending.value = true;
  result.value = null;
  challengeMessage.value = "";
  try {
    const data = await labRequest("/api/challenges", {});
    challengeId.value = data.id;
    diagnosis.value = "";
    evidence.value = "";
    verification.value = "";
    challengeMessage.value =
      "案例已创建。打开挑战商城，先运行故障，再选择判断并运行修复对照。";
  } catch {
    challengeMessage.value =
      isHosted ? "暂时无法连接在线实验服务，请检查网络后重试。" : "无法连接实验服务。请在项目目录运行 pnpm dev，确认 4174 端口可用后重试。";
  } finally {
    pending.value = false;
  }
}
async function grade() {
  pending.value = true;
  try {
    result.value = await labRequest("/api/challenges/grade", {
      id: challengeId.value,
      diagnosis: diagnosis.value,
      evidence: evidence.value,
      verification: verification.value,
    });
    if (result.value?.passed)
      learning.update("21", { challengeAt: new Date().toISOString() });
    challengeMessage.value = "";
  } catch (error) {
    challengeMessage.value =
      error instanceof Error ? error.message : "检查失败，请重试。";
  } finally {
    pending.value = false;
  }
}
onMounted(() => window.addEventListener("message", onLabResult));
onBeforeUnmount(() => window.removeEventListener("message", onLabResult));
</script>

<template>
  <div class="lesson-page">
    <a class="back-link" href="#chapter/network"
      ><AppIcon name="arrow" :size="15" class="reverse" />Network 课程</a
    >
    <div class="lesson-heading">
      <div>
        <div class="lesson-meta">
          <span class="panel-label">Network</span><span>第 21 课</span
          ><span><AppIcon name="clock" :size="14" />约 20 分钟</span>
        </div>
        <h1>慢请求，慢在哪里？</h1>
        <p>总耗时相似的请求，可能需要完全不同的排查方向。</p>
      </div>
      <span class="ready-badge"><span class="status-dot"></span>可实战</span>
    </div>
    <nav class="lesson-steps" aria-label="学习步骤">
      <button
        v-for="(title, index) in steps"
        :key="title"
        :class="{ active: step === index }"
        :aria-current="step === index ? 'step' : undefined"
        @click="step = index"
      >
        <span>{{ index + 1 }}</span
        >{{ title }}
      </button>
    </nav>
    <div class="lesson-layout">
      <section class="lesson-content">
        <template v-if="step === 0">
          <p class="section-kicker">先观察，再猜想</p>
          <h2>商品列表要等一秒多。<br />是接口慢，还是下载慢？</h2>
          <p class="body-copy">
            用户只会告诉你「商品半天才出来」。单看总耗时，你还不能判断时间花在了哪里。用两种受控故障，找到下一条有效证据。
          </p>
          <div class="shop-preview">
            <div class="mini-shop-title">
              <strong>日常好物</strong><span>商品列表</span>
            </div>
            <div class="skeleton-products">
              <div v-for="n in 3" :key="n">
                <div class="skeleton-image"></div>
                <span></span><small></small>
              </div>
            </div>
            <p>
              <AppIcon
                name="clock"
                :size="15"
              />商品还在加载，原因等待你来发现。
            </p>
          </div>
          <fieldset class="choice-group">
            <legend>你现在会先检查什么？</legend>
            <label
              v-for="option in [
                { value: 'server', text: '直接认定服务端处理慢' },
                { value: 'size', text: '直接认定商品数据太大' },
                { value: 'timing', text: '先检查请求各阶段的耗时' },
              ]"
              :key="option.value"
              :class="{ selected: guess === option.value }"
              ><input
                v-model="guess"
                type="radio"
                name="guess"
                :value="option.value"
              />{{ option.text }}</label
            >
          </fieldset>
          <p v-if="guess" class="inline-feedback" role="status">
            {{
              guess === "timing"
                ? "先找耗时阶段，才能提出更具体的猜想。"
                : "这是可能原因，但证据还不够。先打开 Timing 看时间花在哪里。"
            }}
          </p>
          <button class="button primary" @click="step = 1">
            看看请求的时间线<AppIcon name="arrow" :size="16" />
          </button>
        </template>
        <template v-else-if="step === 1">
          <p class="section-kicker">把过程展开看</p>
          <h2>请求开始后，<br />并不一直在下载。</h2>
          <p class="body-copy">
            响应开始前有等待，响应开始后才是主体传输。拖动滑块，观察相同总时间可以怎样分配。
          </p>
          <TimingDemo />
          <div class="concept-pair">
            <div>
              <span class="phase-label waiting">Waiting (TTFB)</span>
              <h3>收到响应第一个字节之前</h3>
              <p>
                包含请求往返与服务处理等影响。较长的等待是线索，还需更多证据定位原因。
              </p>
            </div>
            <div>
              <span class="phase-label download">Content Download</span>
              <h3>接收响应主体的过程</h3>
              <p>
                结合响应体大小、网络条件等判断。浏览器的其他工作也可能产生影响。
              </p>
            </div>
          </div>
          <button class="button primary" @click="step = 2">
            到真实商城里验证<AppIcon name="external" :size="16" />
          </button>
        </template>
        <template v-else-if="step === 2">
          <p class="section-kicker">打开真实 DevTools</p>
          <h2>用两个请求，<br />建立自己的证据。</h2>
          <p class="body-copy">
            商城在独立标签页运行。打开
            <strong>Network → Fetch/XHR</strong
            >，清空日志，点击「重新加载商品」。选中
            <code>products</code> 请求，查看 <strong>Timing</strong>。
          </p>
          <div class="lab-cases">
            <article
              v-for="item in [
                { id: 'waiting', name: '场景 A', desc: '响应开始前等待较长' },
                { id: 'download', name: '场景 B', desc: '响应开始后传输较慢' },
              ]"
              :key="item.id"
            >
              <span class="case-number">{{ item.name }}</span>
              <h3>{{ item.desc }}</h3>
              <p>先运行故障，再「应用修复并加载」，保持相同条件。</p>
              <button class="button secondary" @click="openLab(item.id)">
                打开商城实验<AppIcon name="external" :size="15" />
              </button>
              <div class="measurement-status">
                <span :class="{ observed: measurements[item.id]?.baseline }">{{
                  measurements[item.id]?.baseline
                    ? "✓ 已收到故障测量"
                    : "○ 等待故障请求"
                }}</span
                ><span :class="{ observed: measurements[item.id]?.fixed }">{{
                  measurements[item.id]?.fixed
                    ? "✓ 已收到修复测量"
                    : "○ 等待修复对照"
                }}</span>
              </div>
              <p v-if="measurements[item.id]?.baseline" class="actual-timing">
                实测等待
                {{ measurements[item.id]?.baseline?.waiting.toFixed(0) }} ms /
                传输
                {{ measurements[item.id]?.baseline?.download.toFixed(0) }} ms
              </p>
            </article>
          </div>
          <div class="evidence-form">
            <h3>把观察变成判断</h3>
            <label
              >场景 A 修复后主要缩短的阶段<select v-model="practiceWaiting">
                <option value="" disabled>根据 Timing 选择</option>
                <option value="ttfb">Waiting (TTFB)</option>
                <option value="content">Content Download</option>
              </select></label
            ><label
              >场景 B 修复后主要缩短的阶段<select v-model="practiceDownload">
                <option value="" disabled>根据 Timing 选择</option>
                <option value="ttfb">Waiting (TTFB)</option>
                <option value="content">Content Download</option>
              </select></label
            ><button class="button primary" @click="finishPractice">
              检查证据并记录练习<AppIcon name="check" :size="16" />
            </button>
            <p v-if="feedback" role="status" class="inline-feedback">
              {{ feedback }}
            </p>
          </div>
          <p class="boundary-note">
            自动检查依据：商城传回的实际请求测量与证据选择，不读取 DevTools
            点击。完成后请自行恢复限速与请求阻断。
          </p>
        </template>
        <template v-else-if="step === 3">
          <p class="section-kicker">这一次，你来判断</p>
          <h2>一个新的慢请求。<br />先别急着给出答案。</h2>
          <p class="body-copy">
            商城随机生成一个案例。观察实际请求，选择证据和验证方案，再运行修复对照。服务会检查请求是否真正完成。
          </p>
          <button
            class="button primary"
            :disabled="pending"
            @click="createChallenge"
          >
            {{
              pending
                ? "正在连接实验…"
                : challengeId
                  ? "重新生成挑战"
                  : "生成独立挑战"
            }}<AppIcon name="flag" :size="16" />
          </button>
          <div v-if="challengeId" class="challenge-form">
            <div class="challenge-banner">
              <span>新案例已就绪</span
              ><button
                class="button secondary"
                @click="openLab('challenge', challengeId)"
              >
                打开挑战商城<AppIcon name="external" :size="15" />
              </button>
            </div>
            <label
              >主要问题发生在哪个阶段？<select v-model="diagnosis">
                <option value="" disabled>先观察，再选择</option>
                <option value="waiting">响应开始前等待较长</option>
                <option value="download">响应主体传输较长</option>
              </select></label
            ><label
              >最主要的时序证据是？<select v-model="evidence">
                <option value="" disabled>选择观察依据</option>
                <option value="ttfb">Waiting (TTFB) 占据主要耗时</option>
                <option value="content">Content Download 占据主要耗时</option>
              </select></label
            ><label
              >准备怎样验证猜想？<select v-model="verification">
                <option value="" disabled>选择针对性对照</option>
                <option value="service">减少实验服务等待，再看等待变化</option>
                <option value="payload">
                  减少实验数据与传输间隔，再看下载变化
                </option>
              </select></label
            >
            <p class="boundary-note">
              选好方案后，在挑战商城「应用修复并加载」。这是受控实验，不代表真实网站的通用结论。
            </p>
            <button
              class="button primary"
              :disabled="pending || !diagnosis || !evidence || !verification"
              @click="grade"
            >
              检查挑战结果<AppIcon name="check" :size="16" />
            </button>
          </div>
          <p v-if="challengeMessage" class="inline-feedback" role="status">
            {{ challengeMessage }}
          </p>
          <section
            v-if="result"
            class="challenge-result"
            :class="{ passed: result.passed }"
            aria-live="polite"
          >
            <h3>
              {{
                result.passed ? "挑战通过，证据链成立。" : "还有证据需要补齐。"
              }}
            </h3>
            <ul>
              <li v-for="check in result.checks" :key="check.label">
                <span>{{ check.passed ? "✓" : "○" }}</span
                >{{ check.label }}
              </li>
            </ul>
            <p>{{ result.explanation }}</p>
            <p class="boundary-note">{{ result.boundary }}</p>
          </section>
        </template>
        <template v-else>
          <p class="section-kicker">把方法留给下一次</p>
          <h2>从「很慢」，<br />走到可验证的猜想。</h2>
          <div class="recap-list">
            <div>
              <span>现象</span>
              <p>稳定复现并记录条件。总耗时长只是现象。</p>
            </div>
            <div>
              <span>证据</span>
              <p>区分响应前等待与主体传输，结合大小与上下文。</p>
            </div>
            <div>
              <span>验证</span>
              <p>针对主要阶段改变条件，执行相同操作比较。</p>
            </div>
            <div>
              <span>边界</span>
              <p>长 TTFB 不直接证明数据库慢；受控修复不等于线上方案。</p>
            </div>
          </div>
          <label class="note-label" for="lesson-note"
            >我的排查笔记<span>本机保存，最多 4000 字</span></label
          ><textarea
            id="lesson-note"
            v-model="note"
            maxlength="4000"
            rows="7"
            placeholder="观察到了什么？哪些证据支持判断？下一步验证什么？"
          ></textarea
          ><button
            class="button primary"
            @click="learning.update('21', { readAt: new Date().toISOString() })"
          >
            {{ learning.record("21").readAt ? "已记录阅读完成" : "记录阅读完成"
            }}<AppIcon name="check" :size="16" /></button
          ><a class="text-link next-lesson" href="#lesson/22"
            >查看下一课规划<AppIcon name="arrow" :size="16"
          /></a>
        </template>
      </section>
      <aside class="lesson-aside">
        <div class="aside-block">
          <AppIcon name="compass" :size="22" />
          <h3>这一课，你会学会</h3>
          <ul>
            <li>找到主要耗时阶段</li>
            <li>区分等待与传输证据</li>
            <li>用修复对照验证判断</li>
          </ul>
        </div>
        <div class="aside-block hint-block">
          <h3>卡住了？按需看提示</h3>
          <p>先自己观察，再逐步展开。</p>
          <div
            v-for="(hint, index) in hints.slice(0, hintLevel)"
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
          <p>{{ learning.record("21").readAt ? "✓" : "○" }} 已阅读</p>
          <p>
            {{ learning.record("21").practiceAt ? "✓" : "○" }} 已完成引导练习
          </p>
          <p>
            {{ learning.record("21").challengeAt ? "✓" : "○" }} 已通过迁移挑战
          </p>
        </div>
        <a
          class="source-link"
          href="https://developer.chrome.com/docs/devtools/network/reference#timing-explanation"
          target="_blank"
          rel="noreferrer"
          >Chrome 官方参考<AppIcon name="external" :size="13"
        /></a>
      </aside>
    </div>
  </div>
</template>
