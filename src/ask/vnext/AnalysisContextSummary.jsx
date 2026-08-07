import React from "react";

const SOURCE_LABEL = {
  QUESTION: "来自问题",
  CLARIFICATION: "来自澄清",
  FILTER: "来自页面筛选器",
  DEFAULT: "系统默认",
};

const VALUE_LABEL = {
  PRODUCT_INITIATIVE: "产品立项与更新评估",
  TECHNOLOGY_ROUTE: "技术路线机会与风险",
  INVESTMENT_COMPARISON: "投资与资源配置比较",
  COMPETITIVE_ANALYSIS: "竞争差异分析",
  PORTFOLIO_PLANNING: "产品组合规划",
  TREND_PRIORITIZATION: "趋势与赛道优先级",
  PRODUCT_COMPANY: "产品公司",
  INDUSTRIAL_INVESTOR: "产业投资者",
  FINANCIAL_INVESTOR: "财务投资者",
  CORPORATE_STRATEGY: "企业战略资源配置",
  CONSERVATIVE: "保守",
  BALANCED: "平衡",
  AGGRESSIVE: "进取",
};

const sourceLabel = (label, values, source) => {
  if (source !== "DEFAULT") return SOURCE_LABEL[source] || source;
  if (label === "决策主体" && (!values || values === "UNKNOWN")) return "待澄清";
  return "系统默认";
};

const Row = ({ label, values, source }) => {
  const items = Array.isArray(values) ? values : [values];
  const visible = items.map((item) => String(item).toLowerCase() === "unknown" ? "未指定" : item)
    .filter((item) => item && String(item).toUpperCase() !== "UNKNOWN");
  const unknown = String(values || "").toUpperCase() === "UNKNOWN";
  if (!visible.length && !unknown) return null;
  return (
    <div className="vnext-context-row">
      <span>{label}</span>
      <strong>{visible.length ? visible.map((item) => VALUE_LABEL[item] || item).join("、") : "未指定"}</strong>
      {source && <small>{sourceLabel(label, values, source)}</small>}
    </div>
  );
};

export default function AnalysisContextSummary({ analysisContext, compact = false }) {
  if (!analysisContext) return null;
  return (
    <section className={`vnext-context ${compact ? "compact" : ""}`} aria-label="实际采用的分析上下文">
      <div className="vnext-section-heading">
        <strong>本次分析条件</strong>
        <span>实际采用条件</span>
      </div>
      <div className="vnext-context-grid">
        <Row label="任务" values={analysisContext.task_type} source={analysisContext.field_sources.task_type} />
        <Row label="对象" values={analysisContext.product_or_technology} source={analysisContext.field_sources.product_or_technology} />
        <Row label="公司" values={analysisContext.companies} source={analysisContext.field_sources.companies} />
        <Row label="区域" values={analysisContext.regions} source={analysisContext.field_sources.regions} />
        <Row label="客户" values={analysisContext.customer_types} source={analysisContext.field_sources.customer_types} />
        <Row label="场景" values={analysisContext.application_scenarios} source={analysisContext.field_sources.application_scenarios} />
        <Row label="系统层级" values={analysisContext.power_or_system_scope} source={analysisContext.field_sources.power_or_system_scope} />
        <Row label="时间" values={analysisContext.time_horizon} source={analysisContext.field_sources.time_horizon} />
        <Row label="决策主体" values={analysisContext.decision_subject} source={analysisContext.field_sources.decision_subject} />
        <Row label="风险偏好" values={analysisContext.risk_preference} source={analysisContext.field_sources.risk_preference} />
      </div>
    </section>
  );
}
