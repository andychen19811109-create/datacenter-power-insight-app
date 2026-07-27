import { createHash } from "node:crypto";

import { M1_EVIDENCE_SOURCE_IDS } from "./m1DecisionState.js";

export const M1_EVIDENCE_SNAPSHOT_SCHEMA_VERSION = "m1.evidence-snapshot.v1";
export const M1_EVIDENCE_POLICY_MODE = "FROZEN_SEVEN_SOURCE";

export const M1_EVIDENCE_SOURCE_TYPES = Object.freeze([
  "OFFICIAL_WEBSITE",
  "OFFICIAL_WHITEPAPER",
  "OFFICIAL_STANDARD",
  "OFFICIAL_PRODUCT_DOCUMENTATION",
  "OFFICIAL_REGULATORY_MATERIAL",
]);

export const M1_EVIDENCE_TYPES = Object.freeze([
  "FACT",
  "BENCHMARK",
  "REQUIREMENT",
  "METRIC",
  "RISK",
]);

export const M1_EVIDENCE_SCOPE_FIELDS = Object.freeze([
  "product",
  "application",
  "customer",
  "region",
  "time",
]);

const SOURCE_TYPES = new Set(M1_EVIDENCE_SOURCE_TYPES);
const EVIDENCE_TYPES = new Set(M1_EVIDENCE_TYPES);
const ALLOWED_SOURCE_IDS = new Set(M1_EVIDENCE_SOURCE_IDS);
const TOP_LEVEL_KEYS = Object.freeze([
  "schema_version",
  "evidence_snapshot_id",
  "created_at",
  "as_of_date",
  "source_policy",
  "sources",
]);
const SOURCE_KEYS = Object.freeze([
  "source_id",
  "source_title",
  "publisher",
  "document_date",
  "retrieved_at",
  "source_type",
  "applicable_scope",
  "evidence_units",
  "limitations",
]);
const EVIDENCE_UNIT_KEYS = Object.freeze([
  "evidence_unit_id",
  "statement",
  "evidence_type",
  "scope",
  "numeric_provenance",
  "limitations",
]);
const NUMERIC_PROVENANCE_KEYS = Object.freeze([
  "value",
  "unit",
  "source_type",
  "source_id",
  "derivation",
  "denominator",
  "exclusions",
]);

const isPlainObject = (value) => Boolean(value)
  && typeof value === "object"
  && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const isStringArray = (value) => Array.isArray(value) && value.every(isNonEmptyString);
const exactKeys = (value, keys) => {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
};
const sameValue = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const isIsoTimestamp = (value) => (
  isNonEmptyString(value)
  && !Number.isNaN(Date.parse(value))
  && /^\d{4}-\d{2}-\d{2}T/.test(value)
);
const isDateOnly = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
};

export const canonicalStringifyM1EvidenceSnapshot = (snapshot) => (
  JSON.stringify(canonicalize(snapshot))
);

export const hashM1EvidenceSnapshot = (snapshot) => (
  createHash("sha256")
    .update(canonicalStringifyM1EvidenceSnapshot(snapshot), "utf8")
    .digest("hex")
);

const validateScope = (scope, path, errors) => {
  if (!exactKeys(scope, M1_EVIDENCE_SCOPE_FIELDS)) {
    errors.push(`${path}_keys_not_exact`);
    return;
  }
  M1_EVIDENCE_SCOPE_FIELDS.forEach((field) => {
    if (!isStringArray(scope[field])) errors.push(`${path}_${field}_invalid`);
  });
};

const validateLimitations = (limitations, path, errors) => {
  if (!isStringArray(limitations)) errors.push(`${path}_invalid`);
};

const validateNumericProvenance = (value, sourceId, path, errors) => {
  if (value === null) return;
  if (!exactKeys(value, NUMERIC_PROVENANCE_KEYS)) {
    errors.push(`${path}_keys_not_exact`);
    return;
  }
  if (typeof value.value !== "number" || !Number.isFinite(value.value)) {
    errors.push(`${path}_value_invalid`);
  }
  ["unit", "source_type", "source_id", "derivation", "denominator"].forEach((field) => {
    if (!isNonEmptyString(value[field])) errors.push(`${path}_${field}_invalid`);
  });
  if (!isStringArray(value.exclusions)) errors.push(`${path}_exclusions_invalid`);
  if (value.source_id !== sourceId) errors.push(`${path}_source_id_mismatch`);
};

export const validateM1EvidenceSnapshot = (snapshot) => {
  const errors = [];
  if (!exactKeys(snapshot, TOP_LEVEL_KEYS)) {
    return { ok: false, errors: ["evidence_snapshot_keys_not_exact"] };
  }
  if (snapshot.schema_version !== M1_EVIDENCE_SNAPSHOT_SCHEMA_VERSION) {
    errors.push("evidence_snapshot_schema_version_invalid");
  }
  if (!isNonEmptyString(snapshot.evidence_snapshot_id)) {
    errors.push("evidence_snapshot_id_invalid");
  }
  if (!isIsoTimestamp(snapshot.created_at)) errors.push("evidence_snapshot_created_at_invalid");
  if (!isDateOnly(snapshot.as_of_date)) errors.push("evidence_snapshot_as_of_date_invalid");

  if (!exactKeys(snapshot.source_policy, ["mode", "allowed_source_ids"])) {
    errors.push("evidence_snapshot_source_policy_invalid");
  } else {
    if (snapshot.source_policy.mode !== M1_EVIDENCE_POLICY_MODE) {
      errors.push("evidence_snapshot_source_policy_mode_invalid");
    }
    if (!sameValue(snapshot.source_policy.allowed_source_ids, M1_EVIDENCE_SOURCE_IDS)) {
      errors.push("evidence_snapshot_allowed_source_ids_invalid");
    }
  }

  if (!Array.isArray(snapshot.sources)) {
    errors.push("evidence_snapshot_sources_invalid");
    return { ok: false, errors };
  }

  const seenSourceIds = new Set();
  const seenEvidenceUnitIds = new Set();
  snapshot.sources.forEach((source, sourceIndex) => {
    const sourcePath = `sources_${sourceIndex}`;
    if (!exactKeys(source, SOURCE_KEYS)) {
      errors.push(`${sourcePath}_keys_not_exact`);
      return;
    }
    if (!isNonEmptyString(source.source_id)) {
      errors.push(`${sourcePath}_source_id_invalid`);
    } else {
      if (!ALLOWED_SOURCE_IDS.has(source.source_id)) {
        errors.push(`${sourcePath}_source_id_outside_allow_list`);
      }
      if (seenSourceIds.has(source.source_id)) {
        errors.push(`${sourcePath}_source_id_duplicate`);
      }
      seenSourceIds.add(source.source_id);
    }
    ["source_title", "publisher", "document_date"].forEach((field) => {
      if (!isNonEmptyString(source[field])) errors.push(`${sourcePath}_${field}_invalid`);
    });
    if (!isIsoTimestamp(source.retrieved_at)) {
      errors.push(`${sourcePath}_retrieved_at_invalid`);
    }
    if (!SOURCE_TYPES.has(source.source_type)) {
      errors.push(`${sourcePath}_source_type_invalid`);
    }
    validateScope(source.applicable_scope, `${sourcePath}_applicable_scope`, errors);
    validateLimitations(source.limitations, `${sourcePath}_limitations`, errors);

    if (!Array.isArray(source.evidence_units)) {
      errors.push(`${sourcePath}_evidence_units_invalid`);
      return;
    }
    source.evidence_units.forEach((unit, unitIndex) => {
      const unitPath = `${sourcePath}_evidence_units_${unitIndex}`;
      if (!exactKeys(unit, EVIDENCE_UNIT_KEYS)) {
        errors.push(`${unitPath}_keys_not_exact`);
        return;
      }
      if (!isNonEmptyString(unit.evidence_unit_id)) {
        errors.push(`${unitPath}_evidence_unit_id_invalid`);
      } else {
        if (seenEvidenceUnitIds.has(unit.evidence_unit_id)) {
          errors.push(`${unitPath}_evidence_unit_id_duplicate`);
        }
        seenEvidenceUnitIds.add(unit.evidence_unit_id);
      }
      if (!isNonEmptyString(unit.statement)) errors.push(`${unitPath}_statement_invalid`);
      if (!EVIDENCE_TYPES.has(unit.evidence_type)) {
        errors.push(`${unitPath}_evidence_type_invalid`);
      }
      validateScope(unit.scope, `${unitPath}_scope`, errors);
      validateNumericProvenance(
        unit.numeric_provenance,
        source.source_id,
        `${unitPath}_numeric_provenance`,
        errors,
      );
      validateLimitations(unit.limitations, `${unitPath}_limitations`, errors);
    });
  });

  return { ok: errors.length === 0, errors };
};
