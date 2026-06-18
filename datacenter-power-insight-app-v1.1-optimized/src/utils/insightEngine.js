import {
  PRODUCT_OPPORTUNITIES,
  COMPANIES,
  TECH_MATRIX,
  CUSTOMER_PAIN_POINTS,
  INTELLIGENCE_SIGNALS,
  REGION_INSIGHTS,
} from "../data/marketData.js";

const QUESTION_TYPES = {
  product_investment_decision: {
    label: "product_investment_decision",
    keywords: [
      "是否需要",
      "值不值得",
      "要不要",
      "是否应该",
      "花资源",
      "投入资源",
      "开发",
      "立项",
      "全新一代",
      "新一代",
      "工业 UPS",
      "工业UPS",
      "industrial UPS",
    ],
  },
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
    terms: ["电源", "供电", "配电", "供配电", "power system", "power systems", "power infrastructure"],
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
  Kehua: ["Kehua", "科华", "科华数据"],
  Kstar: ["Kstar", "科士达"],
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

const PRODUCT_DECISION_INTENT_TERMS = [
  "是否需要",
  "是否值得",
  "值不值得",
  "要不要",
  "是否应该",
  "应不应该",
  "花资源",
  "投入资源",
  "投入",
  "开发",
  "立项",
  "全新一代",
  "新一代",
];

const OUT_OF_DOMAIN_TERMS = [
  "gaming laptop",
  "best gaming laptop",
  "Tesla stock price",
  "stock price",
  "financial market",
  "consumer electronics",
  "phone",
  "smartphone",
  "laptop",
  "GPU stock",
];

const NON_ANALYTICAL_INTENT_TERMS = ["write a poem", "write a story", "joke", "song", "creative writing", "写诗", "讲笑话", "写故事"];

const ENERGY_STORAGE_TERMS = {
  lithium_ion: ["lithium", "lithium-ion", "Li-ion", "lithium battery", "lithium battery cabinet", "integrated lithium battery cabinet", "battery cabinet", "battery rack", "锂电", "锂离子", "锂电池", "锂电柜"],
  lfp: ["LFP", "LiFePO4", "磷酸铁锂"],
  nmc: ["NMC", "三元锂"],
  sodium_ion: ["sodium-ion", "sodium ion", "sodium battery", "sodium-ion battery", "钠电", "钠离子", "钠电池"],
  vrla_lead_acid: ["VRLA", "lead-acid", "lead acid", "铅酸"],
  nickel_zinc: ["nickel-zinc", "NiZn", "镍锌"],
  flywheel: ["flywheel", "飞轮"],
  supercapacitor: ["supercapacitor", "ultracapacitor", "超级电容"],
  solid_state_battery: ["solid-state battery", "solid state battery", "固态电池"],
  bess: ["BESS", "battery energy storage system", "battery energy storage", "储能系统"],
};

const DATA_CENTER_APPLICATION_TERMS = [
  "AI data center",
  "AI data centers",
  "AIDC",
  "AI DC",
  "AI Factory",
  "data center",
  "data centers",
  "hyperscale",
  "colocation",
  "colo",
  "overseas colocation",
  "overseas market",
  "global market",
  "数据中心",
  "AI 数据中心",
  "智算中心",
  "高密数据中心",
];

const LARGE_POWER_TERMS = ["MW", "megawatt", "mw-scale", "MW-scale", "兆瓦", "兆瓦级", "大功率", "large power", "500kW", "500 kW"];
const MODULE_POWER_TERMS = ["模块功率", "power module", "UPS module", "功率模块"];
const SMB_SCOPE_TERMS = ["SMB", "small office", "retail", "channel", "low-end UPS", "小微企业", "中小企业", "办公", "渠道", "低端 UPS"];

const PRODUCT_SCOPE_TERMS = [
  "工业 UPS",
  "工业UPS",
  "industrial UPS",
  "UPS",
  "模块化 UPS",
  "模块化UPS",
  "单一产品",
  "单品",
  "产品",
];

const AI_CONTEXT_TERMS = ["AI数据中心", "AI 数据中心", "AI data center", "AI data centers", "AIDC", "AI DC", "AI Factory", "AI 工厂", "AI训练", "AI 训练", "高密数据中心", "高密", "NVIDIA"];
const INDUSTRIAL_UPS_TERMS = ["工业 UPS", "工业UPS", "industrial UPS", "工业级 UPS", "工业级UPS"];
const MODULAR_UPS_TERMS = ["模块化 UPS", "模块化UPS"];

const hasAnyTerm = (value, terms) => terms.some((term) => includesText(value, term));
const hasProductDecisionIntent = (question) => hasAnyTerm(question, PRODUCT_DECISION_INTENT_TERMS);
const hasProductScope = (question) => hasAnyTerm(question, PRODUCT_SCOPE_TERMS);
const hasExplicitAiContext = (question) => hasAnyTerm(question, AI_CONTEXT_TERMS);
const hasDataCenterContext = (question) => hasAnyTerm(question, DATA_CENTER_APPLICATION_TERMS);
const hasLargePowerContext = (question) => hasAnyTerm(question, LARGE_POWER_TERMS) || /\b\d+\s*kw\b/i.test(String(question || ""));
const hasMwScaleContext = (question) => /(^|[^a-z0-9])mw([^a-z0-9]|$)|mw-scale|megawatt|兆瓦/i.test(String(question || ""));
const hasSmbContext = (question) => hasAnyTerm(question, SMB_SCOPE_TERMS);
const isOutOfDomainQuestion = (question) => {
  const hasDomainTerm = hasAnyTerm(question, [
    "UPS",
    "data center",
    "data centers",
    "AIDC",
    "AI DC",
    "power system",
    "power systems",
    "power module",
    "CDU",
    "liquid cooling",
    "BESS",
    "BBU",
    "800VDC",
    "HVDC",
    "数据中心",
    "智算中心",
    "电力模块",
    "液冷",
    "储能",
    "供电",
    "配电",
  ]);
  if (hasDomainTerm) return false;
  return hasAnyTerm(question, OUT_OF_DOMAIN_TERMS);
};
const isNonAnalyticalIntentQuestion = (question) => hasAnyTerm(question, NON_ANALYTICAL_INTENT_TERMS);

const getDecisionProductLabel = (question) => {
  if (hasAnyTerm(question, INDUSTRIAL_UPS_TERMS)) return "工业 UPS";
  if (hasAnyTerm(question, MODULAR_UPS_TERMS)) return "模块化 UPS";
  if (includesText(question, "UPS")) return "UPS";
  return "目标产品";
};

const isSingleProductDecisionQuestion = (question, namedCompanies) =>
  hasProductDecisionIntent(question) && (hasProductScope(question) || namedCompanies.length === 1);

const PRODUCT_TERM_ALIASES = [
  "UPS",
  "工业 UPS",
  "工业级 UPS",
  "industrial UPS",
  "模块化 UPS",
  "modular UPS",
  "小功率 UPS",
  "大功率 UPS",
  "MW级 UPS",
  "兆瓦级 UPS",
  "后备式 UPS",
  "standby UPS",
  "offline UPS",
  "在线式 UPS",
  "online UPS",
  "互动式 UPS",
  "line interactive UPS",
  "塔式 UPS",
  "tower UPS",
  "机架式 UPS",
  "rackmount UPS",
  "rack UPS",
  "Gaming UPS",
  "游戏 UPS",
  "电竞 UPS",
  "家用 UPS",
  "办公 UPS",
  "数据中心 UPS",
  "边缘 UPS",
  "行业 UPS",
  "锂电 UPS",
  "锂离子 UPS",
  "lithium UPS",
  "磷酸铁锂 UPS",
  "LFP UPS",
  "三元锂 UPS",
  "NMC UPS",
  "钠电 UPS",
  "钠离子 UPS",
  "sodium UPS",
  "铅酸 UPS",
  "VRLA UPS",
  "镍锌 UPS",
  "NiZn UPS",
  "飞轮 UPS",
  "flywheel UPS",
  "超级电容 UPS",
  "supercapacitor UPS",
  "固态电池 UPS",
  "solid-state battery UPS",
  "lithium battery",
  "lithium battery cabinet",
  "integrated lithium battery cabinet",
  "battery cabinet",
  "battery rack",
  "BMS",
  "BBU",
  "BESS",
  "battery energy storage system",
  "sodium-ion battery",
  "sodium battery",
  "户外 UPS",
  "军工 UPS",
  "车载 UPS",
  "AI UPS",
  "边缘 AI UPS",
  "绿色 UPS",
  "静音 UPS",
];

const INTENT_TERM_ALIASES = [
  ...PRODUCT_DECISION_INTENT_TERMS,
  "规划",
  "怎么做",
  "机会",
  "有没有机会",
  "还有没有",
  "市场",
  "对比",
  "比较",
  "哪个更适合",
  "竞争差异",
  "进入",
  "定位",
  "投资",
  "风险",
  "路线图",
];

const CONSTRAINT_RULES = [
  { label: "功率段", terms: ["kVA", "KW", "kW", "MW", "megawatt", "mw-scale", "兆瓦", "兆瓦级", "小功率", "大功率", "功率段", "模块功率", "power module"] },
  { label: "行业", terms: ["行业", "金融", "医疗", "轨交", "石化", "半导体", "制造业", "电力", "通信", "军工"] },
  { label: "客户类型", terms: ["客户", "中小企业", "小微企业", "政企", "家庭", "办公", "游戏", "数据中心", "AI data center", "AIDC", "hyperscale", "colocation"] },
  { label: "区域", terms: ["中国", "Chinese vendor", "Chinese UPS vendor", "北美", "欧洲", "全球", "global market", "overseas market", "亚太"] },
  { label: "时间窗口", terms: ["2026", "2027", "2028", "未来", "三年", "3年"] },
  { label: "价格", terms: ["价格", "低价", "价格带", "性价比", "成本"] },
  { label: "渠道", terms: ["渠道", "电商", "项目", "集成商", "经销商"] },
  { label: "安装方式", terms: ["塔式", "机架式", "户外", "车载", "桌面"] },
  { label: "后备时间", terms: ["后备时间", "长后备", "短时", "续航"] },
  { label: "认证", terms: ["认证", "安规", "EMC", "消防", "工业认证"] },
  { label: "安全", terms: ["安全", "热失控", "消防", "BMS"] },
  { label: "毛利", terms: ["毛利", "利润率", "回报"] },
  { label: "服务", terms: ["服务", "售后", "运维", "维护"] },
  { label: "供应链", terms: ["供应链", "电芯", "材料", "产能"] },
  { label: "竞争对手", terms: ["对标", "竞争", "竞品", "华为", "科华", "维谛", "施耐德", "伊顿", "台达"] },
];

const ONTOLOGY_DIMENSIONS = {
  application: "unknown_application",
  powerRange: "unknown_power",
  topology: "unknown_topology",
  formFactor: "unknown_form_factor",
  channel: "unknown_channel",
  productGoal: "unknown_goal",
  energyStorage: "unknown_energy_storage",
  marketPositioning: "unknown_positioning",
};

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

const companyAliasIndex = (question, alias) => {
  const rawQuestion = String(question || "").toLowerCase();
  const rawAlias = String(alias || "").toLowerCase();
  if (/^[a-z0-9]+$/i.test(alias) && alias.length <= 3) {
    const match = rawQuestion.match(new RegExp(`(^|[^a-z0-9])${rawAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^a-z0-9])`, "i"));
    return match ? match.index + (match[1] ? match[1].length : 0) : -1;
  }
  return indexOfText(question, alias);
};

const extractNamedCompanies = (question) =>
  uniqueBy(
    COMPANIES.map((company) => {
      const aliases = getCompanyAliases(company);
      const match = aliases
        .map((alias) => ({ alias, index: companyAliasIndex(question, alias) }))
        .filter((item) => item.index >= 0)
        .sort((a, b) => a.index - b.index || b.alias.length - a.alias.length)[0];
      return match ? { ...company, matchedAlias: match.alias, mentionIndex: match.index } : null;
    })
      .filter(Boolean)
      .sort((a, b) => a.mentionIndex - b.mentionIndex || Number(b.score || 0) - Number(a.score || 0)),
    (item) => item.id
  );

export const parseQuestion = (question) => {
  const cleanQuestion = String(question || "");
  return {
    raw: cleanQuestion,
    company: extractNamedCompanies(cleanQuestion)[0] || null,
    companies: extractNamedCompanies(cleanQuestion),
    product_terms: uniqueBy(PRODUCT_TERM_ALIASES.filter((term) => includesText(cleanQuestion, term)), normalizeText),
    intent_terms: uniqueBy(INTENT_TERM_ALIASES.filter((term) => includesText(cleanQuestion, term)), normalizeText),
    constraints: uniqueBy(
      CONSTRAINT_RULES.filter((rule) => rule.terms.some((term) => includesText(cleanQuestion, term))).map((rule) => rule.label),
      normalizeText
    ),
  };
};

const addOntologyValue = (ontology, dimension, value, assumption) => {
  if (!ontology[dimension].includes(value)) ontology[dimension].push(value);
  if (assumption && !ontology.assumptions.includes(assumption)) ontology.assumptions.push(assumption);
};

const ensureUnknownValues = (ontology) => {
  Object.entries(ONTOLOGY_DIMENSIONS).forEach(([dimension, unknownValue]) => {
    if (ontology[dimension].length === 0) {
      ontology[dimension].push(unknownValue);
      ontology.missingInfo.push(dimension);
    }
  });
};

const removeUnknownIfKnown = (ontology) => {
  Object.entries(ONTOLOGY_DIMENSIONS).forEach(([dimension, unknownValue]) => {
    if (ontology[dimension].length > 1) ontology[dimension] = ontology[dimension].filter((item) => item !== unknownValue);
  });
};

export const inferProductOntology = (parsedQuestion) => {
  const question = parsedQuestion.raw;
  const ontology = {
    productCategory: includesText(question, "UPS") || includesText(question, "不间断电源") ? "UPS" : "unknown",
    application: [],
    powerRange: [],
    topology: [],
    formFactor: [],
    channel: [],
    productGoal: [],
    energyStorage: [],
    marketPositioning: [],
    ambiguityLevel: "low",
    assumptions: [],
    missingInfo: [],
  };

  if (hasAnyTerm(question, ["液冷", "CDU", "冷板"])) ontology.productCategory = "cooling";
  if (hasAnyTerm(question, ["变压器", "开关柜", "800VDC", "HVDC"]) && !includesText(question, "UPS")) ontology.productCategory = "power_infrastructure";
  if (hasAnyTerm(question, ["UPS vendor", "UPS vendors", "Chinese UPS vendor", "中国 UPS 厂商", "不间断电源"])) ontology.productCategory = "UPS";

  if (hasDataCenterContext(question)) {
    addOntologyValue(ontology, "application", "data_center");
    ["project_sales", "enterprise_key_account"].forEach((item) => addOntologyValue(ontology, "channel", item));
    ["high_reliability", "premium"].forEach((item) => addOntologyValue(ontology, "marketPositioning", item));
  }
  if (hasAnyTerm(question, ["hyperscale", "AI data center", "AI data centers", "AIDC", "AI DC", "AI 数据中心", "智算中心"])) {
    addOntologyValue(ontology, "application", "ai_data_center");
    addOntologyValue(ontology, "marketPositioning", "high_reliability");
  }
  if (hasAnyTerm(question, ["colocation", "colo", "overseas colocation"])) {
    addOntologyValue(ontology, "application", "colocation");
    addOntologyValue(ontology, "channel", "enterprise_key_account");
    addOntologyValue(ontology, "marketPositioning", "global_delivery");
  }
  if (hasAnyTerm(question, ["overseas market", "global market", "Chinese vendor", "Chinese UPS vendor", "中国 UPS 厂商", "中国电力电子厂商"])) {
    addOntologyValue(ontology, "channel", "overseas_project_sales");
    addOntologyValue(ontology, "marketPositioning", "global_delivery");
  }
  if (hasLargePowerContext(question)) {
    addOntologyValue(ontology, "powerRange", "large_power");
    if (hasMwScaleContext(question)) addOntologyValue(ontology, "powerRange", "mw_scale");
    if (/\b\d+\s*kw\b/i.test(question)) addOntologyValue(ontology, "powerRange", "kw_class");
  }
  if (hasAnyTerm(question, MODULE_POWER_TERMS)) {
    addOntologyValue(ontology, "formFactor", "power_module");
    addOntologyValue(ontology, "productGoal", "module_competitiveness");
  }

  if (hasAnyTerm(question, ["工业 UPS", "industrial UPS", "工业级 UPS", "工业电源", "厂区", "抗扰动", "防护等级", "工业认证"])) {
    ["industrial", "manufacturing", "energy_power"].forEach((item) => addOntologyValue(ontology, "application", item));
    ["project_sales", "enterprise_key_account", "system_integrator"].forEach((item) => addOntologyValue(ontology, "channel", item));
    ["high_reliability", "ruggedized"].forEach((item) => addOntologyValue(ontology, "marketPositioning", item));
  }
  if (includesText(question, "石化")) addOntologyValue(ontology, "application", "petrochemical");
  if (includesText(question, "轨交")) addOntologyValue(ontology, "application", "rail_transit");
  if (includesText(question, "半导体")) addOntologyValue(ontology, "application", "semiconductor");
  if (includesText(question, "医疗")) addOntologyValue(ontology, "application", "medical");
  if (includesText(question, "金融")) addOntologyValue(ontology, "application", "finance");
  if (hasAnyTerm(question, ["政企", "政府"])) addOntologyValue(ontology, "application", "government");
  if (hasAnyTerm(question, ["电力", "能源"])) addOntologyValue(ontology, "application", "energy_power");

  if (hasAnyTerm(question, ["模块化 UPS", "modular UPS", "monolithic UPS", "功率模块", "热插拔", "N+X", "柔性扩容", "模块冗余", "机房 UPS"])) {
    addOntologyValue(ontology, "topology", "modular_online");
    addOntologyValue(ontology, "formFactor", "modular_cabinet");
    ["data_center", "edge_computing", "finance", "government"].forEach((item) => addOntologyValue(ontology, "application", item));
    if (!hasDataCenterContext(question) && hasSmbContext(question)) addOntologyValue(ontology, "application", "office_smb");
    ["project_sales", "enterprise_key_account"].forEach((item) => addOntologyValue(ontology, "channel", item));
    if (hasSmbContext(question)) addOntologyValue(ontology, "channel", "smb_channel");
    ["mainstream", "premium", "smart_monitoring"].forEach((item) => addOntologyValue(ontology, "marketPositioning", item));
  }

  if (hasAnyTerm(question, ["MW级 UPS", "MW 级 UPS", "兆瓦级 UPS", "大功率 UPS", "AI 数据中心 UPS", "高密数据中心", "hyperscale", "Colo", "大型数据中心"])) {
    addOntologyValue(ontology, "application", "data_center");
    addOntologyValue(ontology, "powerRange", "large_power");
    if (hasMwScaleContext(question)) addOntologyValue(ontology, "powerRange", "mw_scale");
    ["enterprise_key_account", "project_sales", "system_integrator"].forEach((item) => addOntologyValue(ontology, "channel", item));
    ["premium", "high_reliability"].forEach((item) => addOntologyValue(ontology, "marketPositioning", item));
  }

  if (hasAnyTerm(question, ["Gaming UPS", "游戏 UPS", "电竞 UPS", "游戏 PC", "游戏主机", "PS5", "Xbox", "高端 PC"])) {
    ["gaming", "consumer_home"].forEach((item) => addOntologyValue(ontology, "application", item));
    ["micro_power", "small_power"].forEach((item) => addOntologyValue(ontology, "powerRange", item));
    ["offline_standby", "line_interactive"].forEach((item) => addOntologyValue(ontology, "topology", item));
    ["tower", "desktop"].forEach((item) => addOntologyValue(ontology, "formFactor", item));
    ["b2c", "e_commerce"].forEach((item) => addOntologyValue(ontology, "channel", item));
    ["silent", "compact", "mainstream", "premium"].forEach((item) => addOntologyValue(ontology, "marketPositioning", item));
  }

  if (hasAnyTerm(question, ["小功率 UPS", "家用 UPS", "办公 UPS", "SOHO", "小微企业", "路由器 UPS", "NAS UPS"])) {
    ["consumer_home", "office_smb"].forEach((item) => addOntologyValue(ontology, "application", item));
    ["micro_power", "small_power"].forEach((item) => addOntologyValue(ontology, "powerRange", item));
    ["offline_standby", "line_interactive", "online_double_conversion"].forEach((item) => addOntologyValue(ontology, "topology", item));
    ["tower", "rackmount", "desktop"].forEach((item) => addOntologyValue(ontology, "formFactor", item));
    ["b2c", "e_commerce", "smb_channel"].forEach((item) => addOntologyValue(ontology, "channel", item));
    ["low_cost", "compact", "silent"].forEach((item) => addOntologyValue(ontology, "marketPositioning", item));
  }

  if (hasAnyTerm(question, ["后备式 UPS", "standby UPS", "offline UPS"])) {
    addOntologyValue(ontology, "topology", "offline_standby");
    ["micro_power", "small_power"].forEach((item) => addOntologyValue(ontology, "powerRange", item));
    ["b2c", "e_commerce", "smb_channel"].forEach((item) => addOntologyValue(ontology, "channel", item));
    addOntologyValue(ontology, "marketPositioning", "low_cost");
  }
  if (hasAnyTerm(question, ["互动式 UPS", "line interactive UPS"])) addOntologyValue(ontology, "topology", "line_interactive");
  if (hasAnyTerm(question, ["在线式 UPS", "online UPS", "双变换 UPS", "double conversion"])) {
    addOntologyValue(ontology, "topology", "online_double_conversion");
    addOntologyValue(ontology, "marketPositioning", "high_reliability");
  }
  if (hasAnyTerm(question, ["塔式 UPS", "tower UPS"])) addOntologyValue(ontology, "formFactor", "tower");
  if (hasAnyTerm(question, ["机架式 UPS", "rack UPS", "rackmount UPS"])) addOntologyValue(ontology, "formFactor", "rackmount");
  if (hasAnyTerm(question, ["户外 UPS", "户外柜"])) {
    addOntologyValue(ontology, "application", "outdoor");
    addOntologyValue(ontology, "formFactor", "outdoor_cabinet");
    addOntologyValue(ontology, "marketPositioning", "ruggedized");
  }
  if (hasAnyTerm(question, ["军工 UPS", "军用"])) addOntologyValue(ontology, "application", "military");
  if (hasAnyTerm(question, ["车载 UPS", "车载"])) {
    addOntologyValue(ontology, "application", "vehicle");
    addOntologyValue(ontology, "formFactor", "vehicle_mounted");
  }

  Object.entries(ENERGY_STORAGE_TERMS).forEach(([storage, terms]) => {
    if (hasAnyTerm(question, terms)) addOntologyValue(ontology, "energyStorage", storage);
  });
  if (hasAnyTerm(question, ["battery cabinet", "battery rack", "lithium battery cabinet", "integrated lithium battery cabinet", "电池柜", "锂电柜"])) {
    addOntologyValue(ontology, "formFactor", "battery_cabinet");
    addOntologyValue(ontology, "productGoal", "system_integration");
  }
  if (hasAnyTerm(question, ["BMS", "消防", "热失控"])) addOntologyValue(ontology, "productGoal", "safety_certification");
  if (hasAnyTerm(question, ["固态电池 UPS", "solid-state battery UPS", "solid-state battery", "solid state battery"])) addOntologyValue(ontology, "productGoal", "technology_presearch");

  if (hasAnyTerm(question, ["全新一代", "全新", "新一代"])) addOntologyValue(ontology, "productGoal", "new_platform");
  if (hasAnyTerm(question, ["升级", "平台化", "系列化"])) addOntologyValue(ontology, "productGoal", "platform_upgrade");
  if (hasAnyTerm(question, ["降本", "低成本", "低价"])) addOntologyValue(ontology, "productGoal", "cost_down");
  if (hasAnyTerm(question, ["进入", "有没有机会", "市场机会", "机会"])) addOntologyValue(ontology, "productGoal", "market_entry");
  if (hasAnyTerm(question, ["高端", "高可靠", "高端化"])) addOntologyValue(ontology, "productGoal", "premium_upgrade");
  if (hasAnyTerm(question, ["替换", "替代", "VRLA 替代", "铅酸替代"])) addOntologyValue(ontology, "productGoal", "replacement");
  if (hasAnyTerm(question, ["预研", "技术路线", "成熟度", "固态电池"])) addOntologyValue(ontology, "productGoal", "technology_presearch");

  if (hasAnyTerm(question, ["绿色 UPS", "低碳", "节能", "高效"])) addOntologyValue(ontology, "marketPositioning", "green_low_carbon");
  if (hasAnyTerm(question, ["静音 UPS", "静音"])) addOntologyValue(ontology, "marketPositioning", "silent");
  if (hasAnyTerm(question, ["智能", "AI 监控", "预测性维护", "远程运维"])) addOntologyValue(ontology, "marketPositioning", "smart_monitoring");
  if (hasAnyTerm(question, ["长后备", "长续航"])) addOntologyValue(ontology, "marketPositioning", "long_backup");
  if (hasAnyTerm(question, ["紧凑", "小型化"])) addOntologyValue(ontology, "marketPositioning", "compact");
  if (hasAnyTerm(question, ["AI UPS", "边缘 AI UPS"])) {
    addOntologyValue(ontology, "application", "edge_computing", "AI UPS 可能是 AI 数据中心 UPS、AI 监控 UPS 或边缘 AI 供电 UPS，需要拆分理解。");
    addOntologyValue(ontology, "marketPositioning", "smart_monitoring");
    ontology.ambiguityLevel = "high";
  }
  if (includesText(question, "行业 UPS")) {
    addOntologyValue(ontology, "application", "unknown_application", "行业 UPS 不是单一产品，需要先区分金融、医疗、轨交、石化、半导体、电力、通信等场景。");
    ontology.ambiguityLevel = "high";
  }

  ensureUnknownValues(ontology);
  removeUnknownIfKnown(ontology);

  const missingCount = ontology.missingInfo.length;
  if (ontology.ambiguityLevel !== "high") ontology.ambiguityLevel = missingCount >= 4 ? "high" : missingCount >= 2 ? "medium" : "low";
  return ontology;
};

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
  if (isNonAnalyticalIntentQuestion(cleanQuestion)) return "non_analytical_intent";
  if (isOutOfDomainQuestion(cleanQuestion)) return "out_of_domain";
  const namedCompanies = extractNamedCompanies(cleanQuestion);
  const hasCompareLanguage = QUESTION_TYPES.company_compare.keywords.some((keyword) => includesText(cleanQuestion, keyword));
  if (namedCompanies.length >= 2 || (namedCompanies.length >= 1 && hasCompareLanguage)) return "company_compare";
  if (isSingleProductDecisionQuestion(cleanQuestion, namedCompanies)) return "product_investment_decision";

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
    return uniqueBy(namedCompanies, (item) => item.id);
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
  const referenceCompanies =
    questionType === "company_compare" && namedCompanies.length >= 2
      ? []
      : companies.filter((company) => !primaryCompanies.some((item) => item.id === company.id)).slice(0, 3);

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

const ontologyValueText = (values) => values.filter((item) => !String(item).startsWith("unknown_")).join("、") || "待确认";

const buildProductOntologySection = (ontology) => {
  const unknowns = unknownAttributeHandler(ontology);
  return list([
    `Product Category: ${ontology.productCategory === "UPS" ? "UPS" : ontology.productCategory}。`,
    `Application: ${ontologyValueText(ontology.application)}。`,
    `Power Range: ${ontologyValueText(ontology.powerRange)}。`,
    `Topology: ${ontologyValueText(ontology.topology)}。`,
    `Form Factor: ${ontologyValueText(ontology.formFactor)}。`,
    `Channel: ${ontologyValueText(ontology.channel)}。`,
    `Product Goal: ${ontologyValueText(ontology.productGoal)}。`,
    `Energy Storage: ${ontologyValueText(ontology.energyStorage)}。`,
    `Market Positioning: ${ontologyValueText(ontology.marketPositioning)}。`,
    `Ambiguity Level: ${ontology.ambiguityLevel}；缺失信息主要是 ${unknowns.missingLabels.join("、") || "较少"}。`,
  ]);
};

export const unknownAttributeHandler = (ontology) => {
  const missingLabels = {
    application: "应用场景",
    powerRange: "功率段",
    topology: "拓扑",
    formFactor: "安装形态",
    channel: "渠道",
    productGoal: "产品目标",
    energyStorage: "储能介质",
    marketPositioning: "市场定位",
  };
  const missingDimensions = uniqueBy(ontology.missingInfo || [], normalizeText);
  return {
    missingDimensions,
    missingLabels: missingDimensions.map((item) => missingLabels[item] || item),
    hasUnknowns: missingDimensions.length > 0,
    assumptionText:
      ontology.assumptions?.join("；") ||
      (missingDimensions.length > 0
        ? `当前缺少${missingDimensions.map((item) => missingLabels[item] || item).join("、")}，只能给出条件性判断。`
        : "当前本体信息较完整，可以直接进入方法论判断。"),
  };
};

const isKnownEnergyStorage = (ontology) => !ontology.energyStorage.includes("unknown_energy_storage");
const hasOntologyValue = (ontology, dimension, values) => values.some((value) => ontology[dimension].includes(value));

const isUpsOntologyQuestion = (parsedQuestion, ontology) =>
  ontology.productCategory === "UPS" ||
  parsedQuestion.product_terms.some((term) => includesText(term, "UPS")) ||
  includesText(parsedQuestion.raw, "不间断电源");

export const selectMethodology = (parsedQuestion, ontology, questionType) => {
  const question = parsedQuestion.raw;
  if (
    hasAnyTerm(question, ["CDU", "UPS", "电力模块"]) &&
    hasAnyTerm(question, ["优先做", "优先", "还是", "vs", "versus"])
  )
    return "multi_track_product_prioritization";
  if (hasAnyTerm(question, ["liquid cooling", "液冷"]) && hasAnyTerm(question, ["UPS vendor", "UPS vendors", "UPS 产品路线图", "UPS 产品路线", "UPS roadmap", "UPS vendors"]))
    return "liquid_cooling_impact_on_ups";
  if (hasAnyTerm(question, ["BESS", "battery energy storage system"]) && hasAnyTerm(question, ["UPS", "architecture", "架构"]))
    return "bess_ups_architecture_impact";
  if (hasAnyTerm(question, ["industrial UPS", "工业 UPS", "工业UPS"]) && hasDataCenterContext(question)) return "industrial_ups_data_center_positioning";
  if (hasAnyTerm(question, ["roadmap", "路线图"]) && hasAnyTerm(question, ["UPS vendor", "UPS vendors", "Chinese UPS vendor", "中国 UPS 厂商", "UPS"]) && hasDataCenterContext(question))
    return "aidc_ups_roadmap";
  if (hasAnyTerm(question, ["competitiveness", "竞争力", "evaluate", "评估"]) && hasAnyTerm(question, ["UPS module", "功率模块", "模块功率"]))
    return "module_competitiveness_evaluation";
  if (
    hasAnyTerm(question, ["modular UPS", "模块化 UPS"]) &&
    hasAnyTerm(question, ["monolithic UPS", "塔式 UPS", "机架式 UPS", "difference", "compare", "对比", "比较", "差异"])
  )
    return "form_factor_compare";
  if (includesText(question, "行业 UPS") || includesText(question, "行业UPS")) return "industry_ups_strategy";
  if (
    hasAnyTerm(question, ["塔式 UPS", "tower UPS"]) &&
    hasAnyTerm(question, ["机架式 UPS", "rack UPS", "rackmount UPS"])
  )
    return "form_factor_compare";
  if (isKnownEnergyStorage(ontology)) return "battery_chemistry_analysis";
  if (hasAnyTerm(question, ["AI UPS", "边缘 AI UPS", "绿色 UPS", "静音 UPS"]) && ontology.ambiguityLevel !== "low") return "unknown_ups_concept";
  if (hasOntologyValue(ontology, "application", ["gaming", "consumer_home"]) && hasAnyTerm(question, ["是否值得", "值不值得", "值得做", "机会"])) {
    return "market_opportunity";
  }
  if (questionType === "product_investment_decision" || hasProductDecisionIntent(question)) return "product_investment_decision";
  if (questionType === "product_planning" || hasAnyTerm(question, ["怎么做", "规划", "路线图", "SKU"])) return "product_planning";
  return "market_opportunity";
};

const selectUpsMethodology = selectMethodology;

export const applyScopeGuard = (parsedQuestion, ontology, methodology) => {
  const base = {
    methodology,
    allowedMainTopics: ["UPS"],
    blockedMainTopics: [],
    boundaryStatement: "",
  };
  const addBlocked = (items) => {
    items.forEach((item) => {
      if (!base.blockedMainTopics.includes(item)) base.blockedMainTopics.push(item);
    });
  };
  const addAllowed = (items) => {
    items.forEach((item) => {
      if (!base.allowedMainTopics.includes(item)) base.allowedMainTopics.push(item);
    });
  };

  if (methodology === "industry_ups_strategy") {
    addAllowed(["行业场景", "认证", "服务能力", "电能质量"]);
    addBlocked(["液冷", "BBU", "变压器", "800VDC", "AI Factory"]);
    base.boundaryStatement = "行业 UPS 问题必须先拆行业，不得被改写为数据中心多赛道排序。";
  } else if (methodology === "industrial_ups_data_center_positioning") {
    addAllowed(["工业 UPS", "数据中心 UPS", "适配边界", "可靠性", "认证", "服务能力"]);
    addBlocked(["游戏 PC", "电商渠道", "消费级外观"]);
    base.boundaryStatement = "工业 UPS + 数据中心问题必须回答适配边界，不能只讲传统工业场景或泛化 AIDC 多赛道。";
  } else if (["bess_ups_architecture_impact", "liquid_cooling_impact_on_ups", "aidc_ups_roadmap", "multi_track_product_prioritization"].includes(methodology)) {
    addAllowed(["UPS", "数据中心", "AIDC", "液冷", "CDU", "BESS", "BBU", "电力模块", "800VDC", "架构影响", "路线图"]);
    addBlocked(["游戏 PC", "电商渠道", "消费级外观", "小微企业渠道"]);
    base.boundaryStatement = "交叉场景问题只讨论数据中心供电、冷却与储能基础设施的相互影响，不回落到低端渠道或消费级 UPS 策略。";
  } else if (methodology === "module_competitiveness_evaluation") {
    addAllowed(["UPS 功率模块", "功率密度", "效率", "可靠性", "热设计", "可维护性", "成本"]);
    addBlocked(["游戏 PC", "电商渠道", "消费级外观"]);
    base.boundaryStatement = "UPS module 竞争力问题必须围绕模块级工程指标和项目可交付性，不回落到泛化低端渠道策略。";
  } else if (hasOntologyValue(ontology, "application", ["gaming", "consumer_home"])) {
    addAllowed(["游戏/家用", "小功率", "电商渠道", "静音", "售后换新"]);
    addBlocked(["工业认证", "石化", "轨交", "液冷", "BBU", "变压器", "800VDC", "hyperscale", "AI Factory"]);
    base.boundaryStatement = "消费级 / 游戏 UPS 只按渠道、价格带、安全和售后判断，不进入工业或数据中心主线。";
  } else if (hasOntologyValue(ontology, "powerRange", ["micro_power", "small_power"])) {
    addAllowed(["小功率", "家用/办公", "短时备电", "渠道 SKU"]);
    addBlocked(["MW级", "液冷", "BBU", "变压器", "800VDC", "hyperscale", "AI Factory"]);
    base.boundaryStatement = "小功率 UPS 不应套用大型项目或高密数据中心供电架构。";
  } else if (hasOntologyValue(ontology, "topology", ["modular_online"])) {
    addAllowed(["模块化 UPS", "热插拔", "N+X", "标准 SKU", "监控软件", "服务包"]);
    addBlocked(["工业认证", "石化", "轨交", "液冷", "BBU", "变压器", "800VDC"]);
    base.boundaryStatement = "模块化 UPS 问题只围绕功率模块、扩容、可靠性、软件和服务，不引入无关基础设施赛道。";
  } else if (hasOntologyValue(ontology, "application", ["industrial", "manufacturing", "petrochemical", "rail_transit", "semiconductor", "energy_power"])) {
    addAllowed(["工业 UPS", "电能质量", "工业级可靠性", "远程运维", "国产替代", "服务能力"]);
    addBlocked(["Gaming", "游戏 PC", "电商渠道", "消费级外观", "液冷", "BBU", "变压器", "800VDC"]);
    base.boundaryStatement = "工业 UPS 问题只围绕可靠性、认证、抗扰动、服务和国产替代，不进入消费级或数据中心多赛道。";
  } else if (isKnownEnergyStorage(ontology)) {
    addAllowed(["储能介质", "BMS", "消防", "认证", "供应链", "成本曲线"]);
    addBlocked(["液冷", "变压器", "800VDC"]);
    base.boundaryStatement = "储能介质问题必须先讨论电池系统、BMS、消防和认证，不强行归类到其它产品形态。";
  } else if (methodology === "unknown_ups_concept") {
    addAllowed(["概念拆解", "应用场景", "软件能力", "渠道", "定位"]);
    addBlocked(["液冷", "BBU", "变压器", "800VDC"]);
    base.boundaryStatement = "未知 UPS 概念先拆本体维度，不直接落到未被用户点名的技术赛道。";
  }

  return base;
};

export const validateAnswerRelevance = (answer, scopeGuard) => {
  if (!scopeGuard?.blockedMainTopics?.length) return answer;
  const lines = String(answer || "").split("\n");
  const kept = lines.filter((line) => !scopeGuard.blockedMainTopics.some((term) => includesText(line, term)));
  return kept.join("\n");
};

const buildScopeBoundary = (ontology, parsedQuestion, methodology) => {
  const unknowns = unknownAttributeHandler(ontology);
  if (methodology === "industry_ups_strategy") {
    return "行业 UPS 不是单一产品，而是行业场景化方案；本次只讨论行业拆分、客户痛点、产品适配和切入顺序，不直接套工业 UPS 或模块化 UPS 模板。";
  }
  if (methodology === "industrial_ups_data_center_positioning") {
    return "范围限定为工业 UPS 与数据中心 UPS 的适配边界；重点判断哪些工业能力可迁移到数据中心，哪些会因冗余、认证、服务和规模化交付要求而不适合作为主线。";
  }
  if (["bess_ups_architecture_impact", "liquid_cooling_impact_on_ups", "aidc_ups_roadmap", "multi_track_product_prioritization"].includes(methodology)) {
    return "范围限定为数据中心电力 / 冷却 / 储能基础设施；主线是 UPS、BESS/BBU、CDU/液冷和电力模块之间的架构影响，不进入消费电子、低端渠道或股票投资建议。";
  }
  if (methodology === "module_competitiveness_evaluation") {
    return "范围限定为 UPS 功率模块竞争力；主分析功率密度、效率、热设计、可靠性、可维护性、成本、认证和项目导入，不按通用 UPS 渠道策略回答。";
  }
  if (hasOntologyValue(ontology, "application", ["gaming", "consumer_home"])) {
    return "范围限定为消费级 / 游戏 / 家用 UPS；主分析用户、渠道、价格带、外观静音、电池安全和售后换新，不进入项目型基础设施逻辑。";
  }
  if (hasOntologyValue(ontology, "powerRange", ["micro_power", "small_power"])) {
    return "范围限定为小功率 UPS；不主分析大型项目或高密数据中心。";
  }
  if (hasOntologyValue(ontology, "topology", ["modular_online"])) {
    return "范围限定为模块化 UPS；主分析柔性扩容、热插拔、N+X、标准 SKU、监控软件、TCO 和服务响应，其他不相关基础设施赛道不进入主线。";
  }
  if (hasOntologyValue(ontology, "application", ["industrial", "manufacturing", "petrochemical", "rail_transit", "semiconductor", "energy_power"])) {
    return "范围限定为工业 / 制造 / 能源场景 UPS；主分析工业可靠性、防护等级、抗扰动、认证、分散站点服务和电能质量，不主分析非工业渠道定位。";
  }
  if (isKnownEnergyStorage(ontology)) {
    return "范围限定为 UPS 储能介质与电池系统，不强行归类为工业 UPS 或模块化 UPS；只有用户明确提到对应场景时才进入该产品形态。";
  }
  return `我将其暂按 ${ontologyValueText(ontology.marketPositioning)} / ${ontologyValueText(ontology.application)} 维度理解；${unknowns.assumptionText} 以下为条件性判断。`;
};

const decisionCompanyName = (context) => displayCompanyName(getDecisionCompany(context));
const isDataCenterUpsContext = (ontology, question = "") =>
  hasOntologyValue(ontology, "application", ["data_center", "ai_data_center", "colocation"]) ||
  hasOntologyValue(ontology, "powerRange", ["large_power", "mw_scale", "kw_class"]) ||
  hasDataCenterContext(question);

const buildDynamicFiveLooks = (ontology, context, question = "") => {
  const companyName = decisionCompanyName(context);
  if (hasOntologyValue(ontology, "topology", ["modular_online"])) {
    if (isDataCenterUpsContext(ontology, question)) {
      return [
        `看市场空间: AI 数据中心和 colocation 场景的模块化 UPS 机会来自 MW 级扩容、交付周期、热插拔维护和容量弹性，不是低端渠道产品。`,
        `看客户痛点: 客户关注 150kW/500kW 级模块功率、N+X 冗余、并机扩展、效率、MTTR、监控接口、认证和全球服务响应。`,
        `看竞争格局: 对标对象应限定在 Vertiv、Schneider、Huawei、Eaton、Delta、Kehua 等数据中心 UPS/模块化 UPS 能力，比较功率模块、系统可靠性、服务网络和项目案例。`,
        `看自身能力: ${companyName} 必须证明高功率模块、热设计、认证、软件和项目交付能力，而不是只依赖低价渠道。`,
        `看财务回报: 价值来自项目毛利、服务合同和全球 colocation 复制能力；若没有标杆客户和服务网络，大功率模块化 UPS 会变成高风险研发投入。`,
      ];
    }
    return [
      `看市场空间: 模块化 UPS 的有效需求来自中小型数据中心、边缘机房、金融/政企机房、中小型 Colo 和存量替换；真正增量是柔性扩容、交付周期缩短和运维效率，而不是泛化的 AI 多赛道机会。`,
      `看客户痛点: 客户关注热插拔、N+X 冗余、MTTR、占地、TCO、监控软件和服务响应；如果不能把维护效率和标准 SKU 做出来，新一代模块化 UPS 只会变成参数升级。`,
      `看竞争格局: 对标对象应是华为、科华、维谛、施耐德、伊顿、台达的模块化 UPS，而不是其他不相关基础设施赛道；关键比较项是功率模块、可靠性、软件、渠道和服务包。`,
      `看自身能力: ${companyName} 需要证明性价比、渠道和成本控制能升级为中高端项目案例、监控软件和服务能力，否则只能在低价市场消耗毛利。`,
      `看财务回报: 建议用标准 SKU、服务包和存量替换项目提升毛利；若靠低价抢项目，投入会被价格战稀释。`,
    ];
  }
  if (hasOntologyValue(ontology, "application", ["industrial", "manufacturing", "petrochemical", "rail_transit", "semiconductor", "energy_power"])) {
    return [
      `看市场空间: 工业 UPS 的机会来自石化、轨交、能源、电力、半导体制造等高停机成本场景，需求是结构性替换和国产替代，不是爆发型规模扩张。`,
      `看客户痛点: 客户重点看工业可靠性、防护等级、抗扰动、工业认证、分散站点服务、电能质量、可维护性和生命周期成本。`,
      `看竞争格局: 科华、华为、维谛、伊顿、施耐德、台达都可作为 UPS 能力对标，但比较维度应是认证、服务半径、项目制销售和可靠性口碑。`,
      `看自身能力: ${companyName} 若只依赖低价渠道，不足以支撑工业高可靠定位；必须补齐认证、现场服务、定制边界和长期运维。`,
      `看财务回报: 工业 UPS 可通过可靠性溢价、服务合同和国产替代改善毛利，但过度定制会拖累研发效率。`,
    ];
  }
  if (hasOntologyValue(ontology, "application", ["gaming", "consumer_home"])) {
    return [
      `看市场空间: Gaming UPS 面向游戏 PC、PS5、Xbox 和高端 PC 用户，机会在电商转化、品牌营销和高端外设生态，不按项目型基础设施逻辑评估。`,
      `看客户痛点: 用户关注外观、静音、价格带、电池安全、家庭使用便利性、断电保护和售后换新体验。`,
      `看竞争格局: 竞争对手更可能是消费级 UPS、电源外设和电商渠道品牌；产品必须用明确价格带和场景故事降低获客成本。`,
      `看自身能力: 若 ${companyName} 缺少消费品牌、外观设计、电商运营和售后换新能力，不宜大投入做独立 Gaming 产品线。`,
      `看财务回报: 该方向依赖库存周转和渠道效率，毛利可能来自品牌溢价，但滞销和售后成本会快速吞噬利润。`,
    ];
  }
  if (hasOntologyValue(ontology, "powerRange", ["micro_power", "small_power"]) || hasOntologyValue(ontology, "topology", ["offline_standby"])) {
    return [
      `看市场空间: 小功率 / 后备式 UPS 仍有家用、办公、小微企业、路由器、NAS 和 PC 的短时备电需求，但增长主要来自渠道效率和替换周期。`,
      `看客户痛点: 购买决策高度价格敏感，关注低成本可靠性、静音、体积、插座数量、基础安全和售后成本。`,
      `看竞争格局: 竞争集中在电商、SMB 渠道和低价品牌，产品差异不宜过度工程化。`,
      `看自身能力: 应评估 ${companyName} 的渠道、库存周转、售后换新和低成本质量控制，而不是按大型项目能力判断。`,
      `看财务回报: 适合做组合 SKU 和渠道利润管理，不适合重研发全新高端平台。`,
    ];
  }
  return [
    `看市场空间: 当前 UPS 概念仍有机会，但缺少应用、功率、拓扑和渠道约束，不能直接判断为大投入赛道。`,
    `看客户痛点: 需要先确认客户是家庭、办公、工业、数据中心还是边缘节点，否则痛点会从价格敏感到高可靠完全不同。`,
    `看竞争格局: 需要把对标对象限定在相同功率段、拓扑和渠道，否则比较会失真。`,
    `看自身能力: 应先匹配公司渠道、认证、服务和成本能力，再决定是否立项。`,
    `看财务回报: 信息不足时建议做低成本验证，不建议直接平台化。`,
  ];
};

const buildDynamicThreeDecisions = (ontology, context) => {
  if (hasOntologyValue(ontology, "topology", ["modular_online"])) {
    return [
      `定目标客户: 优先金融/政企机房、边缘机房、中小型 Colo 和存量替换客户，不把低价通用渠道作为首发主战场。`,
      `定产品边界: 做模块化在线 UPS 平台升级，聚焦功率模块、热插拔、N+X、监控软件、标准 SKU 和服务包。`,
      `定投入策略: 小步迭代到条件性重点投入，先用 2-3 个可复制项目验证 TCO、交付周期和毛利。`,
    ];
  }
  if (hasOntologyValue(ontology, "application", ["gaming", "consumer_home"])) {
    return [
      `定目标客户: 锁定高端 PC / 主机玩家和家庭网络设备用户，不泛化到工业或数据中心客户。`,
      `定产品边界: 以静音、外观、桌面友好、电池安全、APP 提示和换新服务为主，避免过度工程化。`,
      `定投入策略: 先做电商 MVP 和小批量 SKU，验证价格带、退换货率和库存周转后再扩展。`,
    ];
  }
  if (hasOntologyValue(ontology, "powerRange", ["micro_power", "small_power"]) || hasOntologyValue(ontology, "topology", ["offline_standby"])) {
    return [
      `定目标客户: 家用、SOHO、小微企业、路由器/NAS/PC 用户和办公渠道客户。`,
      `定产品边界: 控制成本和可靠性，重点做短时备电、易安装、安全和售后换新。`,
      `定投入策略: 以渠道组合和成本优化为主，不建议重投入全新平台。`,
    ];
  }
  return [
    `定目标客户: 先补充应用、功率段和渠道信息，再选择 2-3 个可验证客户群。`,
    `定产品边界: 先定义拓扑、储能介质、安装方式和服务边界，避免概念先行。`,
    `定投入策略: 采用预研 + 客户访谈 + 样机验证，不直接大规模产品化。`,
  ];
};

const buildUpsInvestmentDecisionAnswer = (question, filters, context, parsedQuestion, ontology) => {
  const companyName = decisionCompanyName(context);
  const productName = getDecisionProductLabel(question) === "目标产品" ? "UPS 产品" : getDecisionProductLabel(question);
  const modular = hasOntologyValue(ontology, "topology", ["modular_online"]);
  const industrial = hasOntologyValue(ontology, "application", ["industrial", "manufacturing", "petrochemical", "rail_transit", "semiconductor", "energy_power"]);
  const consumer = hasOntologyValue(ontology, "application", ["gaming", "consumer_home"]) || hasOntologyValue(ontology, "powerRange", ["micro_power", "small_power"]);
  const decision = modular ? "小步迭代 / 条件性重点投入" : industrial ? "条件性投入 / 小步迭代" : consumer ? "小规模试水 / 渠道验证" : "条件性投入";
  const reason = modular
    ? "只有在标准 SKU、监控软件、热插拔可靠性和服务包能提升 TCO 时，才值得扩大投入。"
    : industrial
      ? "只有拿到高价值工业客户共创、认证路径和服务半径验证后，才适合平台化。"
      : consumer
        ? "该类产品更依赖电商效率、价格带和售后成本，不适合直接重研发。"
        : "当前 ontology 信息不完整，需要先做客户与规格验证。";

  return `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Decision Summary
结论：${decision}。${companyName} 对 ${productName} 不应先按单一固定模板立项，而应根据本体维度决定资源强度；${reason}

Product Ontology
${buildProductOntologySection(ontology)}

Scope Boundary
${buildScopeBoundary(ontology, parsedQuestion, "product_investment_decision")}

五看
${list(buildDynamicFiveLooks(ontology, context, question))}

三定
${list(buildDynamicThreeDecisions(ontology, context))}

Product Strategy
${list([
    `2026: 做客户和核心规格验证，明确目标客户、功率段、拓扑、安装方式、认证和服务边界。`,
    `2027: 把验证过的规格平台化 / 系列化，形成标准 SKU、报价模板、监控软件和服务包。`,
    `2028: 向智能运维、服务化和高毛利场景拓展，停止低毛利、过度定制或库存周转差的 SKU。`,
  ])}

Key Risks
${list([
    `范围跑偏: 若忽略 ontology 维度，容易把 ${productName} 错判为工业、数据中心或消费级产品。`,
    `价格战: 缺少软件、服务、认证或渠道差异时，新平台很容易变成低价替换。`,
    `定制拖累: 未限定目标客户就立项，会导致 SKU 膨胀和研发效率下降。`,
    `服务不足: UPS 产品价值高度依赖安装、维护、备件和响应速度。`,
  ])}

Final Recommendation
建议先用 ontology 锁定客户、功率、拓扑、形态、储能介质和渠道，再决定投入强度；当前更适合以验证和平台升级为主，只有当客户愿意共同定义规格、毛利优于现有产品、服务能力可覆盖时才进入全新平台。

Confidence Level
Medium-High。判断基于本地规则版 UPS 产品本体、内置公司画像、UPS/模块化 UPS 产品数据和客户痛点；未接入实时订单或竞品手册。

Data Caveats
1. 当前为本地规则版 V1.2.6，不调用后端、API、Gemini、OpenAI 或 Dify。
2. 若要做正式立项，还需要补充目标价格带、功率段、认证要求、渠道数据、竞品 BOM 和项目案例。
`.trim();
};

const energyStorageLabel = (ontology) => ontology.energyStorage.find((item) => item !== "unknown_energy_storage") || "unknown_energy_storage";

const batteryChemistryProfile = (energyStorage) => {
  const profiles = {
    lithium_ion: {
      summary: "锂电 UPS 有机会，但应优先作为 VRLA 替代和中高端 UPS 升级，不宜脱离 BMS、消防和认证能力单独立项。",
      maturity: "成熟度中高，客户接受度正在提升；关键不在电芯概念，而在 BMS、热管理、消防和 UPS 兼容性。",
      value: "价值来自 TCO、占地、重量、寿命和维护频次下降。",
      fit: "适合数据中心、边缘机房、金融/政企机房和对占地敏感的中高端客户。",
      bms: "必须补齐 BMS、热管理、消防联动、安规认证和售后换新能力。",
      supply: "供应链较成熟但价格波动仍需管理。",
      strategy: "建议平台升级 + 客户验证，先做兼容现有 UPS 的锂电柜和服务包。",
      risks: ["热失控与消防认证", "客户对安全性的疑虑", "与现有 VRLA 产品线冲突", "售后能力不足"],
      recommendation: "建议条件性投入，优先做 VRLA 替代方案，不建议一开始重做全新 UPS 平台。",
    },
    lfp: {
      summary: "LFP UPS 更适合做高安全、长寿命的 VRLA 替代方案，投入优先级高于泛化锂电叙事。",
      maturity: "成熟度较高，安全性和循环寿命优势明显。",
      value: "客户价值在寿命、TCO、占地、重量和安全感。",
      fit: "适合政企、金融、边缘机房和中小数据中心。",
      bms: "需要 BMS、消防、均衡管理和认证闭环。",
      supply: "供应链成熟但仍要管控电芯一致性和成本。",
      strategy: "以标准电池柜、监控接口和运维服务切入。",
      risks: ["价格竞争", "电芯一致性", "认证周期", "售后责任边界"],
      recommendation: "建议小步迭代到重点投入，优先替代铅酸。",
    },
    nmc: {
      summary: "NMC UPS 的能量密度有价值，但安全和客户接受度门槛更高。",
      maturity: "电芯成熟，但在 UPS 场景的安全论证要求高。",
      value: "价值在高能量密度和节省空间。",
      fit: "适合空间极其敏感但能接受更高安全验证成本的客户。",
      bms: "BMS、热管理、消防和认证必须高规格配置。",
      supply: "供应链成熟但安全品牌风险更敏感。",
      strategy: "建议选择性项目验证，不做大众化主线。",
      risks: ["热安全", "保险和消防接受度", "客户信任", "售后责任"],
      recommendation: "建议谨慎选择性投入。",
    },
    sodium_ion: {
      summary: "钠电 UPS 是早期机会，当前不建议直接大规模平台化，应以预研、样机、小规模客户共创和供应链验证为主。",
      maturity: "成熟度仍偏早，低温、安全和倍率潜力值得看，但循环寿命、成本曲线和一致性需要验证。",
      value: "潜在价值在低温、安全、资源约束和未来成本下降。",
      fit: "适合低温、成本敏感或供应链多元化诉求强的试点场景。",
      bms: "必须验证与现有 UPS 电压平台、BMS、充放电倍率和认证体系的兼容性。",
      supply: "供应链成熟度不足，短期不能按成熟电芯导入节奏规划。",
      strategy: "建议预研 + 样机 + 供应链验证 + 头部客户小规模共创。",
      risks: ["供应链不成熟", "循环寿命不确定", "客户接受度低", "认证和保险不确定"],
      recommendation: "不建议直接大投入平台化，建议技术预研和小规模验证。",
    },
    flywheel: {
      summary: "飞轮 UPS 适合短时高功率和高循环桥接，不适合作为长后备时间通用 UPS 替代。",
      maturity: "技术成熟但场景窄，机械可靠性和维护能力是门槛。",
      value: "价值在短时高功率、高循环、减少电池维护和桥接发电机/储能切换。",
      fit: "适合数据中心、工业短时桥接、高循环且维护能力强的场景。",
      bms: "重点不是 BMS，而是机械安全、转子可靠性、维护规范和现场工程能力。",
      supply: "供应商相对少，项目型交付属性强。",
      strategy: "建议作为特定场景方案储备，不做通用 UPS 主线。",
      risks: ["机械可靠性", "维护专业度", "占地和噪声", "客户理解成本"],
      recommendation: "建议选择性进入短时桥接场景，不建议大众化。",
    },
    supercapacitor: {
      summary: "超级电容 UPS 适合极短时保持和桥接电源，不适合作为长时间备电主方案。",
      maturity: "高循环和温度适应性好，但能量密度限制明显。",
      value: "价值在极短时保持、高循环、免维护和温度适应。",
      fit: "适合控制系统、工业短时电压跌落桥接、设备安全关断等场景。",
      bms: "重点是均压、寿命监测、安全保护和与 UPS DC 母线兼容。",
      supply: "供应链可得但容量成本和能量密度限制应用边界。",
      strategy: "建议做模块化桥接方案，不做长后备 UPS 替代。",
      risks: ["能量密度不足", "客户误解为长备电", "单位 Wh 成本高", "适配场景窄"],
      recommendation: "建议作为短时桥接技术方案，小规模产品化。",
    },
    solid_state_battery: {
      summary: "固态电池 UPS 是储能介质创新 / 技术预研方向，不能当成熟产品线直接建议投入。",
      maturity: "成熟度偏早，安全性潜力存在，但成本曲线、供应链和认证周期高度不确定。",
      value: "潜在价值在安全性、能量密度和长期寿命，但短期客户价值尚未被验证。",
      fit: "适合高端客户技术预研和联合验证，不适合当前规模化销售。",
      bms: "需要重新验证 BMS、热管理、认证、运输和售后责任。",
      supply: "供应链不成熟，量产成本和一致性不确定。",
      strategy: "建议技术跟踪、样机验证和供应商评估，不建议马上产品化。",
      risks: ["成本过高", "量产不确定", "认证周期长", "客户验证不足"],
      recommendation: "建议预研，不建议直接大投入。",
    },
  };
  return profiles[energyStorage] || profiles.lithium_ion;
};

const buildBatteryChemistryAnswer = (question, filters, context, parsedQuestion, ontology) => {
  const energy = energyStorageLabel(ontology);
  const profile = batteryChemistryProfile(energy);
  return `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Decision Summary
${profile.summary}

Product Ontology
${buildProductOntologySection(ontology)}

Technology Maturity
${profile.maturity}

Customer Value
${profile.value}

Application Fit
${profile.fit}

Safety / Certification / BMS Requirements
${profile.bms}

Supply Chain and Cost Curve
${profile.supply}

Commercialization Strategy
${profile.strategy}

Key Risks
${list(profile.risks)}

Final Recommendation
${profile.recommendation}

Confidence Level
${["sodium_ion", "solid_state_battery"].includes(energy) ? "Medium" : "Medium-High"}。判断基于本地 UPS product ontology 和储能介质成熟度规则，未接入实时电芯价格、认证数据库或客户项目数据。

Data Caveats
1. 当前为本地规则版 V1.2.6，不调用后端、API、Gemini、OpenAI 或 Dify。
2. 储能介质类 UPS 需要补充电芯规格、认证、BMS、消防、售后和目标客户验证后才能进入正式立项。
`.trim();
};

const buildIndustryUpsAnswer = (question, filters, context, parsedQuestion, ontology) => `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Decision Summary
行业 UPS 不是单一产品，而是行业场景化方案。需要先区分金融、医疗、轨交、石化、半导体、电力、通信等场景，再决定产品规格、认证、渠道和服务模式。

Product Ontology
${buildProductOntologySection(ontology)}

Scope Boundary
不直接套工业 UPS 或模块化 UPS 模板；本次先做行业拆分框架和优先切入建议。

行业拆分框架
${list([
  "金融: 重点看 2N 冗余、在线式可靠性、国产化、可维护性和服务响应。",
  "医疗: 重点看安全认证、低噪声、稳定性、维护窗口和设备兼容。",
  "轨交 / 石化 / 电力: 重点看抗扰动、防护等级、工业认证、分散站点服务和生命周期成本。",
  "半导体: 重点看电能质量、瞬断保护、可靠性、洁净环境适配和快速服务。",
  "通信 / 边缘节点: 重点看远程运维、空间、能耗、标准化交付和无人值守。",
])}

Product / Channel Implications
${list([
  "不要先做一个笼统的行业 UPS，而应选择 2-3 个高价值行业切入。",
  "每个行业要单独定义功率段、拓扑、认证、后备时间、监控接口和服务 SLA。",
  "渠道模式应区分项目制销售、系统集成商、政府采购和企业关键客户。",
])}

Clarifying Questions
${list([
  "优先行业是金融、医疗、轨交、石化、半导体、电力还是通信？",
  "目标功率段和后备时间是多少？",
  "主要销售模式是项目制、集成商、政府采购还是渠道分销？",
  "是否需要行业认证、国产化或特殊防护等级？",
])}

Final Recommendation
建议先选半导体 / 电力 / 金融或轨交中的 2-3 个场景做行业方案，不要用一个泛化行业 UPS 覆盖所有客户。

Confidence Level
Medium。当前缺少具体行业和功率段，因此为条件性判断。

Data Caveats
1. 当前为本地规则版 V1.2.6，不调用后端、API、Gemini、OpenAI 或 Dify。
`.trim();

const buildFormFactorCompareAnswer = (question, filters, context, parsedQuestion, ontology) => {
  const modularVsMonolithic = hasAnyTerm(question, ["modular UPS", "模块化 UPS"]) && hasAnyTerm(question, ["monolithic UPS", "一体式 UPS", "传统 UPS"]);
  if (modularVsMonolithic) {
    return `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Direct conclusion
For AI data centers, modular UPS is usually better for phased capacity expansion, hot-swap maintenance, N+X redundancy and colocation growth. Monolithic UPS is better when the load profile is stable, the customer values proven simplicity, and the project wants fewer module-level integration variables.

Product Ontology
${buildProductOntologySection(ontology)}

Comparison dimensions
${list([
  "Scalability: modular UPS supports incremental capacity and redundancy; monolithic UPS is simpler when the final load is already fixed.",
  "Serviceability: modular UPS improves MTTR through hot-swap modules; monolithic UPS depends more on full-system service windows and spares.",
  "Reliability architecture: modular UPS needs strong module control, bypass and parallel reliability; monolithic UPS has fewer module interfaces but less flexible redundancy.",
  "AIDC fit: AI data centers and overseas colocation often value modular growth, standard cabinets, monitoring software and service SLA.",
  "Commercial risk: modular UPS can become expensive if module reliability and service network are weak; monolithic UPS can become inflexible when AI load ramps faster than planned.",
])}

Application fit
AI data center / colocation: prefer modular UPS unless the site has a stable, fully planned load and a strong reason to minimize modular complexity.

Vendor implications
Chinese UPS vendors should position modular UPS around high-power modules, software, service SLA and global project delivery, not generic low-end channels.

Recommended positioning
Use modular UPS as the AIDC growth platform; keep monolithic UPS for stable-load, cost-controlled or conservative reliability projects.
`.trim();
  }

  return `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Decision Summary
塔式 UPS 更适合安装简单、空间不标准、IT 能力较弱的中小企业；机架式 UPS 更适合已有机柜、网络设备集中管理、需要规范布线和远程维护的中小企业。结论不是谁绝对更强，而是安装空间、维护方式和渠道能力不同。

Product Ontology
${buildProductOntologySection(ontology)}

Comparison Matrix
${list([
    "安装空间: 塔式适合桌边、弱电间和非标准空间；机架式适合标准机柜和集中设备间。",
    "维护: 塔式更易直接更换；机架式更利于统一巡检、布线和设备资产管理。",
    "渠道: 塔式更适合电商、SMB 渠道和快速成交；机架式更适合集成商、IT 服务商和企业采购。",
    "目标客户: 塔式偏小微企业、门店和办公室；机架式偏有服务器、NAS、网络设备和小机房的企业。",
    "场景匹配: 如果客户已有机柜和 IT 运维，优先机架式；如果客户只需要低门槛短时备电，优先塔式。",
  ])}

Final Recommendation
面向中小企业不应二选一押注，建议做塔式 + 机架式的共享平台和分渠道 SKU：塔式走低门槛渠道，机架式走集成商和 IT 服务包。

Confidence Level
Medium-High。判断基于安装方式、渠道和 SMB 场景逻辑。

Data Caveats
1. 当前为本地规则版 V1.2.6，不调用后端、API、Gemini、OpenAI 或 Dify。
`.trim();
};

const buildUnknownUpsConceptAnswer = (question, filters, context, parsedQuestion, ontology) => {
  const isAiUps = hasAnyTerm(question, ["AI UPS", "边缘 AI UPS"]);
  const isGreen = includesText(question, "绿色 UPS");
  const title = isAiUps ? "AI UPS" : isGreen ? "绿色 UPS" : parsedQuestion.product_terms[0] || "该 UPS 概念";
  const interpretation = isAiUps
    ? "我将 AI UPS 暂按三种维度理解：AI 数据中心 UPS、带 AI 监控/预测性维护的 UPS、边缘 AI 供电 UPS。它可能是营销概念，也可能是场景或软件能力，需要先拆分。"
    : isGreen
      ? "我将绿色 UPS 暂按 marketPositioning = green_low_carbon 理解，它不是产品拓扑，而是效率、低碳、储能介质、节能认证和客户支付意愿的组合定位。"
      : `我将 ${title} 暂按 ${ontologyValueText(ontology.marketPositioning)} / ${ontologyValueText(ontology.application)} 维度理解。`;
  const analysis = isAiUps
    ? [
        "AI 数据中心 UPS: 如果指高密算力供电，应另行界定数据中心 UPS 或模块化 UPS 架构，不应只用 AI 命名。",
        "AI 监控/预测性维护 UPS: 更像软件和服务升级，价值在告警、寿命预测、远程运维和服务收入。",
        "边缘 AI 供电 UPS: 更像边缘计算应用，重点是小型化、远程运维、环境适应和可靠性。",
      ]
    : isGreen
      ? [
          "效率: 需要用高效率拓扑、低损耗器件和节能认证证明价值。",
          "低碳: 可结合 LFP、钠电或更长寿命电池降低生命周期碳足迹。",
          "商业化: 客户是否愿意为低碳和节能认证付费，比概念本身更关键。",
        ]
      : [
          "当前概念信息不足，不能强行套工业 UPS 或模块化 UPS。",
          "应先确认应用场景、功率段、拓扑、安装方式、渠道和储能介质。",
          "在假设成立前，只适合做概念验证和客户访谈。",
        ];

  return `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Decision Summary
${interpretation}

Product Ontology
${buildProductOntologySection(ontology)}

Scope Boundary
${buildScopeBoundary(ontology, parsedQuestion, "unknown_ups_concept")}

Conditional Analysis
${list(analysis)}

Clarifying Questions
${list([
    "这个概念主要面向家庭/办公、工业、数据中心还是边缘节点？",
    "目标功率段、后备时间和安装方式是什么？",
    "核心差异是拓扑、储能介质、软件能力、低碳认证还是营销定位？",
    "目标渠道是电商、SMB、项目制还是企业关键客户？",
  ])}

Final Recommendation
可以做条件性探索，但不能只凭概念命名立项；先把 ${title} 拆成明确的 ontology 维度，再决定是产品平台、软件服务还是营销包装。

Confidence Level
Medium。当前 ambiguityLevel=${ontology.ambiguityLevel}，需要更多产品定义信息。

Data Caveats
1. 当前为本地规则版 V1.2.6，不调用后端、API、Gemini、OpenAI 或 Dify。
`.trim();
};

const buildModuleCompetitivenessAnswer = (question, filters, context, parsedQuestion, ontology) => `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Direct conclusion
150kW / 500kW 级 UPS module 竞争力不能只看额定功率，必须同时看功率密度、效率、热设计、并机可靠性、MTTR、认证、软件接口、成本和项目交付记录。若面向 AI data center / colocation，模块竞争力首先是系统级可用性和服务能力，而不是单模块参数。

Product Ontology
${buildProductOntologySection(ontology)}

Comparison dimensions
${list([
  "Power density: 单模块 kW、柜体容量、占地和扩容颗粒度是否匹配 AIDC/colo 需求。",
  "Efficiency and thermal design: 高负载效率、轻载效率、散热冗余和高温降额曲线必须可验证。",
  "Reliability: 热插拔、N+X、旁路、并机均流、故障隔离和 MTTR 是核心指标。",
  "Software and service: 监控接口、预测性维护、备件、SLA 和跨区域服务网络决定项目可复制性。",
  "Cost and certification: BOM、认证、交付周期、维护成本和质保责任共同决定商业竞争力。",
])}

Application fit
AI data center 和 overseas colocation 更适合高功率密度、可热插拔、可并机、服务可复制的模块；如果缺少认证和标杆项目，不应直接承诺大规模海外导入。

Vendor implications
中国 UPS 厂商应先用标杆客户验证 150kW/500kW 模块的可靠性和服务闭环，再把规格沉淀成标准平台。

Recommended positioning
定位为 AIDC / colocation 的高可靠功率模块平台，而不是普通渠道 UPS SKU。

Scope boundary
${buildScopeBoundary(ontology, parsedQuestion, "module_competitiveness_evaluation")}
`.trim();

const buildBessUpsArchitectureImpactAnswer = (question, filters, context, parsedQuestion, ontology) => `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Architecture impact
BESS 会把传统 UPS 从“短时不断电设备”推向“UPS + BBU/BESS + EMS/BMS + 电网互动”的组合架构。它不一定替代 UPS，但会改变后备时间、削峰填谷、DC bus 接入、消防分区和运维责任边界。

Product Ontology
${buildProductOntologySection(ontology)}

Product implication
UPS 厂商需要补齐 BMS/EMS 接口、消防联动、SOC/SOH 管理、并网与保护策略，而不是只升级 UPS 主机。

Integration opportunity
机会在 integrated battery cabinet、BBU/BESS 与 UPS 监控平台一体化、短时高倍率备电、峰谷套利和负载平滑。

Technical risk
主要风险是热失控、消防认证、并网合规、故障隔离、UPS 与 BESS 控制逻辑冲突，以及责任边界不清。

Commercial maturity
数据中心 BESS 正处在试点到规模化验证阶段；成熟度高于钠电/固态电池，但低于传统 VRLA/LFP UPS 电池柜。

Recommended next step
先做 UPS + battery cabinet / BESS 的接口标准、消防方案和 1-2 个客户试点，不建议直接把 BESS 宣传成传统 UPS 的完全替代。
`.trim();

const buildLiquidCoolingImpactOnUpsAnswer = (question, filters, context, parsedQuestion, ontology) => `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Architecture impact
液冷本身不替代 UPS，但高密机柜会同步推高供电密度、配电距离、机房布局和维护窗口要求，从而改变 UPS 的功率密度、模块化、监控接口和系统集成边界。

Product Ontology
${buildProductOntologySection(ontology)}

Product implication
UPS 厂商需要把路线图从单机 UPS 扩展到 MW 级模块化 UPS、预制电力模块、液冷 CDU 供电接口、监控联动和高密机房服务包。

Integration opportunity
最现实的机会是 UPS / power module / CDU / 监控软件打包报价，围绕 AIDC 项目做可交付方案，而不是转型成纯液冷部件公司。

Technical risk
关键风险是液冷 CDU 的供电连续性、告警联动、故障隔离、现场责任边界和高密空间下的维护可达性。

Commercial maturity
液冷在 100kW+ 机架场景已从可选项转向刚需，但 UPS 厂商进入方式应以供电协同和方案集成为主。

Recommended next step
短期补齐 CDU 供电接口和监控联动，中期形成 MW 级模块化 UPS + power module + CDU 的方案 SKU，长期跟踪 800VDC 与液冷机柜生态。
`.trim();

const buildAidcUpsRoadmapAnswer = (question, filters, context, parsedQuestion, ontology) => `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Direct recommendation
中国 UPS 厂商应建立 AIDC 专用三层路线图：短期做 MW 级模块化 UPS 和高功率模块，中期做 integrated battery cabinet / BBU / BESS 接口，长期预留 800VDC 与一体化电力模块生态接口。

Product Ontology
${buildProductOntologySection(ontology)}

Market signal
AIDC 和 overseas colocation 的需求不是普通 UPS 替换，而是高密负载、快速交付、服务 SLA、认证和全球项目复制能力。

Product fit
优先级应是 MW-scale modular UPS、150kW/500kW 功率模块、监控软件、battery cabinet、服务包和预制电力模块接口。

Capability requirement
必须补齐高功率模块热设计、并机可靠性、项目认证、备件体系、全球服务网络和与 CDU/BESS/EMS 的接口。

Competition risk
主要对手是 Vertiv、Schneider、Huawei、Eaton、Delta、Kehua 等在数据中心电源系统中的组合能力，不是低端渠道 UPS。

Roadmap suggestion
${list([
  "2026: 完成 AIDC 客户访谈、150kW/500kW 模块验证、MW 级柜体和监控接口定义。",
  "2027: 建立 overseas colocation 标杆项目，形成 UPS + battery cabinet + service SLA 方案。",
  "2028: 把模块化 UPS、一体化电力模块、CDU 供电接口和 800VDC 预留接口打成可复制产品包。",
])}

Scope boundary
${buildScopeBoundary(ontology, parsedQuestion, "aidc_ups_roadmap")}
`.trim();

const buildIndustrialUpsDataCenterPositioningAnswer = (question, filters, context, parsedQuestion, ontology) => `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Direct conclusion
工业 UPS 不适合作为 AI data center 主产品线的默认核心，但其中的高可靠、抗扰动、认证、远程运维和电能质量能力可以迁移到特定数据中心边界场景。数据中心主线仍应围绕 MW 级模块化 UPS、并机扩容、监控软件、服务 SLA 和高密供电架构。

Product Ontology
${buildProductOntologySection(ontology)}

Comparison dimensions
${list([
  "Application fit: 工业 UPS 适合石化、轨交、能源、电力、半导体制造等分散高停机场景；AI data center 更看规模化、冗余和快速维护。",
  "Architecture fit: 数据中心需要 N+X、2N、并机扩展、统一监控和机房级维护窗口，不能只按工业防护等级定义。",
  "Commercial fit: 工业 UPS 多为项目制和定制化，AIDC/colo 更需要标准化 SKU、认证和服务复制。",
  "Capability transfer: 认证、可靠性、电能质量和远程运维可迁移；过度定制、防护外壳和工业渠道不能直接迁移。",
])}

Application fit
如果目标是数据中心产品线，工业 UPS 应作为相邻能力和特殊场景补充，不应替代数据中心 UPS / 模块化 UPS 主线。

Vendor implications
厂商应把工业能力沉淀成可靠性和认证资产，再用于 AIDC UPS 平台，而不是把工业 UPS 重新包装成数据中心主产品。

Recommended positioning
定位为“高可靠能力补充 + 特定边界场景方案”，不是 AIDC 主航道。
`.trim();

const buildMultiTrackProductPrioritizationAnswer = (question, filters, context, parsedQuestion, ontology) => `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Direct recommendation
如果是中国电力电子厂商，优先级建议为：先做 UPS / 电力模块基本盘升级，再选择性切入 CDU 供电协同；若已有液冷工程能力，可把 CDU 作为方案补位，但不要在没有液路可靠性和运维能力时把 CDU 放在第一主线。

Product Ontology
${buildProductOntologySection(ontology)}

Comparison dimensions
${list([
  "UPS: 客户基础和能力复用最高，适合做 MW 级模块化 UPS、功率模块、监控软件和服务 SLA。",
  "电力模块: 与 AIDC 预制化交付、800VDC 预留接口和园区级供配电结合度高，是中期高价值方向。",
  "CDU: 增长快但液路可靠性、快接头、防漏液、现场运维和系统集成门槛高，不适合没有热管理基础的厂商盲目重投。",
])}

Application fit
AIDC 项目更需要 UPS + power module + CDU 接口的组合方案。单点押注 CDU、UPS 或电力模块都不如围绕客户交付边界做分层路线图。

Vendor implications
中国厂商应先用 UPS 和电力模块拿到供电主入口，再通过 CDU 供电接口、监控联动和合作伙伴补齐液冷方案。

Recommended positioning
短期: UPS / MW 级模块化 UPS；中期: 一体化电力模块；选择性: CDU 协同方案；前瞻: 800VDC 接口和 BESS/BBU 集成。

Scope boundary
${buildScopeBoundary(ontology, parsedQuestion, "multi_track_product_prioritization")}
`.trim();

const buildUpsMarketOpportunityAnswer = (question, filters, context, parsedQuestion, ontology) => {
  const consumer = hasOntologyValue(ontology, "application", ["gaming", "consumer_home"]);
  const small = hasOntologyValue(ontology, "powerRange", ["micro_power", "small_power"]);
  const standby = hasOntologyValue(ontology, "topology", ["offline_standby"]);
  const dataCenter = isDataCenterUpsContext(ontology, question);
  const summary = consumer
    ? "有机会，但更像消费电子 / 外设渠道生意，而不是传统项目型 UPS 生意；核心是价格带、外观、静音、安全、品牌营销和售后换新。"
    : small || standby
      ? "仍有市场，但主线是家用、办公、小微企业、路由器/NAS/PC 的低成本短时备电；不适合按大型项目或高密数据中心逻辑评估。"
      : dataCenter
        ? "有条件机会，但必须按数据中心客户、功率段、模块指标、项目交付和服务网络判断，不应回落到低端小功率渠道策略。"
      : "有条件机会，但必须先锁定应用、功率段、拓扑、渠道和定位，否则会答非所问。";
  return `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Decision Summary
${summary}

Product Ontology
${buildProductOntologySection(ontology)}

Scope Boundary
${buildScopeBoundary(ontology, parsedQuestion, "market_opportunity")}

Market Opportunity
${list(buildDynamicFiveLooks(ontology, context, question).slice(0, 3))}

Commercialization Path
${list([
    consumer
      ? "先做电商 MVP，验证游戏 PC / 主机用户价格带、外观偏好、静音诉求和退换货率。"
      : dataCenter
        ? "先用 2-3 个 AIDC / colocation 标杆项目验证功率模块、并机、监控接口、认证和服务 SLA。"
        : "先做渠道 SKU，验证办公、家用、小微企业和 NAS/路由器场景的真实复购。",
    dataCenter ? "控制项目交付边界、备件体系和服务半径，用标杆项目毛利和复购能力决定是否扩大平台。" : "控制 SKU 数量和库存风险，用售后成本和渠道毛利决定是否扩张。",
    dataCenter ? "如果只能靠低价进入海外 colocation，应先补认证和服务网络，而不是重研发全新平台。" : "如果客户只为低价买单，应做成本优化而不是重研发。",
  ])}

Key Risks
${list([
    "需求分散导致库存周转慢。",
    "售后换新成本高于预期。",
    "缺少清晰定位时容易陷入低价同质化。",
    "如果把消费级/小功率问题按项目制大客户逻辑分析，会误判资源投入。",
  ])}

Final Recommendation
建议小规模验证，不建议直接大投入；只有当渠道转化、售后成本、价格带和复购数据成立后，才扩大产品线。

Confidence Level
Medium-High。判断基于 UPS ontology 和渠道/场景规则。

Data Caveats
1. 当前为本地规则版 V1.2.6，不调用后端、API、Gemini、OpenAI 或 Dify。
`.trim();
};

const buildUpsOntologyAnswer = (question, filters, context, questionType, parsedQuestion, ontology) => {
  const methodology = selectMethodology(parsedQuestion, ontology, questionType);
  const scopeGuard = applyScopeGuard(parsedQuestion, ontology, methodology);
  const answer =
    methodology === "industry_ups_strategy"
      ? buildIndustryUpsAnswer(question, filters, context, parsedQuestion, ontology)
      : methodology === "industrial_ups_data_center_positioning"
        ? buildIndustrialUpsDataCenterPositioningAnswer(question, filters, context, parsedQuestion, ontology)
        : methodology === "module_competitiveness_evaluation"
          ? buildModuleCompetitivenessAnswer(question, filters, context, parsedQuestion, ontology)
          : methodology === "bess_ups_architecture_impact"
            ? buildBessUpsArchitectureImpactAnswer(question, filters, context, parsedQuestion, ontology)
            : methodology === "liquid_cooling_impact_on_ups"
              ? buildLiquidCoolingImpactOnUpsAnswer(question, filters, context, parsedQuestion, ontology)
              : methodology === "aidc_ups_roadmap"
                ? buildAidcUpsRoadmapAnswer(question, filters, context, parsedQuestion, ontology)
                : methodology === "multi_track_product_prioritization"
                  ? buildMultiTrackProductPrioritizationAnswer(question, filters, context, parsedQuestion, ontology)
      : methodology === "form_factor_compare"
                    ? buildFormFactorCompareAnswer(question, filters, context, parsedQuestion, ontology)
                    : methodology === "battery_chemistry_analysis"
                      ? buildBatteryChemistryAnswer(question, filters, context, parsedQuestion, ontology)
                      : methodology === "unknown_ups_concept"
                        ? buildUnknownUpsConceptAnswer(question, filters, context, parsedQuestion, ontology)
                        : methodology === "product_investment_decision"
                          ? buildUpsInvestmentDecisionAnswer(question, filters, context, parsedQuestion, ontology)
                          : buildUpsMarketOpportunityAnswer(question, filters, context, parsedQuestion, ontology);
  return validateAnswerRelevance(answer, scopeGuard);
};
const displayCompanyName = (company) => {
  if (!company) return "该公司";
  return company.nameZh ? `${company.name}（${company.nameZh}）` : company.name;
};

const getDecisionCompany = (context) => {
  const named = context.namedCompanies[0];
  if (!named) return null;
  return context.companies.find((company) => company.id === named.id) || named;
};

const buildProductInvestmentDecisionAnswer = (question, filters, context) => {
  const company = getDecisionCompany(context);
  const companyName = displayCompanyName(company);
  const productLabel = getDecisionProductLabel(question);
  const isIndustrialUps = productLabel === "工业 UPS";
  const isModularUps = productLabel === "模块化 UPS";
  const upsProduct = PRODUCT_OPPORTUNITIES.find((product) => product.track === "UPS");
  const modularUpsProduct = PRODUCT_OPPORTUNITIES.find((product) => product.track === "模块化 UPS");
  const primaryProduct = isModularUps ? modularUpsProduct : upsProduct;
  const manufacturingPain = CUSTOMER_PAIN_POINTS.find((point) => point.customer === "制造业");
  const energyPain = CUSTOMER_PAIN_POINTS.find((point) => point.customer === "能源与电力");
  const explicitAiContext = hasExplicitAiContext(question);
  const targetCustomers = isIndustrialUps
    ? "制造业、能源电力、石化、轨交、半导体、医疗、边缘节点和国产替代项目"
    : "政企、金融、边缘节点、第三方托管数据中心和国产替代项目";
  const decisionMode = isIndustrialUps
    ? "条件性投入 / 小步迭代"
    : isModularUps
      ? "小步迭代 / 重点投入"
      : "条件性投入";
  const platformAdvice = isIndustrialUps
    ? "不建议直接重投入开发完全全新的工业 UPS 平台，应先做平台升级 + 客户共创，验证高价值工业场景后再决定是否全新平台化。"
    : isModularUps
      ? "建议围绕现有 UPS 能力做新一代模块化平台升级，但不应脱离客户验证去重做全新架构。"
      : "建议先锁定目标客户和核心规格，再决定是平台升级、派生型号还是全新平台。";
  const productBoundary = isIndustrialUps
    ? "以工业级可靠性、电能质量、抗扰动、防护等级、远程运维、国产化适配和现场服务能力为边界；模块化 UPS 只作为相邻参考，不作为主产品定义。"
    : "以高功率密度、热插拔、快速维护、远程监控和项目交付效率为边界；不要把单品立项扩展成泛化基础设施组合。";
  const scopeDescription = isIndustrialUps
    ? "UPS、工业 UPS、模块化 UPS 相邻参考、电能质量、工业级可靠性、远程运维、国产替代和工业场景服务能力"
    : "UPS、模块化 UPS、远程运维、国产替代和服务能力";
  const marketSpace = isIndustrialUps
    ? `工业 UPS 不是爆发型新赛道，但在${targetCustomers}中仍有结构性需求；新增空间来自设备连续运行、电能质量、国产替代和分散站点运维，而不是泛化的大规模建设周期。`
    : `模块化 UPS 的新增需求主要来自柔性扩容、快速维护、边缘节点和存量升级；${modularUpsProduct?.recommendedPriority || "重点投入"}只成立于能提升交付效率和服务收入的细分客户。`;
  const companyPosition = company
    ? `${companyName} 的现有基础是 ${cleanClause(company.scoreExplanation)}，机会在 ${cleanClause(company.opportunity)}，短板是 ${cleanClause(company.limitation)}。`
    : "当前问题未点名公司，因此只能按一般中国 UPS 厂商能力判断。";

  return `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Decision Summary
结论：${decisionMode}。${companyName}${platformAdvice} 本次问题范围锁定为 ${productLabel}，主分析对象只包含 ${scopeDescription}；${
    explicitAiContext ? "由于问题显式出现高密数据中心语境，可把相关架构作为背景风险。" : "不应把问题泛化为多赛道排名。"
  }

五看
${list([
    `看市场空间: ${marketSpace} 对 ${companyName} 而言，优先验证制造业产线、能源电力站点、石化和轨交等高停机成本场景，而不是把资源平均投向所有客户。`,
    `看客户痛点: 工业客户关注可靠性、抗扰动、防护等级、可维护性、远程运维、生命周期成本、国产化和服务响应；${manufacturingPain?.currentPain || "厂区环境复杂"} ${energyPain?.currentPain || "能源站点需要长寿命与调度兼容"} 这些痛点比单纯参数升级更重要。`,
    `看竞争格局: ${companyName} 应把科华、华为、维谛、伊顿、施耐德、台达作为 UPS 与工业客户能力对标对象，判断维度是认证、渠道、服务半径、项目制销售和可靠性口碑，而不是做数据中心多赛道排名。`,
    `看自身能力: ${companyPosition} 若要进入高价值${productLabel}，必须证明工业级可靠性、认证能力、项目制销售、服务网络、成本控制和定制响应，而不是只复用现有低价渠道打法。`,
    `看财务回报: ${primaryProduct?.recommendedPriority || "维持"}类产品的回报不来自高速增长，而来自毛利改善、服务收入、国产替代和客户粘性；若产品差异化不足，就会重新落入低价竞争并稀释研发回报。`,
  ])}

三定
${list([
    `定目标客户: 优先锁定半导体与精密制造、石化和能源电力站点、轨交和医疗关键负载、金融与政企边缘节点；暂不把低价通用渠道客户作为新平台首发对象。`,
    `定产品边界: ${productBoundary} 首版应聚焦核心规格、认证包、监控软件和维护工具，而不是一次性做过宽平台。`,
    `定投入策略: 采用客户共创 + 小批量验证 + 平台升级的条件性投入；只有当标杆客户愿意共同定义规格、验证周期和服务合同后，才进入全新平台化开发。`,
  ])}

Product Strategy
${list([
    `2026: 验证客户与核心规格，选择 3-5 个高价值工业场景共创样机，锁定可靠性、防护等级、抗扰动、远程运维和国产化认证要求。`,
    `2027: 平台化 / 系列化，把通过验证的规格沉淀为 10-80kVA、80-200kVA 或客户实际需要的功率段组合，并形成标准报价、备件和服务包。`,
    `2028: 智能运维 / 服务化 / 高端场景拓展，用远程监控、预测性维护、生命周期服务合同和行业认证案例提升毛利与客户粘性。`,
  ])}

Key Risks
${list([
    `市场增长不足: 工业 UPS 更多是结构性替换和国产替代，不应按高增长新赛道配置资源。`,
    `低价竞争: 若只做参数升级而没有可靠性、认证和服务差异化，${companyName} 会被拖回价格战。`,
    `定制化拖累研发: 工业项目需求碎片化，过早承诺过多定制会拉长研发周期并吞噬毛利。`,
    `工业认证周期: 防护、EMC、安规、行业准入和现场验证可能慢于销售预期。`,
    `服务网络不足: 分散工业站点要求快速响应，服务半径不足会直接削弱客户信任。`,
    `与现有产品线重叠: 若新一代${productLabel}不能明确高端工业场景边界，会与现有 UPS 产品互相蚕食。`,
  ])}

Final Recommendation
建议 ${companyName} 不要直接重投入开发完全全新的${productLabel}平台，而应先围绕高价值工业场景做平台升级 + 客户共创，验证可靠性、认证、服务收入和毛利改善后，再决定是否全新平台化。适合加大投入的条件是：拿到标杆客户共创、明确认证路径、服务网络可覆盖、毛利高于现有基本盘；不适合大投入的条件是：客户只愿为低价买单、需求高度定制化、认证周期不可控、内部能力仍停留在通用 UPS 销售。
`.trim();
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
1. 当前为本地规则版 V1.2.6，不调用后端、API、Gemini、OpenAI 或 Dify。
2. 数据来自 App 内置 expert-curated prototype data，适合做方向判断，不应直接替代正式市场数据库、客户访谈、年报、招标数据或产品手册。
3. 如果问题涉及公司财务、实时订单、股价、最新客户项目或政策更新，需要接入可审计外部数据后再形成正式结论。
`.trim();
};

const buildOutOfDomainAnswer = (question) => `
Question: ${question}

Scope boundary
PowerInsight 聚焦 data center power / cooling / energy infrastructure，包括 UPS、power module、CDU、liquid cooling、BBU/BESS、800VDC、HVDC 和相关数据中心基础设施。

Direct response
该问题不属于当前专业范围，因此不生成无关领域分析，也不输出金融投资建议。

Recommended next step
请把问题改写为数据中心供电、冷却、储能或电力电子基础设施相关问题。
`.trim();

const buildNonAnalyticalIntentAnswer = (question) => `
Question: ${question}

Scope boundary
PowerInsight 是 data center power / cooling / energy infrastructure 的垂直专家路由，不是创作写作工具。

Direct response
该请求属于 non-analytical / creative writing intent，不进入 UPS ontology、产品投资分析或市场路线图。

Recommended next step
可以改问 UPS、BESS、CDU、liquid cooling、power module 或 AIDC 供电架构相关的分析问题。
`.trim();

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
    `液冷与电源协同: ${cleanClause(profileA.liquidStrength || "液冷协同能力需进一步验证")}；${cleanClause(profileB.liquidStrength || "液冷协同能力需进一步验证")}；真正的竞争点是把 UPS、800VDC 或一体化电力模块与 CDU、监控和运维服务打成一个可交付包。`,
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
1. 当前为本地规则版 V1.2.6，不调用后端、API、Gemini、OpenAI 或 Dify。
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
1. 当前为本地规则版 V1.2.6，不调用后端、API、Gemini、OpenAI 或 Dify。
2. 公司对比优先基于 App 内置 company / product / tech / signal 数据和规则映射，适合做战略与产品判断，不应替代实时订单、财务披露或项目数据库。
3. 若需要形成正式投资结论或商务竞争判断，仍需补充年报、项目落地、价格体系、渠道深度和客户验证数据。
`.trim();
};

const buildMultiCompanyCompetitiveComparisonAnswer = (question, filters, context) => {
  const companies = context.primaryCompanies;
  const compareTracks =
    context.trackContext.focusTracks.length > 0 ? context.trackContext.focusTracks : dedupeTracks(companies.flatMap((company) => company.track));
  const powerFocus = compareTracks.filter((track) => POWER_TRACKS.includes(track));
  const companyLines = companies.map((company) => {
    const profile = getCompanyProfile(company);
    const coverage = coverageText(company, compareTracks);
    return `${company.name}${company.nameZh ? `（${company.nameZh}）` : ""}: ${coverage.text}；电源定位: ${
      profile.powerStrength || company.scoreExplanation
    }；区域/客户适配: ${profile.regionalAdvantage || regionFitLabel(company, filters)}；主要边界: ${company.limitation}。`;
  });
  const fitLines = companies.map((company) => {
    const profile = getCompanyProfile(company);
    return `${company.name}: 适合 ${customerFitLabel(company, filters)}；power focus 覆盖 ${coverageText(company, powerFocus).covered.join("、") || "不足"}。${
      profile.liquidStrength ? `液冷相关: ${profile.liquidStrength}` : ""
    }`;
  });

  return `
Question: ${question}
Analysis Context: ${audienceContext(filters)}

Direct conclusion
本次只比较用户显式点名的公司：${companies.map((company) => company.name).join("、")}。不引入任何未被点名公司。数据中心 power systems 的判断应拆成 UPS / 模块化 UPS / 配电 / 800VDC / BBU / 一体化电力模块 / 服务网络，而不是做泛化公司排名。

Comparison dimensions
${list([
  `Power scope: ${powerFocus.length > 0 ? joinTracks(powerFocus) : "UPS、模块化 UPS、HVDC、800VDC、一体化电力模块、BBU、GaN/SiC"}。`,
  "System integration: 是否能把 UPS、配电、电池、监控和服务打成可交付方案。",
  "AIDC fit: 是否具备高密项目、colocation/hyperscale 客户、认证和服务网络。",
  "Regional fit: 全球项目看服务网络和合规进入，中国项目看本地生态、交付速度和回款机制。",
])}

Application fit
${list(fitLines)}

Vendor implications
${list(companyLines)}

Recommended positioning
${list([
  "Vertiv: 更适合作为全球 hyperscale / colocation 高密电源与热管理方案参照。",
  "Schneider Electric: 更适合稳健型配电、UPS、标准化电气成套和 enterprise/colo 客户。",
  "Huawei Digital Power: 更适合中国智算中心、运营商、政企和预制化电力模块路线。",
  "Eaton: 更适合北美配电、中压设备、UPS 和并网/电力基础设施瓶颈相关机会。",
].filter((line) => companies.some((company) => includesText(line, company.name) || includesText(line, company.nameZh))))}

Scope boundary
本回答只覆盖 data center power systems，不输出股票、实时订单或财务投资建议；未被用户点名的公司不进入主分析。

Confidence Level
Medium-High。判断基于显式公司实体解析、内置公司画像和电源赛道映射；未接入实时订单、财报或项目数据库。

Data Caveats
1. 当前为本地规则版 V1.2.6，不调用后端、API、Gemini、OpenAI 或 Dify。
`.trim();
};

const sanitizeOutput = (text) =>
  String(text || "")
    .replace(/[。]{2,}/g, "。")
    .replace(/。；/g, "；")
    .replace(/\s+；/g, "；")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

export const generateAskPowerInsightAnswer = (question, filters) => {
  const cleanQuestion = (question || "").trim() || "请基于当前筛选条件生成数据中心电力电子市场洞察";
  const questionType = classifyQuestion(cleanQuestion);
  const parsedQuestion = parseQuestion(cleanQuestion);
  const ontology = inferProductOntology(parsedQuestion);
  const context = getRankedContext(cleanQuestion, filters, questionType);
  const answer =
    questionType === "out_of_domain"
      ? buildOutOfDomainAnswer(cleanQuestion)
      : questionType === "non_analytical_intent"
        ? buildNonAnalyticalIntentAnswer(cleanQuestion)
        : questionType !== "company_compare" && isUpsOntologyQuestion(parsedQuestion, ontology)
      ? buildUpsOntologyAnswer(cleanQuestion, filters, context, questionType, parsedQuestion, ontology)
      : questionType === "company_compare"
        ? context.namedCompanies.length > 2
          ? buildMultiCompanyCompetitiveComparisonAnswer(cleanQuestion, filters, context)
          : buildCompanyCompareReport(cleanQuestion, filters, context)
        : questionType === "product_investment_decision"
          ? buildProductInvestmentDecisionAnswer(cleanQuestion, filters, context)
          : buildGenericAnswer(cleanQuestion, filters, questionType, context);

  return sanitizeOutput(answer);
};
