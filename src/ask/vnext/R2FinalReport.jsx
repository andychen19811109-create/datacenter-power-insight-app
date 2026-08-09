import React from "react";
import AnalysisContextSummary from "./AnalysisContextSummary.jsx";

const visibleText = (value) => String(value || "")
  .replace(/\\([@~])/g, "$1")
  .replace(/\*\*/g, "");

const MarkdownBlocks = ({ blocks = [] }) => (
  <div className="vnext-markdown-blocks">
    {blocks.map((block, index) => {
      if (block.type === "paragraph") {
        return <p key={`paragraph-${index}`}>{visibleText(block.text)}</p>;
      }
      if (block.type === "unordered_list") {
        return <ul key={`ul-${index}`}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{visibleText(item)}</li>)}</ul>;
      }
      if (block.type === "ordered_list") {
        return <ol key={`ol-${index}`}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{visibleText(item)}</li>)}</ol>;
      }
      if (block.type === "table") {
        return (
          <div className="vnext-table-wrap" key={`table-${index}`}>
            <table>
              <thead><tr>{block.headers.map((cell, cellIndex) => <th key={cellIndex}>{visibleText(cell)}</th>)}</tr></thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}>{visibleText(cell)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      return null;
    })}
  </div>
);

const ReportSection = ({ section, emphasized = false }) => section ? (
  <section className={`vnext-report-section ${emphasized ? "is-core" : ""}`} data-section-title={section.title}>
    <h3>{section.title}</h3>
    <MarkdownBlocks blocks={section.blocks} />
  </section>
) : null;

export default function R2FinalReport({
  report,
  analysisContext,
  onNavigate,
  pageContextChanged = false,
  onReanalyze,
}) {
  const canonicalInput = report.canonical_input_snapshot || analysisContext?.canonical_input;
  return (
    <article className="vnext-report" aria-label="Ask PowerInsight专业报告">
      <header className="vnext-report-hero">
        <div>
          <div className="vnext-eyebrow">Ask PowerInsight 专业报告</div>
          <h2>{report.title}</h2>
        </div>
        <span className="vnext-status publishable">{report.status}</span>
      </header>

      {pageContextChanged && (
        <section className="vnext-snapshot-warning" role="status">
          <div>
            <strong>页面条件已变化</strong>
            <p>当前报告仍基于原分析条件，未随页面筛选器改变。</p>
          </div>
          <button type="button" className="btn" onClick={onReanalyze}>按当前页面条件重新分析</button>
        </section>
      )}

      <ReportSection section={report.core_conclusion} emphasized />
      <AnalysisContextSummary canonicalInput={canonicalInput} />
      {report.remaining_sections.map((section, index) => (
        <ReportSection section={section} key={`${section.title}-${index}`} />
      ))}

      <div className="vnext-actions">
        <button type="button" className="btn" onClick={() => onNavigate?.("overview")}>进入总览</button>
        <button type="button" className="btn" onClick={() => onNavigate?.("technology")}>进入技术</button>
        <button type="button" className="btn" onClick={() => onNavigate?.("companies")}>进入公司与情报</button>
      </div>
    </article>
  );
}
