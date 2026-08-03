import { createAnalysisContext } from "./contracts/analysisContext.js";

const unique = (values) => [...new Set(values.filter(Boolean))];
const normalized = (value) => String(value || "").toLowerCase().replace(/[\s_-]+/g, "");
const includesAny = (question, patterns) => patterns.some((pattern) => normalized(question).includes(normalized(pattern)));

const OBJECT_ONTOLOGY = Object.freeze([
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
  if (names.includes("模块化UPS") || names.includes("工业UPS") || names.includes("Gaming UPS") || names.includes("钠电UPS") || names.includes("MW级UPS")) {
    return names.filter((name) => name !== "UPS");
  }
  if (names.includes("液冷CDU")) return names.filter((name) => name !== "液冷");
  if (names.includes("GaN/SiC")) return names.filter((name) => !["GaN", "SiC"].includes(name));
  return names;
};

const classifyTask = (question) => {
  const referencedObjects = extractOntology(question, OBJECT_ONTOLOGY);
  if (referencedObjects.length >= 3 && includesAny(question, ["投资", "风险收益", "资源配置"])) return "INVESTMENT_COMPARISON";
  if (includesAny(question, ["投资者", "产业投资", "财务投资", "风险收益", "资源配置比较"])) return "INVESTMENT_COMPARISON";
  if (includesAny(question, ["竞争", "差异", "不同", "对比", "比较", "怎么比"]) && extractOntology(question, COMPANY_ONTOLOGY).length >= 2) return "COMPETITIVE_ANALYSIS";
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
    ["亚太", ["亚太", "亚洲", "东南亚", "日韩"]],
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
  const year = String(question || "").match(/20\d{2}/)?.[0];
  return year || null;
};

const resolveDecisionSubject = (question, clarification = {}) => {
  if (clarification.decision_subject) return clarification.decision_subject;
  if (includesAny(question, ["财务投资", "基金", "财务投资者"])) return "FINANCIAL_INVESTOR";
  if (includesAny(question, ["产业投资", "战略投资者"])) return "INDUSTRIAL_INVESTOR";
  if (includesAny(question, ["企业战略", "产品组合", "公司战略", "资源规划"])) return "CORPORATE_STRATEGY";
  if (includesAny(question, ["kstar", "科士达", "开发全新", "产品立项"])) return "PRODUCT_COMPANY";
  return "UNKNOWN";
};

const resolveRiskPreference = (question, clarification = {}) => {
  if (clarification.risk_preference) return clarification.risk_preference;
  if (includesAny(question, ["保守", "低风险"])) return "CONSERVATIVE";
  if (includesAny(question, ["激进", "高风险高收益"])) return "AGGRESSIVE";
  if (includesAny(question, ["平衡", "均衡"])) return "BALANCED";
  return "UNKNOWN";
};

const filterValue = (filters, field, ignored) => {
  const value = String(filters?.[field] || "").trim();
  return value && !ignored.includes(value) ? value : null;
};

export function buildAnalysisContext({ question, pageContext = {}, clarification = {} }) {
  const originalQuestion = String(question || "").trim();
  if (!originalQuestion) throw new Error("analysis_question_required");
  const filters = pageContext.normalizedFilters || pageContext.filters || pageContext || {};
  const taskType = classifyTask(originalQuestion);
  const fieldSources = { original_question: "QUESTION", task_type: "QUESTION" };

  const products = unique(extractOntology(originalQuestion, OBJECT_ONTOLOGY));
  const companies = unique(extractOntology(originalQuestion, COMPANY_ONTOLOGY));
  const explicitRegions = extractRegion(originalQuestion);
  const explicitCustomers = extractCustomer(originalQuestion);
  const explicitScenarios = extractScenarios(originalQuestion);
  const explicitScope = extractSystemScope(originalQuestion);
  const explicitTime = extractTimeHorizon(originalQuestion);
  const clarificationTime = String(clarification.time_horizon || "").trim() || null;

  const relevantFilterFields = taskType === "TECHNOLOGY_ROUTE"
    ? new Set(["region", "application", "time"])
    : taskType === "INVESTMENT_COMPARISON"
      ? new Set(["region", "time"])
      : new Set(["region", "customer", "application", "track", "time"]);

  const regionFilter = relevantFilterFields.has("region") ? filterValue(filters, "region", ["全球", "全部"]) : null;
  const customerFilter = relevantFilterFields.has("customer") ? filterValue(filters, "customer", ["全部"]) : null;
  const applicationFilter = relevantFilterFields.has("application") ? filterValue(filters, "application", ["全部"]) : null;
  const trackFilter = relevantFilterFields.has("track") ? filterValue(filters, "track", ["全部"]) : null;
  const timeFilter = relevantFilterFields.has("time") ? filterValue(filters, "time", ["全部"]) : null;

  const regions = explicitRegions.length ? explicitRegions : regionFilter ? [regionFilter] : ["全球"];
  const customerTypes = explicitCustomers.length ? explicitCustomers : customerFilter ? [customerFilter] : [];
  const applicationScenarios = explicitScenarios.length ? explicitScenarios : applicationFilter ? [applicationFilter] : [];
  const productOrTechnology = products.length ? products : trackFilter ? [trackFilter] : [];
  const timeHorizon = explicitTime || clarificationTime || timeFilter || "unknown";

  fieldSources.product_or_technology = products.length ? "QUESTION" : trackFilter ? "FILTER" : "DEFAULT";
  fieldSources.companies = companies.length ? "QUESTION" : "DEFAULT";
  fieldSources.regions = explicitRegions.length ? "QUESTION" : regionFilter ? "FILTER" : "DEFAULT";
  fieldSources.customer_types = explicitCustomers.length ? "QUESTION" : customerFilter ? "FILTER" : "DEFAULT";
  fieldSources.application_scenarios = explicitScenarios.length ? "QUESTION" : applicationFilter ? "FILTER" : "DEFAULT";
  fieldSources.power_or_system_scope = explicitScope.length ? "QUESTION" : "DEFAULT";
  fieldSources.time_horizon = explicitTime ? "QUESTION" : clarificationTime ? "CLARIFICATION" : timeFilter ? "FILTER" : "DEFAULT";

  const decisionSubject = resolveDecisionSubject(originalQuestion, clarification);
  const riskPreference = resolveRiskPreference(originalQuestion, clarification);
  fieldSources.decision_subject = clarification.decision_subject ? "CLARIFICATION" : decisionSubject !== "UNKNOWN" ? "QUESTION" : "DEFAULT";
  fieldSources.risk_preference = clarification.risk_preference ? "CLARIFICATION" : riskPreference !== "UNKNOWN" ? "QUESTION" : "DEFAULT";

  const assumptions = [];
  if (!explicitRegions.length && !regionFilter) assumptions.push("未指定区域，按全球视角分析");
  if (!explicitTime && !clarificationTime && !timeFilter) assumptions.push("未指定时间窗口，不使用精确时间承诺");
  if (!explicitCustomers.length && !customerFilter && taskType === "PRODUCT_INITIATIVE") assumptions.push("未指定客户类型，结论需按目标客户复核");
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
    : taskType === "PRODUCT_INITIATIVE"
      ? ["产品立项与更新评估"]
      : taskType === "TECHNOLOGY_ROUTE"
        ? ["技术路线机会与风险"]
        : ["专业决策分析"];

  fieldSources.analysis_perspective = fieldSources.decision_subject;
  fieldSources.assumptions = assumptions.length ? "DEFAULT" : "QUESTION";
  fieldSources.missing_high_impact_fields = missingHighImpact.length ? "QUESTION" : "DEFAULT";

  return createAnalysisContext({
    original_question: originalQuestion,
    task_type: taskType,
    product_or_technology: productOrTechnology,
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
    field_sources: fieldSources,
  });
}

export const classifyAnalysisTask = classifyTask;
