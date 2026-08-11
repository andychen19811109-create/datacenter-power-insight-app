export const ASK_REPORT_SCHEMA_VERSION = "dcpi.ask-report.v1";
export const ASK_REPORT_STATUSES = Object.freeze([
  "PUBLISHABLE",
  "CONDITIONAL",
  "NEEDS_CLARIFICATION",
  "INSUFFICIENT_EVIDENCE",
  "UNSUPPORTED",
]);

const REPORT_KEYS = Object.freeze([
  "schema_version",
  "status",
  "title",
  "one_line_conclusion",
  "recommended_decision",
  "analysis_scope",
  "key_assumptions",
  "context_summary",
  "key_facts",
  "core_analysis_sections",
  "scenario_comparison",
  "alternatives",
  "risks",
  "uncertainties",
  "recommended_actions",
  "validation_gates",
  "exit_conditions",
  "evidence_summary",
  "information_to_add",
  "cannot_conclude",
  "related_modules",
]);

const RISK_KEYS = Object.freeze(["market", "technical", "commercial", "organizational"]);
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, keys) => isPlainObject(value)
  && Object.keys(value).sort().join("|") === [...keys].sort().join("|");
const strings = (value) => Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim());

export function validateAskReport(value) {
  const errors = [];
  if (!exactKeys(value, REPORT_KEYS)) return { valid: false, errors: ["ask_report_shape_invalid"] };
  if (value.schema_version !== ASK_REPORT_SCHEMA_VERSION) errors.push("schema_version_invalid");
  if (!ASK_REPORT_STATUSES.includes(value.status)) errors.push("status_invalid");
  for (const field of ["title", "one_line_conclusion", "recommended_decision"]) {
    if (typeof value[field] !== "string" || !value[field].trim()) errors.push(`${field}_invalid`);
  }
  for (const field of ["analysis_scope", "key_assumptions", "alternatives", "uncertainties", "recommended_actions", "validation_gates", "exit_conditions", "information_to_add", "cannot_conclude"]) {
    if (!strings(value[field])) errors.push(`${field}_invalid`);
  }
  if (!isPlainObject(value.context_summary)) errors.push("context_summary_invalid");
  for (const field of ["key_facts", "core_analysis_sections", "scenario_comparison", "evidence_summary", "related_modules"]) {
    if (!Array.isArray(value[field]) || value[field].some((item) => !isPlainObject(item))) errors.push(`${field}_invalid`);
  }
  if (!exactKeys(value.risks, RISK_KEYS) || RISK_KEYS.some((key) => !strings(value.risks[key]))) errors.push("risks_invalid");
  return { valid: errors.length === 0, errors };
}
