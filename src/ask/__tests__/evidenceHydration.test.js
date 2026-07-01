import test from "node:test";
import assert from "node:assert/strict";

import { hydrateEvidencePacks } from "../orchestrator/hydrateEvidencePacks.js";

const NOW = "2026-07-01T00:00:00Z";

const assertHydrationResult = (result, expectedStatus, expectedRenderMode, expectedAllowed, expectedReasons = []) => {
  assert.equal(result.validatorStatus, expectedStatus);
  assert.equal(result.renderMode, expectedRenderMode);
  assert.equal(result.allowedToRender, expectedAllowed);
  assert.deepStrictEqual(result.blockingReasons, expectedReasons);
};

const buildRegistry = () => ({
  sources: {
    src_vendor_current: {
      sourceId: "src_vendor_current",
      title: "Vendor CDU Guide",
      organization: "Vendor A",
      sourceTier: "L4_vendor_official",
      publicationDate: "2026-04-01",
      lastVerifiedDate: "2026-06-15",
      freshnessStatus: "current",
      appliesToModules: ["ask_power_insight", "company_intelligence"],
      consumerModule: "ask_power_insight",
      dataDomain: "cdu",
    },
    src_customer_current: {
      sourceId: "src_customer_current",
      title: "Operator Release",
      organization: "Cloud Operator",
      sourceTier: "L3_customer_cloud_operator_official",
      publicationDate: "2026-05-01",
      lastVerifiedDate: "2026-06-25",
      freshnessStatus: "current",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
    },
    src_local_only: {
      sourceId: "src_local_only",
      title: "Local KB Note",
      organization: "Local KB",
      sourceTier: "L5_local_kb",
      publicationDate: "2026-03-01",
      lastVerifiedDate: "2026-03-01",
      freshnessStatus: "stale",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
    },
    src_local_current_support: {
      sourceId: "src_local_current_support",
      title: "Local KB Fresh Note",
      organization: "Local KB",
      sourceTier: "L5_local_kb",
      publicationDate: "2026-06-20",
      lastVerifiedDate: "2026-06-20",
      freshnessStatus: "current",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
    },
    src_uncorroborated: {
      sourceId: "src_uncorroborated",
      title: "Forum Post",
      organization: "Unknown",
      sourceTier: "L6_uncorroborated_reference",
      publicationDate: "2026-05-01",
      lastVerifiedDate: "2026-05-01",
      freshnessStatus: "current",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
    },
    src_missing_freshness: {
      sourceId: "src_missing_freshness",
      title: "White Paper",
      organization: "Vendor A",
      sourceTier: "L4_vendor_official",
      appliesToModules: ["ask_power_insight"],
      consumerModule: "ask_power_insight",
      dataDomain: "cdu",
    },
    src_stale_current: {
      sourceId: "src_stale_current",
      title: "Old Partner Update",
      organization: "Vendor A",
      sourceTier: "L4_vendor_official",
      publicationDate: "2025-01-01",
      lastVerifiedDate: "2025-01-01",
      freshnessStatus: "stale",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
    },
    src_missing_module: {
      sourceId: "src_missing_module",
      title: "Missing Module Source",
      organization: "Vendor A",
      sourceTier: "L4_vendor_official",
      publicationDate: "2026-04-01",
      lastVerifiedDate: "2026-06-15",
      freshnessStatus: "current",
      dataDomain: "cdu",
    },
    src_unsupported_consumer: {
      sourceId: "src_unsupported_consumer",
      title: "Unsupported Consumer Source",
      organization: "Vendor A",
      sourceTier: "L4_vendor_official",
      publicationDate: "2026-04-01",
      lastVerifiedDate: "2026-06-15",
      freshnessStatus: "current",
      appliesToModules: ["ask_power_insight", "legacy_module"],
      consumerModule: "legacy_module",
      dataDomain: "cdu",
    },
    src_unsupported_applies: {
      sourceId: "src_unsupported_applies",
      title: "Unsupported Applies Source",
      organization: "Vendor A",
      sourceTier: "L4_vendor_official",
      publicationDate: "2026-04-01",
      lastVerifiedDate: "2026-06-15",
      freshnessStatus: "current",
      appliesToModules: ["ask_power_insight", "legacy_module"],
      consumerModule: "ask_power_insight",
      dataDomain: "cdu",
    },
    src_excluded_consumer: {
      sourceId: "src_excluded_consumer",
      title: "Excluded Consumer Source",
      organization: "Vendor A",
      sourceTier: "L4_vendor_official",
      publicationDate: "2026-04-01",
      lastVerifiedDate: "2026-06-15",
      freshnessStatus: "current",
      appliesToModules: ["ask_power_insight"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
    },
    src_ask_only_explicit: {
      sourceId: "src_ask_only_explicit",
      title: "Ask-only CDU Support",
      organization: "Vendor A",
      sourceTier: "L4_vendor_official",
      publicationDate: "2026-04-01",
      lastVerifiedDate: "2026-06-15",
      freshnessStatus: "current",
      appliesToModules: ["ask_power_insight"],
      consumerModule: "ask_power_insight",
      dataDomain: "cdu",
    },
    src_company_missing_publication: {
      sourceId: "src_company_missing_publication",
      title: "Company Update Missing Publication Date",
      organization: "Vendor A",
      sourceTier: "L4_vendor_official",
      publicationDate: "",
      lastVerifiedDate: "2026-06-15",
      freshnessStatus: "current",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
    },
    src_company_missing_verification: {
      sourceId: "src_company_missing_verification",
      title: "Company Update Missing Verification Date",
      organization: "Vendor A",
      sourceTier: "L4_vendor_official",
      publicationDate: "2026-04-01",
      lastVerifiedDate: "",
      freshnessStatus: "current",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
    },
    src_vendor_stale_official: {
      sourceId: "src_vendor_stale_official",
      title: "Stale Official Annual Report",
      organization: "Vendor A",
      sourceTier: "L4_vendor_official",
      publicationDate: "2025-01-01",
      lastVerifiedDate: "2025-01-01",
      freshnessStatus: "stale",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
    },
  },
  claims: {
    clm_tech_success: {
      claimId: "clm_tech_success",
      claimText: "CDU thermal loop parameter is validated.",
      objectId: "liquid_cooling_cdu",
      claimType: "technical_parameter",
      sourceIds: ["src_vendor_current"],
      freshnessStatus: "current",
      appliesToModules: ["ask_power_insight"],
      consumerModule: "ask_power_insight",
      dataDomain: "cdu",
    },
    clm_company_current_missing_freshness: {
      claimId: "clm_company_current_missing_freshness",
      claimText: "Current company revenue improved.",
      objectId: "vendor_a",
      claimType: "company_revenue",
      sourceIds: ["src_customer_current"],
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
      currentness: "current",
    },
    clm_latest_partnership_without_official: {
      claimId: "clm_latest_partnership_without_official",
      claimText: "Latest partnership announced.",
      objectId: "vendor_a",
      claimType: "partnership_customer",
      sourceIds: ["src_local_only"],
      freshnessStatus: "current",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
      currentness: "latest",
    },
    clm_annual_report_valid: {
      claimId: "clm_annual_report_valid",
      claimText: "Annual report revenue is source-backed.",
      objectId: "vendor_a",
      claimType: "annual_report_metric",
      sourceIds: ["src_vendor_current"],
      freshnessStatus: "current",
      publicationDate: "2026-04-01",
      lastVerifiedDate: "2026-06-15",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
    },
    clm_company_local_only: {
      claimId: "clm_company_local_only",
      claimText: "Company hard fact from local KB only.",
      objectId: "vendor_a",
      claimType: "company_revenue",
      sourceIds: ["src_local_only"],
      freshnessStatus: "current",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
    },
    clm_company_l6_only: {
      claimId: "clm_company_l6_only",
      claimText: "Company hard fact from L6 only.",
      objectId: "vendor_a",
      claimType: "company_revenue",
      sourceIds: ["src_uncorroborated"],
      freshnessStatus: "current",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
    },
    clm_missing_freshness_source: {
      claimId: "clm_missing_freshness_source",
      claimText: "Current CDU architecture guidance.",
      objectId: "liquid_cooling_cdu",
      claimType: "technical_parameter",
      sourceIds: ["src_missing_freshness"],
      freshnessStatus: "current",
      appliesToModules: ["ask_power_insight"],
      consumerModule: "ask_power_insight",
      dataDomain: "cdu",
      currentness: "current",
    },
    clm_stale_current_claim: {
      claimId: "clm_stale_current_claim",
      claimText: "Recent partnership remains current.",
      objectId: "vendor_a",
      claimType: "partnership_customer",
      sourceIds: ["src_stale_current"],
      freshnessStatus: "current",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
      currentness: "current",
    },
    clm_missing_claim_module: {
      claimId: "clm_missing_claim_module",
      claimText: "Claim is missing module metadata.",
      objectId: "liquid_cooling_cdu",
      claimType: "technical_parameter",
      sourceIds: ["src_vendor_current"],
      freshnessStatus: "current",
      appliesToModules: ["ask_power_insight"],
      dataDomain: "cdu",
    },
    clm_unsupported_claim_module: {
      claimId: "clm_unsupported_claim_module",
      claimText: "Claim has unsupported module metadata.",
      objectId: "liquid_cooling_cdu",
      claimType: "technical_parameter",
      sourceIds: ["src_vendor_current"],
      freshnessStatus: "current",
      appliesToModules: ["legacy_module"],
      consumerModule: "legacy_module",
      dataDomain: "cdu",
    },
    clm_company_module_mismatch: {
      claimId: "clm_company_module_mismatch",
      claimText: "Company intelligence claim mismatched to ask-only source.",
      objectId: "vendor_a",
      claimType: "annual_report_metric",
      sourceIds: ["src_ask_only_explicit"],
      freshnessStatus: "current",
      publicationDate: "2026-04-01",
      lastVerifiedDate: "2026-06-15",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
    },
    clm_company_missing_publication: {
      claimId: "clm_company_missing_publication",
      claimText: "Latest company annual report metric.",
      objectId: "vendor_a",
      claimType: "annual_report_metric",
      sourceIds: ["src_company_missing_publication"],
      freshnessStatus: "current",
      publicationDate: "",
      lastVerifiedDate: "2026-06-15",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
      currentness: "latest",
    },
    clm_company_missing_verification: {
      claimId: "clm_company_missing_verification",
      claimText: "Current quarterly report metric.",
      objectId: "vendor_a",
      claimType: "quarterly_report_metric",
      sourceIds: ["src_company_missing_verification"],
      freshnessStatus: "current",
      publicationDate: "2026-04-01",
      lastVerifiedDate: "",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
      currentness: "current",
    },
    clm_company_launder_attempt: {
      claimId: "clm_company_launder_attempt",
      claimText: "Annual report claim cannot be refreshed by local KB.",
      objectId: "vendor_a",
      claimType: "annual_report_metric",
      sourceIds: ["src_vendor_stale_official", "src_local_current_support"],
      freshnessStatus: "current",
      publicationDate: "2025-01-01",
      lastVerifiedDate: "2025-01-01",
      appliesToModules: ["company_intelligence"],
      consumerModule: "company_intelligence",
      dataDomain: "company",
      currentness: "current",
    },
    clm_ask_explicit_pass: {
      claimId: "clm_ask_explicit_pass",
      claimText: "Ask PowerInsight CDU thin-slice claim stays explicit.",
      objectId: "liquid_cooling_cdu",
      claimType: "technical_parameter",
      sourceIds: ["src_ask_only_explicit"],
      freshnessStatus: "current",
      publicationDate: "2026-04-01",
      lastVerifiedDate: "2026-06-15",
      appliesToModules: ["ask_power_insight"],
      consumerModule: "ask_power_insight",
      dataDomain: "cdu",
    },
  },
});

const hydrate = (sourceIds, claimIds) => hydrateEvidencePacks({
  sourceRefs: sourceIds.map((sourceId) => ({ sourceId })),
  claimRefs: claimIds.map((claimId) => ({ claimId })),
  registry: buildRegistry(),
  now: NOW,
});

test("sourceRef hydration success", () => {
  const result = hydrate(["src_vendor_current"], []);

  assertHydrationResult(result, "pass", "full_report", true, []);
  assert.equal(result.expandedSourcePack[0].sourceTier, "L4_vendor_official");
});

test("claimRef hydration success", () => {
  const result = hydrate(["src_vendor_current"], ["clm_tech_success"]);

  assertHydrationResult(result, "pass", "full_report", true, []);
  assert.equal(result.expandedClaimPack[0].consumerModule, "ask_power_insight");
});

test("unresolved sourceRef blocks", () => {
  const result = hydrate(["missing_source"], []);

  assertHydrationResult(
    result,
    "blocked_source_required",
    "source_required_report",
    false,
    ["sourceRef missing_source could not be hydrated"]
  );
});

test("unresolved claimRef blocks", () => {
  const result = hydrate([], ["missing_claim"]);

  assertHydrationResult(
    result,
    "blocked_source_required",
    "source_required_report",
    false,
    ["claimRef missing_claim could not be hydrated"]
  );
});

test("missing claim.consumerModule blocks with blocked_schema_error", () => {
  const result = hydrate(["src_vendor_current"], ["clm_missing_claim_module"]);

  assertHydrationResult(
    result,
    "blocked_schema_error",
    "blocked_report",
    false,
    ["claim clm_missing_claim_module is missing consumerModule"]
  );
});

test("unsupported claim.consumerModule blocks with blocked_schema_error", () => {
  const result = hydrate(["src_vendor_current"], ["clm_unsupported_claim_module"]);

  assertHydrationResult(
    result,
    "blocked_schema_error",
    "blocked_report",
    false,
    ["claim clm_unsupported_claim_module has unsupported consumerModule legacy_module"]
  );
});

test("source missing both consumerModule and appliesToModules blocks with blocked_schema_error", () => {
  const result = hydrate(["src_missing_module"], ["clm_tech_success"]);

  assertHydrationResult(
    result,
    "blocked_schema_error",
    "blocked_report",
    false,
    ["source src_missing_module is missing consumerModule and appliesToModules"]
  );
});

test("unsupported source consumerModule blocks with blocked_schema_error", () => {
  const result = hydrate(["src_unsupported_consumer"], ["clm_ask_explicit_pass"]);

  assertHydrationResult(
    result,
    "blocked_schema_error",
    "blocked_report",
    false,
    [
      "source src_unsupported_consumer has unsupported consumerModule legacy_module",
      "source src_unsupported_consumer has unsupported appliesToModules value legacy_module",
    ]
  );
});

test("unsupported module inside source.appliesToModules blocks with blocked_schema_error", () => {
  const result = hydrate(["src_unsupported_applies"], ["clm_ask_explicit_pass"]);

  assertHydrationResult(
    result,
    "blocked_schema_error",
    "blocked_report",
    false,
    ["source src_unsupported_applies has unsupported appliesToModules value legacy_module"]
  );
});

test("source.consumerModule excluded by appliesToModules blocks with blocked_object_mismatch", () => {
  const result = hydrate(["src_excluded_consumer"], ["clm_annual_report_valid"]);

  assertHydrationResult(
    result,
    "blocked_object_mismatch",
    "blocked_report",
    false,
    ["source src_excluded_consumer consumerModule company_intelligence is excluded by appliesToModules"]
  );
});

test("source.appliesToModules excluding claim.consumerModule blocks with blocked_object_mismatch", () => {
  const result = hydrate(["src_ask_only_explicit"], ["clm_company_module_mismatch"]);

  assertHydrationResult(
    result,
    "blocked_object_mismatch",
    "blocked_report",
    false,
    ["source src_ask_only_explicit does not apply to claim clm_company_module_mismatch consumerModule company_intelligence"]
  );
});

test("company_intelligence claim cannot be supported by ask_power_insight-only source", () => {
  const result = hydrate(["src_ask_only_explicit"], ["clm_company_module_mismatch"]);

  assertHydrationResult(
    result,
    "blocked_object_mismatch",
    "blocked_report",
    false,
    ["source src_ask_only_explicit does not apply to claim clm_company_module_mismatch consumerModule company_intelligence"]
  );
});

test("company_intelligence current claim without freshnessStatus blocks", () => {
  const result = hydrate(["src_customer_current"], ["clm_company_current_missing_freshness"]);

  assertHydrationResult(
    result,
    "blocked_freshness_unverified",
    "blocked_report",
    false,
    ["claim clm_company_current_missing_freshness is missing freshnessStatus"]
  );
});

test("company_intelligence latest partnership claim without L3/L4 official source blocks", () => {
  const result = hydrate(["src_local_only"], ["clm_latest_partnership_without_official"]);

  assertHydrationResult(
    result,
    "blocked_source_required",
    "source_required_report",
    false,
    ["claim clm_latest_partnership_without_official cannot rely on L5_local_kb alone"]
  );
});

test("company_intelligence annual report claim with valid publicationDate / lastVerifiedDate and L4 official source can pass", () => {
  const result = hydrate(["src_vendor_current"], ["clm_annual_report_valid"]);

  assertHydrationResult(result, "pass", "full_report", true, []);
  assert.equal(result.expandedClaimPack[0].consumerModule, "company_intelligence");
});

test("Local KB L5 alone cannot support company_intelligence hard factual claim", () => {
  const result = hydrate(["src_local_only"], ["clm_company_local_only"]);

  assertHydrationResult(
    result,
    "blocked_source_required",
    "source_required_report",
    false,
    ["claim clm_company_local_only cannot rely on L5_local_kb alone"]
  );
});

test("L6 cannot support company_intelligence hard factual claim", () => {
  const result = hydrate(["src_uncorroborated"], ["clm_company_l6_only"]);

  assertHydrationResult(
    result,
    "blocked_source_required",
    "source_required_report",
    false,
    ["claim clm_company_l6_only cannot rely on L6_uncorroborated_reference"]
  );
});

test("valid ask_power_insight explicit module path still passes", () => {
  const result = hydrate(["src_ask_only_explicit"], ["clm_ask_explicit_pass"]);

  assertHydrationResult(result, "pass", "full_report", true, []);
  assert.equal(result.expandedSourcePack[0].consumerModule, "ask_power_insight");
  assert.equal(result.expandedClaimPack[0].consumerModule, "ask_power_insight");
});

test("missing source freshness metadata blocks current hard claim", () => {
  const result = hydrate(["src_missing_freshness"], ["clm_missing_freshness_source"]);

  assertHydrationResult(
    result,
    "blocked_freshness_unverified",
    "blocked_report",
    false,
    ["claim clm_missing_freshness_source is missing freshness metadata"]
  );
  assert.equal(result.freshnessStatus, "realtime_unverified");
});

test("stale L4 official plus fresh L5 local KB cannot launder freshness for hard factual claim", () => {
  const result = hydrate(["src_vendor_stale_official", "src_local_current_support"], ["clm_company_launder_attempt"]);

  assertHydrationResult(
    result,
    "blocked_freshness_unverified",
    "blocked_report",
    false,
    ["claim clm_company_launder_attempt is outside freshness window"]
  );
});

test("missing publicationDate for latest annual report claim blocks", () => {
  const result = hydrate(["src_company_missing_publication"], ["clm_company_missing_publication"]);

  assertHydrationResult(
    result,
    "blocked_freshness_unverified",
    "blocked_report",
    false,
    ["claim clm_company_missing_publication is missing freshness metadata"]
  );
});

test("missing lastVerifiedDate for current quarterly report claim blocks", () => {
  const result = hydrate(["src_company_missing_verification"], ["clm_company_missing_verification"]);

  assertHydrationResult(
    result,
    "blocked_freshness_unverified",
    "blocked_report",
    false,
    ["claim clm_company_missing_verification is missing freshness metadata"]
  );
});

test("expired freshness window blocks", () => {
  const result = hydrate(["src_stale_current"], ["clm_stale_current_claim"]);

  assertHydrationResult(
    result,
    "blocked_freshness_unverified",
    "blocked_report",
    false,
    ["claim clm_stale_current_claim is outside freshness window"]
  );
});

test("Evidence metadata can carry appliesToModules including company_intelligence without changing UI runtime", () => {
  const result = hydrate(["src_vendor_current"], ["clm_annual_report_valid"]);

  assert.deepStrictEqual(result.expandedSourcePack[0].appliesToModules, ["ask_power_insight", "company_intelligence"]);
  assert.deepStrictEqual(result.expandedClaimPack[0].appliesToModules, ["company_intelligence"]);
  assert.equal(result.expandedClaimPack[0].consumerModule, "company_intelligence");
});
