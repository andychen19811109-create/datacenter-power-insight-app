import {
  PRODUCT_OPPORTUNITIES,
  COMPANIES,
  TECH_MATRIX,
  CUSTOMER_PAIN_POINTS,
  INTELLIGENCE_SIGNALS,
  REGION_INSIGHTS,
} from "../data/marketData.js";

const QUESTION_TYPES = {
  company_compare: {
    label: "company_compare",
    keywords: ["对比", "比较", "差异", "谁更强", "竞争", "竞品", "优势", "弱点"],
  },
  technology_analysis: {
    label: "technology_analysis",
    keywords: ["800VDC", "HVDC", "SST", "液冷", "BBU", "GaN", "SiC", "GaN/SiC", "拓扑", "架构", "技术", "成熟度"],
  },
  product_planning: {
    label: "product_planning",
    keywords: ["产品规划", "路线图", "SKU", "立项", "怎么做", "产品线", "规格", "研发", "开发", "规划"],
  },
  market_opportunity: {
    label: "market_opportunity",
    keywords: ["市场机会", "赛道", "未来3年", "未来 3 年", "投资方向", "增长", "机会", "市场空间", "趋势"],
  },
  investment_view: {
    label: "investment_view",
    keywords: ["投资者", "估值", "标的", "股票", "财报", "回报", "弹性", "确定性", "风险收益"],
  },
};

const TRACK_TERMS = ["UPS", "模块化 UPS", "HVDC", "800VDC", "液冷", "BBU", "变压器", "开关柜", "GaN/SiC", "GaN", "SiC", "SST", "一体化电力模块", "微模块"];

const ratingScore = (value) => {
  const text = String(value || "");
  if (text.includes("必争") || text.includes("高")) return 5;
  if (text.includes("重点")) return 4;
  if (text.includes("中高")) return 4;
  if (text.includes("选择")) return 3;
  if (text.includes("中")) return 3;
  if (text.includes("维持")) return 2;
  if (text.includes("低")) return 1;
  return 2;
};

const inverseCompetitionScore = (value) => {
  const score = ratingScore(value);
  return 6 - score;
};

const includesText = (value, needle) => String(value || "").toLowerCase().includes(String(needle || "").toLowerCase());

const arrayIncludes = (items, value) => Array.isArray(items) && items.includes(value);

const normalizeTrackTerm = (term) => {
  if (term === "GaN" || term === "SiC") return "GaN/SiC";
  return term;
};

const detectedTracks = (question, filters) => {
  const fromQuestion = TRACK_TERMS.filter((term) => includesText(question, term)).map(normalizeTrackTerm);
  const selected = filters.track !== "全部" ? [filters.track] : [];
  return [...new Set([...selected, ...fromQuestion])];
};

export const classifyQuestion = (question) => {
  const normalized = question || "";
  const scoreByType = Object.values(QUESTION_TYPES).map((type) => ({
    type: type.label,
    score: type.keywords.reduce((sum, keyword) => sum + (includesText(normalized, keyword) ? 1 : 0), 0),
  }));

  const mentionsCompanies = COMPANIES.filter((company) =>
    includesText(normalized, company.name) || includesText(normalized, company.nameZh)
  );
  const hasCompareLanguage = QUESTION_TYPES.company_compare.keywords.some((keyword) => includesText(normalized, keyword));
  if (mentionsCompanies.length >= 2 || (mentionsCompanies.length >= 1 && hasCompareLanguage)) return "company_compare";

  const best = scoreByType.sort((a, b) => b.score - a.score)[0];
  return best?.score > 0 ? best.type : "generic_insight";
};

const productScore = (product, filters, questionType, queryTracks) => {
  let score = 0;
  let matchScore = 0;

  if (filters.track !== "全部" && product.track === filters.track) matchScore += 20;
  if (queryTracks.includes(product.track)) matchScore += 16;
  if (filters.customer !== "全部" && arrayIncludes(product.targetCustomers, filters.customer)) matchScore += 12;
  if (filters.application !== "全部" && arrayIncludes(product.applications, filters.application)) matchScore += 12;
  if (filters.region !== "全球" && arrayIncludes(product.regionRelevance, filters.region)) matchScore += 8;
  if (filters.region === "全球" && arrayIncludes(product.regionRelevance, "全球")) matchScore += 4;

  const roadmapStart = Number(String(product.roadmapStage || "").split("-")[0]);
  if (!Number.isNaN(roadmapStart) && Number(filters.time) >= roadmapStart) matchScore += 3;

  score += matchScore;
  score += ratingScore(product.recommendedPriority) * 5;
  score += ratingScore(product.marketAttractiveness) * 4;
  score += ratingScore(product.customerUrgency) * 4;
  score += ratingScore(product.technicalFeasibility) * 3;
  score += inverseCompetitionScore(product.competitionIntensity) * 2;

  if (questionType === "technology_analysis") score += ratingScore(product.technicalFeasibility) * 4;
  if (questionType === "product_planning") score += ratingScore(product.technicalFeasibility) * 3 + ratingScore(product.customerUrgency) * 3;
  if (questionType === "market_opportunity") score += ratingScore(product.marketAttractiveness) * 5 + ratingScore(product.customerUrgency) * 3;
  if (questionType === "investment_view") score += ratingScore(product.marketAttractiveness) * 4 + inverseCompetitionScore(product.competitionIntensity) * 3;

  return { ...product, matchScore, insightScore: score };
};

const companyScore = (company, filters, question, queryTracks) => {
  let matchScore = 0;
  if (includesText(question, company.name) || includesText(question, company.nameZh)) matchScore += 30;
  if (filters.track !== "全部" && arrayIncludes(company.track, filters.track)) matchScore += 16;
  queryTracks.forEach((track) => {
    if (arrayIncludes(company.track, track)) matchScore += 12;
  });
  if (filters.region !== "全球" && company.region === filters.region) matchScore += 10;
  if (filters.region === "全球") matchScore += 3;
  if (arrayIncludes(company.roleFit, filters.role)) matchScore += 8;

  return {
    ...company,
    matchScore,
    insightScore: matchScore + Number(company.score || 0) * 4,
  };
};

const techScore = (tech, filters, question, queryTracks) => {
  let matchScore = 0;
  if (filters.track !== "全部" && (includesText(tech.tech, filters.track) || includesText(filters.track, tech.tech))) matchScore += 20;
  if (queryTracks.some((track) => includesText(tech.tech, track) || includesText(track, tech.tech))) matchScore += 18;
  if (includesText(question, tech.tech)) matchScore += 14;

  return {
    ...tech,
    matchScore,
    insightScore: matchScore + ratingScore(tech.maturity) * 3 + ratingScore(tech.standard) * 2 + inverseCompetitionScore(tech.risk) * 2 + inverseCompetitionScore(tech.costRisk),
  };
};

const painPointScore = (painPoint, filters, queryTracks) => {
  let matchScore = 0;
  if (filters.customer !== "全部" && painPoint.customer === filters.customer) matchScore += 18;
  if (filters.application !== "全部" && arrayIncludes(painPoint.applications, filters.application)) matchScore += 14;
  if (filters.track !== "全部" && arrayIncludes(painPoint.affectedTracks, filters.track)) matchScore += 12;
  queryTracks.forEach((track) => {
    if (arrayIncludes(painPoint.affectedTracks, track)) matchScore += 8;
  });
  if (filters.customer === "全部" && filters.application === "全部" && filters.track === "全部") matchScore += 5;

  return {
    ...painPoint,
    matchScore,
    insightScore: matchScore + ratingScore(painPoint.confidence) * 2,
  };
};

const signalScore = (signal, filters, queryTracks) => {
  let matchScore = 0;
  if (arrayIncludes(signal.targetRoles, filters.role)) matchScore += 10;
  if (filters.region !== "全球" && arrayIncludes(signal.regionRelevance, filters.region)) matchScore += 8;
  if (filters.track !== "全部" && arrayIncludes(signal.affectedTracks, filters.track)) matchScore += 14;
  queryTracks.forEach((track) => {
    if (arrayIncludes(signal.affectedTracks, track)) matchScore += 9;
  });
  if (filters.region === "全球") matchScore += 3;

  return {
    ...signal,
    matchScore,
    insightScore: matchScore + ratingScore(signal.impact) * 3 + ratingScore(signal.conf || signal.confidence) * 2,
  };
};

const getRankedContext = (question, filters, questionType) => {
  const queryTracks = detectedTracks(question, filters);
  const products = PRODUCT_OPPORTUNITIES
    .map((product) => productScore(product, filters, questionType, queryTracks))
    .sort((a, b) => b.insightScore - a.insightScore);
  const companies = COMPANIES
    .map((company) => companyScore(company, filters, question, queryTracks))
    .sort((a, b) => b.insightScore - a.insightScore);
  const techs = TECH_MATRIX
    .map((tech) => techScore(tech, filters, question, queryTracks))
    .sort((a, b) => b.insightScore - a.insightScore);
  const painPoints = CUSTOMER_PAIN_POINTS
    .map((painPoint) => painPointScore(painPoint, filters, queryTracks))
    .sort((a, b) => b.insightScore - a.insightScore);
  const signals = INTELLIGENCE_SIGNALS
    .map((signal) => signalScore(signal, filters, queryTracks))
    .sort((a, b) => b.insightScore - a.insightScore);

  return {
    queryTracks,
    products,
    companies,
    techs,
    painPoints,
    signals,
    regionInsight: REGION_INSIGHTS[filters.region] || REGION_INSIGHTS["全球"],
  };
};

const list = (items) => items.map((item, index) => `${index + 1}. ${item}`).join("\n");

const formatFilters = (filters) => [
  `Role: ${filters.role}`,
  `Region: ${filters.region}`,
  `Customer: ${filters.customer}`,
  `Application: ${filters.application}`,
  `Track: ${filters.track}`,
  `Time Window: ${filters.time}`,
].join(" | ");

const confidenceLevel = (context, questionType) => {
  const topProduct = context.products[0];
  const topSignal = context.signals[0];
  const hasDirectFilter = topProduct?.matchScore >= 20 || topSignal?.matchScore >= 18;
  if (questionType === "generic_insight") return hasDirectFilter ? "Medium-High" : "Medium";
  if (context.queryTracks.length > 0 || hasDirectFilter) return "Medium-High";
  return "Medium";
};

const frameworkIntro = (questionType, filters, context) => {
  const region = context.regionInsight;
  const product = context.products[0];
  const secondProduct = context.products[1];
  const company = context.companies[0];
  const selectedTech = filters.track !== "全部"
    ? context.techs.find((item) => includesText(item.tech, filters.track) || includesText(filters.track, item.tech))
    : null;
  const tech = selectedTech || context.techs[0];
  const focusTrack = filters.track !== "全部" ? filters.track : product?.track;
  const focusPair = [...new Set([focusTrack, tech?.tech].filter(Boolean))].join("、");

  const generic = {
    company_compare: `在 ${filters.region} / ${filters.customer} / ${filters.application} 条件下，竞争判断不应只看公司体量，而应看其是否覆盖 ${focusPair || "关键供电架构"} 与目标客户采购约束。当前更值得关注的是 ${company?.nameZh || company?.name || "头部厂商"} 的系统集成能力、生态兼容和交付边界。`,
    technology_analysis: `${tech?.tech || product?.track || "目标技术"} 的价值来自 ${region.demandDriver} 与 ${region.gridConstraint} 的叠加，但落地节奏取决于标准成熟度、供应链成熟度和客户改造窗口。`,
    product_planning: `当前产品规划应围绕 ${product?.track || "高优先级赛道"} 建主线，并用 ${secondProduct?.track || "相邻赛道"} 做相邻扩展，避免只做单机设备升级。`,
    market_opportunity: `${filters.time} 年窗口下，${filters.region} 的高优先级机会集中在 ${context.products.slice(0, 3).map((p) => p.track).join("、")}；机会大小由客户紧迫度、技术可行性和区域相关性共同决定。`,
    investment_view: `从投资视角看，${context.products.slice(0, 3).map((p) => p.track).join("、")} 兼具 AI 基础设施弹性和供给侧约束，但需要区分确定性收入、估值弹性和技术路线风险。`,
    generic_insight: `当前问题可按 ${filters.role} 视角拆成市场约束、客户痛点、产品赛道、技术成熟度和竞争格局五个层面。${filters.region} 的主要驱动是 ${region.demandDriver}。`,
  };
  return generic[questionType];
};

const strategicAnalysis = (questionType, context, filters) => {
  const products = context.products.slice(0, 5);
  const companies = context.companies.slice(0, 4);
  const techs = context.techs.slice(0, 4);

  if (questionType === "company_compare") {
    return list(companies.map((company) =>
      `${company.name}${company.nameZh ? `（${company.nameZh}）` : ""}: 覆盖 ${company.track.join("、")}；机会为 ${company.opportunity}；限制为 ${company.limitation}；与当前筛选匹配分 ${company.matchScore}。`
    ));
  }

  if (questionType === "technology_analysis") {
    return list(techs.map((tech) =>
      `${tech.tech}: 成熟度 ${tech.maturity}，标准化 ${tech.standard}，研发重点 ${tech.rnd}，主要风险 ${tech.caveat}。`
    ));
  }

  if (questionType === "product_planning") {
    return list(products.map((product) =>
      `${product.track}: ${product.roadmapStage} 规划，优先级 ${product.recommendedPriority}，建议 ${product.action}；SKU/能力重点为 ${product.specs}。`
    ));
  }

  if (questionType === "market_opportunity") {
    return list(products.map((product) =>
      `${product.track}: 市场吸引力 ${product.marketAttractiveness}，客户紧迫度 ${product.customerUrgency}，区域相关性 ${product.regionRelevance.join("、")}，核心差异化 ${product.diff}。`
    ));
  }

  if (questionType === "investment_view") {
    return list(products.map((product) =>
      `${product.track}: 吸引力 ${product.marketAttractiveness}，竞争强度 ${product.competitionIntensity}，供应链成熟度 ${product.supplyChainMaturity}，投资判断偏 ${product.recommendedPriority}。`
    ));
  }

  return list([
    `优先赛道: ${products.slice(0, 4).map((p) => `${p.track}(${p.recommendedPriority})`).join("、")}。`,
    `关键技术: ${techs.slice(0, 3).map((t) => `${t.tech}/${t.maturity}`).join("、")}。`,
    `相关公司: ${companies.slice(0, 3).map((c) => `${c.name}${c.nameZh ? `-${c.nameZh}` : ""}`).join("、")}。`,
    `当前筛选以 ${filters.role} / ${filters.region} / ${filters.customer} 为决策口径，应优先校验客户采购标准和区域进入风险。`,
  ]);
};

export const generateAskPowerInsightAnswer = (question, filters) => {
  const cleanQuestion = (question || "").trim() || "请基于当前筛选条件生成数据中心电力电子市场洞察";
  const questionType = classifyQuestion(cleanQuestion);
  const context = getRankedContext(cleanQuestion, filters, questionType);
  const region = context.regionInsight;
  const topProducts = context.products.slice(0, 5);
  const topPainPoints = context.painPoints.slice(0, 4);
  const topSignals = context.signals.slice(0, 4);
  const topTechs = context.techs.slice(0, 4);

  return `Question Type: ${questionType}
Question: ${cleanQuestion}
Current Filters: ${formatFilters(filters)}

Executive Conclusion
${frameworkIntro(questionType, filters, context)}

Market Context
${list([
  `${filters.region} demand driver: ${region.demandDriver}。`,
  `Grid / infrastructure constraint: ${region.gridConstraint}。`,
  `Key customers: ${filters.customer === "全部" ? region.keyCustomers : filters.customer}。`,
  `Most relevant tracks under current filters: ${topProducts.slice(0, 4).map((p) => `${p.track}(${p.recommendedPriority})`).join("、")}。`,
])}

Key Drivers
${list([
  ...topPainPoints.slice(0, 2).map((p) => `${p.customer}: ${p.currentPain} 采购标准为 ${p.buyingCriteria}。`),
  ...topSignals.slice(0, 2).map((s) => `${s.title}: ${s.expertInterpretation}`),
])}

Strategic Analysis
${strategicAnalysis(questionType, context, filters)}

Product / Technology Implications
${list([
  ...topProducts.slice(0, 3).map((p) => `${p.track}: ${p.action}；差异化方向为 ${p.diff}；规格/能力焦点为 ${p.specs}。`),
  ...topTechs.slice(0, 2).map((t) => `${t.tech}: 研发关注 ${t.rnd}，行动建议 ${t.action}。`),
])}

Risk Assessment
${list([
  ...topProducts.slice(0, 3).map((p) => `${p.track}: ${p.risk}；数据局限为 ${p.caveat}。`),
  `${filters.region} entry risk: ${region.entryRisk}。`,
  ...topTechs.slice(0, 1).map((t) => `${t.tech}: 成熟度 ${t.maturity}，风险 ${t.risk}，成本风险 ${t.costRisk}。`),
])}

Recommended Actions
${list([
  `短期: 围绕 ${topProducts[0]?.track || filters.track} 建立可报价方案，优先匹配 ${filters.customer === "全部" ? "当前高紧迫度客户" : filters.customer} 的采购标准。`,
  `中期: 将 ${topProducts.slice(0, 3).map((p) => p.track).join("、")} 打包成路线图，按 ${filters.time} 年窗口区分维持、重点投入和必争赛道。`,
  `市场/销售: 使用 ${topPainPoints[0]?.marketTalkTrack || "TCO、可靠性、能效和交付速度"} 作为当前筛选条件下的核心话术。`,
  `研发/产品: 跟踪 ${topSignals[0]?.trackingAction || topTechs[0]?.rnd || "标准化、互操作性和长期可靠性"}。`,
])}

Confidence Level
${confidenceLevel(context, questionType)}。依据为内置数据中产品机会、技术矩阵、客户痛点、公司画像、情报信号与区域洞察的交叉匹配；当前最高产品匹配分 ${topProducts[0]?.matchScore ?? 0}，最高公司匹配分 ${context.companies[0]?.matchScore ?? 0}。

Data Caveats
1. 当前为本地规则版 V1.2.1，不调用后端、API、Gemini、OpenAI 或 Dify。
2. 数据来自 App 内置 expert-curated prototype data，适合做方向判断，不应直接替代正式市场数据库、客户访谈、年报、招标数据或产品手册。
3. 如果问题涉及公司财务、实时订单、股价、最新客户项目或政策更新，需要接入可审计外部数据后再形成正式结论。`;
};
