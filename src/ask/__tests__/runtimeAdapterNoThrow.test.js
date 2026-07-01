import test from "node:test";
import assert from "node:assert/strict";

import { VALIDATOR_STATUS } from "../contracts/validatorStatus.js";
import { runAskPipelineAdapter } from "../runtime/runAskPipelineAdapter.js";

const buildValidRuntimeInput = () => ({
  consumerModule: "ask_power_insight",
  currentPageRoute: "/technology",
  currentPageModule: "technology",
  question: "What is the CDU roadmap?",
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
});

const buildPhase2BStub = () => ({
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
    stateHash: card.stateHash || "ppc_hash_001",
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
  validateAskResponse: () => ({
    validatorStatus: VALIDATOR_STATUS.PASS,
    renderMode: "full_report",
    allowedToRender: true,
    blockingReasons: [],
    warnings: [],
  }),
  renderAskReportState: ({ validatorReport = {} }) => ({
    renderMode: validatorReport.renderMode || "full_report",
    messageType: validatorReport.validatorStatus,
  }),
});

test("null runtimeInput does not throw", () => {
  assert.doesNotThrow(() => runAskPipelineAdapter(null));
});

test("undefined runtimeInput does not throw", () => {
  assert.doesNotThrow(() => runAskPipelineAdapter(undefined));
});

test("malformed runtimeInput does not throw", () => {
  assert.doesNotThrow(() => runAskPipelineAdapter("not-an-object"));
});

test("provider exception-like object does not throw", () => {
  assert.doesNotThrow(() => runAskPipelineAdapter({
    consumerModule: "ask_power_insight",
    providerOutcome: {
      error: {
        message: "boom",
      },
      stack: "Error: boom\n at runtime",
    },
  }));
});

test("internal adapter exception is converted to provider_error and adapter_unhandled_exception", () => {
  const result = runAskPipelineAdapter(buildValidRuntimeInput(), {
    phase2b: {
      ...buildPhase2BStub(),
      buildAskRequest: () => {
        throw new Error("adapter exploded");
      },
    },
  });

  assert.equal(result.status, "provider_error");
  assert.deepStrictEqual(result.diagnostics.reasonCodes, ["adapter_unhandled_exception"]);
});

test("diagnostics contains no raw stack", () => {
  const result = runAskPipelineAdapter(buildValidRuntimeInput(), {
    phase2b: {
      ...buildPhase2BStub(),
      buildAskRequest: () => {
        const error = new Error("top secret");
        error.stack = "Bearer SECRET\nAuthorization: token";
        throw error;
      },
    },
  });

  assert.equal(result.diagnostics.noSecrets, true);
  assert.equal(JSON.stringify(result.diagnostics).includes("Bearer SECRET"), false);
  assert.equal(JSON.stringify(result.diagnostics).includes("Authorization"), false);
});
