import test from "node:test";
import assert from "node:assert/strict";

import { VALIDATOR_STATUS } from "../contracts/validatorStatus.js";
import { runAskPipelineAdapter } from "../runtime/runAskPipelineAdapter.js";

const buildRuntimeInput = (overrides = {}) => ({
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
  ...overrides,
});

const buildPhase2B = () => ({
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
  validateAskResponse: () => ({
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

test("no provider call is made", () => {
  let providerCallCount = 0;

  runAskPipelineAdapter(buildRuntimeInput(), {
    phase2b: buildPhase2B(),
    providerInvoker: () => {
      providerCallCount += 1;
    },
  });

  assert.equal(providerCallCount, 0);
});

test("provider disabled returns not_used / normal path", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput(), {
    phase2b: buildPhase2B(),
    providerEnabled: false,
  });

  assert.equal(result.validation.provider.provider_status, "not_used");
  assert.equal(["ready", "warning_report"].includes(result.status), true);
});

test("provider timeout sanitizes diagnostics", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput({
    providerOutcome: {
      status: "provider_timeout",
      message: "Authorization bearer token leaked",
    },
  }), {
    phase2b: buildPhase2B(),
  });

  assert.equal(result.status, "provider_timeout");
  assert.equal(result.diagnostics.noSecrets, true);
  assert.equal(JSON.stringify(result.validation.provider.diagnostics).includes("Authorization"), false);
});

test("malformed provider result sanitizes diagnostics", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput({
    providerOutcome: {
      status: "malformed",
      rawPayload: {
        Authorization: "Bearer abc",
      },
      message: "Bearer abc malformed",
    },
  }), {
    phase2b: buildPhase2B(),
  });

  assert.equal(result.status, "provider_error");
  assert.equal(result.diagnostics.noSecrets, true);
  assert.equal(JSON.stringify(result.validation.provider).includes("Bearer abc"), false);
});

test("raw payload and secret-like fields are not echoed", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput({
    providerOutcome: {
      status: "malformed",
      rawPayload: {
        apiKey: "secret-key",
        Authorization: "Bearer secret-token",
        envValue: "TOP_SECRET",
      },
      message: "apiKey secret-key",
    },
  }), {
    phase2b: buildPhase2B(),
  });

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("secret-key"), false);
  assert.equal(serialized.includes("Bearer secret-token"), false);
  assert.equal(serialized.includes("TOP_SECRET"), false);
});

test("placeholder_ready response is recursively sanitized while safe fields remain", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput({
    providerOutcome: {
      status: "placeholder_ready",
      response: {
        decisionSummary: "Safe summary",
        nested: {
          apiKey: "secret-key",
          note: "Authorization bearer token leaked",
        },
        diagnostics: [
          {
            stack: "secret stack",
            detail: "safe detail",
          },
        ],
        rawPayload: {
          token: "abc",
        },
        envValue: "TOP_SECRET",
        pageTrace: [
          {
            currentPageRoute: "/technology",
          },
        ],
      },
    },
  }), {
    phase2b: buildPhase2B(),
  });

  const serialized = JSON.stringify(result);

  assert.equal(result.validation.provider.provider_status, "placeholder_ready");
  assert.equal(result.validation.provider.diagnostics.noSecrets, true);
  assert.equal(result.validation.provider.response.decisionSummary, "Safe summary");
  assert.equal(result.validation.provider.response.nested.note, "[redacted]");
  assert.deepStrictEqual(result.validation.provider.response.pageTrace, [{ currentPageRoute: "/technology" }]);
  assert.equal(serialized.includes("secret-key"), false);
  assert.equal(serialized.includes("Authorization"), false);
  assert.equal(serialized.includes("Bearer"), false);
  assert.equal(serialized.includes("TOP_SECRET"), false);
  assert.equal(serialized.includes("secret stack"), false);
  assert.equal(serialized.includes("\"apiKey\""), false);
  assert.equal(serialized.includes("\"rawPayload\""), false);
});

test("diagnostics.noSecrets is true", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput(), {
    phase2b: buildPhase2B(),
  });

  assert.equal(result.diagnostics.noSecrets, true);
});
