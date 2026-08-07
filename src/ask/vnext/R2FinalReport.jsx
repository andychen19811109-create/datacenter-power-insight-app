import React from "react";
import AnalysisContextSummary from "./AnalysisContextSummary.jsx";

const Section = ({ title, children, show = true }) => show ? (
  <section className="vnext-report-section">
    <h3>{title}</h3>
    {children}
  </section>
) : null;

const ReportSections = ({ sections }) => (
  <div className="vnext-analysis-grid">
    {sections.map((section) => (
      <div className="vnext-analysis-card" key={section.title}>
        <strong>{section.title}</strong>
        <ul>{section.items.map((item, index) => <li key={`${section.title}-${index}`}>{item}</li>)}</ul>
      </div>
    ))}
  </div>
);

export default function R2FinalReport({ report, analysisContext, onNavigate }) {
  return (
    <article className="vnext-report" aria-label="Ask PowerInsight专业报告">
      <header className="vnext-report-hero">
        <div>
          <div className="vnext-eyebrow">Ask PowerInsight 专业报告</div>
          <h2>{report.title}</h2>
        </div>
        <span className="vnext-status publishable">{report.status}</span>
      </header>
      <section className="vnext-answer-first">
        <span>决策摘要</span>
        <ul>{report.summary.map((item, index) => <li key={index}>{item}</li>)}</ul>
      </section>
      <AnalysisContextSummary analysisContext={analysisContext} />
      <Section title="关键分析" show={report.analysis_sections.length > 0}>
        <ReportSections sections={report.analysis_sections} />
      </Section>
      <Section title="验证条件与风险" show={report.gate_risk_sections.length > 0}>
        <ReportSections sections={report.gate_risk_sections} />
      </Section>
      <Section title="证据与待验证" show={report.evidence_sections.length > 0}>
        <ReportSections sections={report.evidence_sections} />
      </Section>
      <div className="vnext-actions">
        <button type="button" className="btn" onClick={() => onNavigate?.("overview")}>进入总览</button>
        <button type="button" className="btn" onClick={() => onNavigate?.("technology")}>进入技术</button>
        <button type="button" className="btn" onClick={() => onNavigate?.("companies")}>进入公司与情报</button>
      </div>
    </article>
  );
}
