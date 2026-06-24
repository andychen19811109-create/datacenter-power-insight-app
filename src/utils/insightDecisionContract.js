import { SOURCE_REGISTRY } from "../data/marketData.js";
import {
  BUSINESS_TRACKS,
  TIME_HORIZONS,
  classifyEntity,
  getAdjacentReferences,
  isPrimaryBusinessTrack,
} from "../data/ontology.js";
import { buildInsightContext } from "./insightContext.js";

export const INSIGHT_DECISION_CONTRACT_POLICY = Object.freeze({
  sourceOfTruth: "Local Insight Decision Contract = source of truth",
  difyRole: "Dify = explanation / report generation layer",
  normalizerRole: "Normalizer = compliance gate",
  uiRole: "UI modules = contract renderer",
  mustNotOverride: "Dify must not override local contract investment level, taxonomy classification, unsupported scope, or evidence boundary.",
});

const CONTRACT_VERSION = "insightDecisionContract-v1";
const DEFAULT_FILTERS = Object.freeze({
  role: "高管",
  region: "全球",
  customer: "全部",
  application: "全部",
  track: "全部",
  time: "2026",
});

const SOURCE_TYPE_ORDER = ["公开报告", "行业组织", "公司公开资料", "公开市场报告", "专家整理"];

const normalizeFilters = (filters = {}) => ({
  ...DEFAULT_FILTERS,
  ...filters,
  time: filters.timeHorizon || filters.time || DEFAULT_FILTERS.time,
});

const sourceFor = (sourceRef) => SOURCE_REGISTRY[sourceRef] || SOURCE_REGISTRY.expert;

const uniqueValues = (items = []) => [...new Set(items.filter(Boolean))];

const toSourceBoundaryItem = (source) => ({
  sourceId: source.id,
  sourceName: source.name,
  sourceType: source.sourceType,
  reliability: source.reliability,
  usedFor: source.usedFor,
  caveat: source.caveat,
  isOfficial: Boolean(source.isOfficial),
});

const buildMatchState = (filters, trackClassification) => {
  if (trackClassification.entityType === "all") return "strong_match";
  if (trackClassification.isPrimaryBusinessTrack) return "strong_match";
  if (trackClassification.entityType === "application_segment") return "adjacent_reference";
  if (trackClassification.isTechnologyTag || trackClassification.entityType === "component_technology") return "not_applicable";
  if (trackClassification.isArchitectureRoute) return "adjacent_reference";
  if (trackClassification.entityType === "unknown") return "unsupported_scope";
  if (!TIME_HORIZONS.some((item) => item.label === String(filters.time))) return "unsupported_scope";
  return "insufficient_evidence";
};

export function buildSelectedContext(filters = {}) {
  const normalized = normalizeFilters(filters);
  const trackClassification = classifyEntity(normalized.track);
  return {
    role: normalized.role,
    region: normalized.region,
    customer: normalized.customer,
    application: normalized.application,
    track: normalized.track,
    timeHorizon: normalized.time,
    normalizedTrack: trackClassification.label,
    entityId: trackClassification.id,
    entityType: trackClassification.entityType,
    legacyAlias: trackClassification.legacyAlias,
    migrationNote: trackClassification.migrationNote,
    parentBusinessTrack: trackClassification.parentBusinessTrack,
    matchState: buildMatchState(normalized, trackClassification),
  };
}

const buildTrackContext = (selectedContext) => {
  const classification = classifyEntity(selectedContext.track);
  const adjacent = getAdjacentReferences(classification.id);
  const notApplicableReason = classification.isPrimaryBusinessTrack || classification.entityType === "all"
    ? null
    : classification.entityType === "application_segment"
      ? `${classification.label} 是 ${classification.parentBusinessTrack?.label || "一级业务赛道"} 下的应用细分，不作为一级业务赛道。`
      : classification.isTechnologyTag || classification.entityType === "component_technology"
        ? `${classification.label} 是技术标签或器件技术，不作为一级业务赛道。`
        : classification.isArchitectureRoute
          ? `${classification.label} 是架构路线或电压等级路线，应作为相邻参考或技术上下文使用。`
          : "当前对象缺少可支持的一级业务赛道定义。";

  return {
    currentTrack: selectedContext.track,
    normalizedTrack: classification.label,
    primaryBusinessTrack: classification.isPrimaryBusinessTrack ? classification.label : null,
    primaryBusinessTrackId: classification.isPrimaryBusinessTrack ? classification.id : null,
    parentBusinessTrack: classification.parentBusinessTrack,
    isPrimaryBusinessTrack: classification.isPrimaryBusinessTrack,
    isTechnologyTag: classification.isTechnologyTag,
    isArchitectureRoute: classification.isArchitectureRoute,
    entityType: classification.entityType,
    legacyAlias: classification.legacyAlias,
    migrationNote: classification.migrationNote,
    adjacentReferences: adjacent.map((item) => ({ id: item.id, label: item.label, layer: item.layer || "reference" })),
    notApplicableReason,
    boundary: classification.entry?.boundary || notApplicableReason,
  };
};

const buildTimeHorizonContext = (selectedContext) => {
  const supported = TIME_HORIZONS.some((item) => item.label === String(selectedContext.timeHorizon));
  return {
    timeHorizon: selectedContext.timeHorizon,
    supported,
    supportedHorizons: TIME_HORIZONS.map((item) => item.label),
    unsupportedReason: supported ? null : `${selectedContext.timeHorizon} 不在 V1.5 Phase 1 支持的时间窗口内。`,
  };
};

const buildRegionalContext = (selectedContext, insightContext) => ({
  region: selectedContext.region,
  supported: Boolean(insightContext.marketContext?.regionInsight),
  evidenceScope: selectedContext.region === "全球" ? "global" : "regional_curated_summary",
  unsupportedReason: insightContext.marketContext?.regionInsight ? null : "当前区域缺少可核验区域洞察。",
  regionInsight: insightContext.marketContext?.regionInsight || null,
});

const buildRolePerspective = (selectedContext, insightContext) => ({
  role: selectedContext.role,
  summary: insightContext.executiveBrief,
  decisionTask: {
    高管: "判断未来 12-24 个月资源投入方向。",
    投资者: "比较赛道风险收益、市场窗口、壁垒和退出风险。",
    市场: "判断区域 GTM、客户痛点、竞品话术和进入路径。",
    产品: "判断产品路线图、MVP、差异化和版本节奏。",
    研发: "判断技术边界、验证门槛、认证和工程风险。",
  }[selectedContext.role] || "围绕当前筛选条件形成专业决策判断。",
});

const buildChartContext = (selectedContext) => {
  const globalOnly = true;
  const supportsRegion = selectedContext.region === "全球";
  const supportsTrack = selectedContext.track === "全部";
  const unsupportedReasons = [
    supportsRegion ? null : "当前 IEA 数据中心用电需求图表为全球口径，不支持区域筛选后的区域化解读。",
    supportsTrack ? null : "当前宏观用电图表不支持按单一赛道拆分，赛道筛选后只能作为背景参考。",
  ].filter(Boolean);

  return {
    chartId: "global-data-center-power-demand",
    title: "全球数据中心用电需求",
    supportsCurrentRegion: supportsRegion,
    supportsCurrentTrack: supportsTrack,
    unsupportedReason: unsupportedReasons.join("；") || null,
    globalOnly,
    expertInterpolation: true,
    scope: "global_macro_power_demand",
  };
};

export function buildUnsupportedScopes(selectedContext, dataAvailability = {}) {
  const scopes = [];
  const trackContext = dataAvailability.trackContext || buildTrackContext(selectedContext);
  const chartContext = dataAvailability.chartContext || buildChartContext(selectedContext);
  const timeContext = dataAvailability.timeHorizonContext || buildTimeHorizonContext(selectedContext);

  if (trackContext.notApplicableReason) {
    scopes.push({
      scopeId: "track_not_primary_business",
      dimension: "track",
      value: selectedContext.track,
      reason: trackContext.notApplicableReason,
      matchState: selectedContext.matchState,
    });
  }

  if (chartContext.unsupportedReason) {
    scopes.push({
      scopeId: "chart_scope_limit",
      dimension: "chart",
      value: chartContext.chartId,
      reason: chartContext.unsupportedReason,
      matchState: "unsupported_scope",
    });
  }

  if (!timeContext.supported) {
    scopes.push({
      scopeId: "time_horizon_unsupported",
      dimension: "time",
      value: selectedContext.timeHorizon,
      reason: timeContext.unsupportedReason,
      matchState: "unsupported_scope",
    });
  }

  return scopes;
}

const claimFromOpportunity = (item, index) => {
  const source = sourceFor(item.sourceRef);
  return {
    claimId: `product-opportunity-${index + 1}`,
    claimText: `${item.track} 当前相对优先级为 ${item.level}，评分 ${item.score}/100。`,
    sourceType: source.sourceType,
    sourceName: source.name,
    confidence: item.evidenceLevel || item.confidence || "中",
    scope: item.match?.trackMatch ? "current_track" : "adjacent_or_contextual_reference",
    unsupportedReason: item.match?.trackMatch ? null : "该结论不是当前筛选赛道的强匹配结论。",
    isExpertAssumption: source.id === "expert" || !source.isOfficial,
  };
};

const claimFromKpi = (item, index) => ({
  claimId: `segment-kpi-${index + 1}`,
  claimText: item.interpretation,
  sourceType: item.evidenceLevel || "专家整理",
  sourceName: item.label,
  confidence: item.confidence || "中",
  scope: "segment_kpi_context",
  unsupportedReason: item.caveat || null,
  isExpertAssumption: /专家/.test(item.evidenceLevel || ""),
});

export function buildEvidenceBoundary(context = {}) {
  const insightContext = context.insightContext || context;
  const opportunities = insightContext.productContext?.topOpportunities || [];
  const kpis = insightContext.evidenceContext?.segmentKpis || [];
  const claimToEvidenceMap = [
    ...opportunities.slice(0, 4).map(claimFromOpportunity),
    ...kpis.slice(0, 3).map(claimFromKpi),
  ];
  const sourceTypes = uniqueValues(claimToEvidenceMap.map((item) => item.sourceType));
  const expertAssumptions = claimToEvidenceMap.filter((item) => item.isExpertAssumption).map((item) => item.claimId);
  const unsupportedClaims = claimToEvidenceMap.filter((item) => item.unsupportedReason).map((item) => ({
    claimId: item.claimId,
    reason: item.unsupportedReason,
  }));

  return {
    evidenceLevel: expertAssumptions.length ? "mixed_public_and_expert_curated" : "public_or_company_sources",
    confidence: unsupportedClaims.length ? "中" : "中高",
    sourceTypes,
    unsupportedClaims,
    expertAssumptions,
    claimToEvidenceMap,
  };
}

const buildMarketEvidence = (insightContext) => [
  ...(insightContext.evidenceContext?.segmentKpis || []).map((item) => ({
    evidenceId: item.id,
    label: item.label,
    interpretation: item.interpretation,
    confidence: item.confidence,
    caveat: item.caveat,
    sourceType: item.evidenceLevel,
  })),
  ...(insightContext.dataLimitations || []).map((item, index) => ({
    evidenceId: `data-limitation-${index + 1}`,
    label: "数据边界",
    interpretation: item,
    confidence: "中",
    caveat: item,
    sourceType: "prototype_boundary",
  })),
];

const buildProductOpportunities = (insightContext) =>
  (insightContext.productContext?.topOpportunities || []).map((item) => ({
    track: item.track,
    level: item.level,
    priority: item.priority,
    score: item.score,
    match: item.match,
    matchState: item.match?.trackMatch ? "strong_match" : "adjacent_reference",
    evidenceLevel: item.evidenceLevel,
    scoreBoundary: item.scoreBoundary || insightContext.productContext?.scoringBoundary,
  }));

const buildTechnologyGates = (insightContext) =>
  (insightContext.productContext?.topOpportunities || []).map((item) => ({
    track: item.track,
    technicalGate: item.technicalGate,
    nextActions: item.nextActions || [],
    exitConditions: item.exitConditions,
  }));

const buildCompanySignals = (insightContext) =>
  (insightContext.companyContext?.companies || []).slice(0, 5).map((company) => ({
    companyId: company.id,
    name: company.name,
    nameZh: company.nameZh,
    region: company.region,
    track: company.track,
    opportunity: company.opportunity,
    limitation: company.limitation,
    confidence: company.confidence,
    sourceRef: company.sourceRef,
  }));

const buildRiskRegister = (insightContext) =>
  (insightContext.riskRadar || []).map((item, index) => ({
    riskId: `risk-${index + 1}`,
    track: item.track,
    category: item.category,
    risk: item.risk,
    severity: item.severity,
  }));

const buildSourceBoundary = () => {
  const sources = Object.values(SOURCE_REGISTRY).map(toSourceBoundaryItem)
    .sort((left, right) => SOURCE_TYPE_ORDER.indexOf(left.sourceType) - SOURCE_TYPE_ORDER.indexOf(right.sourceType));
  return {
    sourceOfTruth: INSIGHT_DECISION_CONTRACT_POLICY.sourceOfTruth,
    sourceTypes: uniqueValues(sources.map((item) => item.sourceType)),
    officialSources: sources.filter((item) => item.isOfficial).map((item) => item.sourceName),
    expertSources: sources.filter((item) => !item.isOfficial).map((item) => item.sourceName),
    caveat: "V1.5 Phase 1 contract preserves source boundaries; it does not add external live data.",
    sources,
  };
};

export function buildAskContextPack(contract) {
  return {
    selectedContextSummary: [
      contract.selectedContext.role,
      contract.selectedContext.region,
      contract.selectedContext.normalizedTrack,
      `${contract.selectedContext.timeHorizon}窗口`,
      contract.selectedContext.matchState,
    ].filter(Boolean).join(" / "),
    allowedQuestionTypes: [
      "投资立项题",
      "投资比较题",
      "技术关系解释题",
      "产品路线图题",
      "市场进入 / GTM 题",
      "竞品比较题",
      "未知 / 虚构产品澄清题",
    ],
    moduleEvidenceSummary: contract.marketEvidence.slice(0, 4).map((item) => item.interpretation),
    productOpportunitySummary: contract.productOpportunities.slice(0, 4).map((item) => `${item.track}: ${item.level} (${item.matchState})`),
    technologyGateSummary: contract.technologyGates.slice(0, 4).map((item) => `${item.track}: ${item.technicalGate}`),
    riskSummary: contract.riskRegister.slice(0, 4).map((item) => `${item.track}: ${item.risk}`),
    unsupportedScopes: contract.unsupportedScopes,
    sourceBoundary: {
      sourceOfTruth: contract.sourceBoundary.sourceOfTruth,
      caveat: contract.sourceBoundary.caveat,
      sourceTypes: contract.sourceBoundary.sourceTypes,
    },
    mustNotOverride: INSIGHT_DECISION_CONTRACT_POLICY.mustNotOverride,
  };
}

export function validateInsightDecisionContract(contract) {
  const requiredFields = [
    "contractVersion",
    "selectedContext",
    "rolePerspective",
    "regionalContext",
    "trackContext",
    "timeHorizonContext",
    "marketEvidence",
    "productOpportunities",
    "technologyGates",
    "companySignals",
    "riskRegister",
    "recommendedQuestions",
    "chartContext",
    "evidenceBoundary",
    "sourceBoundary",
    "unsupportedScopes",
    "adjacentReferences",
    "askContextPack",
    "validation",
  ];
  const errors = [];
  requiredFields.forEach((field) => {
    if (!(field in (contract || {}))) errors.push(`missing:${field}`);
  });
  if (contract?.contractVersion !== CONTRACT_VERSION) errors.push("invalid:contractVersion");
  ["role", "region", "track", "timeHorizon", "normalizedTrack", "entityType", "matchState"].forEach((field) => {
    if (!(field in (contract?.selectedContext || {}))) errors.push(`missing:selectedContext.${field}`);
  });
  if (!contract?.sourceBoundary?.sourceOfTruth?.includes("Local Insight Decision Contract")) errors.push("invalid:sourceBoundary.sourceOfTruth");
  if (!contract?.askContextPack?.mustNotOverride) errors.push("missing:askContextPack.mustNotOverride");
  if (!Array.isArray(contract?.evidenceBoundary?.claimToEvidenceMap)) errors.push("missing:evidenceBoundary.claimToEvidenceMap");
  return {
    valid: errors.length === 0,
    errors,
    checkedAt: "phase1-static-validation",
  };
}

export function buildInsightDecisionContract(filters = {}, options = {}) {
  const normalizedFilters = normalizeFilters(filters);
  const insightContext = options.insightContext || buildInsightContext(normalizedFilters);
  const selectedContext = buildSelectedContext(normalizedFilters);
  const trackContext = buildTrackContext(selectedContext);
  const regionalContext = buildRegionalContext(selectedContext, insightContext);
  const timeHorizonContext = buildTimeHorizonContext(selectedContext);
  const chartContext = buildChartContext(selectedContext);
  const unsupportedScopes = buildUnsupportedScopes(selectedContext, { trackContext, chartContext, timeHorizonContext });
  const evidenceBoundary = buildEvidenceBoundary({ insightContext });
  const sourceBoundary = buildSourceBoundary();

  const contract = {
    contractVersion: CONTRACT_VERSION,
    selectedContext,
    rolePerspective: buildRolePerspective(selectedContext, insightContext),
    regionalContext,
    trackContext,
    timeHorizonContext,
    marketEvidence: buildMarketEvidence(insightContext),
    productOpportunities: buildProductOpportunities(insightContext),
    technologyGates: buildTechnologyGates(insightContext),
    companySignals: buildCompanySignals(insightContext),
    riskRegister: buildRiskRegister(insightContext),
    recommendedQuestions: insightContext.recommendedAskQuestions || [],
    chartContext,
    evidenceBoundary,
    sourceBoundary,
    unsupportedScopes,
    adjacentReferences: trackContext.adjacentReferences,
    askContextPack: {},
    validation: {},
  };

  contract.askContextPack = buildAskContextPack(contract);
  contract.validation = validateInsightDecisionContract(contract);
  return contract;
}

export const INSIGHT_DECISION_CONTRACT_VERSION = CONTRACT_VERSION;
export const PHASE1_SUPPORTED_BUSINESS_TRACKS = Object.freeze(BUSINESS_TRACKS.map((item) => item.label));
export const PHASE1_SUPPORTED_TIME_HORIZONS = Object.freeze(TIME_HORIZONS.map((item) => item.label));
export { isPrimaryBusinessTrack };
