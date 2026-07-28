import {
  M1_DECISION_METHOD_VERSION,
  M1_DECISION_OUTPUTS,
  M1_DECISION_STATE_SCHEMA_VERSION,
  M1_EVIDENCE_SOURCE_IDS,
} from "../../contracts/m1DecisionState.js";
import { M1ReleaseError, assert, clone, sameValue, unique } from "./errors.js";
import { getConfirmedField } from "./input.js";

const EMPTY_ARRAY_FIELDS = [
  "customer_requirements",
  "product_requirements",
  "differentiators",
  "critical_metrics",
  "tradeoffs",
  "risks",
];

const sorted = (values) => [...values].sort();
const idPart = (value) => String(value).replace(/[^A-Za-z0-9._-]/g, "_").toUpperCase();
const templateText = (templates, bindingKey) => templates.get(bindingKey).text;
const exactScope = (unit) => Object.fromEntries(
  ["product", "application", "customer", "region", "time"]
    .map((field) => [field, unit.scope[field][0]]),
);
const confirmedScope = (confirmedInput) => ({
  product: getConfirmedField(confirmedInput, "primary_product_object").value,
  application: getConfirmedField(confirmedInput, "application_scenario").value,
  customer: getConfirmedField(confirmedInput, "target_customer").value,
  region: getConfirmedField(confirmedInput, "region").value,
  time: getConfirmedField(confirmedInput, "target_timing").value,
});
const selectedSourcesForSlot = (selectedEvidence, slot) => unique(
  selectedEvidence
    .filter(({ annotation }) => annotation.allowed_output_slots.includes(slot))
    .map(({ source }) => source.source_id),
);
const recommendationPrefix = (code) => ({
  EVALUATION_ONLY: "REC_EVALUATION",
  NO_FINAL_DECISION: "REC_NO_FINAL",
  HOLD_ALL_ALTERNATIVES: "REC_HOLD_ALL",
})[code];

const assertExact = (actual, authoritative, code = "QUALITY_GATE_REJECTED", offendingIds = []) => {
  assert(sameValue(actual, authoritative), code, {
    stage: "QUALITY_GATE",
    offendingIds,
  });
};

const decisionBlockAuthority = ({
  templatePrefix,
  templates,
  sourceIds,
  unknownIds,
  supportedStatus = "QUALIFIED",
}) => ({
  status: sourceIds.length > 0 ? supportedStatus : "UNKNOWN",
  statement: templateText(templates, `${templatePrefix}_STATEMENT`),
  source_ids: sourceIds.slice(),
  unknown_ids: sourceIds.length > 0 && supportedStatus === "SUPPORTED" ? [] : [...unknownIds],
  decision_impact: templateText(templates, `${templatePrefix}_IMPACT`),
});

const sourceClaimAuthority = ({ unit, source, templates }) => ({
  claim_id: `CLAIM_${idPart(unit.evidence_unit_id)}`,
  statement: unit.statement,
  value: unit.numeric_provenance?.value ?? null,
  claim_type: unit.evidence_type,
  proposed_class: "SOURCE_BACKED",
  source_ids: [source.source_id],
  scope: exactScope(unit),
  numeric_provenance: clone(unit.numeric_provenance),
  reasoning_bridge: templateText(templates, "CLAIM_SOURCE_REASONING"),
  uncertainty: templateText(templates, "CLAIM_SOURCE_UNCERTAINTY"),
  decision_impact: templateText(templates, "CLAIM_SOURCE_IMPACT"),
});

const unknownClaimAuthority = ({ mapping, confirmedInput, templates }) => ({
  claim_id: `CLAIM_${idPart(mapping.output_unknown_id)}`,
  statement: templateText(templates, "CLAIM_UNKNOWN_STATEMENT"),
  value: null,
  claim_type: "UNKNOWN",
  proposed_class: "UNKNOWN",
  source_ids: [],
  scope: confirmedScope(confirmedInput),
  numeric_provenance: null,
  reasoning_bridge: templateText(templates, "CLAIM_UNKNOWN_REASONING"),
  uncertainty: templateText(templates, "CLAIM_UNKNOWN_UNCERTAINTY"),
  decision_impact: templateText(templates, "CLAIM_UNKNOWN_IMPACT"),
});

export const assertReleasedBinding = (releaseResult, authoritativeBinding) => {
  assert(releaseResult?.status === "RELEASED", "CONFIRMED_INPUT_BINDING_MISMATCH", {
    stage: "QUALITY_GATE",
  });
  assertExact(
    releaseResult.binding,
    authoritativeBinding,
    "CONFIRMED_INPUT_BINDING_MISMATCH",
  );
};

export const runProductDecisionQualityGate = ({
  decisionState,
  confirmedInput,
  decisionPolicy,
  templates,
  selection,
  extractedInput,
}) => {
  assert(
    decisionState?.schema_version === M1_DECISION_STATE_SCHEMA_VERSION,
    "QUALITY_GATE_REJECTED",
    { stage: "QUALITY_GATE", offendingIds: ["schema_version"] },
  );
  assertExact(
    decisionState.confirmed_input,
    confirmedInput,
    "CONFIRMED_INPUT_BINDING_MISMATCH",
  );
  assert(
    decisionState.binding?.confirmed_input_id === confirmedInput.confirmed_input_id
      && decisionState.binding?.confirmed_input_schema_version === confirmedInput.schema_version,
    "CONFIRMED_INPUT_BINDING_MISMATCH",
    { stage: "QUALITY_GATE" },
  );
  assertExact(decisionState.method, {
    method_version: M1_DECISION_METHOD_VERSION,
    outputs: Object.keys(M1_DECISION_OUTPUTS),
  });
  assertExact(decisionState.evidence_boundary, {
    mode: "FROZEN_SEVEN_SOURCE",
    source_ids: [...M1_EVIDENCE_SOURCE_IDS],
  });

  const blockingMappings = extractedInput.unknownFields
    .map((fieldName) => extractedInput.unknownMappings.get(fieldName))
    .filter(({ blocking }) => blocking);
  const unknownIds = blockingMappings.map(({ output_unknown_id: unknownId }) => unknownId);
  const hasBlockingUnknown = blockingMappings.length > 0;
  const outcome = hasBlockingUnknown
    ? decisionPolicy.decision_policy.outcomes.blocking_unknown
    : decisionPolicy.decision_policy.outcomes.evidence_available;
  const alternativeCode = outcome.alternative_code;

  const authoritativeAlternatives = selection.selections.map((selected) => ({
    alternative_id: selected.mapping.normalized_alternative_id,
    label: selected.alternativeValue,
    fit_status: decisionPolicy.state_build_rules
      .alternative_fit_status_by_code[alternativeCode],
    rationale: templateText(templates, `ALT_${alternativeCode}_RATIONALE`),
    source_ids: selectedSourcesForSlot(
      selected.evidence,
      "ARCHITECTURE_ALTERNATIVE",
    ),
    unknown_ids: [...unknownIds],
    decision_impact: templateText(templates, `ALT_${alternativeCode}_IMPACT`),
  }));
  const authoritativeAlternativeIds = authoritativeAlternatives
    .map(({ alternative_id: id }) => id);
  const actualAlternativeIds = (decisionState.architecture_alternatives || [])
    .map(({ alternative_id: id }) => id);
  const missingAlternatives = authoritativeAlternativeIds
    .filter((id) => !actualAlternativeIds.includes(id));
  if (missingAlternatives.length > 0) {
    throw new M1ReleaseError("BUILDER_OUTPUT_INVALID", {
      stage: "QUALITY_GATE",
      offendingIds: missingAlternatives,
    });
  }
  const fabricatedAlternatives = actualAlternativeIds
    .filter((id) => !authoritativeAlternativeIds.includes(id));
  if (fabricatedAlternatives.length > 0) {
    throw new M1ReleaseError("UNSUPPORTED_ALTERNATIVE", {
      stage: "QUALITY_GATE",
      offendingIds: fabricatedAlternatives,
    });
  }
  assertExact(decisionState.architecture_alternatives, authoritativeAlternatives);

  const authoritativeUnknownFields = blockingMappings
    .map(({ confirmed_field_name: field }) => field);
  const actualUnknownFields = (decisionState.unresolved_unknowns || [])
    .map(({ field }) => field);
  const missingUnknowns = authoritativeUnknownFields
    .filter((field) => !actualUnknownFields.includes(field));
  if (missingUnknowns.length > 0) {
    throw new M1ReleaseError("UNKNOWN_FIELD_MISSING", {
      stage: "QUALITY_GATE",
      offendingIds: missingUnknowns,
    });
  }
  const fabricatedUnknowns = actualUnknownFields
    .filter((field) => !authoritativeUnknownFields.includes(field));
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

  const authoritativeUnknowns = blockingMappings.map((mapping) => ({
    unknown_id: mapping.output_unknown_id,
    field: mapping.confirmed_field_name,
    status: "UNKNOWN",
    description: templateText(templates, "UNKNOWN_DESCRIPTION"),
    constrains: clone(mapping.constrains),
    decision_impact: templateText(templates, "UNKNOWN_DECISION_IMPACT"),
    required_validation_action: templateText(
      templates,
      "UNKNOWN_REQUIRED_VALIDATION_ACTION",
    ),
  }));
  assertExact(decisionState.unresolved_unknowns, authoritativeUnknowns);

  const authoritativeGates = blockingMappings.map((mapping) => ({
    gate_id: `GATE_${idPart(mapping.output_unknown_id)}`,
    condition: templateText(templates, "GATE_CONDITION"),
    status: "BLOCKED",
    blocking_unknown_ids: [mapping.output_unknown_id],
    validation_action: templateText(templates, "GATE_VALIDATION_ACTION"),
    funding_effect: templateText(templates, "GATE_FUNDING_EFFECT"),
  }));
  const authoritativeActions = blockingMappings.map((mapping) => ({
    action_id: `ACTION_${idPart(mapping.output_unknown_id)}`,
    action: templateText(templates, "VALIDATION_ACTION_ACTION"),
    owner: decisionPolicy.state_build_rules.owner_value,
    trigger: templateText(templates, "VALIDATION_ACTION_TRIGGER"),
    evidence_required: templateText(templates, "VALIDATION_ACTION_EVIDENCE_REQUIRED"),
    resolves_unknown_ids: [mapping.output_unknown_id],
  }));
  assertExact(decisionState.decision_gates, authoritativeGates);
  assertExact(decisionState.validation_actions, authoritativeActions);

  EMPTY_ARRAY_FIELDS.forEach((field) => {
    assert(
      Array.isArray(decisionState[field]) && decisionState[field].length === 0,
      "QUALITY_GATE_REJECTED",
      { stage: "QUALITY_GATE", offendingIds: [field] },
    );
  });

  const applicationSourceIds = selectedSourcesForSlot(
    selection.selectedEvidence,
    "APPLICATION_FIT",
  );
  assertExact(decisionState.product_boundary, decisionBlockAuthority({
    templatePrefix: "BOUNDARY_PRODUCT",
    templates,
    sourceIds: [],
    unknownIds,
  }));
  assertExact(decisionState.protected_load_boundary, decisionBlockAuthority({
    templatePrefix: "BOUNDARY_PROTECTED_LOAD",
    templates,
    sourceIds: applicationSourceIds,
    unknownIds,
    supportedStatus: "SUPPORTED",
  }));
  assertExact(decisionState.system_boundary, decisionBlockAuthority({
    templatePrefix: "BOUNDARY_SYSTEM",
    templates,
    sourceIds: [],
    unknownIds,
  }));
  assertExact(decisionState.application_fit, decisionBlockAuthority({
    templatePrefix: "BOUNDARY_APPLICATION",
    templates,
    sourceIds: applicationSourceIds,
    unknownIds,
  }));
  assertExact(decisionState.no_fit_boundary, decisionBlockAuthority({
    templatePrefix: "BOUNDARY_NO_FIT",
    templates,
    sourceIds: [],
    unknownIds,
  }));

  const authoritativeOutputs = Object.fromEntries(
    Object.entries(M1_DECISION_OUTPUTS).map(([outputId, title]) => [outputId, {
      output_id: outputId,
      title,
      status: "QUALIFIED",
      decision: templateText(templates, `${outputId}_DECISION`),
      source_ids: [],
      unknown_ids: [...unknownIds],
      decision_impact: templateText(templates, `${outputId}_IMPACT`),
    }]),
  );
  assertExact(decisionState.decision_outputs, authoritativeOutputs);

  const recommendationCode = outcome.recommendation_code;
  const recommendationTemplatePrefix = recommendationPrefix(recommendationCode);
  assertExact(decisionState.recommendation, {
    status: "QUALIFIED",
    decision: templateText(templates, `${recommendationTemplatePrefix}_DECISION`),
    rationale: templateText(templates, `${recommendationTemplatePrefix}_RATIONALE`),
    conditions: [templateText(templates, `${recommendationTemplatePrefix}_CONDITION`)],
    source_ids: [],
    unknown_ids: [...unknownIds],
  });
  assertExact(decisionState.required_action, {
    action: templateText(templates, "REQUIRED_ACTION_ACTION"),
    owner: decisionPolicy.state_build_rules.owner_value,
    timing: templateText(templates, "REQUIRED_ACTION_TIMING"),
    blocking: hasBlockingUnknown,
  }, hasBlockingUnknown ? "BLOCKING_UNKNOWN_CONFLICT" : "QUALITY_GATE_REJECTED");

  const fundingPrefix = outcome.funding_code === "VALIDATION_ONLY"
    ? "FUND_VALIDATION"
    : "FUND_BLOCKED";
  assertExact(decisionState.funding_boundary, {
    status: outcome.funding_code === "VALIDATION_ONLY" ? "QUALIFIED" : "BLOCKED",
    allowed_commitment: templateText(templates, `${fundingPrefix}_ALLOWED`),
    prohibited_commitment: templateText(templates, `${fundingPrefix}_PROHIBITED`),
    release_conditions: [templateText(templates, `${fundingPrefix}_RELEASE`)],
    unknown_ids: [...unknownIds],
  }, hasBlockingUnknown ? "COMMITMENT_LEVEL_CONFLICT" : "QUALITY_GATE_REJECTED");

  const confidencePolicy = hasBlockingUnknown
    ? decisionPolicy.state_build_rules.confidence_policy.blocking_unknown
    : decisionPolicy.state_build_rules.confidence_policy.evidence_without_blocking_unknown;
  assertExact(decisionState.confidence, {
    level: confidencePolicy.level,
    score: confidencePolicy.score,
    rationale: templateText(
      templates,
      hasBlockingUnknown ? "CONFIDENCE_LOW_RATIONALE" : "CONFIDENCE_MEDIUM_RATIONALE",
    ),
    constrained_by_unknown_ids: [...unknownIds],
  });

  const actualSourceClaims = (decisionState.claim_candidates || [])
    .filter(({ proposed_class: proposedClass }) => proposedClass === "SOURCE_BACKED");
  if (actualSourceClaims.length !== selection.selectedEvidence.length) {
    throw new M1ReleaseError("NUMERIC_AGGREGATION_FORBIDDEN", {
      stage: "QUALITY_GATE",
    });
  }
  selection.selectedEvidence.forEach((selected) => {
    const claimId = `CLAIM_${idPart(selected.unit.evidence_unit_id)}`;
    const actual = actualSourceClaims.find(({ claim_id: id }) => id === claimId);
    assert(actual, "NUMERIC_AGGREGATION_FORBIDDEN", {
      stage: "QUALITY_GATE",
      offendingIds: [claimId],
    });
    assert(
      selected.annotation.evidence_domain === "TECHNICAL",
      "EVIDENCE_SCOPE_ESCALATION",
      { stage: "QUALITY_GATE", offendingIds: [selected.unit.evidence_unit_id] },
    );
    assert(actual.statement === selected.unit.statement, "STATEMENT_COPY_VIOLATION", {
      stage: "QUALITY_GATE",
      offendingIds: [claimId],
    });
    assert(
      sameValue(actual.source_ids, [selected.source.source_id]),
      "EVIDENCE_SOURCE_NOT_FOUND",
      { stage: "QUALITY_GATE", offendingIds: actual.source_ids },
    );
    assert(
      sameValue(actual.scope, exactScope(selected.unit)),
      "EVIDENCE_SCOPE_ESCALATION",
      { stage: "QUALITY_GATE", offendingIds: [claimId] },
    );
    const authoritativeClaim = sourceClaimAuthority({
      unit: selected.unit,
      source: selected.source,
      templates,
    });
    assert(
      sameValue(actual.value, authoritativeClaim.value)
        && sameValue(actual.numeric_provenance, authoritativeClaim.numeric_provenance),
      "NUMERIC_COPY_VIOLATION",
      { stage: "QUALITY_GATE", offendingIds: [claimId] },
    );
    assertExact(actual, authoritativeClaim);
  });

  const actualUnknownClaims = (decisionState.claim_candidates || [])
    .filter(({ proposed_class: proposedClass }) => proposedClass === "UNKNOWN");
  if (actualUnknownClaims.length !== blockingMappings.length) {
    throw new M1ReleaseError(
      actualUnknownClaims.length < blockingMappings.length
        ? "UNKNOWN_FIELD_MISSING"
        : "UNKNOWN_FIELD_FABRICATED",
      { stage: "QUALITY_GATE" },
    );
  }
  blockingMappings.forEach((mapping) => {
    const authoritativeClaim = unknownClaimAuthority({
      mapping,
      confirmedInput,
      templates,
    });
    const actual = actualUnknownClaims.find(({ claim_id: id }) => (
      id === authoritativeClaim.claim_id
    ));
    assert(actual, "UNKNOWN_FIELD_MISSING", {
      stage: "QUALITY_GATE",
      offendingIds: [authoritativeClaim.claim_id],
    });
    assertExact(actual, authoritativeClaim);
  });

  assert(
    decisionState.claim_candidates.length
      === selection.selectedEvidence.length + blockingMappings.length,
    "QUALITY_GATE_REJECTED",
    { stage: "QUALITY_GATE", offendingIds: ["claim_candidates"] },
  );
  return { ok: true, violations: [] };
};

export const qualityGateEmptyArrayFields = Object.freeze([...EMPTY_ARRAY_FIELDS]);
