import test from "node:test";
import assert from "node:assert/strict";

import {
  canonicalStringifyM1EvidenceSnapshot,
  hashM1EvidenceSnapshot,
  validateM1EvidenceSnapshot,
} from "../contracts/m1EvidenceSnapshot.js";
import {
  buildM1DecisionEvidenceRequest,
  runM1DecisionEvidenceGuard,
} from "../m1DecisionEvidenceContext.js";
import {
  TEST_ONLY_EVIDENCE_MARKER,
  createCurrentS1PollutionFixture,
  createEmptyEvidenceSnapshotFixture,
  createEvidenceGuardPassFixture,
  createEvidenceSnapshotFixture,
} from "../fixtures/m1DecisionEvidenceFixtures.js";
import {
  hashM1ConfirmedInput,
  buildM1DecisionResolutionRequest,
} from "../m1DecisionCore.js";

const clone = (value) => JSON.parse(JSON.stringify(value));
const run = (fixture) => runM1DecisionEvidenceGuard(fixture);
const hasViolation = (result, fragment) => (
  result.binding.violations.some((violation) => violation.includes(fragment))
);

test("valid empty structural m1.evidence-snapshot.v1 contract passes", () => {
  const snapshot = createEmptyEvidenceSnapshotFixture();
  assert.deepEqual(validateM1EvidenceSnapshot(snapshot), { ok: true, errors: [] });
  assert.equal(Object.hasOwn(snapshot, "evidence_snapshot_hash"), false);
});

test("canonical key order and Unicode values are stable without sorting arrays", () => {
  const snapshot = createEvidenceSnapshotFixture();
  snapshot.sources[0].source_title = `${TEST_ONLY_EVIDENCE_MARKER}:测试`;
  const reordered = {
    sources: snapshot.sources.map((source) => ({
      limitations: source.limitations,
      evidence_units: source.evidence_units,
      applicable_scope: source.applicable_scope,
      source_type: source.source_type,
      retrieved_at: source.retrieved_at,
      document_date: source.document_date,
      publisher: source.publisher,
      source_title: source.source_title,
      source_id: source.source_id,
    })),
    source_policy: {
      allowed_source_ids: snapshot.source_policy.allowed_source_ids,
      mode: snapshot.source_policy.mode,
    },
    as_of_date: snapshot.as_of_date,
    created_at: snapshot.created_at,
    evidence_snapshot_id: snapshot.evidence_snapshot_id,
    schema_version: snapshot.schema_version,
  };
  assert.equal(hashM1EvidenceSnapshot(reordered), hashM1EvidenceSnapshot(snapshot));
  assert.match(canonicalStringifyM1EvidenceSnapshot(snapshot), /测试/u);

  const reversed = clone(snapshot);
  reversed.sources.reverse();
  assert.notEqual(hashM1EvidenceSnapshot(reversed), hashM1EvidenceSnapshot(snapshot));
});

test("one-character evidence mutation changes hash and stale hash fails guard", () => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.evidenceSnapshot.sources[0].source_title += "X";
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "evidence_snapshot_hash_mismatch"));
});

test("evidence-unit order changes hash", () => {
  const snapshot = createEvidenceSnapshotFixture();
  const source = snapshot.sources.find(({ source_id: sourceId }) => sourceId === "OCP_MT_DIABLO");
  source.evidence_units.push({
    ...clone(source.evidence_units[0]),
    evidence_unit_id: "TEST_ONLY_EU_002",
    statement: "TEST_ONLY_NOT_REAL_EVIDENCE second unit.",
    evidence_type: "FACT",
    numeric_provenance: null,
  });
  const reversed = clone(snapshot);
  reversed.sources.find(({ source_id: sourceId }) => (
    sourceId === "OCP_MT_DIABLO"
  )).evidence_units.reverse();
  assert.notEqual(hashM1EvidenceSnapshot(reversed), hashM1EvidenceSnapshot(snapshot));
});

test("source content tampering changes hash", () => {
  const snapshot = createEvidenceSnapshotFixture();
  const changed = clone(snapshot);
  changed.sources[2].publisher += "_tampered";
  assert.notEqual(hashM1EvidenceSnapshot(changed), hashM1EvidenceSnapshot(snapshot));
});

test("source outside frozen seven-source allow-list is rejected", () => {
  const snapshot = createEvidenceSnapshotFixture();
  snapshot.sources[0].source_id = "TEST_ONLY_EIGHTH_SOURCE";
  const result = validateM1EvidenceSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("sources_0_source_id_outside_allow_list"));
});

test("duplicate source is rejected", () => {
  const snapshot = createEvidenceSnapshotFixture();
  snapshot.sources[1].source_id = snapshot.sources[0].source_id;
  const result = validateM1EvidenceSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("sources_1_source_id_duplicate"));
});

test("duplicate evidence_unit_id across the snapshot is rejected", () => {
  const snapshot = createEvidenceSnapshotFixture();
  const unit = clone(
    snapshot.sources.find(({ source_id: sourceId }) => (
      sourceId === "OCP_MT_DIABLO"
    )).evidence_units[0],
  );
  unit.numeric_provenance.source_id = "NVIDIA_800VDC_AI_POWER";
  snapshot.sources[0].evidence_units.push(unit);
  const result = validateM1EvidenceSnapshot(snapshot);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.endsWith("evidence_unit_id_duplicate")));
});

test("decision source in allow-list but absent from snapshot is rejected", () => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.evidenceSnapshot.sources = fixture.evidenceSnapshot.sources.filter(
    ({ source_id: sourceId }) => sourceId !== "SCHNEIDER_GALAXY_VXL",
  );
  fixture.evidenceSnapshotHash = hashM1EvidenceSnapshot(fixture.evidenceSnapshot);
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "source_id_absent_from_snapshot"));
});

test("SOURCE_BACKED exact evidence-unit statement produces BOUND", () => {
  const result = run(createEvidenceGuardPassFixture());
  assert.equal(result.ok, true);
  assert.deepEqual(result.binding.violations, []);
  assert.deepEqual(
    Object.keys(result.binding).sort(),
    [
      "claim_bindings",
      "decision_id",
      "evidence_snapshot_hash",
      "evidence_snapshot_id",
      "schema_version",
      "violations",
    ].sort(),
  );
  assert.deepEqual(result.binding.claim_bindings[0], {
    claim_id: "CC_001",
    proposed_class: "SOURCE_BACKED",
    source_ids: ["OCP_MT_DIABLO"],
    evidence_unit_ids: ["TEST_ONLY_EU_001"],
    binding_status: "BOUND",
  });
});

test("SOURCE_BACKED paraphrase rather than exact statement fails", () => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.decisionState.claim_candidates[0].statement = "The comparison is approximately one MW.";
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "evidence_statement_exact_match_missing"));
});

test("SOURCE_BACKED numeric provenance mismatch fails", () => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.decisionState.claim_candidates[0].numeric_provenance.unit = "kW";
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "numeric_provenance_mismatch"));
});

test("SOURCE_BACKED scope expansion beyond evidence scope fails", () => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.decisionState.claim_candidates[0].scope.region = "REGION_BETA";
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "claim_scope_exceeds_evidence_scope"));
});

test("UNKNOWN claim with empty sources passes as UNKNOWN_NO_EVIDENCE_REQUIRED", () => {
  const result = run(createEvidenceGuardPassFixture());
  assert.equal(result.ok, true);
  assert.equal(
    result.binding.claim_bindings[1].binding_status,
    "UNKNOWN_NO_EVIDENCE_REQUIRED",
  );
  assert.deepEqual(result.binding.claim_bindings[1].evidence_unit_ids, []);
});

test("UNKNOWN claim with a source ID fails", () => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.decisionState.claim_candidates[1].source_ids = ["OCP_MT_DIABLO"];
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "unknown_sources_forbidden"));
  assert.equal(result.binding.claim_bindings[1].binding_status, "REJECTED");
});

test("INFERRED_BRIDGE always fails deterministic v1 binding", () => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.decisionState.claim_candidates[0].proposed_class = "INFERRED_BRIDGE";
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(result.binding.violations.includes(
    "inferred_bridge_not_deterministically_bindable_v1",
  ));
});

test("SUPPORTED record with empty source_ids fails", () => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.decisionState.product_boundary.status = "SUPPORTED";
  fixture.decisionState.product_boundary.source_ids = [];
  fixture.decisionState.product_boundary.unknown_ids = [];
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "supported_source_required"));
});

test("QUALIFIED record with neither sources nor unknowns fails", () => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.decisionState.product_boundary.status = "QUALIFIED";
  fixture.decisionState.product_boundary.source_ids = [];
  fixture.decisionState.product_boundary.unknown_ids = [];
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "qualified_basis_missing"));
});

test("status records cannot reference an undeclared unknown ID", () => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.decisionState.product_boundary.unknown_ids = ["U_NOT_DECLARED"];
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "unknown_id_not_declared"));
});

test("source-less technical tradeoff fails", () => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.decisionState.tradeoffs[0].source_ids = [];
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "tradeoffs_0:technical_source_required"));
});

test("source-less technical risk fails even when unknown_ids are present", () => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.decisionState.risks[0].source_ids = [];
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "risks_0:technical_source_required"));
});

test("unconfirmed owner Product Management fails", () => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.decisionState.validation_actions[0].owner = "Product Management";
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(result.binding.violations.includes("unconfirmed_owner_assignment"));
});

test("owner TBD passes", () => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.decisionState.validation_actions[0].owner = "TBD";
  fixture.decisionState.required_action.owner = "TBD";
  assert.equal(run(fixture).ok, true);
});

test("confirmed-input equality and hash regression remains bound to existing logic", () => {
  const fixture = createEvidenceGuardPassFixture();
  const originalRequest = buildM1DecisionResolutionRequest({
    confirmedInput: fixture.confirmedInput,
  });
  const evidenceRequest = buildM1DecisionEvidenceRequest({
    confirmedInput: fixture.confirmedInput,
    evidenceSnapshot: fixture.evidenceSnapshot,
  });
  [
    "confirmed_input_id",
    "confirmed_input_schema_version",
    "confirmed_input_hash",
    "decision_state_schema_version",
    "confirmed_input_json",
  ].forEach((field) => assert.equal(
    evidenceRequest.inputs[field],
    originalRequest.inputs[field],
  ));
  assert.equal(
    evidenceRequest.inputs.confirmed_input_hash,
    hashM1ConfirmedInput(fixture.confirmedInput),
  );
  assert.deepEqual(
    Object.keys(evidenceRequest.inputs).sort(),
    [
      ...Object.keys(originalRequest.inputs),
      "evidence_snapshot_id",
      "evidence_snapshot_schema_version",
      "evidence_snapshot_hash",
      "evidence_snapshot_json",
    ].sort(),
  );
  assert.equal(
    evidenceRequest.inputs.evidence_snapshot_hash,
    hashM1EvidenceSnapshot(fixture.evidenceSnapshot),
  );
  assert.deepEqual(
    JSON.parse(evidenceRequest.inputs.evidence_snapshot_json),
    fixture.evidenceSnapshot,
  );
});

test("confirmed-input overwrite attempt still fails through existing Decision State validator", () => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.decisionState.confirmed_input.groups.customer_region.fields.region.value = "REGION_BETA";
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "confirmed_input_overwrite_attempt"));
});

test("current S1 pollution fixture is deterministically rejected", () => {
  const fixture = createCurrentS1PollutionFixture();
  assert.match(fixture.decisionState.tradeoffs[0].benefit, /TEST_ONLY_NOT_REAL_EVIDENCE/);
  const result = run(fixture);
  assert.equal(result.ok, false);
  [
    "supported_source_required",
    "tradeoffs_0:technical_source_required",
    "risks_0:technical_source_required",
    "unconfirmed_owner_assignment",
    "source_id_absent_from_snapshot",
  ].forEach((violation) => assert.ok(hasViolation(result, violation), violation));
});
