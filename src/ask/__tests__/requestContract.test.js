import test from "node:test";
import assert from "node:assert/strict";

import { validateRequestContract } from "../contracts/requestContract.js";

const buildValidRequest = () => ({
  schemaVersion: "1.0.0",
  requestId: "req-001",
  userQuestion: "液冷 CDU 技术路线演进与准入门槛如何规划？",
  taskIntent: "technical_roadmap_and_entry_gate",
  currentPageRoute: "/technology",
  currentPageModule: "technology",
  pageContextHash: "ctx_001",
  timestamp: "2026-07-01T00:00:00Z",
  responseFormat: "structured_json_only",
  selectedFilters: {
    productFamily: "liquid_cooling_cdu",
    customerSegment: "AIDC_cloud",
    region: "CN",
    architectureLayer: "facility_cooling",
  },
  productPlanningCard: {
    id: "ppc_cdu_tech_gate",
    version: "v1",
    stateHash: "ppc_001",
    productFamily: "liquid_cooling_cdu",
    customerSegment: "AIDC_cloud",
    region: "CN",
    architectureLayer: "facility_cooling",
  },
  pageContext: {
    pageContextHash: "ctx_001",
  },
});

test("valid request passes", () => {
  const result = validateRequestContract(buildValidRequest());
  assert.equal(result.ok, true);
  assert.equal(result.validatorStatus, "pass");
  assert.equal(result.renderMode, "full_report");
  assert.equal(result.allowedToRender, true);
  assert.deepEqual(result.blockingReasons, []);
});

test("missing pageContextHash blocks", () => {
  const request = buildValidRequest();
  request.pageContextHash = "";

  const result = validateRequestContract(request);
  assert.equal(result.ok, false);
  assert.equal(result.validatorStatus, "blocked_page_context_missing");
  assert.equal(result.renderMode, "blocked_report");
  assert.equal(result.allowedToRender, false);
  assert.deepEqual(result.blockingReasons, ["pageContextHash is required"]);
});

test("missing ProductPlanningCard.stateHash blocks", () => {
  const request = buildValidRequest();
  request.productPlanningCard.stateHash = "";

  const result = validateRequestContract(request);
  assert.equal(result.validatorStatus, "blocked_page_context_missing");
  assert.equal(result.renderMode, "blocked_report");
  assert.equal(result.allowedToRender, false);
  assert.deepEqual(result.blockingReasons, ["productPlanningCard.stateHash is required"]);
});

test("empty userQuestion blocks", () => {
  const request = buildValidRequest();
  request.userQuestion = " ";

  const result = validateRequestContract(request);
  assert.equal(result.validatorStatus, "blocked_schema_error");
  assert.equal(result.renderMode, "blocked_report");
  assert.equal(result.allowedToRender, false);
  assert.deepEqual(result.blockingReasons, ["userQuestion is required"]);
});

test("missing taskIntent blocks", () => {
  const request = buildValidRequest();
  request.taskIntent = "";

  const result = validateRequestContract(request);
  assert.equal(result.validatorStatus, "blocked_schema_error");
  assert.equal(result.renderMode, "blocked_report");
  assert.equal(result.allowedToRender, false);
  assert.deepEqual(result.blockingReasons, ["taskIntent is required"]);
});

test("pageContextHash mismatch blocks", () => {
  const request = buildValidRequest();
  request.pageContext.pageContextHash = "ctx_999";

  const result = validateRequestContract(request);
  assert.equal(result.validatorStatus, "blocked_page_context_mismatch");
  assert.equal(result.renderMode, "blocked_report");
  assert.equal(result.allowedToRender, false);
  assert.deepEqual(result.blockingReasons, ["pageContext.pageContextHash must match top-level pageContextHash"]);
});

