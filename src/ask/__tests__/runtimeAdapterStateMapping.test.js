import test from "node:test";
import assert from "node:assert/strict";

import { VALIDATOR_STATUS } from "../contracts/validatorStatus.js";
import { runAskPipelineAdapter } from "../runtime/runAskPipelineAdapter.js";

const buildRuntimeInput = (overrides = {}) => ({
  consumerModule: "ask_power_insight",
  currentPageRoute: "/technology",
  currentPageModule: "technology",
  question: "What is the current CDU roadmap?",
  taskIntent: "technical_roadmap_and_entry_gate",
  selectedFilters: {
    productFamily: "liquid_cooling_cdu",
    customerSegment: "AIDC_cloud",
    region: "CN",
    architectureLayer: "facility_cooling",
  },
  productPlanningCard: {
    id: "ppc_001",
    version: "v1",
    stateHash: "ppc_hash_001",
    productFamily: "liquid_cooling_cdu",
    customerSegment: "AIDC_cloud",
    region: "CN",
    architectureLayer: "facility_cooling",
  },
  providerResponse: {
    schemaVersion: "1.0.0",
    responseId: "resp_001",
    taskIntent: "technical_roadmap_and_entry_gate",
    resolvedObjects: [{ objectId: "liquid_cooling_cdu", objectType: "product" }],
    entityRoles: [{ entityId: "liquid_cooling_cdu", role: "primary_product_object" }],
    decisionSummary: "CDU roadmap should remain evidence-bound.",
    fiveLookThreeDefine: {
      lookMarket: "AIDC demand continues.",
      lookCustomer: "Cloud operators need verifiable cooling integration.",
      lookCompetition: "Vendors are converging on modular CDU architecture.",
      lookTechnology: "Facility cooling integration is a gating factor.",
      lookSelf: "Current roadmap supports staged validation.",
      defineDirection: "Preserve evidence-bound planning.",
      defineProduct: "Prioritize modular liquid cooling CDU.",
      definePace: "Advance by validation milestone.",
    },
    technicalRoadmap: [{ phase: "P1", year: 2027, milestone: "Validate thermal loop" }],
    doorstepGate: { gateName: "facility_cooling_interface", status: "pass" },
    readinessGate: { gateName: "pilot_validation", status: "pass" },
    risks: ["Thermal integration remains a gating risk."],
    missingInputs: [],
    sourceRequiredItems: [],
    evidenceTrace: [{ claimId: "clm_001", sourceIds: ["src_001"] }],
    pageTrace: [{
      currentPageRoute: "/technology",
      currentPageModule: "technology",
      pageContextHash: "ctx_manual_001",
      productPlanningCardId: "ppc_001",
      productPlanningCardVersion: "v1",
      productPlanningCardStateHash: "ppc_hash_001",
    }],
    freshnessNotice: "current",
    validatorHints: [],
  },
  ...overrides,
});

const buildPhase2B = (validatorReport = null) => ({
  buildPageContext: () => ({
    currentPageRoute: "/technology",
    currentPageModule: "technology",
    selectedFilters: {
      productFamily: "liquid_cooling_cdu",
      customerSegment: "AIDC_cloud",
      region: "CN",
      architectureLayer: "facility_cooling",
    },
    pageContextHash: "ctx_manual_001",
  }),
  buildProductPlanningCardContext: (card = {}) => ({
    ...card,
    stateHash: "ppc_hash_001",
  }),
  buildAskRequest: (input = {}) => ({
    ok: true,
    validatorStatus: VALIDATOR_STATUS.PASS,
    renderMode: "full_report",
    allowedToRender: true,
    blockingReasons: [],
    normalizedRequest: {
      schemaVersion: "1.0.0",
      requestId: input.requestId,
      userQuestion: input.userQuestion,
      taskIntent: input.taskIntent,
      currentPageRoute: "/technology",
      currentPageModule: "technology",
      pageContextHash: "ctx_manual_001",
      timestamp: input.timestamp,
      selectedFilters: input.selectedFilters,
      productPlanningCard: input.productPlanningCard,
      pageContext: {
        pageContextHash: "ctx_manual_001",
      },
      sourceRefs: [],
      claimRefs: [],
    },
  }),
  hydrateEvidencePacks: () => ({
    validatorStatus: VALIDATOR_STATUS.PASS,
    renderMode: "full_report",
    allowedToRender: true,
    blockingReasons: [],
    warnings: [],
    expandedSourcePack: [],
    expandedClaimPack: [],
    missingEvidence: [],
  }),
  validateAskResponse: () => validatorReport || ({
    validatorStatus: VALIDATOR_STATUS.PASS,
    renderMode: "full_report",
    allowedToRender: true,
    blockingReasons: [],
    warnings: [],
  }),
  renderAskReportState: ({ validatorReport: report = {} }) => ({
    renderMode: report.renderMode || "full_report",
    messageType: report.validatorStatus,
  }),
});

test("valid minimal ask_power_insight input returns ready with existing validator path", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput(), {
    phase2b: buildPhase2B(),
  });

  assert.equal(["ready", "warning_report"].includes(result.status), true);
  assert.equal(result.validation.requestContract.ok, true);
});

test("pass_with_warnings maps to warning_report", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput(), {
    phase2b: buildPhase2B({
      validatorStatus: VALIDATOR_STATUS.PASS_WITH_WARNINGS,
      renderMode: "warning_report",
      allowedToRender: true,
      blockingReasons: [],
      warnings: ["metadata incomplete"],
    }),
  });

  assert.equal(result.status, "warning_report");
});

test("blocked validator state maps to blocked", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput(), {
    phase2b: buildPhase2B({
      validatorStatus: VALIDATOR_STATUS.BLOCKED_SOURCE_REQUIRED,
      renderMode: "source_required_report",
      allowedToRender: false,
      blockingReasons: ["VAL_ERR_013"],
      warnings: [],
    }),
  });

  assert.equal(result.status, "blocked");
});

test("provider_timeout maps to provider_timeout", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput({
    providerOutcome: {
      status: "provider_timeout",
      message: "timed out",
    },
  }), {
    phase2b: buildPhase2B(),
  });

  assert.equal(result.status, "provider_timeout");
});

test("provider_error maps to provider_error", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput({
    providerOutcome: {
      status: "malformed",
      rawPayload: {
        token: "should-not-leak",
      },
    },
  }), {
    phase2b: buildPhase2B(),
  });

  assert.equal(result.status, "provider_error");
});

test("output status enum stays exact", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput(), {
    phase2b: buildPhase2B(),
  });

  assert.equal(["ready", "blocked", "warning_report", "provider_timeout", "provider_error"].includes(result.status), true);
});
