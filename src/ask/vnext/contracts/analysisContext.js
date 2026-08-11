export const ANALYSIS_CONTEXT_SCHEMA_VERSION = "dcpi.analysis-context.v1";

export const ANALYSIS_TASK_TYPES = Object.freeze([
  "PRODUCT_INITIATIVE",
  "TECHNOLOGY_ROUTE",
  "INVESTMENT_COMPARISON",
  "COMPETITIVE_ANALYSIS",
  "PORTFOLIO_PLANNING",
  "TREND_PRIORITIZATION",
  "UNKNOWN",
]);

export const DECISION_SUBJECTS = Object.freeze([
  "PRODUCT_COMPANY",
  "INDUSTRIAL_INVESTOR",
  "FINANCIAL_INVESTOR",
  "CORPORATE_STRATEGY",
  "UNKNOWN",
]);

export const RISK_PREFERENCES = Object.freeze([
  "CONSERVATIVE",
  "BALANCED",
  "AGGRESSIVE",
  "UNKNOWN",
]);

export const FIELD_SOURCES = Object.freeze([
  "MANUAL",
  "QUESTION",
  "PAGE",
  "INFERENCE",
  "UNSPECIFIED",
]);

const CONTEXT_KEYS = Object.freeze([
  "schema_version",
  "context_id",
  "canonical_input",
  "original_question",
  "task_type",
  "product_or_technology",
  "companies",
  "application_scenarios",
  "regions",
  "customer_types",
  "power_or_system_scope",
  "time_horizon",
  "decision_subject",
  "analysis_perspective",
  "risk_preference",
  "assumptions",
  "missing_high_impact_fields",
  "field_sources",
]);

const ARRAY_FIELDS = Object.freeze([
  "product_or_technology",
  "companies",
  "application_scenarios",
  "regions",
  "customer_types",
  "power_or_system_scope",
  "analysis_perspective",
  "assumptions",
  "missing_high_impact_fields",
]);

const isPlainObject = (value) => Boolean(value)
  && typeof value === "object"
  && !Array.isArray(value);

const hasExactKeys = (value, expected) => {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index]);
};

const isStringArray = (value) => Array.isArray(value)
  && value.every((item) => typeof item === "string" && item.trim().length > 0);

export const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

export const fingerprintAnalysisContext = (value) => {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `ctx_${(hash >>> 0).toString(16).padStart(8, "0")}`;
};

export function validateAnalysisContext(value) {
  const errors = [];
  if (!hasExactKeys(value, CONTEXT_KEYS)) {
    return { valid: false, errors: ["analysis_context_shape_invalid"] };
  }
  if (value.schema_version !== ANALYSIS_CONTEXT_SCHEMA_VERSION) errors.push("schema_version_invalid");
  if (typeof value.context_id !== "string" || !/^ctx_[a-f0-9]{8}$/.test(value.context_id)) errors.push("context_id_invalid");
  if (!isPlainObject(value.canonical_input) || !validateCanonicalAnalysisInput(value.canonical_input).valid) errors.push("canonical_input_invalid");
  if (typeof value.original_question !== "string" || !value.original_question.trim()) errors.push("original_question_invalid");
  if (!ANALYSIS_TASK_TYPES.includes(value.task_type)) errors.push("task_type_invalid");
  for (const field of ARRAY_FIELDS) {
    if (!isStringArray(value[field]) && !(Array.isArray(value[field]) && value[field].length === 0)) {
      errors.push(`${field}_invalid`);
    }
  }
  if (typeof value.time_horizon !== "string" || !value.time_horizon.trim()) errors.push("time_horizon_invalid");
  if (!DECISION_SUBJECTS.includes(value.decision_subject)) errors.push("decision_subject_invalid");
  if (!RISK_PREFERENCES.includes(value.risk_preference)) errors.push("risk_preference_invalid");
  if (!isPlainObject(value.field_sources)) {
    errors.push("field_sources_invalid");
  } else {
    for (const [field, source] of Object.entries(value.field_sources)) {
      if (!CONTEXT_KEYS.includes(field) || !FIELD_SOURCES.includes(source)) {
        errors.push("field_sources_invalid");
        break;
      }
    }
  }
  if (errors.length === 0) {
    const withoutId = { ...value, context_id: "" };
    if (value.context_id !== fingerprintAnalysisContext(withoutId)) errors.push("context_id_mismatch");
  }
  return { valid: errors.length === 0, errors };
}

export const createAnalysisContext = (fields) => {
  const candidate = {
    schema_version: ANALYSIS_CONTEXT_SCHEMA_VERSION,
    context_id: "",
    ...fields,
  };
  candidate.context_id = fingerprintAnalysisContext(candidate);
  const validation = validateAnalysisContext(candidate);
  if (!validation.valid) throw new Error(`analysis_context_invalid:${validation.errors.join(",")}`);
  return candidate;
};
import { validateCanonicalAnalysisInput } from "./canonicalAnalysisInput.js";
