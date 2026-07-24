import {
  M1_CONFIRMED_INPUT_SCHEMA_VERSION,
  validateM1ConfirmedInput,
} from "./m1ConfirmedInput.js";

export const M1_DECISION_STATE_SCHEMA_VERSION = "m1.decision-state.v1";
export const M1_DECISION_METHOD_VERSION = "D2.frozen.O1-O7.v1";

export const M1_EVIDENCE_SOURCE_IDS = Object.freeze([
  "NVIDIA_800VDC_AI_POWER",
  "OCP_MT_DIABLO",
  "DIGITAL_REALTY_HIGH_DENSITY_COLOCATION",
  "SCHNEIDER_GALAXY_VXL",
  "VERTIV_AI_POWER_SWING_UPS",
  "UL_1778",
  "OSHA_NRTL",
]);

export const M1_DECISION_OUTPUTS = Object.freeze({
  O1: "Product Object Boundary",
  O2: "Architecture Kill Precedence",
  O3: "Application Behavior to Product Gate",
  O4: "Benchmark Classification",
  O5: "System Boundary Test",
  O6: "Market Entry Completeness",
  O7: "Unknown-to-Decision Translation",
});

const DECISION_STATUSES = new Set(["SUPPORTED", "QUALIFIED", "UNKNOWN", "BLOCKED"]);
const FIT_STATUSES = new Set(["FIT", "CONDITIONAL_FIT", "NO_FIT", "UNKNOWN"]);
const PRIORITIES = new Set(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);
const GATE_STATUSES = new Set(["OPEN", "PASS", "FAIL", "BLOCKED"]);
const CONFIDENCE_LEVELS = new Set(["LOW", "MEDIUM", "HIGH"]);
const CLAIM_TYPES = new Set([
  "FACT",
  "BENCHMARK",
  "REQUIREMENT",
  "METRIC",
  "RECOMMENDATION",
  "RISK",
  "UNKNOWN",
]);
const CLAIM_CLASSES = new Set(["SOURCE_BACKED", "INFERRED_BRIDGE", "UNKNOWN"]);
const UNKNOWN_CONSTRAINTS = new Set([
  "confidence",
  "funding_boundary",
  "decision_gate",
  "recommendation",
  "validation_action",
]);
const SOURCE_IDS = new Set(M1_EVIDENCE_SOURCE_IDS);
const TOP_LEVEL_KEYS = Object.freeze([
  "schema_version",
  "decision_id",
  "binding",
  "confirmed_input",
  "method",
  "evidence_boundary",
  "product_boundary",
  "protected_load_boundary",
  "system_boundary",
  "architecture_alternatives",
  "application_fit",
  "no_fit_boundary",
  "decision_outputs",
  "customer_requirements",
  "product_requirements",
  "differentiators",
  "critical_metrics",
  "tradeoffs",
  "risks",
  "decision_gates",
  "validation_actions",
  "recommendation",
  "required_action",
  "funding_boundary",
  "confidence",
  "unresolved_unknowns",
  "claim_candidates",
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

const validateSourceIds = (sourceIds, path, errors) => {
  if (!isStringArray(sourceIds) && !(Array.isArray(sourceIds) && sourceIds.length === 0)) {
    errors.push(`${path}_invalid`);
    return;
  }
  if (sourceIds.some((sourceId) => !SOURCE_IDS.has(sourceId))) {
    errors.push(`${path}_outside_evidence_boundary`);
  }
};

const validateUnknownIds = (unknownIds, path, errors) => {
  if (!isStringArray(unknownIds) && !(Array.isArray(unknownIds) && unknownIds.length === 0)) {
    errors.push(`${path}_invalid`);
  }
};

const validateDecisionBlock = (value, path, errors) => {
  const keys = ["status", "statement", "source_ids", "unknown_ids", "decision_impact"];
  if (!exactKeys(value, keys)) {
    errors.push(`${path}_invalid`);
    return;
  }
  if (!DECISION_STATUSES.has(value.status)) errors.push(`${path}_status_invalid`);
  if (!isNonEmptyString(value.statement)) errors.push(`${path}_statement_invalid`);
  if (!isNonEmptyString(value.decision_impact)) errors.push(`${path}_decision_impact_invalid`);
  validateSourceIds(value.source_ids, `${path}_source_ids`, errors);
  validateUnknownIds(value.unknown_ids, `${path}_unknown_ids`, errors);
  if (Array.isArray(value.source_ids)
    && Array.isArray(value.unknown_ids)
    && value.source_ids.length === 0
    && value.unknown_ids.length === 0) {
    errors.push(`${path}_claim_basis_missing`);
  }
};

const validateDecisionOutputs = (outputs, errors) => {
  if (!exactKeys(outputs, Object.keys(M1_DECISION_OUTPUTS))) {
    errors.push("decision_outputs_not_exact_o1_o7");
    return;
  }
  Object.entries(M1_DECISION_OUTPUTS).forEach(([outputId, title]) => {
    const value = outputs[outputId];
    const path = `decision_outputs_${outputId}`;
    const keys = [
      "output_id",
      "title",
      "status",
      "decision",
      "source_ids",
      "unknown_ids",
      "decision_impact",
    ];
    if (!exactKeys(value, keys)) {
      errors.push(`${path}_invalid`);
      return;
    }
    if (value.output_id !== outputId) errors.push(`${path}_id_invalid`);
    if (value.title !== title) errors.push(`${path}_title_invalid`);
    if (!DECISION_STATUSES.has(value.status)) errors.push(`${path}_status_invalid`);
    if (!isNonEmptyString(value.decision)) errors.push(`${path}_decision_invalid`);
    if (!isNonEmptyString(value.decision_impact)) errors.push(`${path}_decision_impact_invalid`);
    validateSourceIds(value.source_ids, `${path}_source_ids`, errors);
    validateUnknownIds(value.unknown_ids, `${path}_unknown_ids`, errors);
    if (Array.isArray(value.source_ids)
      && Array.isArray(value.unknown_ids)
      && value.source_ids.length === 0
      && value.unknown_ids.length === 0) {
      errors.push(`${path}_claim_basis_missing`);
    }
  });
};

const validateArchitectureAlternatives = (alternatives, errors) => {
  if (!Array.isArray(alternatives) || alternatives.length === 0) {
    errors.push("architecture_alternatives_invalid");
    return;
  }
  alternatives.forEach((alternative, index) => {
    const path = `architecture_alternatives_${index}`;
    const keys = [
      "alternative_id",
      "label",
      "fit_status",
      "rationale",
      "source_ids",
      "unknown_ids",
      "decision_impact",
    ];
    if (!exactKeys(alternative, keys)) {
      errors.push(`${path}_invalid`);
      return;
    }
    ["alternative_id", "label", "rationale", "decision_impact"].forEach((field) => {
      if (!isNonEmptyString(alternative[field])) errors.push(`${path}_${field}_invalid`);
    });
    if (!FIT_STATUSES.has(alternative.fit_status)) errors.push(`${path}_fit_status_invalid`);
    validateSourceIds(alternative.source_ids, `${path}_source_ids`, errors);
    validateUnknownIds(alternative.unknown_ids, `${path}_unknown_ids`, errors);
  });
};

const validateRequirementItems = (items, path, errors) => {
  if (!Array.isArray(items)) {
    errors.push(`${path}_invalid`);
    return;
  }
  items.forEach((item, index) => {
    const itemPath = `${path}_${index}`;
    const keys = [
      "requirement_id",
      "statement",
      "priority",
      "status",
      "source_ids",
      "unknown_ids",
      "decision_impact",
    ];
    if (!exactKeys(item, keys)) {
      errors.push(`${itemPath}_invalid`);
      return;
    }
    if (!isNonEmptyString(item.requirement_id)) errors.push(`${itemPath}_id_invalid`);
    if (!isNonEmptyString(item.statement)) errors.push(`${itemPath}_statement_invalid`);
    if (!PRIORITIES.has(item.priority)) errors.push(`${itemPath}_priority_invalid`);
    if (!DECISION_STATUSES.has(item.status)) errors.push(`${itemPath}_status_invalid`);
    if (!isNonEmptyString(item.decision_impact)) errors.push(`${itemPath}_decision_impact_invalid`);
    validateSourceIds(item.source_ids, `${itemPath}_source_ids`, errors);
    validateUnknownIds(item.unknown_ids, `${itemPath}_unknown_ids`, errors);
  });
};

const validateDifferentiators = (items, errors) => {
  if (!Array.isArray(items)) {
    errors.push("differentiators_invalid");
    return;
  }
  items.forEach((item, index) => {
    const path = `differentiators_${index}`;
    const keys = [
      "differentiator_id",
      "statement",
      "benchmark_class",
      "status",
      "source_ids",
      "unknown_ids",
      "decision_impact",
    ];
    if (!exactKeys(item, keys)) {
      errors.push(`${path}_invalid`);
      return;
    }
    ["differentiator_id", "statement", "benchmark_class", "decision_impact"].forEach((field) => {
      if (!isNonEmptyString(item[field])) errors.push(`${path}_${field}_invalid`);
    });
    if (!DECISION_STATUSES.has(item.status)) errors.push(`${path}_status_invalid`);
    validateSourceIds(item.source_ids, `${path}_source_ids`, errors);
    validateUnknownIds(item.unknown_ids, `${path}_unknown_ids`, errors);
  });
};

const validateCriticalMetrics = (items, errors) => {
  if (!Array.isArray(items)) {
    errors.push("critical_metrics_invalid");
    return;
  }
  items.forEach((item, index) => {
    const path = `critical_metrics_${index}`;
    const keys = [
      "metric_id",
      "name",
      "value",
      "unit",
      "status",
      "source_ids",
      "unknown_ids",
      "decision_impact",
    ];
    if (!exactKeys(item, keys)) {
      errors.push(`${path}_invalid`);
      return;
    }
    ["metric_id", "name", "unit", "decision_impact"].forEach((field) => {
      if (!isNonEmptyString(item[field])) errors.push(`${path}_${field}_invalid`);
    });
    if (!(item.value === null || typeof item.value === "number" || isNonEmptyString(item.value))) {
      errors.push(`${path}_value_invalid`);
    }
    if (!DECISION_STATUSES.has(item.status)) errors.push(`${path}_status_invalid`);
    validateSourceIds(item.source_ids, `${path}_source_ids`, errors);
    validateUnknownIds(item.unknown_ids, `${path}_unknown_ids`, errors);
  });
};

const validateTradeoffs = (items, errors) => {
  if (!Array.isArray(items)) {
    errors.push("tradeoffs_invalid");
    return;
  }
  items.forEach((item, index) => {
    const path = `tradeoffs_${index}`;
    const keys = ["tradeoff_id", "benefit", "cost", "decision_impact", "source_ids", "unknown_ids"];
    if (!exactKeys(item, keys)) {
      errors.push(`${path}_invalid`);
      return;
    }
    ["tradeoff_id", "benefit", "cost", "decision_impact"].forEach((field) => {
      if (!isNonEmptyString(item[field])) errors.push(`${path}_${field}_invalid`);
    });
    validateSourceIds(item.source_ids, `${path}_source_ids`, errors);
    validateUnknownIds(item.unknown_ids, `${path}_unknown_ids`, errors);
  });
};

const validateRisks = (items, errors) => {
  if (!Array.isArray(items)) {
    errors.push("risks_invalid");
    return;
  }
  items.forEach((item, index) => {
    const path = `risks_${index}`;
    const keys = [
      "risk_id",
      "risk",
      "likelihood",
      "impact",
      "mitigation",
      "source_ids",
      "unknown_ids",
    ];
    if (!exactKeys(item, keys)) {
      errors.push(`${path}_invalid`);
      return;
    }
    ["risk_id", "risk", "likelihood", "impact", "mitigation"].forEach((field) => {
      if (!isNonEmptyString(item[field])) errors.push(`${path}_${field}_invalid`);
    });
    validateSourceIds(item.source_ids, `${path}_source_ids`, errors);
    validateUnknownIds(item.unknown_ids, `${path}_unknown_ids`, errors);
  });
};

const validateDecisionGates = (items, errors) => {
  if (!Array.isArray(items) || items.length === 0) {
    errors.push("decision_gates_invalid");
    return;
  }
  items.forEach((item, index) => {
    const path = `decision_gates_${index}`;
    const keys = [
      "gate_id",
      "condition",
      "status",
      "blocking_unknown_ids",
      "validation_action",
      "funding_effect",
    ];
    if (!exactKeys(item, keys)) {
      errors.push(`${path}_invalid`);
      return;
    }
    ["gate_id", "condition", "validation_action", "funding_effect"].forEach((field) => {
      if (!isNonEmptyString(item[field])) errors.push(`${path}_${field}_invalid`);
    });
    if (!GATE_STATUSES.has(item.status)) errors.push(`${path}_status_invalid`);
    validateUnknownIds(item.blocking_unknown_ids, `${path}_blocking_unknown_ids`, errors);
  });
};

const validateValidationActions = (items, errors) => {
  if (!Array.isArray(items) || items.length === 0) {
    errors.push("validation_actions_invalid");
    return;
  }
  items.forEach((item, index) => {
    const path = `validation_actions_${index}`;
    const keys = [
      "action_id",
      "action",
      "owner",
      "trigger",
      "evidence_required",
      "resolves_unknown_ids",
    ];
    if (!exactKeys(item, keys)) {
      errors.push(`${path}_invalid`);
      return;
    }
    ["action_id", "action", "owner", "trigger", "evidence_required"].forEach((field) => {
      if (!isNonEmptyString(item[field])) errors.push(`${path}_${field}_invalid`);
    });
    validateUnknownIds(item.resolves_unknown_ids, `${path}_resolves_unknown_ids`, errors);
  });
};

const validateRecommendation = (value, errors) => {
  const keys = ["status", "decision", "rationale", "conditions", "source_ids", "unknown_ids"];
  if (!exactKeys(value, keys)) {
    errors.push("recommendation_invalid");
    return;
  }
  if (!DECISION_STATUSES.has(value.status)) errors.push("recommendation_status_invalid");
  ["decision", "rationale"].forEach((field) => {
    if (!isNonEmptyString(value[field])) errors.push(`recommendation_${field}_invalid`);
  });
  if (!isStringArray(value.conditions) && !(Array.isArray(value.conditions) && value.conditions.length === 0)) {
    errors.push("recommendation_conditions_invalid");
  }
  validateSourceIds(value.source_ids, "recommendation_source_ids", errors);
  validateUnknownIds(value.unknown_ids, "recommendation_unknown_ids", errors);
};

const validateRequiredAction = (value, errors) => {
  const keys = ["action", "owner", "timing", "blocking"];
  if (!exactKeys(value, keys)) {
    errors.push("required_action_invalid");
    return;
  }
  ["action", "owner", "timing"].forEach((field) => {
    if (!isNonEmptyString(value[field])) errors.push(`required_action_${field}_invalid`);
  });
  if (typeof value.blocking !== "boolean") errors.push("required_action_blocking_invalid");
};

const validateFundingBoundary = (value, errors) => {
  const keys = [
    "status",
    "allowed_commitment",
    "prohibited_commitment",
    "release_conditions",
    "unknown_ids",
  ];
  if (!exactKeys(value, keys)) {
    errors.push("funding_boundary_invalid");
    return;
  }
  if (!DECISION_STATUSES.has(value.status)) errors.push("funding_boundary_status_invalid");
  ["allowed_commitment", "prohibited_commitment"].forEach((field) => {
    if (!isNonEmptyString(value[field])) errors.push(`funding_boundary_${field}_invalid`);
  });
  if (!isStringArray(value.release_conditions)
    && !(Array.isArray(value.release_conditions) && value.release_conditions.length === 0)) {
    errors.push("funding_boundary_release_conditions_invalid");
  }
  validateUnknownIds(value.unknown_ids, "funding_boundary_unknown_ids", errors);
};

const validateConfidence = (value, errors) => {
  const keys = ["level", "score", "rationale", "constrained_by_unknown_ids"];
  if (!exactKeys(value, keys)) {
    errors.push("confidence_invalid");
    return;
  }
  if (!CONFIDENCE_LEVELS.has(value.level)) errors.push("confidence_level_invalid");
  if (!(value.score === null
    || (typeof value.score === "number" && value.score >= 0 && value.score <= 1))) {
    errors.push("confidence_score_invalid");
  }
  if (!isNonEmptyString(value.rationale)) errors.push("confidence_rationale_invalid");
  validateUnknownIds(
    value.constrained_by_unknown_ids,
    "confidence_constrained_by_unknown_ids",
    errors,
  );
};

const validateUnresolvedUnknowns = (unknowns, confirmedInput, errors) => {
  if (!Array.isArray(unknowns)) {
    errors.push("unresolved_unknowns_invalid");
    return;
  }
  const seenFields = new Set();
  const seenIds = new Set();
  unknowns.forEach((unknown, index) => {
    const path = `unresolved_unknowns_${index}`;
    const keys = [
      "unknown_id",
      "field",
      "status",
      "description",
      "constrains",
      "decision_impact",
      "required_validation_action",
    ];
    if (!exactKeys(unknown, keys)) {
      errors.push(`${path}_invalid`);
      return;
    }
    ["unknown_id", "field", "description", "decision_impact", "required_validation_action"].forEach(
      (field) => {
        if (!isNonEmptyString(unknown[field])) errors.push(`${path}_${field}_invalid`);
      },
    );
    if (unknown.status !== "UNKNOWN") errors.push(`${path}_status_invalid`);
    if (!isStringArray(unknown.constrains)
      || unknown.constrains.some((constraint) => !UNKNOWN_CONSTRAINTS.has(constraint))) {
      errors.push(`${path}_constrains_invalid`);
    }
    seenFields.add(unknown.field);
    seenIds.add(unknown.unknown_id);
  });

  if (!confirmedInput) return;
  Object.values(confirmedInput.groups).forEach((group) => {
    Object.entries(group.fields).forEach(([field, record]) => {
      const isUnknown = record.confirmed_status === "USER_MARKED_UNKNOWN"
        || record.value === "unknown"
        || (Array.isArray(record.value) && record.value.length === 0
          && record.draft_status === "UNKNOWN");
      if (isUnknown && !seenFields.has(field)) {
        errors.push(`confirmed_unknown_${field}_not_decision_active`);
      }
    });
  });

  return seenIds;
};

const validateNumericProvenance = (value, path, sourceIds, errors) => {
  if (value === null) return;
  const keys = [
    "value",
    "unit",
    "source_type",
    "source_id",
    "derivation",
    "denominator",
    "exclusions",
  ];
  if (!exactKeys(value, keys)) {
    errors.push(`${path}_invalid`);
    return;
  }
  if (!(typeof value.value === "number" || isNonEmptyString(value.value))) {
    errors.push(`${path}_value_invalid`);
  }
  ["unit", "source_type", "source_id", "derivation", "denominator"].forEach((field) => {
    if (!isNonEmptyString(value[field])) errors.push(`${path}_${field}_invalid`);
  });
  if (!isStringArray(value.exclusions)
    && !(Array.isArray(value.exclusions) && value.exclusions.length === 0)) {
    errors.push(`${path}_exclusions_invalid`);
  }
  if (!SOURCE_IDS.has(value.source_id)) errors.push(`${path}_source_outside_evidence_boundary`);
  if (!Array.isArray(sourceIds) || !sourceIds.includes(value.source_id)) {
    errors.push(`${path}_source_not_in_claim_sources`);
  }
};

const validateClaimCandidates = (claims, errors) => {
  if (!Array.isArray(claims) || claims.length === 0) {
    errors.push("claim_candidates_invalid");
    return;
  }
  const seenClaimIds = new Set();
  claims.forEach((claim, index) => {
    const path = `claim_candidates_${index}`;
    const keys = [
      "claim_id",
      "statement",
      "value",
      "claim_type",
      "proposed_class",
      "source_ids",
      "scope",
      "numeric_provenance",
      "reasoning_bridge",
      "uncertainty",
      "decision_impact",
    ];
    if (!exactKeys(claim, keys)) {
      errors.push(`${path}_invalid`);
      return;
    }
    if (!isNonEmptyString(claim.claim_id)) errors.push(`${path}_claim_id_invalid`);
    if (seenClaimIds.has(claim.claim_id)) errors.push(`${path}_claim_id_duplicate`);
    seenClaimIds.add(claim.claim_id);
    if (!isNonEmptyString(claim.statement) && claim.value === null) {
      errors.push(`${path}_statement_or_value_required`);
    }
    if (!(claim.value === null
      || typeof claim.value === "number"
      || typeof claim.value === "boolean"
      || isNonEmptyString(claim.value))) {
      errors.push(`${path}_value_invalid`);
    }
    if (!CLAIM_TYPES.has(claim.claim_type)) errors.push(`${path}_claim_type_invalid`);
    if (!CLAIM_CLASSES.has(claim.proposed_class)) errors.push(`${path}_proposed_class_invalid`);
    validateSourceIds(claim.source_ids, `${path}_source_ids`, errors);
    if (!exactKeys(claim.scope, ["product", "application", "customer", "region", "time"])) {
      errors.push(`${path}_scope_invalid`);
    } else {
      Object.entries(claim.scope).forEach(([field, value]) => {
        if (!isNonEmptyString(value)) errors.push(`${path}_scope_${field}_invalid`);
      });
    }
    if (!isNonEmptyString(claim.reasoning_bridge)) errors.push(`${path}_reasoning_bridge_invalid`);
    if (!isNonEmptyString(claim.uncertainty)) errors.push(`${path}_uncertainty_invalid`);
    if (!isNonEmptyString(claim.decision_impact)) errors.push(`${path}_decision_impact_invalid`);
    if (claim.proposed_class === "UNKNOWN"
      && Array.isArray(claim.source_ids)
      && claim.source_ids.length > 0) {
      errors.push(`${path}_unknown_must_not_claim_sources`);
    }
    if (claim.proposed_class !== "UNKNOWN"
      && (!Array.isArray(claim.source_ids) || claim.source_ids.length === 0)) {
      errors.push(`${path}_source_required`);
    }
    validateNumericProvenance(
      claim.numeric_provenance,
      `${path}_numeric_provenance`,
      claim.source_ids,
      errors,
    );
  });
};

export const validateM1DecisionState = (
  decisionState,
  { confirmedInput, inputHash } = {},
) => {
  const errors = [];
  if (!exactKeys(decisionState, TOP_LEVEL_KEYS)) {
    return { ok: false, errors: ["decision_state_keys_not_exact"] };
  }
  if (decisionState.schema_version !== M1_DECISION_STATE_SCHEMA_VERSION) {
    errors.push("decision_state_schema_version_invalid");
  }
  if (!isNonEmptyString(decisionState.decision_id)) errors.push("decision_id_invalid");

  const bindingKeys = [
    "confirmed_input_id",
    "confirmed_input_schema_version",
    "confirmed_input_hash",
  ];
  if (!exactKeys(decisionState.binding, bindingKeys)) {
    errors.push("binding_invalid");
  } else {
    if (decisionState.binding.confirmed_input_schema_version !== M1_CONFIRMED_INPUT_SCHEMA_VERSION) {
      errors.push("binding_schema_version_invalid");
    }
    if (!/^[a-f0-9]{64}$/.test(decisionState.binding.confirmed_input_hash)) {
      errors.push("binding_hash_invalid");
    }
  }

  const snapshotValidation = validateM1ConfirmedInput(decisionState.confirmed_input);
  if (!snapshotValidation.ok) {
    errors.push(...snapshotValidation.errors.map((error) => `confirmed_input_${error}`));
  }
  if (confirmedInput && !sameValue(decisionState.confirmed_input, confirmedInput)) {
    errors.push("confirmed_input_overwrite_attempt");
  }
  if (confirmedInput
    && decisionState.binding?.confirmed_input_id !== confirmedInput.confirmed_input_id) {
    errors.push("binding_confirmed_input_id_mismatch");
  }
  if (inputHash && decisionState.binding?.confirmed_input_hash !== inputHash) {
    errors.push("binding_confirmed_input_hash_mismatch");
  }

  if (!exactKeys(decisionState.method, ["method_version", "outputs"])) {
    errors.push("method_invalid");
  } else {
    if (decisionState.method.method_version !== M1_DECISION_METHOD_VERSION) {
      errors.push("method_version_invalid");
    }
    if (!sameValue(decisionState.method.outputs, Object.keys(M1_DECISION_OUTPUTS))) {
      errors.push("method_outputs_invalid");
    }
  }

  if (!exactKeys(decisionState.evidence_boundary, ["mode", "source_ids"])) {
    errors.push("evidence_boundary_invalid");
  } else {
    if (decisionState.evidence_boundary.mode !== "FROZEN_SEVEN_SOURCE") {
      errors.push("evidence_boundary_mode_invalid");
    }
    if (!sameValue(decisionState.evidence_boundary.source_ids, M1_EVIDENCE_SOURCE_IDS)) {
      errors.push("evidence_boundary_source_ids_invalid");
    }
  }

  [
    "product_boundary",
    "protected_load_boundary",
    "system_boundary",
    "application_fit",
    "no_fit_boundary",
  ].forEach((field) => validateDecisionBlock(decisionState[field], field, errors));
  validateArchitectureAlternatives(decisionState.architecture_alternatives, errors);
  validateDecisionOutputs(decisionState.decision_outputs, errors);
  validateRequirementItems(decisionState.customer_requirements, "customer_requirements", errors);
  validateRequirementItems(decisionState.product_requirements, "product_requirements", errors);
  validateDifferentiators(decisionState.differentiators, errors);
  validateCriticalMetrics(decisionState.critical_metrics, errors);
  validateTradeoffs(decisionState.tradeoffs, errors);
  validateRisks(decisionState.risks, errors);
  validateDecisionGates(decisionState.decision_gates, errors);
  validateValidationActions(decisionState.validation_actions, errors);
  validateRecommendation(decisionState.recommendation, errors);
  validateRequiredAction(decisionState.required_action, errors);
  validateFundingBoundary(decisionState.funding_boundary, errors);
  validateConfidence(decisionState.confidence, errors);
  validateUnresolvedUnknowns(decisionState.unresolved_unknowns, confirmedInput, errors);
  validateClaimCandidates(decisionState.claim_candidates, errors);

  return { ok: errors.length === 0, errors };
};
