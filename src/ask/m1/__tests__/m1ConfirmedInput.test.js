import test from "node:test";
import assert from "node:assert/strict";

import {
  M1_CONFIRMED_INPUT_SCHEMA_VERSION,
  createM1ConfirmedInput,
  createM1InputDraft,
  validateM1ConfirmedInput,
} from "../contracts/m1ConfirmedInput.js";
import {
  buildM1FallbackContext,
  createM1DraftFromUnderstandingResult,
} from "../m1ConfirmedInputFlow.js";

const question = "为 CUSTOMER_X 在 REGION_ALPHA 比较 500kW UPS 与 800VDC，客户时间未知。";
const providerContext = () => ({
  schema_version: "m1.input.v1",
  context_id: "ctx_confirmed_input",
  raw_user_question: question,
  decision_intent: "ARCHITECTURE_CHOICE",
  primary_product_object: "POWER_ARCHITECTURE_DECISION",
  architecture_alternatives: ["UPS", "800VDC"],
  application_scenario: "unknown",
  target_customer: "CUSTOMER_X",
  region: "REGION_ALPHA",
  power_or_system_scope: "500kW",
  investment_or_product_stage: "evaluation",
  target_timing: "unknown",
  critical_constraints: [],
  stated_evidence: [],
  assumptions: [],
  unknowns: ["application_scenario", "target_timing"],
  contradictions: [],
  clarification_required: false,
  clarification_question: null,
  clarification_reason: null,
  recognition_confidence: 0.84,
  field_provenance: {
    decision_intent: { status: "INFERRED" },
    primary_product_object: { status: "INFERRED" },
    architecture_alternatives: { status: "EXPLICIT" },
    application_scenario: { status: "UNKNOWN" },
    target_customer: { status: "EXPLICIT" },
    region: { status: "EXPLICIT" },
    power_or_system_scope: { status: "EXPLICIT" },
    investment_or_product_stage: { status: "INFERRED" },
    target_timing: { status: "UNKNOWN" },
    critical_constraints: { status: "UNKNOWN" },
  },
});

test("M1ConfirmedInput v1 preserves the original question and all six exact groups", () => {
  const draft = createM1InputDraft({ question, inputContext: providerContext() });
  const confirmed = createM1ConfirmedInput({
    draft,
    confirmedAt: "2026-07-24T12:00:00.000Z",
    confirmedInputId: "confirmed_test",
  });
  assert.equal(confirmed.schema_version, M1_CONFIRMED_INPUT_SCHEMA_VERSION);
  assert.equal(confirmed.original_question, question);
  assert.deepEqual(Object.keys(confirmed.groups), [
    "decision_type",
    "product_architecture",
    "application_scenario",
    "customer_region",
    "power_system_scope",
    "constraints_unknowns",
  ]);
  assert.deepEqual(validateM1ConfirmedInput(confirmed, { expectedQuestion: question }), {
    ok: true,
    errors: [],
  });
});

test("corrections and user-marked unknowns receive only confirmed statuses", () => {
  const draft = createM1InputDraft({ question, inputContext: providerContext() });
  const confirmed = createM1ConfirmedInput({
    draft,
    editedValues: { region: "REGION_BETA" },
    markedUnknownFields: ["power_or_system_scope"],
  });
  assert.equal(confirmed.confirmation_status, "USER_CORRECTED");
  assert.equal(
    confirmed.groups.customer_region.fields.region.confirmed_status,
    "USER_CORRECTED",
  );
  assert.equal(
    confirmed.groups.power_system_scope.fields.power_or_system_scope.confirmed_status,
    "USER_MARKED_UNKNOWN",
  );
  assert.equal(
    confirmed.groups.power_system_scope.fields.power_or_system_scope.value,
    "unknown",
  );
  assert.equal(validateM1ConfirmedInput(confirmed, { expectedQuestion: question }).ok, true);
});

test("contract fails closed on question replacement, extra groups, or invalid status", () => {
  const draft = createM1InputDraft({ question, inputContext: providerContext() });
  const replaced = createM1ConfirmedInput({ draft });
  replaced.original_question = "different";
  assert.ok(validateM1ConfirmedInput(replaced, { expectedQuestion: question }).errors.includes(
    "original_question_not_preserved",
  ));

  const extraGroup = createM1ConfirmedInput({ draft });
  extraGroup.groups.decision_resolution = { fields: {} };
  assert.ok(validateM1ConfirmedInput(extraGroup).errors.includes("confirmation_groups_not_exact"));

  const badStatus = createM1ConfirmedInput({ draft });
  badStatus.groups.decision_type.fields.decision_intent.confirmed_status = "PROVIDER_CONFIRMED";
  assert.ok(validateM1ConfirmedInput(badStatus).errors.includes(
    "decision_intent_confirmed_status_invalid",
  ));
});

test("Provider failure creates a lightweight draft without inventing absent context", () => {
  const fallbackQuestion = "为 CUSTOMER_X 在 REGION_ALPHA 评估 500kW UPS，时间还不知道。";
  const context = buildM1FallbackContext(fallbackQuestion);
  const draft = createM1DraftFromUnderstandingResult({
    question: fallbackQuestion,
    result: { mode: "m1_input_unavailable", reasonCode: "provider_timeout" },
  });
  assert.equal(draft.source.mode, "fallback");
  assert.equal(draft.source.reason_code, "provider_timeout");
  assert.equal(context.decision_intent, "PRODUCT_FIT_ASSESSMENT");
  assert.equal(context.primary_product_object, "UPS");
  assert.equal(context.target_customer, "CUSTOMER_X");
  assert.equal(context.region, "REGION_ALPHA");
  assert.equal(context.power_or_system_scope, "500kW");
  assert.equal(draft.groups.application_scenario.fields.application_scenario.draft_status, "UNKNOWN");
  assert.equal(draft.groups.constraints_unknowns.fields.target_timing.value, "unknown");
});
