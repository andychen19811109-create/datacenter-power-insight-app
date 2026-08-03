const PLANNING_FIELDS = new Set(["recommended_actions", "validation_gates", "exit_conditions"]);

export const NUMERIC_CLAIM_TYPES = Object.freeze({
  NONE: "NONE",
  SOURCE_BOUND: "SOURCE_BOUND",
  USER_PROVIDED: "USER_PROVIDED",
  TECHNICAL_IDENTIFIER: "TECHNICAL_IDENTIFIER",
  PLANNING_ASSUMPTION: "PLANNING_ASSUMPTION",
  UNSUPPORTED_QUANTITATIVE_CLAIM: "UNSUPPORTED_QUANTITATIVE_CLAIM",
});

export const NUMERIC_CLAIM_HANDLING = Object.freeze({
  RETAINED: "RETAINED",
  REWRITTEN_QUALITATIVE: "REWRITTEN_QUALITATIVE",
  RECLASSIFIED_PLANNING: "RECLASSIFIED_PLANNING",
  REMOVED: "REMOVED",
});

const QUANTITATIVE_TOKEN = /\d+(?:\.\d+)?(?:\s*(?:[-–—~至到]\s*\d+(?:\.\d+)?)?)?\s*(?:%|kW|MW|kWh|MWh|W|VDC|VAC|V|U|年|个月|月|天|周|家|台|个|项|亿元|万元|元|人|级|倍|小时|分钟|次)?/gi;
const VOLTAGE_IDENTIFIER = /\b\d+(?:\.\d+)?\s*V(?:DC|AC)?\b/gi;
const MALFORMED_NUMERIC_CLAIM = /(?:向\+|单柜\+|预计左右|\*模块|≥效率|在-负载区间)/;

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isQuantitativeToken = (token) => /\d/.test(token) && Boolean(token.match(QUANTITATIVE_TOKEN));

const extractNumericTokens = (value) => String(value || "").match(QUANTITATIVE_TOKEN)?.filter(isQuantitativeToken) || [];

const technicalIdentifiers = (analysisContext) => {
  const contextual = [
    ...(analysisContext?.product_or_technology || []),
    ...(analysisContext?.power_or_system_scope || []),
  ].filter((item) => /\d/.test(String(item)));
  const voltage = String(analysisContext?.original_question || "").match(VOLTAGE_IDENTIFIER) || [];
  return [...new Set([...contextual, ...voltage])];
};

const userProvidedTokens = (analysisContext) => extractNumericTokens([
  analysisContext?.original_question,
  analysisContext?.time_horizon,
  ...(analysisContext?.power_or_system_scope || []),
].join(" "));

const withoutTechnicalIdentifiers = (value, analysisContext) => {
  let remaining = String(value || "");
  for (const identifier of technicalIdentifiers(analysisContext)) {
    remaining = remaining.replace(new RegExp(escapeRegExp(identifier), "gi"), "");
  }
  return remaining.replace(VOLTAGE_IDENTIFIER, "");
};

const hasOnlyProtectedTechnicalNumbers = (value, analysisContext) => extractNumericTokens(
  withoutTechnicalIdentifiers(value, analysisContext),
).length === 0;

const hasOnlyUserProvidedNumbers = (value, analysisContext) => {
  const tokens = userProvidedTokens(analysisContext);
  const unprotected = extractNumericTokens(withoutTechnicalIdentifiers(value, analysisContext));
  return unprotected.length > 0 && unprotected.every((token) => tokens.includes(token));
};

export function classifyNumericClaim({ value, field, sourceRef = null, analysisContext }) {
  const text = String(value || "");
  if (MALFORMED_NUMERIC_CLAIM.test(text) && !sourceRef) return NUMERIC_CLAIM_TYPES.UNSUPPORTED_QUANTITATIVE_CLAIM;
  if (!extractNumericTokens(text).length) return NUMERIC_CLAIM_TYPES.NONE;
  if (sourceRef) return NUMERIC_CLAIM_TYPES.SOURCE_BOUND;
  if (hasOnlyProtectedTechnicalNumbers(text, analysisContext)) return NUMERIC_CLAIM_TYPES.TECHNICAL_IDENTIFIER;
  if (hasOnlyUserProvidedNumbers(text, analysisContext)) return NUMERIC_CLAIM_TYPES.USER_PROVIDED;
  if (PLANNING_FIELDS.has(field)) return NUMERIC_CLAIM_TYPES.PLANNING_ASSUMPTION;
  return NUMERIC_CLAIM_TYPES.UNSUPPORTED_QUANTITATIVE_CLAIM;
}

const protect = (value, protectedValues) => {
  let output = String(value || "");
  const replacements = [];
  protectedValues.filter(Boolean).forEach((item, index) => {
    const token = `__DCPI_PROTECTED_${String.fromCharCode(65 + index)}__`;
    const matcher = new RegExp(escapeRegExp(item), "gi");
    if (matcher.test(output)) {
      output = output.replace(matcher, token);
      replacements.push([token, item]);
    }
  });
  return { output, replacements };
};

const restore = (value, replacements) => replacements.reduce((output, [token, original]) => output.replaceAll(token, original), value);

export function generalizeUnsupportedQuantitativeClaim(value, analysisContext) {
  return rewriteUnsupportedQuantitativeClaim(value, analysisContext).value;
}

// Numeric policy operates on the complete claim. It never removes individual
// characters and leaves the remainder of an unsupported sentence visible.
export function rewriteUnsupportedQuantitativeClaim(
  value,
  analysisContext,
  field = "",
) {
  const text = String(value || "").trim();
  if (/单柜.*(?:向\+|\d+\s*[–-]\s*\d+\s*kW|\d+\s*kW)/i.test(text)) {
    return {
      value: `AI算力负载正推动机柜功率需求提高，对供电容量、配电损耗和散热提出更高要求；具体功率区间需要来源支持。${/800VDC/i.test(text) ? "800VDC作为技术标识保留。" : ""}`,
      handling: NUMERIC_CLAIM_HANDLING.REWRITTEN_QUALITATIVE,
    };
  }
  if (/(?:预计|预期).{0,12}(?:普及|规模化|采用)|(?:普及|规模化|采用).{0,12}(?:左右|年)/i.test(text)) {
    return {
      value: "当前报告没有足够来源支持明确的规模化采用时间。",
      handling: NUMERIC_CLAIM_HANDLING.REWRITTEN_QUALITATIVE,
    };
  }
  if (/(?:效率|负载区间|开发周期|样机|POC|验证门).*(?:\d|≥|≤)|(?:\d|≥|≤).*(?:效率|负载区间|开发周期|样机|POC|验证门)/i.test(text)) {
    if (PLANNING_FIELDS.has(field)) {
      return {
        value: "建议验证门槛：具体效率、负载区间和开发周期由企业在项目立项时确认，不作为市场事实。",
        handling: NUMERIC_CLAIM_HANDLING.RECLASSIFIED_PLANNING,
      };
    }

    if (field === "one_line_conclusion") {
      return {
        value: "当前定量依据不足，结论只能保持条件化；不能据此直接支持产品化或规模化判断。",
        handling: NUMERIC_CLAIM_HANDLING.REWRITTEN_QUALITATIVE,
      };
    }

    if (field === "recommended_decision") {
      return {
        value: "先完成效率、负载区间和开发周期验证，再决定是否进入下一阶段产品化评估。",
        handling: NUMERIC_CLAIM_HANDLING.REWRITTEN_QUALITATIVE,
      };
    }

    return {
      value: "相关定量依据缺少来源支持，应作为待验证条件而非已确认事实。",
      handling: NUMERIC_CLAIM_HANDLING.REWRITTEN_QUALITATIVE,
    };
  }
  if (/\b(?:\d+(?:\.\d+)?\s*)?(?:VDC|VAC|V)\b/i.test(text)
    && hasOnlyProtectedTechnicalNumbers(text, analysisContext)) {
    return { value: text, handling: NUMERIC_CLAIM_HANDLING.RETAINED };
  }
  const protectedValues = [...technicalIdentifiers(analysisContext), ...userProvidedTokens(analysisContext)];
  const { output, replacements } = protect(value, protectedValues);
  const withoutNumbers = output
    .replace(/建议以\s*L2\s*验证/gi, "建议以小规模验证")
    .replace(/有条件L3\b/gi, "有条件进入下一阶段产品化评估")
    .replace(/\bL1\b/gi, "持续跟踪")
    .replace(/\bL2\b/gi, "小规模验证")
    .replace(/\bL3\b/gi, "下一阶段产品化评估")
    .replace(/\bL4\b/gi, "规模化投入评估")
    .replace(/投入等级\s*[：:]?\s*小规模验证(?:小规模验证)?/g, "建议投入阶段（小规模验证）")
    .replace(/投入等级\s*[：:]?\s*L\d\b/gi, "建议投入阶段")
    .replace(/有条件L\d\b/gi, "有条件进入下一建议阶段")
    .replace(/\bL\d\b/gi, "建议阶段")
    .replace(QUANTITATIVE_TOKEN, "")
    .replace(/(?:至少|约|超过|不低于|不少于|近|约为)\s*(?=[，。；、])/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/，\s*[，。；]/g, "，")
    .replace(/\(\s*\)|（\s*）/g, "")
    .replace(/[（(]\s*\+\s*[）)]/g, "")
    .replace(/小规模验证小规模验证/g, "小规模验证")
    .replace(/小规模验证验证/g, "小规模验证")
    .replace(/持续跟踪跟踪/g, "持续跟踪")
    .replace(/下一阶段产品化评估产品化立项/g, "下一阶段产品化立项")
    .trim();
  const restored = restore(withoutNumbers, replacements)
    .replace(/^[-—:：\s]+/, "")
    .replace(/[，、；]\s*$/, "")
    .trim();
  if (restored.length >= 12 && !/(?:向\+|单柜\+|预计左右|\*模块|≥效率|在-负载区间)/.test(restored)) {
    return { value: restored, handling: NUMERIC_CLAIM_HANDLING.REWRITTEN_QUALITATIVE };
  }
  return {
    value: "当前材料未提供可发布的定量依据，需要补充可追溯来源后再评估。",
    handling: NUMERIC_CLAIM_HANDLING.REMOVED,
  };
}

export const isPlanningField = (field) => PLANNING_FIELDS.has(field);
