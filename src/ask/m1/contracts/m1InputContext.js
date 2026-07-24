export const M1_INPUT_CONTEXT_SCHEMA_VERSION = "m1.input.v1";

export const M1_INPUT_DECISION_INTENTS = Object.freeze([
  "PRODUCT_INVESTMENT",
  "PRODUCT_DEVELOPMENT",
  "PRODUCT_UPGRADE",
  "ARCHITECTURE_CHOICE",
  "PRODUCT_FIT_ASSESSMENT",
  "OUT_OF_SCOPE",
]);

export const M1_ARCHITECTURE_DECISION_SUBJECT = "POWER_ARCHITECTURE_DECISION";

export const M1_INPUT_PROVENANCE_STATUSES = Object.freeze([
  "EXPLICIT",
  "INFERRED",
  "ASSUMED",
  "UNKNOWN",
  "CONFLICTING",
]);

export const M1_INPUT_MATERIAL_FIELDS = Object.freeze([
  "decision_intent",
  "primary_product_object",
  "architecture_alternatives",
  "application_scenario",
  "target_customer",
  "region",
  "power_or_system_scope",
  "investment_or_product_stage",
  "target_timing",
  "critical_constraints",
]);

const REQUIRED_KEYS = Object.freeze([
  "schema_version",
  "context_id",
  "raw_user_question",
  ...M1_INPUT_MATERIAL_FIELDS,
  "stated_evidence",
  "assumptions",
  "unknowns",
  "contradictions",
  "clarification_required",
  "clarification_question",
  "clarification_reason",
  "recognition_confidence",
  "field_provenance",
]);

const ARRAY_FIELDS = Object.freeze([
  "architecture_alternatives",
  "critical_constraints",
  "stated_evidence",
  "assumptions",
  "unknowns",
  "contradictions",
]);

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const isNullableString = (value) => value === null || isNonEmptyString(value);
const isConfidence = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
const allStrings = (value) => Array.isArray(value) && value.every(isNonEmptyString);
const hasExactKeys = (value, keys) => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};

export const stripM1ProviderReasoning = (answer) => String(answer || "")
  .replace(/<think>[\s\S]*?<\/think>/gi, "")
  .trim();

export const parseM1InputContextJson = (answer) => {
  const stripped = stripM1ProviderReasoning(answer);
  const fenced = stripped.match(/^```json\s*([\s\S]*?)\s*```$/i);
  const target = fenced ? fenced[1].trim() : stripped;
  try {
    return { ok: true, value: JSON.parse(target) };
  } catch {
    return { ok: false, error: "malformed_m1_input_context_json" };
  }
};

export const validateM1InputContext = (context, { expectedQuestion } = {}) => {
  const errors = [];
  if (!isPlainObject(context)) return { ok: false, errors: ["context_not_object"] };
  if (!hasExactKeys(context, REQUIRED_KEYS)) errors.push("context_keys_not_exact");
  if (context.schema_version !== M1_INPUT_CONTEXT_SCHEMA_VERSION) errors.push("invalid_schema_version");
  if (!isNonEmptyString(context.context_id)) errors.push("invalid_context_id");
  if (!isNonEmptyString(context.raw_user_question)) errors.push("invalid_raw_user_question");
  if (expectedQuestion !== undefined && context.raw_user_question !== expectedQuestion) errors.push("raw_user_question_not_preserved");
  if (!M1_INPUT_DECISION_INTENTS.includes(context.decision_intent)) errors.push("decision_intent_not_canonical");

  [
    "decision_intent",
    "primary_product_object",
    "application_scenario",
    "target_customer",
    "region",
    "power_or_system_scope",
    "investment_or_product_stage",
    "target_timing",
  ].forEach((field) => {
    if (!isNonEmptyString(context[field])) errors.push(`${field}_invalid`);
  });

  ARRAY_FIELDS.forEach((field) => {
    if (!Array.isArray(context[field])) errors.push(`${field}_not_array`);
  });
  [
    "architecture_alternatives",
    "critical_constraints",
    "stated_evidence",
    "assumptions",
    "unknowns",
  ].forEach((field) => {
    if (Array.isArray(context[field]) && !allStrings(context[field])) errors.push(`${field}_contains_invalid_item`);
  });

  if (Array.isArray(context.contradictions)) {
    context.contradictions.forEach((contradiction, index) => {
      if (!isPlainObject(contradiction)
        || !isNonEmptyString(contradiction.field)
        || !allStrings(contradiction.values)
        || contradiction.values.length < 2
        || !isNonEmptyString(contradiction.explanation)) {
        errors.push(`contradictions[${index}]_invalid`);
      }
    });
  }

  if (typeof context.clarification_required !== "boolean") errors.push("clarification_required_not_boolean");
  if (!isNullableString(context.clarification_question)) errors.push("clarification_question_invalid");
  if (!isNullableString(context.clarification_reason)) errors.push("clarification_reason_invalid");
  if (context.clarification_required === true) {
    if (!isNonEmptyString(context.clarification_question)) errors.push("required_clarification_question_missing");
    if (!isNonEmptyString(context.clarification_reason)) errors.push("required_clarification_reason_missing");
  } else if (context.clarification_question !== null || context.clarification_reason !== null) {
    errors.push("nonrequired_clarification_must_be_null");
  }
  if (!isConfidence(context.recognition_confidence)) errors.push("recognition_confidence_invalid");

  if (!isPlainObject(context.field_provenance)) {
    errors.push("field_provenance_not_object");
  } else {
    M1_INPUT_MATERIAL_FIELDS.forEach((field) => {
      const provenance = context.field_provenance[field];
      if (!isPlainObject(provenance)) {
        errors.push(`field_provenance.${field}_missing`);
        return;
      }
      if (!Object.hasOwn(provenance, "value")) errors.push(`field_provenance.${field}.value_missing`);
      if (Object.hasOwn(provenance, "value")
        && JSON.stringify(provenance.value) !== JSON.stringify(context[field])) {
        errors.push(`field_provenance.${field}.value_mismatch`);
      }
      if (!M1_INPUT_PROVENANCE_STATUSES.includes(provenance.status)) errors.push(`field_provenance.${field}.status_invalid`);
      if (!allStrings(provenance.source_span) && !(Array.isArray(provenance.source_span) && provenance.source_span.length === 0)) {
        errors.push(`field_provenance.${field}.source_span_invalid`);
      }
      if (!isConfidence(provenance.confidence)) errors.push(`field_provenance.${field}.confidence_invalid`);
    });
  }

  return { ok: errors.length === 0, errors };
};

export const parseAndValidateM1InputContext = (answer, options = {}) => {
  const parsed = parseM1InputContextJson(answer);
  if (!parsed.ok) return { ok: false, errors: [parsed.error] };
  const validation = validateM1InputContext(parsed.value, options);
  return validation.ok
    ? { ok: true, context: parsed.value }
    : { ok: false, errors: validation.errors };
};
