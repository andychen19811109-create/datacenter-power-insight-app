import { execFileSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

import { validateM1DecisionState } from "../contracts/m1DecisionState.js";
import { hashM1EvidenceSnapshot } from "../contracts/m1EvidenceSnapshot.js";
import * as integrationPackage from "../releaseIntegration/index.js";
import { hashM1ConfirmedInput } from "../m1DecisionCore.js";
import { runM1DecisionEvidenceGuard } from "../m1DecisionEvidenceContext.js";
import { validateReleaseResult } from "../deterministic/internal/artifacts.js";

const CLEAN_BASE_SHA = "6556fbeb6b383fb1df7e268ee128ecbb7220bccc";
const readText = (relativePath) => fs.readFileSync(
  new URL(relativePath, import.meta.url),
  "utf8",
);
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const clone = (value) => JSON.parse(JSON.stringify(value));
const CONFIRMED = readJson(
  "../deterministic/test-fixtures/M1_DIFY_S1_CONFIRMED_INPUT_CANONICAL.json",
);
const POLICY = readJson("../deterministic/policy/m1.decision-policy.wave1.v0.2.json");
const SNAPSHOT = readJson("../evidence/m1OfficialEvidenceWave1.v0.2.json");
const RELEASE_SCHEMA = readJson(
  "../deterministic/contracts/m1.release-result.v1.schema.v0.2.json",
);
const ERROR_SCHEMA = readJson(
  "../deterministic/contracts/m1.fail-closed-error.v1.schema.v0.2.json",
);
const INTEGRATION_SOURCE = readText(
  "../releaseIntegration/evaluateM1ReleaseIntegration.js",
);
const PUBLIC_SOURCE = readText("../releaseIntegration/index.js");
const A1_TEST_SOURCE = readText("./m1DeterministicDecisionCore.test.js");
const THIS_TEST_SOURCE = readText("./m1ReleaseIntegration.test.js");

const evaluate = integrationPackage.evaluateM1ReleaseIntegration;
const exactKeys = (value, keys) => {
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort());
};
const deepFreeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
};
const forbiddenRejectedKeys = new Set([
  "decision_state",
  "decisionState",
  "partial_decision_state",
  "recommendation",
  "claims",
  "claim_candidates",
  "source_ids",
  "numeric_provenance",
  "product_selection",
  "policy_match",
  "evidence_content",
  "guard",
  "quality_gate",
  "debug",
  "trace",
  "context",
]);
const assertNoForbiddenKeys = (value) => {
  if (Array.isArray(value)) {
    value.forEach(assertNoForbiddenKeys);
    return;
  }
  if (!value || typeof value !== "object") return;
  Object.entries(value).forEach(([key, nested]) => {
    assert.equal(forbiddenRejectedKeys.has(key), false, `forbidden REJECTED key: ${key}`);
    assertNoForbiddenKeys(nested);
  });
};
const assertFrozenRejectedWhitelist = (result) => {
  const rejectedSchema = RELEASE_SCHEMA.oneOf.find(
    (branch) => branch.properties.status.const === "REJECTED",
  );
  exactKeys(result, Object.keys(rejectedSchema.properties));
  rejectedSchema.required.forEach((key) => assert.equal(Object.hasOwn(result, key), true));
  exactKeys(result.error, Object.keys(ERROR_SCHEMA.properties));
  ERROR_SCHEMA.required.forEach((key) => assert.equal(Object.hasOwn(result.error, key), true));
  const bindingSchema = ERROR_SCHEMA.properties.binding;
  const bindingKeys = Object.keys(result.error.binding);
  bindingSchema.required.forEach((key) => assert.equal(bindingKeys.includes(key), true));
  assert.equal(bindingKeys.every((key) => Object.hasOwn(bindingSchema.properties, key)), true);
  assertNoForbiddenKeys(result);
  assert.deepEqual(validateReleaseResult(result), []);
};
const expectRejected = (result) => {
  assert.equal(result.schema_version, "m1.release-result.v1");
  assert.equal(result.status, "REJECTED");
  assert.equal(result.error.release_allowed, false);
  assert.equal(Object.hasOwn(result, "decision_state"), false);
  assertFrozenRejectedWhitelist(result);
};
const assetBytes = () => ({
  policy: readText("../deterministic/policy/m1.decision-policy.wave1.v0.2.json"),
  snapshot: readText("../evidence/m1OfficialEvidenceWave1.v0.2.json"),
  templates: readText("../deterministic/policy/m1.template-catalog.v1.v0.2.json"),
});
const repoGit = (...args) => execFileSync("git", args, {
  cwd: new URL("../../../../", import.meta.url),
  encoding: "utf8",
}).trim();

test("[G01] PR #37 vNext branch, base ancestry, and exact-path allowlist remain exact", () => {
  assert.equal(repoGit("branch", "--show-current"), "codex/m1-b1-production-result-chain");
  assert.equal(
    repoGit("rev-parse", `${CLEAN_BASE_SHA}^{commit}`),
    CLEAN_BASE_SHA,
  );
  assert.doesNotThrow(() => repoGit(
    "merge-base",
    "--is-ancestor",
    CLEAN_BASE_SHA,
    "HEAD",
  ));
  const changedPaths = [...new Set([
    ...repoGit("diff", "--name-only", CLEAN_BASE_SHA).split("\n"),
    ...repoGit("ls-files", "--others", "--exclude-standard").split("\n"),
  ].filter(Boolean))].sort();
  const allowedPaths = new Set([
    ".gitignore",
    "api/ask-power-insight.js",
    "api/m1-input-understanding.js",
    "docs/dify/DCPI_MVP_VNEXT_DIFY_V23_SETUP.md",
    "docs/m1/M1_B1_CLEAN_RELEASE_REBUILD_EVIDENCE_20260730.md",
    "docs/m1/M1_B1_DATA_BOUNDARY_COPY_FIX_EVIDENCE_20260730.md",
    "docs/m1/M1_B1_PRODUCTION_RESULT_CHAIN_FIX_EVIDENCE_20260730.md",
    "docs/m1/M1_B1_VERCEL_RUNTIME_ASSET_PACKAGING_FIX_EVIDENCE_20260730.md",
    "docs/mvp-vnext/DCPI_MVP_VNEXT_FINAL_OUTPUT_CONSOLIDATION.md",
    "docs/mvp-vnext/DCPI_MVP_VNEXT_FINAL_USER_REPORTS.md",
    "docs/mvp-vnext/DCPI_MVP_VNEXT_INDEPENDENT_REVIEW_PACKAGE.md",
    "docs/mvp-vnext/DCPI_MVP_VNEXT_INTEGRATED_CANDIDATE_EVIDENCE.md",
    "docs/mvp-vnext/DCPI_MVP_VNEXT_PROFESSIONAL_OUTPUT_ACCEPTANCE.md",
    "docs/mvp-vnext/DCPI_MVP_VNEXT_PUBLICATION_GUARDRAIL_EVIDENCE.md",
    "docs/mvp-vnext/DCPI_MVP_VNEXT_QUALITATIVE_EVIDENCE_GUARDRAIL.md",
    "docs/mvp-vnext/DCPI_MVP_VNEXT_RTM.md",
    "src/App.css",
    "src/App.jsx",
    "src/data/marketData.js",
    "src/ask/m1/M1ConfirmedInputPanel.jsx",
    "src/ask/m1/M1ReleaseResultPanel.jsx",
    "src/ask/m1/__tests__/m1ConfirmedInput.test.js",
    "src/ask/m1/__tests__/m1ConfirmedInputUi.test.js",
    "src/ask/m1/__tests__/m1DecisionCore.test.js",
    "src/ask/m1/__tests__/m1InputResolution.test.js",
    "src/ask/m1/__tests__/m1InputUnderstanding.test.js",
    "src/ask/m1/__tests__/m1ReleaseIntegration.test.js",
    "src/ask/m1/contracts/m1InputContext.js",
    "src/ask/m1/demo/__tests__/m1DemoSnapshot.test.js",
    "src/ask/m1/fixtures/m1DecisionCoreFixtures.js",
    "src/ask/m1/fixtures/m1InputResolutionFixtures.js",
    "src/ask/m1/m1ConfirmedInputFlow.js",
    "src/ask/m1/m1InputResolution.js",
    "src/ask/m1/m1WorkflowTransport.js",
    "src/ask/m1/runM1InputUnderstanding.js",
    "src/ask/vnext/AnalysisContextSummary.jsx",
    "src/ask/vnext/AskContextPanel.jsx",
    "src/ask/vnext/AskPowerInsightExperience.jsx",
    "src/ask/vnext/AskStandardReport.jsx",
    "src/ask/vnext/ClarificationPanel.jsx",
    "src/ask/vnext/DegradedAnalysisPanel.jsx",
    "src/ask/vnext/R2FinalReport.jsx",
    "src/ask/vnext/__tests__/analysisAdapter.test.js",
    "src/ask/vnext/__tests__/api.test.js",
    "src/ask/vnext/__tests__/canonicalInput.test.js",
    "src/ask/vnext/__tests__/contextAndClarification.test.js",
    "src/ask/vnext/__tests__/contracts.test.js",
    "src/ask/vnext/__tests__/difyDraftNormalizer.test.js",
    "src/ask/vnext/__tests__/entityRoleResolution.test.js",
    "src/ask/vnext/__tests__/goldenCases.test.js",
    "src/ask/vnext/__tests__/nineQuestionMatrix.test.js",
    "src/ask/vnext/__tests__/publicationGuardrail.test.js",
    "src/ask/vnext/__tests__/r2FinalReport.test.js",
    "src/ask/vnext/__tests__/r2RawContract.test.js",
    "src/ask/vnext/__tests__/r2RawUi.test.js",
    "src/ask/vnext/__tests__/reportGovernanceQuality.test.js",
    "src/ask/vnext/__tests__/uiContract.test.js",
    "src/ask/vnext/analysisAdapter.js",
    "src/ask/vnext/askPowerInsightClient.js",
    "src/ask/vnext/buildAnalysisContext.js",
    "src/ask/vnext/capabilityPolicy.js",
    "src/ask/vnext/clarificationPolicy.js",
    "src/ask/vnext/contracts/analysisContext.js",
    "src/ask/vnext/contracts/askReport.js",
    "src/ask/vnext/contracts/canonicalAnalysisInput.js",
    "src/ask/vnext/contracts/difyAnalysisDraft.js",
    "src/ask/vnext/degradedAnalysis.js",
    "src/ask/vnext/difyDraftNormalizer.js",
    "src/ask/vnext/fixtures/difyFixtures.js",
    "src/ask/vnext/fixtures/r2-1.3/Q1.raw.md",
    "src/ask/vnext/fixtures/r2-1.3/Q5.raw.md",
    "src/ask/vnext/fixtures/r2-1.3/Q6.raw.md",
    "src/ask/vnext/fixtures/r2-1.3/manifest.json",
    "src/ask/vnext/investmentRankingPolicy.js",
    "src/ask/vnext/numericClaimPolicy.js",
    "src/ask/vnext/observability.js",
    "src/ask/vnext/publicationGuardrail.js",
    "src/ask/vnext/qualitativeClaimPolicy.js",
    "src/ask/vnext/r2FinalReport.js",
    "src/ask/vnext/reportQualityLint.js",
    "src/ask/vnext/reportComposer.js",
    "vercel.json",
  ]);
  assert.deepEqual(changedPaths, [...allowedPaths].sort());
});

test("[G02] frozen Schema, Gateway, and A1 tests agree on RELEASED and REJECTED", () => {
  const statuses = RELEASE_SCHEMA.oneOf
    .map((branch) => branch.properties.status.const)
    .sort();
  assert.deepEqual(statuses, ["REJECTED", "RELEASED"]);
  assert.match(
    readText("../deterministic/runM1DecisionReleaseGateway.js"),
    /status:\s*"RELEASED"/,
  );
  assert.match(A1_TEST_SOURCE, /status,\s*"RELEASED"/);
  assert.match(A1_TEST_SOURCE, /status,\s*"REJECTED"/);
  expectRejected(evaluate({ schema_version: "wrong" }));
});

test("[G03] public runtime export whitelist is exact", () => {
  assert.deepEqual(Object.keys(integrationPackage), ["evaluateM1ReleaseIntegration"]);
  assert.equal(typeof evaluate, "function");
});

test("[G04] public integration imports and calls the real production Gateway", () => {
  assert.match(
    INTEGRATION_SOURCE,
    /import\s+\{\s*runM1DecisionReleaseGateway\s*\}\s+from\s+"\.\.\/deterministic\/runM1DecisionReleaseGateway\.js"/,
  );
  assert.match(INTEGRATION_SOURCE, /return\s+runM1DecisionReleaseGateway\s*\(/);
  const result = evaluate(clone(CONFIRMED));
  assert.equal(result.status, "RELEASED");
  assert.deepEqual(result.validation, {
    decision_state_valid: true,
    evidence_guard_pass: true,
    quality_gate_pass: true,
  });
});

test("[G05] frozen valid input returns independently asserted RELEASED business values", () => {
  const result = evaluate(clone(CONFIRMED));
  assert.equal(result.schema_version, "m1.release-result.v1");
  assert.equal(result.status, "RELEASED");
  assert.equal(
    result.release_id,
    `RELEASE_${hashM1ConfirmedInput(CONFIRMED).slice(0, 24).toUpperCase()}`,
  );
  assert.equal(result.binding.confirmed_input_id, "confirmed_m1_core_fixture");
  assert.equal(result.binding.policy_version, "m1-decision-policy.v0.2");
  assert.deepEqual(
    result.decision_state.architecture_alternatives.map(({ label }) => label),
    ["UPS", "800VDC"],
  );
  assert.deepEqual(
    result.decision_state.unresolved_unknowns.map(({ field }) => field).sort(),
    ["critical_constraints", "target_timing"],
  );
  assert.equal(Object.values(result.decision_state.decision_outputs).every(
    ({ source_ids: sourceIds }) => sourceIds.length === 0,
  ), true);
  assert.deepEqual(result.decision_state.recommendation.source_ids, []);
});

test("[G06] valid contract input with unsupported business combination is REJECTED", () => {
  const input = clone(CONFIRMED);
  input.groups.product_architecture.fields.architecture_alternatives.value = ["HVDC"];
  const result = evaluate(input);
  expectRejected(result);
  assert.equal(result.error.error_code, "UNSUPPORTED_COMBINATION");
});

test("[G07] malformed inputs fail closed without RELEASED", () => {
  const cases = [
    ["missing field", (input) => { delete input.confirmed_at; }],
    ["wrong schema", (input) => { input.schema_version = "m1.confirmed-input.v9"; }],
    ["wrong type", (input) => {
      input.groups.customer_region.fields.target_customer.value = 42;
    }],
    ["invalid status", (input) => { input.confirmation_status = "APPROVED"; }],
    ["invalid array", (input) => {
      input.groups.product_architecture.fields.architecture_alternatives.value = "UPS";
    }],
    ["unknown top-level field", (input) => { input.unexpected = true; }],
    ["invalid scope field", (input) => {
      input.groups.customer_region.fields.target_customer.scope = "SYSTEM";
    }],
  ];
  cases.forEach(([label, mutate]) => {
    const input = clone(CONFIRMED);
    mutate(input);
    const result = evaluate(input);
    assert.notEqual(result.status, "RELEASED", label);
    expectRejected(result);
  });
});

test("[G08] extra arguments and all caller asset injections fail closed", () => {
  expectRejected(evaluate(clone(CONFIRMED), clone(POLICY)));
  const injections = [
    ["options", { options: { decisionPolicy: clone(POLICY) } }],
    ["Policy", { decisionPolicy: clone(POLICY) }],
    ["Snapshot", { evidenceSnapshot: clone(SNAPSHOT) }],
    ["Template", { templateCatalog: { template_catalog_version: "injected" } }],
  ];
  injections.forEach(([label, injected]) => {
    const result = evaluate({ ...clone(CONFIRMED), ...injected });
    assert.notEqual(result.status, "RELEASED", label);
    expectRejected(result);
  });
});

test("[G09] A1 same-version Policy certification attack remains present", () => {
  assert.match(A1_TEST_SOURCE, /\[A37\] same-version certified Policy content mutations reject/);
  assert.match(A1_TEST_SOURCE, /policy_artifact_not_certified/);
});

test("[G10] A1 coordinated Policy and Snapshot attack remains present", () => {
  assert.match(A1_TEST_SOURCE, /\[A38\] coordinated certified Policy and Snapshot mutation rejects/);
  assert.match(A1_TEST_SOURCE, /certified_snapshot\.sha256\s*=\s*args\.evidenceSnapshotHash/);
});

test("[G11] complete REJECTED result follows frozen recursive positive whitelist", () => {
  const input = clone(CONFIRMED);
  input.unexpected = { decision_state: { recommendation: "must not leak" } };
  const result = evaluate(input);
  expectRejected(result);
  assert.deepEqual(Object.keys(result).sort(), ["error", "schema_version", "status"]);
});

test("[G12] deep-frozen caller input remains byte-for-byte unchanged", () => {
  const input = deepFreeze(clone(CONFIRMED));
  const before = JSON.stringify(input);
  const result = evaluate(input);
  assert.equal(result.status, "RELEASED");
  assert.equal(JSON.stringify(input), before);
  assert.deepEqual(input, CONFIRMED);
});

test("[G13] bound certified asset bytes remain unchanged and unexported", () => {
  const before = assetBytes();
  assert.equal(evaluate(clone(CONFIRMED)).status, "RELEASED");
  assert.deepEqual(assetBytes(), before);
  assert.deepEqual(Object.keys(integrationPackage), ["evaluateM1ReleaseIntegration"]);
  assert.match(A1_TEST_SOURCE, /\[A42\] Gateway does not mutate inputs or supplied hashes/);
});

test("[G14] RELEASED and REJECTED runs are separately deterministic", () => {
  const validInput = clone(CONFIRMED);
  const rejectedInput = clone(CONFIRMED);
  rejectedInput.unexpected = true;
  const releasedOne = evaluate(validInput);
  const releasedTwo = evaluate(validInput);
  const rejectedOne = evaluate(rejectedInput);
  const rejectedTwo = evaluate(rejectedInput);
  assert.equal(releasedOne.status, "RELEASED");
  assert.equal(rejectedOne.status, "REJECTED");
  assert.deepEqual(releasedOne, releasedTwo);
  assert.deepEqual(rejectedOne, rejectedTwo);
});

test("[G15] fetch sentinel and source review prove no network or model path", () => {
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;
  globalThis.fetch = () => {
    fetchCalls += 1;
    throw new Error("network_forbidden");
  };
  try {
    assert.equal(evaluate(clone(CONFIRMED)).status, "RELEASED");
  } finally {
    if (originalFetch === undefined) delete globalThis.fetch;
    else globalThis.fetch = originalFetch;
  }
  assert.equal(fetchCalls, 0);
  assert.doesNotMatch(
    `${INTEGRATION_SOURCE}\n${PUBLIC_SOURCE}`,
    /fetch\(|axios|Dify|Provider|LLM|https?:|node:http|node:https/,
  );
});

test("[G16] Integration contains asset binding and Gateway call but no business-rule copy", () => {
  assert.doesNotMatch(
    INTEGRATION_SOURCE,
    /internal\/(?:selection|builder|qualityGate)|m1DecisionEvidenceContext|m1DecisionState/,
  );
  assert.doesNotMatch(
    INTEGRATION_SOURCE,
    /recommendation_code|claim_candidates|numeric_provenance|unknown_mappings|allowed_output_slots|decision_capabilities/,
  );
  assert.match(INTEGRATION_SOURCE, /runM1DecisionReleaseGateway/);
});

test("[G17] tests use static fixtures and exact assertions without generated Golden", () => {
  assert.match(THIS_TEST_SOURCE, /M1_DIFY_S1_CONFIRMED_INPUT_CANONICAL\.json/);
  [
    ["to", "BeDefined"],
    ["to", "MatchSnapshot"],
    ["assert", ".snapshot"],
  ].forEach((parts) => assert.equal(THIS_TEST_SOURCE.includes(parts.join("")), false));
  assert.equal(
    THIS_TEST_SOURCE.includes(["buildDeterministic", "DecisionState"].join("")),
    false,
  );
  assert.match(THIS_TEST_SOURCE, /assert\.deepEqual\(/);
});

test("[G18] no Core or Gateway mock implementation exists", () => {
  [
    ["vi", ".mock"],
    ["jest", ".mock"],
    ["mock", "Module"],
    ["mock", "Gateway"],
  ].forEach((parts) => assert.equal(THIS_TEST_SOURCE.includes(parts.join("")), false));
  assert.doesNotMatch(INTEGRATION_SOURCE, /mock|fixture|test-only|testOnly/i);
});

test("[G19] public result still passes frozen Validator and Evidence Guard", () => {
  const input = clone(CONFIRMED);
  const result = evaluate(input);
  assert.deepEqual(validateM1DecisionState(result.decision_state, {
    confirmedInput: input,
    inputHash: hashM1ConfirmedInput(input),
  }), { ok: true, errors: [] });
  const guard = runM1DecisionEvidenceGuard({
    confirmedInput: input,
    decisionState: result.decision_state,
    evidenceSnapshot: SNAPSHOT,
    evidenceSnapshotId: SNAPSHOT.evidence_snapshot_id,
    evidenceSnapshotSchemaVersion: SNAPSHOT.schema_version,
    evidenceSnapshotHash: hashM1EvidenceSnapshot(SNAPSHOT),
  });
  assert.equal(guard.ok, true);
  assert.deepEqual(guard.binding.violations, []);
  assert.deepEqual(result.validation, {
    decision_state_valid: true,
    evidence_guard_pass: true,
    quality_gate_pass: true,
  });
});

test("[G20] package, frozen assets, and excluded historical runtime remain untouched", () => {
  const forbiddenDiff = repoGit(
    "diff",
    "--name-only",
    CLEAN_BASE_SHA,
    "--",
    "package.json",
    "package-lock.json",
    "api/ask-dify.js",
    "scripts/dev-with-api.mjs",
    "scripts/runM1D3RawGate.mjs",
    "scripts/runM1InputGate.mjs",
    "src/ask/m1/buildM1ProviderRequest.js",
    "src/ask/m1/m1DecisionResolutionTransport.js",
    "src/ask/m1/m1EvidencePack.js",
    "src/ask/m1/m1ProfessionalEligibility.js",
    "src/ask/m1/m1ProfileEligibility.js",
    "src/ask/m1/parseAndValidateM1ExpertResult.js",
    "src/ask/m1/resolveM1DecisionContext.js",
    "src/ask/m1/runM1InvestmentDecision.js",
    "src/ask/m1/contracts/m1ConfirmedInput.js",
    "src/ask/m1/contracts/m1DecisionState.js",
    "src/ask/m1/contracts/m1EvidenceSnapshot.js",
    "src/ask/m1/deterministic",
    "src/ask/m1/evidence",
    "src/ask/m1/m1DecisionCore.js",
    "src/ask/m1/m1DecisionEvidenceContext.js",
    "src/ask/m1/releaseIntegration",
    "src/ask/m1/demo/data/rejected.json",
    "src/ask/m1/demo/data/released.json",
  );
  assert.equal(forbiddenDiff, "");
  assert.deepEqual(Object.keys(integrationPackage), ["evaluateM1ReleaseIntegration"]);
});
