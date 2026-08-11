import test from "node:test";
import assert from "node:assert/strict";

import {
  handleM1ConfirmedInputSubmission,
} from "../../../../api/m1-input-understanding.js";
import {
  M1_DECISION_OUTPUTS,
  M1_DECISION_STATE_SCHEMA_VERSION,
  validateM1DecisionState,
} from "../contracts/m1DecisionState.js";
import {
  createConfirmedInputFixture,
  createDecisionStateFixture,
} from "../fixtures/m1DecisionCoreFixtures.js";
import {
  M1DecisionCoreError,
  assertM1ConfirmedInputGate,
  buildM1DecisionResolutionRequest,
  hashM1ConfirmedInput,
  parseM1DecisionResolutionResponse,
} from "../m1DecisionCore.js";
import { evaluateM1ReleaseIntegration } from "../releaseIntegration/index.js";

const clone = (value) => JSON.parse(JSON.stringify(value));
const rejectionCode = (code) => (error) => (
  error instanceof M1DecisionCoreError && error.code === code
);

test("input gate accepts only validated m1.confirmed-input.v1", () => {
  const confirmedInput = createConfirmedInputFixture();
  assert.equal(assertM1ConfirmedInputGate(confirmedInput), confirmedInput);

  assert.throws(
    () => assertM1ConfirmedInputGate({ schema_version: "m1.input-draft.v1" }),
    rejectionCode("m1_decision_core_draft_rejected"),
  );
  assert.throws(
    () => assertM1ConfirmedInputGate({ schema_version: "m1.input.v1" }),
    rejectionCode("m1_decision_core_confirmed_schema_required"),
  );

  const invalid = clone(confirmedInput);
  invalid.groups.decision_type.fields.decision_intent.confirmed_status = "PROVIDER_CONFIRMED";
  assert.throws(
    () => assertM1ConfirmedInputGate(invalid),
    rejectionCode("m1_decision_core_confirmed_input_invalid"),
  );
});

test("request construction preserves confirmed values and statuses and binds SHA-256", () => {
  const confirmedInput = createConfirmedInputFixture();
  const request = buildM1DecisionResolutionRequest({ confirmedInput });
  assert.deepEqual(JSON.parse(request.inputs.confirmed_input_json), confirmedInput);
  assert.equal(request.inputs.confirmed_input_id, confirmedInput.confirmed_input_id);
  assert.equal(request.inputs.confirmed_input_schema_version, "m1.confirmed-input.v1");
  assert.equal(request.inputs.decision_state_schema_version, M1_DECISION_STATE_SCHEMA_VERSION);
  assert.match(request.inputs.confirmed_input_hash, /^[a-f0-9]{64}$/);
  assert.equal(request.inputs.confirmed_input_hash, hashM1ConfirmedInput(confirmedInput));
});

test("complete m1.decision-state.v1 contract validates with exact O1-O7", () => {
  const confirmedInput = createConfirmedInputFixture();
  const decisionState = createDecisionStateFixture({ confirmedInput });
  assert.deepEqual(
    validateM1DecisionState(decisionState, {
      confirmedInput,
      inputHash: hashM1ConfirmedInput(confirmedInput),
    }),
    { ok: true, errors: [] },
  );
  assert.deepEqual(Object.keys(decisionState.decision_outputs), Object.keys(M1_DECISION_OUTPUTS));
});

test("Decision State validation fails closed on malformed binding and claim sources", () => {
  const confirmedInput = createConfirmedInputFixture();
  const malformed = createDecisionStateFixture({ confirmedInput });
  malformed.binding = null;
  malformed.claim_candidates[0].source_ids = null;
  const result = validateM1DecisionState(malformed, {
    confirmedInput,
    inputHash: hashM1ConfirmedInput(confirmedInput),
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("binding_invalid"));
  assert.ok(result.errors.includes("binding_confirmed_input_id_mismatch"));
  assert.ok(result.errors.includes("claim_candidates_0_source_ids_invalid"));
});

test("Decision Resolution response parsing preserves the confirmed snapshot", () => {
  const confirmedInput = createConfirmedInputFixture();
  const decisionState = createDecisionStateFixture({ confirmedInput });
  const parsed = parseM1DecisionResolutionResponse({
    confirmedInput,
    response: {
      outputs: {
        decision_state_json: JSON.stringify(decisionState),
      },
    },
  });
  assert.deepEqual(parsed.confirmed_input, confirmedInput);
  assert.equal(parsed.binding.confirmed_input_hash, hashM1ConfirmedInput(confirmedInput));
});

test("Provider output cannot overwrite a confirmed user fact or status", () => {
  const confirmedInput = createConfirmedInputFixture();
  const overwritten = createDecisionStateFixture({ confirmedInput });
  overwritten.confirmed_input.groups.customer_region.fields.region.value = "REGION_PROVIDER";
  overwritten.confirmed_input.groups.customer_region.fields.region.confirmed_status = "USER_CONFIRMED";

  assert.throws(
    () => parseM1DecisionResolutionResponse({
      confirmedInput,
      response: { outputs: { decision_state_json: JSON.stringify(overwritten) } },
    }),
    (error) => rejectionCode("m1_decision_core_decision_state_invalid")(error)
      && error.details.includes("confirmed_input_overwrite_attempt"),
  );
});

test("Claim Candidates require source boundary, full scope, reasoning bridge, and provenance", () => {
  const confirmedInput = createConfirmedInputFixture();
  const invalid = createDecisionStateFixture({ confirmedInput });
  invalid.claim_candidates[0].source_ids = [];
  invalid.claim_candidates[0].scope.region = "";
  invalid.claim_candidates[0].reasoning_bridge = "";

  const result = validateM1DecisionState(invalid, {
    confirmedInput,
    inputHash: hashM1ConfirmedInput(confirmedInput),
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("claim_candidates_0_source_required"));
  assert.ok(result.errors.includes("claim_candidates_0_scope_region_invalid"));
  assert.ok(result.errors.includes("claim_candidates_0_reasoning_bridge_invalid"));
  assert.ok(result.errors.includes(
    "claim_candidates_0_numeric_provenance_source_not_in_claim_sources",
  ));
});

test("UNKNOWN remains decision-active and cannot disappear from unresolved unknowns", () => {
  const confirmedInput = createConfirmedInputFixture();
  const invalid = createDecisionStateFixture({ confirmedInput });
  invalid.unresolved_unknowns = invalid.unresolved_unknowns.filter(
    (unknown) => unknown.field !== "target_timing",
  );

  const result = validateM1DecisionState(invalid, {
    confirmedInput,
    inputHash: hashM1ConfirmedInput(confirmedInput),
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.includes("confirmed_unknown_target_timing_not_decision_active"));
});

test("material context change produces a new hash and rejects the stale Decision State", () => {
  const confirmedInput = createConfirmedInputFixture();
  const originalHash = hashM1ConfirmedInput(confirmedInput);
  const originalState = createDecisionStateFixture({ confirmedInput });
  const changedInput = clone(confirmedInput);
  changedInput.groups.power_system_scope.fields.power_or_system_scope.value = "2MW";
  changedInput.groups.power_system_scope.fields.power_or_system_scope.confirmed_status = "USER_CORRECTED";
  const changedHash = hashM1ConfirmedInput(changedInput);
  assert.notEqual(changedHash, originalHash);

  assert.throws(
    () => parseM1DecisionResolutionResponse({
      confirmedInput: changedInput,
      response: { outputs: { decision_state_json: JSON.stringify(originalState) } },
    }),
    (error) => rejectionCode("m1_decision_core_decision_state_invalid")(error)
      && error.details.includes("binding_confirmed_input_hash_mismatch"),
  );
});

test("production confirmed-input API executes Core and Release Integration exactly once", () => {
  const confirmedInput = createConfirmedInputFixture();
  let coreCalls = 0;
  let releaseCalls = 0;
  const decisionCoreEntry = ({ confirmedInput: candidate }) => {
    coreCalls += 1;
    return buildM1DecisionResolutionRequest({ confirmedInput: candidate });
  };
  const releaseIntegration = (candidate) => {
    releaseCalls += 1;
    return evaluateM1ReleaseIntegration(candidate);
  };
  const accepted = handleM1ConfirmedInputSubmission({
    action: "m1_confirmed_input",
    confirmedInput,
  }, {
    decisionCoreEntry,
    releaseIntegration,
  });
  assert.equal(accepted.status, 200);
  assert.equal(accepted.payload.mode, "m1_release_result");
  assert.equal(accepted.payload.confirmedInputHash, hashM1ConfirmedInput(confirmedInput));
  assert.equal(accepted.payload.releaseResult.schema_version, "m1.release-result.v1");
  assert.equal(accepted.payload.releaseResult.status, "RELEASED");
  assert.equal(coreCalls, 1);
  assert.equal(releaseCalls, 1);

  const staleBindingAttempt = handleM1ConfirmedInputSubmission({
    action: "m1_confirmed_input",
    confirmedInput,
    confirmedInputHash: "stale-caller-binding",
  }, {
    decisionCoreEntry,
    releaseIntegration,
  });
  assert.deepEqual(staleBindingAttempt, {
    status: 422,
    payload: {
      mode: "m1_decision_core_rejected",
      reasonCode: "M1_CONFIRMED_INPUT_SUBMISSION_INVALID",
    },
  });
  assert.equal(coreCalls, 1);
  assert.equal(releaseCalls, 1);
});

test("production confirmed-input API rejects malformed Release Integration output", () => {
  const confirmedInput = createConfirmedInputFixture();
  let coreCalls = 0;
  let releaseCalls = 0;
  const result = handleM1ConfirmedInputSubmission({
    action: "m1_confirmed_input",
    confirmedInput,
  }, {
    decisionCoreEntry: ({ confirmedInput: candidate }) => {
      coreCalls += 1;
      return buildM1DecisionResolutionRequest({ confirmedInput: candidate });
    },
    releaseIntegration: () => {
      releaseCalls += 1;
      return {
        schema_version: "m1.release-result.v1",
        status: "RELEASED",
        binding: { confirmed_input_hash: "0".repeat(64) },
      };
    },
  });
  assert.deepEqual(result, {
    status: 422,
    payload: {
      mode: "m1_decision_core_rejected",
      reasonCode: "M1_CONFIRMED_INPUT_REJECTED",
    },
  });
  assert.equal(coreCalls, 1);
  assert.equal(releaseCalls, 1);
});
