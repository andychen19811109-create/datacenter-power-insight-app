const ROUTE_RECOMMENDATIONS = {
  unknown_entity_clarification: "暂不投入，先澄清对象定义和系统边界",
  route_violation_guard: "暂不形成跨类别投资判断",
  scope_guard: "当前问题不进入产品投资决策",
  entity_comparison: "先按系统层级与验证门槛比较，再决定资源分配",
  entity_relationship: "先明确接口和责任边界，再设计组合方案",
  entity_substitution: "不建议直接替代，先完成组合架构验证",
  architecture_impact: "以样机和接口验证驱动路线图调整",
  entity_roadmap_impact: "以样机和接口验证驱动路线图调整",
  product_roadmap: "按客户确认、样机验证、平台化和规模交付分阶段推进",
  company_comparison: "按目标客户、产品覆盖、区域交付和工程能力比较",
};

const LEVEL_PRIORITY = {
  L0: "不投入",
  L1: "观察",
  L2: "预研 / 小规模验证",
  L3: "选择性投入 / 客户 POC",
  L4: "战略投入",
};

const CONTRACT_METADATA = Object.freeze({
  provider: "local",
  contractVersion: "ask-contract-v1",
});

const SAFE_L0_ROUTES = new Set(["unknown_entity_clarification", "route_violation_guard", "scope_guard"]);
const ROUTE_AWARE_ROUTES = new Set([
  "entity_comparison",
  "entity_relationship",
  "entity_substitution",
  "architecture_impact",
  "entity_roadmap_impact",
]);

const entityLabel = (state) => state.primaryEntity?.displayName || "待确认对象";

const normalizeLabel = (value = "") => String(value || "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[\s/_-]+/g, "")
  .replace(/[^\p{L}\p{N}]+/gu, "");

const uniqueValues = (items = []) => [...new Set(items.filter(Boolean))];

const collectEntityLabels = (entity) => uniqueValues([
  entity?.displayName,
  ...(entity?.aliases || []),
  ...(entity?.matchedAliases || []),
]).map(normalizeLabel).filter(Boolean);

const collectStateLabels = (state) => uniqueValues(
  (state.entities?.length ? state.entities : [state.primaryEntity]).flatMap((entity) => collectEntityLabels(entity))
);

const isTrackMatch = (labels, track) => {
  const normalizedTrack = normalizeLabel(track);
  return labels.some((label) =>
    label === normalizedTrack
    || label.includes(normalizedTrack)
    || normalizedTrack.includes(label)
  );
};

const dedupeOpportunities = (items = []) => {
  const seenTracks = new Set();
  return items.filter((item) => {
    if (!item?.track || seenTracks.has(item.track)) return false;
    seenTracks.add(item.track);
    return true;
  });
};

const matchOpportunities = (labels, opportunities) =>
  dedupeOpportunities((opportunities || []).filter((item) => isTrackMatch(labels, item.track)));

const selectOpportunity = (state, rankedContext) => {
  if (!state.primaryEntity || state.primaryEntity.category === "unknown") {
    return { opportunity: null, matchedOpportunities: [] };
  }

  const labels = collectStateLabels(state);
  const productContext = rankedContext.insightContext?.productContext || {};
  const filteredMatches = matchOpportunities(labels, productContext.opportunities || rankedContext.products || []);
  if (filteredMatches.length) {
    return {
      opportunity: filteredMatches.length === 1 ? filteredMatches[0] : null,
      matchedOpportunities: filteredMatches,
    };
  }

  const allMatches = matchOpportunities(labels, productContext.allOpportunities || productContext.opportunities || rankedContext.products || []);
  return {
    opportunity: allMatches.length === 1 ? allMatches[0] : null,
    matchedOpportunities: allMatches,
  };
};

const deriveInvestmentLevel = (decision, opportunity) => {
  if (SAFE_L0_ROUTES.has(decision.route)) return "L0";
  if (opportunity?.level) return opportunity.level;
  if (["entity_investment", "product_roadmap"].includes(decision.route)) return "L2";
  return "L1";
};

const buildWhyNow = (rankedContext, opportunity) => {
  const pain = rankedContext.painPoints?.[0];
  const signal = rankedContext.signals?.[0];
  return [
    pain ? `${pain.customer}当前痛点：${pain.currentPain}` : null,
    signal ? `情报信号：${signal.title}` : null,
    opportunity ? `相对机会评分 ${opportunity.score}/100（非市场规模）` : null,
  ].filter(Boolean);
};

const buildProductPlanningEvidenceNotes = (rankedContext) => {
  const contract = rankedContext.insightContext?.productPlanningCardContract;
  if (!contract?.supported) {
    return contract?.unsupportedReason ? [`Product Planning Card：${contract.unsupportedReason}`] : [];
  }
  const card = contract.card;
  return [
    `Product Planning Card：${card.trackLabel} / ${card.mode} is the local planning source of truth.`,
    card.evidence?.noQuantifiedData?.caveat,
    contract.askBoundary?.portfolioRule,
    contract.askBoundary?.mustNotOverride?.length
      ? `Ask must not override: ${contract.askBoundary.mustNotOverride.join(", ")}.`
      : null,
  ].filter(Boolean);
};

const buildEvidenceBoundary = (rankedContext, extraNotes = []) => uniqueValues([
  ...(rankedContext.insightContext?.dataLimitations || ["当前结论来自本地 curated prototype data 和专家规则，不代表市场规模或财务回报。"]),
  ...buildProductPlanningEvidenceNotes(rankedContext),
  ...extraNotes,
]);

const buildPriority = (investmentLevel) => (investmentLevel === "L2" ? "中" : "低");

const isContextMismatchedL0 = (opportunity) =>
  opportunity?.level === "L0"
  && !(opportunity.match?.trackMatch && opportunity.match?.customerMatch && opportunity.match?.applicationMatch);

const baseContract = (payload) => ({
  ...CONTRACT_METADATA,
  ...payload,
});

const buildSafeSummary = ({ state, decision, rankedContext, fullText }) => {
  if (!state.primaryEntity || state.primaryEntity.category === "unknown" || decision.route === "unknown_entity_clarification") {
    const finalRecommendation = "需要澄清产品对象与上下文映射，暂不建议投入";
    return baseContract({
      finalRecommendation,
      investmentLevel: "L0",
      priority: "低",
      confidence: "低",
      evidenceBoundary: buildEvidenceBoundary(rankedContext, ["未识别到可可靠关联的产品机会，需补充对象定义、客户场景和技术边界。"]),
      oneLineConclusion: `${entityLabel(state)}：${finalRecommendation}。`,
      whyNow: ["对象或产品映射尚不明确，继续套用现有产品数据会造成误判。"],
      whatToBuild: "先明确产品对象、所属环节、目标客户和应用场景。",
      howToEnter: "完成实体澄清与产品边界确认后，再进入客户访谈和验证规划。",
      technicalGate: "请先明确产品对象、客户场景和技术边界。",
      keyRisks: ["对象定义不清导致误判。"],
      nextActions: ["澄清实体", "确认应用场景", "确认客户类型"],
      exitConditions: "无法明确产品边界前不进入立项。",
      fullText,
    });
  }

  const finalRecommendation = ROUTE_RECOMMENDATIONS[decision.route] || "当前问题不进入产品投资决策";
  return baseContract({
    finalRecommendation,
    investmentLevel: "L0",
    priority: "低",
    confidence: "低",
    evidenceBoundary: buildEvidenceBoundary(rankedContext, ["当前问题已触发保护性路由，应先缩小范围或回到单一产品/架构对象。"]),
    oneLineConclusion: `${entityLabel(state)}：${finalRecommendation}。`,
    whyNow: ["当前问题触发保护性路由，继续沿用产品机会映射会放大误判风险。"],
    whatToBuild: "先把问题限定到单一产品对象、系统层级或可验证场景。",
    howToEnter: "完成范围澄清后，再进入客户访谈、架构比较和验证规划。",
    technicalGate: "请先明确分析范围、对象边界和验证目标。",
    keyRisks: ["问题范围越界会导致错误投资判断。"],
    nextActions: ["收敛问题范围", "限定对象边界", "重新生成分析"],
    exitConditions: "若问题范围仍不清晰，不进入投资结论。",
    fullText,
  });
};

const buildKnownEntityGenericSummary = ({ state, decision, rankedContext, fullText }) => {
  const investmentLevel = deriveInvestmentLevel(decision, null);
  const finalRecommendation = "已识别实体，但当前结构化数据缺少直接产品机会映射；请以完整分析中的边界、关系和验证门槛为主。";
  return baseContract({
    finalRecommendation,
    investmentLevel,
    priority: buildPriority(investmentLevel),
    confidence: state.confidence >= 0.9 ? "中" : "低",
    evidenceBoundary: buildEvidenceBoundary(rankedContext, ["当前摘要缺少直接产品机会映射，完整分析提供主要判断。"]),
    oneLineConclusion: `${entityLabel(state)}：${finalRecommendation}`,
    whyNow: ["问题实体已识别，但当前筛选上下文与产品机会映射不完全一致。"],
    whatToBuild: "先明确该实体在供电/制冷/预制化/系统架构中的角色。",
    howToEnter: "按完整分析确认客户场景、接口边界和验证计划。",
    technicalGate: "确认系统边界、接口、标准、验证门槛和责任边界。",
    keyRisks: ["结构化数据缺少直接映射，不能替代完整分析。"],
    nextActions: ["确认实体边界", "确认目标客户", "按完整分析生成验证计划"],
    exitConditions: "若无法明确客户场景、技术边界和验证路径，不进入规模化投入。",
    fullText,
  });
};

const ROUTE_AWARE_SUMMARIES = Object.freeze({
  entity_comparison: {
    finalRecommendation: "当前问题属于比较型判断，应先比较系统层级、接口边界和验证门槛，再决定资源分配。",
    whyNow: ["比较对象已识别，但当前结构化数据不适合强行收敛为单一产品机会。"],
    whatToBuild: "先定义比较对象在供电链路中的角色、输入输出与保护边界。",
    howToEnter: "按完整分析拆分客户场景、架构约束、接口要求和验证顺序。",
    technicalGate: "确认系统层级、输入输出接口、保护策略、控制逻辑、故障隔离和验证门槛。",
    keyRisks: ["将不同层级对象直接并列替代会造成架构误判。", "接口和责任边界不清会放大集成风险。"],
    nextActions: ["拆分比较维度", "确认接口边界", "按完整分析制定验证顺序"],
    exitConditions: "若无法建立统一比较口径，不进入资源倾斜决策。",
  },
  entity_relationship: {
    finalRecommendation: "当前问题属于关系型判断，应先明确对象之间的接口和责任边界，再设计组合方案。",
    whyNow: ["关系对象已识别，但当前结构化数据不应强行映射为单一产品机会。"],
    whatToBuild: "先明确各对象在系统中的分工、协同方式和边界条件。",
    howToEnter: "按完整分析确认耦合关系、系统层级和验证计划。",
    technicalGate: "确认系统层级、接口协议、控制边界、保护配合、故障隔离和验证门槛。",
    keyRisks: ["边界不清会导致系统责任界面失控。", "错误理解关系会放大交付和集成风险。"],
    nextActions: ["确认关系边界", "补齐接口定义", "形成联合验证计划"],
    exitConditions: "若对象关系和责任边界无法明确，不进入组合方案立项。",
  },
  entity_substitution: {
    finalRecommendation: "当前问题属于替代型判断，不建议直接替代；应先完成架构边界、接口和验证条件的对齐。",
    whyNow: ["替代对象已识别，但当前结构化数据不支持把它们当作同类产品直接替换。"],
    whatToBuild: "先定义被替代对象与候选对象的系统职责、接口和保护差异。",
    howToEnter: "按完整分析确认替代前提、兼容约束和验证路径。",
    technicalGate: "确认系统层级、输入输出、保护配合、控制逻辑、故障隔离和验证门槛。",
    keyRisks: ["错误替代会导致系统架构与责任边界失真。", "标准未定或兼容性不足会放大实施风险。"],
    nextActions: ["明确替代前提", "补齐兼容性约束", "形成替代验证计划"],
    exitConditions: "若替代前提和验证路径不成立，不进入替代性投入。",
  },
  architecture_impact: {
    finalRecommendation: "当前问题属于架构影响判断，应先确认对象对系统拓扑、接口和验证方案的影响，再调整路线图。",
    whyNow: ["影响对象已识别，但当前结构化数据更适合作为架构判断而非单一产品机会排序。"],
    whatToBuild: "先定义受影响的系统层级、架构边界和验证场景。",
    howToEnter: "按完整分析确认拓扑变化、接口约束和样机验证顺序。",
    technicalGate: "确认系统层级、拓扑变化、接口约束、保护策略、控制逻辑和验证门槛。",
    keyRisks: ["边界不清会导致错误外推到产品路线图。", "标准未定时过早收敛架构会放大返工风险。"],
    nextActions: ["确认影响范围", "补齐架构边界", "形成样机验证计划"],
    exitConditions: "若无法量化架构影响范围，不进入路线图调整。",
  },
  entity_roadmap_impact: {
    finalRecommendation: "当前问题属于路线图影响判断，应先确认对象对平台、接口和验证节奏的影响，再安排研发投入。",
    whyNow: ["对象已识别，但当前结构化数据不足以把路线图影响简化为单一产品机会。"],
    whatToBuild: "先明确受影响的平台能力、接口边界和验证节奏。",
    howToEnter: "按完整分析拆分近期验证项与中长期路线图项。",
    technicalGate: "确认系统层级、平台接口、保护与控制要求、故障隔离和验证门槛。",
    keyRisks: ["路线图判断失真会导致资源错配。", "责任界面不清会放大研发与交付风险。"],
    nextActions: ["拆分近期和远期项", "确认平台边界", "形成路线图验证计划"],
    exitConditions: "若无法明确平台边界和验证节奏，不进入路线图投入。",
  },
});

const buildRouteAwareGenericSummary = ({ state, decision, rankedContext, fullText }) => {
  const routeSummary = ROUTE_AWARE_SUMMARIES[decision.route] || ROUTE_AWARE_SUMMARIES.entity_relationship;
  const investmentLevel = ["architecture_impact", "entity_roadmap_impact", "entity_substitution"].includes(decision.route) ? "L2" : "L1";
  return baseContract({
    finalRecommendation: routeSummary.finalRecommendation,
    investmentLevel,
    priority: buildPriority(investmentLevel),
    confidence: "中",
    evidenceBoundary: buildEvidenceBoundary(rankedContext, ["当前摘要缺少唯一产品机会映射，完整分析提供主要判断。"]),
    oneLineConclusion: `${entityLabel(state)}：${routeSummary.finalRecommendation}`,
    whyNow: routeSummary.whyNow,
    whatToBuild: routeSummary.whatToBuild,
    howToEnter: routeSummary.howToEnter,
    technicalGate: routeSummary.technicalGate,
    keyRisks: routeSummary.keyRisks,
    nextActions: routeSummary.nextActions,
    exitConditions: routeSummary.exitConditions,
    fullText,
  });
};

export const buildAskOutputContract = ({ state, decision, rankedContext, fullText }) => {
  const { opportunity, matchedOpportunities } = selectOpportunity(state, rankedContext);
  const hasKnownPrimaryEntity = Boolean(state.primaryEntity && state.primaryEntity.category !== "unknown");
  const treatAsMissingOpportunity = !opportunity || isContextMismatchedL0(opportunity);

  if (!hasKnownPrimaryEntity || SAFE_L0_ROUTES.has(decision.route)) {
    return buildSafeSummary({ state, decision, rankedContext, fullText });
  }

  if (treatAsMissingOpportunity && ROUTE_AWARE_ROUTES.has(decision.route)) {
    return buildRouteAwareGenericSummary({ state, decision, rankedContext, fullText });
  }

  if (treatAsMissingOpportunity) {
    return buildKnownEntityGenericSummary({ state, decision, rankedContext, fullText });
  }

  const investmentLevel = deriveInvestmentLevel(decision, opportunity);
  const priority = LEVEL_PRIORITY[investmentLevel];
  const finalRecommendation = ROUTE_RECOMMENDATIONS[decision.route]
    || (opportunity ? `${opportunity.track}建议 ${investmentLevel}：${priority}` : "先完成需求与证据验证，再决定投入");

  return baseContract({
    finalRecommendation,
    investmentLevel,
    priority,
    confidence: opportunity.evidenceLevel || state.confidence || "中",
    evidenceBoundary: buildEvidenceBoundary(
      rankedContext,
      matchedOpportunities.length > 1 ? ["当前实体命中了多个相关机会，摘要按主匹配机会输出，完整分析提供主要判断。"] : []
    ),
    oneLineConclusion: `${entityLabel(state)}：${finalRecommendation}。`,
    whyNow: buildWhyNow(rankedContext, opportunity),
    whatToBuild: opportunity.mvp,
    howToEnter: opportunity.actions0To30,
    technicalGate: opportunity.technicalGate,
    keyRisks: opportunity.risks?.length ? opportunity.risks : ["当前机会仍需项目级风险验证。"],
    nextActions: opportunity.nextActions?.length
      ? opportunity.nextActions
      : ["确认对象定义与目标客户", "形成可测试规格与验证计划"],
    exitConditions: opportunity.exitConditions,
    fullText,
  });
};

export const ASK_OUTPUT_CONTRACT_FIELDS = Object.freeze([
  "provider",
  "contractVersion",
  "finalRecommendation",
  "investmentLevel",
  "priority",
  "confidence",
  "evidenceBoundary",
  "oneLineConclusion",
  "whyNow",
  "whatToBuild",
  "howToEnter",
  "technicalGate",
  "keyRisks",
  "nextActions",
  "exitConditions",
  "fullText",
]);
