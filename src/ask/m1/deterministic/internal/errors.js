export const BUILDER_VERSION = "m1-deterministic-builder.v0.1";
export const RELEASE_SCHEMA_VERSION = "m1.release-result.v1";
export const ERROR_SCHEMA_VERSION = "m1.fail-closed-error.v1";

const DEFAULT_BINDING = Object.freeze({
  policy_version: "m1-decision-policy.v0.2",
  builder_version: BUILDER_VERSION,
  template_catalog_version: "m1-template-catalog.v0.2",
  snapshot_hash: "0".repeat(64),
});

export class M1ReleaseError extends Error {
  constructor(code, {
    stage = "RELEASE_GATEWAY",
    offendingIds = [],
    violationCodes = [],
    recoverability = "NON_RETRYABLE",
  } = {}) {
    super(code);
    this.name = "M1ReleaseError";
    this.code = code;
    this.stage = stage;
    this.offendingIds = [...new Set(offendingIds.filter(Boolean).map(String))];
    this.violationCodes = [...new Set(
      (violationCodes.length > 0 ? violationCodes : [code]).filter(Boolean).map(String),
    )];
    this.recoverability = recoverability;
  }
}

export const reject = (code, context = {}, binding = {}) => ({
  schema_version: RELEASE_SCHEMA_VERSION,
  status: "REJECTED",
  error: {
    schema_version: ERROR_SCHEMA_VERSION,
    error_id: `ERROR_${code}`.slice(0, 64),
    error_code: code,
    stage: context.stage || "RELEASE_GATEWAY",
    release_allowed: false,
    recoverability: context.recoverability || "NON_RETRYABLE",
    binding: {
      ...DEFAULT_BINDING,
      ...binding,
    },
    offending_ids: [...new Set((context.offendingIds || []).filter(Boolean).map(String))],
    violation_codes: [...new Set(
      (context.violationCodes?.length ? context.violationCodes : [code])
        .filter(Boolean)
        .map(String),
    )],
  },
});

export const assert = (condition, code, context) => {
  if (!condition) throw new M1ReleaseError(code, context);
};

export const clone = (value) => JSON.parse(JSON.stringify(value));
export const sameValue = (left, right) => JSON.stringify(left) === JSON.stringify(right);
export const unique = (values) => [...new Set(values)];
