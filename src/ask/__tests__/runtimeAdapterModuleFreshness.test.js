import test from "node:test";
import assert from "node:assert/strict";

import { VALIDATOR_STATUS } from "../contracts/validatorStatus.js";
import { runAskPipelineAdapter } from "../runtime/runAskPipelineAdapter.js";

const buildRuntimeInput = (overrides = {}) => ({
  consumerModule: "company_intelligence",
  currentPageRoute: "/companies",
  currentPageModule: "companies",
  question: "What are the latest company metrics?",
  taskIntent: "company_fact_check",
  selectedFilters: {
    productFamily: "liquid_cooling_cdu",
    customerSegment: "AIDC_cloud",
    region: "CN",
    architectureLayer: "facility_cooling",
  },
  productPlanningCard: {
    id: "ppc_company_001",
    version: "v1",
    stateHash: "ppc_company_hash_001",
    productFamily: "liquid_cooling_cdu",
    customerSegment: "AIDC_cloud",
    region: "CN",
    architectureLayer: "facility_cooling",
  },
  providerResponse: {
    schemaVersion: "1.0.0",
    responseId: "resp_company_001",
    taskIntent: "company_fact_check",
    resolvedObjects: [{ objectId: "vendor_a", objectType: "company" }],
    entityRoles: [{ entityId: "vendor_a", role: "primary_product_object" }],
    decisionSummary: "Current company update requires official evidence.",
    fiveLookThreeDefine: {
      lookMarket: "Enterprise demand is increasing.",
      lookCustomer: "Named customer validation is required.",
      lookCompetition: "Competitive pressure remains high.",
      lookTechnology: "Cooling architecture is a gating factor.",
      lookSelf: "Current company data remains source-bound.",
      defineDirection: "Keep company claims official-only.",
      defineProduct: "Preserve evidence-first company reporting.",
      definePace: "Advance by official verification.",
    },
    technicalRoadmap: [{ phase: "P1", year: 2027, milestone: "Review official annual report" }],
    doorstepGate: { gateName: "official_source_gate", status: "pass" },
    readinessGate: { gateName: "evidence_gate", status: "pass" },
    risks: ["Freshness must remain current."],
    missingInputs: [],
    sourceRequiredItems: [],
    evidenceTrace: [{ claimId: "clm_company_001", sourceIds: ["src_company_001"] }],
    pageTrace: [{
      currentPageRoute: "/companies",
      currentPageModule: "companies",
      pageContextHash: "ctx_company_001",
      productPlanningCardId: "ppc_company_001",
      productPlanningCardVersion: "v1",
      productPlanningCardStateHash: "ppc_company_hash_001",
    }],
    freshnessNotice: "current",
    validatorHints: [],
  },
  ...overrides,
});

const buildPhase2B = (hydrationResult) => ({
  buildPageContext: () => ({
    currentPageRoute: "/companies",
    currentPageModule: "companies",
    selectedFilters: {
      productFamily: "liquid_cooling_cdu",
      customerSegment: "AIDC_cloud",
      region: "CN",
      architectureLayer: "facility_cooling",
    },
    pageContextHash: "ctx_company_001",
  }),
  buildProductPlanningCardContext: (card = {}) => ({
    ...card,
    stateHash: "ppc_company_hash_001",
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
      currentPageRoute: "/companies",
      currentPageModule: "companies",
      pageContextHash: "ctx_company_001",
      timestamp: input.timestamp,
      selectedFilters: input.selectedFilters,
      productPlanningCard: input.productPlanningCard,
      pageContext: {
        pageContextHash: "ctx_company_001",
      },
      sourceRefs: [],
      claimRefs: [],
    },
  }),
  hydrateEvidencePacks: () => hydrationResult,
  validateAskResponse: () => ({
    validatorStatus: VALIDATOR_STATUS.PASS,
    renderMode: "full_report",
    allowedToRender: true,
    blockingReasons: [],
    warnings: [],
  }),
  renderAskReportState: ({ validatorReport: report = {} }) => ({
    renderMode: report.renderMode || "blocked_report",
    messageType: report.validatorStatus,
  }),
});

test("missing consumerModule blocks", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput({
    consumerModule: "",
  }), {
    phase2b: buildPhase2B({}),
  });

  assert.equal(result.status, "blocked");
  assert.deepStrictEqual(result.diagnostics.reasonCodes, ["missing_consumer_module"]);
});

test("unsupported consumerModule blocks", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput({
    consumerModule: "legacy_module",
  }), {
    phase2b: buildPhase2B({}),
  });

  assert.equal(result.status, "blocked");
  assert.deepStrictEqual(result.diagnostics.reasonCodes, ["unsupported_consumer_module"]);
});

test("appliesToModules mismatch blocks", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput(), {
    phase2b: buildPhase2B({
      validatorStatus: VALIDATOR_STATUS.BLOCKED_OBJECT_MISMATCH,
      renderMode: "blocked_report",
      allowedToRender: false,
      blockingReasons: [
        "source src_company_001 does not apply to claim clm_company_001 consumerModule company_intelligence",
      ],
      warnings: [],
      expandedSourcePack: [],
      expandedClaimPack: [],
      missingEvidence: [],
    }),
  });

  assert.equal(result.status, "blocked");
  assert.deepStrictEqual(result.diagnostics.reasonCodes, [
    "applies_to_modules_mismatch",
    "company_intelligence_ask_only_source",
  ]);
});

test("company_intelligence claim cannot use ask-only source", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput(), {
    phase2b: buildPhase2B({
      validatorStatus: VALIDATOR_STATUS.BLOCKED_OBJECT_MISMATCH,
      renderMode: "blocked_report",
      allowedToRender: false,
      blockingReasons: [
        "source src_ask_only does not apply to claim clm_company_001 consumerModule company_intelligence",
      ],
      warnings: [],
      expandedSourcePack: [],
      expandedClaimPack: [],
      missingEvidence: [],
    }),
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.reasonCodes.includes("company_intelligence_ask_only_source"), true);
});

test("stale L4 plus fresh L5 laundering blocks", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput(), {
    phase2b: buildPhase2B({
      validatorStatus: VALIDATOR_STATUS.BLOCKED_FRESHNESS_UNVERIFIED,
      renderMode: "blocked_report",
      allowedToRender: false,
      blockingReasons: [
        "claim clm_company_001 is outside freshness window",
      ],
      warnings: [],
      expandedSourcePack: [],
      expandedClaimPack: [],
      missingEvidence: [],
    }),
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.reasonCodes.includes("stale_l4_fresh_l5_laundering_blocked"), true);
});

test("L5 alone cannot support hard factual current claim", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput(), {
    phase2b: buildPhase2B({
      validatorStatus: VALIDATOR_STATUS.BLOCKED_SOURCE_REQUIRED,
      renderMode: "source_required_report",
      allowedToRender: false,
      blockingReasons: [
        "claim clm_company_001 cannot rely on L5_local_kb alone",
      ],
      warnings: [],
      expandedSourcePack: [],
      expandedClaimPack: [],
      missingEvidence: [],
    }),
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.reasonCodes.includes("l5_local_kb_hard_fact_blocked"), true);
});

test("L6 cannot support hard factual current claim", () => {
  const result = runAskPipelineAdapter(buildRuntimeInput(), {
    phase2b: buildPhase2B({
      validatorStatus: VALIDATOR_STATUS.BLOCKED_SOURCE_REQUIRED,
      renderMode: "source_required_report",
      allowedToRender: false,
      blockingReasons: [
        "claim clm_company_001 cannot rely on L6_uncorroborated_reference",
      ],
      warnings: [],
      expandedSourcePack: [],
      expandedClaimPack: [],
      missingEvidence: [],
    }),
  });

  assert.equal(result.status, "blocked");
  assert.equal(result.diagnostics.reasonCodes.includes("l6_uncorroborated_reference_hard_fact_blocked"), true);
});
