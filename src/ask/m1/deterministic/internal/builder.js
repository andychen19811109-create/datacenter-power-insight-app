import {
  M1_DECISION_METHOD_VERSION,
  M1_DECISION_OUTPUTS,
  M1_DECISION_STATE_SCHEMA_VERSION,
  M1_EVIDENCE_SOURCE_IDS,
} from "../../contracts/m1DecisionState.js";
import { clone, unique } from "./errors.js";
import { getConfirmedField } from "./input.js";

const templateText = (templates, bindingKey) => templates.get(bindingKey).text;
const idPart = (value) => String(value).replace(/[^A-Za-z0-9._-]/g, "_").toUpperCase();

const selectedSourcesForSlot = (selectedEvidence, slot) => unique(
  selectedEvidence
    .filter(({ annotation }) => annotation.allowed_output_slots.includes(slot))
    .map(({ source }) => source.source_id),
);

const decisionBlock = ({
  templatePrefix,
  templates,
  sourceIds,
  unknownIds,
  supportedStatus = "QUALIFIED",
}) => ({
  status: sourceIds.length > 0 ? supportedStatus : "UNKNOWN",
  statement: templateText(templates, `${templatePrefix}_STATEMENT`),
  source_ids: [...sourceIds],
  unknown_ids: sourceIds.length > 0 && supportedStatus === "SUPPORTED" ? [] : [...unknownIds],
  decision_impact: templateText(templates, `${templatePrefix}_IMPACT`),
});

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

const sourceBackedClaim = ({ unit, source, templates }) => ({
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

const unknownClaim = ({ mapping, confirmedInput, templates }) => ({
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

const recommendationPrefix = (code) => ({
  EVALUATION_ONLY: "REC_EVALUATION",
  NO_FINAL_DECISION: "REC_NO_FINAL",
  HOLD_ALL_ALTERNATIVES: "REC_HOLD_ALL",
})[code];

export const buildDeterministicDecisionState = ({
  confirmedInput,
  confirmedInputHash,
  decisionPolicy,
  templates,
  extractedInput,
  selection,
}) => {
  const blockingMappings = extractedInput.unknownFields
    .map((fieldName) => extractedInput.unknownMappings.get(fieldName))
    .filter(({ blocking }) => blocking);
  const unknownIds = blockingMappings.map(({ output_unknown_id: unknownId }) => unknownId);
  const hasBlockingUnknown = blockingMappings.length > 0;
  const outcome = hasBlockingUnknown
    ? decisionPolicy.decision_policy.outcomes.blocking_unknown
    : decisionPolicy.decision_policy.outcomes.evidence_available;
  const alternativeTemplateCode = outcome.alternative_code;
  const sourceIds = selection.sourceIds;
  const applicationSourceIds = selectedSourcesForSlot(
    selection.selectedEvidence,
    "APPLICATION_FIT",
  );

  const architectureAlternatives = selection.selections.map((selected) => ({
    alternative_id: selected.mapping.normalized_alternative_id,
    label: selected.alternativeValue,
    fit_status: decisionPolicy.state_build_rules
      .alternative_fit_status_by_code[alternativeTemplateCode],
    rationale: templateText(templates, `ALT_${alternativeTemplateCode}_RATIONALE`),
    source_ids: unique(selected.evidence.map(({ source }) => source.source_id)),
    unknown_ids: [...unknownIds],
    decision_impact: templateText(templates, `ALT_${alternativeTemplateCode}_IMPACT`),
  }));

  const decisionOutputs = Object.fromEntries(
    Object.entries(M1_DECISION_OUTPUTS).map(([outputId, title]) => [outputId, {
      output_id: outputId,
      title,
      status: "QUALIFIED",
      decision: templateText(templates, `${outputId}_DECISION`),
      source_ids: outputId === "O7" && hasBlockingUnknown ? [] : [...sourceIds],
      unknown_ids: [...unknownIds],
      decision_impact: templateText(templates, `${outputId}_IMPACT`),
    }]),
  );

  const unresolvedUnknowns = blockingMappings.map((mapping) => ({
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
  const decisionGates = blockingMappings.map((mapping) => ({
    gate_id: `GATE_${idPart(mapping.output_unknown_id)}`,
    condition: templateText(templates, "GATE_CONDITION"),
    status: "BLOCKED",
    blocking_unknown_ids: [mapping.output_unknown_id],
    validation_action: templateText(templates, "GATE_VALIDATION_ACTION"),
    funding_effect: templateText(templates, "GATE_FUNDING_EFFECT"),
  }));
  const validationActions = blockingMappings.map((mapping) => ({
    action_id: `ACTION_${idPart(mapping.output_unknown_id)}`,
    action: templateText(templates, "VALIDATION_ACTION_ACTION"),
    owner: decisionPolicy.state_build_rules.owner_value,
    trigger: templateText(templates, "VALIDATION_ACTION_TRIGGER"),
    evidence_required: templateText(templates, "VALIDATION_ACTION_EVIDENCE_REQUIRED"),
    resolves_unknown_ids: [mapping.output_unknown_id],
  }));
  const recommendationCode = outcome.recommendation_code;
  const recommendationTemplatePrefix = recommendationPrefix(recommendationCode);
  const fundingPrefix = outcome.funding_code === "VALIDATION_ONLY"
    ? "FUND_VALIDATION"
    : "FUND_BLOCKED";
  const confidencePolicy = hasBlockingUnknown
    ? decisionPolicy.state_build_rules.confidence_policy.blocking_unknown
    : decisionPolicy.state_build_rules.confidence_policy.evidence_without_blocking_unknown;
  const confidenceTemplate = hasBlockingUnknown
    ? "CONFIDENCE_LOW_RATIONALE"
    : "CONFIDENCE_MEDIUM_RATIONALE";

  return {
    schema_version: M1_DECISION_STATE_SCHEMA_VERSION,
    decision_id: `DECISION_${confirmedInputHash.slice(0, 32).toUpperCase()}`,
    binding: {
      confirmed_input_id: confirmedInput.confirmed_input_id,
      confirmed_input_schema_version: confirmedInput.schema_version,
      confirmed_input_hash: confirmedInputHash,
    },
    confirmed_input: clone(confirmedInput),
    method: {
      method_version: M1_DECISION_METHOD_VERSION,
      outputs: Object.keys(M1_DECISION_OUTPUTS),
    },
    evidence_boundary: {
      mode: "FROZEN_SEVEN_SOURCE",
      source_ids: [...M1_EVIDENCE_SOURCE_IDS],
    },
    product_boundary: decisionBlock({
      templatePrefix: "BOUNDARY_PRODUCT",
      templates,
      sourceIds,
      unknownIds,
    }),
    protected_load_boundary: decisionBlock({
      templatePrefix: "BOUNDARY_PROTECTED_LOAD",
      templates,
      sourceIds: applicationSourceIds,
      unknownIds,
      supportedStatus: "SUPPORTED",
    }),
    system_boundary: decisionBlock({
      templatePrefix: "BOUNDARY_SYSTEM",
      templates,
      sourceIds: hasBlockingUnknown ? [] : sourceIds,
      unknownIds,
    }),
    architecture_alternatives: architectureAlternatives,
    application_fit: decisionBlock({
      templatePrefix: "BOUNDARY_APPLICATION",
      templates,
      sourceIds: applicationSourceIds,
      unknownIds,
    }),
    no_fit_boundary: decisionBlock({
      templatePrefix: "BOUNDARY_NO_FIT",
      templates,
      sourceIds: hasBlockingUnknown ? [] : sourceIds,
      unknownIds,
    }),
    decision_outputs: decisionOutputs,
    customer_requirements: [],
    product_requirements: [],
    differentiators: [],
    critical_metrics: [],
    tradeoffs: [],
    risks: [],
    decision_gates: decisionGates,
    validation_actions: validationActions,
    recommendation: {
      status: "QUALIFIED",
      decision: templateText(templates, `${recommendationTemplatePrefix}_DECISION`),
      rationale: templateText(templates, `${recommendationTemplatePrefix}_RATIONALE`),
      conditions: [templateText(templates, `${recommendationTemplatePrefix}_CONDITION`)],
      source_ids: [...sourceIds],
      unknown_ids: [...unknownIds],
    },
    required_action: {
      action: templateText(templates, "REQUIRED_ACTION_ACTION"),
      owner: decisionPolicy.state_build_rules.owner_value,
      timing: templateText(templates, "REQUIRED_ACTION_TIMING"),
      blocking: hasBlockingUnknown,
    },
    funding_boundary: {
      status: outcome.funding_code === "VALIDATION_ONLY" ? "QUALIFIED" : "BLOCKED",
      allowed_commitment: templateText(templates, `${fundingPrefix}_ALLOWED`),
      prohibited_commitment: templateText(templates, `${fundingPrefix}_PROHIBITED`),
      release_conditions: [templateText(templates, `${fundingPrefix}_RELEASE`)],
      unknown_ids: [...unknownIds],
    },
    confidence: {
      level: confidencePolicy.level,
      score: confidencePolicy.score,
      rationale: templateText(templates, confidenceTemplate),
      constrained_by_unknown_ids: [...unknownIds],
    },
    unresolved_unknowns: unresolvedUnknowns,
    claim_candidates: [
      ...selection.selectedEvidence.map(({ unit, source }) => sourceBackedClaim({
        unit,
        source,
        templates,
      })),
      ...blockingMappings.map((mapping) => unknownClaim({
        mapping,
        confirmedInput,
        templates,
      })),
    ],
  };
};
