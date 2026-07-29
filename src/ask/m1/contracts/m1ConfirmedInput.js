export const M1_CONFIRMED_INPUT_SCHEMA_VERSION = "m1.confirmed-input.v1";

export const M1_CONFIRMED_STATUSES = Object.freeze([
  "USER_CONFIRMED",
  "USER_CORRECTED",
  "USER_MARKED_UNKNOWN",
]);

export const M1_DRAFT_SCHEMA_VERSION = "m1.input-draft.v1";

export const M1_CONFIRMATION_GROUPS = Object.freeze({
  decision_type: Object.freeze(["decision_intent"]),
  product_architecture: Object.freeze([
    "primary_product_object",
    "architecture_alternatives",
  ]),
  application_scenario: Object.freeze(["application_scenario"]),
  customer_region: Object.freeze(["target_customer", "region"]),
  power_system_scope: Object.freeze(["power_or_system_scope"]),
  constraints_unknowns: Object.freeze([
    "investment_or_product_stage",
    "target_timing",
    "critical_constraints",
    "unknowns",
    "contradictions",
  ]),
});

const ARRAY_FIELDS = new Set([
  "architecture_alternatives",
  "critical_constraints",
  "unknowns",
  "contradictions",
]);
const DRAFT_STATUSES = new Set(["EXPLICIT", "INFERRED", "ASSUMED", "UNKNOWN", "CONFLICTING"]);
const CONFIRMED_STATUSES = new Set(M1_CONFIRMED_STATUSES);
const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const exactKeys = (value, keys) => {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};
const isStringArray = (value) => Array.isArray(value) && value.every((item) => (
  typeof item === "string" && item.trim().length > 0
));

const canonicalUnknownValue = (field) => ARRAY_FIELDS.has(field) ? [] : "unknown";
const valuesEqual = (left, right) => JSON.stringify(left) === JSON.stringify(right);

const normalizeFieldValue = (field, value) => {
  if (ARRAY_FIELDS.has(field)) {
    if (Array.isArray(value)) {
      return value.map((item) => String(item).trim()).filter(Boolean);
    }
    return String(value || "")
      .split(/\n|,|，|；|;/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  const normalized = String(value ?? "").trim();
  return normalized || "unknown";
};

const flattenContradictions = (contradictions) => (
  Array.isArray(contradictions)
    ? contradictions.map((item) => {
      if (typeof item === "string") return item;
      const values = Array.isArray(item?.values) ? item.values.join(" / ") : "";
      return [item?.field, values, item?.explanation].filter(Boolean).join(": ");
    }).filter(Boolean)
    : []
);

const statusForField = (context, field) => {
  if (field === "unknowns") return context.unknowns?.length > 0 ? "UNKNOWN" : "EXPLICIT";
  if (field === "contradictions") return context.contradictions?.length > 0 ? "CONFLICTING" : "EXPLICIT";
  const providerStatus = context.field_provenance?.[field]?.status;
  if (providerStatus) return providerStatus;
  const value = context[field];
  if (value === "unknown" || (Array.isArray(value) && value.length === 0)) return "UNKNOWN";
  if (value === "conflicting") return "CONFLICTING";
  return "INFERRED";
};

const draftField = (context, field) => {
  const value = field === "contradictions"
    ? flattenContradictions(context[field])
    : normalizeFieldValue(field, context[field]);
  return {
    value,
    draft_status: statusForField(context, field),
  };
};

export const createM1InputDraft = ({
  question,
  inputContext,
  sourceMode = "provider",
  reasonCode = null,
}) => {
  const originalQuestion = String(question ?? "");
  const context = isPlainObject(inputContext) ? inputContext : {};
  const groups = {};
  Object.entries(M1_CONFIRMATION_GROUPS).forEach(([groupId, fields]) => {
    groups[groupId] = {
      fields: Object.fromEntries(fields.map((field) => [field, draftField(context, field)])),
    };
  });
  return {
    schema_version: M1_DRAFT_SCHEMA_VERSION,
    draft_id: context.context_id || `draft_${Date.now()}`,
    original_question: originalQuestion,
    source: {
      mode: sourceMode,
      reason_code: reasonCode,
    },
    groups,
  };
};

export const createM1ConfirmedInput = ({
  draft,
  editedValues = {},
  markedUnknownFields = [],
  confirmedAt = new Date().toISOString(),
  confirmedInputId,
}) => {
  const markedUnknown = new Set(markedUnknownFields);
  let hasCorrection = false;
  let hasMarkedUnknown = false;
  const groups = {};

  Object.entries(M1_CONFIRMATION_GROUPS).forEach(([groupId, fields]) => {
    groups[groupId] = {
      fields: Object.fromEntries(fields.map((field) => {
        const draftFieldValue = draft.groups[groupId].fields[field];
        const editedValue = Object.hasOwn(editedValues, field)
          ? normalizeFieldValue(field, editedValues[field])
          : draftFieldValue.value;
        const value = markedUnknown.has(field) ? canonicalUnknownValue(field) : editedValue;
        let confirmedStatus = "USER_CONFIRMED";
        if (markedUnknown.has(field)) {
          confirmedStatus = "USER_MARKED_UNKNOWN";
          hasMarkedUnknown = true;
        } else if (!valuesEqual(value, draftFieldValue.value)) {
          confirmedStatus = "USER_CORRECTED";
          hasCorrection = true;
        }
        return [field, {
          value,
          draft_status: draftFieldValue.draft_status,
          confirmed_status: confirmedStatus,
        }];
      })),
    };
  });

  return {
    schema_version: M1_CONFIRMED_INPUT_SCHEMA_VERSION,
    confirmed_input_id: confirmedInputId || `confirmed_${Date.now()}`,
    source_draft_id: draft.draft_id,
    original_question: draft.original_question,
    confirmed_at: confirmedAt,
    confirmation_status: hasCorrection
      ? "USER_CORRECTED"
      : hasMarkedUnknown
        ? "USER_MARKED_UNKNOWN"
        : "USER_CONFIRMED",
    groups,
  };
};

export const validateM1ConfirmedInput = (confirmedInput, { expectedQuestion } = {}) => {
  const errors = [];
  const topKeys = [
    "schema_version",
    "confirmed_input_id",
    "source_draft_id",
    "original_question",
    "confirmed_at",
    "confirmation_status",
    "groups",
  ];
  if (!exactKeys(confirmedInput, topKeys)) return { ok: false, errors: ["confirmed_input_keys_not_exact"] };
  if (confirmedInput.schema_version !== M1_CONFIRMED_INPUT_SCHEMA_VERSION) errors.push("invalid_schema_version");
  ["confirmed_input_id", "source_draft_id", "original_question", "confirmed_at"].forEach((field) => {
    if (typeof confirmedInput[field] !== "string" || !confirmedInput[field].trim()) errors.push(`${field}_invalid`);
  });
  if (expectedQuestion !== undefined && confirmedInput.original_question !== expectedQuestion) {
    errors.push("original_question_not_preserved");
  }
  if (!CONFIRMED_STATUSES.has(confirmedInput.confirmation_status)) errors.push("confirmation_status_invalid");
  if (!exactKeys(confirmedInput.groups, Object.keys(M1_CONFIRMATION_GROUPS))) {
    errors.push("confirmation_groups_not_exact");
    return { ok: false, errors };
  }

  Object.entries(M1_CONFIRMATION_GROUPS).forEach(([groupId, fields]) => {
    const group = confirmedInput.groups[groupId];
    if (!exactKeys(group, ["fields"]) || !exactKeys(group.fields, fields)) {
      errors.push(`${groupId}_fields_not_exact`);
      return;
    }
    fields.forEach((field) => {
      const record = group.fields[field];
      if (!exactKeys(record, ["value", "draft_status", "confirmed_status"])) {
        errors.push(`${field}_record_invalid`);
        return;
      }
      if (ARRAY_FIELDS.has(field)) {
        if (!isStringArray(record.value) && !(Array.isArray(record.value) && record.value.length === 0)) {
          errors.push(`${field}_value_invalid`);
        }
      } else if (typeof record.value !== "string" || !record.value.trim()) {
        errors.push(`${field}_value_invalid`);
      }
      if (!DRAFT_STATUSES.has(record.draft_status)) errors.push(`${field}_draft_status_invalid`);
      if (!CONFIRMED_STATUSES.has(record.confirmed_status)) errors.push(`${field}_confirmed_status_invalid`);
      if (record.confirmed_status === "USER_MARKED_UNKNOWN"
        && !valuesEqual(record.value, canonicalUnknownValue(field))) {
        errors.push(`${field}_marked_unknown_value_invalid`);
      }
    });
  });
  return { ok: errors.length === 0, errors };
};
