import test from "node:test";
import assert from "node:assert/strict";
import {
  assertNoR2InternalLeak,
  createR2FinalReport,
  resolveR2FinalStatus,
} from "../r2FinalReport.js";
import { buildAnalysisContext } from "../buildAnalysisContext.js";

const context = buildAnalysisContext({ question: "800VDC在AI数据中心供电架构中的机会和风险是什么？" });
const reportAnswer = `# 决策摘要
- 800VDC应先完成架构与客户验证。

## 关键分析
- 保留成熟替代路线作为对照。`;

test("R2 final report fails closed on explicit internal machine structures", () => {
  for (const answer of [
    `${reportAnswer}\n\n\`\`\`json\n{"task_profile":"internal"}\n\`\`\``,
    `${reportAnswer}\nrequest_id=abc-123`,
    `${reportAnswer}\nTP-24 corrective action`,
    `${reportAnswer}\nTypeError: internal failure\n    at run (/api/ask.js:1:2)`,
  ]) {
    assert.throws(() => assertNoR2InternalLeak(answer), /r2_final_answer_internal_leak/);
  }
});

test("natural-language Provider, JSON technology and risk references remain publishable", () => {
  const answer = `${reportAnswer}\n\n## 风险说明\n- Provider市场格局、JSON技术接口和风险边界应由项目团队核实。`;
  const report = createR2FinalReport({ answer, analysisContext: context });
  assert.equal(report.status, "正式分析");
  assert.match(JSON.stringify(report), /JSON技术接口/);
});

test("R2 status contract maps machine codes and Chinese labels without exposing unknown codes", () => {
  assert.equal(resolveR2FinalStatus("analysis_status=REPORT"), "正式分析");
  assert.equal(resolveR2FinalStatus("analysis_status=LIMITED"), "有限分析");
  assert.equal(resolveR2FinalStatus("analysis_status=CLARIFY"), "需要澄清");
  assert.equal(resolveR2FinalStatus("analysis_status=UNSUPPORTED"), "当前不支持");
  assert.equal(resolveR2FinalStatus("有限分析"), "有限分析");
  assert.equal(resolveR2FinalStatus("analysis_status=PREVIEW"), "分析状态待确认");

  const report = createR2FinalReport({
    answer: `analysis_status=LIMITED\n${reportAnswer}`,
    analysisContext: context,
  });
  assert.equal(report.status, "有限分析");
  assert.doesNotMatch(JSON.stringify(report), /analysis_status|LIMITED/);
});

test("decision summary ignores a status heading and preserves existing conclusion, action and gate", () => {
  const answer = `# 分析状态：有限分析

## 核心结论
- 应先完成联合验证，再决定是否扩大投入。

## 推荐行动
- 先确认目标客户的技术边界与项目优先级。

## 验证Gate与边界
- 客户、接口和可追溯证据未确认前不扩大结论。`;
  const report = createR2FinalReport({ answer, analysisContext: context });
  assert.equal(report.status, "有限分析");
  assert.match(report.decision_summary.core_conclusion.join("\n"), /联合验证/);
  assert.match(report.decision_summary.recommended_actions.join("\n"), /目标客户/);
  assert.match(report.decision_summary.key_conditions.join("\n"), /接口和可追溯证据/);
  assert.doesNotMatch(JSON.stringify(report), /分析状态/);
});

test("parser preserves named-entity claim wording instead of strengthening it", () => {
  const answer = `## 核心结论
- Vertiv与华为的客户、区域和渠道差异需要由可追溯证据核实。`;
  const report = createR2FinalReport({ answer, analysisContext: context });
  assert.equal(report.decision_summary.core_conclusion[0], "Vertiv与华为的客户、区域和渠道差异需要由可追溯证据核实。");
});
