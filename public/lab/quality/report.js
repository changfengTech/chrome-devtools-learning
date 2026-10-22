export const qualityCategories = [
  "performance",
  "accessibility",
  "best-practices",
  "seo",
];
export function summarizeLighthouse(input, targetURL) {
  if (!input || typeof input !== "object" || input.runtimeError)
    throw Error("报告缺失或包含 Lighthouse 运行错误。");
  const reportURL = new URL(
      input.finalDisplayedUrl || input.finalUrl || input.requestedUrl,
    ),
    target = new URL(targetURL);
  if (
    reportURL.origin !== target.origin ||
    reportURL.pathname !== target.pathname ||
    reportURL.searchParams.get("run") !== target.searchParams.get("run")
  )
    throw Error("报告不是本会话当前运行的审计目标。");
  const settings = input.configSettings,
    categories = input.categories;
  if (
    !settings ||
    !categories ||
    !input.lighthouseVersion ||
    !Number.isFinite(Date.parse(input.fetchTime))
  )
    throw Error("缺少 Lighthouse 版本、时间或运行条件。");
  const scores = {};
  for (const id of qualityCategories) {
    if (categories[id]) {
      const score = categories[id].score;
      if (score !== null && (!Number.isFinite(score) || score < 0 || score > 1))
        throw Error("类别分数格式无效。");
      scores[id] = score;
    }
  }
  if (!Object.keys(scores).length) throw Error("报告没有支持的类别。");
  const condition = JSON.stringify({
    version: input.lighthouseVersion,
    formFactor: settings.formFactor,
    throttlingMethod: settings.throttlingMethod,
    throttling: settings.throttling,
    screen: settings.screenEmulation,
    storageResetDisabled: settings.disableStorageReset ?? false,
    locale: settings.locale,
    onlyAudits: settings.onlyAudits,
    skipAudits: settings.skipAudits,
    blockedUrlPatterns: settings.blockedUrlPatterns,
    load: {
      maxWaitForFcp: settings.maxWaitForFcp,
      maxWaitForLoad: settings.maxWaitForLoad,
      pauseAfterFcpMs: settings.pauseAfterFcpMs,
      pauseAfterLoadMs: settings.pauseAfterLoadMs,
      networkQuietThresholdMs: settings.networkQuietThresholdMs,
      cpuQuietThresholdMs: settings.cpuQuietThresholdMs,
    },
    categories: Object.keys(scores).sort(),
    userAgent: input.environment?.networkUserAgent || input.userAgent,
  });
  const audit = (id) => input.audits?.[id]?.score ?? null,
    metric = (id) => {
      const n = input.audits?.[id]?.numericValue;
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
  const details = {};
  for (const id of ["button-name", "meta-description"])
    details[id] = {
      score: audit(id),
      title: input.audits?.[id]?.title || id,
      details: input.audits?.[id]?.details || null,
    };
  return {
    url: reportURL.href,
    version: String(input.lighthouseVersion),
    fetchTime: input.fetchTime,
    formFactor: settings.formFactor,
    condition,
    categories: scores,
    buttonName: audit("button-name"),
    description: audit("meta-description"),
    lcp: metric("largest-contentful-paint"),
    tbt: metric("total-blocking-time"),
    details,
  };
}
export function median(values) {
  const sorted = [...values].sort((a, b) => a - b),
    n = sorted.length;
  return n
    ? n % 2
      ? sorted[(n - 1) / 2]
      : (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : null;
}
