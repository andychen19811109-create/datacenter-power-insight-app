import {
  M1_EVIDENCE_SCOPE_FIELDS,
  M1_EVIDENCE_SNAPSHOT_SCHEMA_VERSION,
  canonicalStringifyM1EvidenceSnapshot,
  hashM1EvidenceSnapshot,
  validateM1EvidenceSnapshot,
} from "./contracts/m1EvidenceSnapshot.js";
import {
  M1_EVIDENCE_SOURCE_IDS,
  validateM1DecisionState,
} from "./contracts/m1DecisionState.js";
import {
  buildM1DecisionResolutionRequest,
  hashM1ConfirmedInput,
} from "./m1DecisionCore.js";

export const M1_EVIDENCE_BINDING_SCHEMA_VERSION = "m1.evidence-binding.v1";
export const M1_EVIDENCE_BINDING_STATUSES = Object.freeze([
  "BOUND",
  "UNKNOWN_NO_EVIDENCE_REQUIRED",
  "REJECTED",
]);

const ALLOWED_SOURCE_IDS = new Set(M1_EVIDENCE_SOURCE_IDS);
const SAFE_OWNER_VALUES = new Set(["TBD", "USER_TO_ASSIGN"]);
const clone = (value) => JSON.parse(JSON.stringify(value));
const sameValue = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const unique = (values) => [...new Set(values)];
const normalizedStatement = (value) => (
  String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .normalize("NFC")
);

const fail = (violations, code) => {
  violations.push(code);
};

const snapshotIndexes = (snapshot) => {
  const sources = new Map();
  const unitsByStatement = new Map();
  const snapshotSources = Array.isArray(snapshot?.sources) ? snapshot.sources : [];
  snapshotSources.forEach((source) => {
    if (!source || typeof source !== "object") return;
    sources.set(source.source_id, source);
    const evidenceUnits = Array.isArray(source.evidence_units) ? source.evidence_units : [];
    evidenceUnits.forEach((unit) => {
      if (!unit || typeof unit !== "object") return;
      const key = normalizedStatement(unit.statement);
      const indexed = { sourceId: source.source_id, unit };
      unitsByStatement.set(key, [...(unitsByStatement.get(key) || []), indexed]);
    });
  });
  return { sources, unitsByStatement };
};

const confirmedInputValues = (confirmedInput) => {
  const values = new Set();
  Object.values(confirmedInput?.groups || {}).forEach((group) => {
    Object.values(group?.fields || {}).forEach((record) => {
      if (typeof record?.value === "string" && record.value.trim()) {
        values.add(record.value.trim());
      } else if (Array.isArray(record?.value)) {
        record.value.forEach((value) => {
          if (typeof value === "string" && value.trim()) values.add(value.trim());
        });
      }
    });
  });
  return values;
};

const validateSourceArray = (sourceIds, path, sourceIndex, violations) => {
  if (!Array.isArray(sourceIds)) {
    fail(violations, `${path}:source_ids_invalid`);
    return;
  }
  if (sourceIds.some((sourceId) => typeof sourceId !== "string" || !sourceId.trim())) {
    fail(violations, `${path}:source_id_empty`);
  }
  if (new Set(sourceIds).size !== sourceIds.length) {
    fail(violations, `${path}:source_id_duplicate`);
  }
  sourceIds.forEach((sourceId) => {
    if (!ALLOWED_SOURCE_IDS.has(sourceId)) {
      fail(violations, `${path}:source_id_outside_allow_list`);
    } else if (!sourceIndex.has(sourceId)) {
      fail(violations, `${path}:source_id_absent_from_snapshot`);
    }
  });
};

const validateUnknownArray = (unknownIds, path, knownUnknownIds, violations) => {
  if (!Array.isArray(unknownIds)) {
    fail(violations, `${path}:unknown_ids_invalid`);
    return;
  }
  if (new Set(unknownIds).size !== unknownIds.length) {
    fail(violations, `${path}:unknown_id_duplicate`);
  }
  unknownIds.forEach((unknownId) => {
    if (typeof unknownId !== "string" || !unknownId.trim()) {
      fail(violations, `${path}:unknown_id_empty`);
    } else if (!knownUnknownIds.has(unknownId)) {
      fail(violations, `${path}:unknown_id_not_declared`);
    }
  });
};

const validateStatusRecord = ({
  record,
  path,
  statusField = "status",
  sourceIndex,
  knownUnknownIds,
  violations,
}) => {
  const status = record?.[statusField];
  const sourceIds = record?.source_ids;
  const unknownIds = record?.unknown_ids;
  validateSourceArray(sourceIds, path, sourceIndex, violations);
  validateUnknownArray(unknownIds, path, knownUnknownIds, violations);
  if (status === "SUPPORTED" && sourceIds?.length === 0) {
    fail(violations, `${path}:supported_source_required`);
  }
  if (status === "SUPPORTED" && sourceIds?.length === 0 && unknownIds?.length === 0) {
    fail(violations, `${path}:supported_basis_missing`);
  }
  if (status === "QUALIFIED" && sourceIds?.length === 0 && unknownIds?.length === 0) {
    fail(violations, `${path}:qualified_basis_missing`);
  }
  if (["UNKNOWN", "BLOCKED"].includes(status) && unknownIds?.length === 0) {
    fail(violations, `${path}:unknown_basis_required`);
  }
};

const validateArchitectureRecord = ({
  record,
  path,
  sourceIndex,
  knownUnknownIds,
  violations,
}) => {
  validateSourceArray(record?.source_ids, path, sourceIndex, violations);
  validateUnknownArray(record?.unknown_ids, path, knownUnknownIds, violations);
  if (["FIT", "NO_FIT"].includes(record?.fit_status) && record?.source_ids?.length === 0) {
    fail(violations, `${path}:fit_source_required`);
  }
  if (record?.fit_status === "CONDITIONAL_FIT"
    && record?.source_ids?.length === 0
    && record?.unknown_ids?.length === 0) {
    fail(violations, `${path}:conditional_fit_basis_missing`);
  }
  if (record?.fit_status === "UNKNOWN" && record?.unknown_ids?.length === 0) {
    fail(violations, `${path}:unknown_basis_required`);
  }
};

const scopeWithinEvidence = (claimScope, evidenceScope) => (
  M1_EVIDENCE_SCOPE_FIELDS.every((field) => {
    const claimValue = claimScope?.[field];
    const allowedValues = evidenceScope?.[field];
    return claimValue === "unknown"
      || (Array.isArray(allowedValues) && allowedValues.includes(claimValue));
  })
);

const numericEvidenceMatchesClaim = (claim, unit) => (
  unit.numeric_provenance === null
    ? claim.numeric_provenance === null && claim.value === null
    : sameValue(claim.numeric_provenance, unit.numeric_provenance)
      && claim.value === unit.numeric_provenance.value
);

const bindClaim = ({
  claim,
  sourceIndex,
  unitsByStatement,
  violations,
}) => {
  const base = {
    claim_id: claim?.claim_id || "INVALID_CLAIM_ID",
    proposed_class: claim?.proposed_class || "UNKNOWN",
    source_ids: [],
    evidence_unit_ids: [],
    binding_status: "REJECTED",
  };
  const before = violations.length;
  const path = `claim:${base.claim_id}`;
  validateSourceArray(claim?.source_ids, path, sourceIndex, violations);

  if (claim?.proposed_class === "UNKNOWN") {
    if (claim.claim_type !== "UNKNOWN") fail(violations, `${path}:unknown_claim_type_required`);
    if (claim.source_ids?.length > 0) fail(violations, `${path}:unknown_sources_forbidden`);
    if (claim.numeric_provenance !== null) {
      fail(violations, `${path}:unknown_numeric_provenance_forbidden`);
    }
    if (violations.length === before) {
      return { ...base, binding_status: "UNKNOWN_NO_EVIDENCE_REQUIRED" };
    }
    return base;
  }

  if (claim?.proposed_class === "INFERRED_BRIDGE") {
    fail(violations, "inferred_bridge_not_deterministically_bindable_v1");
    return base;
  }

  if (claim?.proposed_class !== "SOURCE_BACKED") {
    fail(violations, `${path}:proposed_class_invalid`);
    return base;
  }
  if (claim.source_ids?.length === 0) fail(violations, `${path}:source_required`);

  const candidates = unitsByStatement.get(normalizedStatement(claim.statement)) || [];
  const matches = candidates.filter(({ sourceId, unit }) => (
    claim.source_ids?.includes(sourceId)
    && claim.claim_type === unit.evidence_type
    && scopeWithinEvidence(claim.scope, unit.scope)
    && numericEvidenceMatchesClaim(claim, unit)
  ));
  const matchedSourceIdSet = new Set(matches.map(({ sourceId }) => sourceId));
  const matchedSourceIds = Array.isArray(claim.source_ids)
    ? unique(claim.source_ids).filter((sourceId) => matchedSourceIdSet.has(sourceId))
    : [];
  const matchedEvidenceUnitIds = unique(matches.map(({ unit }) => unit.evidence_unit_id));
  const claimSourceCandidates = candidates.filter(({ sourceId }) => (
    claim.source_ids?.includes(sourceId)
  ));
  const typeCandidates = claimSourceCandidates.filter(({ unit }) => (
    claim.claim_type === unit.evidence_type
  ));
  const scopedCandidates = typeCandidates.filter(({ unit }) => (
    scopeWithinEvidence(claim.scope, unit.scope)
  ));
  const sourceHasTypeMismatch = claim.source_ids?.some((sourceId) => {
    const candidatesForSource = candidates.filter((candidate) => candidate.sourceId === sourceId);
    return candidatesForSource.length > 0
      && !candidatesForSource.some(({ unit }) => claim.claim_type === unit.evidence_type);
  });
  const nonnumericClaimValueForbidden = (
    scopedCandidates.some(({ unit }) => unit.numeric_provenance === null)
    && claim.value !== null
  );

  if (candidates.length === 0) fail(violations, `${path}:evidence_statement_exact_match_missing`);
  else if (claimSourceCandidates.length === 0) {
    fail(violations, `${path}:matching_evidence_source_mismatch`);
  }
  if (sourceHasTypeMismatch) {
    fail(violations, `${path}:claim_type_evidence_type_mismatch`);
  }
  if (typeCandidates.length > 0 && scopedCandidates.length === 0) {
    fail(violations, `${path}:claim_scope_exceeds_evidence_scope`);
  }
  if (nonnumericClaimValueForbidden) {
    fail(violations, `${path}:nonnumeric_claim_value_forbidden`);
  }
  if (scopedCandidates.length > 0
    && !nonnumericClaimValueForbidden
    && !scopedCandidates.some(({ unit }) => numericEvidenceMatchesClaim(claim, unit))) {
    fail(violations, `${path}:numeric_provenance_mismatch`);
  }
  if (claim.source_ids?.some((sourceId) => !matchedSourceIds.includes(sourceId))) {
    fail(violations, `${path}:unbound_claim_source_id`);
  }
  if (matches.length === 0 && candidates.length > 0 && violations.length === before) {
    fail(violations, `${path}:evidence_binding_failed`);
  }

  if (violations.length === before) {
    return {
      ...base,
      source_ids: matchedSourceIds,
      evidence_unit_ids: matchedEvidenceUnitIds,
      binding_status: "BOUND",
    };
  }
  return {
    ...base,
    source_ids: matchedSourceIds,
    evidence_unit_ids: matchedEvidenceUnitIds,
  };
};

export const buildM1DecisionEvidenceRequest = ({
  confirmedInput,
  evidenceSnapshot,
}) => {
  const validation = validateM1EvidenceSnapshot(evidenceSnapshot);
  if (!validation.ok) {
    const error = new Error("m1_evidence_snapshot_invalid");
    error.code = "m1_evidence_snapshot_invalid";
    error.details = validation.errors;
    throw error;
  }
  const base = buildM1DecisionResolutionRequest({ confirmedInput });
  const evidenceSnapshotHash = hashM1EvidenceSnapshot(evidenceSnapshot);
  return {
    ...base,
    request_id: `m1_dre_${base.inputs.confirmed_input_hash.slice(0, 10)}_${evidenceSnapshotHash.slice(0, 10)}`,
    inputs: {
      ...base.inputs,
      evidence_snapshot_id: evidenceSnapshot.evidence_snapshot_id,
      evidence_snapshot_schema_version: evidenceSnapshot.schema_version,
      evidence_snapshot_hash: evidenceSnapshotHash,
      evidence_snapshot_json: canonicalStringifyM1EvidenceSnapshot(evidenceSnapshot),
    },
  };
};

export const runM1DecisionEvidenceGuard = ({
  confirmedInput,
  decisionState,
  evidenceSnapshot,
  evidenceSnapshotId,
  evidenceSnapshotSchemaVersion,
  evidenceSnapshotHash,
}) => {
  const violations = [];
  const confirmedInputHash = confirmedInput && typeof confirmedInput === "object"
    ? hashM1ConfirmedInput(confirmedInput)
    : "";
  const decisionValidation = validateM1DecisionState(decisionState, {
    confirmedInput,
    inputHash: confirmedInputHash,
  });
  if (!decisionValidation.ok) {
    decisionValidation.errors.forEach((error) => fail(violations, `decision_state:${error}`));
  }

  const snapshotValidation = validateM1EvidenceSnapshot(evidenceSnapshot);
  if (!snapshotValidation.ok) {
    snapshotValidation.errors.forEach((error) => fail(violations, `snapshot:${error}`));
  }
  if (evidenceSnapshotSchemaVersion !== M1_EVIDENCE_SNAPSHOT_SCHEMA_VERSION
    || evidenceSnapshot?.schema_version !== evidenceSnapshotSchemaVersion) {
    fail(violations, "evidence_snapshot_schema_version_mismatch");
  }
  if (evidenceSnapshotId !== evidenceSnapshot?.evidence_snapshot_id) {
    fail(violations, "evidence_snapshot_id_mismatch");
  }
  const recomputedHash = evidenceSnapshot && typeof evidenceSnapshot === "object"
    ? hashM1EvidenceSnapshot(evidenceSnapshot)
    : "";
  if (evidenceSnapshotHash !== recomputedHash) {
    fail(violations, "evidence_snapshot_hash_mismatch");
  }

  const { sources, unitsByStatement } = snapshotIndexes(evidenceSnapshot);
  const knownUnknownIds = new Set(
    (decisionState?.unresolved_unknowns || []).map((unknown) => unknown.unknown_id),
  );

  [
    "product_boundary",
    "protected_load_boundary",
    "system_boundary",
    "application_fit",
    "no_fit_boundary",
  ].forEach((field) => validateStatusRecord({
    record: decisionState?.[field],
    path: field,
    sourceIndex: sources,
    knownUnknownIds,
    violations,
  }));
  (decisionState?.architecture_alternatives || []).forEach((record, index) => (
    validateArchitectureRecord({
      record,
      path: `architecture_alternatives_${index}`,
      sourceIndex: sources,
      knownUnknownIds,
      violations,
    })
  ));
  Object.entries(decisionState?.decision_outputs || {}).forEach(([outputId, record]) => (
    validateStatusRecord({
      record,
      path: `decision_outputs_${outputId}`,
      sourceIndex: sources,
      knownUnknownIds,
      violations,
    })
  ));
  [
    "customer_requirements",
    "product_requirements",
    "differentiators",
    "critical_metrics",
  ].forEach((field) => {
    (decisionState?.[field] || []).forEach((record, index) => validateStatusRecord({
      record,
      path: `${field}_${index}`,
      sourceIndex: sources,
      knownUnknownIds,
      violations,
    }));
  });
  validateStatusRecord({
    record: decisionState?.recommendation,
    path: "recommendation",
    sourceIndex: sources,
    knownUnknownIds,
    violations,
  });
  validateUnknownArray(
    decisionState?.funding_boundary?.unknown_ids,
    "funding_boundary",
    knownUnknownIds,
    violations,
  );
  if (["UNKNOWN", "BLOCKED"].includes(decisionState?.funding_boundary?.status)
    && decisionState?.funding_boundary?.unknown_ids?.length === 0) {
    fail(violations, "funding_boundary:unknown_basis_required");
  }
  (decisionState?.decision_gates || []).forEach((gate, index) => {
    const path = `decision_gates_${index}`;
    validateUnknownArray(
      gate.blocking_unknown_ids,
      path,
      knownUnknownIds,
      violations,
    );
    if (gate.status === "BLOCKED" && gate.blocking_unknown_ids?.length === 0) {
      fail(violations, `${path}:unknown_basis_required`);
    }
  });
  (decisionState?.validation_actions || []).forEach((action, index) => (
    validateUnknownArray(
      action.resolves_unknown_ids,
      `validation_actions_${index}`,
      knownUnknownIds,
      violations,
    )
  ));
  validateUnknownArray(
    decisionState?.confidence?.constrained_by_unknown_ids,
    "confidence",
    knownUnknownIds,
    violations,
  );

  ["tradeoffs", "risks"].forEach((field) => {
    (decisionState?.[field] || []).forEach((record, index) => {
      const path = `${field}_${index}`;
      validateSourceArray(record.source_ids, path, sources, violations);
      validateUnknownArray(record.unknown_ids, path, knownUnknownIds, violations);
      if (record.source_ids?.length === 0) fail(violations, `${path}:technical_source_required`);
    });
  });

  const confirmedStrings = confirmedInputValues(confirmedInput);
  [
    ...(decisionState?.validation_actions || []).map((action, index) => ({
      owner: action.owner,
      path: `validation_actions_${index}`,
    })),
    { owner: decisionState?.required_action?.owner, path: "required_action" },
  ].forEach(({ owner, path }) => {
    if (!SAFE_OWNER_VALUES.has(owner) && !confirmedStrings.has(owner)) {
      fail(violations, `${path}:unconfirmed_owner_assignment`);
      fail(violations, "unconfirmed_owner_assignment");
    }
  });

  const claimBindings = (decisionState?.claim_candidates || []).map((claim) => bindClaim({
    claim,
    sourceIndex: sources,
    unitsByStatement,
    violations,
  }));

  const binding = {
    schema_version: M1_EVIDENCE_BINDING_SCHEMA_VERSION,
    decision_id: decisionState?.decision_id || "",
    evidence_snapshot_id: evidenceSnapshot?.evidence_snapshot_id || "",
    evidence_snapshot_hash: recomputedHash,
    claim_bindings: claimBindings,
    violations: unique(violations),
  };
  return {
    ok: binding.violations.length === 0,
    binding: clone(binding),
  };
};
