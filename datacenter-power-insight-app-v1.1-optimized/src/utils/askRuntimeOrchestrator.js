import { buildAskAnalysisState } from "./askParser.js";
import { routeAskQuestion } from "./askRouter.js";
import { buildInsightContext } from "./insightContext.js";
import { resolvePlanningObject, describeResolvedObject } from "./planningObjectResolver.js";
import { buildPageSynthesisContract } from "./pageSynthesisContract.js";
import { buildEvidenceBoundaryItems } from "./evidenceBoundaryRenderer.js";
import { renderLocalFallbackExpertAnswer } from "./localFallbackExpertRenderer.js";

const CONTRACT_VERSION = "ask-contract-v1-clean-r1";

const DEFAULT_FILTERS = Object.freeze({
  region: "全球",
  time: "2026",
  role: "高管",
  customer: "全部",
  application: "全部",
  track: "全部",
});

const normalizeFilters = (filters = {}) => ({ ...DEFAULT_FILTERS, ...filters });

const priorityFor = (objectId, mode) => {
  if (mode === "portfolio") return { investmentLevel: "L1", priority: "组合分配" };
  if (objectId === "liquid_cooling") return { investmentLevel: "L3", priority: "选择性投入 / 客户 POC" };
  if (objectId === "sst") return { investmentLevel: "L1", priority: "观察 / 预研边界" };
  if (objectId === "modular_ups") return { investmentLevel: "L3", priority: "选择性投入 / 客户 POC" };
  return { investmentLevel: "L2", priority: "预研 / 小规模验证" };
};

const listFromText = (text, heading) => {
  const marker = `${heading}\n`;
  const start = text.indexOf(marker);
  if (start < 0) return [];
  const rest = text.slice(start + marker.length);
  const end = rest.search(/\n\n[A-Z0-9a-z\u3400-\u9fff /]+/);
  const section = end >= 0 ? rest.slice(0, end) : rest;
  return section.split("\n").filter((line) => /^[-\d]/.test(line.trim())).map((line) => line.replace(/^[-\d.、\s]+/, "").trim()).filter(Boolean);
};

export function runCleanR1AskRuntime(question, filters = {}) {
  const normalizedFilters = normalizeFilters(filters);
  const state = buildAskAnalysisState(question);
  const routeDecision = routeAskQuestion(state);
  const insightContext = buildInsightContext(normalizedFilters);
  const resolution = resolvePlanningObject({ question, filters: normalizedFilters, analysisState: state });
  const synthesis = buildPageSynthesisContract(resolution);
  const fullText = renderLocalFallbackExpertAnswer({
    question,
    filters: normalizedFilters,
    state,
    routeDecision,
    resolution,
    synthesis,
  });
  const { investmentLevel, priority } = priorityFor(resolution.resolvedObjectId, resolution.mode);
  const evidenceBoundary = buildEvidenceBoundaryItems(synthesis);
  const resolvedLabel = describeResolvedObject(resolution);
  const oneLineConclusion = resolution.mode === "portfolio"
    ? "全部：进入 Portfolio View，按成熟度、证据强度、风险收益和退出条件做组合分配，不输出单一赢家。"
    : `${resolvedLabel}：以 Product Planning Card 为单一来源，按五看三定、证据边界和验证门槛输出规划结论。`;

  const outputContract = {
    provider: "local",
    contractVersion: CONTRACT_VERSION,
    providerStatus: "success",
    fallbackUsed: false,
    question,
    filters: normalizedFilters,
    resolvedPlanningObject: resolvedLabel,
    planningObjectResolution: resolution,
    productPlanningCard: synthesis.card,
    pageSynthesisContract: synthesis,
    pageLinkageStatement: synthesis.pageLinkageStatement,
    missingInputs: synthesis.missingInputs,
    finalRecommendation: oneLineConclusion,
    investmentLevel,
    priority,
    confidence: "中",
    evidenceBoundary,
    oneLineConclusion,
    whyNow: listFromText(fullText, "五看").slice(0, 2),
    whatToBuild: synthesis.productInput?.components?.text || synthesis.productInput?.family?.text || "source_required",
    howToEnter: synthesis.overviewInput?.roadmap2026?.text || "先补齐 evidence gates。",
    technicalGate: synthesis.technologyInput?.validationGates?.text || "source_required",
    keyRisks: listFromText(fullText, "证据边界").slice(0, 4),
    nextActions: [
      "确认 planning object 与筛选冲突",
      "补齐 source_required / no_quantified_data 项",
      "按 2026 / 2027 / 2028 验证节奏推进或退出",
    ],
    exitConditions: "若 evidence gates、客户场景、验证门槛、PDC 边界或 missingInputs 无法补齐，则降级、watch 或 exit。",
    fullText,
    fullReportMarkdown: null,
    warnings: resolution.conflictNotice ? [resolution.conflictNotice] : [],
  };

  return {
    state,
    routeDecision,
    rankedContext: {
      filters: normalizedFilters,
      insightContext,
      productPlanningCard: synthesis.card,
      pageSynthesisContract: synthesis,
      resolution,
    },
    answer: fullText,
    outputContract,
  };
}
