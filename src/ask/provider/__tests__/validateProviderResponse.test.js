import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  NORMALIZED_PROVIDER_STATUSES,
  PRICING_CATEGORIES,
  PROVIDER_CONTRACT_SCHEMA_VERSION,
} from "../providerContract.js";
import {
  buildProviderValidationOptions,
  buildSafeResponse,
  collectDiagnosticsFailures,
  collectEvidenceFailures,
  collectFreshnessFailures,
  deriveRenderableSections,
  validateNormalizedProviderResponse,
} from "../validateProviderResponse.js";

const {
  SCHEMA_INVALID,
  PROVIDER_ERROR,
  PROVIDER_TIMEOUT,
  BLOCKED,
  EVIDENCE_REQUIRED,
  SOURCE_STALE,
  UNSUPPORTED,
  WARNING,
  READY,
} = NORMALIZED_PROVIDER_STATUSES;

const NOW = "2026-07-02T12:00:00.000Z";
const VALIDATOR_FILE = new URL("../validateProviderResponse.js", import.meta.url);
const validatorContent = readFileSync(VALIDATOR_FILE, "utf8");
const FORBIDDEN_API_PATH = ["/api/", "ask-dify"].join("");
const FORBIDDEN_SET_ANSWER = ["set", "Answer"].join("");
const NETWORK_TOKENS = [
  ["fet", "ch("].join(""),
  ["axi", "os"].join(""),
  ["XMLHttp", "Request"].join(""),
  ["Event", "Source"].join(""),
  ["Web", "Socket"].join(""),
];

const buildSource = (overrides = {}) => ({
  id: "src_quote_001",
  title: "Vendor quote bulletin",
  publisher: "Vendor",
  locator: "https://example.com/quote",
  sourceType: "quote_document",
  reliabilityTier: "L4",
  publishedAt: "2026-07-02T01:00:00.000Z",
  accessedAt: "2026-07-02T02:00:00.000Z",
  freshnessAsOf: "2026-07-02T01:00:00.000Z",
  ...overrides,
});

const buildClaim = (overrides = {}) => ({
  id: "claim_quote_001",
  claim: "今日价格为 100",
  claimType: "pricing",
  linkedSourceRefIds: ["src_quote_001"],
  confidence: "high",
  freshnessSensitivity: "pricing.live_exact_quote",
  sourceRequired: true,
  pricingCategory: PRICING_CATEGORIES.LIVE_EXACT_QUOTE,
  status: READY,
  ...overrides,
});

const buildResponse = (overrides = {}) => ({
  schemaVersion: PROVIDER_CONTRACT_SCHEMA_VERSION,
  responseId: "resp_provider_validator_001",
  provider: {
    name: "validator_test",
    mode: "mock",
  },
  status: READY,
  generatedAt: NOW,
  freshness: {
    generatedAt: NOW,
    categoryResults: [],
  },
  sourceRefs: [buildSource()],
  claimRefs: [buildClaim()],
  limitations: [],
  summary: "Safe provider summary",
  sections: [
    {
      id: "section_overview",
      title: "Overview",
      body: "Reference-only overview",
    },
  ],
  diagnostics: {
    safe: false,
    reasonCodes: ["validator_ready"],
    sanitizedTraceId: "trace_safe_001",
    providerMode: "mock",
  },
  ...overrides,
});

test("valid ready response passes", () => {
  const result = validateNormalizedProviderResponse(buildResponse(), { nowIso: NOW });

  assert.equal(result.ok, true);
  assert.equal(result.status, READY);
  assert.deepEqual(result.errors, []);
  assert.equal(result.safeResponse.summary, "Safe provider summary");
  assert.deepEqual(result.renderableSections, ["response", "claims", "sources", "freshness"]);
});

test("buildProviderValidationOptions returns strict defaults", () => {
  const result = buildProviderValidationOptions();

  assert.equal(result.mode, "strict");
  assert.equal(result.expectedSchemaVersion, PROVIDER_CONTRACT_SCHEMA_VERSION);
  assert.equal(result.allowLocalMockLimitation, false);
  assert.equal(result.strictEvidence, true);
  assert.equal(result.strictFreshness, true);
  assert.ok(Array.isArray(result.forbiddenUiClaims));
  assert.equal(result.sourceRequiredClaimTypes.length, 0);
});

test("invalid nowIso produces schema_invalid", () => {
  const result = validateNormalizedProviderResponse(buildResponse(), {
    nowIso: "2026-07-02",
  });

  assert.equal(result.status, SCHEMA_INVALID);
  assert.equal(result.errors.includes("nowIso must be UTC ISO-8601"), true);
});

test("malformed response produces schema_invalid", () => {
  const result = validateNormalizedProviderResponse("bad response", { nowIso: NOW });

  assert.equal(result.status, SCHEMA_INVALID);
  assert.equal(result.safeResponse, null);
});

test("rawProviderPayload present produces schema_invalid", () => {
  const result = validateNormalizedProviderResponse(buildResponse({
    rawProviderPayload: {
      answer: "must not persist",
    },
  }), { nowIso: NOW });

  assert.equal(result.status, SCHEMA_INVALID);
  assert.equal(result.safeResponse, null);
});

test("forbidden diagnostics produce schema_invalid with sanitized diagnostics", () => {
  const result = validateNormalizedProviderResponse(buildResponse({
    diagnostics: {
      reasonCodes: ["provider_error"],
      providerMode: "mock",
      appId: "drop-me",
      apiToken: "secret",
    },
  }), { nowIso: NOW });

  assert.equal(result.status, SCHEMA_INVALID);
  assert.deepEqual(result.sanitizedDiagnostics, {
    safe: true,
    reasonCodes: ["provider_error"],
    providerMode: "mock",
  });
});

test("provider_error status is preserved", () => {
  const result = validateNormalizedProviderResponse(buildResponse({
    status: PROVIDER_ERROR,
  }), { nowIso: NOW });

  assert.equal(result.status, PROVIDER_ERROR);
  assert.equal(result.safeResponse, null);
});

test("provider_timeout status is preserved", () => {
  const result = validateNormalizedProviderResponse(buildResponse({
    status: PROVIDER_TIMEOUT,
  }), { nowIso: NOW });

  assert.equal(result.status, PROVIDER_TIMEOUT);
  assert.equal(result.safeResponse, null);
});

test("sourceRefs duplicate id produces schema_invalid", () => {
  const result = validateNormalizedProviderResponse(buildResponse({
    sourceRefs: [buildSource(), buildSource()],
  }), { nowIso: NOW });

  assert.equal(result.status, SCHEMA_INVALID);
  assert.equal(result.errors.some((item) => item.includes("duplicate sourceRef id")), true);
});

test("source-required claim with empty links produces evidence_required", () => {
  const result = validateNormalizedProviderResponse(buildResponse({
    claimRefs: [buildClaim({ linkedSourceRefIds: [] })],
  }), { nowIso: NOW });

  assert.equal(result.status, EVIDENCE_REQUIRED);
  assert.equal(result.missingEvidence.length, 1);
});

test("linkedSourceRefIds pointing to missing source produces evidence_required", () => {
  const result = validateNormalizedProviderResponse(buildResponse({
    claimRefs: [buildClaim({ linkedSourceRefIds: ["src_missing"] })],
  }), { nowIso: NOW });

  assert.equal(result.status, EVIDENCE_REQUIRED);
  assert.equal(result.missingEvidence[0].linkedSourceRefIds.includes("src_missing"), true);
});

test("live exact quote within 24 hours passes", () => {
  const result = validateNormalizedProviderResponse(buildResponse(), { nowIso: NOW });

  assert.equal(result.status, READY);
});

test("live exact quote older than 24 hours blocks", () => {
  const result = validateNormalizedProviderResponse(buildResponse({
    sourceRefs: [
      buildSource({
        publishedAt: "2026-06-30T11:00:00.000Z",
        freshnessAsOf: "2026-06-30T11:00:00.000Z",
      }),
    ],
  }), { nowIso: NOW });

  assert.equal(result.status, BLOCKED);
});

test("live exact quote without hour-level timestamp blocks or evidence_required", () => {
  const result = validateNormalizedProviderResponse(buildResponse({
    sourceRefs: [
      buildSource({
        publishedAt: "2026-07-02",
        freshnessAsOf: "",
      }),
    ],
  }), { nowIso: NOW });

  assert.equal([BLOCKED, EVIDENCE_REQUIRED].includes(result.status), true);
});

test("reference pricing stale produces source_stale", () => {
  const result = validateNormalizedProviderResponse(buildResponse({
    claimRefs: [
      buildClaim({
        claim: "参考价格区间为 90 到 110",
        freshnessSensitivity: "pricing.reference_trend",
        pricingCategory: PRICING_CATEGORIES.REFERENCE_TREND,
      }),
    ],
    sourceRefs: [
      buildSource({
        publishedAt: "2026-05-01",
        freshnessAsOf: "",
      }),
    ],
  }), { nowIso: NOW });

  assert.equal(result.status, SOURCE_STALE);
  assert.deepEqual(result.renderableSections, ["reference", "limitations"]);
});

test("warning plus evidence_required resolves to evidence_required", () => {
  const result = validateNormalizedProviderResponse(buildResponse({
    status: WARNING,
    claimRefs: [buildClaim({ linkedSourceRefIds: [] })],
  }), { nowIso: NOW });

  assert.equal(result.status, EVIDENCE_REQUIRED);
});

test("warning plus blocked resolves to blocked", () => {
  const result = validateNormalizedProviderResponse(buildResponse({
    status: WARNING,
    sourceRefs: [
      buildSource({
        publishedAt: "2026-06-30T11:00:00.000Z",
        freshnessAsOf: "2026-06-30T11:00:00.000Z",
      }),
    ],
  }), { nowIso: NOW });

  assert.equal(result.status, BLOCKED);
});

test("unsupported market claim produces unsupported", () => {
  const result = validateNormalizedProviderResponse(buildResponse({
    claimRefs: [
      buildClaim({
        id: "claim_market_unsupported",
        claim: "市场特殊判断",
        claimType: "market_claim",
        freshnessSensitivity: "market.unsupported",
        pricingCategory: PRICING_CATEGORIES.UNKNOWN,
        linkedSourceRefIds: ["src_quote_001"],
      }),
    ],
  }), { nowIso: NOW });

  assert.equal(result.status, UNSUPPORTED);
});

test("collectDiagnosticsFailures strips dify internals", () => {
  const result = collectDiagnosticsFailures(buildResponse({
    diagnostics: {
      reasonCodes: ["warning"],
      providerMode: "mock",
      nodeName: "dify-node",
      difyWorkflowId: "wf_123",
      appId: "app_123",
      env: "prod",
    },
  }));

  assert.equal(result.statuses.includes(SCHEMA_INVALID), true);
  assert.deepEqual(result.sanitizedDiagnostics, {
    safe: true,
    reasonCodes: ["warning"],
    providerMode: "mock",
  });
});

test("safeResponse excludes diagnostics and raw payload", () => {
  const result = validateNormalizedProviderResponse(buildResponse(), { nowIso: NOW });

  assert.equal("diagnostics" in result.safeResponse, false);
  assert.equal(JSON.stringify(result.safeResponse).includes("rawProviderPayload"), false);
});

test("renderableSections are empty for schema_invalid", () => {
  const result = validateNormalizedProviderResponse(buildResponse({
    rawProviderPayload: "bad",
  }), { nowIso: NOW });

  assert.deepEqual(result.renderableSections, []);
});

test("renderableSections are limitation-only for evidence_required", () => {
  const result = validateNormalizedProviderResponse(buildResponse({
    claimRefs: [buildClaim({ linkedSourceRefIds: [] })],
  }), { nowIso: NOW });

  assert.deepEqual(result.renderableSections, ["limitations"]);
});

test("validator file does not import App.jsx runtime adapters or validateAskResponse", () => {
  assert.equal(validatorContent.includes("App.jsx"), false);
  assert.equal(validatorContent.includes("runAskPreviewAdapter"), false);
  assert.equal(validatorContent.includes("runAskPipelineAdapter"), false);
  assert.equal(validatorContent.includes("validateAskResponse"), false);
});

test("validator file contains no network primitives", () => {
  for (const token of NETWORK_TOKENS) {
    assert.equal(validatorContent.includes(token), false);
  }
});

test("validator file does not mention api ask dify", () => {
  assert.equal(validatorContent.includes(FORBIDDEN_API_PATH), false);
});

test("validator file does not mention legacy answer setter", () => {
  assert.equal(validatorContent.includes(FORBIDDEN_SET_ANSWER), false);
});

test("forbidden UI activation claims are not emitted in safeResponse", () => {
  const result = validateNormalizedProviderResponse(buildResponse({
    summary: "Provider active and Dify active",
  }), { nowIso: NOW });

  assert.equal(result.status, BLOCKED);
  assert.equal(JSON.stringify(result.safeResponse).includes("Provider active"), false);
  assert.equal(JSON.stringify(result.safeResponse).includes("Dify active"), false);
});

test("collectEvidenceFailures returns structured missingEvidence", () => {
  const result = collectEvidenceFailures(buildResponse({
    claimRefs: [buildClaim({ linkedSourceRefIds: [] })],
  }), { nowIso: NOW });

  assert.equal(result.statuses.includes(EVIDENCE_REQUIRED), true);
  assert.equal(result.missingEvidence.length, 1);
  assert.equal(result.missingEvidence[0].claimId, "claim_quote_001");
});

test("collectFreshnessFailures returns structured staleSources", () => {
  const result = collectFreshnessFailures(buildResponse({
    claimRefs: [
      buildClaim({
        claim: "参考价格区间为 90 到 110",
        freshnessSensitivity: "pricing.reference_trend",
        pricingCategory: PRICING_CATEGORIES.REFERENCE_TREND,
      }),
    ],
    sourceRefs: [
      buildSource({
        publishedAt: "2026-05-01",
        freshnessAsOf: "",
      }),
    ],
  }), { nowIso: NOW, pricingPolicy: {} });

  assert.equal(result.statuses.includes(SOURCE_STALE) || result.statuses.includes(UNSUPPORTED), true);
});

test("buildSafeResponse returns null for provider_error", () => {
  const result = buildSafeResponse(buildResponse(), {
    status: PROVIDER_ERROR,
    options: buildProviderValidationOptions({ nowIso: NOW }),
  });

  assert.equal(result, null);
});

test("deriveRenderableSections returns ready sections for sanitized ready content", () => {
  const safeResponse = {
    summary: "safe",
    claimRefs: [buildClaim()],
    sourceRefs: [buildSource()],
    freshness: { generatedAt: NOW },
    limitations: [],
  };

  assert.deepEqual(
    deriveRenderableSections({ status: READY, safeResponse }),
    ["response", "claims", "sources", "freshness"],
  );
});
