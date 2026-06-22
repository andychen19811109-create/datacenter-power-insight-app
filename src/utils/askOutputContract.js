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

const entityLabel = (state) => state.primaryEntity?.displayName || "待确认对象";

const normalizeLabel = (value = "") => value.toLowerCase().replace(/[\s/_-]+/g, "");

const selectOpportunity = (state, rankedContext) => {
  if (!state.primaryEntity || state.primaryEntity.category === "unknown") return null;
  const matchedLabels = [state.primaryEntity.displayName, ...(state.primaryEntity.matchedAliases || [])]
    .map(normalizeLabel)
    .filter(Boolean);
  const allOpportunities = rankedContext.insightContext?.productContext.opportunities || rankedContext.products || [];
  return allOpportunities.find((item) => matchedLabels.includes(normalizeLabel(item.track))) || null;
};

const deriveInvestmentLevel = (decision, opportunity) => {
  if (["unknown_entity_clarification", "route_violation_guard", "scope_guard"].includes(decision.route)) return "L0";
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

export const buildAskOutputContract = ({ state, decision, rankedContext, fullText }) => {
  const opportunity = selectOpportunity(state, rankedContext);
  const needsClarification = decision.route === "unknown_entity_clarification";
  const needsSafeSummary = needsClarification || !opportunity;
  if (needsSafeSummary) {
    const finalRecommendation = "需要澄清产品对象与上下文映射，暂不建议投入";
    return {
      finalRecommendation,
      investmentLevel: "L0",
      priority: "低",
      confidence: "低",
      evidenceBoundary: ["未识别到可可靠关联的产品机会，需补充对象定义、客户场景和技术边界。"],
      oneLineConclusion: `${entityLabel(state)}：${finalRecommendation}。`,
      whyNow: ["对象或产品映射尚不明确，继续套用现有产品数据会造成误判。"],
      whatToBuild: "先明确产品对象、所属环节、目标客户和应用场景。",
      howToEnter: "完成实体澄清与产品边界确认后，再进入客户访谈和验证规划。",
      technicalGate: "请先明确产品对象、客户场景和技术边界。",
      keyRisks: ["对象定义不清导致误判。"],
      nextActions: ["澄清实体", "确认应用场景", "确认客户类型"],
      exitConditions: "无法明确产品边界前不进入立项。",
      fullText,
    };
  }

  const investmentLevel = deriveInvestmentLevel(decision, opportunity);
  const priority = LEVEL_PRIORITY[investmentLevel];
  const finalRecommendation = ROUTE_RECOMMENDATIONS[decision.route]
    || (opportunity ? `${opportunity.track}建议 ${investmentLevel}：${priority}` : "先完成需求与证据验证，再决定投入");

  return {
    finalRecommendation,
    investmentLevel,
    priority,
    confidence: opportunity.evidenceLevel || state.confidence || "中",
    evidenceBoundary: rankedContext.insightContext?.dataLimitations || ["当前结论来自本地 curated prototype data 和专家规则，不代表市场规模或财务回报。"],
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
  };
};

export const ASK_OUTPUT_CONTRACT_FIELDS = Object.freeze([
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
