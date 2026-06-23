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

const DEFAULT_FILTERS = Object.freeze({
  role: "高管",
  region: "全球",
  customer: "全部",
  application: "全部",
  track: "全部",
  time: "2026",
});

const IMPACT_SCORE = { "低": 1, "中": 2, "中高": 3, "高": 4 };

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
  const topTracks = opportunities.slice(0, 3).map((item) => item.track);
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
  const productAdjacency = {
    "800VDC": ["GaN/SiC", "BBU", "变压器", "开关柜", "SST"],
    "液冷": ["微模块", "一体化电力模块"],
    "微模块": ["一体化电力模块", "BBU", "模块化 UPS"],
    "BBU": ["一体化电力模块", "HVDC"],
    "UPS": ["模块化 UPS", "微模块"],
  };
  const adjacentProducts = new Set(productAdjacency[normalizedFilters.track] || []);
  const relevantOpportunities = opportunities.filter((item) =>
    normalizedFilters.track === "全部"
      ? item.match.customerMatch || item.match.applicationMatch
      : item.match.trackMatch || adjacentProducts.has(item.track) || item.score >= 50);
  const productContext = {
    allOpportunities: opportunities,
    opportunities: (relevantOpportunities.length ? relevantOpportunities : opportunities).slice(0, 12),
    topOpportunities: (relevantOpportunities.length ? relevantOpportunities : opportunities).slice(0, 5),
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

  const top = productContext.topOpportunities[0];
  const segmentLabel = [normalizedFilters.role, normalizedFilters.region, normalizedFilters.customer, normalizedFilters.application, normalizedFilters.track, normalizedFilters.time].join(" | ");
  return {
    filters,
    normalizedFilters,
    segmentLabel,
    executiveBrief: top
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
