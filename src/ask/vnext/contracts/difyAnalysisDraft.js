export const DIFY_ANALYSIS_DRAFT_SCHEMA_VERSION = "dcpi.dify-analysis-draft.v1";

export const DIFY_OBJECT_TYPES = Object.freeze([
  "PRODUCT",
  "ARCHITECTURE",
  "SOLUTION",
  "COMPONENT_TECHNOLOGY",
  "COMPANY",
  "MARKET",
  "UNKNOWN",
]);

export const EVIDENCE_TYPES = Object.freeze([
  "DIRECT",
  "INDIRECT",
  "PUBLIC_CONSENSUS",
  "INFERENCE",
  "ASSUMPTION",
]);

const DRAFT_KEYS = Object.freeze([
  "schema_version",
  "request_id",
  "original_question",
  "task_type",
  "understood_decision",
  "objects",
  "assumed_context",
  "clarification_questions",
  "candidate_conclusions",
  "scenario_conclusions",
  "key_facts",
  "key_drivers",
  "alternatives",
  "risks",
  "recommended_actions",
  "validation_gates",
  "exit_conditions",
  "uncertainties",
  "missing_information",
  "raw_report_markdown",
]);

const RISK_KEYS = Object.freeze(["market", "technical", "commercial", "organizational"]);
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, keys) => isPlainObject(value)
  && Object.keys(value).sort().join("|") === [...keys].sort().join("|");
const strings = (value) => Array.isArray(value) && value.every((item) => typeof item === "string" && item.trim());

export function validateDifyAnalysisDraft(value) {
  const errors = [];
  if (!exactKeys(value, DRAFT_KEYS)) return { valid: false, errors: ["dify_draft_shape_invalid"] };
  if (value.schema_version !== DIFY_ANALYSIS_DRAFT_SCHEMA_VERSION) errors.push("schema_version_invalid");
  for (const field of ["request_id", "original_question", "task_type", "understood_decision"]) {
    if (typeof value[field] !== "string" || !value[field].trim()) errors.push(`${field}_invalid`);
  }
  for (const field of ["assumed_context", "candidate_conclusions", "key_drivers", "alternatives", "recommended_actions", "validation_gates", "exit_conditions", "uncertainties", "missing_information"]) {
    if (!strings(value[field])) errors.push(`${field}_invalid`);
  }
  if (!Array.isArray(value.objects) || value.objects.some((item) => !exactKeys(item, ["name", "object_type"])
    || typeof item.name !== "string" || !item.name.trim() || !DIFY_OBJECT_TYPES.includes(item.object_type))) {
    errors.push("objects_invalid");
  }
  if (!Array.isArray(value.clarification_questions) || value.clarification_questions.length > 3
    || value.clarification_questions.some((item) => !exactKeys(item, ["field", "question", "options", "impact"])
      || typeof item.field !== "string" || typeof item.question !== "string" || !strings(item.options)
      || !["HIGH", "MEDIUM", "LOW"].includes(item.impact))) {
    errors.push("clarification_questions_invalid");
  }
  if (!Array.isArray(value.scenario_conclusions)
    || value.scenario_conclusions.some((item) => !exactKeys(item, ["scenario", "conclusion"])
      || typeof item.scenario !== "string" || typeof item.conclusion !== "string")) {
    errors.push("scenario_conclusions_invalid");
  }
  if (!Array.isArray(value.key_facts)
    || value.key_facts.some((item) => !exactKeys(item, ["statement", "evidence_type", "source_ref"])
      || typeof item.statement !== "string" || !EVIDENCE_TYPES.includes(item.evidence_type)
      || !(typeof item.source_ref === "string" || item.source_ref === null))) {
    errors.push("key_facts_invalid");
  }
  if (!exactKeys(value.risks, RISK_KEYS) || RISK_KEYS.some((key) => !strings(value.risks[key]))) errors.push("risks_invalid");
  if (typeof value.raw_report_markdown !== "string") errors.push("raw_report_markdown_invalid");
  return { valid: errors.length === 0, errors };
}
