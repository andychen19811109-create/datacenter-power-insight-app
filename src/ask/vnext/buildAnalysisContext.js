import { createAnalysisContext } from "./contracts/analysisContext.js";
import {
  canonicalField,
  createCanonicalAnalysisInput,
} from "./contracts/canonicalAnalysisInput.js";

const unique = (values) => [...new Set(values.filter(Boolean))];
const normalized = (value) => String(value || "").toLowerCase().replace(/[\s_-]+/g, "");
const includesAny = (question, patterns) => patterns.some((pattern) => normalized(question).includes(normalized(pattern)));
const hasOwn = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key);

const OBJECT_ONTOLOGY = Object.freeze([
  { name: "电源", patterns: ["数据中心电源", "电源和液冷", "电源与液冷", "供电基础设施", "power infrastructure"] },
  { name: "模块化UPS", patterns: ["模块化ups", "modular ups"] },
  { name: "工业UPS", patterns: ["工业ups", "industrial ups"] },
  { name: "Gaming UPS", patterns: ["gaming ups", "游戏ups", "电竞ups"] },
  { name: "钠电UPS", patterns: ["钠电ups", "钠离子ups", "sodium-ion ups"] },
  { name: "MW级UPS", patterns: ["mw级ups", "兆瓦级ups", "mw ups"] },
  { name: "UPS", patterns: ["ups", "不间断电源"] },
  { name: "800VDC", patterns: ["800vdc", "800v dc"] },
  { name: "HVDC", patterns: ["hvdc", "高压直流"] },
  { name: "BBU", patterns: ["bbu", "battery backup unit"] },
  { name: "液冷CDU", patterns: ["液冷cdu", "cdu"] },
  { name: "液冷", patterns: ["液冷", "liquid cooling"] },
  { name: "GaN/SiC", patterns: ["gan/sic", "gan与sic", "gan和sic", "gan、sic", "氮化镓/碳化硅"] },
  { name: "GaN", patterns: ["gan", "氮化镓"] },
  { name: "SiC", patterns: ["sic", "碳化硅"] },
  { name: "SST", patterns: ["sst", "固态变压器"] },
  { name: "精密空调", patterns: ["精密空调"] },
  { name: "一体化电力模块", patterns: ["一体化电力模块"] },
  { name: "微模块", patterns: ["微模块"] },
  { name: "数据中心储能", patterns: ["数据中心储能", "储能"] },
  { name: "数据中心电力电子赛道", patterns: ["数据中心电力电子", "供电赛道"] },
]);

const COMPANY_ONTOLOGY = Object.freeze([
  { name: "Kstar", patterns: ["kstar", "科士达"] },
  { name: "Vertiv", patterns: ["vertiv", "维谛"] },
  { name: "华为", patterns: ["华为", "huawei"] },
  { name: "Schneider Electric", patterns: ["schneider", "施耐德"] },
  { name: "Eaton", patterns: ["eaton", "伊顿"] },
]);

const extractOntology = (question, ontology) => {
  const matched = ontology.filter((entry) => includesAny(question, entry.patterns));
  const names = matched.map((entry) => entry.name);
  if (names.some((name) => ["模块化UPS", "工业UPS", "Gaming UPS", "钠电UPS", "MW级UPS"].includes(name))) {
    return names.filter((name) => name !== "UPS");
  }
  if (names.includes("液冷CDU")) return names.filter((name) => name !== "液冷");
  if (names.includes("GaN/SiC")) return names.filter((name) => !["GaN", "SiC"].includes(name));
  return names;
};

const COMPANY_RELATION_HINTS = Object.freeze([
  "竞争", "差异", "不同", "对比", "比较", "怎么比", "各自", "相对", "vs",
]);
const NON_COMPANY_LATIN_TOKENS = new Set([
  "AI", "BBU", "CDU", "GAN", "GPU", "HVDC", "SIC", "SST", "UPS", "VDC",
]);
const genericLatinEntities = (value) => unique(
  [...String(value || "").matchAll(/\b([A-Z][A-Za-z0-9&.-]{1,39})\b/g)]
    .map((match) => match[1])
    .filter((name) => !NON_COMPANY_LATIN_TOKENS.has(name.toUpperCase())),
);

const extractGenericComparedCompanies = (question) => {
  if (!includesAny(question, COMPANY_RELATION_HINTS)) return [];
  const text = String(question || "");
  const values = [];
  const latinPatterns = [
    /\b([A-Z][A-Za-z0-9&.-]{1,39})\s*(?:与|和|vs\.?|VS\.?|对比)\s*([A-Z][A-Za-z0-9&.-]{1,39})\b/g,
    /\b([A-Z][A-Za-z0-9&.-]{1,39})\s*相对\s*([A-Z][A-Za-z0-9&.-]{1,39})\b/g,
  ];
  for (const pattern of latinPatterns) {
    for (const match of text.matchAll(pattern)) values.push(match[1], match[2]);
  }
  const chinese = text.match(/([\u4e00-\u9fa5]{2,12}(?:公司|集团|科技|电气|能源))\s*(?:与|和|对比)\s*([\u4e00-\u9fa5]{2,12}(?:公司|集团|科技|电气|能源))/);
  if (chinese) values.push(chinese[1], chinese[2]);
  return unique(values);
};

const extractSubjectCompanies = (question) => {
  const text = String(question || "");
  const values = [];
  const patterns = [
    /(?:如果|假设)?我是\s*([A-Z][A-Za-z0-9&.-]{1,39})\b/g,
    /(?:作为|站在)\s*([A-Z][A-Za-z0-9&.-]{1,39})(?:公司)?(?:的角度|的立场)?/g,
    /(?:分析|评估)\s*([A-Z][A-Za-z0-9&.-]{1,39})(?:公司)?(?:的|在)/g,
    /^\s*([A-Z][A-Za-z0-9&.-]{1,39})(?:公司)?\s*(?:是否|需不需要|需要|应该|应不应该|值不值得|是否值得|该不该|面对|应对|的竞争对手|的竞争优势)/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) values.push(match[1]);
  }
  const facingIndex = text.search(/面对|应对/);
  if (facingIndex >= 0) values.push(...extractOntology(text.slice(0, facingIndex), COMPANY_ONTOLOGY));
  return unique(values).filter((name) => !NON_COMPANY_LATIN_TOKENS.has(name.toUpperCase()));
};

const extractRoleLabeledCompetitors = (question) => {
  const text = String(question || "");
  const values = [];
  const segments = [];
  for (const match of text.matchAll(/(?:面对|应对)\s*([^，。？；]+)/g)) segments.push(match[1]);
  for (const match of text.matchAll(/(?:竞争对手|竞品|对标对象)(?:是|包括|包含|有|为|：|:)?\s*([^，。？；]+)/g)) segments.push(match[1]);
  for (const segment of segments) {
    values.push(...genericLatinEntities(segment));
    values.push(...extractOntology(segment, COMPANY_ONTOLOGY));
  }
  return unique(values);
};

const resolveCompanyEntityRoles = (question) => {
  const ontologyEntities = extractOntology(question, COMPANY_ONTOLOGY);
  const comparedEntities = extractGenericComparedCompanies(question);
  const subjectEntities = extractSubjectCompanies(question);
  const labeledCompetitors = extractRoleLabeledCompetitors(question)
    .filter((name) => !subjectEntities.includes(name));
  const detected = unique([
    ...ontologyEntities,
    ...comparedEntities,
    ...subjectEntities,
    ...labeledCompetitors,
  ]);
  const nonSubjectDetected = detected.filter((name) => !subjectEntities.includes(name));
  const relationCompetitors = includesAny(question, COMPANY_RELATION_HINTS)
    && nonSubjectDetected.length >= 2 ? nonSubjectDetected : [];
  return {
    detected,
    competitors: unique([...comparedEntities, ...relationCompetitors, ...labeledCompetitors])
      .filter((name) => !subjectEntities.includes(name)),
  };
};

const classifyTask = (question) => {
  const referencedObjects = extractOntology(question, OBJECT_ONTOLOGY);
  if (referencedObjects.length >= 3 && includesAny(question, ["投资", "风险收益", "资源配置"])) return "INVESTMENT_COMPARISON";
  if (includesAny(question, ["投资者", "产业投资", "财务投资", "风险收益", "资源配置比较"])) return "INVESTMENT_COMPARISON";
  if (includesAny(question, COMPANY_RELATION_HINTS)
    && resolveCompanyEntityRoles(question).competitors.length >= 2) return "COMPETITIVE_ANALYSIS";
  if (includesAny(question, ["产品规划", "路线图", "资源规划", "如何规划"])) return "PORTFOLIO_PLANNING";
  if (includesAny(question, ["未来3年", "未来三年", "最值得投入的赛道", "趋势优先级"])) return "TREND_PRIORITIZATION";
  if (includesAny(question, ["机会和风险", "机会与风险", "技术机会", "限制与风险", "有哪些价值", "技术路线", "供电架构", "成熟度", "替代路线"])) return "TECHNOLOGY_ROUTE";
  if (includesAny(question, ["是否需要", "是否值得", "值得投入", "值得做", "开发全新", "产品立项", "立项", "投入", "该不该"])) return "PRODUCT_INITIATIVE";
  return "UNKNOWN";
};

const extractRegion = (question) => {
  const regions = [
    ["中国", ["中国", "国内"]],
    ["北美", ["北美", "美国", "加拿大"]],
    ["欧洲", ["欧洲", "欧盟", "德国", "英国", "法国"]],
    ["东南亚", ["东南亚"]],
    ["亚太", ["亚太", "亚洲", "日韩"]],
    ["全球", ["全球", "global", "worldwide"]],
  ];
  return regions.filter(([, patterns]) => includesAny(question, patterns)).map(([name]) => name);
};

const extractCustomer = (question) => {
  const customers = [
    ["云服务商", ["云服务商", "云厂商", "hyperscaler"]],
    ["第三方数据中心", ["第三方数据中心", "托管数据中心", "colocation"]],
    ["电信运营商", ["电信运营商", "运营商", "telco"]],
    ["金融客户", ["金融", "银行", "证券"]],
    ["工业客户", ["工业客户", "制造业", "工厂"]],
  ];
  return customers.filter(([, patterns]) => includesAny(question, patterns)).map(([name]) => name);
};

const extractScenarios = (question) => {
  const scenarios = [
    ["AI数据中心", ["ai数据中心", "ai data center"]],
    ["AI训练集群", ["ai训练", "训练集群", "ai factory"]],
    ["AI推理集群", ["ai推理", "推理集群"]],
    ["存量改造", ["存量改造", "retrofit"]],
    ["边缘数据中心", ["边缘数据中心", "边缘机房"]],
  ];
  return scenarios.filter(([, patterns]) => includesAny(question, patterns)).map(([name]) => name);
};

const extractSystemScope = (question) => {
  const values = [];
  if (includesAny(question, ["设施级", "facility-level"])) values.push("设施级");
  if (includesAny(question, ["机架级", "rack-level", "机柜级"])) values.push("机架级");
  if (includesAny(question, ["gpu侧", "gpu-side", "芯片侧"])) values.push("GPU侧");
  const powerMatches = String(question || "").match(/\b\d+(?:\.\d+)?\s*(?:mw|kw)\b/gi) || [];
  values.push(...powerMatches.map((item) => item.toUpperCase().replace(/\s+/g, "")));
  if (includesAny(question, ["mw级", "兆瓦级"])) values.push("MW级");
  return unique(values);
};

const extractTimeHorizon = (question) => {
  if (includesAny(question, ["未来3年", "未来三年"])) return "未来3年";
  if (includesAny(question, ["近期", "短期"])) return "近期";
  if (includesAny(question, ["长期", "远期"])) return "长期";
  const yearRange = String(question || "").match(/20\d{2}\s*[-—至到]\s*20\d{2}/)?.[0];
  if (yearRange) return yearRange;
  const year = String(question || "").match(/20\d{2}/)?.[0];
  return year || "";
};

const resolveQuestionDecisionSubject = (question) => {
  if (includesAny(question, ["财务投资", "基金", "财务投资者"])) return "FINANCIAL_INVESTOR";
  if (includesAny(question, ["产业投资", "战略投资者"])) return "INDUSTRIAL_INVESTOR";
  if (includesAny(question, ["企业战略", "产品组合", "公司战略", "资源规划"])) return "CORPORATE_STRATEGY";
  if (includesAny(question, ["kstar", "科士达", "开发全新", "产品立项"])) return "PRODUCT_COMPANY";
  return "UNKNOWN";
};

const resolveQuestionRiskPreference = (question) => {
  if (includesAny(question, ["保守", "低风险"])) return "CONSERVATIVE";
  if (includesAny(question, ["激进", "高风险高收益"])) return "AGGRESSIVE";
  if (includesAny(question, ["平衡", "均衡"])) return "BALANCED";
  return "UNKNOWN";
};

const TASK_GOALS = Object.freeze({
  PRODUCT_INITIATIVE: "产品立项与更新评估",
  TECHNOLOGY_ROUTE: "技术路线机会与风险评估",
  INVESTMENT_COMPARISON: "投资与资源配置比较",
  COMPETITIVE_ANALYSIS: "竞争差异与进入策略分析",
  PORTFOLIO_PLANNING: "产品组合与路线图规划",
  TREND_PRIORITIZATION: "趋势与赛道优先级分析",
  UNKNOWN: "专业决策分析",
});

const normalizeArrayInput = (value) => unique((Array.isArray(value) ? value : String(value || "").split(/[、,，/]/))
  .map((item) => String(item || "").trim()));
const normalizeScalarInput = (value) => String(value || "").trim();
const sameValue = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const specified = (value) => Array.isArray(value) ? value.length > 0 : Boolean(String(value || "").trim());

const resolveCanonicalField = ({ manual, question, page, inference, array = true }) => {
  const normalizer = array ? normalizeArrayInput : normalizeScalarInput;
  const candidates = [
    ["MANUAL", manual.present ? normalizer(manual.value) : array ? [] : "", manual.present],
    ["QUESTION", normalizer(question), specified(normalizer(question))],
    ["PAGE", normalizer(page), specified(normalizer(page))],
    ["INFERENCE", normalizer(inference), specified(normalizer(inference))],
  ];
  const selected = candidates.find(([, , available]) => available);
  const source = selected?.[0] || "UNSPECIFIED";
  const value = selected?.[1] ?? (array ? [] : "");
  const conflicts = candidates
    .filter(([candidateSource, candidateValue, available]) => available
      && candidateSource !== source
      && !sameValue(candidateValue, value))
    .map(([candidateSource, candidateValue]) => ({ source: candidateSource, value: candidateValue }));
  return canonicalField(value, source, conflicts);
};

const pageValue = (filters, field, ignored = []) => {
  const value = String(filters?.[field] || "").trim();
  return value && !ignored.includes(value) ? value : "";
};

export function buildCanonicalAnalysisInput({ question, pageContext = {}, clarification = {}, manual = {} }) {
  const originalQuestion = String(question || "").trim();
  if (!originalQuestion) throw new Error("analysis_question_required");
  const filters = pageContext.normalizedFilters || pageContext.filters || pageContext || {};
  const taskType = classifyTask(originalQuestion);
  const explicitProducts = unique(extractOntology(originalQuestion, OBJECT_ONTOLOGY));
  const companyRoles = resolveCompanyEntityRoles(originalQuestion);
  const explicitRegions = extractRegion(originalQuestion);
  const explicitCustomers = extractCustomer(originalQuestion);
  const explicitScenarios = extractScenarios(originalQuestion);
  const explicitTime = extractTimeHorizon(originalQuestion);

  const manualValue = (field, fallback) => ({
    present: hasOwn(manual, field),
    value: hasOwn(manual, field) ? manual[field] : fallback,
  });

  const track = resolveCanonicalField({
    manual: manualValue("track", []),
    question: explicitProducts,
    page: pageValue(filters, "track", ["全部"]),
    inference: [],
  });
  const application = resolveCanonicalField({
    manual: manualValue("application", []),
    question: explicitScenarios,
    page: pageValue(filters, "application", ["全部"]),
    inference: [],
  });
  const region = resolveCanonicalField({
    manual: manualValue("region", []),
    question: explicitRegions,
    page: pageValue(filters, "region", ["全部", "全球"]),
    inference: [],
  });
  const customerType = resolveCanonicalField({
    manual: manualValue("customer_type", []),
    question: explicitCustomers,
    page: pageValue(filters, "customer", ["全部"]),
    inference: [],
  });
  const analysisGoal = resolveCanonicalField({
    manual: manualValue("analysis_goal", ""),
    question: "",
    page: "",
    inference: TASK_GOALS[taskType] || TASK_GOALS.UNKNOWN,
    array: false,
  });
  const competitors = resolveCanonicalField({
    manual: manualValue("known_competitors", []),
    question: companyRoles.competitors,
    page: "",
    inference: [],
  });
  const clarificationTime = normalizeScalarInput(clarification.time_horizon);
  const timeHorizon = resolveCanonicalField({
    manual: manualValue("time_horizon", clarificationTime),
    question: explicitTime,
    page: "",
    inference: "",
    array: false,
  });
  if (!hasOwn(manual, "time_horizon") && clarificationTime) {
    timeHorizon.value = clarificationTime;
    timeHorizon.source = "MANUAL";
    if (explicitTime && explicitTime !== clarificationTime) timeHorizon.conflicts.unshift({ source: "QUESTION", value: explicitTime });
  }
  const extraContext = resolveCanonicalField({
    manual: manualValue("extra_context", clarification.extra_context || ""),
    question: "",
    page: "",
    inference: "",
    array: false,
  });
  if (!hasOwn(manual, "extra_context") && clarification.extra_context) extraContext.source = "MANUAL";

  const rawSelections = {
    role: normalizeScalarInput(filters.role),
    region: normalizeScalarInput(filters.region),
    customer: normalizeScalarInput(filters.customer),
    application: normalizeScalarInput(filters.application),
    track: normalizeScalarInput(filters.track),
    time: normalizeScalarInput(filters.time),
  };
  const pageContextValue = {
    user_role: rawSelections.role,
    page_region: rawSelections.region,
    page_customer_type: rawSelections.customer,
    page_application: rawSelections.application,
    page_track: rawSelections.track,
    page_time_filter: rawSelections.time,
    raw_selections: rawSelections,
  };

  return createCanonicalAnalysisInput({
    question: canonicalField(originalQuestion, "QUESTION", []),
    track,
    application,
    region,
    customer_type: customerType,
    analysis_goal: analysisGoal,
    known_competitors: competitors,
    time_horizon: timeHorizon,
    extra_context: extraContext,
    page_ctx: canonicalField(
      pageContextValue,
      Object.values(rawSelections).some(Boolean) ? "PAGE" : "UNSPECIFIED",
      [],
    ),
  });
}

export function buildAnalysisContext({ question, pageContext = {}, clarification = {}, manual = {} }) {
  const canonicalInput = buildCanonicalAnalysisInput({ question, pageContext, clarification, manual });
  const originalQuestion = canonicalInput.question.value;
  const taskType = classifyTask(originalQuestion);
  const products = canonicalInput.track.value;
  const companies = resolveCompanyEntityRoles(originalQuestion).detected;
  const regions = canonicalInput.region.value;
  const customerTypes = canonicalInput.customer_type.value;
  const applicationScenarios = canonicalInput.application.value;
  const explicitScope = extractSystemScope(originalQuestion);
  const timeHorizon = canonicalInput.time_horizon.value || "unknown";

  const questionDecisionSubject = resolveQuestionDecisionSubject(originalQuestion);
  const questionRiskPreference = resolveQuestionRiskPreference(originalQuestion);
  const decisionSubject = questionDecisionSubject !== "UNKNOWN"
    ? questionDecisionSubject
    : clarification.decision_subject || "UNKNOWN";
  const riskPreference = questionRiskPreference !== "UNKNOWN"
    ? questionRiskPreference
    : clarification.risk_preference || "UNKNOWN";

  const assumptions = [];
  if (!regions.length) assumptions.push("未指定分析区域，由原始问题与R2方法论保留开放边界");
  if (!canonicalInput.time_horizon.value) assumptions.push("未指定分析时间范围，不使用精确时间承诺");
  if (!customerTypes.length && taskType === "PRODUCT_INITIATIVE") assumptions.push("未指定客户类型，结论需按目标客户复核");
  if (clarification.gaming_definition) assumptions.push(`Gaming UPS定义：${clarification.gaming_definition}`);
  if (clarification.sodium_scope) assumptions.push(`钠电UPS评估范围：${clarification.sodium_scope}`);
  if (clarification.assumption) assumptions.push(clarification.assumption);

  const missingHighImpact = [];
  const dualScenarioAccepted = decisionSubject === "UNKNOWN" && /(?:双情景分析|多情景比较)/.test(String(clarification.assumption || ""));
  if (taskType === "INVESTMENT_COMPARISON" && decisionSubject === "UNKNOWN" && !dualScenarioAccepted) missingHighImpact.push("decision_subject");
  if (products.includes("Gaming UPS") && !clarification.gaming_definition) missingHighImpact.push("gaming_definition");
  if (products.includes("钠电UPS") && !clarification.sodium_scope) missingHighImpact.push("sodium_scope");

  const perspective = taskType === "INVESTMENT_COMPARISON"
    ? [decisionSubject === "UNKNOWN" ? "投资者视角待确认" : decisionSubject]
    : [canonicalInput.analysis_goal.value || "专业决策分析"];

  const decisionSource = questionDecisionSubject !== "UNKNOWN"
    ? "QUESTION"
    : clarification.decision_subject ? "MANUAL" : "UNSPECIFIED";
  const riskSource = questionRiskPreference !== "UNKNOWN"
    ? "QUESTION"
    : clarification.risk_preference ? "MANUAL" : "UNSPECIFIED";

  return createAnalysisContext({
    canonical_input: canonicalInput,
    original_question: originalQuestion,
    task_type: taskType,
    product_or_technology: products,
    companies,
    application_scenarios: applicationScenarios,
    regions,
    customer_types: customerTypes,
    power_or_system_scope: explicitScope,
    time_horizon: timeHorizon,
    decision_subject: decisionSubject,
    analysis_perspective: perspective,
    risk_preference: riskPreference,
    assumptions,
    missing_high_impact_fields: missingHighImpact,
    field_sources: {
      original_question: "QUESTION",
      task_type: "INFERENCE",
      product_or_technology: canonicalInput.track.source,
      companies: companies.length ? "QUESTION" : "UNSPECIFIED",
      application_scenarios: canonicalInput.application.source,
      regions: canonicalInput.region.source,
      customer_types: canonicalInput.customer_type.source,
      power_or_system_scope: explicitScope.length ? "QUESTION" : "UNSPECIFIED",
      time_horizon: canonicalInput.time_horizon.source,
      decision_subject: decisionSource,
      analysis_perspective: "INFERENCE",
      risk_preference: riskSource,
      assumptions: assumptions.length ? "INFERENCE" : "UNSPECIFIED",
      missing_high_impact_fields: missingHighImpact.length ? "INFERENCE" : "UNSPECIFIED",
    },
  });
}

export const classifyAnalysisTask = classifyTask;
