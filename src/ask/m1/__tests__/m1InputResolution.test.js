import test from "node:test";
import assert from "node:assert/strict";

import {
  toPublicM1InputUnderstandingResult,
} from "../../../../api/m1-input-understanding.js";
import {
  createM1ConfirmedInput,
  validateM1ConfirmedInput,
} from "../contracts/m1ConfirmedInput.js";
import {
  M1_FALLBACK_CONFIRMATION_MESSAGE,
  M1_INPUT_RESOLUTION_ERROR_CODES,
  validateM1InputResolution,
} from "../m1InputResolution.js";
import {
  M1_B1_S1_QUESTION,
  M1_B1_S1_VALID_DRAFT,
  M1_B1_S2_QUESTION,
  M1_B1_S2_VALID_DRAFT,
  M1_B1_S3_INVALID_DRAFT,
  M1_B1_S3_QUESTION,
} from "../fixtures/m1InputResolutionFixtures.js";
import {
  createM1InputResolutionFromUnderstandingResult,
  requestM1InputResolution,
} from "../m1ConfirmedInputFlow.js";
import {
  M1DecisionCoreError,
  assertM1ConfirmedInputGate,
  hashM1ConfirmedInput,
} from "../m1DecisionCore.js";
import { runM1InputUnderstanding } from "../runM1InputUnderstanding.js";

const clone = (value) => JSON.parse(JSON.stringify(value));
const asResult = (inputDraft) => ({
  mode: "m1_input_draft",
  inputDraft,
});

test("valid S1 runtime draft resolves READY_FOR_CONFIRMATION", () => {
  const resolution = createM1InputResolutionFromUnderstandingResult({
    question: M1_B1_S1_QUESTION,
    result: asResult(clone(M1_B1_S1_VALID_DRAFT)),
  });
  assert.equal(resolution.schema_version, "m1.input-resolution.v1");
  assert.equal(resolution.state, "READY_FOR_CONFIRMATION");
  assert.equal(resolution.original_question, M1_B1_S1_QUESTION);
  assert.equal(resolution.error, null);
  assert.equal(validateM1InputResolution(
    resolution,
    { expectedQuestion: M1_B1_S1_QUESTION },
  ).ok, true);
});

test("valid S2 runtime draft resolves READY_FOR_CONFIRMATION", () => {
  const resolution = createM1InputResolutionFromUnderstandingResult({
    question: M1_B1_S2_QUESTION,
    result: asResult(clone(M1_B1_S2_VALID_DRAFT)),
  });
  assert.equal(resolution.state, "READY_FOR_CONFIRMATION");
  assert.equal(
    resolution.confirmation_draft.groups.product_architecture
      .fields.primary_product_object.value,
    "CDU",
  );
});

test("previous S3 structural error resolves FALLBACK_CONFIRMATION_REQUIRED", () => {
  const resolution = createM1InputResolutionFromUnderstandingResult({
    question: M1_B1_S3_QUESTION,
    result: asResult(clone(M1_B1_S3_INVALID_DRAFT)),
  });
  assert.equal(resolution.state, "FALLBACK_CONFIRMATION_REQUIRED");
  assert.equal(
    resolution.error.code,
    M1_INPUT_RESOLUTION_ERROR_CODES.CONTRACT_INVALID,
  );
  assert.equal(resolution.error.user_message, M1_FALLBACK_CONFIRMATION_MESSAGE);
  assert.equal(resolution.original_question, M1_B1_S3_QUESTION);
  assert.equal(resolution.confirmation_draft.source.mode, "fallback");
  assert.notEqual(
    resolution.confirmation_draft.draft_id,
    M1_B1_S3_INVALID_DRAFT.draft_id,
  );
});

test("single leaf object resolves fallback without exposing it as a draft", () => {
  const resolution = createM1InputResolutionFromUnderstandingResult({
    question: M1_B1_S3_QUESTION,
    result: asResult({ value: "UPS", status: "EXPLICIT" }),
  });
  assert.equal(resolution.state, "FALLBACK_CONFIRMATION_REQUIRED");
  assert.equal(
    resolution.error.code,
    M1_INPUT_RESOLUTION_ERROR_CODES.MISSING_FIELDS,
  );
  assert.equal(resolution.confirmation_draft.schema_version, "m1.input-draft.v1");
});

test("missing draft field resolves fallback with a stable missing-fields code", () => {
  const missing = clone(M1_B1_S1_VALID_DRAFT);
  delete missing.groups.customer_region.fields.region;
  const resolution = createM1InputResolutionFromUnderstandingResult({
    question: M1_B1_S1_QUESTION,
    result: asResult(missing),
  });
  assert.equal(resolution.state, "FALLBACK_CONFIRMATION_REQUIRED");
  assert.equal(
    resolution.error.code,
    M1_INPUT_RESOLUTION_ERROR_CODES.MISSING_FIELDS,
  );
});

test("ASSUMED draft status resolves fallback with a stable invalid-status code", () => {
  const assumed = clone(M1_B1_S1_VALID_DRAFT);
  assumed.groups.customer_region.fields.region.draft_status = "ASSUMED";
  const resolution = createM1InputResolutionFromUnderstandingResult({
    question: M1_B1_S1_QUESTION,
    result: asResult(assumed),
  });
  assert.equal(resolution.state, "FALLBACK_CONFIRMATION_REQUIRED");
  assert.equal(
    resolution.error.code,
    M1_INPUT_RESOLUTION_ERROR_CODES.INVALID_STATUS,
  );
});

test("retryable Provider timeout resolves fallback after exactly one call", async () => {
  let providerCalls = 0;
  const result = await runM1InputUnderstanding({
    question: M1_B1_S1_QUESTION,
    workflowTransport: async () => {
      providerCalls += 1;
      return {
        status: "provider_error",
        reasonCode: "provider_timeout",
        retryable: true,
      };
    },
  });
  const resolution = createM1InputResolutionFromUnderstandingResult({
    question: M1_B1_S1_QUESTION,
    result,
  });
  assert.equal(providerCalls, 1);
  assert.equal(result.attemptCount, 1);
  assert.equal(resolution.state, "FALLBACK_CONFIRMATION_REQUIRED");
  assert.equal(
    resolution.error.code,
    M1_INPUT_RESOLUTION_ERROR_CODES.PROVIDER_TIMEOUT,
  );
});

test("invalid JSON response resolves fallback without a resubmission", async () => {
  let fetchCalls = 0;
  const resolution = await requestM1InputResolution({
    question: M1_B1_S1_QUESTION,
    fetchImpl: async () => {
      fetchCalls += 1;
      return {
        ok: true,
        json: async () => {
          throw new SyntaxError("test-only malformed JSON");
        },
      };
    },
  });
  assert.equal(fetchCalls, 1);
  assert.equal(resolution.state, "FALLBACK_CONFIRMATION_REQUIRED");
  assert.equal(
    resolution.error.code,
    M1_INPUT_RESOLUTION_ERROR_CODES.JSON_INVALID,
  );
  assert.doesNotMatch(resolution.error.user_message, /SyntaxError|malformed/);
});

test("public failure payload exposes only the stable error code", () => {
  const result = toPublicM1InputUnderstandingResult({
    mode: "m1_input_unavailable",
    reasonCode: "provider_timeout",
    attempts: [{
      errorMessage: "sensitive-test-provider-body",
      workflowRunId: "test-only-run-id",
    }],
    validationErrors: ["test-only-internal-stack-detail"],
  });
  assert.deepEqual(result, {
    mode: "m1_input_unavailable",
    reasonCode: M1_INPUT_RESOLUTION_ERROR_CODES.PROVIDER_TIMEOUT,
  });
  assert.doesNotMatch(
    JSON.stringify(result),
    /sensitive-test-provider-body|test-only-run-id|internal-stack/,
  );
});

test("user confirmation creates only m1.confirmed-input.v1", () => {
  const resolution = createM1InputResolutionFromUnderstandingResult({
    question: M1_B1_S1_QUESTION,
    result: asResult(clone(M1_B1_S1_VALID_DRAFT)),
  });
  const confirmed = createM1ConfirmedInput({
    draft: resolution.confirmation_draft,
    confirmedAt: "2026-07-29T12:00:00.000Z",
    confirmedInputId: "confirmed_b1f_s1",
  });
  assert.equal(confirmed.schema_version, "m1.confirmed-input.v1");
  assert.equal(confirmed.confirmation_status, "USER_CONFIRMED");
  assert.equal(validateM1ConfirmedInput(
    confirmed,
    { expectedQuestion: M1_B1_S1_QUESTION },
  ).ok, true);
});

test("user correction of a conflicting field is USER_CORRECTED", () => {
  const draft = clone(M1_B1_S1_VALID_DRAFT);
  draft.groups.customer_region.fields.region = {
    value: "conflicting",
    draft_status: "CONFLICTING",
  };
  draft.groups.constraints_unknowns.fields.contradictions = {
    value: ["region: 中国大陆 / 北美: 地区要求冲突"],
    draft_status: "CONFLICTING",
  };
  const confirmed = createM1ConfirmedInput({
    draft,
    editedValues: { region: "北美" },
  });
  assert.equal(confirmed.confirmation_status, "USER_CORRECTED");
  assert.equal(
    confirmed.groups.customer_region.fields.region.confirmed_status,
    "USER_CORRECTED",
  );
});

test("user can mark an unconfirmable field USER_MARKED_UNKNOWN", () => {
  const confirmed = createM1ConfirmedInput({
    draft: clone(M1_B1_S1_VALID_DRAFT),
    markedUnknownFields: ["target_customer"],
  });
  assert.equal(confirmed.confirmation_status, "USER_MARKED_UNKNOWN");
  assert.equal(
    confirmed.groups.customer_region.fields.target_customer.confirmed_status,
    "USER_MARKED_UNKNOWN",
  );
  assert.equal(
    confirmed.groups.customer_region.fields.target_customer.value,
    "unknown",
  );
});

test("unconfirmed resolution and draft remain blocked from Decision Core", () => {
  const resolution = createM1InputResolutionFromUnderstandingResult({
    question: M1_B1_S1_QUESTION,
    result: asResult(clone(M1_B1_S1_VALID_DRAFT)),
  });
  assert.throws(
    () => assertM1ConfirmedInputGate(resolution),
    (error) => error instanceof M1DecisionCoreError
      && error.code === "m1_decision_core_confirmed_schema_required",
  );
  assert.throws(
    () => assertM1ConfirmedInputGate(resolution.confirmation_draft),
    (error) => error instanceof M1DecisionCoreError
      && error.code === "m1_decision_core_draft_rejected",
  );
});

test("confirmed facts and statuses remain bound by the existing SHA-256", () => {
  const confirmed = createM1ConfirmedInput({
    draft: clone(M1_B1_S1_VALID_DRAFT),
    confirmedAt: "2026-07-29T12:00:00.000Z",
    confirmedInputId: "confirmed_b1f_hash",
  });
  const originalHash = hashM1ConfirmedInput(confirmed);
  assert.match(originalHash, /^[a-f0-9]{64}$/);
  const changed = clone(confirmed);
  changed.groups.customer_region.fields.region.value = "欧洲";
  changed.groups.customer_region.fields.region.confirmed_status = "USER_CORRECTED";
  assert.notEqual(hashM1ConfirmedInput(changed), originalHash);
});
