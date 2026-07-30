import {
  M1_CONFIRMATION_GROUPS,
  M1_DRAFT_SCHEMA_VERSION,
} from "./contracts/m1ConfirmedInput.js";

export const M1_INPUT_RESOLUTION_SCHEMA_VERSION = "m1.input-resolution.v1";

export const M1_INPUT_RESOLUTION_STATES = Object.freeze([
  "READY_FOR_CONFIRMATION",
  "FALLBACK_CONFIRMATION_REQUIRED",
]);

export const M1_INPUT_RESOLUTION_ERROR_CODES = Object.freeze({
  PROVIDER_TIMEOUT: "M1_INPUT_PROVIDER_TIMEOUT",
  PROVIDER_UNAVAILABLE: "M1_INPUT_PROVIDER_UNAVAILABLE",
  JSON_INVALID: "M1_INPUT_JSON_INVALID",
  MISSING_FIELDS: "M1_INPUT_DRAFT_MISSING_FIELDS",
  UNEXPECTED_FIELDS: "M1_INPUT_DRAFT_UNEXPECTED_FIELDS",
  INVALID_STATUS: "M1_INPUT_DRAFT_INVALID_STATUS",
  CONTRACT_INVALID: "M1_INPUT_DRAFT_CONTRACT_INVALID",
});

export const M1_FALLBACK_CONFIRMATION_MESSAGE = (
  "自动提取未通过结构校验，请确认或补充以下信息。原始问题已保留，无需重新输入。"
);

const ARRAY_FIELDS = new Set([
  "architecture_alternatives",
  "critical_constraints",
  "unknowns",
  "contradictions",
]);
const DRAFT_STATUSES = new Set(["EXPLICIT", "INFERRED", "UNKNOWN", "CONFLICTING"]);
const ERROR_CODE_SET = new Set(Object.values(M1_INPUT_RESOLUTION_ERROR_CODES));
const STATE_SET = new Set(M1_INPUT_RESOLUTION_STATES);
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

export const validateM1ResolutionDraft = (draft, { expectedQuestion } = {}) => {
  const errors = [];
  const topKeys = [
    "schema_version",
    "draft_id",
    "original_question",
    "source",
    "groups",
  ];
  if (!isPlainObject(draft)) return { ok: false, errors: ["draft_not_object"] };
  const missingTopKeys = topKeys.filter((key) => !Object.hasOwn(draft, key));
  const unexpectedTopKeys = Object.keys(draft).filter((key) => !topKeys.includes(key));
  if (missingTopKeys.length > 0) errors.push(`draft_missing_keys:${missingTopKeys.join(",")}`);
  if (unexpectedTopKeys.length > 0) errors.push(`draft_unexpected_keys:${unexpectedTopKeys.join(",")}`);
  if (missingTopKeys.length > 0 || unexpectedTopKeys.length > 0) {
    return { ok: false, errors };
  }
  if (draft.schema_version !== M1_DRAFT_SCHEMA_VERSION) errors.push("draft_schema_version_invalid");
  ["draft_id", "original_question"].forEach((field) => {
    if (typeof draft[field] !== "string" || !draft[field].trim()) errors.push(`${field}_invalid`);
  });
  if (expectedQuestion !== undefined && draft.original_question !== expectedQuestion) {
    errors.push("draft_original_question_not_preserved");
  }
  if (!exactKeys(draft.source, ["mode", "reason_code"])) {
    errors.push("draft_source_invalid");
  } else {
    if (!["provider", "fallback"].includes(draft.source.mode)) {
      errors.push("draft_source_mode_invalid");
    }
    if (draft.source.mode === "provider" && draft.source.reason_code !== null) {
      errors.push("draft_provider_reason_code_forbidden");
    }
    if (draft.source.mode === "fallback"
      && (typeof draft.source.reason_code !== "string" || !draft.source.reason_code.trim())) {
      errors.push("draft_fallback_reason_code_required");
    }
  }
  if (!exactKeys(draft.groups, Object.keys(M1_CONFIRMATION_GROUPS))) {
    errors.push("draft_confirmation_groups_not_exact");
    return { ok: false, errors };
  }

  Object.entries(M1_CONFIRMATION_GROUPS).forEach(([groupId, fields]) => {
    const group = draft.groups[groupId];
    if (!exactKeys(group, ["fields"])) {
      errors.push(`${groupId}_draft_group_invalid`);
      return;
    }
    const missingFields = fields.filter((field) => !Object.hasOwn(group.fields, field));
    const unexpectedFields = Object.keys(group.fields).filter((field) => !fields.includes(field));
    if (missingFields.length > 0) {
      errors.push(`${groupId}_draft_missing_fields:${missingFields.join(",")}`);
    }
    if (unexpectedFields.length > 0) {
      errors.push(`${groupId}_draft_unexpected_fields:${unexpectedFields.join(",")}`);
    }
    if (missingFields.length > 0 || unexpectedFields.length > 0) return;
    fields.forEach((field) => {
      const record = group.fields[field];
      if (!exactKeys(record, ["value", "draft_status"])) {
        errors.push(`${field}_draft_record_invalid`);
        return;
      }
      if (ARRAY_FIELDS.has(field)) {
        if (!isStringArray(record.value)
          && !(Array.isArray(record.value) && record.value.length === 0)) {
          errors.push(`${field}_draft_value_invalid`);
        }
      } else if (typeof record.value !== "string" || !record.value.trim()) {
        errors.push(`${field}_draft_value_invalid`);
      }
      if (!DRAFT_STATUSES.has(record.draft_status)) {
        errors.push(`${field}_draft_status_invalid`);
      }
      if (!ARRAY_FIELDS.has(field)
        && record.draft_status === "UNKNOWN"
        && record.value !== "unknown") {
        errors.push(`${field}_draft_unknown_value_invalid`);
      }
      if (!ARRAY_FIELDS.has(field)
        && record.draft_status === "CONFLICTING"
        && record.value !== "conflicting") {
        errors.push(`${field}_draft_conflicting_value_invalid`);
      }
      if (!ARRAY_FIELDS.has(field)
        && ["EXPLICIT", "INFERRED"].includes(record.draft_status)
        && ["unknown", "conflicting"].includes(record.value)) {
        errors.push(`${field}_draft_concrete_value_invalid`);
      }
    });
  });
  return { ok: errors.length === 0, errors };
};

export const classifyM1InputResolutionError = ({
  reasonCode,
  validationErrors = [],
} = {}) => {
  if (ERROR_CODE_SET.has(reasonCode)) return reasonCode;
  const reason = String(reasonCode || "").toLowerCase();
  const errors = Array.isArray(validationErrors)
    ? validationErrors.map((error) => String(error).toLowerCase())
    : [];
  const combined = [reason, ...errors].join(" ");
  if (combined.includes("timeout") || combined.includes("timed_out")) {
    return M1_INPUT_RESOLUTION_ERROR_CODES.PROVIDER_TIMEOUT;
  }
  if (combined.includes("json") || combined.includes("parse")) {
    return M1_INPUT_RESOLUTION_ERROR_CODES.JSON_INVALID;
  }
  if (combined.includes("missing")) {
    return M1_INPUT_RESOLUTION_ERROR_CODES.MISSING_FIELDS;
  }
  if (combined.includes("unexpected") || combined.includes("not_exact")) {
    return M1_INPUT_RESOLUTION_ERROR_CODES.UNEXPECTED_FIELDS;
  }
  if (combined.includes("status") || combined.includes("assumed")) {
    return M1_INPUT_RESOLUTION_ERROR_CODES.INVALID_STATUS;
  }
  if (combined.includes("provider")
    || combined.includes("transport")
    || combined.includes("workflow")) {
    return M1_INPUT_RESOLUTION_ERROR_CODES.PROVIDER_UNAVAILABLE;
  }
  return M1_INPUT_RESOLUTION_ERROR_CODES.CONTRACT_INVALID;
};

const resolutionId = (draft, state) => (
  `resolution_${state.toLowerCase()}_${draft.draft_id}`
);

export const createM1ReadyForConfirmation = ({
  question,
  draft,
}) => {
  const originalQuestion = String(question ?? "");
  const validation = validateM1ResolutionDraft(draft, {
    expectedQuestion: originalQuestion,
  });
  if (!validation.ok || draft?.source?.mode !== "provider") {
    throw new Error("m1_ready_resolution_requires_valid_provider_draft");
  }
  return {
    schema_version: M1_INPUT_RESOLUTION_SCHEMA_VERSION,
    resolution_id: resolutionId(draft, "ready"),
    state: "READY_FOR_CONFIRMATION",
    original_question: originalQuestion,
    confirmation_draft: draft,
    error: null,
  };
};

export const createM1FallbackConfirmationRequired = ({
  question,
  draft,
  errorCode,
}) => {
  const originalQuestion = String(question ?? "");
  const validation = validateM1ResolutionDraft(draft, {
    expectedQuestion: originalQuestion,
  });
  if (!validation.ok || draft?.source?.mode !== "fallback") {
    throw new Error("m1_fallback_resolution_requires_valid_fallback_draft");
  }
  const safeErrorCode = classifyM1InputResolutionError({ reasonCode: errorCode });
  return {
    schema_version: M1_INPUT_RESOLUTION_SCHEMA_VERSION,
    resolution_id: resolutionId(draft, "fallback"),
    state: "FALLBACK_CONFIRMATION_REQUIRED",
    original_question: originalQuestion,
    confirmation_draft: draft,
    error: {
      code: safeErrorCode,
      user_message: M1_FALLBACK_CONFIRMATION_MESSAGE,
    },
  };
};

export const validateM1InputResolution = (resolution, { expectedQuestion } = {}) => {
  const errors = [];
  const topKeys = [
    "schema_version",
    "resolution_id",
    "state",
    "original_question",
    "confirmation_draft",
    "error",
  ];
  if (!exactKeys(resolution, topKeys)) {
    return { ok: false, errors: ["input_resolution_keys_not_exact"] };
  }
  if (resolution.schema_version !== M1_INPUT_RESOLUTION_SCHEMA_VERSION) {
    errors.push("input_resolution_schema_invalid");
  }
  if (typeof resolution.resolution_id !== "string" || !resolution.resolution_id.trim()) {
    errors.push("input_resolution_id_invalid");
  }
  if (!STATE_SET.has(resolution.state)) errors.push("input_resolution_state_invalid");
  if (typeof resolution.original_question !== "string" || !resolution.original_question.trim()) {
    errors.push("input_resolution_question_invalid");
  }
  if (expectedQuestion !== undefined && resolution.original_question !== expectedQuestion) {
    errors.push("input_resolution_question_not_preserved");
  }
  const draftValidation = validateM1ResolutionDraft(resolution.confirmation_draft, {
    expectedQuestion: resolution.original_question,
  });
  if (!draftValidation.ok) {
    errors.push(...draftValidation.errors.map((error) => `input_resolution_${error}`));
  }
  if (resolution.state === "READY_FOR_CONFIRMATION") {
    if (resolution.error !== null) errors.push("ready_resolution_error_forbidden");
    if (resolution.confirmation_draft?.source?.mode !== "provider") {
      errors.push("ready_resolution_provider_draft_required");
    }
  }
  if (resolution.state === "FALLBACK_CONFIRMATION_REQUIRED") {
    if (!exactKeys(resolution.error, ["code", "user_message"])) {
      errors.push("fallback_resolution_error_invalid");
    } else {
      if (!ERROR_CODE_SET.has(resolution.error.code)) {
        errors.push("fallback_resolution_error_code_invalid");
      }
      if (resolution.error.user_message !== M1_FALLBACK_CONFIRMATION_MESSAGE) {
        errors.push("fallback_resolution_message_invalid");
      }
    }
    if (resolution.confirmation_draft?.source?.mode !== "fallback") {
      errors.push("fallback_resolution_draft_required");
    }
  }
  if (resolution.confirmation_draft?.schema_version !== M1_DRAFT_SCHEMA_VERSION) {
    errors.push("input_resolution_draft_schema_invalid");
  }
  return { ok: errors.length === 0, errors };
};
