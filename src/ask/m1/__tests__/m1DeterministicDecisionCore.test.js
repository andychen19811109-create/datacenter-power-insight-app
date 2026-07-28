import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

import { validateM1DecisionState } from "../contracts/m1DecisionState.js";
import {
  hashM1EvidenceSnapshot,
  validateM1EvidenceSnapshot,
} from "../contracts/m1EvidenceSnapshot.js";
import {
  hashM1ConfirmedInput,
} from "../m1DecisionCore.js";
import { runM1DecisionEvidenceGuard } from "../m1DecisionEvidenceContext.js";
import * as publicPackage from "../deterministic/index.js";
import {
  certifiedArtifactSummary,
  validateContractSchemaArtifacts,
  validateDecisionPolicyStructure,
  validatePolicyAndTemplates,
  validateSnapshotAndPolicyAuthority,
} from "../deterministic/internal/artifacts.js";
import { buildDeterministicDecisionState } from "../deterministic/internal/builder.js";
import { M1ReleaseError, clone, reject } from "../deterministic/internal/errors.js";
import {
  validateAndExtractConfirmedInput,
} from "../deterministic/internal/input.js";
import {
  assertReleasedBinding,
  qualityGateEmptyArrayFields,
  runProductDecisionQualityGate,
} from "../deterministic/internal/qualityGate.js";
import {
  assertEvidenceAnnotationApplicable,
  selectDeterministicEvidence,
} from "../deterministic/internal/selection.js";

const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"),
);
const CONFIRMED = readJson(
  "../deterministic/test-fixtures/M1_DIFY_S1_CONFIRMED_INPUT_CANONICAL.json",
);
const SNAPSHOT = readJson("../evidence/m1OfficialEvidenceWave1.v0.2.json");
const POLICY = readJson("../deterministic/policy/m1.decision-policy.wave1.v0.2.json");
const TEMPLATES = readJson("../deterministic/policy/m1.template-catalog.v1.v0.2.json");
const OLD_STATE = readJson(
  "../deterministic/test-fixtures/M1_DIFY_S1_RAW_DECISION_STATE_v0.1.json",
);

const baseArgs = () => {
  const confirmedInput = clone(CONFIRMED);
  const evidenceSnapshot = clone(SNAPSHOT);
  return {
    confirmedInput,
    confirmedInputHash: hashM1ConfirmedInput(confirmedInput),
    evidenceSnapshot,
    evidenceSnapshotHash: hashM1EvidenceSnapshot(evidenceSnapshot),
    decisionPolicy: clone(POLICY),
    templateCatalog: clone(TEMPLATES),
  };
};

const expectRejected = (result, errorCode, violationCode) => {
  assert.equal(result.schema_version, "m1.release-result.v1");
  assert.equal(result.status, "REJECTED");
  assert.equal(result.error.release_allowed, false);
  assert.equal(result.error.error_code, errorCode);
  if (violationCode) assert.ok(result.error.violation_codes.includes(violationCode));
  assert.equal(Object.hasOwn(result, "decision_state"), false);
};

const captureInternal = (operation) => {
  try {
    operation();
  } catch (error) {
    assert.ok(error instanceof M1ReleaseError);
    return reject(error.code, error);
  }
  assert.fail("expected fail-closed rejection");
};

const prepareQualityHarness = (args = baseArgs()) => {
  const artifactValidation = validatePolicyAndTemplates(args);
  const recomputedConfirmedInputHash = hashM1ConfirmedInput(args.confirmedInput);
  const extractedInput = validateAndExtractConfirmedInput({
    confirmedInput: args.confirmedInput,
    confirmedInputHash: args.confirmedInputHash,
    recomputedConfirmedInputHash,
    decisionPolicy: args.decisionPolicy,
  });
  const recomputedSnapshotHash = hashM1EvidenceSnapshot(args.evidenceSnapshot);
  const snapshotIndexes = validateSnapshotAndPolicyAuthority({
    evidenceSnapshot: args.evidenceSnapshot,
    evidenceSnapshotHash: args.evidenceSnapshotHash,
    recomputedSnapshotHash,
    decisionPolicy: args.decisionPolicy,
  });
  const selection = selectDeterministicEvidence({
    confirmedAlternatives: extractedInput.confirmedAlternatives,
    decisionPolicy: args.decisionPolicy,
    snapshotIndexes,
  });
  const decisionState = buildDeterministicDecisionState({
    confirmedInput: args.confirmedInput,
    confirmedInputHash: recomputedConfirmedInputHash,
    decisionPolicy: args.decisionPolicy,
    templates: artifactValidation.templates,
    extractedInput,
    selection,
  });
  return {
    args,
    decisionState,
    extractedInput,
    selection,
    templates: artifactValidation.templates,
  };
};

const qualityReject = (mutate, expectedCode, mutateHarness = () => {}) => {
  const harness = prepareQualityHarness();
  const decisionState = clone(harness.decisionState);
  mutateHarness(harness);
  mutate(decisionState, harness);
  const result = captureInternal(() => runProductDecisionQualityGate({
    decisionState,
    confirmedInput: harness.args.confirmedInput,
    decisionPolicy: harness.args.decisionPolicy,
    templates: harness.templates,
    selection: harness.selection,
    extractedInput: harness.extractedInput,
  }));
  expectRejected(result, expectedCode);
};

test("[P01] four Contract Schemas and Policy/Template instances validate", () => {
  assert.deepEqual(validateContractSchemaArtifacts(), []);
  assert.equal(validatePolicyAndTemplates(baseArgs()).requiredBindingCount, 65);
});

test("[P02] 65/65 Template bindings resolve exactly once", () => {
  const validation = validatePolicyAndTemplates(baseArgs());
  assert.equal(validation.templates.size, 65);
  assert.equal(certifiedArtifactSummary.templateBindingCount, 65);
});

test("[P03] 16/16 Evidence annotations resolve to the certified Snapshot", () => {
  const args = baseArgs();
  const indexes = validateSnapshotAndPolicyAuthority({
    evidenceSnapshot: args.evidenceSnapshot,
    evidenceSnapshotHash: args.evidenceSnapshotHash,
    recomputedSnapshotHash: hashM1EvidenceSnapshot(args.evidenceSnapshot),
    decisionPolicy: args.decisionPolicy,
  });
  assert.equal(args.decisionPolicy.evidence_annotations.length, 16);
  assert.equal(args.decisionPolicy.evidence_annotations.every(({ evidence_unit_id: id }) => (
    indexes.units.has(id)
  )), true);
});

test("[P04] 3/3 Source authority assertions match exactly", () => {
  const args = baseArgs();
  assert.doesNotThrow(() => validateSnapshotAndPolicyAuthority({
    evidenceSnapshot: args.evidenceSnapshot,
    evidenceSnapshotHash: args.evidenceSnapshotHash,
    recomputedSnapshotHash: hashM1EvidenceSnapshot(args.evidenceSnapshot),
    decisionPolicy: args.decisionPolicy,
  }));
  assert.equal(args.decisionPolicy.source_authority_assertions.length, 3);
});

test("[P05] S1 Confirmed Input identity and canonical hash pass", () => {
  const args = baseArgs();
  assert.equal(args.confirmedInput.confirmed_input_id, "confirmed_m1_core_fixture");
  assert.equal(args.confirmedInputHash, hashM1ConfirmedInput(args.confirmedInput));
});

test("[P06] S1 Evidence Snapshot identity and canonical hash pass", () => {
  const args = baseArgs();
  assert.deepEqual(validateM1EvidenceSnapshot(args.evidenceSnapshot), { ok: true, errors: [] });
  assert.equal(
    args.evidenceSnapshot.evidence_snapshot_id,
    "m1_wave1_official_evidence_authorized_20260726_v02",
  );
  assert.equal(args.evidenceSnapshotHash, POLICY.certified_snapshot.sha256);
});

test("[P07] S1 Release Gateway returns RELEASED", () => {
  assert.equal(publicPackage.runM1DecisionReleaseGateway(baseArgs()).status, "RELEASED");
});

test("[P08] frozen Decision State Validator passes", () => {
  const args = baseArgs();
  const result = publicPackage.runM1DecisionReleaseGateway(args);
  assert.deepEqual(validateM1DecisionState(result.decision_state, {
    confirmedInput: args.confirmedInput,
    inputHash: args.confirmedInputHash,
  }), { ok: true, errors: [] });
});

test("[P09] frozen Evidence Guard passes with zero violations", () => {
  const args = baseArgs();
  const result = publicPackage.runM1DecisionReleaseGateway(args);
  const guard = runM1DecisionEvidenceGuard({
    confirmedInput: args.confirmedInput,
    decisionState: result.decision_state,
    evidenceSnapshot: args.evidenceSnapshot,
    evidenceSnapshotId: args.evidenceSnapshot.evidence_snapshot_id,
    evidenceSnapshotSchemaVersion: args.evidenceSnapshot.schema_version,
    evidenceSnapshotHash: args.evidenceSnapshotHash,
  });
  assert.equal(guard.ok, true);
  assert.deepEqual(guard.binding.violations, []);
});

test("[P10] Product Decision Quality Gate passes", () => {
  const harness = prepareQualityHarness();
  assert.deepEqual(runProductDecisionQualityGate({
    decisionState: harness.decisionState,
    confirmedInput: harness.args.confirmedInput,
    decisionPolicy: harness.args.decisionPolicy,
    templates: harness.templates,
    selection: harness.selection,
    extractedInput: harness.extractedInput,
  }), { ok: true, violations: [] });
  const state = harness.decisionState;
  assert.equal(Object.values(state.decision_outputs).every(({ source_ids: ids }) => (
    ids.length === 0
  )), true);
  assert.deepEqual(state.recommendation.source_ids, []);
  ["product_boundary", "system_boundary", "no_fit_boundary"].forEach((field) => {
    assert.deepEqual(state[field].source_ids, []);
  });
  harness.selection.selections.forEach((selected, index) => {
    const allowed = [...new Set(selected.evidence
      .filter(({ annotation }) => (
        annotation.allowed_output_slots.includes("ARCHITECTURE_ALTERNATIVE")
      ))
      .map(({ source }) => source.source_id))];
    assert.deepEqual(state.architecture_alternatives[index].source_ids, allowed);
  });
  const applicationSources = [...new Set(harness.selection.selectedEvidence
    .filter(({ annotation }) => annotation.allowed_output_slots.includes("APPLICATION_FIT"))
    .map(({ source }) => source.source_id))];
  assert.deepEqual(state.application_fit.source_ids, applicationSources);
  assert.deepEqual(state.protected_load_boundary.source_ids, applicationSources);
});

test("[P11] exactly two confirmed Alternatives are represented", () => {
  const state = publicPackage.runM1DecisionReleaseGateway(baseArgs()).decision_state;
  assert.deepEqual(
    state.architecture_alternatives.map(({ label }) => label),
    ["UPS", "800VDC"],
  );
});

test("[P12] exactly two USER_MARKED_UNKNOWN fields are represented", () => {
  const state = publicPackage.runM1DecisionReleaseGateway(baseArgs()).decision_state;
  assert.deepEqual(
    state.unresolved_unknowns.map(({ field }) => field).sort(),
    ["critical_constraints", "target_timing"],
  );
});

test("[P13] aggregate Unknown index exactly equals extracted Unknown set", () => {
  const state = publicPackage.runM1DecisionReleaseGateway(baseArgs()).decision_state;
  assert.deepEqual(
    state.unresolved_unknowns.map(({ field }) => field).sort(),
    CONFIRMED.groups.constraints_unknowns.fields.unknowns.value.slice().sort(),
  );
});

test("[P14] six high-risk arrays are exact empty arrays", () => {
  const state = publicPackage.runM1DecisionReleaseGateway(baseArgs()).decision_state;
  assert.equal(qualityGateEmptyArrayFields.length, 6);
  qualityGateEmptyArrayFields.forEach((field) => assert.deepEqual(state[field], []));
});

test("[P15] every selected numeric Evidence Unit is one exact Claim", () => {
  const harness = prepareQualityHarness();
  const numericEvidence = harness.selection.selectedEvidence.filter(({ unit }) => (
    unit.numeric_provenance !== null
  ));
  const state = publicPackage.runM1DecisionReleaseGateway(baseArgs()).decision_state;
  numericEvidence.forEach(({ unit }) => {
    const claim = state.claim_candidates.find(({ claim_id: id }) => (
      id === `CLAIM_${unit.evidence_unit_id}`
    ));
    assert.equal(claim.value, unit.numeric_provenance.value);
    assert.deepEqual(claim.numeric_provenance, unit.numeric_provenance);
  });
});

test("[P16] every selected nonnumeric Evidence Unit has null value/provenance", () => {
  const harness = prepareQualityHarness();
  const state = publicPackage.runM1DecisionReleaseGateway(baseArgs()).decision_state;
  harness.selection.selectedEvidence
    .filter(({ unit }) => unit.numeric_provenance === null)
    .forEach(({ unit }) => {
      const claim = state.claim_candidates.find(({ claim_id: id }) => (
        id === `CLAIM_${unit.evidence_unit_id}`
      ));
      assert.equal(claim.value, null);
      assert.equal(claim.numeric_provenance, null);
    });
});

test("[P17] RELEASED envelope contains complete audit identity", () => {
  const result = publicPackage.runM1DecisionReleaseGateway(baseArgs());
  assert.deepEqual(Object.keys(result.binding).sort(), [
    "builder_version",
    "confirmed_input_hash",
    "confirmed_input_id",
    "confirmed_input_schema_version",
    "policy_version",
    "snapshot_hash",
    "template_catalog_version",
  ]);
});

test("[P18] public package exports Release Gateway only", () => {
  assert.deepEqual(Object.keys(publicPackage), ["runM1DecisionReleaseGateway"]);
});

test("[P19] old bare S1 Decision State is rejected", () => {
  expectRejected(publicPackage.runM1DecisionReleaseGateway(clone(OLD_STATE)), "BARE_DECISION_STATE_FORBIDDEN");
});

test("[P20] deterministic package has no UI, Provider, network, or dependency import", () => {
  const root = new URL("../deterministic/", import.meta.url);
  const files = [
    "index.js",
    "runM1DecisionReleaseGateway.js",
    "internal/artifacts.js",
    "internal/builder.js",
    "internal/errors.js",
    "internal/input.js",
    "internal/qualityGate.js",
    "internal/schemaValidation.js",
    "internal/selection.js",
  ];
  const source = files.map((file) => fs.readFileSync(new URL(file, root), "utf8")).join("\n");
  assert.doesNotMatch(source, /App\.jsx|Renderer|fetch\(|Dify|Provider/);
  assert.doesNotMatch(source, /from\s+["'][^"']*(react|recharts|lucide)/);
});

test("[A01] Unknown Evidence Unit rejects EVIDENCE_UNIT_NOT_FOUND", () => {
  const args = baseArgs();
  args.decisionPolicy.evidence_annotations[0].evidence_unit_id = "UNKNOWN_EU";
  const result = captureInternal(() => validateSnapshotAndPolicyAuthority({
    evidenceSnapshot: args.evidenceSnapshot,
    evidenceSnapshotHash: args.evidenceSnapshotHash,
    recomputedSnapshotHash: hashM1EvidenceSnapshot(args.evidenceSnapshot),
    decisionPolicy: args.decisionPolicy,
  }));
  expectRejected(result, "EVIDENCE_UNIT_NOT_FOUND");
});

test("[A02] Unknown Source rejects EVIDENCE_SOURCE_NOT_FOUND", () => {
  const args = baseArgs();
  args.decisionPolicy.evidence_annotations[0].source_id = "OCP_MT_DIABLO";
  const result = captureInternal(() => validateSnapshotAndPolicyAuthority({
    evidenceSnapshot: args.evidenceSnapshot,
    evidenceSnapshotHash: args.evidenceSnapshotHash,
    recomputedSnapshotHash: hashM1EvidenceSnapshot(args.evidenceSnapshot),
    decisionPolicy: args.decisionPolicy,
  }));
  expectRejected(result, "EVIDENCE_SOURCE_NOT_FOUND");
});

test("[A03] cross-category Evidence rejects EVIDENCE_CATEGORY_MISMATCH", () => {
  const annotation = clone(POLICY.evidence_annotations[0]);
  const mapping = clone(POLICY.product_mappings[0]);
  const result = captureInternal(() => assertEvidenceAnnotationApplicable({
    annotation,
    mapping,
    alternativeValue: mapping.input_value,
  }));
  expectRejected(result, "EVIDENCE_CATEGORY_MISMATCH");
});

test("[A04] cross-architecture Evidence rejects EVIDENCE_ARCHITECTURE_MISMATCH", () => {
  const annotation = clone(POLICY.evidence_annotations[0]);
  const mapping = { ...clone(POLICY.product_mappings[1]), architecture_family: "FACILITY_HVDC_DISTRIBUTION" };
  const result = captureInternal(() => assertEvidenceAnnotationApplicable({
    annotation,
    mapping,
    alternativeValue: mapping.input_value,
  }));
  expectRejected(result, "EVIDENCE_ARCHITECTURE_MISMATCH");
});

test("[A05] generic UPS cannot select named-only feature", () => {
  const annotation = clone(POLICY.evidence_annotations.find(({ evidence_unit_id: id }) => (
    id === "VERTIV_EU_003"
  )));
  const mapping = clone(POLICY.product_mappings.find(({ input_value: value }) => value === "UPS"));
  const result = captureInternal(() => assertEvidenceAnnotationApplicable({
    annotation,
    mapping,
    alternativeValue: "UPS",
  }));
  expectRejected(result, "EVIDENCE_ARCHITECTURE_MISMATCH");
});

test("[A06] Evidence in forbidden output slot rejects", () => {
  const annotation = clone(POLICY.evidence_annotations[0]);
  const mapping = clone(POLICY.product_mappings[1]);
  const result = captureInternal(() => assertEvidenceAnnotationApplicable({
    annotation,
    mapping,
    alternativeValue: mapping.input_value,
    outputSlot: "RISK",
  }));
  expectRejected(result, "EVIDENCE_OUTPUT_SLOT_FORBIDDEN");
});

test("[A07] omitted confirmed Alternative rejects BUILDER_OUTPUT_INVALID", () => {
  qualityReject((state) => state.architecture_alternatives.pop(), "BUILDER_OUTPUT_INVALID");
});

test("[A08] fabricated Alternative rejects UNSUPPORTED_ALTERNATIVE", () => {
  const args = baseArgs();
  args.confirmedInput.groups.product_architecture.fields.architecture_alternatives.value.push("FABRICATED");
  args.confirmedInputHash = hashM1ConfirmedInput(args.confirmedInput);
  expectRejected(publicPackage.runM1DecisionReleaseGateway(args), "UNSUPPORTED_ALTERNATIVE");
});

test("[A09] omitted USER_MARKED_UNKNOWN rejects UNKNOWN_FIELD_MISSING", () => {
  qualityReject((state) => state.unresolved_unknowns.pop(), "UNKNOWN_FIELD_MISSING");
});

test("[A10] fabricated Unknown rejects UNKNOWN_FIELD_FABRICATED", () => {
  qualityReject((state) => {
    state.unresolved_unknowns.push({
      ...clone(state.unresolved_unknowns[0]),
      field: "fabricated_unknown",
      unknown_id: "UNK_FABRICATED",
    });
  }, "UNKNOWN_FIELD_FABRICATED");
});

test("[A11] aggregate Unknown index mismatch rejects UNKNOWN_INDEX_MISMATCH", () => {
  const args = baseArgs();
  args.confirmedInput.groups.constraints_unknowns.fields.unknowns.value.pop();
  args.confirmedInputHash = hashM1ConfirmedInput(args.confirmedInput);
  expectRejected(publicPackage.runM1DecisionReleaseGateway(args), "UNKNOWN_INDEX_MISMATCH");
});

test("[A12] USER_CONFIRMED empty array is not treated as Unknown", () => {
  const args = baseArgs();
  args.confirmedInput.groups.constraints_unknowns.fields.critical_constraints.confirmed_status = "USER_CONFIRMED";
  args.confirmedInputHash = hashM1ConfirmedInput(args.confirmedInput);
  expectRejected(publicPackage.runM1DecisionReleaseGateway(args), "UNKNOWN_INDEX_MISMATCH");
});

test("[A13] Unknown timing cannot become Immediate", () => {
  qualityReject((state) => {
    state.required_action.timing = "Immediate";
  }, "BLOCKING_UNKNOWN_CONFLICT");
});

test("[A14] blocking Unknown cannot permit final commitment", () => {
  qualityReject((state) => {
    state.funding_boundary.allowed_commitment = "Final procurement.";
  }, "COMMITMENT_LEVEL_CONFLICT");
});

test("[A15] numeric Claims cannot be merged or reconstructed", () => {
  qualityReject((state) => {
    const index = state.claim_candidates.findIndex(({ claim_id: id }) => id === "CLAIM_SCHNEIDER_EU_001B");
    state.claim_candidates.splice(index, 1);
  }, "NUMERIC_AGGREGATION_FORBIDDEN");
});

test("[A16] Claim value/provenance mismatch rejects NUMERIC_COPY_VIOLATION", () => {
  qualityReject((state) => {
    const claim = state.claim_candidates.find(({ numeric_provenance: provenance }) => provenance);
    claim.value = Number(claim.value) + 1;
  }, "NUMERIC_COPY_VIOLATION");
});

test("[A17] changed Evidence statement rejects STATEMENT_COPY_VIOLATION", () => {
  qualityReject((state) => {
    state.claim_candidates.find(({ proposed_class: value }) => value === "SOURCE_BACKED").statement += " changed";
  }, "STATEMENT_COPY_VIOLATION");
});

test("[A18] decorative Source rejects evidence binding", () => {
  qualityReject((state) => {
    state.claim_candidates.find(({ proposed_class: value }) => value === "SOURCE_BACKED")
      .source_ids.push("OCP_MT_DIABLO");
  }, "EVIDENCE_SOURCE_NOT_FOUND");
});

test("[A19] Product Evidence cannot become System/Site fit", () => {
  qualityReject((state) => {
    const claim = state.claim_candidates.find(({ claim_id: id }) => id === "CLAIM_SCHNEIDER_EU_001A");
    claim.scope.customer = "CUSTOMER_X";
  }, "EVIDENCE_SCOPE_ESCALATION");
});

test("[A20] vendor technical Evidence cannot become market/regulatory fact", () => {
  qualityReject(() => {}, "EVIDENCE_SCOPE_ESCALATION", (harness) => {
    harness.selection.selectedEvidence[0].annotation.evidence_domain = "MARKET";
  });
});

test("[A21] vendor feature cannot become universal requirement", () => {
  qualityReject((state) => state.customer_requirements.push({}), "QUALITY_GATE_REJECTED");
});

test("[A22] invented tradeoff or risk rejects QUALITY_GATE_REJECTED", () => {
  qualityReject((state) => state.tradeoffs.push({}), "QUALITY_GATE_REJECTED");
});

test("[A23] market-complete/deployment conclusion rejects QUALITY_GATE_REJECTED", () => {
  qualityReject((state) => {
    state.decision_outputs.O6.decision = "Market complete and ready for deployment.";
  }, "QUALITY_GATE_REJECTED");
});

test("[A24] customer fit without site Evidence rejects scope escalation", () => {
  qualityReject((state) => {
    const claim = state.claim_candidates.find(({ proposed_class: value }) => value === "SOURCE_BACKED");
    claim.scope.customer = "CUSTOMER_X";
  }, "EVIDENCE_SCOPE_ESCALATION");
});

test("[A25] Source authority metadata drift rejects SOURCE_AUTHORITY_MISMATCH", () => {
  const args = baseArgs();
  args.evidenceSnapshot.sources[0].publisher = "DRIFTED";
  args.evidenceSnapshotHash = hashM1EvidenceSnapshot(args.evidenceSnapshot);
  args.decisionPolicy.certified_snapshot.sha256 = args.evidenceSnapshotHash;
  const result = captureInternal(() => validateSnapshotAndPolicyAuthority({
    evidenceSnapshot: args.evidenceSnapshot,
    evidenceSnapshotHash: args.evidenceSnapshotHash,
    recomputedSnapshotHash: args.evidenceSnapshotHash,
    decisionPolicy: args.decisionPolicy,
  }));
  expectRejected(result, "SOURCE_AUTHORITY_MISMATCH");
});

test("[A26] uncovered required Template field rejects TEMPLATE_COVERAGE_INCOMPLETE", () => {
  const args = baseArgs();
  delete args.decisionPolicy.template_bindings.O7_IMPACT;
  expectRejected(publicPackage.runM1DecisionReleaseGateway(args), "TEMPLATE_COVERAGE_INCOMPLETE");
});

test("[A27] mutated or parameterized Template rejects TEMPLATE_POLICY_MISMATCH", () => {
  const args = baseArgs();
  args.templateCatalog.templates[0].text += " changed";
  expectRejected(publicPackage.runM1DecisionReleaseGateway(args), "TEMPLATE_POLICY_MISMATCH");
});

test("[A28] version tuple mismatches return matching version errors", () => {
  const policyArgs = baseArgs();
  policyArgs.decisionPolicy.policy_version = "m1-decision-policy.v9";
  expectRejected(publicPackage.runM1DecisionReleaseGateway(policyArgs), "POLICY_VERSION_MISMATCH");

  const builderArgs = baseArgs();
  builderArgs.decisionPolicy.compatible_builder_version = "m1-deterministic-builder.v9";
  expectRejected(publicPackage.runM1DecisionReleaseGateway(builderArgs), "BUILDER_VERSION_MISMATCH");

  const templateArgs = baseArgs();
  templateArgs.decisionPolicy.template_catalog_version = "m1-template-catalog.v9";
  expectRejected(publicPackage.runM1DecisionReleaseGateway(templateArgs), "TEMPLATE_VERSION_MISMATCH");

  const snapshotArgs = baseArgs();
  snapshotArgs.decisionPolicy.certified_snapshot.schema_version = "m1.evidence-snapshot.v9";
  expectRejected(publicPackage.runM1DecisionReleaseGateway(snapshotArgs), "POLICY_SCHEMA_INVALID");
});

test("[A29] Snapshot byte/content change rejects SNAPSHOT_HASH_MISMATCH", () => {
  const args = baseArgs();
  args.evidenceSnapshot.sources[0].evidence_units[0].statement += " changed";
  expectRejected(publicPackage.runM1DecisionReleaseGateway(args), "SNAPSHOT_HASH_MISMATCH");
});

test("[A30] mapped but unsupported HVDC, BBU, and CDU fail closed without state", () => {
  ["HVDC", "BBU", "CDU"].forEach((alternative) => {
    const args = baseArgs();
    args.confirmedInput.groups.product_architecture.fields.architecture_alternatives.value = [alternative];
    args.confirmedInputHash = hashM1ConfirmedInput(args.confirmedInput);
    expectRejected(publicPackage.runM1DecisionReleaseGateway(args), "UNSUPPORTED_COMBINATION");
  });
});

test("[A31] bare Decision State export is forbidden", () => {
  expectRejected(publicPackage.runM1DecisionReleaseGateway(clone(OLD_STATE)), "BARE_DECISION_STATE_FORBIDDEN");
});

test("[A32] consumer bare-state input is forbidden", () => {
  expectRejected(
    publicPackage.runM1DecisionReleaseGateway({ decisionState: clone(OLD_STATE) }),
    "BARE_DECISION_STATE_FORBIDDEN",
  );
});

test("[A33] public skip flags are ignored and normal Gates still reject", () => {
  const args = baseArgs();
  args.skipGuard = true;
  args.skipQualityGate = true;
  args.evidenceSnapshot.sources[0].evidence_units[0].statement += " changed";
  expectRejected(publicPackage.runM1DecisionReleaseGateway(args), "SNAPSHOT_HASH_MISMATCH");
});

test("[A34] cached or manually repaired result cannot be released", () => {
  const args = baseArgs();
  args.cachedResult = { status: "RELEASED" };
  expectRejected(publicPackage.runM1DecisionReleaseGateway(args), "RELEASE_GATEWAY_INTERNAL_ERROR");
});

test("[A35] RELEASED audit binding cannot omit Confirmed Input identity", () => {
  const result = captureInternal(() => assertReleasedBinding({
    status: "RELEASED",
    binding: {
      policy_version: POLICY.policy_version,
    },
  }, {
    confirmed_input_id: CONFIRMED.confirmed_input_id,
  }));
  expectRejected(result, "CONFIRMED_INPUT_BINDING_MISMATCH");
});

test("[A36] Core has no S1 identity, expected-answer, vendor branch, or runtime fixture import", () => {
  const syntheticPolicyArgs = baseArgs();
  syntheticPolicyArgs.decisionPolicy.policy_id = "SYNTHETIC_POLICY_DIFFERENT_ID";
  assert.deepEqual(
    validateDecisionPolicyStructure(syntheticPolicyArgs.decisionPolicy),
    [],
  );
  expectRejected(
    publicPackage.runM1DecisionReleaseGateway(syntheticPolicyArgs),
    "POLICY_SCHEMA_INVALID",
    "policy_artifact_not_certified",
  );

  const root = new URL("../deterministic/", import.meta.url);
  const runtimeFiles = [
    "index.js",
    "runM1DecisionReleaseGateway.js",
    "internal/artifacts.js",
    "internal/builder.js",
    "internal/errors.js",
    "internal/input.js",
    "internal/qualityGate.js",
    "internal/schemaValidation.js",
    "internal/selection.js",
  ];
  const source = runtimeFiles
    .map((file) => fs.readFileSync(new URL(file, root), "utf8"))
    .join("\n");
  assert.doesNotMatch(source, /CUSTOMER_X|REGION_ALPHA|1MW|confirmed_m1_core_fixture/);
  assert.doesNotMatch(source, /NVIDIA|Schneider|Vertiv/);
  assert.doesNotMatch(source, /M1_DIFY_S1|test-fixtures/);
});

test("[A37] same-version certified Policy content mutations reject", () => {
  const mutations = [
    (policy) => { policy.policy_id = "M1_WAVE1_DETERMINISTIC_POLICY_MUTATED"; },
    (policy) => { policy.product_mappings[0].normalized_alternative_id = "ALT_UPS_MUTATED"; },
    (policy) => { policy.evidence_annotations[0].product_category = "POWER_PROTECTION"; },
    (policy) => { policy.evidence_annotations[0].architecture_family = "UPS_AC_POWER_PROTECTION"; },
    (policy) => { policy.evidence_annotations[0].selection_mode = "CATEGORY_REFERENCE"; },
    (policy) => {
      policy.decision_policy.outcomes.blocking_unknown.recommendation_code = "EVALUATION_ONLY";
    },
    (policy) => {
      policy.source_authority_assertions[0].publisher_exact = "MUTATED_PUBLISHER";
    },
    (policy) => { policy.certified_snapshot.sha256 = "f".repeat(64); },
  ];
  mutations.forEach((mutate) => {
    const args = baseArgs();
    mutate(args.decisionPolicy);
    expectRejected(
      publicPackage.runM1DecisionReleaseGateway(args),
      "POLICY_SCHEMA_INVALID",
      "policy_artifact_not_certified",
    );
  });
});

test("[A38] coordinated certified Policy and Snapshot mutation rejects", () => {
  const args = baseArgs();
  args.evidenceSnapshot.sources[0].evidence_units[0].statement += " coordinated mutation";
  args.evidenceSnapshotHash = hashM1EvidenceSnapshot(args.evidenceSnapshot);
  args.decisionPolicy.certified_snapshot.sha256 = args.evidenceSnapshotHash;
  expectRejected(
    publicPackage.runM1DecisionReleaseGateway(args),
    "POLICY_SCHEMA_INVALID",
    "policy_artifact_not_certified",
  );
});

test("[A39] cross-domain Policy mapping mutation rejects as uncertified", () => {
  const args = baseArgs();
  args.decisionPolicy.product_mappings[0].product_category = "DC_POWER_ARCHITECTURE";
  args.decisionPolicy.product_mappings[0].architecture_family = "FACILITY_800VDC_DISTRIBUTION";
  expectRejected(
    publicPackage.runM1DecisionReleaseGateway(args),
    "POLICY_SCHEMA_INVALID",
    "policy_artifact_not_certified",
  );
});

test("[A40] policy-only decision Source injection rejects independent Quality Gate", () => {
  qualityReject((state) => {
    state.decision_outputs.O1.source_ids.push("NVIDIA_800VDC_AI_POWER");
  }, "QUALITY_GATE_REJECTED");
});

test("[A41] repeated identical Gateway runs are deeply equal", () => {
  const args = baseArgs();
  assert.deepEqual(
    publicPackage.runM1DecisionReleaseGateway(args),
    publicPackage.runM1DecisionReleaseGateway(args),
  );
});

test("[A42] Gateway does not mutate inputs or supplied hashes", () => {
  const args = baseArgs();
  const before = clone(args);
  const result = publicPackage.runM1DecisionReleaseGateway(args);
  assert.equal(result.status, "RELEASED");
  assert.deepEqual(args, before);
});
