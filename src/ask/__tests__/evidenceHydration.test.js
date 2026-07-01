import test from "node:test";
import assert from "node:assert/strict";

import { hydrateEvidencePacks } from "../orchestrator/hydrateEvidencePacks.js";

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
      consumerModule: "technology",
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
      consumerModule: "technology",
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
      consumerModule: "technology",
      dataDomain: "cdu",
    },
    clm_company_current_missing_freshness: {
      claimId: "clm_company_current_missing_freshness",
      claimText: "Current company revenue improved.",
      objectId: "vendor_a",
      claimType: "company_revenue",
      sourceIds: ["src_vendor_current"],
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
      consumerModule: "technology",
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
  },
});

test("sourceRef hydration success", () => {
  const result = hydrateEvidencePacks({
    sourceRefs: [{ sourceId: "src_vendor_current", sourceTier: "L4_vendor_official" }],
    claimRefs: [],
    registry: buildRegistry(),
    now: "2026-07-01T00:00:00Z",
  });

  assert.equal(result.validatorStatus, "pass");
  assert.equal(result.renderMode, "full_report");
  assert.equal(result.allowedToRender, true);
  assert.equal(result.expandedSourcePack[0].sourceTier, "L4_vendor_official");
});

test("claimRef hydration success", () => {
  const result = hydrateEvidencePacks({
    sourceRefs: [{ sourceId: "src_vendor_current", sourceTier: "L4_vendor_official" }],
    claimRefs: [{ claimId: "clm_tech_success", claimType: "technical_parameter" }],
    registry: buildRegistry(),
    now: "2026-07-01T00:00:00Z",
  });

  assert.equal(result.validatorStatus, "pass");
  assert.equal(result.expandedClaimPack[0].claimType, "technical_parameter");
});

test("unresolved sourceRef blocks", () => {
  const result = hydrateEvidencePacks({
    sourceRefs: [{ sourceId: "missing_source" }],
    claimRefs: [],
    registry: buildRegistry(),
    now: "2026-07-01T00:00:00Z",
  });

  assert.equal(result.validatorStatus, "blocked_source_required");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.blockingReasons[0], "sourceRef missing_source could not be hydrated");
});

test("unresolved claimRef blocks", () => {
  const result = hydrateEvidencePacks({
    sourceRefs: [],
    claimRefs: [{ claimId: "missing_claim" }],
    registry: buildRegistry(),
    now: "2026-07-01T00:00:00Z",
  });

  assert.equal(result.validatorStatus, "blocked_source_required");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.blockingReasons[0], "claimRef missing_claim could not be hydrated");
});

test("company_intelligence current claim without freshnessStatus blocks", () => {
  const result = hydrateEvidencePacks({
    sourceRefs: [{ sourceId: "src_vendor_current" }],
    claimRefs: [{ claimId: "clm_company_current_missing_freshness" }],
    registry: buildRegistry(),
    now: "2026-07-01T00:00:00Z",
  });

  assert.equal(result.validatorStatus, "blocked_freshness_unverified");
  assert.equal(result.renderMode, "blocked_report");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.blockingReasons.includes("claim clm_company_current_missing_freshness is missing freshnessStatus"), true);
});

test("company_intelligence latest partnership claim without L3/L4 official source blocks", () => {
  const result = hydrateEvidencePacks({
    sourceRefs: [{ sourceId: "src_local_only" }],
    claimRefs: [{ claimId: "clm_latest_partnership_without_official" }],
    registry: buildRegistry(),
    now: "2026-07-01T00:00:00Z",
  });

  assert.equal(result.validatorStatus, "blocked_source_required");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.blockingReasons.includes("claim clm_latest_partnership_without_official cannot rely on L5_local_kb alone"), true);
});

test("company_intelligence annual report claim with valid publicationDate / lastVerifiedDate and L4 official source can pass", () => {
  const result = hydrateEvidencePacks({
    sourceRefs: [{ sourceId: "src_vendor_current" }],
    claimRefs: [{ claimId: "clm_annual_report_valid" }],
    registry: buildRegistry(),
    now: "2026-07-01T00:00:00Z",
  });

  assert.equal(result.validatorStatus, "pass");
  assert.equal(result.allowedToRender, true);
  assert.equal(result.expandedClaimPack[0].consumerModule, "company_intelligence");
});

test("Local KB L5 alone cannot support company_intelligence hard factual claim", () => {
  const result = hydrateEvidencePacks({
    sourceRefs: [{ sourceId: "src_local_only" }],
    claimRefs: [{ claimId: "clm_company_local_only" }],
    registry: buildRegistry(),
    now: "2026-07-01T00:00:00Z",
  });

  assert.equal(result.validatorStatus, "blocked_source_required");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.blockingReasons.includes("claim clm_company_local_only cannot rely on L5_local_kb alone"), true);
});

test("L6 cannot support company_intelligence hard factual claim", () => {
  const result = hydrateEvidencePacks({
    sourceRefs: [{ sourceId: "src_uncorroborated" }],
    claimRefs: [{ claimId: "clm_company_l6_only" }],
    registry: buildRegistry(),
    now: "2026-07-01T00:00:00Z",
  });

  assert.equal(result.validatorStatus, "blocked_source_required");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.blockingReasons.includes("claim clm_company_l6_only cannot rely on L6_uncorroborated_reference"), true);
});

test("missing freshnessStatus blocks", () => {
  const result = hydrateEvidencePacks({
    sourceRefs: [{ sourceId: "src_missing_freshness" }],
    claimRefs: [{ claimId: "clm_missing_freshness_source" }],
    registry: buildRegistry(),
    now: "2026-07-01T00:00:00Z",
  });

  assert.equal(result.validatorStatus, "blocked_freshness_unverified");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.freshnessStatus, "realtime_unverified");
});

test("expired freshness window blocks", () => {
  const result = hydrateEvidencePacks({
    sourceRefs: [{ sourceId: "src_stale_current" }],
    claimRefs: [{ claimId: "clm_stale_current_claim" }],
    registry: buildRegistry(),
    now: "2026-07-01T00:00:00Z",
  });

  assert.equal(result.validatorStatus, "blocked_freshness_unverified");
  assert.equal(result.allowedToRender, false);
  assert.equal(result.blockingReasons.includes("claim clm_stale_current_claim is outside freshness window"), true);
});

test("Evidence metadata can carry appliesToModules including company_intelligence without changing UI runtime", () => {
  const result = hydrateEvidencePacks({
    sourceRefs: [{ sourceId: "src_vendor_current" }],
    claimRefs: [{ claimId: "clm_annual_report_valid" }],
    registry: buildRegistry(),
    now: "2026-07-01T00:00:00Z",
  });

  assert.equal(result.expandedSourcePack[0].appliesToModules.includes("company_intelligence"), true);
  assert.equal(result.expandedClaimPack[0].appliesToModules.includes("company_intelligence"), true);
  assert.equal(result.expandedClaimPack[0].consumerModule, "company_intelligence");
});

