import React, { useState } from "react";

export default function ClarificationPanel({ questions, analysisContext, onContinue, onBack }) {
  const [selections, setSelections] = useState({});
  const visibleQuestions = (questions || []).slice(0, 3);
  const choose = (field, value) => setSelections((current) => ({ ...current, [field]: value }));

  return (
    <section className="vnext-panel vnext-clarification" aria-label="轻量澄清">
      <div className="vnext-eyebrow">只确认会改变结论的条件</div>
      <h2>补充一个关键条件</h2>
      <p className="text-muted">你可以直接选择，也可以采用推荐默认假设；所用假设会显示在报告中。</p>
      <AnalysisContextInline analysisContext={analysisContext} />
      {visibleQuestions.map((item, questionIndex) => (
        <fieldset key={item.field} className="vnext-question-card">
          <legend>{questionIndex + 1}. {item.question}</legend>
          <div className="vnext-chips">
            {item.options.map((option) => (
              <button
                type="button"
                key={option}
                className={`vnext-chip ${selections[item.field] === option ? "selected" : ""}`}
                onClick={() => choose(item.field, option)}
                aria-pressed={selections[item.field] === option}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="vnext-actions">
        <button type="button" className="btn btn-primary" onClick={() => onContinue(selections)}>
          继续分析
        </button>
        <button type="button" className="btn" onClick={() => onContinue({})}>
          采用默认假设
        </button>
        <button type="button" className="btn" onClick={onBack}>修改问题</button>
      </div>
    </section>
  );
}

const AnalysisContextInline = ({ analysisContext }) => (
  <div className="vnext-inline-context">
    已识别：{[...(analysisContext?.product_or_technology || []), ...(analysisContext?.companies || [])].join("、") || "待确认对象"}
  </div>
);
