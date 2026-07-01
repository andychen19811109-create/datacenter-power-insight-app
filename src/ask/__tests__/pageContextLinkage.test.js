import test from "node:test";
import assert from "node:assert/strict";

import { validateAskResponse } from "../validator/validateAskResponse.js";

const buildValidRequest = () => ({
  schemaVersion: "1.0.0",
  requestId: "req-ctx-001",
  userQuestion: "液冷 CDU 技术路线演进与准入门槛如何规划？",
  taskIntent: "technical_roadmap_and_entry_gate",
  currentPageRoute: "/technology",
  currentPageModule: "technology",
  pageContextHash: "ctx_hash_001",
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
    stateHash: "ppc_hash_001",
    productFamily: "liquid_cooling_cdu",
    customerSegment: "AIDC_cloud",
    region: "CN",
    architectureLayer: "facility_cooling",
  },
  pageContext: {
    pageContextHash: "ctx_hash_001",
  },
});

const buildValidResponse = () => ({
  schemaVersion: "1.0.0",
  responseId: "resp-ctx-001",
  taskIntent: "technical_roadmap_and_entry_gate",
  resolvedObjects: [{ objectId: "liquid_cooling_cdu", objectType: "product", objectName: "CDU" }],
  entityRoles: [{ entityId: "liquid_cooling_cdu", role: "primary_product_object" }],
  decisionSummary: "CDU roadmap should focus on facility cooling validation.",
  fiveLookThreeDefine: {
    lookMarket: "AIDC cooling demand is growing with high-density racks.",
    lookCustomer: "Cloud AIDC users need validated facility cooling stability.",
    lookCompetition: "Vendor releases show accelerating CDU platformization.",
    lookTechnology: "CDU architecture choices depend on facility cooling interfaces.",
    lookSelf: "Current product readiness requires phased validation.",
    defineDirection: "Focus on technology roadmap and entry gate alignment.",
    defineProduct: "Prioritize CDU variants for facility cooling scenarios.",
    definePace: "Phase by validation gate and readiness milestone.",
  },
  technicalRoadmap: [{ phase: "P1", year: 2027, milestone: "Validate CDU thermal loop" }],
  doorstepGate: { gateName: "facility_cooling_interface", status: "pass" },
  readinessGate: { gateName: "pilot_validation", status: "pass" },
  risks: ["Vendor interoperability must remain source-bound."],
  missingInputs: [],
  sourceRequiredItems: [],
  evidenceTrace: [{ claimId: "clm-tech-001", sourceIds: ["src-tech-001"] }],
  pageTrace: [{
    currentPageRoute: "/technology",
    currentPageModule: "technology",
    pageContextHash: "ctx_hash_001",
    productPlanningCardId: "ppc_cdu_tech_gate",
    productPlanningCardVersion: "v1",
    productPlanningCardStateHash: "ppc_hash_001",
  }],
  freshnessNotice: "current",
  validatorHints: [],
});

const expandedSourcePack = [{
  sourceId: "src-tech-001",
  title: "CDU Architecture Guide",
  organization: "Vendor A",
  sourceTier: "L4_vendor_official",
  publicationDate: "2026-05-01",
  lastVerifiedDate: "2026-06-20",
  freshnessStatus: "current",
}];

const expandedClaimPack = [{
  claimId: "clm-tech-001",
  claimText: "CDU roadmap requires facility cooling validation.",
  objectId: "liquid_cooling_cdu",
  claimType: "technical_parameter",
  sourceIds: ["src-tech-001"],
  freshnessStatus: "current",
}];

test("route/module mismatch blocks", () => {
  const request = buildValidRequest();
  request.currentPageModule = "market";

  const result = validateAskResponse({
    request,
    providerResponse: buildValidResponse(),
    expandedSourcePack,
    expandedClaimPack,
  });

  assert.equal(result.validatorStatus, "blocked_page_context_mismatch");
  assert.equal(result.renderMode, "blocked_report");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.blockingReasons.includes("VAL_ERR_012"), true);
});

test("stateHash mismatch blocks", () => {
  const response = buildValidResponse();
  response.pageTrace[0].productPlanningCardStateHash = "ppc_hash_999";

  const result = validateAskResponse({
    request: buildValidRequest(),
    providerResponse: response,
    expandedSourcePack,
    expandedClaimPack,
  });

  assert.equal(result.validatorStatus, "blocked_page_context_mismatch");
  assert.equal(result.pageContextStatus, "mismatch");
  assert.equal(result.allowedToRender, false);
  assert.deepEqual(result.blockingReasons, ["pageTrace echo mismatch"]);
});

test("pageTrace echo mismatch blocks", () => {
  const response = buildValidResponse();
  response.pageTrace[0].pageContextHash = "ctx_hash_999";

  const result = validateAskResponse({
    request: buildValidRequest(),
    providerResponse: response,
    expandedSourcePack,
    expandedClaimPack,
  });

  assert.equal(result.validatorStatus, "blocked_page_context_mismatch");
  assert.equal(result.allowedToRender, false);
  assert.deepEqual(result.blockingReasons, ["pageTrace echo mismatch"]);
});

test("cross-page conclusion drift blocks", () => {
  const response = buildValidResponse();
  response.previousTrackLeakage = ["hvdc_market_context"];

  const result = validateAskResponse({
    request: buildValidRequest(),
    providerResponse: response,
    expandedSourcePack,
    expandedClaimPack,
  });

  assert.equal(result.validatorStatus, "blocked_policy_violation");
  assert.equal(result.renderMode, "blocked_report");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.blockingReasons.includes("VAL_ERR_010"), true);
  assert.deepEqual(result.previousTrackLeakage, ["hvdc_market_context"]);
});

test("Ask cannot behave as detached chatbot", () => {
  const response = buildValidResponse();
  response.pageTrace = [];

  const result = validateAskResponse({
    request: buildValidRequest(),
    providerResponse: response,
    expandedSourcePack,
    expandedClaimPack,
  });

  assert.equal(result.validatorStatus, "blocked_page_context_missing");
  assert.equal(result.renderMode, "blocked_report");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.blockingReasons.includes("pageTrace is required"), true);
});

