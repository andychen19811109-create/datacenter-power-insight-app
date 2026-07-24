import test from "node:test";
import assert from "node:assert/strict";

import {
  M1_INPUT_MATERIAL_FIELDS,
  parseAndValidateM1InputContext,
  validateM1InputContext,
} from "../contracts/m1InputContext.js";
import { evaluateM1ProfessionalEligibility } from "../m1ProfessionalEligibility.js";
import { runM1InputUnderstanding } from "../runM1InputUnderstanding.js";

const question = "合成样例：是否评估模块化UPS并比较800VDC？";
const validContext = () => ({
  schema_version: "m1.input.v1",
  context_id: "ctx_synthetic",
  raw_user_question: question,
  decision_intent: "architecture_choice",
  primary_product_object: "模块化UPS",
  architecture_alternatives: ["800VDC"],
  application_scenario: "unknown",
  target_customer: "unknown",
  region: "unknown",
  power_or_system_scope: "unknown",
  investment_or_product_stage: "evaluation",
  target_timing: "unknown",
  critical_constraints: [],
  stated_evidence: [],
  assumptions: [],
  unknowns: ["application_scenario", "target_customer", "region", "power_or_system_scope", "target_timing"],
  contradictions: [],
  clarification_required: false,
  clarification_question: null,
  clarification_reason: null,
  recognition_confidence: 0.9,
  field_provenance: Object.fromEntries(M1_INPUT_MATERIAL_FIELDS.map((field) => [
    field,
    {
      value: ["architecture_alternatives", "critical_constraints"].includes(field)
        ? validContextArrayValue(field)
        : validContextScalarValue(field),
      status: ["application_scenario", "target_customer", "region", "power_or_system_scope", "target_timing", "critical_constraints"].includes(field)
        ? "UNKNOWN"
        : "EXPLICIT",
      source_span: ["application_scenario", "target_customer", "region", "power_or_system_scope", "target_timing", "critical_constraints"].includes(field)
        ? []
        : ["合成样例"],
      confidence: ["application_scenario", "target_customer", "region", "power_or_system_scope", "target_timing", "critical_constraints"].includes(field)
        ? 0
        : 0.9,
    },
  ])),
});

const validContextArrayValue = (field) => field === "architecture_alternatives" ? ["800VDC"] : [];
const validContextScalarValue = (field) => ({
  decision_intent: "architecture_choice",
  primary_product_object: "模块化UPS",
  application_scenario: "unknown",
  target_customer: "unknown",
  region: "unknown",
  power_or_system_scope: "unknown",
  investment_or_product_stage: "evaluation",
  target_timing: "unknown",
})[field];

test("M1InputContext validates the versioned exact contract and provenance", () => {
  const result = validateM1InputContext(validContext(), { expectedQuestion: question });
  assert.deepEqual(result, { ok: true, errors: [] });
});

test("provider reasoning wrapper is removed before strict JSON parsing", () => {
  const result = parseAndValidateM1InputContext(`<think>provider reasoning</think>${JSON.stringify(validContext())}`, {
    expectedQuestion: question,
  });
  assert.equal(result.ok, true);
});

test("raw wording, contradictions, provenance, and clarification invariants fail closed", () => {
  const overwritten = validContext();
  overwritten.raw_user_question = "different";
  assert.equal(validateM1InputContext(overwritten, { expectedQuestion: question }).ok, false);

  const badContradiction = validContext();
  badContradiction.contradictions = [{ field: "region", values: ["A"], explanation: "" }];
  assert.equal(validateM1InputContext(badContradiction).ok, false);

  const badClarification = validContext();
  badClarification.clarification_required = false;
  badClarification.clarification_question = "extra question";
  assert.equal(validateM1InputContext(badClarification).ok, false);
});

test("workflow adapter returns a normalized context without consulting legacy parser or UI defaults", async () => {
  const result = await runM1InputUnderstanding({
    question,
    workflowTransport: async (request) => {
      assert.deepEqual(request.inputs, { raw_user_question: question });
      return {
        status: "ready",
        workflowRunId: "synthetic-run",
        workflowId: "synthetic-workflow",
        outputs: { m1_input_context: JSON.stringify(validContext()) },
      };
    },
  });
  assert.equal(result.mode, "m1_input_context");
  assert.equal(result.inputContext.region, "unknown");
});

test("M1 eligibility consumes M1InputContext and rejects an out-of-scope normalized product", () => {
  assert.equal(evaluateM1ProfessionalEligibility(validContext()).eligible, true);
  const outOfScope = validContext();
  outOfScope.primary_product_object = "CDU";
  outOfScope.field_provenance.primary_product_object.value = "CDU";
  assert.equal(evaluateM1ProfessionalEligibility(outOfScope).eligible, false);
});
