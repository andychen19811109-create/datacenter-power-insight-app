import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalysisContext } from "../buildAnalysisContext.js";
import { runDcpiAnalysisAdapter } from "../analysisAdapter.js";
import { createTestOnlyDraft } from "../fixtures/difyFixtures.js";

const productContext = buildAnalysisContext({ question: "Kstar是否需要花资源开发全新模块化UPS？" });
const investmentContext = buildAnalysisContext({ question: "从产业投资角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？" });
const codes = (result) => result.violations.map((item) => item.code);

test("fixture without source_ref remains conditional and never becomes publishable", () => {
  const result = runDcpiAnalysisAdapter({ draft: createTestOnlyDraft(productContext), analysisContext: productContext });
  assert.equal(result.status, "CONDITIONAL");
  assert.ok(codes(result).includes("evidence_insufficient_for_publishable"));
  assert.equal(result.professional_boundaries.provider_confidence_used, false);
});

test("Final RC golden cases retain their frozen outcomes even with source-bound provider facts", () => {
  const sourceBoundProduct = createTestOnlyDraft(productContext, "SOURCE_BOUND_PRODUCT", {
    key_facts: [{ statement: "可追溯的产品资料需要结合客户验证。", evidence_type: "DIRECT", source_ref: "TRACEABLE_SOURCE_01" }],
  });
  const routeContext = buildAnalysisContext({ question: "800VDC在AI数据中心供电架构中的机会和风险是什么？" });
  const sourceBoundRoute = createTestOnlyDraft(routeContext, "SOURCE_BOUND_ROUTE", {
    key_facts: [{ statement: "可追溯的架构资料仍不能替代项目验证。", evidence_type: "DIRECT", source_ref: "TRACEABLE_SOURCE_02" }],
  });
  const sourceBoundInvestment = createTestOnlyDraft(investmentContext, "SOURCE_BOUND_INVESTMENT", {
    key_facts: [{ statement: "可追溯的行业资料不足以完成跨层级排序。", evidence_type: "DIRECT", source_ref: "TRACEABLE_SOURCE_03" }],
  });

  assert.equal(runDcpiAnalysisAdapter({ draft: sourceBoundProduct, analysisContext: productContext }).status, "CONDITIONAL");
  assert.equal(runDcpiAnalysisAdapter({ draft: sourceBoundRoute, analysisContext: routeContext }).status, "CONDITIONAL");
  assert.equal(runDcpiAnalysisAdapter({ draft: sourceBoundInvestment, analysisContext: investmentContext }).status, "INSUFFICIENT_EVIDENCE");
});

test("core object omission and wrong user task fail professional coverage", () => {
  const omitted = createTestOnlyDraft(investmentContext, "TEST_ONLY_REQUEST", { objects: [{ name: "BBU", object_type: "PRODUCT" }] });
  const wrongTask = createTestOnlyDraft(productContext, "TEST_ONLY_REQUEST", { task_type: "TECHNOLOGY_ROUTE" });
  assert.ok(codes(runDcpiAnalysisAdapter({ draft: omitted, analysisContext: investmentContext })).includes("core_object_omitted"));
  assert.ok(codes(runDcpiAnalysisAdapter({ draft: wrongTask, analysisContext: productContext })).includes("task_type_mismatch"));
});

test("investment subject ambiguity routes to one clarification", () => {
  const ambiguous = buildAnalysisContext({ question: "从投资者角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？" });
  const result = runDcpiAnalysisAdapter({ draft: createTestOnlyDraft(ambiguous), analysisContext: ambiguous });
  assert.equal(result.status, "NEEDS_CLARIFICATION");
  assert.equal(result.clarification_questions.length, 1);
});

test("ranking and investment-level reversal is not publishable", () => {
  const draft = createTestOnlyDraft(investmentContext, "TEST_ONLY_REQUEST", {
    candidate_conclusions: ["液冷最高优先，应优先投入。", "液冷最低优先，仅跟踪。"],
  });
  const result = runDcpiAnalysisAdapter({ draft, analysisContext: investmentContext });
  assert.ok(codes(result).includes("ranking_or_investment_conflict"));
  assert.equal(result.status, "INSUFFICIENT_EVIDENCE");
});

test("unsupported precision, missing direct source and internal plan masquerading as fact are removed", () => {
  const draft = createTestOnlyDraft(productContext, "TEST_ONLY_REQUEST", {
    key_facts: [
      { statement: "胜率达到87%", evidence_type: "INFERENCE", source_ref: null },
      { statement: "公开产品已发布", evidence_type: "DIRECT", source_ref: null },
      { statement: "内部规划目标被视为市场数据", evidence_type: "DIRECT", source_ref: "TEST_ONLY_INTERNAL" },
    ],
  });
  const result = runDcpiAnalysisAdapter({ draft, analysisContext: productContext });
  assert.ok(codes(result).includes("unsupported_precise_number"));
  assert.ok(codes(result).includes("direct_source_missing"));
  assert.ok(codes(result).includes("internal_plan_presented_as_fact"));
  assert.equal(result.draft.key_facts.length, 0);
});

test("public consensus and vendor announcements cannot masquerade as direct operational evidence", () => {
  const draft = createTestOnlyDraft(productContext, "TEST_ONLY_REQUEST", {
    key_facts: [
      { statement: "行业常识认为该路线成熟", evidence_type: "DIRECT", source_ref: "TEST_ONLY_SOURCE" },
      { statement: "供应商发布说明市场已经普遍采用并实现规模部署", evidence_type: "DIRECT", source_ref: "TEST_ONLY_VENDOR" },
    ],
  });
  const result = runDcpiAnalysisAdapter({ draft, analysisContext: productContext });
  assert.ok(codes(result).includes("evidence_type_mismatch"));
  assert.ok(codes(result).includes("vendor_evidence_scope_escalation"));
  assert.equal(result.draft.key_facts.length, 0);
});

test("conclusion-action conflict and Dify self-confidence are rejected from core output", () => {
  const draft = createTestOnlyDraft(productContext, "TEST_ONLY_REQUEST", {
    candidate_conclusions: ["当前不进入，仅跟踪。", "Dify置信度95%"],
    recommended_actions: ["立即规模投入并全面量产"],
  });
  const result = runDcpiAnalysisAdapter({ draft, analysisContext: productContext });
  assert.ok(codes(result).includes("dify_confidence_ignored"));
  assert.ok(codes(result).includes("conclusion_action_conflict"));
});

test("cross-level investment comparison needs scenario framing and evidence", () => {
  const draft = createTestOnlyDraft(investmentContext, "TEST_ONLY_REQUEST", { scenario_conclusions: [], key_facts: [] });
  const result = runDcpiAnalysisAdapter({ draft, analysisContext: investmentContext });
  assert.ok(codes(result).includes("investment_scenarios_incomplete"));
  assert.ok(codes(result).includes("evidence_insufficient_for_publishable"));
  assert.equal(result.status, "INSUFFICIENT_EVIDENCE");
});

test("same investment evidence boundary yields the same cautious status across wording", () => {
  const directConflict = createTestOnlyDraft(investmentContext, "TEST_ONLY_DIRECT", {
    scenario_conclusions: [],
    key_facts: [{ statement: "仅为分析推断。", evidence_type: "INFERENCE", source_ref: null }],
    candidate_conclusions: ["BBU第一优先。", "BBU最后考虑并退出。"],
  });
  const conditionalWording = createTestOnlyDraft(investmentContext, "TEST_ONLY_CONDITIONAL", {
    scenario_conclusions: [],
    key_facts: [{ statement: "仅为分析推断。", evidence_type: "INFERENCE", source_ref: null }],
    candidate_conclusions: ["BBU可进入验证。", "BBU在条件不足时暂缓。"],
  });
  const first = runDcpiAnalysisAdapter({ draft: directConflict, analysisContext: investmentContext });
  const second = runDcpiAnalysisAdapter({ draft: conditionalWording, analysisContext: investmentContext });
  assert.equal(first.status, "INSUFFICIENT_EVIDENCE");
  assert.equal(second.status, "INSUFFICIENT_EVIDENCE");
  assert.ok(codes(second).includes("ranking_or_investment_conflict"));
});
