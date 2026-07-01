import test from "node:test";
import assert from "node:assert/strict";

import { buildAskRequest } from "../orchestrator/buildAskRequest.js";

const buildBaseInput = () => ({
  currentPageRoute: "/technology",
  currentPageModule: "technology",
  userQuestion: "液冷 CDU 技术路线演进与准入门槛如何规划？",
  taskIntent: "technical_roadmap_and_entry_gate",
  selectedFilters: {
    productFamily: "liquid_cooling_cdu",
    customerSegment: "AIDC_cloud",
    region: "CN",
    architectureLayer: "facility_cooling",
  },
  productPlanningCard: {
    id: "ppc_cdu_tech_gate",
    version: "v1",
    stateHash: "ppc_hash_001",
    productFamily: "liquid_cooling_cdu",
    customerSegment: "AIDC_cloud",
    region: "CN",
    architectureLayer: "facility_cooling",
  },
  pageContext: {
    pageContextHash: "ctx_hash_001",
  },
  pageContextHash: "ctx_hash_001",
});

test("broad question with insufficient context returns user_input_required", () => {
  const input = buildBaseInput();
  input.userQuestion = "这个方向怎么规划？";
  input.selectedFilters.productFamily = "";
  input.productPlanningCard.productFamily = "";

  const result = buildAskRequest(input);
  assert.equal(result.validatorStatus, "user_input_required");
  assert.equal(result.renderMode, "user_input_required_card");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.blockingReasons.includes("productFamily is required"), true);
});

test("missing customer segment returns user_input_required", () => {
  const input = buildBaseInput();
  input.selectedFilters.customerSegment = "";

  const result = buildAskRequest(input);
  assert.equal(result.validatorStatus, "user_input_required");
  assert.equal(result.renderMode, "user_input_required_card");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.blockingReasons.includes("customerSegment is required"), true);
});

test("missing region returns user_input_required", () => {
  const input = buildBaseInput();
  input.selectedFilters.region = "";

  const result = buildAskRequest(input);
  assert.equal(result.validatorStatus, "user_input_required");
  assert.equal(result.renderMode, "user_input_required_card");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.blockingReasons.includes("region is required"), true);
});

test("missing technical objective returns user_input_required", () => {
  const input = buildBaseInput();
  input.selectedFilters.architectureLayer = "";

  const result = buildAskRequest(input);
  assert.equal(result.validatorStatus, "user_input_required");
  assert.equal(result.renderMode, "user_input_required_card");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.blockingReasons.includes("technicalObjective is required"), true);
});

test("missing sourceRefs / claimRefs with attempted factual claim returns source_required", () => {
  const input = buildBaseInput();
  input.userQuestion = "最新液冷 CDU 技术参数和发布时间是什么？";

  const result = buildAskRequest(input);
  assert.equal(result.validatorStatus, "source_required");
  assert.equal(result.renderMode, "source_required_report");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.blockingReasons.includes("factual claim requires sourceRefs or claimRefs"), true);
});

test("ambiguous product family returns user_input_required", () => {
  const input = buildBaseInput();
  input.userQuestion = "CDU 和 HVDC 哪个更适合这里？";
  input.selectedFilters.productFamily = "";
  input.productPlanningCard.productFamily = "";

  const result = buildAskRequest(input);
  assert.equal(result.validatorStatus, "user_input_required");
  assert.equal(result.renderMode, "user_input_required_card");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.blockingReasons.includes("ambiguous product family"), true);
});

