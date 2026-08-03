import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalysisContext } from "../buildAnalysisContext.js";
import { validateAnalysisContext } from "../contracts/analysisContext.js";
import { validateDifyAnalysisDraft } from "../contracts/difyAnalysisDraft.js";
import { validateAskReport } from "../contracts/askReport.js";
import { createTestOnlyDraft } from "../fixtures/difyFixtures.js";
import { runDcpiAnalysisAdapter } from "../analysisAdapter.js";
import { composeAskStandardReport } from "../reportComposer.js";

const context = buildAnalysisContext({
  question: "Kstar是否需要花资源开发全新模块化UPS？",
  pageContext: { normalizedFilters: { region: "中国", customer: "云服务商", application: "AI 训练集群", time: "2026" } },
});

test("three vNext contracts validate a complete bound chain", () => {
  assert.equal(validateAnalysisContext(context).valid, true);
  const draft = createTestOnlyDraft(context);
  assert.equal(validateDifyAnalysisDraft(draft).valid, true);
  const adapter = runDcpiAnalysisAdapter({ draft, analysisContext: context });
  const report = composeAskStandardReport({ adapterResult: adapter, analysisContext: context });
  assert.equal(validateAskReport(report).valid, true);
});

test("contracts fail closed on illegal fields and enums", () => {
  assert.equal(validateAnalysisContext({ ...context, extra: true }).valid, false);
  assert.equal(validateAnalysisContext({ ...context, task_type: "FREEFORM" }).valid, false);
  assert.equal(validateDifyAnalysisDraft({ ...createTestOnlyDraft(context), confidence: 0.99 }).valid, false);
  const adapter = runDcpiAnalysisAdapter({ draft: createTestOnlyDraft(context), analysisContext: context });
  const report = composeAskStandardReport({ adapterResult: adapter, analysisContext: context });
  assert.equal(validateAskReport({ ...report, RELEASED: true }).valid, false);
});

test("context fingerprint invalidates stale results after a material change", () => {
  const changed = buildAnalysisContext({
    question: context.original_question,
    pageContext: { normalizedFilters: { region: "欧洲", customer: "云服务商", application: "AI 训练集群", time: "2026" } },
  });
  assert.notEqual(context.context_id, changed.context_id);
  assert.equal(validateAnalysisContext({ ...changed, context_id: context.context_id }).valid, false);
});
