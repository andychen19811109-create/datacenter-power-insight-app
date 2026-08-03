import React from "react";
import AnalysisContextSummary from "./AnalysisContextSummary.jsx";

const FILTER_LABELS = Object.freeze({
  region: "区域",
  customer: "客户类型",
  application: "应用场景",
  track: "赛道",
  time: "时间窗口",
  role: "用户角色",
});

const SOURCE_BY_FILTER = Object.freeze({
  region: "regions",
  customer: "customer_types",
  application: "application_scenarios",
  track: "product_or_technology",
  time: "time_horizon",
});

const activeValue = (value) => String(value || "").trim() && !["全部", "全球"].includes(String(value).trim());

const filterNotes = (analysisContext, pageContext) => {
  const filters = pageContext?.normalizedFilters || pageContext?.filters || {};
  return Object.entries(filters).flatMap(([field, value]) => {
    if (!activeValue(value)) return [];
    if (field === "role") return [`用户角色：${value}未写入 Ask Context；当前问题决定分析任务。`];
    const contextField = SOURCE_BY_FILTER[field];
    if (!contextField) return [];
    if (analysisContext?.field_sources?.[contextField] === "FILTER") return [`${FILTER_LABELS[field]}：${value}已应用。`];
    if (analysisContext?.field_sources?.[contextField] === "QUESTION") return [`${FILTER_LABELS[field]}：问题已给出更具体条件，页面筛选器未覆盖。`];
    return [`${FILTER_LABELS[field]}：与当前任务无直接关联，未强行写入分析。`];
  });
};

export default function AskContextPanel({ question, analysisContext, pageContext, compact = false }) {
  if (!analysisContext) return null;
  const notes = filterNotes(analysisContext, pageContext);
  return (
    <section className={`vnext-current-context ${compact ? "compact" : ""}`} aria-label="当前分析上下文">
      <div className="vnext-section-heading">
        <strong>当前分析上下文</strong>
        <span>只展示本次 Ask 实际采用的条件</span>
      </div>
      <p className="vnext-current-question"><strong>当前问题：</strong>{question}</p>
      <AnalysisContextSummary analysisContext={analysisContext} compact={compact} />
      {notes.length > 0 && (
        <div className="vnext-filter-notes">
          <strong>筛选器应用说明</strong>
          <ul>{notes.map((note) => <li key={note}>{note}</li>)}</ul>
        </div>
      )}
    </section>
  );
}
