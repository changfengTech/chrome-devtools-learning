<script setup lang="ts">
import { computed, ref } from "vue";
const props = defineProps<{ lesson: string; unlocked: boolean }>();
const variant = ref("a"),
  fixed = ref(false),
  selected = ref("response"),
  position = ref("shanghai"),
  uv = ref(false),
  matching = ref(false),
  scope = ref("shipping"),
  context = ref(false),
  requestId = ref("1"),
  generation = ref("current"),
  step = ref(0);
const panels = [
  "Elements",
  "Console",
  "Sources",
  "Network",
  "Performance",
  "Memory",
  "Application",
  "Lighthouse",
];
const checkedPanels = ref(["Elements", "Network"]);
const missingPanels = computed(() =>
  panels.filter((panel) => !checkedPanels.value.includes(panel)),
);
const chain = [
  { label: "输入", panel: "Console", detail: "查询、数量与正常行为" },
  { label: "响应", panel: "Network", detail: "状态、类型与完成顺序" },
  { label: "执行", panel: "Sources", detail: "调用、分支与提交时机" },
  { label: "页面", panel: "Elements", detail: "DOM、命中与布局" },
  { label: "存储", panel: "Application", detail: "结构版本与恢复结果" },
];
const capstone = computed(() => ["53", "54", "55"].includes(props.lesson));
const descriptions: Record<string, [string, string, string, string]> = {
  "53": [
    "旧响应覆盖新查询",
    "旧存储恢复错误筛选",
    "输入 → 新请求先完成 → 旧请求后完成 → 显示旧结果",
    "输入 → 只提交当前序号 → 保存 v2 筛选 → 恢复当前状态",
  ],
  "54": [
    "数组保留关闭详情并重复计算",
    "订阅保留详情并反复布局",
    "五次开关 → 五条保留路径 / 重复工作",
    "五次开关 → 清理引用与订阅 → 拆分 / 合并工作",
  ],
  "55": [
    "类型、名称、布局失约",
    "状态、重复处理、引用残留",
    "输入 → 响应 → 执行 → 页面 → 存储；另核对录制、快照和审计",
    "相同条件复测 → 逐项记录八面板证据 → 列出未检查范围",
  ],
  T01: [
    "latitude / longitude 颠倒",
    "错误后一直 loading",
    "coords → 正确顺序 → 门店；error → 手动选店",
    "原生 Sensors 与本地业务夹具分别取证",
  ],
  T02: [
    "手机 loopback 未转发",
    "转发到了错误端口",
    "USB → 调试目标；手机 HTTP → 端口转发 → 电脑 4174",
    "本地健康只证明电脑服务，不证明真机连接",
  ],
  T03: [
    "sourceMappingURL 404",
    "sourcesContent 旧版本",
    "JS → map → TS；网络资源 → Workspace → 磁盘",
    "保存后核对磁盘文件，再构建与运行",
  ],
  T04: [
    "媒体地址不存在",
    "play 监听器立刻 pause",
    "资源 → metadata → play Promise → playing / pause",
    "404 / 解码 / NotAllowedError / 业务 pause 分别排查",
  ],
  T05: [
    "字段用途互换",
    "配送误用 billing",
    "section → shipping / billing → given-name / street-address",
    "语义夹具不等于浏览器 Autofill；两者分别检查",
  ],
  T06: [
    "候选凭据 ID 不匹配",
    "UV 条件不满足",
    "challenge → 凭据 → authenticatorData / signature → RP 验证",
    "候选 ID、UP、UV、origin、RP 与一次性挑战分别核对",
  ],
  T07: [
    "透明层拦截",
    "按钮 disabled",
    "建议 → 可验证假设 → 实际命中 / 属性 → 最小改变",
    "预置练习不是 AI 响应，颜色变化不证明点击恢复",
  ],
  T08: [
    "按到达顺序误配响应",
    "跨导航使用旧 nodeId",
    "请求 {id:1} → 无 id 事件 → 响应 {id:2} → 响应 {id:1}",
    "用 id / session 匹配，导航后重新取得节点句柄",
  ],
};
const d = computed(() => descriptions[props.lesson]!);
const topicResult = computed(() => {
  switch (props.lesson) {
    case "T01":
      return position.value === "none"
        ? "不可用 → 显示手动选择；另测权限拒绝和超时"
        : position.value === "shanghai"
          ? "latitude 31.23 / longitude 121.47 → 上海"
          : "latitude 48.86 / longitude 2.35 → 巴黎";
    case "T02":
      return selected.value === "response"
        ? "电脑服务可达 ≠ 手机端口已转发"
        : "确认调试目标，再确认 HTTP 转发，两条连接分别检查";
    case "T03":
      return selected.value === "response"
        ? "map 正常下载后还要核对 sourcesContent 版本"
        : "Workspace 保存的是授权目录中的源码；DOM 修改不会落盘";
    case "T04":
      return selected.value === "response"
        ? "HTTP 404：先检查资源；不是自动播放策略"
        : "资源存在但 pause：沿实际事件监听器追代码";
    case "T05":
      return scope.value === "shipping"
        ? "配送组：section-delivery shipping street-address"
        : "账单组：section-bill billing street-address；不能替代配送组";
    case "T06":
      return !matching.value
        ? "没有候选凭据；不能进行本次认证"
        : !uv.value
          ? "候选匹配，但 required UV 未满足"
          : "候选与 UV 满足；仍需服务验证真实签名、origin 与新挑战";
    case "T07":
      return context.value
        ? "有实际元素、命中目标、条件和预期；检查每条建议是否被事实支持"
        : "缺上下文的建议是待验证假设，不能直接当作根因";
    case "T08":
      return requestId.value !== "1"
        ? "响应 id=2 不能回答请求 id=1"
        : generation.value !== "current"
          ? "配对正确但节点属于旧文档；重新 getDocument / querySelector"
          : "id 与文档匹配；仍须在真实 Protocol monitor 核对";
    default:
      return "";
  }
});
</script>
<template>
  <section class="advanced-model" :aria-label="`第 ${lesson} 课原理模型`">
    <p class="boundary-note">
      原理模型 · 教学数据不等于真实传感器、设备、认证器或
      CDP；操作模型不计实战完成。
    </p>
    <div v-if="capstone && !unlocked" class="am-locked">
      <h3>先独立观察，再重放证据。</h3>
      <p>
        在商城复现并提交一次判断，回来解锁因果重放。初始现场不指定工具和根因。
      </p>
    </div>
    <template v-else>
      <div class="fd-controls">
        <label
          >故障配置<select v-model="variant">
            <option value="a">配置一</option>
            <option value="b">配置二</option>
          </select></label
        ><label
          ><input type="checkbox" v-model="fixed" />应用最小对应修复</label
        >
      </div>
      <h3>{{ d[variant === "a" ? 0 : 1] }}</h3>
      <template v-if="capstone"
        ><div class="am-track">
          <button
            v-for="(name, i) in [
              '输入与条件',
              '原始证据',
              '根因关系',
              '同条件复测',
            ]"
            :key="name"
            :aria-pressed="step === i"
            @click="step = i"
          >
            {{ name }}
          </button>
        </div>
        <p class="am-result">
          {{
            step === 0
              ? "固定输入、动作次数、状态与正常结果。"
              : step === 1
                ? "保留原始请求、值、DOM 或引用，不只保存结论。"
                : step === 2
                  ? d[fixed ? 3 : 2]
                  : "正常结果、故障对照与未检查范围分别留下记录。"
          }}
        </p>
        <ol
          v-if="lesson === '53'"
          class="am-graph"
          aria-label="搜索响应重放模型"
        >
          <li>
            <strong>输入两次查询</strong><span>旧序号 1 / 当前序号 2</span>
          </li>
          <li>
            <strong>完成顺序 2 → 1</strong
            ><span>{{
              variant === "a"
                ? fixed
                  ? "仅提交当前序号 2"
                  : "旧序号 1 覆盖当前结果"
                : "请求正确，继续检查恢复状态"
            }}</span>
          </li>
          <li>
            <strong>重新读取存储</strong
            ><span>{{
              variant === "b" && !fixed
                ? "v1 旧筛选被直接恢复"
                : "v2 当前筛选与当前结果对应"
            }}</span>
          </li>
        </ol>
        <div
          v-else-if="lesson === '54'"
          class="am-reference"
          aria-label="资源引用模型"
        >
          <p>本模型重复五次打开关闭，独立考虑工作与保留。</p>
          <ol class="am-graph">
            <li><strong>页面根</strong><span>本页自有资源</span></li>
            <li>
              <strong>{{ variant === "a" ? "详情数组" : "事件订阅" }}</strong
              ><span>{{ fixed ? "清理保留路径" : "仍然引用关闭的详情" }}</span>
            </li>
            <li>
              <strong>{{ fixed ? "0" : "5" }} 个详情被保留</strong
              ><span>模型计数，不是堆快照</span>
            </li>
          </ol>
          <p>
            {{
              fixed
                ? "工作：计算拆分 / 布局写入合并；业务结果必须一致。"
                : "工作：同步计算 / 重复布局；需实际 trace 证明成本。"
            }}
          </p>
        </div>
        <div v-else class="am-evidence-map">
          <p>勾选你在模型中准备保留的证据，生成覆盖关系与遗漏提示。</p>
          <div class="am-panels">
            <label v-for="panel in panels" :key="panel"
              ><input
                type="checkbox"
                :value="panel"
                v-model="checkedPanels"
              />{{ panel }}</label
            >
          </div>
          <ol class="am-graph" aria-label="发布证据关系模型">
            <li
              v-for="node in chain"
              :key="node.label"
              :class="{ missing: !checkedPanels.includes(node.panel) }"
            >
              <strong>{{ node.label }}</strong
              ><span>{{ node.detail }}</span
              ><small
                >{{ node.panel }} ·
                {{
                  checkedPanels.includes(node.panel) ? "计划保留" : "待补证据"
                }}</small
              >
            </li>
          </ol>
          <p aria-live="polite">
            {{
              missingPanels.length
                ? "仍缺：" +
                  missingPanels.join("、") +
                  "。记录具体证据或未检查原因。"
                : "八面板已列入计划；还需原始证据、辅助工具回归和遗留问题。勾选不代表实际操作通过。"
            }}
          </p>
        </div>
      </template>
      <template v-else
        ><div class="fd-controls">
          <label v-if="lesson === 'T01'"
            >位置条件<select v-model="position">
              <option value="shanghai">Shanghai</option>
              <option value="paris">Paris</option>
              <option value="none">Location unavailable</option>
            </select></label
          >
          <label v-if="['T02', 'T03', 'T04'].includes(lesson)"
            >证据分支<select v-model="selected">
              <option value="response">
                {{
                  lesson === "T02"
                    ? "HTTP 服务"
                    : lesson === "T03"
                      ? "Source Map"
                      : "资源请求"
                }}
              </option>
              <option value="execution">
                {{
                  lesson === "T02"
                    ? "调试目标"
                    : lesson === "T03"
                      ? "磁盘保存"
                      : "执行逻辑"
                }}
              </option>
            </select></label
          >
          <label v-if="lesson === 'T05'"
            >地址组<select v-model="scope">
              <option value="shipping">shipping</option>
              <option value="billing">billing</option>
            </select></label
          >
          <template v-if="lesson === 'T06'"
            ><label
              ><input type="checkbox" v-model="matching" />allowCredentials
              匹配</label
            ><label
              ><input type="checkbox" v-model="uv" />User verified</label
            ></template
          >
          <label v-if="lesson === 'T07'"
            ><input
              type="checkbox"
              v-model="context"
            />包含实际元素、证据与预期</label
          >
          <template v-if="lesson === 'T08'"
            ><label
              >响应 id<select v-model="requestId">
                <option>1</option>
                <option>2</option>
              </select></label
            ><label
              >节点所属文档<select v-model="generation">
                <option value="current">当前</option>
                <option value="previous">导航前</option>
              </select></label
            ></template
          >
        </div>
        <p class="am-result">{{ topicResult }}</p>
        <p>{{ d[fixed ? 3 : 2] }}</p></template
      >
    </template>
  </section>
</template>
<style scoped>
.advanced-model {
  border: 1px solid #cddbf3;
  border-radius: 12px;
  padding: 24px;
  background: #f7faff;
  margin: 24px 0;
}
.advanced-model h3 {
  margin: 20px 0;
  font-size: 20px;
}
.advanced-model p {
  line-height: 1.9;
  font-size: 14px;
}
.advanced-model label {
  font-size: 13px;
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.advanced-model select {
  padding: 9px;
  border: 1px solid #cbd8ec;
  border-radius: 5px;
  background: white;
  max-width: 100%;
}
.am-track {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 20px 0;
}
.am-track button {
  padding: 10px 14px;
  border: 1px solid #c6d8ee;
  border-radius: 5px;
  color: #24518d;
  background: white;
  cursor: pointer;
}
.am-track button[aria-pressed="true"] {
  background: #245de8;
  color: white;
}
.am-result {
  background: white;
  border-left: 3px solid #245de8;
  padding: 18px;
}
.am-locked {
  padding: 16px 0;
}
.advanced-model input {
  accent-color: #245de8;
}
@media (max-width: 500px) {
  .advanced-model {
    padding: 16px;
  }
}
.am-graph {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(125px, 1fr));
  gap: 12px;
  list-style: none;
  padding: 0;
  margin: 18px 0;
}
.am-graph li {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  background: white;
  border: 1px solid #c6d8ee;
  border-top: 3px solid #245de8;
  border-radius: 5px;
  min-width: 0;
}
.am-graph strong {
  font-size: 14px;
}
.am-graph span,
.am-graph small {
  font-size: 12px;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
.am-graph .missing {
  border-top-color: #b67a26;
  background: #fffaf0;
}
.am-panels {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin: 20px 0;
}
.am-panels label {
  font-size: 12px;
}
.am-reference,
.am-evidence-map {
  border-top: 1px solid #d8e4f4;
  margin-top: 20px;
  padding-top: 5px;
}
</style>
