import test from "node:test";
import assert from "node:assert/strict";

import { validateAskResponse } from "../validator/validateAskResponse.js";

const buildRequest = (overrides = {}) => ({
  schemaVersion: "1.0.0",
  requestId: "req-rule-001",
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
  ...overrides,
});

const buildResponse = (overrides = {}) => ({
  schemaVersion: "1.0.0",
  responseId: "resp-rule-001",
  taskIntent: "technical_roadmap_and_entry_gate",
  resolvedObjects: [{ objectId: "liquid_cooling_cdu", objectType: "product", objectName: "CDU" }],
  entityRoles: [{ entityId: "liquid_cooling_cdu", role: "primary_product_object" }],
  decisionSummary: "CDU technology roadmap should follow staged validation.",
  fiveLookThreeDefine: {
    lookMarket: "AIDC demand drives higher liquid cooling density.",
    lookCustomer: "Cloud operators need validated facility cooling integration.",
    lookCompetition: "Vendor roadmaps show CDU convergence on serviceability.",
    lookTechnology: "Facility cooling interfaces define adoption pace.",
    lookSelf: "Current capability supports staged validation.",
    defineDirection: "Focus on source-bound CDU roadmap design.",
    defineProduct: "Prioritize facility-cooling CDU variants.",
    definePace: "Advance by readiness and verification gate.",
  },
  technicalRoadmap: [{ phase: "P1", year: 2027, milestone: "Validate thermal loop" }],
  doorstepGate: { gateName: "facility_cooling_interface", status: "pass" },
  readinessGate: { gateName: "pilot_validation", status: "pass" },
  risks: ["Integration risk must remain evidence-bound."],
  missingInputs: [],
  sourceRequiredItems: [],
  evidenceTrace: [{ claimId: "clm_tech", sourceIds: ["src_vendor"] }],
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
  ...overrides,
});

const source = (overrides = {}) => ({
  sourceId: "src_vendor",
  title: "Vendor Official Guide",
  organization: "Vendor A",
  sourceTier: "L4_vendor_official",
  publicationDate: "2026-04-01",
  lastVerifiedDate: "2026-06-20",
  freshnessStatus: "current",
  ...overrides,
});

const claim = (overrides = {}) => ({
  claimId: "clm_tech",
  claimText: "CDU roadmap requires phased validation.",
  objectId: "liquid_cooling_cdu",
  claimType: "technical_parameter",
  sourceIds: ["src_vendor"],
  freshnessStatus: "current",
  ...overrides,
});

const expectCore = (result, expectedStatus, expectedRenderMode, expectedAllowed, expectedBlockingReasons = []) => {
  assert.equal(result.validatorStatus, expectedStatus);
  assert.equal(result.renderMode, expectedRenderMode);
  assert.equal(result.allowedToRender, expectedAllowed);
  assert.deepStrictEqual(result.blockingReasons, expectedBlockingReasons);
};

const basePass = () => validateAskResponse({
  request: buildRequest(),
  providerResponse: buildResponse(),
  expandedSourcePack: [source()],
  expandedClaimPack: [claim()],
});

test("VAL_ERR_001 positive explicit exclusion pass", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: buildResponse({
      decisionSummary: "source_required",
      fiveLookThreeDefine: {
        lookMarket: "source_required",
        lookCustomer: "user_input_required",
        lookCompetition: "source_required",
        lookTechnology: "source_required",
        lookSelf: "user_input_required",
        defineDirection: "source_required",
        defineProduct: "source_required",
        definePace: "source_required",
      },
      technicalRoadmap: [],
      risks: ["not_applicable"],
      evidenceTrace: [],
    }),
    expandedSourcePack: [],
    expandedClaimPack: [],
  });
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_001 negative block case", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: buildResponse({
      evidenceTrace: [{ claimId: "clm_roi", sourceIds: [] }],
    }),
    expandedSourcePack: [source()],
    expandedClaimPack: [claim({
      claimId: "clm_roi",
      claimType: "roi",
      sourceIds: [],
    })],
  });
  expectCore(result, "blocked_source_required", "source_required_report", false, [
    "VAL_ERR_001",
    "missing source for TAM / ROI / market share",
  ]);
});

test("VAL_ERR_002 positive explicit exclusion pass", () => {
  const result = basePass();
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_002 negative block case", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: buildResponse({
      evidenceTrace: [{ claimId: "clm_named_customer", sourceIds: ["src_local"] }],
    }),
    expandedSourcePack: [source({ sourceId: "src_local", sourceTier: "L5_local_kb" })],
    expandedClaimPack: [claim({
      claimId: "clm_named_customer",
      claimType: "named_customer",
      sourceIds: ["src_local"],
    })],
  });
  expectCore(result, "blocked_source_required", "source_required_report", false, [
    "VAL_ERR_002",
    "named customer missing official evidence",
  ]);
});

test("VAL_ERR_003 positive evidence-backed pass", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: buildResponse({
      evidenceTrace: [{ claimId: "clm_cert", sourceIds: ["src_l2"] }],
    }),
    expandedSourcePack: [source({ sourceId: "src_l2", sourceTier: "L2_standard_industry_body" })],
    expandedClaimPack: [claim({
      claimId: "clm_cert",
      claimType: "certification",
      sourceIds: ["src_l2"],
    })],
  });
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_003 negative block case", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: buildResponse({
      evidenceTrace: [{ claimId: "clm_cert", sourceIds: ["src_local"] }],
    }),
    expandedSourcePack: [source({ sourceId: "src_local", sourceTier: "L5_local_kb" })],
    expandedClaimPack: [claim({
      claimId: "clm_cert",
      claimType: "certification",
      sourceIds: ["src_local"],
    })],
  });
  expectCore(result, "blocked_source_required", "source_required_report", false, [
    "VAL_ERR_003",
    "certification evidence missing",
  ]);
});

test("VAL_ERR_004 positive evidence-backed pass", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: buildResponse({
      evidenceTrace: [{ claimId: "clm_launch", sourceIds: ["src_vendor"] }],
    }),
    expandedSourcePack: [source()],
    expandedClaimPack: [claim({
      claimId: "clm_launch",
      claimType: "launch_date",
      sourceIds: ["src_vendor"],
    })],
  });
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_004 negative block case", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: buildResponse({
      evidenceTrace: [{ claimId: "clm_launch", sourceIds: ["src_local"] }],
    }),
    expandedSourcePack: [source({ sourceId: "src_local", sourceTier: "L5_local_kb" })],
    expandedClaimPack: [claim({
      claimId: "clm_launch",
      claimType: "launch_date",
      sourceIds: ["src_local"],
    })],
  });
  expectCore(result, "blocked_source_required", "source_required_report", false, [
    "VAL_ERR_004",
    "launch date evidence missing",
  ]);
});

test("VAL_ERR_005 positive evidence-backed pass", () => {
  const result = basePass();
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_005 negative block case", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: buildResponse({
      evidenceTrace: [{ claimId: "clm_tech", sourceIds: [] }],
    }),
    expandedSourcePack: [source()],
    expandedClaimPack: [claim({
      sourceIds: [],
      freshnessStatus: "",
    })],
  });
  expectCore(result, "blocked_source_required", "source_required_report", false, [
    "VAL_ERR_005",
    "technical parameter evidence missing",
  ]);
});

test("VAL_ERR_006 positive pass", () => {
  const result = basePass();
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_006 negative block case", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: buildResponse({
      resolvedObjects: [{ objectId: "hvdc", objectType: "product", objectName: "HVDC" }],
      entityRoles: [{ entityId: "hvdc", role: "primary_product_object" }],
    }),
    expandedSourcePack: [source()],
    expandedClaimPack: [claim()],
  });
  expectCore(result, "blocked_object_mismatch", "blocked_report", false, [
    "VAL_ERR_006",
    "primary object mismatch",
  ]);
});

test("VAL_ERR_007 positive pass", () => {
  const result = basePass();
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_007 negative block case", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: buildResponse({
      resolvedObjects: [
        { objectId: "hvdc", objectType: "product", objectName: "HVDC" },
        { objectId: "liquid_cooling_cdu", objectType: "product", objectName: "CDU" },
      ],
      entityRoles: [{ entityId: "hvdc", role: "primary_product_object" }],
    }),
    expandedSourcePack: [source()],
    expandedClaimPack: [claim()],
  });
  expectCore(result, "blocked_object_mismatch", "blocked_report", false, [
    "VAL_ERR_007",
    "alternative solution promoted to primary object",
  ]);
});

test("VAL_ERR_008 positive explicit exclusion pass", () => {
  const result = basePass();
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_008 negative block case", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: buildResponse({
      evidenceTrace: [{ claimId: "clm_sst", sourceIds: ["src_local"] }],
    }),
    expandedSourcePack: [source({ sourceId: "src_local", sourceTier: "L5_local_kb" })],
    expandedClaimPack: [claim({
      claimId: "clm_sst",
      claimType: "sst_commercialization",
      objectId: "solid_state_transformer",
      sourceIds: ["src_local"],
    })],
  });
  expectCore(result, "blocked_policy_violation", "blocked_report", false, [
    "VAL_ERR_008",
    "SST commercialization without evidence",
  ]);
});

test("VAL_ERR_009 positive pass", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: buildResponse({
      decisionSummary: "平台化和规模交付 should be phased for CDU facility cooling validation.",
    }),
    expandedSourcePack: [source()],
    expandedClaimPack: [claim()],
  });
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_009 negative block case", () => {
  const response = buildResponse({
    decisionSummary: "平台化和规模交付",
    technicalRoadmap: [],
    risks: [],
  });
  const request = buildRequest({
    selectedFilters: {
      productFamily: "liquid_cooling_cdu",
    },
    productPlanningCard: {
      id: "ppc_cdu_tech_gate",
      version: "v1",
      stateHash: "ppc_hash_001",
      productFamily: "liquid_cooling_cdu",
    },
  });
  const result = validateAskResponse({
    request,
    providerResponse: response,
    expandedSourcePack: [source()],
    expandedClaimPack: [claim()],
  });
  expectCore(result, "blocked_generic_filler", "blocked_report", false, [
    "VAL_ERR_009",
    "unsupported generic filler",
  ]);
});

test("VAL_ERR_010 positive pass", () => {
  const result = basePass();
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_010 negative block case", () => {
  const response = buildResponse({
    previousTrackLeakage: ["market_hvdc_prior_state"],
  });
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: response,
    expandedSourcePack: [source()],
    expandedClaimPack: [claim()],
  });
  expectCore(result, "blocked_policy_violation", "blocked_report", false, [
    "VAL_ERR_010",
    "previous product or page leakage",
  ]);
});

test("VAL_ERR_011 positive evidence-backed pass", () => {
  const request = buildRequest({ timeWindow: { maxYear: 2028 } });
  const result = validateAskResponse({
    request,
    providerResponse: buildResponse(),
    expandedSourcePack: [source()],
    expandedClaimPack: [claim()],
  });
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_011 negative block case", () => {
  const request = buildRequest({ timeWindow: { maxYear: 2028 } });
  const response = buildResponse({
    technicalRoadmap: [{ phase: "P3", year: 2030, milestone: "Long-horizon unsupported milestone" }],
  });
  const result = validateAskResponse({
    request,
    providerResponse: response,
    expandedSourcePack: [source()],
    expandedClaimPack: [claim()],
  });
  expectCore(result, "blocked_freshness_unverified", "blocked_report", false, [
    "VAL_ERR_011",
    "time-window mismatch",
  ]);
});

test("VAL_ERR_012 positive pass", () => {
  const result = basePass();
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_012 negative block case", () => {
  const request = buildRequest({ pageContextHash: "" });
  request.pageContext.pageContextHash = "";

  const result = validateAskResponse({
    request,
    providerResponse: buildResponse(),
    expandedSourcePack: [source()],
    expandedClaimPack: [claim()],
  });
  expectCore(result, "blocked_page_context_missing", "blocked_report", false, [
    "VAL_ERR_012",
    "pageContextHash is required",
    "pageContext.pageContextHash is required",
  ]);
});

test("VAL_ERR_013 positive evidence-backed pass", () => {
  const result = basePass();
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_013 negative block case", () => {
  const response = buildResponse({
    evidenceTrace: [],
  });
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: response,
    expandedSourcePack: [source()],
    expandedClaimPack: [claim()],
  });
  expectCore(result, "blocked_source_required", "source_required_report", false, [
    "VAL_ERR_013",
    "factual claims require evidenceTrace",
  ]);
});

test("VAL_ERR_014 positive evidence-backed pass", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: buildResponse({
      evidenceTrace: [{ claimId: "clm_current", sourceIds: ["src_vendor"] }],
    }),
    expandedSourcePack: [source()],
    expandedClaimPack: [claim({
      claimId: "clm_current",
      claimType: "company_revenue",
      freshnessStatus: "current",
      publicationDate: "2026-04-01",
      lastVerifiedDate: "2026-06-20",
      sourceIds: ["src_vendor"],
    })],
  });
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_014 negative block case", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: buildResponse({
      evidenceTrace: [{ claimId: "clm_current", sourceIds: ["src_vendor"] }],
    }),
    expandedSourcePack: [source({ publicationDate: "", lastVerifiedDate: "", freshnessStatus: "unknown" })],
    expandedClaimPack: [claim({
      claimId: "clm_current",
      claimType: "company_revenue",
      freshnessStatus: "unknown",
      publicationDate: "",
      lastVerifiedDate: "",
      sourceIds: ["src_vendor"],
    })],
  });
  expectCore(result, "blocked_freshness_unverified", "blocked_report", false, [
    "VAL_ERR_014",
    "freshness fields missing",
  ]);
});

test("VAL_ERR_015 positive evidence-backed pass", () => {
  const result = basePass();
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_015 negative block case", () => {
  const response = buildResponse();
  response.fiveLookThreeDefine.defineProduct = "";

  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: response,
    expandedSourcePack: [source()],
    expandedClaimPack: [claim()],
  });
  expectCore(result, "blocked_schema_error", "blocked_report", false, [
    "VAL_ERR_016",
    "defineProduct is required in fiveLookThreeDefine",
  ]);
});

test("VAL_ERR_016 positive schema-compliant pass", () => {
  const result = basePass();
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_016 negative block case", () => {
  const response = buildResponse({
    responseId: "",
  });
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: response,
    expandedSourcePack: [source()],
    expandedClaimPack: [claim()],
  });
  expectCore(result, "blocked_schema_error", "blocked_report", false, [
    "VAL_ERR_016",
    "required response string fields must be non-empty",
  ]);
});

test("VAL_ERR_017 positive JSON pass", () => {
  const result = basePass();
  expectCore(result, "pass", "full_report", true, []);
});

test("VAL_ERR_017 negative block case", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: "This is free text, not JSON.",
    expandedSourcePack: [source()],
    expandedClaimPack: [claim()],
  });
  expectCore(result, "blocked_schema_error", "blocked_report", false, [
    "VAL_ERR_017",
    "provider response must be a structured JSON object",
  ]);
});

test("VAL_ERR_018 positive provider error card pass", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: { providerState: "provider_error" },
    expandedSourcePack: [],
    expandedClaimPack: [],
  });
  expectCore(result, "provider_error", "provider_error_card", false, [
    "provider returned error state",
  ]);
});

test("VAL_ERR_018 negative block case", () => {
  const result = validateAskResponse({
    request: buildRequest(),
    providerResponse: {
      providerState: "provider_error",
      decisionSummary: "Static local fallback should not exist.",
      technicalRoadmap: [{ phase: "P1" }],
      fiveLookThreeDefine: { defineDirection: "fallback" },
    },
    expandedSourcePack: [],
    expandedClaimPack: [],
  });
  expectCore(result, "blocked_policy_violation", "blocked_report", false, [
    "VAL_ERR_018",
    "hidden fallback expert prose after provider_error",
  ]);
});
