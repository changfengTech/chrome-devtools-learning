<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import AppIcon from "./components/AppIcon.vue";
import TimingDemo from "./components/TimingDemo.vue";
import LessonTwentyOne from "./components/LessonTwentyOne.vue";
import FoundationLesson from "./components/FoundationLesson.vue";
import networkBook from "./data/network-state.json";
import performanceBook from "./data/performance.json";
import memoryBook from "./data/memory.json";
import advancedBook from "./data/advanced.json";
import qualityBook from "./data/quality.json";
import ChapterChallenge from "./components/ChapterChallenge.vue";
import { chapters, lessons, getLesson } from "./data/curriculum";
import { useLearning } from "./composables/useLearning";
import { isHosted, labRequest, labUrl, labWindowName } from "./lib/lab";
const learning = useLearning();
const route = ref(location.hash.slice(1) || "home");
const search = ref("");
const sidebarOpen = ref(false);
const service = ref<"checking" | "online" | "offline">("checking");
const fileInput = ref<HTMLInputElement | null>(null);
const activeChapter = computed(() =>
  route.value.startsWith("chapter/") ? route.value.split("/")[1] : "",
);
const activeLesson = computed(() =>
  route.value.startsWith("lesson/")
    ? getLesson(route.value.split("/")[1] || "")
    : undefined,
);
const pageIsCatalog = computed(
  () => route.value === "home" || route.value.startsWith("chapter/"),
);
const selectedChapter = computed(() =>
  chapters.find((chapter) => chapter.id === activeChapter.value),
);
function matches(lesson: (typeof lessons)[number]) {
  return `${lesson.id} ${lesson.title} ${lesson.goal} ${lesson.demo} ${lesson.lab} ${lesson.challenge} ${lesson.chapter}`
    .toLowerCase()
    .includes(search.value.trim().toLowerCase());
}
const groups = computed(() =>
  chapters
    .filter(
      (chapter) =>
        (!activeChapter.value || chapter.id === activeChapter.value) &&
        lessons.some(
          (lesson) => lesson.chapter === chapter.id && matches(lesson),
        ),
    )
    .map((chapter) => ({
      ...chapter,
      lessons: lessons.filter(
        (lesson) => lesson.chapter === chapter.id && matches(lesson),
      ),
    })),
);
const totalResults = computed(() =>
  groups.value.reduce((sum, chapter) => sum + chapter.lessons.length, 0),
);
const readyResults = computed(
  () =>
    groups.value
      .flatMap((chapter) => chapter.lessons)
      .filter((lesson) => lesson.status === "ready").length,
);
const progressRows = computed(() =>
  lessons.filter((lesson) => learning.state.value.records[lesson.id]),
);
async function checkService() {
  service.value = "checking";
  try {
    const data = await labRequest("/health");
    service.value = data.ok ? "online" : "offline";
  } catch {
    service.value = "offline";
  }
}
function syncRoute() {
  route.value = location.hash.slice(1) || "home";
  sidebarOpen.value = false;
  search.value = "";
  window.scrollTo({ top: 0 });
}
function focusMain() {
  document.getElementById("main-content")?.focus();
}
function openLab(scenario = "waiting") {
  window.open(labUrl(scenario), `${labWindowName}-preview`);
}
async function importFile(event: Event) {
  const input = event.target as HTMLInputElement;
  if (input.files?.[0]) await learning.importRecords(input.files[0]);
  input.value = "";
}
const symptomLinks = [
  {
    title: "发布前不知道从哪查起",
    icon: "flag",
    clues: "先列正常行为和检查矩阵，再关联八面板证据与遗留问题。",
    lesson: "55",
  },
  {
    title: "真机、定位或浏览器专题",
    icon: "tools",
    clues: "从前置依赖和可用条件开始；本地练习与真实设备分别取证。",
    lesson: "T01",
  },
  {
    title: "请求失败，或者数据不对",
    icon: "network",
    clues: "找到对应请求，检查参数、状态与响应。",
    lesson: "20",
  },
  {
    title: "列表加载很慢",
    icon: "clock",
    clues: "检查 Timing，区分响应前等待与主体传输。",
    lesson: "21",
  },
  {
    title: "点击或输入很卡",
    icon: "activity",
    clues: "录制具体交互，缩小选区，检查 Main 中的长任务。",
    lesson: "30",
  },
  {
    title: "反复操作后越来越慢",
    icon: "chip",
    clues: "观察内存与 DOM 趋势，再追保留引用。",
    lesson: "54",
  },
  {
    title: "刷新后状态异常",
    icon: "database",
    clues: "区分页面状态、存储、HTTP 缓存和 Service Worker。",
    lesson: "53",
  },
  {
    title: "样式不对，或者点不到",
    icon: "layers",
    clues: "定位节点，检查生效规则、布局与交互状态。",
    lesson: "05",
  },
];
onMounted(() => {
  window.addEventListener("hashchange", syncRoute);
  checkService();
});
onBeforeUnmount(() => window.removeEventListener("hashchange", syncRoute));
</script>
<template>
  <a class="skip-link" href="#main-content" @click.prevent="focusMain"
    >跳到主要内容</a
  >
  <div class="app-shell">
    <button
      v-if="sidebarOpen"
      class="sidebar-scrim"
      aria-label="关闭章节导航"
      @click="sidebarOpen = false"
    ></button>
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <a class="brand" href="#home"
        ><span class="brand-mark"><AppIcon name="code" :size="23" /></span
        ><span>DevTools<span class="brand-subtitle">实验室</span></span></a
      >
      <div class="sidebar-intro">
        <span class="tiny-label">从问题出发，系统学习</span>
        <h2>你的排查工具箱</h2>
      </div>
      <nav aria-label="课程章节">
        <a
          href="#home"
          class="all-course-link"
          :class="{ active: route === 'home' }"
          ><AppIcon name="book" :size="18" />完整学习路线<span>63</span></a
        ><a
          v-for="chapter in chapters"
          :key="chapter.id"
          :href="`#chapter/${chapter.id}`"
          class="chapter-nav"
          :class="{
            active:
              activeChapter === chapter.id ||
              activeLesson?.chapter === chapter.id,
          }"
          ><AppIcon :name="chapter.icon" :size="18" /><span>{{
            chapter.title
          }}</span
          ><small>{{
            lessons.filter((lesson) => lesson.chapter === chapter.id).length
          }}</small></a
        >
      </nav>
      <div class="sidebar-bottom">
        <div class="learning-summary">
          <span>迁移挑战通过</span
          ><strong>{{ learning.passedCount.value }} <small>/ 63</small></strong>
        </div>
        <div class="progress-track">
          <span
            :style="{ width: `${(learning.passedCount.value / 63) * 100}%` }"
          ></span>
        </div>
        <p>学习记录仅保存在这台设备</p>
        <a href="#progress" class="text-link"
          >管理学习记录<AppIcon name="chevron" :size="14"
        /></a>
      </div>
    </aside>
    <div class="workspace">
      <header class="topbar">
        <button
          class="icon-button menu-button"
          :aria-expanded="sidebarOpen"
          aria-label="打开章节导航"
          @click="sidebarOpen = !sidebarOpen"
        >
          <AppIcon name="menu" />
        </button>
        <nav aria-label="主要导航">
          <a href="#home" :class="{ active: pageIsCatalog || activeLesson }"
            >学习路线</a
          ><a href="#lab" :class="{ active: route === 'lab' }">实验商城</a
          ><a href="#reference" :class="{ active: route === 'reference' }"
            >排查速查</a
          >
        </nav>
        <div class="topbar-right">
          <button
            class="service-status"
            :aria-label="
              service === 'online'
                ? '实验服务已连接，点击重新检查'
                : '实验服务未连接，点击重试'
            "
            @click="checkService"
          >
            <span class="status-dot" :class="service"></span
            ><span>{{
              service === "online"
                ? "实验服务已连接"
                : service === "offline"
                  ? "实验服务未连接"
                  : "正在连接实验"
            }}</span></button
          ><a class="profile-button" href="#progress" aria-label="学习记录"
            ><AppIcon name="book" :size="18"
          /></a>
        </div>
      </header>
      <main id="main-content" tabindex="-1" class="main-content">
        <div v-if="learning.notice.value" class="notice" role="status">
          <AppIcon name="info" :size="18" /><span>{{
            learning.notice.value
          }}</span
          ><button
            class="icon-button"
            aria-label="关闭通知"
            @click="learning.notice.value = ''"
          >
            <AppIcon name="close" :size="16" />
          </button>
        </div>
        <template v-if="pageIsCatalog">
          <section v-if="!activeChapter" class="home-hero">
            <div class="hero-copy">
              <span class="hero-topic"><span></span>从真实网页故障开始</span>
              <h1>页面很慢，<br />先看哪里？</h1>
              <p>
                把「好像有问题」变成有证据的判断。<br />在交互演示与真实商城里，系统学会
                Chrome DevTools。
              </p>
              <div class="hero-actions">
                <a class="button primary" href="#lesson/01"
                  >从第 01 课开始<AppIcon name="arrow" :size="17" /></a
                ><a class="hero-secondary" href="#chapter/intro"
                  >先看看学习路线<AppIcon name="chevron" :size="14"
                /></a>
              </div>
              <p class="hero-note">
                <AppIcon name="clock" :size="14" />每课约 20 分钟<span
                ></span>中文讲解，英文工具
              </p>
            </div>
            <div class="hero-visual">
              <div class="hero-visual-label">
                <span class="lesson-number">21</span
                ><span
                  >慢请求慢在哪里<strong
                    >相同的总耗时，不同的排查方向</strong
                  ></span
                >
              </div>
              <TimingDemo compact />
              <div class="hero-visual-foot">
                <AppIcon name="info" :size="14" /><span
                  >点上方场景，看看时间花在哪里。</span
                >
              </div>
            </div>
          </section>
          <section v-else class="chapter-heading">
            <div class="large-icon">
              <AppIcon :name="selectedChapter?.icon || 'book'" :size="27" />
            </div>
            <div>
              <p class="section-kicker">
                学习路线 / {{ selectedChapter?.title }}
              </p>
              <h1>{{ selectedChapter?.subtitle }}</h1>
              <p>从理解原理到收集证据，再用新的问题验证你的方法。</p>
            </div>
          </section>
          <div class="learning-contract">
            <div>
              <AppIcon name="compass" :size="20" /><span>理解原理</span>
            </div>
            <AppIcon name="chevron" :size="13" />
            <div>
              <AppIcon name="network" :size="20" /><span>真实实战</span>
            </div>
            <AppIcon name="chevron" :size="13" />
            <div><AppIcon name="flag" :size="20" /><span>独立挑战</span></div>
            <p>八大面板，55 节主线 + 8 节专题</p>
          </div>
          <section class="catalog">
            <div class="section-heading">
              <div>
                <h2>
                  {{
                    selectedChapter
                      ? `${selectedChapter.title} 课程`
                      : "沿着路线，建立排查能力"
                  }}
                </h2>
                <p>
                  55 节主线与 8
                  节专题已开放，原生设备与工具验证按课内说明分别记录。
                </p>
              </div>
              <label class="search-field"
                ><AppIcon name="search" :size="17" /><input
                  v-model="search"
                  type="search"
                  placeholder="搜索课程或工具…"
                  aria-label="搜索课程或工具"
              /></label>
            </div>
            <div class="catalog-meta">
              <span>{{ totalResults }} 节课程</span
              ><span
                ><i class="status-dot"></i>{{ readyResults }} 节可实战<span
                  class="meta-divider"
                  >/</span
                >原生验证分别记录</span
              >
            </div>
            <div v-if="!groups.length" class="empty-state">
              <AppIcon name="search" :size="28" />
              <h3>还没有匹配的课程</h3>
              <p>试试「缓存」「Network」或「断点」。</p>
              <button class="button secondary" @click="search = ''">
                清空搜索
              </button>
            </div>
            <section
              v-for="(group, index) in groups"
              :key="group.id"
              class="course-group"
            >
              <div class="course-group-header">
                <span class="group-number">{{
                  String(
                    chapters.findIndex((item) => item.id === group.id) + 1,
                  ).padStart(2, "0")
                }}</span>
                <div>
                  <h3>
                    {{ group.title
                    }}<span
                      v-if="['network', 'performance'].includes(group.id)"
                      class="focus-tag"
                      >重点</span
                    >
                  </h3>
                  <p>{{ group.subtitle }}</p>
                </div>
                <span class="group-count">{{ group.lessons.length }} 节</span>
              </div>
              <div class="lesson-list">
                <a
                  v-for="lesson in group.lessons"
                  :key="lesson.id"
                  :href="`#lesson/${lesson.id}`"
                  class="lesson-row"
                  :class="{ 'ready-row': lesson.status === 'ready' }"
                  ><span class="lesson-id">{{ lesson.id }}</span>
                  <div class="lesson-row-copy">
                    <h4>
                      {{ lesson.title
                      }}<span
                        v-if="learning.record(lesson.id).challengeAt"
                        class="passed-small"
                        >已通过</span
                      >
                    </h4>
                    <p>{{ lesson.goal }}</p>
                  </div>
                  <span class="row-duration">{{ lesson.minutes }} 分钟</span
                  ><span
                    :class="
                      lesson.status === 'ready'
                        ? 'ready-badge'
                        : 'planned-badge'
                    "
                    >{{
                      lesson.status === "ready" ? "可实战" : "课程规划"
                    }}</span
                  ><AppIcon name="chevron" :size="16"
                /></a>
              </div>
              <p v-if="index === groups.length - 1" class="catalog-end">
                选对工具，找到证据，解释原因，验证修复。
              </p>
            </section>
          </section>
          <ChapterChallenge
            v-if="
              activeChapter &&
              [
                'elements',
                'console',
                'sources',
                'network',
                'application',
                'performance',
                'memory',
                'lighthouse',
              ].includes(activeChapter)
            "
            :key="activeChapter"
            :chapter="activeChapter"
          />
        </template>
        <LessonTwentyOne v-else-if="activeLesson?.id === '21'" />
        <FoundationLesson
          v-else-if="
            activeLesson &&
            (Number(activeLesson.id) <= 18 ||
              [
                ...networkBook,
                ...performanceBook,
                ...memoryBook,
                ...qualityBook,
                ...advancedBook,
              ].some((item) => item.id === activeLesson?.id))
          "
          :key="activeLesson.id"
          :lesson="activeLesson"
        />
        <section v-else-if="activeLesson" class="planned-lesson">
          <a class="back-link" :href="`#chapter/${activeLesson.chapter}`"
            ><AppIcon name="arrow" :size="15" class="reverse" />返回本章</a
          >
          <div class="lesson-meta">
            <span class="panel-label">{{
              chapters.find((item) => item.id === activeLesson?.chapter)?.title
            }}</span
            ><span>第 {{ activeLesson.id }} 课</span
            ><span class="planned-badge">课程规划</span>
          </div>
          <h1>{{ activeLesson.title }}</h1>
          <p class="body-copy">
            课程设计已确认，交互演示和真实实验尚未开放。下面是本课的完整学习安排。
          </p>
          <div class="planned-objectives">
            <article
              v-for="item in [
                {
                  title: '学习目标',
                  content: activeLesson.goal,
                  icon: 'compass',
                },
                {
                  title: '交互演示',
                  content: activeLesson.demo,
                  icon: 'activity',
                },
                {
                  title: '商城实战',
                  content: activeLesson.lab,
                  icon: 'network',
                },
                {
                  title: '独立挑战',
                  content: activeLesson.challenge,
                  icon: 'flag',
                },
              ]"
              :key="item.title"
            >
              <AppIcon :name="item.icon" :size="23" />
              <div>
                <h2>{{ item.title }}</h2>
                <p>{{ item.content }}</p>
              </div>
            </article>
          </div>
          <div class="planned-cta">
            <div>
              <h3>先用一节完整实战，认识学习方式</h3>
              <p>第 21 课包含时间线、真实慢请求和迁移挑战。</p>
            </div>
            <a href="#lesson/21" class="button primary"
              >体验已开放课程<AppIcon name="arrow" :size="16"
            /></a>
          </div>
        </section>
        <section v-else-if="route === 'reference'" class="reference-page">
          <p class="section-kicker">从症状找到下一步</p>
          <h1>遇到问题，先找证据。</h1>
          <p class="body-copy">
            这些入口帮你开始排查。实际原因需要结合观察验证。
          </p>
          <div class="symptom-grid">
            <a
              v-for="item in symptomLinks"
              :key="item.title"
              :href="`#lesson/${item.lesson}`"
              ><AppIcon :name="item.icon" :size="25" />
              <h2>{{ item.title }}</h2>
              <p>{{ item.clues }}</p>
              <span
                :class="
                  getLesson(item.lesson)?.status === 'ready'
                    ? 'ready-badge'
                    : 'planned-badge'
                "
                >{{
                  getLesson(item.lesson)?.status === "ready"
                    ? "可实战"
                    : "课程规划"
                }}</span
              ></a
            >
          </div>
        </section>
        <section v-else-if="route === 'lab'" class="lab-hub">
          <p class="section-kicker">日常好物 / 独立实验商城</p>
          <h1>到真实页面里，验证你的判断。</h1>
          <p class="body-copy">
            商城与教程分开运行。先打开 DevTools，再复现当前问题。第 01～18
            课提供 DOM、日志与断点实验；第 21 课提供真实慢请求。
          </p>
          <div v-if="service !== 'online'" class="setup-note">
            <h3>{{ isHosted ? "在线实验服务暂未连接" : "先连接本地实验服务" }}</h3>
            <p v-if="isHosted">请检查当前网络是否能访问商城站点，稍后重新检查连接。已保存的学习记录不受影响。</p>
            <p v-else>项目目录运行 <code>pnpm dev</code>，同时启动教程和商城。</p>
            <button class="button secondary" @click="checkService">
              重新检查连接
            </button>
          </div>
          <h2>基础排查实验</h2>
          <div class="lab-cases">
            <article
              v-for="item in [
                {
                  id: '01',
                  title: '排查入门 · 01–03',
                  text: '选对观察对象、稳定复现、控制实验条件。',
                },
                {
                  id: '04',
                  title: 'Elements · 04–08',
                  text: '从节点、样式与布局找到证据，检查点击与可访问性。',
                },
                {
                  id: '09',
                  title: 'Console · 09–12',
                  text: '日志、错误堆栈、执行上下文与可信取证。',
                },
                {
                  id: '13',
                  title: 'Sources · 13–18',
                  text: '真实源码映射、单步、作用域、各类断点与异步排查。',
                },
              ]"
              :key="item.id"
            >
              <AppIcon name="compass" :size="25" />
              <h2>{{ item.title }}</h2>
              <p>{{ item.text }}</p>
              <a class="button primary" :href="`#lesson/${item.id}`"
                >从课程准备实验<AppIcon name="arrow" :size="16"
              /></a>
            </article>
          </div>
          <h2>网络与状态实验</h2>
          <div class="lab-cases">
            <article>
              <AppIcon name="network" :size="25" />
              <h2>Network · 19–26</h2>
              <p>真实请求、时序、HTTP 缓存、CORS、失败恢复与持续连接。</p>
              <a class="button primary" href="#chapter/network"
                >进入网络课程与章末挑战</a
              >
            </article>
            <article>
              <AppIcon name="database" :size="25" />
              <h2>Application · 35–39</h2>
              <p>Cookie、Storage、IndexedDB、worker 与独立缓存策略。</p>
              <a class="button primary" href="#chapter/application"
                >进入状态课程与章末挑战</a
              >
            </article>
          </div>
          <div class="lab-cases">
            <article>
              <AppIcon name="performance" :size="25" />
              <h2>Performance · 27–34 / Animations · 51</h2>
              <p>
                真实 CPU、任务切分、关键路径、布局、绘制、Coverage 和 CSS 动画。
              </p>
              <a class="button primary" href="#chapter/performance"
                >进入性能课程与章末挑战</a
              >
            </article>
          </div>
          <div class="lab-cases">
            <article>
              <AppIcon name="chip" :size="25" />
              <h2>Memory · 40–44 / Recorder · 50</h2>
              <p>
                真实对象、Detached
                DOM、订阅与定时器；沿引用验证清理，再用稳定流程回归。
              </p>
              <a class="button primary" href="#chapter/memory"
                >进入内存课程与章末挑战</a
              ><a class="button secondary" href="#lesson/50">Recorder 回归</a>
            </article>
          </div>
          <div class="lab-cases">
            <article>
              <AppIcon name="lighthouse" :size="25" />
              <h2>Lighthouse · 45–47 / 辅助工具 · 48–49、52</h2>
              <p>真实审计报告、同条件复测、Device Mode、受阻资源与手工覆盖。</p>
              <a class="button primary" href="#chapter/lighthouse"
                >进入质量课程与章末挑战</a
              ><a class="button secondary" href="#lesson/48"
                >Device Mode 与工具实战</a
              >
            </article>
          </div>
          <div class="lab-cases">
            <article>
              <AppIcon name="flag" :size="25" />
              <h2>综合实战 · 53–55</h2>
              <p>
                先隐藏工具与根因；从搜索错乱、持续卡顿到发布检查，提交判断后重放证据。
              </p>
              <a class="button primary" href="#chapter/capstone"
                >进入综合实战</a
              >
            </article>
            <article>
              <AppIcon name="tools" :size="25" />
              <h2>专题拓展 · T01–T08</h2>
              <p>
                传感器、真机、映射、媒体、填充、认证、AI
                与协议；原生结果独立记录。
              </p>
              <a class="button primary" href="#chapter/topics"
                >进入专题工具箱</a
              >
            </article>
          </div>
          <h2>Network 时序快捷实验 · 第 21 课</h2>
          <div class="lab-cases">
            <article
              v-for="item in [
                {
                  id: 'waiting',
                  title: '响应前等待',
                  text: '等待较久才发送响应头，观察 Waiting (TTFB)。',
                },
                {
                  id: 'download',
                  title: '响应主体传输',
                  text: '尽早开始响应，再缓慢发送较大数据。',
                },
              ]"
              :key="item.id"
            >
              <AppIcon
                :name="item.id === 'waiting' ? 'clock' : 'download'"
                :size="25"
              />
              <h2>{{ item.title }}</h2>
              <p>{{ item.text }}</p>
              <button class="button primary" @click="openLab(item.id)">
                打开商城实验<AppIcon name="external" :size="16" />
              </button>
            </article>
          </div>
          <p class="boundary-note">
            要记录练习与挑战，请从对应课程准备实验。上面的网络快捷入口适合自由观察。
          </p>
        </section>
        <section v-else-if="route === 'progress'" class="progress-page">
          <p class="section-kicker">保存在你的设备上</p>
          <h1>看过、练过、独立解决。</h1>
          <p class="body-copy">
            三种状态分别记录。笔记用于复盘，提示不会锁住后续学习。
          </p>
          <div class="progress-overview">
            <div>
              <span>已阅读</span><strong>{{ learning.readCount.value }}</strong>
            </div>
            <div>
              <span>已完成引导练习</span
              ><strong>{{ learning.practiceCount.value }}</strong>
            </div>
            <div>
              <span>已通过迁移挑战</span
              ><strong>{{ learning.passedCount.value }}</strong>
            </div>
          </div>
          <div class="record-actions">
            <button class="button secondary" @click="learning.exportRecords">
              <AppIcon name="download" :size="16" />导出学习记录</button
            ><button class="button secondary" @click="fileInput?.click()">
              导入记录（替换本机记录）</button
            ><input
              ref="fileInput"
              type="file"
              accept="application/json,.json"
              hidden
              @change="importFile"
            />
          </div>
          <p class="boundary-note">
            导入将替换本机记录，格式校验失败时保留原记录。建议先导出备份。
          </p>
          <div v-if="learning.state.value.chapters" class="chapter-records">
            <article
              v-for="(record, chapter) in learning.state.value.chapters"
              :key="chapter"
              class="record-row"
            >
              <a :href="`#chapter/${chapter}`"
                ><h2>{{ chapter }} 章末自评</h2></a
              >
              <p>
                {{ record.completedAt ? "已完成自评" : "自评进行中" }} ·
                {{ record.scores.reduce((sum, value) => sum + value, 0) }}/10{{
                  record.assisted ? " · 使用解析" : ""
                }}
              </p>
              <p>{{ record.note }}</p>
            </article>
          </div>
          <div
            v-if="
              !progressRows.length &&
              !Object.keys(learning.state.value.chapters || {}).length
            "
            class="empty-state"
          >
            <AppIcon name="book" :size="30" />
            <h2>从一次真实排查开始</h2>
            <p>阅读、练习或挑战后，记录会出现在这里。</p>
            <a href="#lesson/01" class="button primary">开始第 01 课</a>
          </div>
          <article
            v-for="lesson in progressRows"
            :key="lesson.id"
            class="record-row"
          >
            <a :href="`#lesson/${lesson.id}`"
              ><span>第 {{ lesson.id }} 课</span>
              <h2>{{ lesson.title }}</h2></a
            >
            <p>
              {{
                learning.record(lesson.id).readAt ? "✓ 已阅读" : "○ 未记录阅读"
              }}　{{
                learning.record(lesson.id).practiceAt ? "✓ 已练习" : "○ 待练习"
              }}　{{
                learning.record(lesson.id).challengeAt
                  ? "✓ 挑战通过"
                  : "○ 待挑战"
              }}
            </p>
            <p>
              已展开 {{ learning.record(lesson.id).hints }} 级提示{{
                learning.record(lesson.id).challengeAssisted
                  ? "；挑战使用过解析"
                  : ""
              }}
            </p>
            <p v-if="learning.record(lesson.id).note" class="saved-note">
              {{ learning.record(lesson.id).note }}
            </p>
          </article>
        </section>
        <section v-else class="empty-state">
          <h1>没有找到这个课程页面</h1>
          <p>从学习路线重新选择课程。</p>
          <a href="#home" class="button primary">返回学习路线</a>
        </section>
      </main>
      <footer class="app-footer">
        <span>DevTools 实验室</span><span>理解原理 · 找到证据 · 验证修复</span
        ><a href="#reference">排查速查<AppIcon name="chevron" :size="12" /></a>
      </footer>
    </div>
  </div>
</template>
