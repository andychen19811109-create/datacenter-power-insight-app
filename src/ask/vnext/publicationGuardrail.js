import { validateAskReport } from "./contracts/askReport.js";
import {
  NUMERIC_CLAIM_TYPES,
  classifyNumericClaim,
  rewriteUnsupportedQuantitativeClaim,
} from "./numericClaimPolicy.js";
import { applyInvestmentRankingPolicy } from "./investmentRankingPolicy.js";
import {
  QUALITATIVE_CLAIM_TYPES,
  classifyQualitativeClaim,
  conditionalInference,
  unsupportedQualitativeFallback,
  userContextAnnotation,
} from "./qualitativeClaimPolicy.js";

const INTERNAL_SNAKE_CASE = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/g;
const INTERNAL_ENUM = /\b(?:PRODUCT|ARCHITECTURE|SOLUTION|COMPONENT_TECHNOLOGY|COMPANY|MARKET|UNKNOWN|PUBLISHABLE|CONDITIONAL|INSUFFICIENT_EVIDENCE|UNSUPPORTED)\b/g;

const scrubInternalTerms = (value) => String(value || "")
  .replace(INTERNAL_SNAKE_CASE, "内部校验项")
  .replace(INTERNAL_ENUM, "受控分析状态");

const stripPublicMarkdown = (value) => String(value || "")
  .replace(/```(?:[a-z0-9_-]+)?/gi, "")
  .replace(/^\s{0,3}#{1,6}\s+/gm, "")
  .replace(/\*\*([^*]+)\*\*/g, "$1")
  .replace(/__([^_]+)__/g, "$1")
  .replace(/`([^`]+)`/g, "$1")
  .trim();

const stripInlineEvidenceLabels = (value) => String(value || "")
  .replace(
    /[【\[(（]\s*(?:(?:内部)?知识库|公开资料|项目资料)?\s*(?:直接|间接|补充|参考)?\s*证据\s*[】\])）]/gi,
    ""
  )
  .replace(/\s{2,}/g, " ")
  .trim();

const replacePublicStageCodes = (value) => String(value || "")
  .replace(/(?:降级为|回退至|转为?|退回)\s*L1\s*(?:跟踪)?/gi, "转为持续跟踪")
  .replace(/(?:升级为|进入|转为?)\s*L2\s*(?:验证)?/gi, "进入小规模验证")
  .replace(/(?:升级为|进入|转为?)\s*L3\s*(?:阶段)?/gi, "进入下一阶段产品化评估")
  .replace(/(?:升级为|进入|转为?)\s*L4\s*(?:阶段)?/gi, "进入规模化投入评估")
  .replace(/\bL1\b/gi, "持续跟踪")
  .replace(/\bL2\b/gi, "小规模验证")
  .replace(/\bL3\b/gi, "下一阶段产品化评估")
  .replace(/\bL4\b/gi, "规模化投入评估")
  .replace(/持续跟踪\s*跟踪/g, "持续跟踪")
  .replace(/小规模验证\s*验证/g, "小规模验证")
  .replace(/\s{2,}/g, " ")
  .trim();

const scrubPublicSourceRef = (value) => {
  if (!value) return value;
  const internal = /\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b/.test(String(value));
  return internal ? "已绑定可追溯资料" : String(value);
};

const planningAssumption = (value) => {
  const text = String(value || "");
  if (/建议验证门槛|规划假设|待企业确认的项目目标|非市场事实/.test(text)) return text;
  return `规划假设（非市场事实，待企业确认）：${text}`;
};

 const fallbackForStatus = (taskType, status) => {
  if (taskType === "INVESTMENT_COMPARISON" && status === "INSUFFICIENT_EVIDENCE") {
    return "不输出无条件单一排序；当前证据不足以形成整体排序，请按投资主体、时间窗口、关键假设和主要风险分别比较。";
  }
  return "当前结论需保持条件化，并通过证据和验证 Gate 后再升级。";
};

export function applyPublicationGuardrail({ report, analysisContext, publicationContext = {} }) {
  const audit = { classifications: [], filtered_fields: [] };
  let nextStatus = report.status;
  const relocatedInferences = [];
  const informationToAdd = [...report.information_to_add];
  const cannotConclude = [...report.cannot_conclude];
  const allowOverallRanking = report.status === "PUBLISHABLE"
    && Boolean(publicationContext.comparable_object_levels)
    && analysisContext.decision_subject !== "UNKNOWN"
    && analysisContext.field_sources.time_horizon !== "DEFAULT"
    && Boolean(publicationContext.has_traceable_key_conclusion)
    && !publicationContext.has_ranking_conflict
    && !publicationContext.has_unsupported_key_number;

  const sanitizeText = (value, field, sourceRef = null) => {
    const internalSafe = replacePublicStageCodes(
      stripInlineEvidenceLabels(
        stripPublicMarkdown(scrubInternalTerms(value))
      )
    );
    const numericClaimType = classifyNumericClaim({ value: internalSafe, field, sourceRef, analysisContext });
    let next = internalSafe;
    if (numericClaimType === NUMERIC_CLAIM_TYPES.PLANNING_ASSUMPTION) next = planningAssumption(next);
    // User-provided numbers and technical conditions remain traceable through
    // context_summary.field_sources. They must not reclassify the entire model
    // sentence as user-provided content.
    if (numericClaimType === NUMERIC_CLAIM_TYPES.UNSUPPORTED_QUANTITATIVE_CLAIM) {
      const rewrite = rewriteUnsupportedQuantitativeClaim(
        next,
        analysisContext,
        field,
      );
      next = rewrite.value;
      audit.filtered_fields.push(field);
      audit.classifications.push({ field, numeric_handling: rewrite.handling });
      if (nextStatus === "PUBLISHABLE") nextStatus = analysisContext.task_type === "INVESTMENT_COMPARISON"
        ? "INSUFFICIENT_EVIDENCE" : "CONDITIONAL";
    }
    const ranking = analysisContext.task_type === "INVESTMENT_COMPARISON"
      ? applyInvestmentRankingPolicy({ value: next, status: nextStatus, allowOverallRanking }) : { value: next, filtered: false };
    if (ranking.filtered) audit.filtered_fields.push(field);
    if (ranking.downgrade_to) nextStatus = ranking.downgrade_to;
    const qualitativeClaimType = classifyQualitativeClaim({
      value: ranking.value,
      field,
      sourceRef,
      analysisContext,
    });
    if (qualitativeClaimType === QUALITATIVE_CLAIM_TYPES.ANALYTICAL_INFERENCE) next = conditionalInference(ranking.value);
    if (qualitativeClaimType === QUALITATIVE_CLAIM_TYPES.USER_PROVIDED_CONTEXT) next = userContextAnnotation(ranking.value);
    if (qualitativeClaimType === QUALITATIVE_CLAIM_TYPES.UNSUPPORTED_QUALITATIVE_CLAIM) {
      next = unsupportedQualitativeFallback({ value: ranking.value, analysisContext });
      audit.filtered_fields.push(field);
      if (nextStatus === "PUBLISHABLE") nextStatus = analysisContext.task_type === "INVESTMENT_COMPARISON"
        ? "INSUFFICIENT_EVIDENCE" : "CONDITIONAL";
    }
    audit.classifications.push({ field, numeric_claim_type: numericClaimType, qualitative_claim_type: qualitativeClaimType });
    return { value: next, qualitativeClaimType };
  };

  const guardStrings = (values, field) => values.map((value) => sanitizeText(value, field).value);
  const guardedFacts = report.key_facts.flatMap((fact) => {
    const guardedFact = sanitizeText(fact.statement, "key_facts", fact.source_ref);
    if (fact.source_ref) return [{ ...fact, statement: guardedFact.value, source_ref: scrubPublicSourceRef(fact.source_ref) }];
    if (guardedFact.qualitativeClaimType === QUALITATIVE_CLAIM_TYPES.ANALYTICAL_INFERENCE) {
      relocatedInferences.push(guardedFact.value);
    } else {
      informationToAdd.push("需补充可追溯来源后，才能将该定性判断作为关键事实发布。");
      cannotConclude.push("当前不能将未绑定来源的定性判断作为关键事实或直接证据。" );
    }
    audit.filtered_fields.push("key_facts");
    return [];
  });
  const guardedEvidence = report.evidence_summary.flatMap((item) => {
    const guardedItem = sanitizeText(item.statement, "evidence_summary", item.source_ref);
    if (item.source_ref) return [{ ...item, statement: guardedItem.value, source_ref: scrubPublicSourceRef(item.source_ref) }];
    informationToAdd.push("需补充可追溯来源后，才能将该内容列入证据摘要。");
    cannotConclude.push("当前不能将未绑定来源的内容标记为直接证据。" );
    audit.filtered_fields.push("evidence_summary");
    return [];
  });
  if (nextStatus === "PUBLISHABLE" && !guardedFacts.length && !guardedEvidence.length) {
    nextStatus = analysisContext.task_type === "INVESTMENT_COMPARISON" ? "INSUFFICIENT_EVIDENCE" : "CONDITIONAL";
    informationToAdd.push("需补充可追溯来源，才能将分析推断升级为可发布结论的事实依据。");
    cannotConclude.push("当前不能仅凭未绑定来源的分析推断形成无条件可发布结论。" );
  }
  const guardedSections = report.core_analysis_sections.map((section) => ({
    ...section,
    title: sanitizeText(section.title, "core_analysis_sections").value,
    items: guardStrings(section.items, "core_analysis_sections"),
  }));
  if (relocatedInferences.length) {
    guardedSections.push({ title: "条件性分析判断", items: [...new Set(relocatedInferences)] });
  }
  const guardedScenarios = report.scenario_comparison.map((item) => ({
    ...item,
    scenario: sanitizeText(item.scenario, "scenario_comparison").value,
    conclusion: sanitizeText(item.conclusion, "scenario_comparison").value,
  }));
  const guardedRelated = report.related_modules.map((item) => ({
    ...item,
    label: sanitizeText(item.label, "related_modules").value,
    reason: sanitizeText(item.reason, "related_modules").value,
  }));
  const guardedTitle = sanitizeText(report.title, "title").value;
  const guardedOneLineConclusion = sanitizeText(report.one_line_conclusion, "one_line_conclusion").value;
  const guardedRecommendedDecision = sanitizeText(report.recommended_decision, "recommended_decision").value;

  if (!guardedFacts.length && !guardedEvidence.length) {
    informationToAdd.push(
      "补充能够绑定到关键判断的公开来源、项目证据或经确认的企业输入。"
    );
    cannotConclude.push(
      "本报告中的条件性分析判断尚未绑定足够的可追溯证据；在补证前仅用于形成验证假设，不能作为已确认事实。"
    );
  }

  const guardedInformationToAdd = [...new Set(guardStrings(informationToAdd, "information_to_add"))];
  const guardedCannotConclude = [...new Set(guardStrings(cannotConclude, "cannot_conclude"))];

  const guarded = {
    ...report,
    status: nextStatus,
    title: guardedTitle,
    one_line_conclusion: guardedOneLineConclusion,
    recommended_decision: guardedRecommendedDecision,
    analysis_scope: guardStrings(report.analysis_scope, "analysis_scope"),
    key_assumptions: guardStrings(report.key_assumptions, "key_assumptions"),
    key_facts: guardedFacts,
    core_analysis_sections: guardedSections,
    scenario_comparison: guardedScenarios,
    alternatives: guardStrings(report.alternatives, "alternatives"),
    risks: Object.fromEntries(Object.entries(report.risks).map(([key, values]) => [key, guardStrings(values, "risks")])),
    uncertainties: guardStrings(report.uncertainties, "uncertainties"),
    recommended_actions: guardStrings(report.recommended_actions, "recommended_actions"),
    validation_gates: guardStrings(report.validation_gates, "validation_gates"),
    exit_conditions: guardStrings(report.exit_conditions, "exit_conditions"),
    evidence_summary: guardedEvidence,
    information_to_add: guardedInformationToAdd,
    cannot_conclude: guardedCannotConclude,
    related_modules: guardedRelated,
  };

  if (guarded.status === "INSUFFICIENT_EVIDENCE" && analysisContext.task_type === "INVESTMENT_COMPARISON") {
    const fallback = fallbackForStatus(analysisContext.task_type, guarded.status);
    guarded.one_line_conclusion = fallback;
    guarded.recommended_decision =
      "在证据补齐前不输出无条件单一排序；先确认投资主体与时间窗口，并补充各对象的客户采用、技术成熟度、资本需求和退出路径证据。";
  }

  const validation = validateAskReport(guarded);
  if (!validation.valid) throw new Error(`publication_guardrail_report_invalid:${validation.errors.join(",")}`);
  return { report: guarded, audit };
}
