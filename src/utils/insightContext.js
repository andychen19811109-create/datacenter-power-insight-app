import {
  SOURCE_REGISTRY,
  MARKET_LAYERS,
  REGION_INSIGHTS,
  CUSTOMER_PAIN_POINTS,
  PRODUCT_OPPORTUNITIES,
  TECH_MATRIX,
  COMPANIES,
} from "../data/marketData.js";
import INTELLIGENCE_SIGNALS from "../data/intelligenceSignals.json" with { type: "json" };
import { SEGMENT_KPI_CONTEXT } from "../data/segmentKpiContext.js";
import { scoreProductOpportunities } from "./opportunityScoring.js";
import { classifyEntity, getAdjacentReferences } from "../data/ontology.js";

const DEFAULT_FILTERS = Object.freeze({
  role: "高管",
  region: "全球",
  customer: "全部",
  application: "全部",
  track: "全部",
  time: "2026",
});

const IMPACT_SCORE = { "低": 1, "中": 2, "中高": 3, "高": 4 };

const PRODUCT_TRACK_ALIASES = Object.freeze({
  "塔式 UPS": ["UPS"],
  "800V HVDC 架构": ["800VDC"],
  "800V SST 架构": ["800VDC", "SST"],
  GaN: ["GaN/SiC"],
  SiC: ["GaN/SiC"],
});

const BOUNDED_PRIMARY_PROFILES = Object.freeze({
  "精密空调": {
    category: "增长盘",
    drive: "AI 高热密、存量改造和区域交付压力推动精密温控升级",
    diff: "氟泵多联、磁悬浮/气悬浮压缩、间接蒸发冷、风液协同和运维可靠性",
    specs: "高效制冷、AI 高密适配、区域交付与运维能力",
    technicalGate: "验证氟泵多联、磁悬浮/气悬浮、间接蒸发冷、风液协同、能效、可靠性和交付周期边界",
    risk: "液冷替代节奏、区域交付能力和高密场景适配不足",
    action: "围绕 AI 高热密和存量改造建立精密空调与液冷协同方案",
  },
  "PDU/RPP/STS": {
    category: "基础盘",
    drive: "末端配电、双路供电和静态切换可靠性决定高可用供电链路",
    diff: "PDU、RPP、STS、母线槽、双路供电、客户认证和运维安全",
    specs: "末端配电、远程配电、静态切换和母线接口",
    technicalGate: "验证末端配电容量、STS 切换可靠性、RPP/PDU 运维安全、母线槽接口和客户认证",
    risk: "与 UPS/HVDC/机柜供电接口边界不清会削弱产品定位",
    action: "围绕 PDU/RPP/STS 可靠切换和末端配电安全定义组合 SKU",
  },
  "服务器电源": {
    category: "增长盘",
    drive: "AI 服务器功率密度、48V/54V 机柜供电和高压输入架构推动 PSU 升级",
    diff: "AI PSU、高压输入、48V/54V、效率、功率密度、冗余和机柜级供电接口",
    specs: "高压输入 AI PSU，48V/54V 输出，高效率高功率密度",
    technicalGate: "验证高压输入、48V/54V、效率、功率密度、冗余、机柜级供电和 BBU/HVDC/800V 架构接口边界",
    risk: "与 BBU、HVDC 和 800V 架构边界不清，且受服务器平台导入周期约束",
    action: "围绕 AI PSU 与机柜级供电接口建立客户导入验证",
  },
});

const CONTEXT_NEED_PATTERNS = Object.freeze([
  { patterns: ["氟泵多联", "磁悬浮", "气悬浮", "间接蒸发冷", "风液协同"], parentTrack: "精密空调", type: "subsegment_under_parent" },
  { patterns: ["Manifold", "manifold", "冷板", "浸没式", "后门换热", "快接头", "冷却液", "一次侧", "二次侧"], parentTrack: "液冷", type: "subsegment_under_parent" },
  { patterns: ["母线槽", "智能母线", "busway", "busbar"], parentTrack: "PDU/RPP/STS", type: "subsegment_under_parent" },
]);

const productTrackLabelsFor = (label) => [label, ...(PRODUCT_TRACK_ALIASES[label] || [])];

const isProductTrackMatch = (item, label) => productTrackLabelsFor(label).includes(item.track);

const contextNeedFor = (rawTrack) => {
  const value = String(rawTrack || "");
  const match = CONTEXT_NEED_PATTERNS.find((entry) => entry.patterns.some((pattern) => value.includes(pattern)));
  if (!match) return null;
  return {
    input: value,
    parentTrack: match.parentTrack,
    type: match.type,
    reason: `${value} 是 ${match.parentTrack} 相关子技术/部件，需要先限定父赛道、应用场景和验证边界。`,
  };
};

const buildSyntheticPrimaryOpportunity = (track, normalizedFilters, profile) => ({
  track,
  category: profile.category,
  targetCustomers: normalizedFilters.customer === "全部" ? ["云服务商", "第三方数据中心"] : [normalizedFilters.customer],
  applications: normalizedFilters.application === "全部" ? ["AI 训练集群", "新建 AI Factory", "存量改造"] : [normalizedFilters.application],
  regionRelevance: normalizedFilters.region === "全球" ? ["全球", "中国", "北美", "欧洲", "亚太"] : [normalizedFilters.region],
  drive: profile.drive,
  diff: profile.diff,
  specs: profile.specs,
  roadmapStage: `${normalizedFilters.time}-${normalizedFilters.time}`,
  risk: profile.risk,
  action: profile.action,
  marketAttractiveness: "中",
  technicalFeasibility: "中",
  competitionIntensity: "中",
  supplyChainMaturity: "中",
  customerUrgency: "中",
  recommendedPriority: "边界验证",
  sourceRef: "expert",
  confidence: "中",
  caveat: "当前静态数据缺少专属机会行，本卡仅作为 selected track 的 bounded primary context。",
  score: 45,
  level: "L1",
  priority: "观察 / 边界验证",
  reasons: [
    `${normalizedFilters.region}区域需要补充当前赛道专属证据`,
    `${normalizedFilters.customer}客户需要补充当前赛道专属证据`,
    `${normalizedFilters.application}场景需要补充当前赛道专属证据`,
    `${normalizedFilters.time}窗口仅支持边界验证`,
    "证据置信度中",
  ],
  evidenceLevel: "中",
  risks: [profile.risk, "缺少可审计专属数据源"].filter(Boolean),
  mvp: `围绕${track}定义最小可验证方案，聚焦${profile.diff}`,
  actions0To30: `确认${track}目标客户、规格、竞品边界与验证资源；${profile.action}`,
  actions30To90: `${profile.technicalGate}，并取得至少一个客户验证反馈。`,
  nextActions: [profile.action, profile.technicalGate],
  technicalGate: profile.technicalGate,
  exitConditions: `若关键客户无明确需求、${normalizedFilters.time}窗口无法完成验证，或${profile.risk}不可控，则维持观察或退出投入。`,
  match: { regionMatch: true, customerMatch: true, applicationMatch: true, trackMatch: true, windowMatch: true },
  isRelevant: true,
  matchState: "current_track_primary",
  relationshipToSelectedTrack: "primary",
  scoreBoundary: "当前赛道 bounded primary context / 专家判断，不代表市场规模或财务回报",
  unsupportedReason: "静态 PRODUCT_OPPORTUNITIES 暂无该一级赛道专属行，禁止回退到高分相邻赛道。",
});

const buildUnsupportedContextOpportunity = (selectedTrack, normalizedFilters, unsupportedOrContextNeed) => ({
  track: selectedTrack,
  category: "边界说明",
  targetCustomers: [normalizedFilters.customer],
  applications: [normalizedFilters.application],
  regionRelevance: [normalizedFilters.region],
  drive: unsupportedOrContextNeed?.reason || "当前输入缺少可支持的一级业务赛道定义",
  diff: "需要先澄清父赛道、应用场景、产品边界和证据来源",
  specs: "clarification_required",
  roadmapStage: `${normalizedFilters.time}-${normalizedFilters.time}`,
  risk: "若直接套用高分相邻赛道，会产生错误主叙事",
  action: "先澄清对象边界，再进入产品机会排序",
  marketAttractiveness: "未评估",
  technicalFeasibility: "未评估",
  competitionIntensity: "未评估",
  supplyChainMaturity: "未评估",
  customerUrgency: "未评估",
  recommendedPriority: "澄清",
  sourceRef: "expert",
  confidence: "中",
  caveat: "unsupported/context_need 不渲染 unrelated primary narrative。",
  score: 0,
  level: "L0",
  priority: "澄清 / 暂不投入",
  reasons: [unsupportedOrContextNeed?.reason || "当前对象未识别为一级业务赛道"],
  evidenceLevel: "中",
  risks: ["对象边界不清", "缺少当前对象专属数据"],
  mvp: "不建议在澄清前定义 MVP。",
  actions0To30: "补充对象定义、父赛道、应用场景和客户证据。",
  actions30To90: "仅在澄清后进入一级赛道机会排序。",
  nextActions: ["澄清对象边界", "确认父赛道和客户场景"],
  technicalGate: "clarification_required",
  exitConditions: "无法确认父赛道或客户场景时，不形成产品投入建议。",
  match: { regionMatch: false, customerMatch: false, applicationMatch: false, trackMatch: false, windowMatch: false },
  isRelevant: false,
  matchState: "unsupported_or_context_need",
  relationshipToSelectedTrack: "unsupported_or_context_need",
  scoreBoundary: "unsupported/context_need 边界说明，不参与机会评分",
  unsupportedReason: unsupportedOrContextNeed?.reason || "当前对象缺少可支持的一级业务赛道定义。",
});

const isDimensionMatch = (values = [], selected, wildcard) =>
  selected === wildcard || values.includes(selected) || (wildcard === "全球" && values.includes("全球"));

const scorePainPoint = (pain, filters) => {
  const customerMatch = filters.customer === "全部" || pain.customer === filters.customer;
  const applicationMatch = filters.application === "全部" || pain.applications.includes(filters.application);
  const trackMatch = filters.track === "全部" || pain.affectedTracks.includes(filters.track);
  const contextFitScore = (customerMatch ? 10 : 0) + (applicationMatch ? 6 : 0) + (trackMatch ? 6 : 0);
  return {
    ...pain,
    contextFitScore,
    contextFit: contextFitScore >= 20 ? "高匹配" : contextFitScore >= 12 ? "中高匹配" : contextFitScore > 0 ? "部分匹配" : "无直接匹配",
    evidenceLevel: pain.confidence || "专家判断",
    isDirectMatch: customerMatch && applicationMatch && trackMatch,
  };
};

const buildMarketContext = (filters, opportunities) => {
  const pains = CUSTOMER_PAIN_POINTS.map((pain) => scorePainPoint(pain, filters)).sort((a, b) => b.contextFitScore - a.contextFitScore);
  const directPains = pains.filter((pain) => pain.isDirectMatch);
  const visiblePains = (directPains.length ? directPains : pains.filter((pain) => pain.contextFitScore > 0)).slice(0, 6);
  const enrichedPains = visiblePains.map((pain) => ({
    ...pain,
    relatedProductOpportunities: opportunities
      .filter((product) => pain.affectedTracks.includes(product.track))
      .slice(0, 4)
      .map((product) => ({ track: product.track, level: product.level, score: product.score })),
  }));

  return {
    regionInsight: REGION_INSIGHTS[filters.region] || REGION_INSIGHTS["全球"],
    marketLayers: MARKET_LAYERS.filter((layer) => filters.track === "全部" || layer.tracks.includes(filters.track)),
    painPoints: enrichedPains,
    hasDirectPainMatch: directPains.length > 0,
  };
};

const buildTechnologyContext = (filters, opportunities) => {
  const adjacentTracks = new Set(opportunities.slice(0, 4).map((item) => item.track));
  const selectedTrackAdjacency = {
    "800VDC": ["GaN/SiC", "SST", "变压器", "开关柜"],
    "液冷": ["微模块", "一体化电力模块"],
    "微模块": ["一体化电力模块", "BBU", "模块化 UPS"],
    "BBU": ["一体化电力模块", "HVDC"],
    "UPS": ["模块化 UPS", "微模块"],
  };
  (selectedTrackAdjacency[filters.track] || []).forEach((track) => adjacentTracks.add(track));
  const alternatives = {
    "800VDC": "240/336V HVDC、传统 AC UPS 与分阶段直流改造",
    "液冷": "增强型风冷、冷板液冷与浸没式路线分层验证",
    "BBU": "集中式 UPS 电池、储能 PCS 与短时备电组合",
    "SST": "工频变压器 + UPS/HVDC 的成熟组合架构",
    "微模块": "传统机房集成与一体化电力模块",
  };

  return TECH_MATRIX.map((technology) => {
    const direct = filters.track === "全部" || technology.tech === filters.track;
    const related = adjacentTracks.has(technology.tech);
    const product = opportunities.find((item) => item.track === technology.tech);
    return {
      ...technology,
      matchType: direct ? "直接相关" : related ? "产品机会关联" : "相邻参考",
      validationGate: product?.technicalGate || `暂无直接数据，仅按${technology.tech}赛道和场景推断；需完成样机、标准、可靠性和客户验证。`,
      alternativeRoute: alternatives[technology.tech] || "现有成熟架构或相邻技术路线",
      relatedProducts: product ? [product.track] : [],
      customerScenarios: product?.applications || [],
      recommendedRndAction: technology.action,
      relevanceScore: direct ? 10 : related ? 6 : 0,
    };
  }).filter((technology) => filters.track === "全部" || technology.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore);
};

const buildCompanyContext = (filters) => {
  const companies = COMPANIES.map((company) => {
    const trackMatch = filters.track === "全部" || company.track.includes(filters.track);
    const regionMatch = filters.region === "全球" || company.region === filters.region;
    const roleMatch = company.roleFit.includes(filters.role);
    const contextScore = (trackMatch ? 10 : 0) + (regionMatch ? 5 : 0) + (roleMatch ? 3 : 0);
    return { ...company, contextScore, matchType: trackMatch && regionMatch ? "直接匹配" : contextScore > 0 ? "相关参考" : "低相关" };
  }).filter((company) => company.contextScore > 0).sort((a, b) => b.contextScore - a.contextScore);
  return { companies };
};

const scoreSignal = (signal, filters) => {
  const matches = {
    region: isDimensionMatch(signal.affectedRegions, filters.region, "全球"),
    role: signal.targetRoles.includes(filters.role),
    track: isDimensionMatch(signal.affectedTracks, filters.track, "全部"),
    customer: isDimensionMatch(signal.affectedCustomers, filters.customer, "全部"),
    application: isDimensionMatch(signal.affectedApplications, filters.application, "全部"),
    time: signal.timeWindows.includes(filters.time),
  };
  const matchScore = Object.values(matches).filter(Boolean).length * 4 + (IMPACT_SCORE[signal.impact] || 1);
  return {
    ...signal,
    regionRelevance: signal.affectedRegions,
    conf: signal.confidence,
    trackingAction: signal.recommendedAction,
    matches,
    matchScore,
    isDirectMatch: Object.values(matches).every(Boolean),
    matchType: Object.values(matches).every(Boolean) ? "直接匹配" : "相关参考",
  };
};

const buildIntelligenceContext = (filters) => {
  const rankedSignals = INTELLIGENCE_SIGNALS.map((signal) => scoreSignal(signal, filters))
    .sort((a, b) => b.matchScore - a.matchScore || b.date.localeCompare(a.date));
  const directSignals = rankedSignals.filter((signal) => signal.isDirectMatch);
  return {
    signals: (directSignals.length ? directSignals : rankedSignals.filter((signal) => signal.matchScore >= 13)).slice(0, 8),
    hasDirectMatch: directSignals.length > 0,
    lastUpdated: INTELLIGENCE_SIGNALS.reduce((latest, signal) => signal.date > latest ? signal.date : latest, ""),
    sourceLabel: "Static JSON curated intelligence",
  };
};

const buildKpiContext = (filters) => {
  const matches = SEGMENT_KPI_CONTEXT.filter((item) =>
    isDimensionMatch(item.applicableRegions, filters.region, "全球")
    && isDimensionMatch(item.applicableCustomers, filters.customer, "全部")
    && isDimensionMatch(item.applicableApplications, filters.application, "全部")
    && isDimensionMatch(item.applicableTracks, filters.track, "全部")
    && item.timeWindows.includes(filters.time));
  return matches.length ? matches : SEGMENT_KPI_CONTEXT.filter((item) =>
    isDimensionMatch(item.applicableRegions, filters.region, "全球")
    && isDimensionMatch(item.applicableTracks, filters.track, "全部"));
};

const buildRecommendedQuestions = (filters, opportunities) => {
  const topTracks = opportunities.filter((item) => item.relationshipToSelectedTrack !== "adjacent").slice(0, 3).map((item) => item.track);
  const focus = filters.track === "全部" ? topTracks[0] || "数据中心电力基础设施" : filters.track;
  return [
    `${filters.region}${filters.customer === "全部" ? "客户" : filters.customer}在${filters.application === "全部" ? "数据中心" : filters.application}场景下，${focus}是否值得${opportunities[0]?.level || "L2"}立项？`,
    `${focus}在${filters.time}窗口的关键技术门槛和退出条件是什么？`,
    `${topTracks.slice(0, 2).join("与")}应该如何分配产品与研发资源？`,
    `${filters.role}视角下，当前机会的证据边界和最大风险是什么？`,
  ];
};

export const buildInsightContext = (filters = {}) => {
  const normalizedFilters = { ...DEFAULT_FILTERS, ...filters };
  const opportunities = scoreProductOpportunities(PRODUCT_OPPORTUNITIES, normalizedFilters);
  const selectedEntity = classifyEntity(normalizedFilters.track);
  const selectedTrack = selectedEntity.label;
  const contextNeed = selectedEntity.entityType === "unknown" ? contextNeedFor(normalizedFilters.track) : null;
  const unsupportedOrContextNeed = !selectedEntity.isPrimaryBusinessTrack && selectedEntity.entityType !== "all"
    ? {
      input: normalizedFilters.track,
      normalizedTrack: selectedTrack,
      entityType: selectedEntity.entityType,
      parentTrack: selectedEntity.parentBusinessTrack?.label || contextNeed?.parentTrack || null,
      type: contextNeed?.type || selectedEntity.entityType,
      reason: contextNeed?.reason
        || selectedEntity.entry?.boundary
        || `${selectedTrack} 不是当前支持的一级业务赛道，需要先澄清对象边界。`,
    }
    : null;
  const directOpportunityRows = selectedEntity.isPrimaryBusinessTrack
    ? opportunities.filter((item) => isProductTrackMatch(item, selectedTrack))
    : [];
  const syntheticPrimary = selectedEntity.isPrimaryBusinessTrack && !directOpportunityRows.length && BOUNDED_PRIMARY_PROFILES[selectedTrack]
    ? buildSyntheticPrimaryOpportunity(selectedTrack, normalizedFilters, BOUNDED_PRIMARY_PROFILES[selectedTrack])
    : null;
  const primaryOpportunities = directOpportunityRows.length
    ? directOpportunityRows.map((item) => ({
      ...item,
      sourceTrack: item.track,
      track: selectedTrack,
      matchState: "current_track_primary",
      relationshipToSelectedTrack: "primary",
      isRelevant: true,
    }))
    : syntheticPrimary ? [syntheticPrimary] : [];
  const primaryOpportunity = primaryOpportunities[0] || null;
  const adjacentLabels = new Set([
    ...getAdjacentReferences(selectedEntity.id).map((item) => item.label),
    ...(unsupportedOrContextNeed?.parentTrack ? [unsupportedOrContextNeed.parentTrack] : []),
  ]);
  const adjacentOpportunities = opportunities
    .filter((item) => !primaryOpportunities.some((primary) => primary.track === item.track))
    .filter((item) => adjacentLabels.has(item.track) || [...adjacentLabels].some((label) => isProductTrackMatch(item, label)))
    .slice(0, 6)
    .map((item) => ({
      ...item,
      matchState: "adjacent_reference",
      relationshipToSelectedTrack: "adjacent",
      isRelevant: false,
      unsupportedReason: `该机会仅作为 ${selectedTrack} 的相邻参考，不能覆盖 primaryOpportunity。`,
    }));
  const unsupportedContextOpportunity = unsupportedOrContextNeed
    ? buildUnsupportedContextOpportunity(selectedTrack, normalizedFilters, unsupportedOrContextNeed)
    : null;
  const relevantOpportunities = normalizedFilters.track === "全部"
    ? opportunities.filter((item) => item.match.customerMatch || item.match.applicationMatch)
    : unsupportedContextOpportunity
      ? [unsupportedContextOpportunity, ...adjacentOpportunities]
      : [...primaryOpportunities, ...adjacentOpportunities];
  const productContext = {
    allOpportunities: opportunities,
    opportunities: (relevantOpportunities.length ? relevantOpportunities : opportunities).slice(0, 12),
    topOpportunities: (relevantOpportunities.length ? relevantOpportunities : opportunities).slice(0, 5),
    primaryOpportunity: normalizedFilters.track === "全部" ? opportunities[0] || null : primaryOpportunity,
    adjacentOpportunities,
    unsupportedOrContextNeed,
    scoringBoundary: "相对优先级评分 / 专家判断，不是市场规模、收入预测或投资回报承诺",
  };
  const marketContext = buildMarketContext(normalizedFilters, opportunities);
  const technologyContext = buildTechnologyContext(normalizedFilters, productContext.opportunities);
  const companyContext = buildCompanyContext(normalizedFilters);
  const intelligenceContext = buildIntelligenceContext(normalizedFilters);
  const segmentKpis = buildKpiContext(normalizedFilters);
  const opportunityRadar = productContext.topOpportunities.map(({ track, score, level, priority, reasons, evidenceLevel }) =>
    ({ track, score, level, priority, reasons, evidenceLevel }));
  const riskRadar = productContext.topOpportunities.slice(0, 5).map((item) => ({
    category: "综合风险",
    track: item.track,
    risk: item.risks[0] || "需项目级验证",
    severity: item.level === "L4" ? "高" : item.level === "L3" ? "中高" : "中",
  }));
  const dataLimitations = [
    "区域与细分市场没有可核验的统一市场规模数据，因此只提供相对评分和解释。",
    "客户、场景与公司字段来自 curated prototype data，不能替代客户访谈、项目数据库或财务尽调。",
  ];
  if (!intelligenceContext.hasDirectMatch) dataLimitations.push("当前筛选条件暂无直接情报匹配，展示内容仅为相关参考。");
  if (!segmentKpis.length) dataLimitations.push("当前筛选条件暂无直接 Segment KPI interpretation。");

  const top = productContext.primaryOpportunity;
  const segmentLabel = [normalizedFilters.role, normalizedFilters.region, normalizedFilters.customer, normalizedFilters.application, normalizedFilters.track, normalizedFilters.time].join(" | ");
  return {
    filters,
    normalizedFilters,
    segmentLabel,
    executiveBrief: unsupportedOrContextNeed
      ? `${normalizedFilters.role}视角下，${unsupportedOrContextNeed.normalizedTrack}当前属于 ${unsupportedOrContextNeed.type}，需要先澄清父赛道、应用场景和证据边界；不得回退到高分相邻赛道。`
      : top
        ? `${normalizedFilters.role}视角下，${top.track}当前相对优先级为 ${top.level}（${top.priority}，${top.score}/100）。先验证${top.technicalGate}；该评分不代表市场规模。`
        : "当前筛选条件缺少足够数据形成产品投入建议。",
    marketContext,
    productContext,
    technologyContext,
    companyContext,
    intelligenceContext,
    evidenceContext: { segmentKpis, sourceRegistry: SOURCE_REGISTRY },
    opportunityRadar,
    riskRadar,
    recommendedAskQuestions: buildRecommendedQuestions(normalizedFilters, productContext.topOpportunities),
    dataLimitations,
  };
};

export const DEFAULT_INSIGHT_FILTERS = DEFAULT_FILTERS;
