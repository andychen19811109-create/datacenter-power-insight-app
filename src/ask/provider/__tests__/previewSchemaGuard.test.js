import test from "node:test";
import assert from "node:assert/strict";

import scenario1UpsAiGpuLoadStepResponse from "../fixtures/scenario1UpsAiGpuLoadStepResponse.js";
import scenario2LiquidCoolingCduBoundary from "../fixtures/scenario2LiquidCoolingCduBoundary.js";
import scenario3HvdcArchitectureBoundary from "../fixtures/scenario3HvdcArchitectureBoundary.js";
import scenario4PowerBlockBoundary from "../fixtures/scenario4PowerBlockBoundary.js";
import {
  PREVIEW_FORBIDDEN_ROOT_FIELDS,
  PREVIEW_ROOT_WHITELIST,
  detectForbiddenClaims,
  validateClaimRefs,
  validatePreviewFixture,
  validatePreviewRootSchema,
  validateSourceRefs,
} from "../previewSchemaGuard.js";

const FIXTURES = [
  scenario1UpsAiGpuLoadStepResponse,
  scenario2LiquidCoolingCduBoundary,
  scenario3HvdcArchitectureBoundary,
  scenario4PowerBlockBoundary,
];

test("valid fixture passes root whitelist", () => {
  const result = validatePreviewRootSchema(scenario1UpsAiGpuLoadStepResponse);

  assert.deepEqual(result, {
    ok: true,
    errors: [],
  });
});

test("unknown root field fails", () => {
  const result = validatePreviewRootSchema({
    ...scenario1UpsAiGpuLoadStepResponse,
    unknownPreviewFlag: true,
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_ROOT_FIELD_FORBIDDEN" && error.path === "unknownPreviewFlag"), true);
});

test("scenario-specific root field fails", () => {
  const result = validatePreviewRootSchema({
    ...scenario1UpsAiGpuLoadStepResponse,
    batteryMicrocycling: "must stay nested",
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_SCENARIO_FIELD_AT_ROOT" && error.path === "batteryMicrocycling"), true);
});

test("all four fixtures pass root whitelist", () => {
  FIXTURES.forEach((fixture) => {
    assert.deepEqual(validatePreviewRootSchema(fixture), {
      ok: true,
      errors: [],
    });
  });
});

test("malformed preview fails safely", () => {
  const result = validatePreviewRootSchema(null);

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors, [
    {
      code: "PREVIEW_MALFORMED",
      path: "preview",
      message: "preview must be a plain object",
    },
  ]);
});

test("sections empty fails safely", () => {
  const result = validatePreviewFixture({
    ...scenario1UpsAiGpuLoadStepResponse,
    sections: [],
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_SECTIONS_EMPTY"), true);
});

test("sections with null element fail safely", () => {
  const result = validatePreviewFixture({
    ...scenario1UpsAiGpuLoadStepResponse,
    sections: [null],
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_SECTION_INVALID"), true);
});

test("sourceRefs empty fails safely", () => {
  const result = validatePreviewFixture({
    ...scenario1UpsAiGpuLoadStepResponse,
    sourceRefs: [],
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_SOURCE_REFS_EMPTY"), true);
});

test("claimRefs empty fails safely", () => {
  const result = validatePreviewFixture({
    ...scenario1UpsAiGpuLoadStepResponse,
    claimRefs: [],
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_CLAIM_REFS_EMPTY"), true);
});

test("metric block with empty metrics fails safely", () => {
  const result = validatePreviewFixture({
    ...scenario1UpsAiGpuLoadStepResponse,
    sections: [
      {
        ...scenario1UpsAiGpuLoadStepResponse.sections[0],
        metrics: [],
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_SECTION_METRICS_EMPTY"), true);
});

test("metric block with null metric fails safely", () => {
  const result = validatePreviewFixture({
    ...scenario1UpsAiGpuLoadStepResponse,
    sections: [
      {
        ...scenario1UpsAiGpuLoadStepResponse.sections[0],
        metrics: [null],
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_SECTION_METRIC_INVALID"), true);
});

test("boundary card with empty items fails safely", () => {
  const result = validatePreviewFixture({
    ...scenario2LiquidCoolingCduBoundary,
    sections: [
      {
        ...scenario2LiquidCoolingCduBoundary.sections[0],
        items: [],
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_SECTION_ITEMS_EMPTY"), true);
});

test("boundary card with null item fails safely", () => {
  const result = validatePreviewFixture({
    ...scenario2LiquidCoolingCduBoundary,
    sections: [
      {
        ...scenario2LiquidCoolingCduBoundary.sections[0],
        items: [null],
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_SECTION_ITEM_INVALID"), true);
});

test("risk register with empty risks fails safely", () => {
  const result = validatePreviewFixture({
    ...scenario4PowerBlockBoundary,
    sections: [
      {
        ...scenario4PowerBlockBoundary.sections[0],
        risks: [],
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_SECTION_RISKS_EMPTY"), true);
});

test("risk register with null risk fails safely", () => {
  const result = validatePreviewFixture({
    ...scenario4PowerBlockBoundary,
    sections: [
      {
        ...scenario4PowerBlockBoundary.sections[0],
        risks: [null],
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_SECTION_RISK_INVALID"), true);
});

test("sourceRef missing evidenceConfidenceScore fails", () => {
  const result = validateSourceRefs([
    {
      id: "src_1",
      title: "Missing score",
      sourceType: "official_vendor_datasheet",
      confidence: "high",
    },
  ]);

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_EVIDENCE_CONFIDENCE_REQUIRED"), true);
});

test("evidenceConfidenceScore below zero fails", () => {
  const result = validateSourceRefs([
    {
      id: "src_1",
      title: "Bad score",
      sourceType: "official_vendor_datasheet",
      confidence: "high",
      evidenceConfidenceScore: -0.01,
    },
  ]);

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_EVIDENCE_CONFIDENCE_RANGE"), true);
});

test("evidenceConfidenceScore above one fails", () => {
  const result = validateSourceRefs([
    {
      id: "src_1",
      title: "Bad score",
      sourceType: "official_vendor_datasheet",
      confidence: "high",
      evidenceConfidenceScore: 1.01,
    },
  ]);

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_EVIDENCE_CONFIDENCE_RANGE"), true);
});

test("valid sourceRefs pass", () => {
  assert.deepEqual(validateSourceRefs(scenario1UpsAiGpuLoadStepResponse.sourceRefs), {
    ok: true,
    errors: [],
  });
});

test("unknown claimType fails", () => {
  const [claimRef] = scenario1UpsAiGpuLoadStepResponse.claimRefs;
  const result = validateClaimRefs([
    {
      ...claimRef,
      claimType: "unsupported_claim_type",
    },
  ], scenario1UpsAiGpuLoadStepResponse.sourceRefs);

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_CLAIM_TYPE_UNSUPPORTED"), true);
});

test("missing claimType fails", () => {
  const [claimRef] = scenario1UpsAiGpuLoadStepResponse.claimRefs;
  const { claimType, ...claimWithoutType } = claimRef;
  const result = validateClaimRefs([claimWithoutType], scenario1UpsAiGpuLoadStepResponse.sourceRefs);

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_CLAIM_TYPE_REQUIRED"), true);
});

test("claimRef referencing missing sourceRef fails", () => {
  const [claimRef] = scenario1UpsAiGpuLoadStepResponse.claimRefs;
  const result = validateClaimRefs([
    {
      ...claimRef,
      sourceRefs: ["src_missing"],
    },
  ], scenario1UpsAiGpuLoadStepResponse.sourceRefs);

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_CLAIM_SOURCE_REF_MISSING"), true);
});

test("vendor_claim_with_validation_required without validationRequired fails", () => {
  const vendorClaim = scenario1UpsAiGpuLoadStepResponse.claimRefs.find(
    (claimRef) => claimRef.claimType === "vendor_claim_with_validation_required",
  );
  const result = validateClaimRefs([
    {
      ...vendorClaim,
      validationRequired: false,
    },
  ], scenario1UpsAiGpuLoadStepResponse.sourceRefs);

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_VENDOR_CLAIM_VALIDATION_REQUIRED"), true);
});

test("valid claimRefs pass", () => {
  assert.deepEqual(
    validateClaimRefs(
      scenario1UpsAiGpuLoadStepResponse.claimRefs,
      scenario1UpsAiGpuLoadStepResponse.sourceRefs,
    ),
    {
      ok: true,
      errors: [],
    },
  );
});

test("Chinese absolute claim detected", () => {
  const result = detectForbiddenClaims({
    ...scenario1UpsAiGpuLoadStepResponse,
    sections: [
      {
        ...scenario1UpsAiGpuLoadStepResponse.sections[0],
        body: "该方案可以完全消除所有跃变风险。",
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.deepEqual(result.errors[0], {
    code: "FORBIDDEN_CLAIM_DETECTED",
    path: "sections[0].body",
    value: "该方案可以完全消除所有跃变风险。",
    matchedTerm: "完全消除",
  });
});

test("Chinese marketing claim detected", () => {
  const result = detectForbiddenClaims({
    ...scenario2LiquidCoolingCduBoundary,
    title: "业内首创液冷边界模型",
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.matchedTerm === "业内首创" && error.path === "title"), true);
});

test("Chinese spaced forbidden claim is detected", () => {
  const result = detectForbiddenClaims({
    ...scenario1UpsAiGpuLoadStepResponse,
    title: "绝 对 安 全的边界判断",
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.matchedTerm === "绝对安全" && error.path === "title"), true);
});

test("Chinese punctuation variant is detected", () => {
  const result = detectForbiddenClaims({
    ...scenario1UpsAiGpuLoadStepResponse,
    title: "绝对-安全方案",
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.matchedTerm === "绝对安全" && error.path === "title"), true);
});

test("Chinese newline variant is detected", () => {
  const result = detectForbiddenClaims({
    ...scenario1UpsAiGpuLoadStepResponse,
    title: "绝对\n安全方案",
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.matchedTerm === "绝对安全" && error.path === "title"), true);
});

test("Phase 2C forbidden statement detected", () => {
  const result = detectForbiddenClaims({
    ...scenario3HvdcArchitectureBoundary,
    diagnostics: {
      ...scenario3HvdcArchitectureBoundary.diagnostics,
      assumptions: ["Preview 已 production-ready"],
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.matchedTerm === "Preview 已 production-ready"), true);
});

test("English case variant is detected", () => {
  const result = detectForbiddenClaims({
    ...scenario4PowerBlockBoundary,
    title: "PRODUCTION READY architecture summary",
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.matchedTerm === "production-ready" && error.path === "title"), true);
});

test("English forbidden claim detected", () => {
  const result = detectForbiddenClaims({
    ...scenario4PowerBlockBoundary,
    claimRefs: [
      {
        ...scenario4PowerBlockBoundary.claimRefs[0],
        claim: "This block is production-ready for every deployment.",
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.matchedTerm === "production-ready" && error.path === "claimRefs[0].claim"), true);
});

test("English space variant is detected", () => {
  const result = detectForbiddenClaims({
    ...scenario4PowerBlockBoundary,
    claimRefs: [
      {
        ...scenario4PowerBlockBoundary.claimRefs[0],
        claim: "This block is production ready for every deployment.",
      },
    ],
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.matchedTerm === "production-ready" && error.path === "claimRefs[0].claim"), true);
});

test("English newline variant is detected", () => {
  const result = detectForbiddenClaims({
    ...scenario4PowerBlockBoundary,
    diagnostics: {
      ...scenario4PowerBlockBoundary.diagnostics,
      assumptions: ["provider\nis\nactive"],
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.matchedTerm === "provider is active"), true);
});

test("English spaced acronym variant is detected", () => {
  const result = detectForbiddenClaims({
    ...scenario4PowerBlockBoundary,
    diagnostics: {
      ...scenario4PowerBlockBoundary.diagnostics,
      assumptions: ["R A G is active"],
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.matchedTerm === "RAG is active"), true);
});

test("valid professional cautious wording passes", () => {
  const result = detectForbiddenClaims({
    ...scenario4PowerBlockBoundary,
    claimRefs: [
      {
        ...scenario4PowerBlockBoundary.claimRefs[0],
        claim: "This vendor claim requires validation before production use.",
      },
    ],
  });

  assert.deepEqual(result, {
    ok: true,
    errors: [],
  });
});

test("Scenario 1 nested fields are not root fields", () => {
  assert.equal("stepLoadEnvelope" in scenario1UpsAiGpuLoadStepResponse, false);
  assert.equal("upstreamGeneratorCoordination" in scenario1UpsAiGpuLoadStepResponse, false);
  assert.equal("inputSideDynamicPowerQuality" in scenario1UpsAiGpuLoadStepResponse, false);
  assert.equal("batteryMicrocyclingRisk" in scenario1UpsAiGpuLoadStepResponse, false);
});

test("Scenario 2 nested fields are not root fields", () => {
  assert.equal("flowRateByDeltaT" in scenario2LiquidCoolingCduBoundary, false);
  assert.equal("fwsTcsTemperatureMapping" in scenario2LiquidCoolingCduBoundary, false);
  assert.equal("dewPointTrackingControl" in scenario2LiquidCoolingCduBoundary, false);
  assert.equal("fluidInterfaceSLA" in scenario2LiquidCoolingCduBoundary, false);
  assert.equal("leakResponseHierarchy" in scenario2LiquidCoolingCduBoundary, false);
  assert.equal("materialCompatibility" in scenario2LiquidCoolingCduBoundary, false);
});

test("Scenario 3 nested fields are not root fields", () => {
  assert.equal("architectureLayerFitMatrix" in scenario3HvdcArchitectureBoundary, false);
  assert.equal("legacyHVDCCompatibility" in scenario3HvdcArchitectureBoundary, false);
  assert.equal("vendorEntryLayer" in scenario3HvdcArchitectureBoundary, false);
  assert.equal("commercialMaturity" in scenario3HvdcArchitectureBoundary, false);
  assert.equal("safetyProtectionChecklist" in scenario3HvdcArchitectureBoundary, false);
  assert.equal("architectureAlert" in scenario3HvdcArchitectureBoundary, false);
});

test("Scenario 4 nested fields are not root fields", () => {
  assert.equal("deliveryModel" in scenario4PowerBlockBoundary, false);
  assert.equal("timeToRevenue" in scenario4PowerBlockBoundary, false);
  assert.equal("physicalFormBoundary" in scenario4PowerBlockBoundary, false);
  assert.equal("fatSatBoundary" in scenario4PowerBlockBoundary, false);
  assert.equal("complianceMatrix" in scenario4PowerBlockBoundary, false);
  assert.equal("transportEnvelope" in scenario4PowerBlockBoundary, false);
  assert.equal("integratedWarrantyBoundary" in scenario4PowerBlockBoundary, false);
  assert.equal("assumptionBaseline" in scenario4PowerBlockBoundary, false);
});

test("All four fixtures validate with validatePreviewFixture", () => {
  FIXTURES.forEach((fixture) => {
    assert.deepEqual(validatePreviewFixture(fixture), {
      ok: true,
      errors: [],
    });
  });
});

test("root whitelist stays aligned with expected contract", () => {
  assert.deepEqual(PREVIEW_ROOT_WHITELIST, [
    "scenarioId",
    "title",
    "userQuestion",
    "previewType",
    "status",
    "safeForUserDisplay",
    "notProductionReady",
    "sourceRefs",
    "claimRefs",
    "diagnostics",
    "sections",
  ]);
  assert.equal(PREVIEW_FORBIDDEN_ROOT_FIELDS.includes("vendorEntryLayer"), true);
});
