import test from "node:test";
import assert from "node:assert/strict";

import { renderAskReportState } from "../renderer/renderAskReportState.js";

const fullResponse = {
  decisionSummary: "Structured report",
  fiveLookThreeDefine: { defineDirection: "Direction" },
  technicalRoadmap: [{ phase: "P1" }],
  doorstepGate: { gateName: "gate", status: "pass" },
  readinessGate: { gateName: "ready", status: "pass" },
  risks: ["risk"],
  evidenceTrace: [{ claimId: "clm_001", sourceIds: ["src_001"] }],
  pageTrace: [{ pageContextHash: "ctx_001" }],
  freshnessNotice: "current",
  sourceRequiredItems: ["technical_parameter"],
};

test("full_report state is exclusive", () => {
  const state = renderAskReportState({
    validatorReport: { validatorStatus: "pass", renderMode: "full_report" },
    response: fullResponse,
  });

  assert.equal(state.renderMode, "full_report");
  assert.deepStrictEqual(state.allowedSections.includes("evidenceTrace"), true);
  assert.deepStrictEqual(state.forbiddenSections.includes("fiveLookThreeDefine"), false);
});

test("warning_report state is exclusive", () => {
  const state = renderAskReportState({
    validatorReport: { validatorStatus: "pass_with_warnings", renderMode: "warning_report", warnings: ["freshness warning"] },
    response: fullResponse,
  });

  assert.equal(state.renderMode, "warning_report");
  assert.deepStrictEqual(state.allowedSections.includes("warnings"), true);
  assert.deepStrictEqual(state.payload.warnings, ["freshness warning"]);
});

test("warning_report keeps validator warnings visible when report metadata is incomplete", () => {
  const state = renderAskReportState({
    validatorReport: { validatorStatus: "pass_with_warnings", renderMode: "warning_report", warnings: ["freshness warning"] },
    response: {
      decisionSummary: "Structured report",
      evidenceTrace: [],
      pageTrace: [],
      freshnessNotice: "",
    },
  });

  assert.equal(state.renderMode, "warning_report");
  assert.deepStrictEqual(state.payload.warnings, [
    "freshness warning",
    "required report metadata is incomplete",
  ]);
});

test("source_required_report state is exclusive", () => {
  const state = renderAskReportState({
    validatorReport: {
      validatorStatus: "blocked_source_required",
      renderMode: "source_required_report",
      missingEvidence: [{ claimId: "clm_001", requiredField: "sourceIds" }],
    },
    response: fullResponse,
  });

  assert.equal(state.renderMode, "source_required_report");
  assert.deepStrictEqual(state.allowedSections.includes("missingEvidence"), true);
  assert.deepStrictEqual(state.forbiddenSections.includes("technicalRoadmap"), true);
});

test("blocked_report state is exclusive", () => {
  const state = renderAskReportState({
    validatorReport: {
      validatorStatus: "blocked_schema_error",
      renderMode: "blocked_report",
      blockingReasons: ["schema failure"],
    },
    response: fullResponse,
  });

  assert.equal(state.renderMode, "blocked_report");
  assert.deepStrictEqual(state.allowedSections.includes("blockingReasons"), true);
  assert.deepStrictEqual(state.forbiddenSections.includes("doorstepGate"), true);
});

test("provider_error_card state is exclusive", () => {
  const state = renderAskReportState({
    validatorReport: { validatorStatus: "provider_error", blockingReasons: ["provider unavailable"] },
    response: fullResponse,
  });

  assert.equal(state.renderMode, "provider_error_card");
  assert.deepStrictEqual(state.forbiddenSections.includes("technicalRoadmap"), true);
});

test("provider_timeout_card state is exclusive", () => {
  const state = renderAskReportState({
    validatorReport: { validatorStatus: "provider_timeout", blockingReasons: ["provider timeout"] },
    response: fullResponse,
  });

  assert.equal(state.renderMode, "provider_timeout_card");
  assert.deepStrictEqual(state.forbiddenSections.includes("risks"), true);
});

test("data_refreshed_regenerate_required_card state is exclusive", () => {
  const state = renderAskReportState({
    validatorReport: {
      validatorStatus: "blocked_page_context_mismatch",
      renderMode: "blocked_report",
      pageContextStatus: "mismatch",
      blockingReasons: ["pageTrace echo mismatch"],
    },
    response: fullResponse,
  });

  assert.equal(state.renderMode, "data_refreshed_regenerate_required_card");
  assert.deepStrictEqual(state.forbiddenSections.includes("fiveLookThreeDefine"), true);
});

test("user_input_required_card state is exclusive", () => {
  const state = renderAskReportState({
    validatorReport: {
      validatorStatus: "user_input_required",
      renderMode: "user_input_required_card",
      blockingReasons: ["customerSegment is required"],
    },
    response: fullResponse,
  });

  assert.equal(state.renderMode, "user_input_required_card");
  assert.deepStrictEqual(state.forbiddenSections.includes("readinessGate"), true);
});
