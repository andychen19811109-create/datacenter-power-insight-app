const DEFAULT_VALUE = "未提供";
const REQUEST_VERSION = "powerinsight-dify-request-v1";
const OUTPUT_CONTRACT_VERSION = "ask-contract-v1";

const normalizeText = (value = "") => String(value || "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[\s\-_]+/g, "")
  .replace(/[^\p{L}\p{N}/]+/gu, "");

const REGION_HINTS = [
  { label: "中国", patterns: ["中国", "国内"] },
  { label: "北美", patterns: ["北美", "美国", "加拿大"] },
  { label: "欧洲", patterns: ["欧洲", "欧盟", "英国", "德国", "法国"] },
  { label: "亚太", patterns: ["亚太", "东南亚", "日韩", "亚洲"] },
  { label: "全球", patterns: ["全球", "海外", "global", "worldwide"] },
];

const CUSTOMER_HINTS = [
  { label: "云服务商", patterns: ["云服务商", "云厂商", "云计算厂商", "hyperscaler", "cloud service provider"] },
  { label: "第三方数据中心", patterns: ["第三方数据中心", "colocation", "colo", "托管数据中心"] },
  { label: "电信运营商", patterns: ["电信运营商", "运营商", "carrier", "telco"] },
  { label: "金融", patterns: ["金融", "银行", "证券", "保险"] },
  { label: "制造业", patterns: ["制造业", "工厂", "工业企业"] },
  { label: "能源与电力", patterns: ["能源与电力", "电力", "能源"] },
  { label: "政府", patterns: ["政府", "政务"] },
  { label: "边缘计算", patterns: ["边缘计算", "边缘节点", "edge"] },
];

const APPLICATION_HINTS = [
  { label: "AI 训练集群", patterns: ["ai训练集群", "ai训练", "训练集群", "training cluster", "ai factory"] },
  { label: "AI 推理集群", patterns: ["ai推理集群", "ai推理", "推理集群", "inference cluster"] },
  { label: "超大规模数据中心", patterns: ["超大规模数据中心", "超大规模", "hyperscale"] },
  { label: "第三方托管数据中心", patterns: ["第三方托管数据中心", "托管数据中心"] },
  { label: "存量改造", patterns: ["存量改造", "改造项目", "retrofit"] },
  { label: "新建 AI Factory", patterns: ["新建aifactory", "新建ai工厂", "ai factory"] },
  { label: "边缘数据中心", patterns: ["边缘数据中心", "边缘机房", "edge data center"] },
];

const TIME_HORIZON_HINTS = [
  { label: "未来3年", patterns: ["未来3年", "未来三年", "三年", "3年"] },
  { label: "短期", patterns: ["短期", "近期", "今年"] },
  { label: "中期", patterns: ["中期"] },
  { label: "长期", patterns: ["长期", "远期"] },
];

const containsPattern = (question, pattern) => normalizeText(question).includes(normalizeText(pattern));

const firstExplicitMatch = (question, hints) => {
  const match = hints.find((item) => item.patterns.some((pattern) => containsPattern(question, pattern)));
  return match?.label || null;
};

const uniqueValues = (items = []) => [...new Set(items.filter(Boolean))];

const compactList = (items = [], limit = 3, formatter = (item) => item) =>
  items.slice(0, limit).map(formatter).filter(Boolean);

const resolveMentionedEntityLabel = (question, entity) => {
  if (!entity) return null;
  const matchedAlias = uniqueValues(entity.aliases || [])
    .sort((a, b) => a.length - b.length)
    .find((alias) => containsPattern(question, alias));
  if (matchedAlias) return matchedAlias;
  const matchedNormalizedAlias = uniqueValues(entity.matchedAliases || [])
    .find((alias) => containsPattern(question, alias));
  return matchedNormalizedAlias || entity.displayName || null;
};

const resolveTrack = (question, filters, analysisState) => {
  const state = analysisState?.state || analysisState || {};
  const entities = state.entities?.length ? state.entities : (state.primaryEntity ? [state.primaryEntity] : []);
  const explicitTracks = uniqueValues(entities
    .filter((entity) => entity?.category && entity.category !== "unknown")
    .map((entity) => resolveMentionedEntityLabel(question, entity)));
  if (explicitTracks.length > 1) return explicitTracks.join(" / ");
  if (explicitTracks[0]) return explicitTracks[0];
  if (state.primaryEntity?.category && state.primaryEntity.category !== "unknown") return state.primaryEntity.displayName;
  return filters.track || DEFAULT_VALUE;
};

const resolveTimeHorizon = (question, filters) => {
  const explicit = firstExplicitMatch(question, TIME_HORIZON_HINTS);
  if (explicit) return explicit;
  const yearMatch = String(question || "").match(/20\d{2}/);
  if (yearMatch) return yearMatch[0];
  return filters.time || DEFAULT_VALUE;
};

const resolveAnalysisGoal = (question, analysisState) => {
  const route = analysisState?.routeDecision?.route || null;
  const routeGoals = {
    entity_comparison: "比较候选对象的投入优先级、系统层级、接口边界和验证门槛",
    entity_relationship: "判断对象之间的协同关系、责任边界和组合进入路径",
    entity_substitution: "评估替代可行性、兼容约束和验证条件",
    architecture_impact: "分析对象对供电架构、接口和路线图的影响",
    entity_roadmap_impact: "分析对象对产品路线图和验证节奏的影响",
    entity_investment: "给出投入等级、进入路径、验证门槛和退出条件",
    product_roadmap: "给出产品路线图、投入阶段和关键验证动作",
    generic_domain_entity: "识别对象定位、机会边界、投入建议和验证门槛",
  };
  return routeGoals[route] || `围绕问题“${question}”输出投入等级、验证门槛和进入路径`;
};

const buildExtraContext = ({ question, filters, insightContext, resolvedContext }) => {
  const topOpportunities = compactList(
    insightContext?.productContext?.topOpportunities || [],
    4,
    (item) => `${item.track} ${item.level} (${item.score}/100)`
  );
  const painPoints = compactList(
    insightContext?.marketContext?.painPoints || [],
    3,
    (item) => `${item.customer}：${item.currentPain}`
  );
  const technologyGates = compactList(
    insightContext?.productContext?.topOpportunities || [],
    3,
    (item) => `${item.track}：${item.technicalGate}`
  );
  const intelligenceSignals = compactList(
    insightContext?.intelligenceContext?.signals || [],
    3,
    (item) => `${item.title} (${item.impact}/${item.confidence})`
  );
  const dataLimitations = compactList(insightContext?.dataLimitations || [], 4);

  return [
    "【PowerInsight Context Pack】",
    "当前 UI 筛选条件：",
    `- role=${filters.role || DEFAULT_VALUE}`,
    `- region=${filters.region || DEFAULT_VALUE}`,
    `- customer=${filters.customer || DEFAULT_VALUE}`,
    `- application=${filters.application || DEFAULT_VALUE}`,
    `- track=${filters.track || DEFAULT_VALUE}`,
    `- time=${filters.time || DEFAULT_VALUE}`,
    "",
    "【问题优先级说明】",
    "用户问题显式指定的信息优先于当前 UI 筛选条件。",
    `本次解析结果：track=${resolvedContext.track} | region=${resolvedContext.region} | customer_type=${resolvedContext.customer_type} | application=${resolvedContext.application} | time_horizon=${resolvedContext.time_horizon}`,
    "",
    "【当前本地洞察摘要】",
    `- Executive Brief：${insightContext?.executiveBrief || "未提供"}`,
    `- Top Opportunities：${topOpportunities.join("；") || "未提供"}`,
    `- Key Pain Points：${painPoints.join("；") || "未提供"}`,
    `- Technology Gates：${technologyGates.join("；") || "未提供"}`,
    `- Intelligence Signals：${intelligenceSignals.join("；") || "未提供"}`,
    `- Data Limitations：${dataLimitations.join("；") || "未提供"}`,
    "",
    "【输出要求】",
    "必须包含投入等级 L0-L4、核心结论、证据边界、验证门槛、进入路径、关键风险、下一步动作和退出条件。",
    "不得编造市场规模、客户案例或精确数据。",
    `原始问题：${question}`,
  ].join("\n");
};

export function buildDifyRequestPayload({ question, filters, insightContext, analysisState }) {
  const safeFilters = { ...filters };
  const state = analysisState?.state || analysisState || {};
  const resolvedContext = {
    track: resolveTrack(question, safeFilters, analysisState),
    region: firstExplicitMatch(question, REGION_HINTS) || safeFilters.region || DEFAULT_VALUE,
    customer_type: firstExplicitMatch(question, CUSTOMER_HINTS) || safeFilters.customer || DEFAULT_VALUE,
    application: firstExplicitMatch(question, APPLICATION_HINTS) || safeFilters.application || DEFAULT_VALUE,
    analysis_goal: resolveAnalysisGoal(question, analysisState),
    known_competitors: uniqueValues((state.companies || []).map((company) => company.displayName)).join(" / ") || DEFAULT_VALUE,
    time_horizon: resolveTimeHorizon(question, safeFilters),
  };

  const requestPayload = {
    requestVersion: REQUEST_VERSION,
    outputContractVersion: OUTPUT_CONTRACT_VERSION,
    provider: "dify",
    fallbackProvider: "local",
    question,
    resolvedContext,
    originalFilters: safeFilters,
    difyInputs: {
      track: resolvedContext.track,
      application: resolvedContext.application,
      region: resolvedContext.region,
      customer_type: resolvedContext.customer_type,
      analysis_goal: resolvedContext.analysis_goal,
      known_competitors: resolvedContext.known_competitors,
      time_horizon: resolvedContext.time_horizon,
      extra_context: buildExtraContext({
        question,
        filters: safeFilters,
        insightContext,
        resolvedContext,
      }),
    },
    fallbackPolicy: {
      provider: "local",
      on: ["unconfigured", "timeout", "network_error", "invalid_contract", "invalid_response"],
      requirement: "Dify failure must not block Ask PowerInsight output.",
    },
  };

  return requestPayload;
}
