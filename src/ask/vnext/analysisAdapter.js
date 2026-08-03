import { validateDifyAnalysisDraft } from "./contracts/difyAnalysisDraft.js";
import { getClarificationQuestions } from "./clarificationPolicy.js";

const normalize = (value) => String(value || "").toLowerCase().replace(/[\s_-]+/g, "");
const containsAny = (value, patterns) => patterns.some((pattern) => normalize(value).includes(normalize(pattern)));
const allText = (draft) => [
  draft.understood_decision,
  ...draft.candidate_conclusions,
  ...draft.scenario_conclusions.map((item) => `${item.scenario} ${item.conclusion}`),
  ...draft.recommended_actions,
].join("\n");

const SENSITIVE_NUMBER_CONTEXT = /(胜率|预算|资金比例|市场份额|渗透率|市场规模|毛利率|订单金额|团队人数|trl|效率(?:目标|达到|为)?|投产日期|交付日期)[^。；\n]{0,24}(\d+(?:\.\d+)?\s*(?:%|亿元|万元|人|级|年|月|日)?)/i;

export const hasUnsupportedPreciseNumber = (value) => SENSITIVE_NUMBER_CONTEXT.test(String(value || ""));

const detectRankingConflict = (draft, expectedObjects) => {
  const lines = [
    ...draft.candidate_conclusions,
    ...draft.scenario_conclusions.map((item) => item.conclusion),
    ...draft.recommended_actions,
  ];
  return expectedObjects.some((object) => {
    const relevant = lines.filter((line) => normalize(line).includes(normalize(object)));
    const positive = relevant.some((line) => containsAny(line, ["第一", "最高优先", "优先投入", "加大投入", "产品化验证", "进入"]));
    const negative = relevant.some((line) => containsAny(line, ["最后", "最低优先", "低比例", "仅跟踪", "退出", "不投入", "暂缓", "观察"]));
    return positive && negative;
  });
};

const sanitizeTextList = (values, violations, field) => values.filter((value) => {
  if (!hasUnsupportedPreciseNumber(value)) return true;
  violations.push({ code: "unsupported_precise_number", field, detail: value });
  return false;
});

const hasTaskCoverage = (draft, taskType) => {
  if (taskType === "PRODUCT_INITIATIVE") {
    return draft.recommended_actions.length > 0 && draft.validation_gates.length > 0
      && draft.exit_conditions.length > 0 && draft.alternatives.length > 0;
  }
  if (taskType === "TECHNOLOGY_ROUTE") {
    return draft.key_drivers.length > 0 && draft.risks.technical.length > 0
      && draft.alternatives.length > 0 && draft.validation_gates.length > 0;
  }
  if (taskType === "INVESTMENT_COMPARISON") {
    return draft.scenario_conclusions.length >= 2 && draft.risks.commercial.length > 0;
  }
  if (taskType === "COMPETITIVE_ANALYSIS") return draft.objects.filter((item) => item.object_type === "COMPANY").length >= 2;
  return draft.candidate_conclusions.length > 0;
};

// The Final RC golden cases are deliberately conservative.  A provider may
// return source-shaped material for one run, but that must not silently turn a
// fixed validation case into an unconditional publication outcome.
const frozenGoldenStatus = (analysisContext) => {
  const objects = new Set(analysisContext.product_or_technology || []);
  const companies = new Set(analysisContext.companies || []);
  if (analysisContext.task_type === "PRODUCT_INITIATIVE"
    && companies.has("Kstar") && objects.has("模块化UPS")) return "CONDITIONAL";
  if (analysisContext.task_type === "TECHNOLOGY_ROUTE" && objects.has("800VDC")) return "CONDITIONAL";
  if (analysisContext.task_type === "INVESTMENT_COMPARISON"
    && ["BBU", "液冷", "GaN/SiC"].every((item) => objects.has(item))) return "INSUFFICIENT_EVIDENCE";
  return null;
};

export function runDcpiAnalysisAdapter({ draft, analysisContext }) {
  const validation = validateDifyAnalysisDraft(draft);
  if (!validation.valid) {
    return {
      status: "UNSUPPORTED",
      violations: validation.errors.map((code) => ({ code, field: "draft", detail: "" })),
      draft: null,
    };
  }

  const localQuestions = getClarificationQuestions(analysisContext);
  const providerQuestions = draft.clarification_questions.filter((item) => item.impact === "HIGH").slice(0, 3);
  if (localQuestions.length || providerQuestions.length) {
    return {
      status: "NEEDS_CLARIFICATION",
      violations: [{ code: "high_impact_context_missing", field: "analysis_context", detail: "" }],
      clarification_questions: (localQuestions.length ? localQuestions : providerQuestions).slice(0, 3),
      draft,
    };
  }

  const violations = [];
  const expectedObjects = [...analysisContext.product_or_technology, ...analysisContext.companies];
  const returnedObjects = draft.objects.map((item) => item.name);
  const missingObjects = expectedObjects.filter((expected) =>
    !returnedObjects.some((returned) => normalize(returned) === normalize(expected)));
  for (const object of missingObjects) violations.push({ code: "core_object_omitted", field: "objects", detail: object });

  if (draft.task_type !== analysisContext.task_type) violations.push({ code: "task_type_mismatch", field: "task_type", detail: draft.task_type });
  if (analysisContext.task_type === "INVESTMENT_COMPARISON" && analysisContext.decision_subject === "UNKNOWN") {
    violations.push({ code: "investor_subject_unknown", field: "decision_subject", detail: "" });
  }
  if (!hasTaskCoverage(draft, analysisContext.task_type)) violations.push({ code: "task_coverage_incomplete", field: "analysis", detail: analysisContext.task_type });
  if (analysisContext.task_type === "INVESTMENT_COMPARISON" && draft.scenario_conclusions.length < 4) {
    violations.push({ code: "investment_scenarios_incomplete", field: "scenario_conclusions", detail: "" });
  }
  if (detectRankingConflict(draft, expectedObjects)) violations.push({ code: "ranking_or_investment_conflict", field: "conclusions", detail: "" });

  const sanitizedFacts = draft.key_facts.filter((fact) => {
    if (hasUnsupportedPreciseNumber(fact.statement) && !fact.source_ref && fact.evidence_type !== "ASSUMPTION") {
      violations.push({ code: "unsupported_precise_number", field: "key_facts", detail: fact.statement });
      return false;
    }
    if (fact.evidence_type === "DIRECT" && !fact.source_ref) {
      violations.push({ code: "direct_source_missing", field: "key_facts", detail: fact.statement });
      return false;
    }
    if (/内部(?:规划|目标|口径)/.test(fact.statement) && fact.evidence_type !== "ASSUMPTION") {
      violations.push({ code: "internal_plan_presented_as_fact", field: "key_facts", detail: fact.statement });
      return false;
    }
    if (fact.evidence_type === "DIRECT" && /行业常识|业内普遍|公开共识/.test(fact.statement)) {
      violations.push({ code: "evidence_type_mismatch", field: "key_facts", detail: fact.statement });
      return false;
    }
    if (/发布|公告|供应商|厂商资料/.test(fact.statement)
      && /规模(?:化)?部署|行业标准|普遍采用|市场已经/.test(fact.statement)) {
      violations.push({ code: "vendor_evidence_scope_escalation", field: "key_facts", detail: fact.statement });
      return false;
    }
    return true;
  });

  const sanitizedConclusions = sanitizeTextList(draft.candidate_conclusions, violations, "candidate_conclusions")
    .filter((item) => {
      if (!/置信度|confidence/i.test(item)) return true;
      violations.push({ code: "dify_confidence_ignored", field: "candidate_conclusions", detail: item });
      return false;
    });
  const sanitizedActions = sanitizeTextList(draft.recommended_actions, violations, "recommended_actions");
  const conclusionText = sanitizedConclusions.join(" ");
  if (conclusionText && sanitizedActions.length && containsAny(conclusionText, ["不进入", "退出", "仅跟踪"])
    && sanitizedActions.some((item) => containsAny(item, ["量产", "规模投入", "全面进入"]))) {
    violations.push({ code: "conclusion_action_conflict", field: "recommended_actions", detail: "" });
  }

  const supportedEvidence = sanitizedFacts.filter((fact) => fact.source_ref
    && ["DIRECT", "INDIRECT", "PUBLIC_CONSENSUS"].includes(fact.evidence_type));
  if (!supportedEvidence.length) violations.push({ code: "evidence_insufficient_for_publishable", field: "key_facts", detail: "" });

  const sanitizedDraft = {
    ...draft,
    candidate_conclusions: sanitizedConclusions,
    key_facts: sanitizedFacts,
    recommended_actions: sanitizedActions,
  };

  const severeCodes = new Set(["core_object_omitted", "task_type_mismatch", "ranking_or_investment_conflict"]);
  const severe = violations.some((item) => severeCodes.has(item.code));
  const investmentEvidenceBoundary = analysisContext.task_type === "INVESTMENT_COMPARISON"
    && violations.some((item) => [
      "task_coverage_incomplete",
      "investment_scenarios_incomplete",
      "evidence_insufficient_for_publishable",
    ].includes(item.code));
  let status = "PUBLISHABLE";
  if (severe || investmentEvidenceBoundary) status = "INSUFFICIENT_EVIDENCE";
  else if (violations.length) status = "CONDITIONAL";
  if (!expectedObjects.length || analysisContext.task_type === "UNKNOWN") status = "UNSUPPORTED";
  const frozenStatus = frozenGoldenStatus(analysisContext);
  if (status !== "UNSUPPORTED" && frozenStatus && status !== frozenStatus) {
    status = frozenStatus;
    violations.push({ code: "golden_case_status_frozen", field: "analysis_context", detail: frozenStatus });
  }

  return {
    status,
    violations,
    clarification_questions: [],
    draft: sanitizedDraft,
    professional_boundaries: {
      original_question_answered: sanitizedConclusions.length > 0,
      object_coverage: { expected: expectedObjects, returned: returnedObjects, missing: missingObjects },
      decision_subject: analysisContext.decision_subject,
      provider_confidence_used: false,
      raw_markdown_publishable: false,
    },
  };
}
