import React from "react";
import AnalysisContextSummary from "./AnalysisContextSummary.jsx";

const EVIDENCE_LABELS = {
  DIRECT: "直接证据",
  INDIRECT: "间接证据",
  PUBLIC_CONSENSUS: "公开共识",
  INFERENCE: "推断",
  ASSUMPTION: "假设",
};

const RISK_LABELS = {
  market: "市场风险",
  technical: "技术风险",
  commercial: "商业风险",
  organizational: "组织与能力风险",
};

const MATRIX_HEADERS = {
  "三种决策路径比较": ["路径", "适用条件", "产品边界", "主要投入", "关键风险", "验证证据", "决策结果"],
  "机会—风险—验证矩阵": ["架构层级", "潜在机会", "主要风险", "替代路线", "必要验证"],
  "条件比较矩阵": ["对象", "对象层级", "更适合的产业能力", "核心商业证据", "技术/交付壁垒", "资本与周期", "主要风险"],
};

const List = ({ items }) => (
  Array.isArray(items) && items.length
    ? <ul>{items.map((item, index) => <li key={`${index}-${typeof item === "string" ? item : JSON.stringify(item)}`}>{typeof item === "string" ? item : item.statement || item.conclusion || item.label}</li>)}</ul>
    : null
);

const Section = ({ title, children, show = true }) => show ? (
  <section className="vnext-report-section">
    <h3>{title}</h3>
    {children}
  </section>
) : null;

const Matrix = ({ title, rows }) => {
  const headers = MATRIX_HEADERS[title];
  if (!headers) return <List items={rows} />;
  return (
    <div className="vnext-matrix-wrap">
      <table className="vnext-matrix">
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{rows.map((row) => (
          <tr key={row}>{row.split("｜").map((cell, index) => <td key={`${index}-${cell}`}>{cell}</td>)}</tr>
        ))}</tbody>
      </table>
    </div>
  );
};

export default function AskStandardReport({ report, analysisContext, onNavigate }) {
  const [expanded, setExpanded] = React.useState(false);
  const statusLabel = report.status === "PUBLISHABLE" ? "证据充分，可用于下一步评审"
    : report.status === "CONDITIONAL" ? "条件性结论"
      : report.status === "INSUFFICIENT_EVIDENCE" ? "证据不足"
        : report.status === "UNSUPPORTED" ? "超出当前范围" : "需要澄清";
  return (
    <article className="vnext-report" aria-label="Ask PowerInsight标准专业报告">
      <header className="vnext-report-hero">
        <div>
          <div className="vnext-eyebrow">Ask PowerInsight 标准专业报告</div>
          <h2>{report.title}</h2>
        </div>
        <span className={`vnext-status ${report.status.toLowerCase()}`}>{statusLabel}</span>
      </header>

      <section className="vnext-answer-first">
        <span>一句话结论</span>
        <strong>{report.one_line_conclusion}</strong>
      </section>

      <Section title="推荐决策"><p>{report.recommended_decision}</p></Section>
      <AnalysisContextSummary analysisContext={analysisContext} />
      <Section title="关键假设" show={report.key_assumptions.length > 0}><List items={report.key_assumptions} /></Section>
      <Section title="证据边界">
        {report.key_facts.length ? report.key_facts.map((fact, index) => (
          <div className="vnext-evidence-row" key={`${index}-${fact.statement}`}>
            <p>{fact.statement}</p>
            <span>{EVIDENCE_LABELS[fact.evidence_type] || fact.evidence_type}{fact.source_ref ? ` · ${fact.source_ref}` : ""}</span>
          </div>
        )) : <p className="text-muted">本次报告未绑定可作为直接事实发布的来源证据。</p>}
      </Section>

      <button type="button" className="btn" onClick={() => setExpanded((value) => !value)}>
        {expanded ? "收起完整报告" : "展开完整报告"}
      </button>
      {expanded && (
        <div className="vnext-full-report">
          <Section title="分析范围" show={report.analysis_scope.length > 0}><List items={report.analysis_scope} /></Section>
          <Section title="核心分析" show={report.core_analysis_sections.length > 0}>
            <div className="vnext-analysis-grid">
              {report.core_analysis_sections.map((section) => (
                <div className="vnext-analysis-card" key={section.title}>
                  <strong>{section.title}</strong>
                  <Matrix title={section.title} rows={section.items} />
                </div>
              ))}
            </div>
          </Section>
          <Section title="情景与替代方案" show={report.scenario_comparison.length > 0 || report.alternatives.length > 0}>
            {report.scenario_comparison.map((item) => (
              <div className="vnext-scenario" key={`${item.scenario}-${item.conclusion}`}>
                <strong>{item.scenario}</strong><p>{item.conclusion}</p>
              </div>
            ))}
            <List items={report.alternatives} />
          </Section>
          <Section title="主要风险" show={Object.values(report.risks).some((items) => items.length)}>
            <div className="vnext-risk-grid">
              {Object.entries(report.risks).filter(([, items]) => items.length).map(([type, items]) => (
                <div key={type}><strong>{RISK_LABELS[type] || type}</strong><List items={items} /></div>
              ))}
            </div>
          </Section>
          <Section title="不确定性" show={report.uncertainties.length > 0}><List items={report.uncertainties} /></Section>
          <Section title="推荐行动" show={report.recommended_actions.length > 0}><List items={report.recommended_actions} /></Section>
          <Section title="验证 Gate" show={report.validation_gates.length > 0}><List items={report.validation_gates} /></Section>
          <Section title="退出条件" show={report.exit_conditions.length > 0}><List items={report.exit_conditions} /></Section>
          <Section title="需要补充的信息" show={report.information_to_add.length > 0}><List items={report.information_to_add} /></Section>
          <Section title="当前不能下的结论" show={report.cannot_conclude.length > 0}><List items={report.cannot_conclude} /></Section>
          <Section title="相关 Dashboard 与证据模块">
            <div className="vnext-actions">
              {report.related_modules.map((module) => (
                <button type="button" className="btn" key={module.id} onClick={() => onNavigate?.(module.id)} title={module.reason}>
                  {module.label}
                </button>
              ))}
            </div>
          </Section>
        </div>
      )}
    </article>
  );
}
