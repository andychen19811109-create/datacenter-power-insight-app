import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalysisContext } from "../buildAnalysisContext.js";
import { runDcpiAnalysisAdapter } from "../analysisAdapter.js";
import { composeAskStandardReport } from "../reportComposer.js";
import { applyPublicationGuardrail } from "../publicationGuardrail.js";
import { applyInvestmentRankingPolicy } from "../investmentRankingPolicy.js";
import { createTestOnlyDraft } from "../fixtures/difyFixtures.js";

const productContext = buildAnalysisContext({ question: "Kstar是否需要花资源开发全新模块化UPS？" });
const technologyContext = buildAnalysisContext({
  question: "800VDC在2028年AI数据中心供电架构中的机会和风险是什么？",
});
const investmentContext = buildAnalysisContext({
  question: "从产业投资角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？",
});

const reportFor = (context, overrides = {}) => {
  const draft = createTestOnlyDraft(context, "TEST_ONLY_PUBLICATION", overrides);
  const adapter = runDcpiAnalysisAdapter({ draft, analysisContext: context });
  return composeAskStandardReport({ adapterResult: adapter, analysisContext: context });
};

test("numeric policy preserves source-bound facts, user conditions and technical identifiers", () => {
  const report = reportFor(technologyContext, {
    key_facts: [{ statement: "可追溯资料支持市场份额为31%。", evidence_type: "DIRECT", source_ref: "TRACEABLE_SOURCE_31" }],
  });
  assert.match(report.title, /800VDC/);
  assert.match(report.key_facts[0].statement, /31%/);
  assert.equal(report.context_summary.time_horizon, "2028");
  assert.equal(report.context_summary.field_sources.time_horizon, "QUESTION");
});

test("unsupported quantitative claims are generalized in every public report field", () => {
  const base = reportFor(productContext);
  const contaminated = {
    ...base,
    title: "模块化UPS市场规模50亿元",
    one_line_conclusion: "市场份额达到31%，应立即投入。",
    recommended_decision: "客户数量达到3家后进入。",
    analysis_scope: ["功率达到150kW"],
    key_assumptions: ["项目周期为12个月"],
    key_facts: [{ statement: "无来源效率达到98%。", evidence_type: "INFERENCE", source_ref: null }],
    core_analysis_sections: [{ title: "核心分析", items: ["市场规模为50亿元"] }],
    scenario_comparison: [{ scenario: "近期", conclusion: "投资回收期为3年" }],
    alternatives: ["功率为200kW的替代路线"],
    risks: { market: ["渗透率为40%"], technical: ["效率达到98%"], commercial: ["客户数量为3家"], organizational: ["团队人数为20人"] },
    uncertainties: ["TRL为7级"],
    recommended_actions: ["在90天内完成3家客户访谈"],
    validation_gates: ["达到98%效率后通过"],
    exit_conditions: ["12个月后退出"],
    evidence_summary: [{ statement: "市场规模50亿元", status: "INFERENCE_UNSOURCED", source_ref: null }],
    information_to_add: ["确认市场份额31%"],
    cannot_conclude: ["无法确认50亿元市场规模"],
    related_modules: [{ id: "overview", label: "总览", reason: "查看50亿元市场" }],
  };
  const guarded = applyPublicationGuardrail({ report: contaminated, analysisContext: productContext }).report;
  const visible = JSON.stringify(guarded);
  assert.equal(guarded.status, "CONDITIONAL");
  assert.equal(/(?:31%|50亿元|150kW|200kW|40%|TRL为7|团队人数为20)/.test(visible), false);
  assert.match(guarded.recommended_actions[0], /规划假设.*90天.*3家/);
  assert.match(guarded.validation_gates[0], /规划假设.*98%/);
});

test("planning assumptions stay out of facts and market conclusions", () => {
  const report = reportFor(productContext, {
    validation_gates: ["建议在90天内完成2个POC，并以98%作为待确认项目目标。"],
    candidate_conclusions: ["市场当前效率达到98%，应立即投入。", "保持条件化。"],
  });
  assert.match(report.validation_gates[0], /规划假设.*非市场事实/);
  assert.equal(report.one_line_conclusion.includes("98%"), false);
});

test("insufficient investment evidence blocks rankings throughout the complete report", () => {
  const report = reportFor(investmentContext, {
    key_facts: [{ statement: "仅为分析推断。", evidence_type: "INFERENCE", source_ref: null }],
    candidate_conclusions: ["综合排序：BBU > 液冷 > GaN/SiC，BBU最优。", "优先投入BBU。"],
    scenario_conclusions: [
      { scenario: "近期产业投资", conclusion: "若面向产业投资、近期窗口且假设客户协同成立，主要风险是客户验证不足。" },
      { scenario: "长期产业投资", conclusion: "若面向产业投资、长期窗口且假设技术协同成立，主要风险是标准成熟度不足。" },
      { scenario: "近期财务投资", conclusion: "若面向财务投资、近期窗口且假设退出路径成立，主要风险是收入质量不足。" },
      { scenario: "长期财务投资", conclusion: "若面向财务投资、长期窗口且假设技术扩散成立，主要风险是周期不确定。" },
    ],
  });
  const visible = JSON.stringify(report);
  assert.equal(report.status, "INSUFFICIENT_EVIDENCE");
  assert.match(report.one_line_conclusion, /不输出无条件单一排序/);
  assert.equal(/BBU\s*>\s*液冷|综合排序|优先投入|最优/.test(visible), false);
  assert.match(JSON.stringify(report.scenario_comparison), /产业投资.*近期.*主要风险/);
});

test("conditional ranking policy requires subject, time, assumption and risk", () => {
  const blocked = applyInvestmentRankingPolicy({ value: "BBU优先投入。", status: "CONDITIONAL" });
  const allowed = applyInvestmentRankingPolicy({
    value: "若面向产业投资、近期窗口，关键假设为客户协同成立，主要风险是客户验证不足。",
    status: "CONDITIONAL",
  });
  assert.equal(blocked.filtered, true);
  assert.equal(allowed.filtered, false);
});

test("publishable status alone cannot authorize an overall investment ranking", () => {
  const context = buildAnalysisContext({ question: "从产业投资角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？", clarification: { time_horizon: "近期" } });
  const report = reportFor(context, {
    candidate_conclusions: ["综合排序：BBU > 液冷 > GaN/SiC。", "保持条件化。"],
  });
  assert.equal(report.status, "INSUFFICIENT_EVIDENCE");
  assert.match(report.one_line_conclusion, /不输出无条件单一排序/);
  assert.equal(/BBU\s*>\s*液冷|综合排序/.test(JSON.stringify(report)), false);
});

test("publication guardrail removes internal codes from all public text fields", () => {
  const base = reportFor(productContext);
  const contaminated = {
    ...base,
    one_line_conclusion: "ranking_or_investment_conflict 需要处理。",
    core_analysis_sections: [{ title: "PRODUCT", items: ["unsupported_precise_number"] }],
    related_modules: [{ id: "overview", label: "CONDITIONAL", reason: "task_coverage_incomplete" }],
  };
  const guarded = applyPublicationGuardrail({ report: contaminated, analysisContext: productContext }).report;
  const visible = [
    guarded.one_line_conclusion,
    ...guarded.core_analysis_sections.flatMap((section) => [section.title, ...section.items]),
    ...guarded.related_modules.flatMap((item) => [item.label, item.reason]),
  ].join(" ");
  assert.equal(/ranking_or_investment_conflict|unsupported_precise_number|task_coverage_incomplete|\bPRODUCT\b|\bCONDITIONAL\b/.test(visible), false);
});

test("time source remains explicit for question, clarification, filter, default and stored unknown contexts", () => {
  const fromQuestion = buildAnalysisContext({ question: "请在2029年评估800VDC。" });
  const fromClarification = buildAnalysisContext({ question: "评估800VDC。", clarification: { time_horizon: "近期" } });
  const fromFilter = buildAnalysisContext({ question: "评估800VDC。", pageContext: { normalizedFilters: { time: "2026" } } });
  const fromDefault = buildAnalysisContext({ question: "评估800VDC。" });
  const storedUnknown = { ...fromDefault, time_horizon: "unknown", field_sources: { ...fromDefault.field_sources, time_horizon: "DEFAULT" } };
  assert.equal(fromQuestion.field_sources.time_horizon, "QUESTION");
  assert.equal(fromClarification.field_sources.time_horizon, "CLARIFICATION");
  assert.equal(fromFilter.field_sources.time_horizon, "FILTER");
  assert.equal(fromDefault.field_sources.time_horizon, "DEFAULT");
  assert.equal(storedUnknown.time_horizon, "unknown");
  assert.equal(storedUnknown.field_sources.time_horizon, "DEFAULT");
  const filteredReport = reportFor(fromFilter);
  assert.equal(filteredReport.context_summary.time_horizon, "2026");
  assert.equal(filteredReport.context_summary.field_sources.time_horizon, "FILTER");
});

test("source-bound qualitative facts remain traceable and may stay in facts and evidence", () => {
  const base = reportFor(technologyContext);
  const guarded = applyPublicationGuardrail({
    report: {
      ...base,
      key_facts: [{ statement: "具名项目已完成规模化部署。", evidence_type: "DIRECT", source_ref: "TRACEABLE_PROJECT_SOURCE" }],
      evidence_summary: [{ statement: "具名项目已完成规模化部署。", status: "DIRECT", source_ref: "TRACEABLE_PROJECT_SOURCE" }],
    },
    analysisContext: technologyContext,
  }).report;
  assert.equal(guarded.key_facts.length, 1);
  assert.equal(guarded.evidence_summary.length, 1);
  assert.match(guarded.key_facts[0].statement, /已完成规模化部署/);
  assert.equal(guarded.key_facts[0].source_ref, "TRACEABLE_PROJECT_SOURCE");
});

test("unbound qualitative assertions are removed or downgraded in every public field", () => {
  const base = reportFor(productContext);
  const assertion = "市场已经广泛采用，技术已经成熟，需求快速增长。";
  const contaminated = {
    ...base,
    title: assertion,
    one_line_conclusion: assertion,
    recommended_decision: assertion,
    analysis_scope: [assertion],
    key_assumptions: [assertion],
    key_facts: [{ statement: assertion, evidence_type: "INFERENCE", source_ref: null }],
    core_analysis_sections: [{ title: assertion, items: [assertion] }],
    scenario_comparison: [{ scenario: assertion, conclusion: assertion }],
    alternatives: [assertion],
    risks: { market: [assertion], technical: [assertion], commercial: [assertion], organizational: [assertion] },
    uncertainties: [assertion],
    recommended_actions: [assertion],
    validation_gates: [assertion],
    exit_conditions: [assertion],
    evidence_summary: [{ statement: assertion, status: "INFERENCE_UNSOURCED", source_ref: null }],
    information_to_add: [assertion],
    cannot_conclude: [assertion],
    related_modules: [{ id: "overview", label: assertion, reason: assertion }],
  };
  const guarded = applyPublicationGuardrail({ report: contaminated, analysisContext: productContext }).report;
  const visible = JSON.stringify(guarded);
  assert.equal(visible.includes(assertion), false);
  assert.equal(guarded.key_facts.length, 0);
  assert.equal(guarded.evidence_summary.length, 0);
  assert.match(visible, /不能视为已完成市场验证/);
  assert.equal(guarded.status, "CONDITIONAL");
});

test("analysis inferences stay conditional and never remain as key facts or direct evidence", () => {
  const base = reportFor(technologyContext);
  const inference = "从当前架构逻辑看，800VDC可作为值得持续验证的结构性机会。";
  const guarded = applyPublicationGuardrail({
    report: {
      ...base,
      key_facts: [{ statement: inference, evidence_type: "INFERENCE", source_ref: null }],
      evidence_summary: [{ statement: inference, status: "INFERENCE_UNSOURCED", source_ref: null }],
    },
    analysisContext: technologyContext,
  }).report;
  assert.equal(guarded.key_facts.length, 0);
  assert.equal(guarded.evidence_summary.length, 0);
  assert.match(JSON.stringify(guarded.core_analysis_sections), /值得持续验证/);
  assert.match(JSON.stringify(guarded.information_to_add), /可追溯来源/);
  assert.match(JSON.stringify(guarded.cannot_conclude), /直接证据/);
  assert.equal(guarded.status, "CONDITIONAL");
});

test("unbound named-company capability assertions become verification requirements", () => {
  const base = reportFor(productContext);
  const guarded = applyPublicationGuardrail({
    report: { ...base, one_line_conclusion: "Kstar具备领先的模块化UPS平台能力。" },
    analysisContext: productContext,
  }).report;
  assert.doesNotMatch(guarded.one_line_conclusion, /具备领先/);
  assert.match(guarded.one_line_conclusion, /未绑定足够的Kstar产品平台/);
  assert.equal(guarded.status, "CONDITIONAL");
});

test("claim-level numeric rewrites never leave fragments and preserve 800VDC", () => {
  const base = reportFor(technologyContext);
  const guarded = applyPublicationGuardrail({
    report: {
      ...base,
      one_line_conclusion: "单柜功率从数十kW向+演进，800VDC会成为主流。",
      recommended_decision: "预计左右普及后再投入。",
      validation_gates: ["≥效率在-负载区间可复现。"],
    },
    analysisContext: technologyContext,
  }).report;
  const visible = JSON.stringify(guarded);
  assert.match(guarded.one_line_conclusion, /机柜功率需求提高/);
  assert.match(guarded.one_line_conclusion, /800VDC/);
  assert.match(guarded.recommended_decision, /没有足够来源/);
  assert.match(guarded.validation_gates[0], /由企业在项目立项时确认/);
  assert.doesNotMatch(visible, /向\+|单柜\+|预计左右|≥效率|在-负载区间/);
});


test("user-provided numbers never relabel an entire model conclusion", () => {
  const base = reportFor(technologyContext);
  const guarded = applyPublicationGuardrail({
    report: {
      ...base,
      one_line_conclusion:
        "800VDC是2028年AI数据中心供电架构中绕不开的结构性方向。",
    },
    analysisContext: technologyContext,
  }).report;

  assert.doesNotMatch(
    guarded.one_line_conclusion,
    /用户输入|分析条件/
  );
  assert.doesNotMatch(
    guarded.one_line_conclusion,
    /绕不开/
  );
  assert.match(
    guarded.one_line_conclusion,
    /800VDC/
  );
});

test("unbound inline evidence labels are removed from public text", () => {
  const base = reportFor(investmentContext);
  const guarded = applyPublicationGuardrail({
    report: {
      ...base,
      validation_gates: [
        "规划假设（非市场事实，待企业确认）：液冷完成客户POC【知识库间接证据】。",
        "BBU完成客户验证【直接证据】。",
      ],
    },
    analysisContext: investmentContext,
  }).report;

  const visible = JSON.stringify(guarded.validation_gates);

  assert.doesNotMatch(
    visible,
    /知识库间接证据|直接证据|间接证据/
  );
  assert.match(visible, /液冷/);
  assert.match(visible, /BBU/);
});

test("internal L1 to L4 stage codes never enter public report fields", () => {
  const base = reportFor(productContext);
  const guarded = applyPublicationGuardrail({
    report: {
      ...base,
      validation_gates: [
        "未达成客户验证则降级为 L1 跟踪。",
        "通过验证后进入 L2 验证。",
      ],
      recommended_actions: [
        "条件满足后进入 L3 阶段。",
      ],
      exit_conditions: [
        "规模条件成立后进入 L4 阶段。",
      ],
    },
    analysisContext: productContext,
  }).report;

  const visible = JSON.stringify([
    ...guarded.validation_gates,
    ...guarded.recommended_actions,
    ...guarded.exit_conditions,
  ]);

  assert.doesNotMatch(visible, /\bL[1-4]\b/i);
  assert.match(visible, /持续跟踪/);
  assert.match(visible, /小规模验证/);
  assert.match(visible, /下一阶段产品化评估/);
  assert.match(visible, /规模化投入评估/);
});

test("strong unbound route assertions become conditional evidence-aware conclusions", () => {
  const base = reportFor(technologyContext);
  const guarded = applyPublicationGuardrail({
    report: {
      ...base,
      one_line_conclusion:
        "800VDC是AI数据中心唯一方向和不可逆趋势。",
    },
    analysisContext: technologyContext,
  }).report;

  assert.doesNotMatch(
    guarded.one_line_conclusion,
    /唯一方向|不可逆趋势/
  );
  assert.match(
    guarded.one_line_conclusion,
    /未绑定足够/
  );
  assert.match(
    guarded.one_line_conclusion,
    /值得验证/
  );
  assert.equal(guarded.status, "CONDITIONAL");
});
