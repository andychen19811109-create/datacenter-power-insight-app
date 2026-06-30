const ROLE_EMPHASIS = Object.freeze({
  高管: "资源投入、战略取舍和 12-24 个月决策窗口",
  投资者: "风险收益、退出风险、证据强度和可比赛道",
  市场: "区域进入、客户痛点、竞品话术和 GTM 证据",
  产品: "路线图、MVP、版本节奏和差异化边界",
  研发: "技术门槛、验证计划、认证可靠性和退出条件",
});

const MODULE_PURPOSE = Object.freeze({
  overview: "把筛选条件转成统一执行摘要和边界提示",
  market: "把区域、客户和证据边界约束到市场解读",
  product: "把产品机会限制在可支持的一级赛道或相邻参考",
  technology: "把架构、器件和成熟度约束为技术上下文",
  companyIntelligence: "把公司与情报信号按区域、角色和赛道相关性排序",
  askHeader: "把本地 contract 摘要传给 Ask 顶部上下文",
});

const regionBoundaryFor = (contract) => {
  const regional = contract.regionalContext || {};
  if (contract.selectedContext.region === "全球") {
    return "全球口径可直接使用；区域化结论仍需逐项看来源边界。";
  }
  return regional.supported
    ? `${contract.selectedContext.region}仅有 curated regional summary，不能外推为完整区域市场规模。`
    : `${contract.selectedContext.region}缺少可核验区域数据，只能作为 unsupported scope 或相邻参考。`;
};

const timeContextFor = (contract) => {
  const time = contract.timeHorizonContext || {};
  return time.supported
    ? `${contract.selectedContext.timeHorizon} 为 V1.5 支持窗口；用于路线图和验证节奏，不代表收入预测。`
    : time.unsupportedReason;
};

const trackContextFor = (contract) => {
  const track = contract.trackContext || {};
  if (track.isPrimaryBusinessTrack || contract.selectedContext.entityType === "all") {
    return {
      mode: "primary_or_all",
      label: contract.selectedContext.normalizedTrack,
      primaryBusinessTrack: track.primaryBusinessTrack || contract.selectedContext.normalizedTrack,
      boundary: track.boundary || "可作为一级业务赛道消费。",
      adjacentReferences: track.adjacentReferences || [],
    };
  }
  return {
    mode: "context_only",
    label: contract.selectedContext.normalizedTrack,
    primaryBusinessTrack: null,
    boundary: track.notApplicableReason || track.boundary,
    adjacentReferences: track.adjacentReferences || [],
  };
};

const baseModuleContext = (contract, moduleId) => ({
  moduleId,
  modulePurpose: MODULE_PURPOSE[moduleId],
  contractVersion: contract.contractVersion,
  contextKey: [
    contract.selectedContext.role,
    contract.selectedContext.region,
    contract.selectedContext.normalizedTrack,
    contract.selectedContext.entityType,
    contract.selectedContext.timeHorizon,
  ].join("|"),
  selectedContext: contract.selectedContext,
  roleEmphasis: ROLE_EMPHASIS[contract.selectedContext.role] || ROLE_EMPHASIS.高管,
  regionalBoundary: regionBoundaryFor(contract),
  trackContext: trackContextFor(contract),
  timeHorizonContext: timeContextFor(contract),
  unsupportedScopes: contract.unsupportedScopes || [],
  evidenceBoundary: contract.evidenceBoundary,
});

export function buildOverviewModuleContext(contract) {
  return {
    ...baseModuleContext(contract, "overview"),
    summaryLine: `${contract.selectedContext.role} / ${contract.selectedContext.region} / ${contract.selectedContext.normalizedTrack} / ${contract.selectedContext.timeHorizon}`,
    emphasis: `总览优先呈现${ROLE_EMPHASIS[contract.selectedContext.role] || ROLE_EMPHASIS.高管}。`,
  };
}

export function buildMarketModuleContext(contract) {
  return {
    ...baseModuleContext(contract, "market"),
    emphasis: "市场模块只展示可支持区域和客户痛点，不把相对评分解释为市场规模。",
    marketEvidenceCount: contract.marketEvidence?.length || 0,
  };
}

export function buildProductModuleContext(contract) {
  const base = baseModuleContext(contract, "product");
  return {
    ...base,
    emphasis: base.trackContext.mode === "primary_or_all"
      ? "产品模块可展示一级赛道机会，但仍需保留评分边界。"
      : "产品模块仅展示相邻参考和边界说明，不把当前对象当成一级产品赛道。",
    canTreatAsPrimaryTrack: base.trackContext.mode === "primary_or_all",
  };
}

export function buildTechnologyModuleContext(contract) {
  return {
    ...baseModuleContext(contract, "technology"),
    emphasis: "技术模块可消费架构路线、器件技术和成熟度信息，但不得转成市场规模或一级赛道。",
    architectureRoadmap: (contract.technologyGates || []).slice(0, 5).map((item) => ({
      label: item.track,
      gate: item.technicalGate,
      nextActions: item.nextActions,
    })),
  };
}

export function buildCompanyIntelligenceModuleContext(contract) {
  return {
    ...baseModuleContext(contract, "companyIntelligence"),
    emphasis: "公司与情报模块按相关性展示，缺少直接命中时必须标记为相关参考。",
    signalBoundary: "静态 curated intelligence，不代表实时情报或外部数据库。",
  };
}

export function buildAskHeaderContext(contract) {
  return {
    ...baseModuleContext(contract, "askHeader"),
    contextLine: contract.askContextPack?.selectedContextSummary,
    mustNotOverride: contract.askContextPack?.mustNotOverride,
    allowedQuestionTypes: contract.askContextPack?.allowedQuestionTypes || [],
  };
}

export function buildModuleContextSet(contract) {
  return {
    overview: buildOverviewModuleContext(contract),
    market: buildMarketModuleContext(contract),
    product: buildProductModuleContext(contract),
    technology: buildTechnologyModuleContext(contract),
    companyIntelligence: buildCompanyIntelligenceModuleContext(contract),
    askHeader: buildAskHeaderContext(contract),
  };
}

export function validateModuleContextConsistency(contexts = {}) {
  const errors = [];
  const required = ["overview", "market", "product", "technology", "companyIntelligence", "askHeader"];
  required.forEach((key) => {
    if (!contexts[key]) errors.push(`missing:${key}`);
    if (!contexts[key]?.selectedContext) errors.push(`missing-selectedContext:${key}`);
    if (!Array.isArray(contexts[key]?.unsupportedScopes)) errors.push(`missing-unsupportedScopes:${key}`);
  });
  const keys = required.map((key) => contexts[key]?.contextKey).filter(Boolean);
  if (new Set(keys).size > 1) errors.push("context-key-mismatch");
  const product = contexts.product;
  if (product?.selectedContext?.entityType && !["all", "primary_business_track"].includes(product.selectedContext.entityType)) {
    if (product.canTreatAsPrimaryTrack) errors.push("non-primary-treated-as-primary");
    if (!product.unsupportedScopes.some((item) => item.dimension === "track")) errors.push("missing-non-primary-unsupported-scope");
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
