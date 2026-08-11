import React from "react";

export const CANONICAL_SOURCE_LABELS = Object.freeze({
  MANUAL: "来自人工编辑",
  QUESTION: "来自问题",
  PAGE: "来自页面",
  INFERENCE: "自动识别",
  UNSPECIFIED: "未指定",
});

export const CANONICAL_FIELD_LABELS = Object.freeze({
  track: "赛道/产品方向",
  application: "应用场景",
  region: "目标区域",
  customer_type: "客户类型",
  analysis_goal: "分析目标",
  known_competitors: "已知竞争对手",
  time_horizon: "时间范围",
  extra_context: "补充背景",
});

const displayValue = (value) => {
  const values = Array.isArray(value) ? value : [value];
  const visible = values.map((item) => String(item || "").trim()).filter(Boolean);
  return visible.length ? visible.join("、") : "未指定";
};

const Conflict = ({ conflict }) => (
  <div className="vnext-context-conflict">
    {CANONICAL_SOURCE_LABELS[conflict.source] || conflict.source}原值：{displayValue(conflict.value)}
  </div>
);

const Row = ({ label, field }) => (
  <div className="vnext-context-row">
    <span>{label}</span>
    <strong>{displayValue(field.value)}</strong>
    <small>{CANONICAL_SOURCE_LABELS[field.source] || field.source}</small>
    {field.conflicts.map((conflict, index) => <Conflict conflict={conflict} key={`${conflict.source}-${index}`} />)}
  </div>
);

const PageContextDetails = ({ pageContext }) => {
  const page = pageContext.value;
  return (
    <details className="vnext-page-context">
      <summary>查看页面上下文</summary>
      <div className="vnext-page-context-grid">
        <div><span>用户角色</span><strong>{page.user_role || "未设置"}</strong></div>
        <div><span>页面区域</span><strong>{page.page_region || "未设置"}</strong></div>
        <div><span>页面客户类型</span><strong>{page.page_customer_type || "未设置"}</strong></div>
        <div><span>页面应用场景</span><strong>{page.page_application || "未设置"}</strong></div>
        <div><span>页面赛道</span><strong>{page.page_track || "未设置"}</strong></div>
        <div><span>页面时间筛选</span><strong>{page.page_time_filter || "未设置"}</strong></div>
      </div>
    </details>
  );
};

export default function AnalysisContextSummary({ analysisContext, canonicalInput, compact = false, actions = null }) {
  const canonical = canonicalInput || analysisContext?.canonical_input;
  if (!canonical) return null;
  return (
    <section className={`vnext-context ${compact ? "compact" : ""}`} aria-label="本次分析条件">
      <div className="vnext-section-heading">
        <strong>本次分析条件</strong>
        {actions || <span>本次条件已冻结</span>}
      </div>
      <div className="vnext-context-grid">
        {Object.entries(CANONICAL_FIELD_LABELS).map(([field, label]) => (
          <Row label={label} field={canonical[field]} key={field} />
        ))}
      </div>
      <PageContextDetails pageContext={canonical.page_ctx} />
    </section>
  );
}
