import React from "react";
import AskStandardReport from "./AskStandardReport.jsx";

export default function DegradedAnalysisPanel({ result, analysisContext, onRetry, onModify, onNavigate }) {
  return (
    <section className="vnext-degraded" aria-label="受限分析模式">
      <div className="vnext-degraded-banner">
        <div>
          <div className="vnext-eyebrow">受限分析模式</div>
          <h2>在线Dify当前不可用</h2>
          <p>系统仍保留原问题、对象边界、主要风险和验证路径，但不会伪装成完整在线分析。</p>
        </div>
        <div className="vnext-actions">
          <button type="button" className="btn btn-primary" onClick={onRetry}>重试</button>
          <button type="button" className="btn" onClick={onModify}>修改问题</button>
        </div>
      </div>
      <AskStandardReport report={result.report} analysisContext={analysisContext} onNavigate={onNavigate} />
    </section>
  );
}
