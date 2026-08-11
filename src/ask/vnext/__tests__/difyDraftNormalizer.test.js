import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalysisContext } from "../buildAnalysisContext.js";
import { normalizeDifyAnalysisDraft } from "../difyDraftNormalizer.js";
import { runDcpiAnalysisAdapter } from "../analysisAdapter.js";
import {
  createTestOnlyDraft,
  V2_MARKDOWN_TEST_ONLY,
  V22_MARKDOWN_TEST_ONLY,
  V21_FIXTURE_STATUS,
} from "../fixtures/difyFixtures.js";

const productContext = buildAnalysisContext({ question: "Kstar是否需要花资源开发全新模块化UPS？" });
const investmentContext = buildAnalysisContext({
  question: "从产业投资角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？",
});

test("V2 and V2.2 structured Markdown normalize without exposing think blocks", () => {
  const v2 = normalizeDifyAnalysisDraft({ rawResponse: { answer: V2_MARKDOWN_TEST_ONLY }, requestId: "V2", question: productContext.original_question, analysisContext: productContext });
  const v22 = normalizeDifyAnalysisDraft({ rawResponse: { answer: V22_MARKDOWN_TEST_ONLY }, requestId: "V22", question: investmentContext.original_question, analysisContext: investmentContext });
  assert.equal(v2.request_id, "V2");
  assert.equal(v22.objects.length, 3);
  assert.equal(v22.raw_report_markdown.includes("<think>"), false);
});

test("V2.1 missing fixture remains an explicit missing state", () => {
  assert.equal(V21_FIXTURE_STATUS, "V2.1_FIXTURE_NOT_PROVIDED");
});

test("strict JSON draft binds request, question, task and preserves all objects", () => {
  const draft = createTestOnlyDraft(investmentContext, "JSON_REQUEST");
  const result = normalizeDifyAnalysisDraft({
    rawResponse: { answer: `<think>remove me</think>\n\`\`\`json\n${JSON.stringify(draft)}\n\`\`\`` },
    requestId: "JSON_REQUEST",
    question: investmentContext.original_question,
    analysisContext: investmentContext,
  });
  assert.deepEqual(result.objects.map((item) => item.name), ["BBU", "液冷", "GaN/SiC"]);
});

test("empty, arbitrary non-JSON, malformed JSON and binding mismatch fail closed", () => {
  assert.throws(() => normalizeDifyAnalysisDraft({ rawResponse: { answer: "" }, requestId: "X", question: productContext.original_question, analysisContext: productContext }), /empty/);
  assert.throws(() => normalizeDifyAnalysisDraft({ rawResponse: { answer: "random answer" }, requestId: "X", question: productContext.original_question, analysisContext: productContext }), /unstructured/);
  assert.throws(() => normalizeDifyAnalysisDraft({ rawResponse: { answer: "{bad" }, requestId: "X", question: productContext.original_question, analysisContext: productContext }), /json_invalid/);
  const wrong = createTestOnlyDraft(productContext, "WRONG");
  assert.throws(() => normalizeDifyAnalysisDraft({ rawResponse: { answer: JSON.stringify(wrong) }, requestId: "RIGHT", question: productContext.original_question, analysisContext: productContext }), /binding_mismatch/);
});

test("missing sections parse as a draft but Adapter blocks publishable status", () => {
  const draft = normalizeDifyAnalysisDraft({
    rawResponse: { answer: "# TEST_ONLY\n## 决策结论\n- 条件性验证\n## 说明\n- 内容不完整" },
    requestId: "MISSING",
    question: productContext.original_question,
    analysisContext: productContext,
  });
  assert.notEqual(runDcpiAnalysisAdapter({ draft, analysisContext: productContext }).status, "PUBLISHABLE");
});
