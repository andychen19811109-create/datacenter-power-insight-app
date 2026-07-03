import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  NORMALIZED_PROVIDER_STATUSES,
  PRICING_CATEGORIES,
  PROVIDER_CONTRACT_SCHEMA_VERSION,
} from "../providerContract.js";
import {
  buildProviderRendererOptions,
  buildProviderRendererViewModel,
  buildSourceBadges,
  deriveProviderDisplayMode,
  renderValidatedProviderResponse,
  sanitizeRenderableSections,
} from "../renderProviderResponse.js";

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

const RENDERER_FILE = new URL("../renderProviderResponse.js", import.meta.url);
const rendererContent = readFileSync(RENDERER_FILE, "utf8");
const FORBIDDEN_API_PATH = ["/api/", "ask-dify"].join("");
const FORBIDDEN_SET_ANSWER = ["set", "Answer"].join("");
const NETWORK_TOKENS = [
  ["fet", "ch("].join(""),
  ["axi", "os"].join(""),
  ["XMLHttp", "Request"].join(""),
  ["Event", "Source"].join(""),
  ["Web", "Socket"].join(""),
];

const NOW = "2026-07-03T02:30:00.000Z";

const buildSource = (overrides = {}) => ({
  id: "src_ready_001",
  title: "Vendor benchmark bulletin",
  publisher: "Vendor",
  locator: "https://example.com/benchmark",
  sourceType: "quote_document",
  reliabilityTier: "L4",
  ...overrides,
});

const buildClaim = (overrides = {}) => ({
  id: "claim_ready_001",
  claim: "Reference benchmark remains in the 90-110 range",
  claimType: "pricing",
  linkedSourceRefIds: ["src_ready_001"],
  confidence: "high",
  pricingCategory: PRICING_CATEGORIES.REFERENCE_TREND,
  sourceRequired: true,
  ...overrides,
});

const buildSafeResponse = (overrides = {}) => ({
  schemaVersion: PROVIDER_CONTRACT_SCHEMA_VERSION,
  responseId: "resp_renderer_001",
  provider: {
    name: "renderer_test",
    mode: "mock",
  },
  status: READY,
  generatedAt: NOW,
  freshness: {
    generatedAt: NOW,
    categoryResults: [],
  },
  limitations: [],
  sourceRefs: [buildSource()],
  claimRefs: [buildClaim()],
  summary: "Safe provider summary",
  sections: [
    {
      id: "section_overview",
      title: "Overview",
      body: "Reference benchmark only",
    },
  ],
  ...overrides,
});

const buildValidationResult = (overrides = {}) => ({
  ok: true,
  status: READY,
  errors: [],
  warnings: [],
  safeResponse: buildSafeResponse(),
  blockedClaims: [],
  renderableSections: ["response", "claims", "sources", "freshness"],
  missingEvidence: [],
  staleSources: [],
  sanitizedDiagnostics: {
    safe: true,
    reasonCodes: ["validator_ready"],
    providerMode: "mock",
  },
  decisionTrace: [
    {
      step: "validate_shape",
      status: READY,
      errorCount: 0,
      claimId: "claim_ready_001",
      rawPayloadPaths: ["rawProviderPayload"],
    },
  ],
  ...overrides,
});

test("schema_invalid returns canRender false and empty sections", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    status: SCHEMA_INVALID,
    ok: false,
    errors: ["rawProviderPayload secret must not surface"],
    safeResponse: null,
    renderableSections: [],
  }));

  assert.equal(result.canRender, false);
  assert.equal(result.displayMode, "limitation_only");
  assert.deepEqual(result.sections, []);
});

test("schema_invalid does not expose raw errors or diagnostics", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    status: SCHEMA_INVALID,
    ok: false,
    errors: ["apiToken secret stack env"],
    safeResponse: null,
    sanitizedDiagnostics: {
      safe: true,
      reasonCodes: ["raw_error_should_not_render"],
    },
    renderableSections: [],
  }));

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("apiToken"), false);
  assert.equal(serialized.includes("secret"), false);
  assert.equal(serialized.includes("raw_error_should_not_render"), false);
});

test("provider_error returns limitation only", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    status: PROVIDER_ERROR,
    ok: false,
    safeResponse: null,
    renderableSections: [],
  }));

  assert.equal(result.canRender, false);
  assert.equal(result.displayMode, "limitation_only");
  assert.deepEqual(result.sections, []);
  assert.equal(result.limitations.length > 0, true);
});

test("provider_timeout returns limitation only", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    status: PROVIDER_TIMEOUT,
    ok: false,
    safeResponse: null,
    renderableSections: [],
  }));

  assert.equal(result.canRender, false);
  assert.deepEqual(result.sections, []);
  assert.equal(result.limitations.length > 0, true);
});

test("blocked returns no factual report section", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    status: BLOCKED,
    ok: false,
    safeResponse: buildSafeResponse(),
    blockedClaims: [{ claimId: "claim_blocked_001", claimType: "pricing", status: BLOCKED }],
    renderableSections: ["limitations"],
  }));

  assert.equal(result.canRender, false);
  assert.deepEqual(result.sections, []);
  assert.equal(result.blockedClaimNotices.length, 1);
});

test("blocked live quote does not render partial quote", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    status: BLOCKED,
    ok: false,
    safeResponse: buildSafeResponse({
      claimRefs: [
        buildClaim({
          claim: "today's price is 100",
          pricingCategory: PRICING_CATEGORIES.LIVE_EXACT_QUOTE,
        }),
      ],
    }),
    blockedClaims: [{ claimId: "claim_quote_live", claimType: "pricing", pricingCategory: PRICING_CATEGORIES.LIVE_EXACT_QUOTE, status: BLOCKED }],
    renderableSections: ["claims"],
  }));

  const serialized = JSON.stringify(result);
  assert.deepEqual(result.sections, []);
  assert.equal(serialized.includes("today's price"), false);
});

test("evidence_required returns limitation only", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    status: EVIDENCE_REQUIRED,
    ok: false,
    safeResponse: buildSafeResponse({
      missingEvidence: [{ shouldNot: "matter" }],
    }),
    missingEvidence: [{ claimId: "claim_missing_001", claimType: "pricing", linkedSourceRefIds: [], errors: ["missing source"] }],
    renderableSections: ["limitations"],
  }));

  assert.equal(result.canRender, false);
  assert.deepEqual(result.sections, []);
  assert.equal(result.evidenceNotices.length, 1);
});

test("evidence_required does not fabricate sources", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    status: EVIDENCE_REQUIRED,
    ok: false,
    safeResponse: buildSafeResponse({
      sourceRefs: [],
      claimRefs: [buildClaim({ linkedSourceRefIds: [] })],
    }),
    missingEvidence: [{ claimId: "claim_missing_001", claimType: "pricing", linkedSourceRefIds: ["src_missing"], errors: ["missing source"] }],
    renderableSections: ["limitations"],
  }));

  assert.deepEqual(result.sourceBadges, []);
  assert.equal(JSON.stringify(result).includes("src_missing") || result.evidenceNotices[0].linkedSourceRefIds.includes("src_missing"), true);
});

test("source_stale renders reference historical trend label only", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    status: SOURCE_STALE,
    warnings: ["stale warning"],
    safeResponse: buildSafeResponse({
      summary: "reference trend pricing",
      claimRefs: [
        buildClaim({
          claim: "historical trend range remains 90-110",
          pricingCategory: PRICING_CATEGORIES.REFERENCE_TREND,
        }),
      ],
    }),
    staleSources: [{ claimId: "claim_ready_001", sourceIds: ["src_ready_001"], pricingCategory: PRICING_CATEGORIES.REFERENCE_TREND }],
    renderableSections: ["reference", "claims", "sources", "freshness"],
  }));

  assert.equal(result.canRender, true);
  assert.equal(result.displayMode, "reference_only");
  assert.equal(result.stalenessNotices[0].message.includes("reference") || result.stalenessNotices[0].message.includes("historical"), true);
});

test("stale reference pricing cannot be labeled current quote", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    status: SOURCE_STALE,
    safeResponse: buildSafeResponse({
      summary: "current price benchmark",
      claimRefs: [
        buildClaim({
          claim: "current price benchmark",
          pricingCategory: PRICING_CATEGORIES.REFERENCE_TREND,
        }),
      ],
    }),
    staleSources: [{ claimId: "claim_ready_001", sourceIds: ["src_ready_001"], pricingCategory: PRICING_CATEGORIES.REFERENCE_TREND }],
    renderableSections: ["reference", "claims"],
  }));

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("current price"), false);
  assert.equal(serialized.includes("latest quote"), false);
});

test("unsupported returns limitation only or empty", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    status: UNSUPPORTED,
    ok: false,
    safeResponse: buildSafeResponse(),
    renderableSections: ["limitations"],
  }));

  assert.equal(result.canRender, false);
  assert.deepEqual(result.sections, []);
  assert.equal(result.limitations.length > 0, true);
});

test("warning includes visible warning and does not render full production report", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    status: WARNING,
    warnings: ["raw internal warning"],
    safeResponse: buildSafeResponse(),
    renderableSections: ["response", "claims", "sources", "freshness"],
  }));

  assert.equal(result.canRender, true);
  assert.equal(result.displayMode, "warning_report");
  assert.equal(result.warnings.length > 0, true);
  assert.equal(result.sections.some((section) => section.kind === "claims"), false);
  assert.equal(result.sections.some((section) => section.kind === "freshness"), false);
});

test("ready renders sanitized sections", () => {
  const result = renderValidatedProviderResponse(buildValidationResult());

  assert.equal(result.canRender, true);
  assert.equal(result.displayMode, "ready_report");
  assert.equal(result.sections.length > 0, true);
});

test("ready source badges generated only from existing safe sourceRefs", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    safeResponse: buildSafeResponse({
      sourceRefs: [
        buildSource(),
        buildSource({ id: "src_ready_002", title: "Vendor note", locator: "https://example.com/note" }),
      ],
    }),
  }));

  assert.equal(result.sourceBadges.length, 2);
  assert.equal(result.sourceBadges.every((item) => item.sourceId), true);
});

test("missing source URL does not generate fake URL", () => {
  const result = buildSourceBadges(buildValidationResult({
    safeResponse: buildSafeResponse({
      sourceRefs: [buildSource({ locator: "" })],
    }),
  }), buildProviderRendererOptions());

  assert.equal("url" in result[0], false);
});

test("linked claim with missing source is not rendered as sourced", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    safeResponse: buildSafeResponse({
      claimRefs: [
        buildClaim({
          id: "claim_missing_link",
          linkedSourceRefIds: ["src_missing"],
          sourceRequired: false,
        }),
      ],
    }),
  }));

  const claimsSection = result.sections.find((section) => section.kind === "claims");
  assert.equal(Array.isArray(claimsSection.items), true);
  assert.equal("sourceIds" in claimsSection.items[0], false);
});

test("dify internals are not rendered", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    safeResponse: buildSafeResponse({
      sourceRefs: [
        buildSource({
          appId: "app_123",
          nodeName: "dify-node",
        }),
      ],
      sections: [
        {
          id: "section_overview",
          title: "Overview",
          body: "Dify active should never show",
          difyWorkflowId: "wf_123",
        },
      ],
    }),
  }));

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("app_123"), false);
  assert.equal(serialized.includes("wf_123"), false);
  assert.equal(serialized.includes("dify-node"), false);
});

test("rawProviderPayload is not rendered", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    safeResponse: buildSafeResponse({
      rawProviderPayload: {
        answer: "should never render",
      },
      sections: [
        {
          id: "section_overview",
          title: "Overview",
          body: "Safe",
          rawProviderPayload: "drop me",
        },
      ],
    }),
  }));

  assert.equal(JSON.stringify(result).includes("rawProviderPayload"), false);
  assert.equal(JSON.stringify(result).includes("should never render"), false);
});

test("env stack tokens and prompt internals are not rendered", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    safeResponse: buildSafeResponse({
      sections: [
        {
          id: "section_overview",
          title: "Overview",
          body: "Safe",
          env: "prod",
          stack: "stack_dump_token",
          apiToken: "secret",
          promptInternals: "hidden",
        },
      ],
    }),
    decisionTrace: [
      {
        step: "collect_diagnostics_failures",
        status: READY,
        secret: "hidden",
      },
    ],
  }));

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("prod"), false);
  assert.equal(serialized.includes("stack_dump_token"), false);
  assert.equal(serialized.includes("secret"), false);
  assert.equal(serialized.includes("hidden"), false);
});

test("includeDiagnostics false hides diagnostics", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    status: EVIDENCE_REQUIRED,
    missingEvidence: [{ claimId: "claim_missing_001", claimType: "pricing", linkedSourceRefIds: [] }],
  }));

  assert.equal(result.diagnosticNotice, null);
});

test("includeDiagnostics true still only shows sanitized generic diagnostic notice", () => {
  const result = renderValidatedProviderResponse(
    buildValidationResult({
      status: SOURCE_STALE,
      staleSources: [{ claimId: "claim_ready_001", sourceIds: ["src_ready_001"], pricingCategory: PRICING_CATEGORIES.REFERENCE_TREND }],
    }),
    { includeDiagnostics: true },
  );

  assert.equal(result.diagnosticNotice, "部分来源可能过期，仅可作为历史参考。");
  assert.equal(result.diagnosticNotice.includes("src_ready_001"), false);
});

test("pricing reference trend uses reference trend historical wording", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    status: SOURCE_STALE,
    staleSources: [{ claimId: "claim_ready_001", sourceIds: ["src_ready_001"], pricingCategory: PRICING_CATEGORIES.REFERENCE_TREND }],
    safeResponse: buildSafeResponse({
      summary: "historical trend range",
      claimRefs: [buildClaim({ pricingCategory: PRICING_CATEGORIES.REFERENCE_TREND })],
    }),
    renderableSections: ["reference", "claims"],
  }));

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("reference") || serialized.includes("historical"), true);
});

test("live exact quote only renders when status ready and source evidence passed", () => {
  const readyResult = renderValidatedProviderResponse(buildValidationResult({
    status: READY,
    safeResponse: buildSafeResponse({
      claimRefs: [
        buildClaim({
          claim: "today's price is 100",
          pricingCategory: PRICING_CATEGORIES.LIVE_EXACT_QUOTE,
        }),
      ],
    }),
  }));
  const blockedResult = renderValidatedProviderResponse(buildValidationResult({
    status: BLOCKED,
    ok: false,
    safeResponse: buildSafeResponse({
      claimRefs: [
        buildClaim({
          claim: "today's price is 100",
          pricingCategory: PRICING_CATEGORIES.LIVE_EXACT_QUOTE,
        }),
      ],
    }),
    blockedClaims: [{ claimId: "claim_live", claimType: "pricing", pricingCategory: PRICING_CATEGORIES.LIVE_EXACT_QUOTE, status: BLOCKED }],
    renderableSections: ["claims"],
  }));

  assert.equal(JSON.stringify(readyResult).includes("today's price"), true);
  assert.equal(JSON.stringify(blockedResult).includes("today's price"), false);
});

test("unknown pricing includes limitation", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    status: WARNING,
    safeResponse: buildSafeResponse({
      claimRefs: [
        buildClaim({
          claim: "pricing may vary",
          pricingCategory: PRICING_CATEGORIES.UNKNOWN,
        }),
      ],
    }),
  }));

  assert.equal(result.limitations.length > 0, true);
});

test("buildProviderRendererOptions clamps and normalizes defaults safely", () => {
  const result = buildProviderRendererOptions({
    mode: "bad",
    viewer: "bad",
    locale: "",
    includeDiagnostics: "yes",
    safeCopyOnly: "no",
    maxSections: 99,
    maxWarnings: -1,
  });

  assert.equal(result.mode, "preview");
  assert.equal(result.viewer, "user");
  assert.equal(result.locale, "zh-CN");
  assert.equal(result.includeDiagnostics, false);
  assert.equal(result.safeCopyOnly, true);
  assert.equal(result.maxSections, 12);
  assert.equal(result.maxWarnings, 0);
});

test("renderer file does not import App.jsx", () => {
  assert.equal(rendererContent.includes("App.jsx"), false);
});

test("renderer file does not import runtime adapters", () => {
  assert.equal(rendererContent.includes("runAskPreviewAdapter"), false);
  assert.equal(rendererContent.includes("runAskPipelineAdapter"), false);
});

test("renderer file does not import validateAskResponse", () => {
  assert.equal(rendererContent.includes("validateAskResponse"), false);
});

test("renderer file has no network primitives", () => {
  for (const token of NETWORK_TOKENS) {
    assert.equal(rendererContent.includes(token), false);
  }
});

test("renderer file has no api ask dify", () => {
  assert.equal(rendererContent.includes(FORBIDDEN_API_PATH), false);
});

test("renderer file has no setAnswer", () => {
  assert.equal(rendererContent.includes(FORBIDDEN_SET_ANSWER), false);
});

test("renderer does not emit Provider active claims", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    safeResponse: buildSafeResponse({
      summary: "Provider active",
    }),
  }));

  assert.equal(JSON.stringify(result).includes("Provider active"), false);
});

test("renderer does not emit Dify active claims", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    safeResponse: buildSafeResponse({
      summary: "Dify active",
    }),
  }));

  assert.equal(JSON.stringify(result).includes("Dify active"), false);
});

test("renderer does not emit realtime Web active claims", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    safeResponse: buildSafeResponse({
      summary: "realtime Web active",
    }),
  }));

  assert.equal(JSON.stringify(result).includes("realtime Web active"), false);
});

test("renderer does not emit default Ask replacement or production ready claims", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    safeResponse: buildSafeResponse({
      summary: "replacement production-ready",
    }),
  }));

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("replacement"), false);
  assert.equal(serialized.includes("production-ready"), false);
});

test("legacy no impact is preserved by file boundary", () => {
  assert.equal(rendererContent.includes("generateAnswer"), false);
  assert.equal(rendererContent.includes("legacyAnswer"), false);
  assert.equal(rendererContent.includes("setPreviewState"), false);
});

test("decisionTrace is internal only and sanitized", () => {
  const result = renderValidatedProviderResponse(buildValidationResult({
    decisionTrace: [
      {
        step: "collect_diagnostics_failures",
        status: READY,
        errorCount: 2,
        rawPayloadPaths: ["rawProviderPayload"],
        claimId: "claim_ready_001",
        env: "prod",
      },
    ],
  }));

  assert.deepEqual(result.decisionTrace, [
    {
      step: "collect_diagnostics_failures",
      status: READY,
      errorCount: 2,
      claimId: "claim_ready_001",
    },
  ]);
});

test("metadata excludes raw payload and dify internals", () => {
  const result = renderValidatedProviderResponse(buildValidationResult());

  assert.deepEqual(Object.keys(result.metadata).sort(), [
    "displayMode",
    "locale",
    "mode",
    "sectionCount",
    "sourceBadgeCount",
    "status",
    "viewer",
  ]);
});

test("buildProviderRendererViewModel returns safe metadata counts", () => {
  const viewModel = buildProviderRendererViewModel(
    buildValidationResult(),
    buildProviderRendererOptions(),
    {
      canRender: true,
      status: READY,
      displayMode: "ready_report",
      title: "Renderer output",
      summary: "summary",
      sections: [{ id: "response" }],
      limitations: [],
      warnings: ["warn"],
      evidenceNotices: [],
      stalenessNotices: [],
      blockedClaimNotices: [],
      sourceBadges: [{ sourceId: "src_ready_001" }],
      diagnosticNotice: null,
      decisionTrace: [],
    },
  );

  assert.equal(viewModel.metadata.sectionCount, 1);
  assert.equal(viewModel.metadata.sourceBadgeCount, 1);
});

test("deriveProviderDisplayMode maps statuses deterministically", () => {
  assert.equal(deriveProviderDisplayMode(SCHEMA_INVALID), "limitation_only");
  assert.equal(deriveProviderDisplayMode(SOURCE_STALE), "reference_only");
  assert.equal(deriveProviderDisplayMode(WARNING), "warning_report");
  assert.equal(deriveProviderDisplayMode(READY), "ready_report");
});

test("sanitizeRenderableSections for warning suppresses claims and freshness", () => {
  const result = sanitizeRenderableSections(buildValidationResult({
    status: WARNING,
    renderableSections: ["response", "claims", "sources", "freshness"],
  }), buildProviderRendererOptions());

  assert.equal(result.some((section) => section.kind === "claims"), false);
  assert.equal(result.some((section) => section.kind === "freshness"), false);
});
