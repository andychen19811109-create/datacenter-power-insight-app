import { M1ReleaseError, assert, sameValue } from "./errors.js";

const EMPTY_ARRAY_FIELDS = [
  "customer_requirements",
  "product_requirements",
  "differentiators",
  "critical_metrics",
  "tradeoffs",
  "risks",
];

const sorted = (values) => [...values].sort();
const scopeWithinEvidence = (claimScope, evidenceScope) => (
  ["product", "application", "customer", "region", "time"].every((field) => (
    claimScope[field] === "unknown"
    || evidenceScope[field].includes(claimScope[field])
  ))
);

export const assertReleasedBinding = (releaseResult, expectedBinding) => {
  assert(releaseResult?.status === "RELEASED", "CONFIRMED_INPUT_BINDING_MISMATCH", {
    stage: "QUALITY_GATE",
  });
  assert(sameValue(releaseResult.binding, expectedBinding), "CONFIRMED_INPUT_BINDING_MISMATCH", {
    stage: "QUALITY_GATE",
  });
};

export const runProductDecisionQualityGate = ({
  decisionState,
  expectedState,
  selection,
  extractedInput,
}) => {
  const expectedAlternativeIds = expectedState.architecture_alternatives
    .map(({ alternative_id: id }) => id);
  const actualAlternativeIds = (decisionState.architecture_alternatives || [])
    .map(({ alternative_id: id }) => id);
  const missingAlternatives = expectedAlternativeIds
    .filter((id) => !actualAlternativeIds.includes(id));
  if (missingAlternatives.length > 0) {
    throw new M1ReleaseError("BUILDER_OUTPUT_INVALID", {
      stage: "QUALITY_GATE",
      offendingIds: missingAlternatives,
    });
  }
  const fabricatedAlternatives = actualAlternativeIds
    .filter((id) => !expectedAlternativeIds.includes(id));
  if (fabricatedAlternatives.length > 0) {
    throw new M1ReleaseError("UNSUPPORTED_ALTERNATIVE", {
      stage: "QUALITY_GATE",
      offendingIds: fabricatedAlternatives,
    });
  }

  const expectedUnknownFields = expectedState.unresolved_unknowns.map(({ field }) => field);
  const actualUnknownFields = (decisionState.unresolved_unknowns || []).map(({ field }) => field);
  const missingUnknowns = expectedUnknownFields.filter((field) => !actualUnknownFields.includes(field));
  if (missingUnknowns.length > 0) {
    throw new M1ReleaseError("UNKNOWN_FIELD_MISSING", {
      stage: "QUALITY_GATE",
      offendingIds: missingUnknowns,
    });
  }
  const fabricatedUnknowns = actualUnknownFields
    .filter((field) => !expectedUnknownFields.includes(field));
  if (fabricatedUnknowns.length > 0) {
    throw new M1ReleaseError("UNKNOWN_FIELD_FABRICATED", {
      stage: "QUALITY_GATE",
      offendingIds: fabricatedUnknowns,
    });
  }
  assert(
    sameValue(sorted(actualUnknownFields), sorted(extractedInput.unknownFields)),
    "UNKNOWN_INDEX_MISMATCH",
    { stage: "QUALITY_GATE" },
  );

  EMPTY_ARRAY_FIELDS.forEach((field) => {
    assert(
      Array.isArray(decisionState[field]) && decisionState[field].length === 0,
      "QUALITY_GATE_REJECTED",
      { stage: "QUALITY_GATE", offendingIds: [field] },
    );
  });
  if (expectedUnknownFields.length > 0) {
    assert(decisionState.required_action?.timing === "TBD", "BLOCKING_UNKNOWN_CONFLICT", {
      stage: "QUALITY_GATE",
      offendingIds: ["required_action.timing"],
    });
    assert(
      decisionState.funding_boundary?.allowed_commitment
        === expectedState.funding_boundary.allowed_commitment,
      "COMMITMENT_LEVEL_CONFLICT",
      { stage: "QUALITY_GATE", offendingIds: ["funding_boundary.allowed_commitment"] },
    );
  }

  const expectedSourceClaims = expectedState.claim_candidates
    .filter(({ proposed_class: proposedClass }) => proposedClass === "SOURCE_BACKED");
  const actualSourceClaims = (decisionState.claim_candidates || [])
    .filter(({ proposed_class: proposedClass }) => proposedClass === "SOURCE_BACKED");
  if (actualSourceClaims.length !== expectedSourceClaims.length) {
    throw new M1ReleaseError("NUMERIC_AGGREGATION_FORBIDDEN", {
      stage: "QUALITY_GATE",
    });
  }
  expectedSourceClaims.forEach((expectedClaim) => {
    const actual = actualSourceClaims.find(({ claim_id: claimId }) => (
      claimId === expectedClaim.claim_id
    ));
    assert(actual, "NUMERIC_AGGREGATION_FORBIDDEN", {
      stage: "QUALITY_GATE",
      offendingIds: [expectedClaim.claim_id],
    });
    assert(actual.statement === expectedClaim.statement, "STATEMENT_COPY_VIOLATION", {
      stage: "QUALITY_GATE",
      offendingIds: [expectedClaim.claim_id],
    });
    const selected = selection.selectedEvidence.find(({ unit }) => (
      `CLAIM_${unit.evidence_unit_id}` === expectedClaim.claim_id
    ));
    assert(selected, "EVIDENCE_UNIT_NOT_FOUND", {
      stage: "QUALITY_GATE",
      offendingIds: [expectedClaim.claim_id],
    });
    assert(
      actual.source_ids.length === 1
        && actual.source_ids[0] === selected.source.source_id,
      "EVIDENCE_SOURCE_NOT_FOUND",
      { stage: "QUALITY_GATE", offendingIds: actual.source_ids },
    );
    assert(
      selected.annotation.evidence_domain === "TECHNICAL",
      "EVIDENCE_SCOPE_ESCALATION",
      { stage: "QUALITY_GATE", offendingIds: [selected.unit.evidence_unit_id] },
    );
    assert(
      scopeWithinEvidence(actual.scope, selected.unit.scope),
      "EVIDENCE_SCOPE_ESCALATION",
      { stage: "QUALITY_GATE", offendingIds: [actual.claim_id] },
    );
    assert(
      sameValue(actual.numeric_provenance, expectedClaim.numeric_provenance)
        && sameValue(actual.value, expectedClaim.value),
      "NUMERIC_COPY_VIOLATION",
      { stage: "QUALITY_GATE", offendingIds: [actual.claim_id] },
    );
  });

  const expectedUnknownClaims = expectedState.claim_candidates
    .filter(({ proposed_class: proposedClass }) => proposedClass === "UNKNOWN");
  const actualUnknownClaims = (decisionState.claim_candidates || [])
    .filter(({ proposed_class: proposedClass }) => proposedClass === "UNKNOWN");
  assert(
    actualUnknownClaims.length === expectedUnknownClaims.length,
    actualUnknownClaims.length < expectedUnknownClaims.length
      ? "UNKNOWN_FIELD_MISSING"
      : "UNKNOWN_FIELD_FABRICATED",
    { stage: "QUALITY_GATE" },
  );

  const conservativeFields = [
    "product_boundary",
    "protected_load_boundary",
    "system_boundary",
    "application_fit",
    "no_fit_boundary",
    "decision_outputs",
    "architecture_alternatives",
    "decision_gates",
    "validation_actions",
    "recommendation",
    "required_action",
    "funding_boundary",
    "confidence",
    "unresolved_unknowns",
  ];
  const conservativeMatch = conservativeFields.every((field) => (
    sameValue(decisionState[field], expectedState[field])
  ));
  assert(conservativeMatch, "QUALITY_GATE_REJECTED", {
    stage: "QUALITY_GATE",
  });
  assert(
    sameValue(decisionState.confirmed_input, expectedState.confirmed_input)
      && sameValue(decisionState.binding, expectedState.binding),
    "CONFIRMED_INPUT_BINDING_MISMATCH",
    { stage: "QUALITY_GATE" },
  );
  return { ok: true, violations: [] };
};

export const qualityGateEmptyArrayFields = Object.freeze([...EMPTY_ARRAY_FIELDS]);
