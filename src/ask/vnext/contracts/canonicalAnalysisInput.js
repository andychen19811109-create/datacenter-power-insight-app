export const CANONICAL_ANALYSIS_INPUT_SCHEMA_VERSION = "dcpi.canonical-analysis-input.v1";

export const CANONICAL_SOURCE_TYPES = Object.freeze([
  "MANUAL",
  "QUESTION",
  "PAGE",
  "INFERENCE",
  "UNSPECIFIED",
]);

export const CANONICAL_BUSINESS_FIELDS = Object.freeze([
  "track",
  "application",
  "region",
  "customer_type",
  "analysis_goal",
  "known_competitors",
  "time_horizon",
  "extra_context",
]);

const CANONICAL_KEYS = Object.freeze([
  "schema_version",
  "snapshot_id",
  "question",
  ...CANONICAL_BUSINESS_FIELDS,
  "page_ctx",
]);

const PAGE_CONTEXT_KEYS = Object.freeze([
  "user_role",
  "page_region",
  "page_customer_type",
  "page_application",
  "page_track",
  "page_time_filter",
  "raw_selections",
]);

const PAGE_SELECTION_KEYS = Object.freeze([
  "role",
  "region",
  "customer",
  "application",
  "track",
  "time",
]);

const ARRAY_VALUE_FIELDS = new Set([
  "track",
  "application",
  "region",
  "customer_type",
  "known_competitors",
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

export const stableStringify = (value) => {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (isPlainObject(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
};

const fingerprint = (value) => {
  const input = stableStringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `snap_${(hash >>> 0).toString(16).padStart(8, "0")}`;
};

const validScalar = (value) => typeof value === "string";
const validArray = (value) => Array.isArray(value)
  && value.every((item) => typeof item === "string" && item.trim().length > 0);

const FORBIDDEN_EXTRA_CONTEXT_METADATA = /(?:dcpi\.[a-z0-9_.-]+|DCPI\s+R2\s+Core|R2-\d+\.\d+|schema(?:_version)?|precedence|trace\s*json|parser\s*metadata|provider\s*metadata|工程\s*guardrail|request_id|conversation_id|snapshot_id)/i;

export const containsForbiddenExtraContextMetadata = (value) => (
  FORBIDDEN_EXTRA_CONTEXT_METADATA.test(String(value || ""))
);

const validateConflict = (conflict) => hasExactKeys(conflict, ["source", "value"])
  && CANONICAL_SOURCE_TYPES.includes(conflict.source)
  && conflict.source !== "UNSPECIFIED"
  && (validScalar(conflict.value) || validArray(conflict.value));

const validateField = (field, name) => {
  if (!hasExactKeys(field, ["value", "source", "conflicts"])) return false;
  if (!CANONICAL_SOURCE_TYPES.includes(field.source)) return false;
  if (!Array.isArray(field.conflicts) || !field.conflicts.every(validateConflict)) return false;
  if (ARRAY_VALUE_FIELDS.has(name)) return validArray(field.value);
  return validScalar(field.value);
};

const validatePageContext = (field) => {
  if (!hasExactKeys(field, ["value", "source", "conflicts"])) return false;
  if (!CANONICAL_SOURCE_TYPES.includes(field.source)) return false;
  if (!Array.isArray(field.conflicts) || field.conflicts.length > 0 || !isPlainObject(field.value)) return false;
  if (!hasExactKeys(field.value, PAGE_CONTEXT_KEYS)) return false;
  if (!hasExactKeys(field.value.raw_selections, PAGE_SELECTION_KEYS)) return false;
  return PAGE_CONTEXT_KEYS.filter((key) => key !== "raw_selections")
    .every((key) => typeof field.value[key] === "string")
    && PAGE_SELECTION_KEYS.every((key) => typeof field.value.raw_selections[key] === "string");
};

export function validateCanonicalAnalysisInput(value) {
  const errors = [];
  if (!hasExactKeys(value, CANONICAL_KEYS)) {
    return { valid: false, errors: ["canonical_input_shape_invalid"] };
  }
  if (value.schema_version !== CANONICAL_ANALYSIS_INPUT_SCHEMA_VERSION) errors.push("schema_version_invalid");
  if (typeof value.snapshot_id !== "string" || !/^snap_[a-f0-9]{8}$/.test(value.snapshot_id)) errors.push("snapshot_id_invalid");
  if (!validateField(value.question, "question") || !value.question.value.trim() || value.question.source !== "QUESTION") {
    errors.push("question_invalid");
  }
  for (const field of CANONICAL_BUSINESS_FIELDS) {
    if (!validateField(value[field], field)) errors.push(`${field}_invalid`);
  }
  if (validateField(value.extra_context, "extra_context")
    && containsForbiddenExtraContextMetadata(value.extra_context.value)) {
    errors.push("extra_context_engineering_metadata_forbidden");
  }
  if (!validatePageContext(value.page_ctx)) errors.push("page_ctx_invalid");
  if (!errors.length) {
    const withoutId = { ...value, snapshot_id: "" };
    if (value.snapshot_id !== fingerprint(withoutId)) errors.push("snapshot_id_mismatch");
  }
  return { valid: errors.length === 0, errors };
}

export const canonicalField = (value, source = "UNSPECIFIED", conflicts = []) => ({
  value,
  source,
  conflicts,
});

export const createCanonicalAnalysisInput = (fields) => {
  const candidate = {
    schema_version: CANONICAL_ANALYSIS_INPUT_SCHEMA_VERSION,
    snapshot_id: "",
    ...fields,
  };
  candidate.snapshot_id = fingerprint(candidate);
  const validation = validateCanonicalAnalysisInput(candidate);
  if (!validation.valid) throw new Error(`canonical_analysis_input_invalid:${validation.errors.join(",")}`);
  return candidate;
};
