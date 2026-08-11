import { isPlanningField } from "./numericClaimPolicy.js";

export const QUALITATIVE_CLAIM_TYPES = Object.freeze({
  SOURCE_BOUND_FACT: "SOURCE_BOUND_FACT",
  USER_PROVIDED_CONTEXT: "USER_PROVIDED_CONTEXT",
  ANALYTICAL_INFERENCE: "ANALYTICAL_INFERENCE",
  PLANNING_ASSUMPTION: "PLANNING_ASSUMPTION",
  UNSUPPORTED_QUALITATIVE_CLAIM: "UNSUPPORTED_QUALITATIVE_CLAIM",
});

const CURRENT_OR_MARKET_ASSERTION = /(?:市场|行业|技术|生态|标准|供应链|客户|需求|竞争|项目|部署|路线).{0,12}(?:已经|已被|正在|广泛(?:采用|部署)|尚未普及|已经成熟|行业领先|市场主流|确定性高|快速增长|强劲增长|真实可行|行业公认|市场确认|完成规模化(?:验证|部署|应用)|标准统一|生态成熟|需求强烈|客户普遍接受)|(?:已经|已被|正在|广泛(?:采用|部署)|尚未普及|已经成熟|行业领先|市场主流|确定性高|快速增长|强劲增长|真实可行|行业公认|市场确认|完成规模化(?:验证|部署|应用)|标准统一|生态成熟|需求强烈|客户普遍接受).{0,12}(?:市场|行业|技术|生态|标准|供应链|客户|需求|竞争|项目|部署|路线)/i;
const COMPANY_STATUS_ASSERTION = /(?:具备|缺乏|领先|主导|已送样|已经部署|已完成|资源充足|能力不足|市场位置)/i;
const STRONG_ROUTE_ASSERTION = /(?:绕不开|必然(?:成为|是)?|唯一(?:方向|路线|选择)|不可逆(?:趋势|方向)|注定(?:成为)?|必须(?:成为|采用))/i;
const ASSERTIVE_VERB = /(?:领先|成熟|普及|可行|适合|值得|已经|已被|广泛|主流|确定性高|快速增长|具备|缺乏|优于|能够|将会|会导致|意味着|属于|是(?:市场|行业|技术|成熟|主流|可行)|为(?:市场|行业|技术|成熟|主流|可行))/;
const INFERENCE_LANGUAGE = /(?:从当前(?:架构)?逻辑看|基于(?:现有)?分析条件|可以推断|可作为值得验证|结构推断|条件性|需(?:要)?(?:进一步)?验证|待(?:进一步)?验证|不能将|不能(?:将其)?视为|不(?:能|应)视为)/;
const USER_CONTEXT_LANGUAGE = /(?:用户(?:输入|问题|澄清|提供)|分析条件|筛选器|前提)/;

const normalized = (value) => String(value || "").replace(/\s+/g, " ").trim();
const hasNamedCompany = (value, analysisContext) => (analysisContext?.companies || [])
  .some((company) => normalized(company) && normalized(value).toLocaleLowerCase().includes(normalized(company).toLocaleLowerCase()));

const matchesUserContext = (value, analysisContext) => {
  const text = normalized(value);
  if (USER_CONTEXT_LANGUAGE.test(text)) return true;
  const inputs = [
    analysisContext?.original_question,
    ...(analysisContext?.assumptions || []),
    analysisContext?.time_horizon,
    ...(analysisContext?.regions || []),
    ...(analysisContext?.customer_types || []),
  ].map(normalized).filter(Boolean);
  return inputs.includes(text);
};

export function classifyQualitativeClaim({ value, field, sourceRef = null, analysisContext }) {
  const text = normalized(value);
  if (!text) return null;
  if (sourceRef) return QUALITATIVE_CLAIM_TYPES.SOURCE_BOUND_FACT;
  if (matchesUserContext(text, analysisContext)) return QUALITATIVE_CLAIM_TYPES.USER_PROVIDED_CONTEXT;
  if (
    STRONG_ROUTE_ASSERTION.test(text)
    || CURRENT_OR_MARKET_ASSERTION.test(text)
    || (hasNamedCompany(text, analysisContext) && COMPANY_STATUS_ASSERTION.test(text))
  ) {
    return QUALITATIVE_CLAIM_TYPES.UNSUPPORTED_QUALITATIVE_CLAIM;
  }
  if (!ASSERTIVE_VERB.test(text)) return null;
  if (isPlanningField(field)) return QUALITATIVE_CLAIM_TYPES.PLANNING_ASSUMPTION;
  return QUALITATIVE_CLAIM_TYPES.ANALYTICAL_INFERENCE;
}

export function conditionalInference(value) {
  return normalized(value);
}

export function unsupportedQualitativeFallback({ value, analysisContext }) {
  const text = normalized(value);
  const companies = (analysisContext?.companies || []).filter(Boolean);
  if (hasNamedCompany(text, analysisContext) && companies.length) {
    return `当前报告未绑定足够的${companies.join("、")}产品平台、资源能力、竞争地位或项目状态证据；需先核实相关公开资料和企业内部输入后再判断。`;
  }
  const objects = (analysisContext?.product_or_technology || []).filter(Boolean);
  const subject = objects.length ? objects.join("、") : "该方向";
  return `当前报告未绑定足够的市场采用、标准进展、项目部署或供应链证据；${subject}可作为值得验证的方向，但不能视为已完成市场验证或规模化部署。`;
}

export function userContextAnnotation(value) {
  const text = normalized(value);
  return /(?:用户输入|分析条件)/.test(text) ? text : `${text}（用户输入/分析条件，不作为外部事实）`;
}
