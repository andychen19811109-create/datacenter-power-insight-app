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
    keywords: ["投资者", "估值", "标的", "股票", "财报", "回报", "弹性", "确定性", "风险收益", "利润率", "订单可见度"],
  },
};

const POWER_TRACKS = ["UPS", "模块化 UPS", "HVDC", "800VDC", "一体化电力模块", "微模块", "BBU", "GaN/SiC"];
const LIQUID_TRACKS = ["液冷"];
const TRACK_ORDER = [
  "800VDC",
  "液冷",
  "BBU",
  "一体化电力模块",
  "模块化 UPS",
  "UPS",
  "HVDC",
  "GaN/SiC",
  "微模块",
  "变压器",
  "开关柜",
  "SST",
];

const TRACK_ALIAS_MAP = {
  UPS: ["UPS", "不间断电源"],
  "模块化 UPS": ["模块化 UPS", "模块化UPS", "模块化 电源"],
  HVDC: ["HVDC", "高压直流", "240VDC", "336VDC"],
  "800VDC": ["800VDC", "800 VDC", "800V", "800V 直流"],
  液冷: ["液冷", "CDU", "冷板", "快接头", "防漏液", "热管理", "浸没式"],
  BBU: ["BBU", "电池备电", "备电单元"],
  变压器: ["变压器", "干式变压器"],
  开关柜: ["开关柜", "中压开关柜", "配电柜"],
  "GaN/SiC": ["GaN/SiC", "GaN", "SiC", "宽禁带"],
  SST: ["SST", "固态变压器"],
  "一体化电力模块": ["一体化电力模块", "电力模块", "预制电力模块"],
  微模块: ["微模块"],
};

const TRACK_INFERENCE_RULES = [
  {
    terms: ["电源", "供电", "配电", "供配电"],
    tracks: ["UPS", "模块化 UPS", "HVDC", "800VDC", "一体化电力模块", "微模块", "BBU", "GaN/SiC"],
    weight: 4,
    reason: "power scope",
  },
  {
    terms: ["液冷", "CDU", "冷板", "快接头", "防漏液", "热管理", "浸没式"],
    tracks: ["液冷"],
    weight: 6,
    reason: "liquid cooling scope",
  },
  {
    terms: ["AI数据中心", "AIDC", "AI Factory", "AI 工厂", "AI训练", "AI 训练", "AI推理", "AI 推理", "大模型"],
    tracks: ["800VDC", "液冷", "BBU", "一体化电力模块", "GaN/SiC"],
    weight: 4,
    reason: "AI data center context",
  },
  {
    terms: ["MW 级", "MW级", "MW 级 UPS", "MW级UPS"],
    tracks: ["UPS", "模块化 UPS", "一体化电力模块"],
    weight: 4,
    reason: "MW-scale power",
  },
];

const COMPANY_ALIAS_MAP = {
  Vertiv: ["Vertiv", "维谛", "维谛技术"],
  "Huawei Digital Power": ["Huawei", "华为", "华为数字能源", "Huawei Digital Power"],
  "Schneider Electric": ["Schneider", "施耐德", "施耐德电气", "Schneider Electric"],
  Eaton: ["Eaton", "伊顿"],
  "Delta Electronics": ["Delta", "台达", "台达电子", "Delta Electronics"],
  Infineon: ["Infineon", "英飞凌"],
  Navitas: ["Navitas", "纳微"],
  Renesas: ["Renesas", "瑞萨"],
  "EVE Energy": ["EVE", "亿纬", "亿纬锂能", "EVE Energy"],
  Envic: ["Envic", "英维克"],
};

const COMPANY_PROFILES = {
  Vertiv: {
    customerAccess: ["云服务商", "第三方数据中心", "金融"],
    powerStrength: "UPS 与 800VDC 相关系统级能力覆盖更完整，适合全球 hyperscale 与 Colo 新建项目。",
    liquidStrength: "液冷与热管理一体化能力成熟，便于打包销售高密 AI 基础设施。",
    regionalAdvantage: "北美与全球超大规模项目可及性强，全球交付与服务网络更完整。",
    investment: "增长弹性来自 hyperscale AI capex 与液冷渗透率提升，但估值与执行兑现要求高。",
    executive: "适合作为全球高密 AI 园区的全栈合作伙伴，但资源配置要兼顾产能与交付节奏。",
    product: "重点看 800VDC、液冷、服务软件与系统级维护包的联动路线图。",
    market: "可主打全栈电源与热管理、低 PUE、全球服务和快速落地能力。",
    rnd: "重点风险在液路可靠性、800VDC 保护器件验证和系统级联调复杂度。",
  },
  "Huawei Digital Power": {
    customerAccess: ["云服务商", "电信运营商", "政府"],
    powerStrength: "模块化 UPS、一体化电力模块和微模块更强，适合中国与新兴市场的预制化交付。",
    liquidStrength: "液冷与一体化机电方案结合紧，适合 AI 园区整体解决方案销售。",
    regionalAdvantage: "中国市场、运营商和政企生态优势明显，但北美和部分欧洲项目受地缘政治限制。",
    investment: "增长弹性更依赖中国算力建设、运营商和政企项目，但全球估值扩张受地缘边界约束。",
    executive: "适合作为中国市场资源配置主轴，但海外组织能力需围绕合规与区域合作重新设计。",
    product: "应强化模块化 UPS、预制电力模块、液冷 CDU 与算电协同软件的一体化 SKU。",
    market: "更适合主打算电协同、交付周期、预制化和本地生态兼容。",
    rnd: "重点在液冷可靠性、预制化标准化和系统接口兼容，而非单点器件领先。",
  },
  "Schneider Electric": {
    customerAccess: ["第三方数据中心", "金融", "政府", "制造业"],
    powerStrength: "中低压配电、UPS 与电气成套能力强，适合强调稳健与标准化的客户。",
    liquidStrength: "液冷声量弱于 Vertiv，但在传统配电与能效管理整合上更稳健。",
    regionalAdvantage: "欧洲与全球 enterprise/Colo 渠道优势明显。",
    investment: "订单确定性较高，但增长弹性和 AI 专属故事性弱于更激进的玩家。",
    executive: "适合做稳健型基础设施合作，但 AI 专属路线推进速度偏保守。",
    product: "应补强 AI-ready 配电与液冷协同路线。",
    market: "可强调标准化、可靠性、全球渠道与中压成套能力。",
    rnd: "更关注稳健演进而非激进架构切换。",
  },
  Eaton: {
    customerAccess: ["云服务商", "制造业", "金融", "能源与电力"],
    powerStrength: "北美配电、中压设备与 UPS 能力强，受益于并网与配电瓶颈。",
    liquidStrength: "液冷能力相对较弱，更偏电力基础设施而非热管理主导。",
    regionalAdvantage: "北美配电基础设施与工业客户基础强。",
    investment: "增长确定性更偏配电基础设施，液冷弹性不如 Vertiv。",
    executive: "适合把中压配电和 UPS 作为核心抓手，但液冷需伙伴补位。",
    product: "更适合围绕配电成套、变压器、开关柜与 UPS 打包。",
    market: "主打北美并网与配电交付确定性。",
    rnd: "研发重点不在液冷前沿，而在配电成套和系统集成效率。",
  },
  "Delta Electronics": {
    customerAccess: ["云服务商", "制造业", "边缘计算"],
    powerStrength: "在 PSU、HVDC、800VDC 与 GaN/SiC 供应链环节更强，偏底层电力电子能力。",
    liquidStrength: "系统级液冷整合度不如 Vertiv/华为，更适合做电源链条关键节点。",
    regionalAdvantage: "亚太供应链与部件生态优势明显。",
    investment: "更像高弹性的电力电子供应链标的，订单弹性受头部客户导入影响较大。",
    executive: "适合作为关键部件与电源子系统伙伴，而非完整园区总包核心。",
    product: "重点应放在 PSU、高密电源模块、GaN/SiC 和 800VDC 子系统。",
    market: "可强调高效率、小型化与供应链响应速度。",
    rnd: "研发重点在器件、功率密度和系统效率，而非液冷系统工程。",
  },
  Envic: {
    customerAccess: ["云服务商", "第三方数据中心"],
    powerStrength: "配电链条较弱，更偏液冷系统与温控部件。",
    liquidStrength: "在中国液冷组件与 CDU 方向更聚焦。",
    regionalAdvantage: "中国液冷链条响应速度快。",
    investment: "液冷单赛道弹性高，但系统总包能力有限。",
    executive: "适合作为液冷部件伙伴，而非完整供配电主轴。",
    product: "聚焦 CDU、快接头和液路可靠性。",
    market: "适合突出液冷细分专业度。",
    rnd: "需要持续验证液路可靠性与成本控制。",
  },
  "EVE Energy": {
    customerAccess: ["云服务商", "能源与电力"],
    powerStrength: "在 BBU 与电芯侧更有代表性，但不覆盖完整供配电。",
    liquidStrength: "不具备液冷系统级主导能力。",
    regionalAdvantage: "中国电池供应链优势明显。",
    investment: "受益于 BBU 趋势，但行业价格战和商业模式不确定性高。",
    executive: "更适合作为备电/储能链条伙伴。",
    product: "聚焦高倍率电芯与 BMS。",
    market: "强调削峰填谷和电网友好型资产属性。",
    rnd: "重点在热失控、消防与寿命管理。",
  },
};

const normalizeText = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");
const includesText = (value, needle) => normalizeText(value).includes(normalizeText(needle));
const indexOfText = (value, needle) => normalizeText(value).indexOf(normalizeText(needle));
const arrayIncludes = (items, value) => Array.isArray(items) && items.includes(value);
const normalizeTrackTerm = (term) => (term === "GaN" || term === "SiC" ? "GaN/SiC" : term);
const cleanClause = (value) => String(value || "").replace(/[；;。,.，\s]+$/g, "").trim();

const uniqueBy = (items, getKey) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const list = (items) =>
  items
    .filter(Boolean)
    .map((item, index) => `${index + 1}. ${String(item).replace(/[。]{2,}/g, "。").trim()}`)
    .join("\n");

const audienceContext = (filters) => {
  const parts = [`${filters.region}市场`, `${filters.time}年窗口`, `${filters.role}视角`];
  if (filters.customer !== "全部") parts.push(`${filters.customer}客户`);
  if (filters.application !== "全部") parts.push(`${filters.application}场景`);
  if (filters.track !== "全部") parts.push(`${filters.track}赛道`);
  return parts.join("、");
};

const decisionScope = (filters) => {
  const customer = filters.customer === "全部" ? "主流云厂商、Colo、运营商和政企客户" : `${filters.customer}客户`;
  const application = filters.application === "全部" ? "新建 AI Factory 与存量改造并行场景" : `${filters.application}场景`;
  const track = filters.track === "全部" ? "多赛道组合" : `${filters.track}赛道`;
  return `${filters.region}市场、${customer}、${application}、${track}`;
};

const applicationFocus = (filters) => (filters.application === "全部" ? "新建与改造并行" : filters.application);

const normalizeScore = (rawScore, maxScore = 280) => {
  const bounded = Math.max(0, Math.min(maxScore, Number(rawScore || 0)));
  return Math.round(55 + (bounded / maxScore) * 40);
};

const fitScoreText = (rawScore, maxScore) => `Strategic Fit Score: ${normalizeScore(rawScore, maxScore)}/100`;

const joinTracks = (tracks) => dedupeTracks(tracks).join("、");

const ratingScore = (value) => {
  const text = String(value || "");
  if (text.includes("必争") || text.includes("高")) return 5;
  if (text.includes("重点")) return 4;
  if (text.includes("中高")) return 4;
  if (text.includes("选择")) return 3;
  if (text.includes("中")) return 3;
  if (text.includes("维持")) return 2;
  if (text.includes("预研")) return 1;
  if (text.includes("低")) return 1;
  return 2;
};

const inverseCompetitionScore = (value) => 6 - ratingScore(value);
const supplyChainScore = (value) => ratingScore(value);

const parseRoadmap = (roadmapStage) => {
  const parts = String(roadmapStage || "")
    .split("-")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));
  return {
    start: parts[0],
    end: parts[1] || parts[0],
  };
};

const roadmapScore = (roadmapStage, timeWindow) => {
  const { start, end } = parseRoadmap(roadmapStage);
  const targetYear = Number(timeWindow);
  if (!Number.isFinite(start) || !Number.isFinite(targetYear)) return 0;
  if (targetYear < start) return -2;
  if (targetYear >= start && targetYear <= end) return 5;
  return 3;
};

const addWeight = (map, reasons, track, amount, reason) => {
  const normalizedTrack = normalizeTrackTerm(track);
  map.set(normalizedTrack, (map.get(normalizedTrack) || 0) + amount);
  if (!reasons[normalizedTrack]) reasons[normalizedTrack] = [];
  reasons[normalizedTrack].push(reason);
};

const getCompanyAliases = (company) =>
  uniqueBy(
    [company.name, company.nameZh, ...(COMPANY_ALIAS_MAP[company.name] || [])].filter(Boolean),
    (item) => normalizeText(item)
  );

const extractNamedCompanies = (question) =>
  uniqueBy(
    COMPANIES.map((company) => {
      const aliases = getCompanyAliases(company);
      const match = aliases
        .map((alias) => ({ alias, index: indexOfText(question, alias) }))
        .filter((item) => item.index >= 0)
        .sort((a, b) => a.index - b.index || b.alias.length - a.alias.length)[0];
      return match ? { ...company, matchedAlias: match.alias, mentionIndex: match.index } : null;
    })
      .filter(Boolean)
      .sort((a, b) => a.mentionIndex - b.mentionIndex || Number(b.score || 0) - Number(a.score || 0)),
    (item) => item.id
  );

const inferTrackContext = (question, filters) => {
  const weights = new Map();
  const reasons = {};
  const matchedTerms = [];
  const directTracks = new Set();

  if (filters.track !== "全部") {
    addWeight(weights, reasons, filters.track, 9, `filter:${filters.track}`);
  }

  Object.entries(TRACK_ALIAS_MAP).forEach(([track, aliases]) => {
    aliases.forEach((alias) => {
      if (includesText(question, alias)) {
        addWeight(weights, reasons, track, 8, `direct:${alias}`);
        matchedTerms.push(alias);
        directTracks.add(track);
      }
    });
  });

  TRACK_INFERENCE_RULES.forEach((rule) => {
    const hitTerms = rule.terms.filter((term) => includesText(question, term));
    if (hitTerms.length > 0) {
      rule.tracks.forEach((track) => addWeight(weights, reasons, track, rule.weight, `${rule.reason}:${hitTerms.join("/")}`));
      matchedTerms.push(...hitTerms);
    }
  });

  if (weights.size === 0) {
    (REGION_INSIGHTS[filters.region] || REGION_INSIGHTS["全球"]).opportunityTracks.forEach((track) =>
      addWeight(weights, reasons, track, 2, `region-default:${filters.region}`)
    );
  }

  const focusTracks = [...weights.entries()]
    .sort((a, b) => b[1] - a[1] || TRACK_ORDER.indexOf(a[0]) - TRACK_ORDER.indexOf(b[0]))
    .map(([track]) => track);

  return {
    weights,
    reasons,
    matchedTerms: uniqueBy(matchedTerms, (item) => normalizeText(item)),
    directTracks: [...directTracks],
    focusTracks,
    powerTracks: focusTracks.filter((track) => POWER_TRACKS.includes(track)),
    liquidTracks: focusTracks.filter((track) => LIQUID_TRACKS.includes(track)),
    hasAiContext: TRACK_INFERENCE_RULES[2].terms.some((term) => includesText(question, term)),
    hasTrackFocus: directTracks.size > 0,
  };
};

export const classifyQuestion = (question) => {
  const cleanQuestion = String(question || "");
  const namedCompanies = extractNamedCompanies(cleanQuestion);
  const hasCompareLanguage = QUESTION_TYPES.company_compare.keywords.some((keyword) => includesText(cleanQuestion, keyword));
  if (namedCompanies.length >= 2 || (namedCompanies.length >= 1 && hasCompareLanguage)) return "company_compare";

  const scoredTypes = Object.values(QUESTION_TYPES).map((type) => ({
    type: type.label,
    score: type.keywords.reduce((sum, keyword) => sum + (includesText(cleanQuestion, keyword) ? 1 : 0), 0),
  }));
  const best = scoredTypes.sort((a, b) => b.score - a.score)[0];
  return best?.score > 0 ? best.type : "generic_insight";
};

const roleViewTitle = (role) => {
  if (role === "投资者") return "Investment View";
  if (role === "产品") return "Product View";
  if (role === "市场") return "Market View";
  if (role === "研发") return "R&D View";
  return "Executive View";
};

const roleSpecificProductBoost = (product, filters, questionType) => {
  const attractiveness = ratingScore(product.marketAttractiveness);
  const urgency = ratingScore(product.customerUrgency);
  const feasibility = ratingScore(product.technicalFeasibility);
  const priority = ratingScore(product.recommendedPriority);
  const competition = inverseCompetitionScore(product.competitionIntensity);
  const supplyChain = supplyChainScore(product.supplyChainMaturity);

  let score = 0;
  if (filters.role === "投资者") score += attractiveness * 5 + supplyChain * 3 + competition * 3;
  if (filters.role === "高管") score += priority * 4 + attractiveness * 4 + urgency * 3;
  if (filters.role === "产品") score += feasibility * 5 + urgency * 3 + priority * 2;
  if (filters.role === "市场") score += urgency * 5 + attractiveness * 3 + competition * 2;
  if (filters.role === "研发") score += feasibility * 5 + supplyChain * 2 + priority * 2;

  if (questionType === "technology_analysis") score += feasibility * 4;
  if (questionType === "product_planning") score += feasibility * 4 + urgency * 3;
  if (questionType === "market_opportunity") score += attractiveness * 4 + urgency * 4;
  if (questionType === "investment_view") score += attractiveness * 4 + supplyChain * 3 + competition * 3;
  return score;
};

const scoreProduct = (product, filters, questionType, trackContext) => {
  let matchScore = 0;
  const trackWeight = trackContext.weights.get(product.track) || 0;
  matchScore += trackWeight * 5;
  if (trackContext.hasTrackFocus && trackWeight === 0) matchScore -= questionType === "product_planning" ? 14 : 10;

  if (filters.customer !== "全部" && arrayIncludes(product.targetCustomers, filters.customer)) matchScore += 14;
  if (filters.application !== "全部" && arrayIncludes(product.applications, filters.application)) matchScore += 12;
  if (filters.region !== "全球" && arrayIncludes(product.regionRelevance, filters.region)) matchScore += 10;
  if (filters.region === "全球" && arrayIncludes(product.regionRelevance, "全球")) matchScore += 4;
  matchScore += roadmapScore(product.roadmapStage, filters.time);

  const baseScore =
    ratingScore(product.recommendedPriority) * 6 +
    ratingScore(product.marketAttractiveness) * 5 +
    ratingScore(product.customerUrgency) * 4 +
    ratingScore(product.technicalFeasibility) * 4 +
    inverseCompetitionScore(product.competitionIntensity) * 2 +
    supplyChainScore(product.supplyChainMaturity) * 2;

  return {
    ...product,
    trackWeight,
    matchScore,
    insightScore: matchScore + baseScore + roleSpecificProductBoost(product, filters, questionType),
  };
};

const scoreCompany = (company, filters, questionType, trackContext, namedCompanies) => {
  let matchScore = 0;
  const namedIndex = namedCompanies.findIndex((item) => item.id === company.id);

  company.track.forEach((track) => {
    matchScore += (trackContext.weights.get(track) || 0) * 4;
  });

  if (namedIndex >= 0) matchScore += 120 - namedIndex * 20;
  if (questionType === "company_compare" && namedCompanies.length >= 2 && namedIndex < 0) matchScore -= 20;
  if (trackContext.hasTrackFocus && company.track.every((track) => !trackContext.weights.get(track))) matchScore -= 10;
  if (filters.region !== "全球" && company.region === filters.region) matchScore += 12;
  if (filters.region === "全球") matchScore += 3;
  if (arrayIncludes(company.roleFit, filters.role)) matchScore += 10;

  if (filters.role === "投资者" && arrayIncludes(company.roleFit, "投资者")) matchScore += 10;
  if (filters.role === "高管" && arrayIncludes(company.roleFit, "高管")) matchScore += 8;
  if (filters.role === "产品" && arrayIncludes(company.roleFit, "产品")) matchScore += 8;
  if (filters.role === "市场" && arrayIncludes(company.roleFit, "市场")) matchScore += 8;
  if (filters.role === "研发" && arrayIncludes(company.roleFit, "研发")) matchScore += 8;

  return {
    ...company,
    matchScore,
    insightScore: matchScore + Number(company.score || 0) * 5,
  };
};

const scoreTech = (tech, filters, trackContext, questionType) => {
  const trackWeight = trackContext.weights.get(normalizeTrackTerm(tech.tech)) || 0;
  let matchScore = trackWeight * 5;
  if (trackContext.hasTrackFocus && trackWeight === 0) matchScore -= questionType === "technology_analysis" ? 12 : 8;

  if (filters.track !== "全部" && includesText(tech.tech, filters.track)) matchScore += 12;
  if (includesText(questionType, "technology")) matchScore += 4;
  if (filters.role === "研发") matchScore += ratingScore(tech.maturity) * 3 + inverseCompetitionScore(tech.risk) * 2;
  if (filters.role === "产品") matchScore += ratingScore(tech.standard) * 2;

  return {
    ...tech,
    trackWeight,
    matchScore,
    insightScore:
      matchScore +
      ratingScore(tech.maturity) * 4 +
      ratingScore(tech.standard) * 3 +
      inverseCompetitionScore(tech.risk) * 2 +
      inverseCompetitionScore(tech.costRisk) * 2,
  };
};

const scorePainPoint = (painPoint, filters, trackContext) => {
  let matchScore = 0;
  if (filters.customer !== "全部" && painPoint.customer === filters.customer) matchScore += 18;
  if (filters.application !== "全部" && arrayIncludes(painPoint.applications, filters.application)) matchScore += 14;
  painPoint.affectedTracks.forEach((track) => {
    matchScore += (trackContext.weights.get(track) || 0) * 3;
  });
  if (filters.customer === "全部" && filters.application === "全部") matchScore += 4;

  return {
    ...painPoint,
    matchScore,
    insightScore: matchScore + ratingScore(painPoint.confidence) * 3,
  };
};

const scoreSignal = (signal, filters, trackContext) => {
  let matchScore = 0;
  if (arrayIncludes(signal.targetRoles, filters.role)) matchScore += 12;
  if (filters.region !== "全球" && arrayIncludes(signal.regionRelevance, filters.region)) matchScore += 8;
  if (filters.region === "全球" && arrayIncludes(signal.regionRelevance, "全球")) matchScore += 3;
  signal.affectedTracks.forEach((track) => {
    matchScore += (trackContext.weights.get(track) || 0) * 3;
  });

  return {
    ...signal,
    matchScore,
    insightScore: matchScore + ratingScore(signal.impact) * 4 + ratingScore(signal.conf || signal.confidence) * 3,
  };
};

const dedupeTracks = (tracks) => uniqueBy(tracks.map(normalizeTrackTerm), (item) => item);

const selectPrimaryCompanies = (questionType, namedCompanies, rankedCompanies) => {
  if (questionType === "company_compare" && namedCompanies.length >= 2) {
    return uniqueBy(namedCompanies.slice(0, 2), (item) => item.id);
  }
  if (questionType === "company_compare" && namedCompanies.length === 1) {
    const fallback = rankedCompanies.find((company) => company.id !== namedCompanies[0].id);
    return uniqueBy([namedCompanies[0], fallback].filter(Boolean), (item) => item.id);
  }
  return uniqueBy(rankedCompanies.slice(0, 2), (item) => item.id);
};

const getRankedContext = (question, filters, questionType) => {
  const namedCompanies = extractNamedCompanies(question);
  const trackContext = inferTrackContext(question, filters);

  const products = uniqueBy(
    PRODUCT_OPPORTUNITIES.map((product) => scoreProduct(product, filters, questionType, trackContext)).sort(
      (a, b) => b.insightScore - a.insightScore
    ),
    (item) => item.track
  );

  const companies = uniqueBy(
    COMPANIES.map((company) => scoreCompany(company, filters, questionType, trackContext, namedCompanies)).sort(
      (a, b) => b.insightScore - a.insightScore
    ),
    (item) => item.id
  );

  const namedRankedCompanies = namedCompanies.map((company) => companies.find((item) => item.id === company.id) || company);
  const primaryCompanies = selectPrimaryCompanies(questionType, namedRankedCompanies, companies);
  const referenceCompanies = companies.filter((company) => !primaryCompanies.some((item) => item.id === company.id)).slice(0, 3);

  const techs = uniqueBy(
    TECH_MATRIX.map((tech) => scoreTech(tech, filters, trackContext, questionType)).sort((a, b) => b.insightScore - a.insightScore),
    (item) => normalizeTrackTerm(item.tech)
  );

  const painPoints = uniqueBy(
    CUSTOMER_PAIN_POINTS.map((painPoint) => scorePainPoint(painPoint, filters, trackContext)).sort(
      (a, b) => b.insightScore - a.insightScore
    ),
    (item) => `${item.customer}-${item.currentPain}`
  );

  const signals = uniqueBy(
    INTELLIGENCE_SIGNALS.map((signal) => scoreSignal(signal, filters, trackContext)).sort((a, b) => b.insightScore - a.insightScore),
    (item) => item.title
  );

  return {
    namedCompanies,
    trackContext,
    products,
    companies,
    primaryCompanies,
    referenceCompanies,
    techs,
    painPoints,
    signals,
    regionInsight: REGION_INSIGHTS[filters.region] || REGION_INSIGHTS["全球"],
    globalInsight: REGION_INSIGHTS["全球"],
    chinaInsight: REGION_INSIGHTS["中国"],
  };
};

const getCompanyProfile = (company) => COMPANY_PROFILES[company?.name] || {};

const customerFitLabel = (company, filters) => {
  const customerAccess = getCompanyProfile(company).customerAccess || [];
  if (filters.customer === "全部") return customerAccess.length > 0 ? customerAccess.join("、") : "未在当前规则中细分";
  if (customerAccess.includes(filters.customer)) return `${filters.customer} 进入效率更高`;
  return `${filters.customer} 需通过方案适配或渠道补位`;
};

const regionFitLabel = (company, filters) => {
  const profile = getCompanyProfile(company);
  if (filters.region === "全球") return profile.regionalAdvantage || `${company.region} 出发，全球相关性取决于具体渠道。`;
  if (company.region === filters.region) return `与当前区域 ${filters.region} 直接匹配。`;
  if (company.name === "Huawei Digital Power" && ["北美", "欧洲"].includes(filters.region)) {
    return `在 ${filters.region} 受地缘和合规限制，进入壁垒显著更高。`;
  }
  return `在 ${filters.region} 需要依赖本地伙伴、认证与项目型突破。`;
};

const coverageText = (company, focusTracks) => {
  const covered = dedupeTracks(company.track.filter((track) => focusTracks.includes(track)));
  const missing = dedupeTracks(focusTracks.filter((track) => !covered.includes(track)));
  return {
    covered,
    missing,
    text: covered.length > 0 ? `直接覆盖 ${covered.join("、")}` : "对当前重点赛道没有直接覆盖",
  };
};

const implicationLines = (context, filters) => {
  const lines = [];
  const seen = new Set();

  context.products.forEach((product) => {
    if (lines.length >= 4 || seen.has(product.track)) return;
    seen.add(product.track);
    lines.push(
      `${product.track}: 面向 ${decisionScope(filters)}，优先级 ${product.recommendedPriority}，建议 ${product.action}；差异化要点是 ${product.diff}，规格焦点是 ${product.specs}。`
    );
  });

  context.techs.forEach((tech) => {
    const normalizedTrack = normalizeTrackTerm(tech.tech);
    if (lines.length >= 6 || seen.has(normalizedTrack)) return;
    seen.add(normalizedTrack);
    lines.push(
      `${tech.tech}: 当前成熟度 ${tech.maturity}，标准化 ${tech.standard}；研发重点是 ${tech.rnd}，工程动作应聚焦 ${tech.action}。`
    );
  });

  return lines;
};

const riskLines = (context, filters) => {
  const seen = new Set();
  const lines = [];

  context.products.forEach((product) => {
    if (lines.length >= 4 || seen.has(product.track)) return;
    seen.add(product.track);
    lines.push(`${product.track}: ${product.risk}；当前数据边界是 ${product.caveat}。`);
  });

  lines.push(`${filters.region}: 区域进入风险主要来自 ${context.regionInsight.entryRisk}。`);
  return lines;
};

const buildRecommendedActions = (context, filters) => {
  const topTracks = context.products.slice(0, 3).map((product) => product.track).join("、");
  const leadSignal = context.signals[0];
  const leadPain = context.painPoints[0];

  if (filters.role === "投资者") {
    return [
      `优先观察 ${topTracks} 的订单兑现顺序，区分真正受益于 ${filters.time} 年 AI capex 的主线与故事性赛道。`,
      `把订单可见度、毛利率稳定性和产能兑现作为筛选门槛，避免只因“AI”标签而高估估值弹性。`,
      `跟踪 ${leadSignal?.trackingAction || "头部客户导入、标准化和量产节奏"}，作为判断赛道从主题走向业绩的触发器。`,
      `若面向 ${filters.region}市场，需单独评估政策、地缘政治和客户集中度，而不是只看技术领先性。`,
    ];
  }

  if (filters.role === "高管") {
    return [
      `资源配置上把 ${topTracks} 分成“基本盘、重点投入、前瞻布局”，避免所有赛道同时重投。`,
      `围绕 ${leadPain?.customer || "关键客户"} 的采购标准补齐组织能力，尤其是交付、服务和生态合作短板。`,
      `用 ${leadSignal?.trackingAction || "标准化与头部客户验证"} 作为跨部门里程碑，统一销售、产品和研发节奏。`,
      `在 ${filters.region}市场优先建立可复制方案包，再扩展到相邻客户和应用场景。`,
    ];
  }

  if (filters.role === "产品") {
    return [
      `按 ${filters.time} 年窗口重排路线图，围绕 ${topTracks} 定义主 SKU、相邻 SKU 和预研方向。`,
      `规格定义必须回到 ${decisionScope(filters)} 的客户痛点，优先兑现 ${leadPain?.buyingCriteria || "可靠性、交付速度与 TCO"}。`,
      `把 ${leadSignal?.affectedTracks?.join("、") || topTracks} 做成可组合方案，而不是孤立单品。`,
      `对重复或边际收益低的功能做瘦身，把研发资源集中到差异化点和可量产规格上。`,
    ];
  }

  if (filters.role === "市场") {
    return [
      `围绕 ${leadPain?.customer || "高优先级客户"} 的核心痛点重写 GTM 话术，主打 ${leadPain?.marketTalkTrack || "低 PUE、可靠性和交付速度"}。`,
      `把 ${topTracks} 的价值拆成“客户收益、实施门槛、竞争差异”三层，而不是只讲技术先进。`,
      `竞品话术上应强调当前区域 ${filters.region} 的交付、服务和生态能力，而非单一参数领先。`,
      `针对 ${applicationFocus(filters)} 场景建立行业案例模板，提高销售线索筛选效率。`,
    ];
  }

  return [
    `研发优先级围绕 ${topTracks} 排序，先解决 ${decisionScope(filters)} 下最可能阻碍量产的可靠性和标准化问题。`,
    `对 ${leadSignal?.affectedTracks?.join("、") || topTracks} 建立验证矩阵，覆盖器件、系统、交付和运维场景。`,
    `重点跟踪 ${leadSignal?.trackingAction || "标准化、互操作性和供应链验证"}，避免技术路线先行但工程闭环不足。`,
    `在 ${filters.region}市场的 ${applicationFocus(filters)} 场景下优先做可重复验证项目，再扩展到更高风险场景。`,
  ];
};

const confidenceLevel = (context, questionType) => {
  const directCompanies = context.namedCompanies.length;
  const directTracks = context.trackContext.focusTracks.length;
  if (questionType === "company_compare" && directCompanies >= 2 && directTracks >= 2) return "High";
  if (directCompanies >= 1 || directTracks >= 2) return "Medium-High";
  return "Medium";
};

const buildExecutiveConclusion = (context, filters, questionType) => {
  const topTracks = context.products.slice(0, 3).map((item) => item.track).join("、");
  const regionSummary = context.regionInsight;
  const chinaSummary = context.chinaInsight;
  const driverText =
    filters.region === "全球"
      ? `全球主线由 ${context.globalInsight.demandDriver} 驱动，中国市场则更受 ${chinaSummary.demandDriver} 与 ${chinaSummary.entryRisk} 约束。`
      : `${filters.region} 当前由 ${regionSummary.demandDriver} 驱动，中国市场对照下更突出 ${chinaSummary.demandDriver}。`;

  if (questionType === "investment_view") {
    return `${driverText} 在 ${audienceContext(filters)} 下，更应把 ${topTracks} 看成“增长弹性、订单可见度和利润率质量”的组合题，而不是简单赛道排名；风险边界在 ${regionSummary.entryRisk}。`;
  }

  if (questionType === "product_planning") {
    return `${driverText} 面向 ${decisionScope(filters)}，${topTracks} 应按“量产主线、相邻扩展、前瞻预研”拆层规划；中国市场更强调交付速度和价格压力，全球市场更看生态兼容与系统级能力；风险边界在 ${regionSummary.entryRisk}。`;
  }

  if (questionType === "technology_analysis") {
    return `${driverText} 当前问题不应只看单一技术优劣，而要判断它在 ${decisionScope(filters)} 中是否真正改善 TCO、交付速度和可靠性；当前更值得聚焦 ${topTracks}，风险边界在 ${regionSummary.entryRisk}。`;
  }

  return `${driverText} 在 ${audienceContext(filters)} 下，${topTracks} 是 ${filters.time} 年窗口最值得优先验证的主线，但不同区域、客户类型和应用场景下的胜出逻辑并不相同；风险边界在 ${regionSummary.entryRisk}。`;
};

const buildStrategicAnalysis = (context, filters, questionType) => {
  if (questionType === "technology_analysis") {
    return list(
      context.techs.slice(0, 4).map(
        (tech) =>
          `${tech.tech}: ${fitScoreText(tech.insightScore, 120)}，成熟度 ${tech.maturity}，标准化 ${tech.standard}；研发重点是 ${tech.rnd}，主要工程边界是 ${tech.caveat}。`
      )
    );
  }

  if (questionType === "product_planning") {
    return list(
      context.products.slice(0, 4).map(
        (product) =>
          `${product.track}: ${fitScoreText(product.insightScore, 320)}，${product.roadmapStage} 适配 ${decisionScope(filters)}，优先级 ${product.recommendedPriority}；应围绕 ${product.specs} 和 ${product.diff} 形成 SKU。`
      )
    );
  }

  if (questionType === "investment_view") {
    return list(
      context.products.slice(0, 4).map(
        (product) =>
          `${product.track}: ${fitScoreText(product.insightScore, 320)}，吸引力 ${product.marketAttractiveness}，竞争强度 ${product.competitionIntensity}，供应链成熟度 ${product.supplyChainMaturity}；更接近 ${product.recommendedPriority} 的配置优先级。`
      )
    );
  }

  return list(
    context.products.slice(0, 4).map(
      (product) =>
        `${product.track}: ${fitScoreText(product.insightScore, 320)}，核心驱动是 ${product.drive}；客户紧迫度 ${product.customerUrgency}，差异化在 ${product.diff}。`
    )
  );
};

const buildGenericAnswer = (question, filters, questionType, context) => {
  const marketTracks = context.products.slice(0, 4).map((product) => `${product.track}(${product.recommendedPriority})`).join("、");
  const keyDrivers = [
    ...context.painPoints.slice(0, 2).map(
      (painPoint) =>
        `${painPoint.customer}: 在 ${painPoint.applications.join("、")} 场景里，当前痛点是 ${cleanClause(painPoint.currentPain)}；采购标准集中在 ${cleanClause(painPoint.buyingCriteria)}。`
    ),
    ...context.signals.slice(0, 2).map((signal) => `${signal.title}: ${signal.expertInterpretation}`),
  ];

  return `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Executive Conclusion
${buildExecutiveConclusion(context, filters, questionType)}

Market Context
${list([
    `${filters.region} 当前需求主驱动力是 ${context.regionInsight.demandDriver}。`,
    `${filters.region} 的基础设施约束是 ${context.regionInsight.gridConstraint}。`,
    `关键客户口径是 ${filters.customer === "全部" ? context.regionInsight.keyCustomers : `${filters.customer}客户`}，需要把采购标准、交付节奏和服务半径纳入判断。`,
    `在 ${filters.time} 年窗口下，最相关赛道是 ${marketTracks}。`,
  ])}

Key Drivers
${list(keyDrivers)}

Strategic Analysis
${buildStrategicAnalysis(context, filters, questionType)}

Product / Technology Implications
${list(implicationLines(context, filters))}

Risk Assessment
${list(riskLines(context, filters))}

Recommended Actions
${list(buildRecommendedActions(context, filters))}

Confidence Level
${confidenceLevel(context, questionType)}。当前判断基于产品机会、公司画像、技术矩阵、客户痛点、情报信号和区域洞察的交叉验证；评分为 0-100 的相对战略适配度，不代表实时市场份额或财务预测。

Data Caveats
1. 当前为本地规则版 V1.2.3，不调用后端、API、Gemini、OpenAI 或 Dify。
2. 数据来自 App 内置 expert-curated prototype data，适合做方向判断，不应直接替代正式市场数据库、客户访谈、年报、招标数据或产品手册。
3. 如果问题涉及公司财务、实时订单、股价、最新客户项目或政策更新，需要接入可审计外部数据后再形成正式结论。
`.trim();
};

const buildRoleSpecificCompareView = (companyA, companyB, context, filters) => {
  const profileA = getCompanyProfile(companyA);
  const profileB = getCompanyProfile(companyB);
  const customerLine = `${companyA.name} 更适合 ${customerFitLabel(companyA, filters)}，${companyB.name} 更适合 ${customerFitLabel(companyB, filters)}。`;

  if (filters.role === "投资者") {
    return [
      `${companyA.name}: ${cleanClause(profileA.investment || "高密 AI capex 带来的增长弹性")}；${companyB.name}: ${cleanClause(profileB.investment || "区域扩张与产品结构升级")}。`,
      `订单可见度应分拆为全球 hyperscale/Colo 项目、中国运营商项目和政企项目三类；${customerLine}`,
      `利润率判断要看方案层级：power + liquid cooling + 运维服务的组合方案更可能保住毛利，单点设备更容易进入价格战。`,
      `风险收益上，${companyA.name} 的主要压力是估值兑现和产能交付，${companyB.name} 的主要压力是海外合规与地缘边界。`,
    ];
  }

  if (filters.role === "高管") {
    return [
      `${companyA.name}: ${cleanClause(profileA.executive || "全栈资源配置型玩家")}；${companyB.name}: ${cleanClause(
        profileB.executive || "区域生态驱动型玩家"
      )}。`,
      `资源配置建议分三层：2026 年优先强化 MW 级模块化 UPS 与一体化电力模块，2027 年补齐液冷 CDU 与 BBU，2028 年以后跟踪 800VDC 生态成熟度。`,
      `组织能力上必须把电源、液冷、工程交付和售后运维纳入同一方案团队，否则高密 AI 项目会在接口责任和交付边界上失分。`,
      `生态合作上，全球项目更需要 GPU/机架/OCP 生态兼容，中国项目更需要运营商、总包和地方算力平台协同。`,
    ];
  }

  if (filters.role === "产品") {
    return [
      `${companyA.name}: ${cleanClause(profileA.product || "系统级集成与服务化")}；${companyB.name}: ${cleanClause(
        profileB.product || "预制化方案与本地适配"
      )}。`,
      `SKU 建议拆成三条：MW 级模块化 UPS 主 SKU、一体化电力模块方案 SKU、液冷 CDU + 快接头 + 监控软件组合 SKU。`,
      `规格优先级应先锁定 100kW+ 模块化功率密度、1.2MW-2.4MW 预制舱、CDU 可靠性和液路防漏，再考虑 800VDC 前瞻接口。`,
      `研发投入应集中在可量产、可交付、可服务的规格，不应在缺少客户验证时把 SST 或 800VDC 全量产品化。`,
    ];
  }

  if (filters.role === "市场") {
    return [
      `${companyA.name} 的 GTM 更适合 ${customerFitLabel(companyA, filters)}；${companyB.name} 的 GTM 更适合 ${customerFitLabel(companyB, filters)}。`,
      `竞争话术应先讲客户痛点：高密机柜导致供电与散热同步承压，再讲方案差异：全栈交付、预制化交付或本地生态。`,
      `全球市场卖点应突出低 PUE、服务网络和生态兼容；中国市场卖点应突出算电协同、快速交付、国产生态和项目回款可控。`,
      `对标参考只用于说明行业方向，不应让 Envic、EVE 等单赛道公司混入 Vertiv 与华为的主对比结论。`,
    ];
  }

  return [
    `${companyA.name}: ${cleanClause(profileA.rnd || "系统可靠性")}；${companyB.name}: ${cleanClause(profileB.rnd || "工程标准化")}。`,
    `技术成熟度判断应拆成三类：UPS 与微模块已经成熟，液冷 CDU 和 BBU 处于规模化验证期，800VDC 仍受标准和保护器件生态约束。`,
    `可靠性验证要覆盖液路泄漏、快接头寿命、冷板兼容、DC 保护和电源-液冷联动告警，不能只做单机测试。`,
    `工程风险集中在标准化接口、现场安装质量和跨系统责任边界，研发路线必须绑定项目验证。`,
  ];
};

const buildLiquidCoolingComparison = (companyA, companyB) => {
  const profileA = getCompanyProfile(companyA);
  const profileB = getCompanyProfile(companyB);
  const aHasLiquid = companyA.track.includes("液冷");
  const bHasLiquid = companyB.track.includes("液冷");
  const dataGap = "当前内置数据不足以判断细分部件强弱，需要引入产品手册和项目案例。";

  return list([
    `CDU: ${companyA.name} ${aHasLiquid ? "具备液冷方案入口" : "未体现直接 CDU 能力"}，${companyB.name} ${bHasLiquid ? "具备液冷方案入口" : "未体现直接 CDU 能力"}；${dataGap}`,
    `冷板: 两家公司均缺少可追溯的冷板规格、供应商和项目验证数据；现阶段只能判断系统集成方向，不能判断冷板部件强弱。`,
    `快接头: 当前内置数据只指出液冷需要防漏液快接头，未给出两家公司连接器体系、寿命测试和维护案例，因此不能做绝对排序。`,
    `防漏液: ${companyA.name} 的全球运维体系更有利于形成标准化防漏流程，${companyB.name} 的中国项目交付体系更有利于快速闭环现场问题；仍需项目级故障率数据验证。`,
    `运维体系: ${companyA.name} 更适合全球多区域服务一致性，${companyB.name} 更适合中国智算中心、运营商和政企项目的本地响应。`,
    `液冷与电源协同: ${profileA.liquidStrength || "液冷协同能力需进一步验证"} ${profileB.liquidStrength || "液冷协同能力需进一步验证"}；真正的竞争点是把 UPS、800VDC 或一体化电力模块与 CDU、监控和运维服务打成一个可交付包。`,
  ]);
};

const buildChineseVendorImplications = (context, filters) => {
  const topTracks = context.products.slice(0, 4).map((product) => product.track);
  return list([
    `产品组合: 中国 UPS 和电力电子厂商不应只做单点 UPS，应把 ${joinTracks(["模块化 UPS", "一体化电力模块", "液冷", "BBU"])} 组合成可报价、可交付、可运维的高密 AI 方案。`,
    `三年路线图: 短期聚焦 MW 级模块化 UPS 与一体化电力模块，中期布局液冷 CDU、快接头、防漏液运维和 BBU，长期跟踪 800VDC 标准、PSU 量产和头部客户导入。`,
    `研发边界: 在缺少客户验证和标准确认前，不宜过度押注 SST 或 800VDC 全量产品化；更务实的动作是预留接口、做样机验证和参与生态标准。`,
    `市场进入: 在 ${audienceContext(filters)} 下，应优先用 ${joinTracks(topTracks)} 建立示范项目，再把经验复制到运营商、Colo 和政企智算中心。`,
  ]);
};

const buildScenarioFinalJudgment = (companyA, companyB, context) => {
  const hasVertiv = [companyA.name, companyB.name].includes("Vertiv");
  const hasHuawei = [companyA.name, companyB.name].includes("Huawei Digital Power");

  if (hasVertiv && hasHuawei) {
    return list([
      `全球 hyperscale / Colo: Vertiv 更强，原因是全球服务网络、端到端电源与热管理组合、AI 数据中心项目可及性更完整；风险是估值和产能兑现压力。`,
      `中国智算中心 / 运营商 / 政企: 华为更强，原因是本地生态、运营商关系、预制化电力模块和算电协同能力更贴近项目机制；风险是海外扩张边界和价格竞争。`,
      `产品规划参考: 学 Vertiv 的 power + liquid cooling + 运维服务整合能力，学华为的一体化电力模块、微模块、工程交付和本地生态打法。`,
      `风险边界: 不能把全球结论直接外推到中国，也不能把中国政企/运营商优势外推到北美 hyperscale；800VDC 和液冷细分部件强弱仍需产品手册、项目案例和客户验证补足。`,
    ]);
  }

  return list([
    `全球 hyperscale / Colo: 优先选择全球渠道、服务网络和高密 AI 项目验证更强的一方，不能只看公司体量。`,
    `中国智算中心 / 运营商 / 政企: 优先选择本地生态、交付速度、回款节奏和合规能力更强的一方。`,
    `产品规划参考: 学习主分析对象在电源、液冷、预制化模块和运维服务上的组合能力，而不是复制单点产品。`,
    `风险边界: 当前结论来自内置规则数据，不能外推到实时订单份额、项目中标概率或财务预测。`,
  ]);
};

const buildCompanyCompareAnswer = (question, filters, context) => {
  const [companyA, companyB] = context.primaryCompanies;
  const roleTitle = roleViewTitle(filters.role);
  const compareTracks = context.trackContext.focusTracks.length > 0 ? context.trackContext.focusTracks : dedupeTracks([...companyA.track, ...companyB.track]);
  const powerFocus = compareTracks.filter((track) => POWER_TRACKS.includes(track));
  const liquidFocus = compareTracks.filter((track) => LIQUID_TRACKS.includes(track));
  const companyACoverage = coverageText(companyA, compareTracks);
  const companyBCoverage = coverageText(companyB, compareTracks);
  const companyAPowerCoverage = coverageText(companyA, powerFocus);
  const companyBPowerCoverage = coverageText(companyB, powerFocus);
  const profileA = getCompanyProfile(companyA);
  const profileB = getCompanyProfile(companyB);
  const referenceText = context.referenceCompanies.length > 0 ? context.referenceCompanies.map((company) => company.name).join("、") : "无";
  const chinaLeader = companyA.name === "Huawei Digital Power" || companyB.name === "Huawei Digital Power" ? "华为在中国市场的组织与生态优势更明显" : "中国市场更偏向本地交付、价格和合规能力";
  const globalLeader =
    companyA.name === "Vertiv" || companyB.name === "Vertiv"
      ? "Vertiv 在全球 hyperscale / Colo 场景的可及性通常更强"
      : `${companyA.name} 与 ${companyB.name} 的全球竞争力更多取决于区域渠道与生态合作`;

  return `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Comparison Scope
${list([
    `主分析对象锁定为 ${companyA.name}${companyA.nameZh ? `（${companyA.nameZh}）` : ""} 与 ${companyB.name}${companyB.nameZh ? `（${companyB.nameZh}）` : ""}；辅助参考仅限 ${referenceText}，不进入主排名。`,
    `当前比较口径面向 ${audienceContext(filters)}，并优先围绕问题显式提到的赛道 ${compareTracks.join("、")}。`,
    `若问题包含“电源”，本次默认映射到 ${dedupeTracks(powerFocus).join("、")}；若包含“液冷”，本次默认映射到 ${liquidFocus.length > 0 ? "液冷 / CDU / 冷板 / 快接头 / 防漏液 / 热管理" : "液冷相关工程能力"}。`,
  ])}

Company A Position
${companyA.name}${companyA.nameZh ? `（${companyA.nameZh}）` : ""} 当前 ${companyACoverage.text}。核心定位是 ${companyA.desc} 优势在 ${companyA.opportunity}；边界在 ${companyA.limitation}。从当前筛选条件看，${profileA.powerStrength || companyA.scoreExplanation} ${regionFitLabel(companyA, filters)}

Company B Position
${companyB.name}${companyB.nameZh ? `（${companyB.nameZh}）` : ""} 当前 ${companyBCoverage.text}。核心定位是 ${companyB.desc} 优势在 ${companyB.opportunity}；边界在 ${companyB.limitation}。从当前筛选条件看，${profileB.powerStrength || companyB.scoreExplanation} ${regionFitLabel(companyB, filters)}

Power Infrastructure Comparison
${list([
    `${companyA.name}: ${profileA.powerStrength || companyAPowerCoverage.text} 当前 power focus 覆盖 ${companyAPowerCoverage.covered.join("、") || "不足"}。`,
    `${companyB.name}: ${profileB.powerStrength || companyBPowerCoverage.text} 当前 power focus 覆盖 ${companyBPowerCoverage.covered.join("、") || "不足"}。`,
    `结论: 在当前问题的电源范围里，更应比较 UPS / 模块化 UPS / 800VDC / 一体化电力模块 / 微模块 / BBU / GaN/SiC 的组合，而不是把变压器等未点名赛道混入主结论。`,
  ])}

Liquid Cooling Comparison
${list([
    `${companyA.name}: ${profileA.liquidStrength || (companyA.track.includes("液冷") ? "具备液冷能力" : "液冷覆盖较弱")} ${companyA.track.includes("液冷") ? "当前可直接进入液冷比较。" : "当前不应被视为液冷主选手。 "}`,
    `${companyB.name}: ${profileB.liquidStrength || (companyB.track.includes("液冷") ? "具备液冷能力" : "液冷覆盖较弱")} ${companyB.track.includes("液冷") ? "当前可直接进入液冷比较。" : "当前不应被视为液冷主选手。 "}`,
    `结论: 对液冷能力的判断必须落到 CDU、冷板、快接头、防漏液与运维体系，而不是只看是否“有液冷标签”。`,
  ])}

Regional Advantage
${list([
    `全球视角: ${globalLeader}，因为全球市场更看重 hyperscale 可及性、液冷项目验证、服务网络和合规可进入性。`,
    `中国市场视角: ${chinaLeader}，因为中国项目更强调算电协同、预制化交付、本地生态与回款节奏。`,
    `当前区域 ${filters.region} 下，${companyA.name} 的区域匹配度判断为“${regionFitLabel(companyA, filters)}”；${companyB.name} 的区域匹配度判断为“${regionFitLabel(companyB, filters)}”。`,
  ])}

Customer Access
${list([
    `${companyA.name}: 当前客户可进入性更偏 ${customerFitLabel(companyA, filters)}。`,
    `${companyB.name}: 当前客户可进入性更偏 ${customerFitLabel(companyB, filters)}。`,
    `若客户和应用场景已经明确，更应比较客户关系深度、交付模板和服务网络，而不是只比较公司体量。`,
  ])}

${roleTitle}
${list(buildRoleSpecificCompareView(companyA, companyB, context, filters))}

Key Risks
${list([
    `${companyA.name}: ${companyA.limitation}；数据边界是 ${companyA.caveat}。`,
    `${companyB.name}: ${companyB.limitation}；数据边界是 ${companyB.caveat}。`,
    `共同风险: 当前问题涉及的 ${compareTracks.join("、")} 仍受 ${context.regionInsight.entryRisk} 以及标准化、供应链和客户导入节奏影响。`,
    `结论边界: 其他公司只作为辅助参考，不进入本次主判断。`,
  ])}

Final Judgment
全球视角下，${globalLeader}；中国市场视角下，${chinaLeader}。如果问题聚焦 AI 数据中心的电源 + 液冷组合，${companyA.name} 与 ${companyB.name} 的差异不在“谁更大”，而在“谁对当前区域、客户类型和应用场景更匹配”。在 ${audienceContext(filters)} 下，更优先的一方应同时满足 power infrastructure 覆盖、liquid cooling 交付能力、客户可进入性和风险可控性四个条件；风险边界主要来自 ${context.regionInsight.entryRisk}、标准化成熟度和客户导入节奏。

Confidence Level
${confidenceLevel(context, "company_compare")}。当前判断基于点名公司实体抽取、问题内赛道映射、公司画像、产品机会、技术矩阵、客户痛点和区域洞察的交叉匹配；主对象战略适配度分别为 ${normalizeScore(companyA.insightScore, 330)}/100 和 ${normalizeScore(companyB.insightScore, 330)}/100。

Data Caveats
1. 当前为本地规则版 V1.2.3，不调用后端、API、Gemini、OpenAI 或 Dify。
2. 公司对比优先基于 App 内置 company / product / tech / signal 数据和规则映射，适合做战略与产品判断，不应替代实时订单、财务披露或项目数据库。
3. 若需要形成正式投资结论或商务竞争判断，仍需补充年报、项目落地、价格体系、渠道深度和客户验证数据。
`.trim();
};

const buildCompanyCompareReport = (question, filters, context) => {
  const [companyA, companyB] = context.primaryCompanies;
  const compareTracks =
    context.trackContext.focusTracks.length > 0 ? context.trackContext.focusTracks : dedupeTracks([...companyA.track, ...companyB.track]);
  const powerFocus = compareTracks.filter((track) => POWER_TRACKS.includes(track));
  const liquidFocus = compareTracks.filter((track) => LIQUID_TRACKS.includes(track));
  const companyACoverage = coverageText(companyA, compareTracks);
  const companyBCoverage = coverageText(companyB, compareTracks);
  const companyAPowerCoverage = coverageText(companyA, powerFocus);
  const companyBPowerCoverage = coverageText(companyB, powerFocus);
  const profileA = getCompanyProfile(companyA);
  const profileB = getCompanyProfile(companyB);
  const referenceText = context.referenceCompanies.length > 0 ? context.referenceCompanies.map((company) => company.name).join("、") : "无";
  const chinaLeader =
    companyA.name === "Huawei Digital Power" || companyB.name === "Huawei Digital Power"
      ? "华为在中国市场的组织与生态优势更明显"
      : "中国市场更偏向本地交付、价格和合规能力";
  const globalLeader =
    companyA.name === "Vertiv" || companyB.name === "Vertiv"
      ? "Vertiv 在全球 hyperscale / Colo 场景的可及性通常更强"
      : `${companyA.name} 与 ${companyB.name} 的全球竞争力更多取决于区域渠道与生态合作`;
  const powerScope = powerFocus.length > 0 ? joinTracks(powerFocus) : "UPS、模块化 UPS、HVDC、800VDC、一体化电力模块、微模块、BBU、GaN/SiC";
  const liquidScope = liquidFocus.length > 0 ? joinTracks(liquidFocus) : "液冷、CDU、冷板、快接头、防漏液、热管理";

  return `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Comparison Scope
${list([
    `主分析对象锁定为 ${companyA.name}${companyA.nameZh ? `（${companyA.nameZh}）` : ""} 与 ${companyB.name}${companyB.nameZh ? `（${companyB.nameZh}）` : ""}；${
      referenceText === "无" ? "本次没有引入辅助参考公司。" : `辅助参考仅限 ${referenceText}，用于校准行业节奏，不进入主排名。`
    }`,
    `本次比较面向 ${audienceContext(filters)}，优先围绕问题显式提到的赛道 ${joinTracks(compareTracks)}，避免把未点名赛道混入主结论。`,
    `电源口径映射到 ${powerScope}；液冷口径映射到 ${liquidScope}。`,
  ])}

Executive Conclusion
在 ${audienceContext(filters)} 下，${companyA.name} 与 ${companyB.name} 的核心差异不是单点规模，而是“全球高密项目交付能力”和“中国本地生态交付能力”的取舍。${globalLeader}；${chinaLeader}。若目标是全球 hyperscale / Colo 项目，应优先学习和评估 Vertiv 的全栈方案、服务网络和跨区域交付；若目标是中国智算中心、运营商和政企项目，应优先评估华为的预制化电力模块、本地生态和算电协同。结论边界是：液冷细分部件强弱、800VDC 量产节奏和真实订单份额仍需外部产品手册与项目数据验证。

Company A Strategic Position
${companyA.name}${companyA.nameZh ? `（${companyA.nameZh}）` : ""}: ${fitScoreText(companyA.insightScore, 330)}。当前 ${companyACoverage.text}，核心定位是 ${companyA.desc} 主要机会在 ${companyA.opportunity}，主要边界是 ${companyA.limitation}。从 ${audienceContext(filters)} 看，${profileA.powerStrength || companyA.scoreExplanation} ${regionFitLabel(companyA, filters)}

Company B Strategic Position
${companyB.name}${companyB.nameZh ? `（${companyB.nameZh}）` : ""}: ${fitScoreText(companyB.insightScore, 330)}。当前 ${companyBCoverage.text}，核心定位是 ${companyB.desc} 主要机会在 ${companyB.opportunity}，主要边界是 ${companyB.limitation}。从 ${audienceContext(filters)} 看，${profileB.powerStrength || companyB.scoreExplanation} ${regionFitLabel(companyB, filters)}

Power Infrastructure Comparison
${list([
    `${companyA.name}: ${profileA.powerStrength || companyAPowerCoverage.text} 当前电源覆盖重点为 ${companyAPowerCoverage.covered.join("、") || "不足"}。`,
    `${companyB.name}: ${profileB.powerStrength || companyBPowerCoverage.text} 当前电源覆盖重点为 ${companyBPowerCoverage.covered.join("、") || "不足"}。`,
    `结论: 当前电源范围应聚焦 UPS / 模块化 UPS / 800VDC / 一体化电力模块 / 微模块 / BBU / GaN/SiC；变压器等未点名赛道只能作为基础设施背景，不进入主对比。`,
  ])}

Liquid Cooling Capability Comparison
${buildLiquidCoolingComparison(companyA, companyB)}

Regional and Customer Access
${list([
    `全球视角: ${globalLeader}，因为全球市场更看重 hyperscale 可及性、液冷项目验证、服务网络和合规可进入性。`,
    `中国市场视角: ${chinaLeader}，因为中国项目更强调算电协同、预制化交付、本地生态与回款节奏。`,
    `${companyA.name}: 客户可进入性更偏 ${customerFitLabel(companyA, filters)}；${companyB.name}: 客户可进入性更偏 ${customerFitLabel(companyB, filters)}。`,
    `决策建议: 全球项目优先校验服务网络和生态认证，中国项目优先校验本地总包协同、交付模板和项目回款节奏。`,
  ])}

Role-Specific Decision View
${list(buildRoleSpecificCompareView(companyA, companyB, context, filters))}

Implications for Chinese Power Electronics Vendors
${buildChineseVendorImplications(context, filters)}

Key Risks
${list([
    `${companyA.name}: ${companyA.limitation}；数据边界是 ${companyA.caveat}。`,
    `${companyB.name}: ${companyB.limitation}；数据边界是 ${companyB.caveat}。`,
    `共同风险: 当前问题涉及的 ${joinTracks(compareTracks)} 仍受 ${context.regionInsight.entryRisk}、标准化、供应链和客户导入节奏影响。`,
    `液冷风险: CDU、冷板、快接头、防漏液和运维体系的细分强弱缺少产品手册与项目案例支撑，不能过度外推。`,
  ])}

Final Judgment
${buildScenarioFinalJudgment(companyA, companyB, context)}

Confidence Level
${confidenceLevel(context, "company_compare")}。评分为 0-100 的相对战略适配度，综合公司画像、赛道覆盖、区域进入、客户可及性和技术矩阵；该评分用于方向判断，不代表实时市占率、订单金额或股价判断。

Data Caveats
1. 当前为本地规则版 V1.2.3，不调用后端、API、Gemini、OpenAI 或 Dify。
2. 公司对比优先基于 App 内置 company / product / tech / signal 数据和规则映射，适合做战略与产品判断，不应替代实时订单、财务披露或项目数据库。
3. 若需要形成正式投资结论或商务竞争判断，仍需补充年报、项目落地、价格体系、渠道深度和客户验证数据。
`.trim();
};

const sanitizeOutput = (text) =>
  String(text || "")
    .replace(/[。]{2,}/g, "。")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const generateAskPowerInsightAnswer = (question, filters) => {
  const cleanQuestion = (question || "").trim() || "请基于当前筛选条件生成数据中心电力电子市场洞察";
  const questionType = classifyQuestion(cleanQuestion);
  const context = getRankedContext(cleanQuestion, filters, questionType);
  const answer =
    questionType === "company_compare"
      ? buildCompanyCompareReport(cleanQuestion, filters, context)
      : buildGenericAnswer(cleanQuestion, filters, questionType, context);

  return sanitizeOutput(answer);
};
