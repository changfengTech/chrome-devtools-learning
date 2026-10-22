<script setup lang="ts">
import { computed, ref } from "vue";
const props = defineProps<{ lesson: string }>();
const mode = ref("navigation"),
  goal = ref("load"),
  device = ref("mobile"),
  category = ref("all"),
  audit = ref("button-name"),
  manual = ref(false),
  selected = ref<string[]>([]),
  fair = ref(true),
  width = ref(390),
  dpr = ref(2),
  landscape = ref(false),
  touch = ref(true),
  issue = ref("csp"),
  fix = ref(false),
  override = ref(false),
  workspace = ref(false),
  field = ref("price");
const goals: Record<string, string> = {
  load: "navigation",
  interaction: "timespan",
  state: "snapshot",
};
const costs: Record<string, number> = { hero: 2, work: 2, color: 1 };
const match = computed(() => goals[goal.value] === mode.value);
const budget = computed(() =>
  selected.value.reduce((n, id) => n + (costs[id] || 0), 0),
);
const viewport = computed(() =>
  landscape.value ? Math.max(width.value, 740) : width.value,
);
</script>
<template>
  <section class="quality-model" :aria-label="`第 ${lesson} 课原理模型`">
    <p class="qm-boundary">
      原理模型 · 不运行真实审计，不生成 Lighthouse 分数，不计实战完成。
    </p>
    <template v-if="lesson === '45'"
      ><div class="qm-controls">
        <label
          >目标<select v-model="goal">
            <option value="load">首次加载</option>
            <option value="interaction">一段交互</option>
            <option value="state">当前弹窗状态</option>
          </select></label
        ><label
          >模式<select v-model="mode">
            <option value="navigation">Navigation</option>
            <option value="timespan">Timespan</option>
            <option value="snapshot">Snapshot</option>
          </select></label
        ><label
          >设备<select v-model="device">
            <option>mobile</option>
            <option>desktop</option>
          </select></label
        ><label
          >类别<select v-model="category">
            <option value="all">四类结果</option>
            <option value="performance">仅 Performance</option>
          </select></label
        >
      </div>
      <div class="qm-result">
        <strong>{{
          match ? "观察范围匹配" : "这个模式不能回答当前目标"
        }}</strong>
        <p>
          {{ device }} /
          {{
            category === "all"
              ? "Performance、Accessibility、Best Practices、SEO"
              : "仅覆盖性能，不能推断其余类别"
          }}
        </p>
        <p>
          {{
            mode === "navigation"
              ? "会重新导航；保存 URL、状态和清理选项。"
              : mode === "snapshot"
                ? "不重新加载；当前状态必须已经准备好。"
                : "在一段操作中收集，先说明区间起止。"
          }}
        </p>
      </div></template
    >
    <template v-else-if="lesson === '46'"
      ><div class="qm-controls">
        <label
          >具体检查项<select v-model="audit">
            <option value="button-name">Accessibility · button-name</option>
            <option value="meta-description">SEO · meta-description</option>
            <option value="lcp">Performance · LCP</option>
            <option value="best">Best Practices · 浏览器提示</option>
          </select></label
        ><label><input type="checkbox" v-model="manual" />展开人工补查</label>
      </div>
      <ol class="qm-chain">
        <li>报告：{{ audit }}</li>
        <li>
          证据：{{
            audit === "button-name"
              ? "无名称按钮的元素片段"
              : audit === "meta-description"
                ? "文档 head 的描述"
                : audit === "lcp"
                  ? "关键图像与 Network 时序"
                  : "具体请求、API 或浏览器诊断"
          }}
        </li>
        <li>修复后对同一项复查，保持业务功能</li>
      </ol>
      <p v-if="manual" class="qm-result">
        人工补查：Tab / Enter、焦点位置、名称是否准确、实际详情 /
        加购路径。自动检查通过不等于全面可用。
      </p></template
    >
    <template v-else-if="lesson === '47'"
      ><p>三点预算：先选有根因证据的任务。</p>
      <div class="qm-controls">
        <label
          ><input type="checkbox" v-model="selected" value="hero" />主图等待 ·
          成本 2</label
        ><label
          ><input type="checkbox" v-model="selected" value="work" />重复工作 ·
          成本 2</label
        ><label
          ><input type="checkbox" v-model="selected" value="color" />按钮颜色 ·
          成本 1</label
        ><label
          ><input
            type="checkbox"
            v-model="fair"
          />设备、版本和限速保持一致</label
        >
      </div>
      <div class="qm-result">
        <strong>已用 {{ budget }} / 3</strong>
        <p>
          {{
            budget > 3
              ? "超出预算；用证据排序，再缩小改动。"
              : selected.includes("hero") || selected.includes("work")
                ? "已选因果候选，仍需实际复测。"
                : "外观调整不能证明加载或主线程成本改善。"
          }}
        </p>
        <p>
          {{
            fair
              ? "示意三轮 LCP：1400、1520、1450 → 780、810、800；中位数 1450 → 800ms。"
              : "条件已变化，这两组中位数不能归因到修复。"
          }}
          数值是模型样本，不是审计结果。
        </p>
      </div></template
    >
    <template v-else-if="lesson === '48'"
      ><div class="qm-controls">
        <label
          >CSS 视口<input
            type="range"
            min="320"
            max="1440"
            v-model.number="width" /></label
        ><label
          >DPR<select v-model.number="dpr">
            <option :value="1">1</option>
            <option :value="2">2</option>
            <option :value="3">3</option>
          </select></label
        ><label><input type="checkbox" v-model="landscape" />横向</label
        ><label><input type="checkbox" v-model="touch" />粗指针</label>
      </div>
      <div class="qm-viewport" :class="{ compact: viewport < 600 }">
        <span>商品</span><span>筛选</span><span>购物车</span>
      </div>
      <p class="qm-result">
        示意 CSS 宽 {{ viewport }}px；资源像素需求约 {{ viewport * dpr }}px；{{
          touch ? "coarse pointer" : "fine pointer"
        }}。DPR 不把媒体查询宽度变成
        {{ viewport * dpr }}px。真机软键盘与触控仍需检查。
      </p></template
    >
    <template v-else-if="lesson === '49'"
      ><div class="qm-controls">
        <label
          >线索<select v-model="issue">
            <option value="csp">CSP 阻断</option>
            <option value="cookie">Cookie 拒绝</option>
            <option value="tls">本机 HTTP</option>
          </select></label
        ><label><input type="checkbox" v-model="fix" />采用最小修复</label>
      </div>
      <ol class="qm-chain">
        <li>
          {{
            issue === "csp"
              ? "script-src → inline"
              : issue === "cookie"
                ? "Set-Cookie → unrelated Domain"
                : "http://127.0.0.1 → 本机上下文"
          }}
        </li>
        <li>
          {{
            issue === "csp"
              ? fix
                ? "加载允许的同源外部脚本"
                : "内联优惠脚本被规则拒绝"
              : issue === "cookie"
                ? fix
                  ? "host-only Cookie → profile 接收"
                  : "Domain 不匹配 → 浏览器拒收"
                : "isSecureContext 可能为 true，但没有 TLS 证书"
          }}
        </li>
        <li>到实际请求与面板验证；不要关闭保护来清除提示。</li>
      </ol></template
    >
    <template v-else
      ><div class="qm-controls">
        <label
          >错误字段<select v-model="field">
            <option value="price">unitPrice 字符串</option>
            <option value="stock">stock = null</option>
          </select></label
        ><label><input type="checkbox" v-model="override" />本地覆盖启用</label
        ><label
          ><input type="checkbox" v-model="workspace" />工作区映射已配置</label
        >
      </div>
      <div class="qm-diff">
        <div>
          服务器原始响应<code>{{
            field === "price" ? 'unitPrice: "42"' : "stock: null"
          }}</code>
        </div>
        <div>
          浏览器实际读取<code>{{
            override
              ? field === "price"
                ? "unitPrice: 42"
                : "stock: 9"
              : field === "price"
                ? 'unitPrice: "42"'
                : "stock: null"
          }}</code>
        </div>
      </div>
      <p class="qm-result">
        {{
          override
            ? "本地覆盖影响匹配资源，不修改服务器。"
            : "禁用覆盖后原故障仍在。"
        }}
        Changes 显示工具内编辑差异；{{
          workspace
            ? "配置了工作区仍要核对具体映射与保存文件。"
            : "没有工作区映射，不能宣称仓库源码已落盘。"
        }}
      </p></template
    >
  </section>
</template>
<style scoped>
.quality-model {
  margin: 24px 0;
  border: 1px solid #dce4ef;
  background: #f7faff;
  border-radius: 8px;
  padding: 24px;
  font-size: 14px;
  color: #344e70;
  line-height: 1.9;
}
.qm-boundary {
  font-size: 12px;
  color: #6b809c;
  margin: 0 0 20px;
}
.qm-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: end;
}
.qm-controls label {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.qm-controls select {
  font: inherit;
  max-width: 100%;
  padding: 9px;
  color: #345077;
  border: 1px solid #c8d7e8;
  background: white;
  border-radius: 5px;
}
.qm-controls :focus-visible {
  outline: 3px solid #90acf6;
  outline-offset: 3px;
}
.qm-result {
  border-left: 3px solid #245de8;
  background: #eaf0fc;
  padding: 16px;
  margin: 22px 0 0;
}
.qm-result p {
  margin: 8px 0;
}
.qm-chain {
  padding-left: 25px;
  line-height: 2.4;
  margin: 25px 0;
}
.qm-viewport {
  display: flex;
  gap: 12px;
  margin: 26px 0;
  background: white;
  border: 1px solid #b9cadf;
  padding: 18px;
}
.qm-viewport span {
  flex: 1;
  border: 1px solid #d8e2ee;
  padding: 12px;
}
.qm-viewport.compact {
  flex-direction: column;
}
.qm-diff {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 24px;
}
.qm-diff > div {
  padding: 16px;
  border: 1px solid #c8d8e6;
  background: white;
}
.qm-diff code {
  display: block;
  color: #245de8;
  margin: 12px 0;
}
@media (max-width: 500px) {
  .quality-model {
    padding: 16px;
  }
  .qm-controls label {
    width: 100%;
  }
  .qm-diff {
    grid-template-columns: 1fr;
  }
}
</style>
