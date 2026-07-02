import test from "node:test";
import assert from "node:assert/strict";

import {
  ALLOWED_MAX_AGE_WINDOWS,
  FRESHNESS_CATEGORIES,
  NORMALIZED_PROVIDER_STATUSES,
  PRICING_CATEGORIES,
  PROVIDER_CONTRACT_NON_CLAIMS,
  PROVIDER_CONTRACT_SCHEMA_VERSION,
} from "../providerContract.js";
import {
  classifyPricingClaimText,
  evaluateEvidenceBlockingCase,
  evaluateFreshnessForClaim,
  getValidationWinner,
  hasForbiddenDiagnosticFields,
  sanitizeProviderDiagnostics,
  validateClaimRefs,
  validateNormalizedProviderResponseShape,
  validateProviderRequestShape,
  validateSourceRefs,
} from "../providerContractSchema.js";

const NOW = "2026-07-02T12:00:00.000Z";

const buildRequest = (overrides = {}) => ({
  requestId: "req_provider_contract_001",
  question: "请给出参考价格区间",
  taskContext: {
    route: "/ask",
    module: "ask",
  },
  intent: "market_analysis",
  constraints: {
    previewOnly: true,
    noFabricatedEvidence: true,
    noDefaultAskReplacement: true,
  },
  policies: {
    providerPolicy: {},
    sourcePolicy: {},
    freshnessPolicy: {},
    timeoutPolicy: {},
    nonClaimPolicy: {},
  },
  locale: "zh-CN",
  ...overrides,
});

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
  freshnessSensitivity: FRESHNESS_CATEGORIES.PRICING_LIVE_EXACT_QUOTE,
  sourceRequired: true,
  pricingCategory: PRICING_CATEGORIES.LIVE_EXACT_QUOTE,
  status: NORMALIZED_PROVIDER_STATUSES.READY,
  ...overrides,
});

const buildResponse = (overrides = {}) => ({
  schemaVersion: PROVIDER_CONTRACT_SCHEMA_VERSION,
  responseId: "resp_provider_contract_001",
  provider: {
    name: "static_contract_test",
    mode: "mock",
  },
  status: NORMALIZED_PROVIDER_STATUSES.READY,
  generatedAt: NOW,
  freshness: {
    generatedAt: NOW,
    categoryResults: [],
  },
  sourceRefs: [buildSource()],
  claimRefs: [buildClaim()],
  limitations: [],
  ...overrides,
});

test("required request shape passes", () => {
  assert.deepEqual(validateProviderRequestShape(buildRequest()), {
    ok: true,
    status: NORMALIZED_PROVIDER_STATUSES.READY,
    errors: [],
  });
});

test("request rejects forbidden Dify token env and stack fields", () => {
  const result = validateProviderRequestShape(buildRequest({
    difyToken: "secret",
    env: "prod",
    nested: {
      stack: "trace",
    },
  }));

  assert.equal(result.ok, false);
  assert.equal(result.status, NORMALIZED_PROVIDER_STATUSES.SCHEMA_INVALID);
  assert.equal(result.errors.some((error) => error.includes("forbidden request fields")), true);
});

test("request requires previewOnly noFabricatedEvidence and noDefaultAskReplacement", () => {
  const result = validateProviderRequestShape(buildRequest({
    constraints: {
      previewOnly: false,
      noFabricatedEvidence: false,
      noDefaultAskReplacement: false,
    },
  }));

  assert.equal(result.ok, false);
  assert.equal(result.errors.includes("constraints.previewOnly must be true"), true);
  assert.equal(result.errors.includes("constraints.noFabricatedEvidence must be true"), true);
  assert.equal(result.errors.includes("constraints.noDefaultAskReplacement must be true"), true);
});

test("required normalized response shape passes", () => {
  assert.deepEqual(validateNormalizedProviderResponseShape(buildResponse()), {
    ok: true,
    status: NORMALIZED_PROVIDER_STATUSES.READY,
    errors: [],
  });
});

test("response rejects raw provider payload", () => {
  const result = validateNormalizedProviderResponseShape(buildResponse({
    rawProviderPayload: {
      content: "must not persist",
    },
  }));

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.includes("rawProviderPayload")), true);
});

test("response rejects forbidden diagnostics", () => {
  const result = validateNormalizedProviderResponseShape(buildResponse({
    diagnostics: {
      reasonCodes: [],
      apiToken: "secret",
    },
  }));

  assert.equal(result.ok, false);
  assert.equal(hasForbiddenDiagnosticFields({ apiToken: "secret" }), true);
});

test("status precedence winner works", () => {
  assert.equal(
    getValidationWinner([
      NORMALIZED_PROVIDER_STATUSES.WARNING,
      NORMALIZED_PROVIDER_STATUSES.EVIDENCE_REQUIRED,
      NORMALIZED_PROVIDER_STATUSES.READY,
    ]),
    NORMALIZED_PROVIDER_STATUSES.EVIDENCE_REQUIRED,
  );
  assert.equal(getValidationWinner(["unexpected_status"]), NORMALIZED_PROVIDER_STATUSES.SCHEMA_INVALID);
});

test("sourceRef validation detects duplicate ids", () => {
  const result = validateSourceRefs([buildSource(), buildSource()]);

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.includes("duplicate sourceRef id")), true);
});

test("sourceRef validation requires accessedAt", () => {
  const source = buildSource();
  delete source.accessedAt;
  const result = validateSourceRefs([source]);

  assert.equal(result.ok, false);
  assert.equal(result.errors.some((error) => error.includes("accessedAt is required")), true);
});

test("claimRef source-required with empty links returns evidence_required", () => {
  const result = validateClaimRefs([
    buildClaim({ linkedSourceRefIds: [] }),
  ], [buildSource()]);

  assert.equal(result.ok, false);
  assert.equal(result.status, NORMALIZED_PROVIDER_STATUSES.EVIDENCE_REQUIRED);
});

test("claimRef linked missing source id returns evidence_required", () => {
  const result = validateClaimRefs([
    buildClaim({ linkedSourceRefIds: ["src_missing"] }),
  ], [buildSource()]);

  assert.equal(result.ok, false);
  assert.equal(result.status, NORMALIZED_PROVIDER_STATUSES.EVIDENCE_REQUIRED);
});

test("pricing classifier detects live exact quote indicators", () => {
  assert.equal(
    classifyPricingClaimText("当前价格为 100 元，可成交价有效到今天"),
    PRICING_CATEGORIES.LIVE_EXACT_QUOTE,
  );
  assert.equal(classifyPricingClaimText("live quote valid until Friday"), PRICING_CATEGORIES.LIVE_EXACT_QUOTE);
});

test("pricing classifier detects reference trend indicators", () => {
  assert.equal(
    classifyPricingClaimText("参考价格区间呈下降趋势"),
    PRICING_CATEGORIES.REFERENCE_TREND,
  );
  assert.equal(classifyPricingClaimText("benchmark reference range"), PRICING_CATEGORIES.REFERENCE_TREND);
});

test("ambiguous current pricing classifies as live exact quote", () => {
  assert.equal(classifyPricingClaimText("最新价格可能为 100"), PRICING_CATEGORIES.LIVE_EXACT_QUOTE);
});

test("live exact quote within 24 hours with valid source passes", () => {
  const result = evaluateFreshnessForClaim(buildClaim(), [buildSource()], NOW);

  assert.equal(result.status, NORMALIZED_PROVIDER_STATUSES.READY);
  assert.deepEqual(result.errors, []);
});

test("live exact quote older than 24 hours blocks or evidence-required", () => {
  const result = evaluateFreshnessForClaim(
    buildClaim(),
    [buildSource({ publishedAt: "2026-07-01T11:00:00.000Z", freshnessAsOf: "2026-07-01T11:00:00.000Z" })],
    NOW,
  );

  assert.equal(result.status, NORMALIZED_PROVIDER_STATUSES.BLOCKED);
});

test("live exact quote without hour-level timestamp blocks or evidence-required", () => {
  const result = evaluateFreshnessForClaim(
    buildClaim(),
    [buildSource({ publishedAt: "2026-07-02", freshnessAsOf: "" })],
    NOW,
  );

  assert.equal(result.status, NORMALIZED_PROVIDER_STATUSES.BLOCKED);
});

test("reference pricing stale maps to source_stale", () => {
  const result = evaluateFreshnessForClaim(
    buildClaim({
      claim: "参考价格区间为 90 到 110",
      freshnessSensitivity: FRESHNESS_CATEGORIES.PRICING_REFERENCE_TREND,
      pricingCategory: PRICING_CATEGORIES.REFERENCE_TREND,
    }),
    [buildSource({ publishedAt: "2026-05-01", freshnessAsOf: "" })],
    NOW,
  );

  assert.equal(ALLOWED_MAX_AGE_WINDOWS[FRESHNESS_CATEGORIES.PRICING_REFERENCE_TREND].maxAgeHours, 720);
  assert.equal(result.status, NORMALIZED_PROVIDER_STATUSES.SOURCE_STALE);
});

test("diagnostics sanitizer strips forbidden fields", () => {
  const result = sanitizeProviderDiagnostics({
    safe: false,
    reasonCodes: ["provider_error"],
    sanitizedTraceId: "trace_safe_001",
    providerMode: "mock",
    rawProviderPayload: "drop me",
    stack: "drop me",
  });

  assert.deepEqual(result, {
    safe: true,
    reasonCodes: ["provider_error"],
    sanitizedTraceId: "trace_safe_001",
    providerMode: "mock",
  });
});

test("no helper introduces Provider or Dify activation", () => {
  const serializedNonClaims = JSON.stringify(PROVIDER_CONTRACT_NON_CLAIMS);
  const evidenceResult = evaluateEvidenceBlockingCase({
    claimRef: buildClaim({ linkedSourceRefIds: [] }),
    sourceRefs: [buildSource()],
    nowIso: NOW,
  });

  assert.equal(serializedNonClaims.includes("activate a Provider"), true);
  assert.equal(serializedNonClaims.includes("activate Dify"), true);
  assert.equal(evidenceResult.status, NORMALIZED_PROVIDER_STATUSES.EVIDENCE_REQUIRED);
});
