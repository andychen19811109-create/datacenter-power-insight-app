import React from "react";
import AnalysisContextSummary from "./AnalysisContextSummary.jsx";

const normalizeVisibleText = (value) => String(value || "").replace(/\\([@~])/g, "$1");

const InlineMarkdown = ({ value }) => {
  const text = normalizeVisibleText(value);
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*([^*]+)\*\*/g;
  const nodes = [];
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    if (match[1]) {
      nodes.push(<a href={match[2]} target="_blank" rel="noreferrer" key={`link-${match.index}`}>{match[1]}</a>);
    } else {
      nodes.push(<strong key={`strong-${match.index}`}>{match[3]}</strong>);
    }
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
};

const Paragraph = ({ text }) => String(text || "").split("\n").map((line, index) => (
  <React.Fragment key={index}>{index > 0 && <br />}<InlineMarkdown value={line} /></React.Fragment>
));

const MarkdownBlocks = ({ blocks = [] }) => (
  <div className="vnext-markdown-blocks">
    {blocks.map((block, index) => {
      if (block.type === "paragraph") {
        return <p key={`paragraph-${index}`}><Paragraph text={block.text} /></p>;
      }
      if (block.type === "unordered_list") {
        return <ul key={`ul-${index}`}>{block.items.map((item, itemIndex) => <li key={itemIndex}><InlineMarkdown value={item} /></li>)}</ul>;
      }
      if (block.type === "ordered_list") {
        return <ol key={`ol-${index}`}>{block.items.map((item, itemIndex) => <li key={itemIndex}><InlineMarkdown value={item} /></li>)}</ol>;
      }
      if (block.type === "table") {
        return (
          <div className="vnext-table-wrap" key={`table-${index}`}>
            <table>
              <thead><tr>{block.headers.map((cell, cellIndex) => <th key={cellIndex}><InlineMarkdown value={cell} /></th>)}</tr></thead>
              <tbody>
                {block.rows.map((row, rowIndex) => (
                  <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex}><InlineMarkdown value={cell} /></td>)}</tr>
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

const ReportSection = ({ section, emphasized = false, collapsible = false }) => {
  if (!section) return null;
  if (collapsible) {
    return (
      <details className="vnext-report-section is-collapsible" data-section-title={section.title} open>
        <summary><h3>{section.title}</h3></summary>
        <MarkdownBlocks blocks={section.blocks} />
      </details>
    );
  }
  return (
    <section className={`vnext-report-section ${emphasized ? "is-core" : ""}`} data-section-title={section.title}>
      <h3>{section.title}</h3>
      <MarkdownBlocks blocks={section.blocks} />
    </section>
  );
};

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
        <span className="vnext-status publishable">{report.status}</span>
        <div>
          <div className="vnext-eyebrow">Ask PowerInsight 专业报告</div>
          <h2>{report.title}</h2>
        </div>
      </header>

      <ReportSection section={report.core_conclusion} emphasized />
      <AnalysisContextSummary canonicalInput={canonicalInput} />
      {pageContextChanged && (
        <section className="vnext-snapshot-warning" role="status">
          <div>
            <strong>当前页面条件已变化</strong>
            <p>本报告仍基于原分析条件，不会随页面筛选器静默改变。</p>
          </div>
          <button type="button" className="btn" onClick={onReanalyze}>按当前条件重新分析</button>
        </section>
      )}
      {report.remaining_sections.map((section, index) => (
        <ReportSection section={section} key={`${section.title}-${index}`} collapsible />
      ))}

      <div className="vnext-actions">
        <span className="vnext-related-label">相关模块</span>
        <button type="button" className="btn" onClick={() => onNavigate?.("market", canonicalInput.page_ctx.value.raw_selections)}>市场</button>
        <button type="button" className="btn" onClick={() => onNavigate?.("product", canonicalInput.page_ctx.value.raw_selections)}>产品</button>
        <button type="button" className="btn" onClick={() => onNavigate?.("technology", canonicalInput.page_ctx.value.raw_selections)}>技术</button>
        <button type="button" className="btn" onClick={() => onNavigate?.("companies", canonicalInput.page_ctx.value.raw_selections)}>公司与情报</button>
      </div>
    </article>
  );
}
