import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

import {
  M1_EVIDENCE_SCOPE_FIELDS,
  canonicalStringifyM1EvidenceSnapshot,
  hashM1EvidenceSnapshot,
  validateM1EvidenceSnapshot,
} from "../contracts/m1EvidenceSnapshot.js";
import { M1_EVIDENCE_SOURCE_IDS } from "../contracts/m1DecisionState.js";
import {
  buildM1DecisionEvidenceRequest,
  runM1DecisionEvidenceGuard,
} from "../m1DecisionEvidenceContext.js";
import { buildM1DecisionResolutionRequest } from "../m1DecisionCore.js";
import { createEvidenceGuardPassFixture } from "../fixtures/m1DecisionEvidenceFixtures.js";

const SNAPSHOT_URL = new URL(
  "../evidence/m1OfficialEvidenceWave1.v0.2.json",
  import.meta.url,
);
const CANONICAL_SNAPSHOT_HASH = (
  "e0add5fedb9ef17752f823e8bfe2757add156fcef98a20ea741b73c818d30e9b"
);
const AUTHORIZED_SOURCE_IDS = [
  "NVIDIA_800VDC_AI_POWER",
  "SCHNEIDER_GALAXY_VXL",
  "VERTIV_AI_POWER_SWING_UPS",
];
const EXPECTED_UNIT_IDS = [
  "NVIDIA_EU_001",
  "NVIDIA_EU_002",
  "NVIDIA_EU_003",
  "NVIDIA_EU_004",
  "NVIDIA_EU_005",
  "SCHNEIDER_EU_001A",
  "SCHNEIDER_EU_001B",
  "SCHNEIDER_EU_002",
  "SCHNEIDER_EU_003",
  "SCHNEIDER_EU_004",
  "SCHNEIDER_EU_005",
  "SCHNEIDER_EU_006",
  "VERTIV_EU_001",
  "VERTIV_EU_002",
  "VERTIV_EU_003",
  "VERTIV_EU_004",
];

const clone = (value) => JSON.parse(JSON.stringify(value));
const readSnapshot = () => JSON.parse(fs.readFileSync(SNAPSHOT_URL, "utf8"));
const allUnits = (snapshot) => snapshot.sources.flatMap((source) => source.evidence_units);
const unitById = (snapshot, evidenceUnitId) => (
  allUnits(snapshot).find(({ evidence_unit_id: unitId }) => unitId === evidenceUnitId)
);
const sourceForUnit = (snapshot, evidenceUnitId) => (
  snapshot.sources.find((source) => (
    source.evidence_units.some(({ evidence_unit_id: unitId }) => unitId === evidenceUnitId)
  ))
);
const hasViolation = (result, fragment) => (
  result.binding.violations.some((violation) => violation.includes(fragment))
);

const validateWave1Identity = (snapshot) => {
  const sourceIds = Array.isArray(snapshot?.sources)
    ? snapshot.sources.map(({ source_id: sourceId }) => sourceId)
    : [];
  const unitIds = Array.isArray(snapshot?.sources)
    ? allUnits(snapshot).map(({ evidence_unit_id: unitId }) => unitId)
    : [];
  const errors = [];
  if (snapshot?.evidence_snapshot_id
    !== "m1_wave1_official_evidence_authorized_20260726_v02") {
    errors.push("snapshot_id");
  }
  if (JSON.stringify(sourceIds) !== JSON.stringify(AUTHORIZED_SOURCE_IDS)) {
    errors.push("authorized_source_ids");
  }
  if (JSON.stringify(unitIds) !== JSON.stringify(EXPECTED_UNIT_IDS)) {
    errors.push("authorized_evidence_unit_ids");
  }
  if (snapshot?.sources?.length !== 3) errors.push("source_count");
  if (unitIds.length !== 16) errors.push("evidence_unit_count");
  if (sourceIds.includes("OCP_MT_DIABLO")) errors.push("ocp_source");
  if (unitIds.some((unitId) => ["OCP_EU_001", "OCP_EU_002"].includes(unitId))) {
    errors.push("ocp_evidence_unit");
  }
  if (unitIds.includes("SCHNEIDER_EU_001")) errors.push("retired_schneider_unit");
  if (!unitIds.includes("SCHNEIDER_EU_001A")) errors.push("schneider_001a_missing");
  if (!unitIds.includes("SCHNEIDER_EU_001B")) errors.push("schneider_001b_missing");
  if (JSON.stringify(snapshot?.source_policy?.allowed_source_ids)
    !== JSON.stringify(M1_EVIDENCE_SOURCE_IDS)) {
    errors.push("seven_source_policy");
  }
  return { ok: errors.length === 0, errors };
};

const remapDecisionSourcesToSnapshot = (value, path = []) => {
  if (Array.isArray(value)) {
    value.forEach((item, index) => remapDecisionSourcesToSnapshot(item, [...path, index]));
    return;
  }
  if (!value || typeof value !== "object") return;
  Object.entries(value).forEach(([key, nested]) => {
    if (key === "source_ids"
      && path[0] !== "evidence_boundary"
      && Array.isArray(nested)
      && nested.length > 0) {
      value[key] = ["NVIDIA_800VDC_AI_POWER"];
      return;
    }
    remapDecisionSourcesToSnapshot(nested, [...path, key]);
  });
};

const bindClaimToUnit = (fixture, evidenceUnitId) => {
  const unit = unitById(fixture.evidenceSnapshot, evidenceUnitId);
  const source = sourceForUnit(fixture.evidenceSnapshot, evidenceUnitId);
  assert.ok(unit, evidenceUnitId);
  assert.ok(source, evidenceUnitId);
  const claim = fixture.decisionState.claim_candidates[0];
  claim.statement = unit.statement;
  claim.value = unit.numeric_provenance?.value ?? null;
  claim.claim_type = unit.evidence_type;
  claim.proposed_class = "SOURCE_BACKED";
  claim.source_ids = [source.source_id];
  claim.scope = Object.fromEntries(
    M1_EVIDENCE_SCOPE_FIELDS.map((field) => [field, unit.scope[field][0]]),
  );
  claim.numeric_provenance = clone(unit.numeric_provenance);
};

const createOfficialGuardFixture = (evidenceUnitId = "NVIDIA_EU_001") => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.evidenceSnapshot = readSnapshot();
  fixture.evidenceSnapshotId = fixture.evidenceSnapshot.evidence_snapshot_id;
  fixture.evidenceSnapshotSchemaVersion = fixture.evidenceSnapshot.schema_version;
  fixture.evidenceSnapshotHash = hashM1EvidenceSnapshot(fixture.evidenceSnapshot);
  remapDecisionSourcesToSnapshot(fixture.decisionState);
  bindClaimToUnit(fixture, evidenceUnitId);
  return fixture;
};

const createTestOnlyMultiSourceFixture = () => {
  const fixture = createEvidenceGuardPassFixture();
  const claim = fixture.decisionState.claim_candidates[0];
  const primaryUnit = unitById(fixture.evidenceSnapshot, "TEST_ONLY_EU_001");
  primaryUnit.evidence_type = "FACT";
  primaryUnit.numeric_provenance = null;
  const secondUnit = {
    ...clone(primaryUnit),
    evidence_unit_id: "TEST_ONLY_EU_002",
  };
  fixture.evidenceSnapshot.sources.find(({ source_id: sourceId }) => (
    sourceId === "NVIDIA_800VDC_AI_POWER"
  )).evidence_units.push(secondUnit);
  claim.claim_type = "FACT";
  claim.value = null;
  claim.numeric_provenance = null;
  claim.source_ids = ["OCP_MT_DIABLO", "NVIDIA_800VDC_AI_POWER"];
  fixture.evidenceSnapshotHash = hashM1EvidenceSnapshot(fixture.evidenceSnapshot);
  return fixture;
};

const run = (fixture) => runM1DecisionEvidenceGuard(fixture);
const reverseObjectKeys = (value) => {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .reverse()
      .map((key) => [key, reverseObjectKeys(value[key])]),
  );
};

test("Wave 1 v0.2 production artifact identity and validator pass", () => {
  const snapshot = readSnapshot();
  assert.deepEqual(validateWave1Identity(snapshot), { ok: true, errors: [] });
  assert.deepEqual(validateM1EvidenceSnapshot(snapshot), { ok: true, errors: [] });
  assert.equal(hashM1EvidenceSnapshot(snapshot), CANONICAL_SNAPSHOT_HASH);
  assert.match(hashM1EvidenceSnapshot(snapshot), /^[a-f0-9]{64}$/);
});

test("Wave 1 v0.2 canonical hash is key-order stable and array-order sensitive", () => {
  const snapshot = readSnapshot();
  const hash = hashM1EvidenceSnapshot(snapshot);
  assert.equal(hashM1EvidenceSnapshot(reverseObjectKeys(snapshot)), hash);

  const statementMutation = clone(snapshot);
  statementMutation.sources[0].evidence_units[0].statement += "X";
  assert.notEqual(hashM1EvidenceSnapshot(statementMutation), hash);

  const unitOrderMutation = clone(snapshot);
  unitOrderMutation.sources[0].evidence_units.reverse();
  assert.notEqual(hashM1EvidenceSnapshot(unitOrderMutation), hash);

  const sourceOrderMutation = clone(snapshot);
  sourceOrderMutation.sources.reverse();
  assert.notEqual(hashM1EvidenceSnapshot(sourceOrderMutation), hash);
});

test("Wave 1 v0.2 request envelope preserves confirmed input and binds canonical evidence", () => {
  const fixture = createOfficialGuardFixture();
  const original = buildM1DecisionResolutionRequest({
    confirmedInput: fixture.confirmedInput,
  });
  const request = buildM1DecisionEvidenceRequest({
    confirmedInput: fixture.confirmedInput,
    evidenceSnapshot: fixture.evidenceSnapshot,
  });
  [
    "confirmed_input_id",
    "confirmed_input_schema_version",
    "confirmed_input_hash",
    "decision_state_schema_version",
    "confirmed_input_json",
  ].forEach((field) => assert.equal(request.inputs[field], original.inputs[field]));
  assert.equal(request.inputs.evidence_snapshot_id, fixture.evidenceSnapshotId);
  assert.equal(
    request.inputs.evidence_snapshot_schema_version,
    fixture.evidenceSnapshotSchemaVersion,
  );
  assert.equal(request.inputs.evidence_snapshot_hash, fixture.evidenceSnapshotHash);
  assert.equal(
    request.inputs.evidence_snapshot_json,
    canonicalStringifyM1EvidenceSnapshot(fixture.evidenceSnapshot),
  );
});

test("NVIDIA_EU_001 exact SOURCE_BACKED numeric claim is BOUND", () => {
  const fixture = createOfficialGuardFixture("NVIDIA_EU_001");
  const result = run(fixture);
  assert.equal(result.ok, true);
  assert.deepEqual(result.binding.claim_bindings[0], {
    claim_id: "CC_001",
    proposed_class: "SOURCE_BACKED",
    source_ids: ["NVIDIA_800VDC_AI_POWER"],
    evidence_unit_ids: ["NVIDIA_EU_001"],
    binding_status: "BOUND",
  });
});

test("SCHNEIDER_EU_001A exact 500 kW claim is BOUND", () => {
  const result = run(createOfficialGuardFixture("SCHNEIDER_EU_001A"));
  assert.equal(result.ok, true);
  assert.equal(result.binding.claim_bindings[0].binding_status, "BOUND");
  assert.deepEqual(result.binding.claim_bindings[0].evidence_unit_ids, ["SCHNEIDER_EU_001A"]);
});

test("SCHNEIDER_EU_001B exact 1250 kW claim is BOUND", () => {
  const result = run(createOfficialGuardFixture("SCHNEIDER_EU_001B"));
  assert.equal(result.ok, true);
  assert.equal(result.binding.claim_bindings[0].binding_status, "BOUND");
  assert.deepEqual(result.binding.claim_bindings[0].evidence_unit_ids, ["SCHNEIDER_EU_001B"]);
});

test("SCHNEIDER_EU_004 exact efficiency and operating point are BOUND", () => {
  const result = run(createOfficialGuardFixture("SCHNEIDER_EU_004"));
  assert.equal(result.ok, true);
  assert.equal(result.binding.claim_bindings[0].binding_status, "BOUND");
  assert.deepEqual(result.binding.claim_bindings[0].evidence_unit_ids, ["SCHNEIDER_EU_004"]);
});

test("VERTIV_EU_003 exact Battery Shield rated-load step is BOUND", () => {
  const fixture = createOfficialGuardFixture("VERTIV_EU_003");
  const provenance = fixture.decisionState.claim_candidates[0].numeric_provenance;
  assert.equal(provenance.value, 100);
  assert.equal(provenance.unit, "% rated load step");
  assert.match(provenance.denominator, /0%.*100%/);
  const result = run(fixture);
  assert.equal(result.ok, true);
  assert.deepEqual(result.binding.claim_bindings[0].evidence_unit_ids, ["VERTIV_EU_003"]);
});

test("NVIDIA_EU_003 exact nonnumeric REQUIREMENT claim is BOUND", () => {
  const fixture = createOfficialGuardFixture("NVIDIA_EU_003");
  const claim = fixture.decisionState.claim_candidates[0];
  assert.equal(claim.claim_type, "REQUIREMENT");
  assert.equal(claim.value, null);
  assert.equal(claim.numeric_provenance, null);
  const result = run(fixture);
  assert.equal(result.ok, true);
  assert.deepEqual(result.binding.claim_bindings[0].evidence_unit_ids, ["NVIDIA_EU_003"]);
});

test("VERTIV_EU_002 exact nonnumeric RISK claim is BOUND", () => {
  const fixture = createOfficialGuardFixture("VERTIV_EU_002");
  const claim = fixture.decisionState.claim_candidates[0];
  assert.equal(claim.claim_type, "RISK");
  assert.equal(claim.value, null);
  assert.equal(claim.numeric_provenance, null);
  const result = run(fixture);
  assert.equal(result.ok, true);
  assert.deepEqual(result.binding.claim_bindings[0].evidence_unit_ids, ["VERTIV_EU_002"]);
});

test("RISK evidence rejects a FACT claim type", () => {
  const fixture = createOfficialGuardFixture("VERTIV_EU_002");
  fixture.decisionState.claim_candidates[0].claim_type = "FACT";
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "claim_type_evidence_type_mismatch"));
  assert.equal(result.binding.claim_bindings[0].binding_status, "REJECTED");
});

test("REQUIREMENT evidence rejects a FACT claim type", () => {
  const fixture = createOfficialGuardFixture("NVIDIA_EU_003");
  fixture.decisionState.claim_candidates[0].claim_type = "FACT";
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "claim_type_evidence_type_mismatch"));
});

test("numeric METRIC evidence rejects a FACT claim type", () => {
  const fixture = createOfficialGuardFixture("NVIDIA_EU_002");
  fixture.decisionState.claim_candidates[0].claim_type = "FACT";
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "claim_type_evidence_type_mismatch"));
});

test("nonnumeric evidence rejects string, boolean, array, and object claim values", () => {
  ["must include storage", true, [], {}].forEach((forbiddenValue) => {
    const fixture = createOfficialGuardFixture("NVIDIA_EU_003");
    fixture.decisionState.claim_candidates[0].value = forbiddenValue;
    const result = run(fixture);
    assert.equal(result.ok, false);
    assert.ok(hasViolation(result, "nonnumeric_claim_value_forbidden"));
    assert.equal(result.binding.claim_bindings[0].binding_status, "REJECTED");
  });
});

test("nonnumeric evidence rejects a numeric claim value", () => {
  const fixture = createOfficialGuardFixture("VERTIV_EU_002");
  fixture.decisionState.claim_candidates[0].value = 1;
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "nonnumeric_claim_value_forbidden"));
});

test("NVIDIA claim rejects an extra Schneider source without matching evidence", () => {
  const fixture = createOfficialGuardFixture("NVIDIA_EU_003");
  fixture.decisionState.claim_candidates[0].source_ids.push("SCHNEIDER_GALAXY_VXL");
  const originalDecisionState = clone(fixture.decisionState);
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "unbound_claim_source_id"));
  assert.deepEqual(fixture.decisionState, originalDecisionState);
  assert.deepEqual(
    result.binding.claim_bindings[0].source_ids,
    ["NVIDIA_800VDC_AI_POWER"],
  );
});

test("Schneider claim rejects an extra Vertiv source without matching evidence", () => {
  const fixture = createOfficialGuardFixture("SCHNEIDER_EU_006");
  fixture.decisionState.claim_candidates[0].source_ids.push("VERTIV_AI_POWER_SWING_UPS");
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "unbound_claim_source_id"));
  assert.deepEqual(result.binding.claim_bindings[0].source_ids, ["SCHNEIDER_GALAXY_VXL"]);
});

test("TEST_ONLY multi-source claim binds only when every source has exact evidence", () => {
  const fixture = createTestOnlyMultiSourceFixture();
  const result = run(fixture);
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.binding.claim_bindings[0].source_ids,
    ["OCP_MT_DIABLO", "NVIDIA_800VDC_AI_POWER"],
  );
  assert.deepEqual(
    [...result.binding.claim_bindings[0].evidence_unit_ids].sort(),
    ["TEST_ONLY_EU_001", "TEST_ONLY_EU_002"],
  );
});

test("source-free UNKNOWN remains UNKNOWN_NO_EVIDENCE_REQUIRED", () => {
  const result = run(createOfficialGuardFixture());
  assert.equal(result.ok, true);
  assert.equal(
    result.binding.claim_bindings[1].binding_status,
    "UNKNOWN_NO_EVIDENCE_REQUIRED",
  );
});

test("OCP is allow-listed but absent from the production snapshot and fails closed", () => {
  const fixture = createOfficialGuardFixture();
  fixture.decisionState.product_boundary.source_ids = ["OCP_MT_DIABLO"];
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "source_id_absent_from_snapshot"));
});

test("retired SCHNEIDER_EU_001 is absent and cannot bind", () => {
  const fixture = createOfficialGuardFixture("SCHNEIDER_EU_001A");
  assert.equal(unitById(fixture.evidenceSnapshot, "SCHNEIDER_EU_001"), undefined);
  fixture.decisionState.claim_candidates[0].statement = "SCHNEIDER_EU_001";
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "evidence_statement_exact_match_missing"));
});

test("NVIDIA statement paraphrase fails exact matching", () => {
  const fixture = createOfficialGuardFixture("NVIDIA_EU_001");
  fixture.decisionState.claim_candidates[0].statement = (
    "NVIDIA proposes an 800 VDC facility architecture for compute racks."
  );
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "evidence_statement_exact_match_missing"));
});

test("NVIDIA denominator restored to null fails the production validator", () => {
  const snapshot = readSnapshot();
  unitById(snapshot, "NVIDIA_EU_001").numeric_provenance.denominator = null;
  const validation = validateM1EvidenceSnapshot(snapshot);
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((error) => error.endsWith("denominator_invalid")));
});

test("Schneider 500 kW changed to 501 fails numeric binding", () => {
  const fixture = createOfficialGuardFixture("SCHNEIDER_EU_001A");
  fixture.decisionState.claim_candidates[0].value = 501;
  fixture.decisionState.claim_candidates[0].numeric_provenance.value = 501;
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "numeric_provenance_mismatch"));
});

test("Schneider 1250 kW changed to 1200 fails numeric binding", () => {
  const fixture = createOfficialGuardFixture("SCHNEIDER_EU_001B");
  fixture.decisionState.claim_candidates[0].value = 1200;
  fixture.decisionState.claim_candidates[0].numeric_provenance.value = 1200;
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "numeric_provenance_mismatch"));
});

test("Schneider endpoints merged into a string range fail the production validator", () => {
  const snapshot = readSnapshot();
  unitById(snapshot, "SCHNEIDER_EU_001A").numeric_provenance.value = "500-1250";
  const validation = validateM1EvidenceSnapshot(snapshot);
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((error) => error.endsWith("value_invalid")));
});

test("Schneider normal-operation 97.2 percent changed to 99.4 fails binding", () => {
  const fixture = createOfficialGuardFixture("SCHNEIDER_EU_004");
  fixture.decisionState.claim_candidates[0].value = 99.4;
  fixture.decisionState.claim_candidates[0].numeric_provenance.value = 99.4;
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "numeric_provenance_mismatch"));
});

test("Schneider normal operation relabeled as eConversion fails exact matching", () => {
  const fixture = createOfficialGuardFixture("SCHNEIDER_EU_004");
  fixture.decisionState.claim_candidates[0].statement = (
    fixture.decisionState.claim_candidates[0].statement.replace(
      "normal-operation",
      "eConversion",
    )
  );
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "evidence_statement_exact_match_missing"));
});

test("Schneider efficiency denominator missing operating point fails binding", () => {
  const fixture = createOfficialGuardFixture("SCHNEIDER_EU_004");
  fixture.decisionState.claim_candidates[0].numeric_provenance.denominator = "normal operation";
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "numeric_provenance_mismatch"));
});

test("Vertiv numeric value restored to string range fails the production validator", () => {
  const snapshot = readSnapshot();
  unitById(snapshot, "VERTIV_EU_003").numeric_provenance.value = "0-100";
  const validation = validateM1EvidenceSnapshot(snapshot);
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some((error) => error.endsWith("value_invalid")));
});

test("Vertiv rated-load step changed from 100 to 120 fails binding", () => {
  const fixture = createOfficialGuardFixture("VERTIV_EU_003");
  fixture.decisionState.claim_candidates[0].value = 120;
  fixture.decisionState.claim_candidates[0].numeric_provenance.value = 120;
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "numeric_provenance_mismatch"));
});

test("Vertiv Battery Shield generalized to all UPS fails closed", () => {
  const fixture = createOfficialGuardFixture("VERTIV_EU_003");
  fixture.decisionState.claim_candidates[0].statement = (
    "Vertiv states that all UPS can manage 0% to 100% power steps without batteries."
  );
  fixture.decisionState.claim_candidates[0].scope.product = "all UPS";
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(
    hasViolation(result, "evidence_statement_exact_match_missing")
      || hasViolation(result, "claim_scope_exceeds_evidence_scope"),
  );
});

test("UNKNOWN carrying a source fails", () => {
  const fixture = createOfficialGuardFixture();
  fixture.decisionState.claim_candidates[1].source_ids = ["NVIDIA_800VDC_AI_POWER"];
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(hasViolation(result, "unknown_sources_forbidden"));
});

test("INFERRED_BRIDGE remains deterministically rejected", () => {
  const fixture = createOfficialGuardFixture();
  fixture.decisionState.claim_candidates[0].proposed_class = "INFERRED_BRIDGE";
  const result = run(fixture);
  assert.equal(result.ok, false);
  assert.ok(result.binding.violations.includes(
    "inferred_bridge_not_deterministically_bindable_v1",
  ));
});

test("Wave 1 identity rejects adding an OCP source", () => {
  const snapshot = readSnapshot();
  const ocp = clone(snapshot.sources[0]);
  ocp.source_id = "OCP_MT_DIABLO";
  ocp.evidence_units = [];
  snapshot.sources.push(ocp);
  const identity = validateWave1Identity(snapshot);
  assert.equal(identity.ok, false);
  assert.ok(identity.errors.includes("ocp_source"));
});

test("Wave 1 identity rejects a fourth non-production source", () => {
  const snapshot = readSnapshot();
  const fourth = clone(snapshot.sources[0]);
  fourth.source_id = "DIGITAL_REALTY_HIGH_DENSITY_COLOCATION";
  fourth.evidence_units = [];
  snapshot.sources.push(fourth);
  const identity = validateWave1Identity(snapshot);
  assert.equal(identity.ok, false);
  assert.ok(identity.errors.includes("source_count"));
});

test("Wave 1 identity rejects 15 or 17 evidence units without changing global schema", () => {
  const reduced = readSnapshot();
  reduced.sources[0].evidence_units.pop();
  assert.equal(validateM1EvidenceSnapshot(reduced).ok, true);
  assert.equal(validateWave1Identity(reduced).ok, false);

  const increased = readSnapshot();
  const extra = clone(increased.sources[0].evidence_units[0]);
  extra.evidence_unit_id = "TEST_ONLY_WAVE1_EXTRA_UNIT";
  increased.sources[0].evidence_units.push(extra);
  assert.equal(validateM1EvidenceSnapshot(increased).ok, true);
  assert.equal(validateWave1Identity(increased).ok, false);
});
