import test from "node:test";
import assert from "node:assert/strict";

import {
  M1_ARCHITECTURE_DECISION_SUBJECT,
  M1_INPUT_MATERIAL_FIELDS,
  classifyM1UnknownProvenance,
  parseAndValidateM1InputContext,
  validateM1InputContext,
} from "../contracts/m1InputContext.js";
import { evaluateM1ProfessionalEligibility } from "../m1ProfessionalEligibility.js";
import {
  createM1WorkflowTransport,
  fetchM1WorkflowAppInfo,
} from "../m1WorkflowTransport.js";
import { runM1InputUnderstanding } from "../runM1InputUnderstanding.js";

const question = "合成样例：是否评估模块化UPS并比较800VDC？";
const validContext = () => ({
  schema_version: "m1.input.v1",
  context_id: "ctx_synthetic",
  raw_user_question: question,
  decision_intent: "ARCHITECTURE_CHOICE",
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
  decision_intent: "ARCHITECTURE_CHOICE",
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

  const legacyIntent = validContext();
  legacyIntent.decision_intent = "architecture_choice";
  legacyIntent.field_provenance.decision_intent.value = "architecture_choice";
  assert.ok(validateM1InputContext(legacyIntent).errors.includes("decision_intent_not_canonical"));
});

test("explicit UNKNOWN provenance may preserve the user's unavailable statement", () => {
  const explicitUnknown = validContext();
  explicitUnknown.region = "unknown";
  explicitUnknown.field_provenance.region = {
    value: "unknown",
    status: "UNKNOWN",
    source_span: ["区域暂时无法提供"],
    confidence: 1,
  };
  assert.equal(validateM1InputContext(explicitUnknown).ok, true);
  assert.equal(classifyM1UnknownProvenance(explicitUnknown.field_provenance.region), "EXPLICIT_UNKNOWN");

  const omittedUnknown = validContext();
  omittedUnknown.field_provenance.region.source_span = [];
  assert.equal(validateM1InputContext(omittedUnknown).ok, true);
  assert.equal(classifyM1UnknownProvenance(omittedUnknown.field_provenance.region), "OMITTED_UNKNOWN");

  const fabricatedUnknown = validContext();
  fabricatedUnknown.power_or_system_scope = "大功率";
  fabricatedUnknown.field_provenance.power_or_system_scope = {
    value: "大功率",
    status: "UNKNOWN",
    source_span: ["功率还没定"],
    confidence: 1,
  };
  assert.ok(validateM1InputContext(fabricatedUnknown).errors.includes(
    "field_provenance.power_or_system_scope.unknown_value_not_canonical",
  ));

  const conflicting = validContext();
  conflicting.region = "conflicting";
  conflicting.field_provenance.region = {
    value: "conflicting",
    status: "CONFLICTING",
    source_span: ["REGION_ALPHA", "REGION_BETA"],
    confidence: 1,
  };
  assert.equal(validateM1InputContext(conflicting).ok, true);
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
  assert.equal(result.attemptCount, 1);
});

test("M1 eligibility is independent from clarification and accepts a canonical architecture subject", () => {
  const needsClarification = validContext();
  needsClarification.clarification_required = true;
  needsClarification.clarification_question = "目标应用场景是什么？";
  needsClarification.clarification_reason = "应用场景会实质影响产品判断。";
  assert.equal(evaluateM1ProfessionalEligibility(needsClarification).eligible, true);

  const architectureDecision = validContext();
  architectureDecision.primary_product_object = M1_ARCHITECTURE_DECISION_SUBJECT;
  architectureDecision.field_provenance.primary_product_object.value = M1_ARCHITECTURE_DECISION_SUBJECT;
  architectureDecision.architecture_alternatives = ["UPS", "BBU", "800VDC"];
  architectureDecision.field_provenance.architecture_alternatives.value = ["UPS", "BBU", "800VDC"];
  assert.equal(evaluateM1ProfessionalEligibility(architectureDecision).eligible, true);
});

test("M1 eligibility rejects a normalized out-of-scope product and intent", () => {
  assert.equal(evaluateM1ProfessionalEligibility(validContext()).eligible, true);
  const outOfScope = validContext();
  outOfScope.primary_product_object = "CDU";
  outOfScope.field_provenance.primary_product_object.value = "CDU";
  outOfScope.decision_intent = "OUT_OF_SCOPE";
  outOfScope.field_provenance.decision_intent.value = "OUT_OF_SCOPE";
  assert.equal(evaluateM1ProfessionalEligibility(outOfScope).eligible, false);
});

test("retryable Provider failure is not automatically retried", async () => {
  const requests = [];
  const result = await runM1InputUnderstanding({
    question,
    workflowTransport: async (request) => {
      requests.push(request);
      return {
        status: "provider_error",
        reasonCode: "provider_timeout",
        retryable: true,
        httpStatus: 503,
      };
    },
  });
  assert.equal(result.mode, "m1_input_unavailable");
  assert.equal(result.reasonCode, "provider_timeout");
  assert.equal(result.attemptCount, 1);
  assert.equal(requests.length, 1);
  assert.equal(result.attempts[0].httpStatus, 503);
});

test("semantic validation failures and non-retryable provider failures are not retried", async () => {
  let semanticCalls = 0;
  const invalid = validContext();
  invalid.decision_intent = "not-canonical";
  const semanticResult = await runM1InputUnderstanding({
    question,
    workflowTransport: async () => {
      semanticCalls += 1;
      return {
        status: "ready",
        workflowRunId: "invalid-run",
        workflowId: "synthetic-workflow",
        outputs: { m1_input_context: JSON.stringify(invalid) },
      };
    },
  });
  assert.equal(semanticResult.reasonCode, "input_context_invalid");
  assert.equal(semanticCalls, 1);

  let providerCalls = 0;
  const providerResult = await runM1InputUnderstanding({
    question,
    workflowTransport: async () => {
      providerCalls += 1;
      return {
        status: "provider_error",
        reasonCode: "provider_http_error",
        retryable: false,
        httpStatus: 401,
      };
    },
  });
  assert.equal(providerResult.reasonCode, "provider_http_error");
  assert.equal(providerResult.attemptCount, 1);
  assert.equal(providerCalls, 1);
});

test("an unexpected published workflow version is rejected without a retry", async () => {
  const result = await runM1InputUnderstanding({
    question,
    expectedWorkflowId: "expected-published-version",
    workflowTransport: async () => ({
      status: "ready",
      workflowRunId: "unexpected-run",
      workflowId: "unexpected-published-version",
      outputs: { m1_input_context: JSON.stringify(validContext()) },
    }),
  });
  assert.equal(result.mode, "m1_input_unavailable");
  assert.equal(result.reasonCode, "workflow_identity_mismatch");
  assert.equal(result.attemptCount, 1);
  assert.equal(result.expectedWorkflowId, "expected-published-version");
});

test("transport preserves deterministic HTTP validation diagnostics", async () => {
  const transport = createM1WorkflowTransport({
    apiBaseUrl: "https://dify.invalid/v1",
    apiKey: "synthetic-key",
    fetchImpl: async () => ({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({
        code: "invalid_param",
        message: "raw_user_question in input form must be less than 256 characters",
      }),
    }),
  });
  const result = await transport({ inputs: { raw_user_question: question }, response_mode: "blocking" });
  assert.equal(result.reasonCode, "provider_http_error");
  assert.equal(result.httpStatus, 400);
  assert.equal(result.errorCode, "invalid_param");
  assert.match(result.errorMessage, /less than 256 characters/);
});

test("dedicated workflow app identity is read through the same API credential boundary", async () => {
  const result = await fetchM1WorkflowAppInfo({
    apiBaseUrl: "https://dify.invalid/v1",
    apiKey: "synthetic-key",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        name: "DCPI M1 Professional Demo MVP",
        mode: "workflow",
        description: "synthetic",
        tags: ["m1"],
      }),
    }),
  });
  assert.deepEqual(result, {
    status: "ready",
    appInfo: {
      name: "DCPI M1 Professional Demo MVP",
      mode: "workflow",
      description: "synthetic",
      tags: ["m1"],
    },
  });
});
