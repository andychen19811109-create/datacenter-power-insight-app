import { execFileSync } from "node:child_process";
import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

import {
  createM1DemoInputs,
  generateM1DemoSnapshots,
} from "../../../../../scripts/genM1DemoSnapshots.mjs";
import { validateReleaseResult } from "../../deterministic/internal/artifacts.js";
import { evaluateM1ReleaseIntegration } from "../../releaseIntegration/index.js";
import { buildM1DemoViewModel } from "../m1DemoViewModel.js";

const BASELINE = "6f9ba100f3c6b17a1e20ad4cd4d7d0c655026524";
const CERTIFIED_SNAPSHOT_COMMIT = "4f882650f23b049aaa601e21896c924a6bdf5abc";
const readText = (relativePath) => fs.readFileSync(
  new URL(relativePath, import.meta.url),
  "utf8",
);
const readJson = (relativePath) => JSON.parse(readText(relativePath));
const repoGit = (...args) => execFileSync("git", args, {
  cwd: new URL("../../../../../", import.meta.url),
  encoding: "utf8",
}).trim();
const RELEASED_JSON = readJson("../data/released.json");
const REJECTED_JSON = readJson("../data/rejected.json");
const GENERATOR_SOURCE = readText("../../../../../scripts/genM1DemoSnapshots.mjs");
const COMPONENT_SOURCE = readText("../M1ProfessionalDemo.jsx");
const VIEW_MODEL_SOURCE = readText("../m1DemoViewModel.js");
const APP_SOURCE = readText("../../../../App.jsx");
const MAIN_SOURCE = readText("../../../../main.jsx");

test("[S01] RELEASED JSON equals the current real Integration result", () => {
  const { releasedInput } = createM1DemoInputs();
  const current = evaluateM1ReleaseIntegration(releasedInput);
  assert.equal(current.status, "RELEASED");
  assert.deepEqual(RELEASED_JSON, current);
});

test("[S02] REJECTED JSON equals the current real Integration result", () => {
  const { rejectedInput } = createM1DemoInputs();
  const current = evaluateM1ReleaseIntegration(rejectedInput);
  assert.equal(current.status, "REJECTED");
  assert.equal(current.error.error_code, "UNSUPPORTED_COMBINATION");
  assert.deepEqual(REJECTED_JSON, current);
});

test("[S03] consecutive real generations are deeply deterministic", () => {
  const first = generateM1DemoSnapshots();
  const second = generateM1DemoSnapshots();
  assert.deepEqual(first.released, second.released);
  assert.deepEqual(first.rejected, second.rejected);
});

test("[S04] both committed JSON files pass the frozen Release Result Schema", () => {
  assert.deepEqual(validateReleaseResult(RELEASED_JSON), []);
  assert.deepEqual(validateReleaseResult(REJECTED_JSON), []);
  assert.equal(RELEASED_JSON.schema_version, "m1.release-result.v1");
  assert.equal(REJECTED_JSON.schema_version, "m1.release-result.v1");
});

test("[S05] generator calls the public Integration without repairing results", () => {
  assert.match(
    GENERATOR_SOURCE,
    /from\s+"\.\.\/src\/ask\/m1\/releaseIntegration\/index\.js"/,
  );
  assert.doesNotMatch(
    GENERATOR_SOURCE,
    /\.decision_state\s*=|\.recommendation\s*=|\.claim_candidates\s*=|\.source_ids\s*=|\.binding\s*=|\.unresolved_unknowns\s*=/,
  );
  assert.doesNotMatch(GENERATOR_SOURCE, /Date\(|Math\.random|fetch\(|https?:/);
});

test("[S06] browser sources import JSON only and exclude Node/Core runtime", () => {
  assert.match(COMPONENT_SOURCE, /from\s+"\.\/data\/released\.json"/);
  assert.match(COMPONENT_SOURCE, /from\s+"\.\/data\/rejected\.json"/);
  const browserSource = [
    COMPONENT_SOURCE,
    VIEW_MODEL_SOURCE,
    APP_SOURCE,
    MAIN_SOURCE,
  ].join("\n");
  assert.doesNotMatch(
    browserSource,
    /node:fs|node:crypto|releaseIntegration|evaluateM1ReleaseIntegration|runM1DecisionReleaseGateway|m1DecisionCore|deterministic\/internal/,
  );
});

test("[A3-G04] RELEASED ViewModel selects frozen presentation fields", () => {
  const model = buildM1DemoViewModel(RELEASED_JSON);
  assert.equal(model.status, "RELEASED");
  assert.equal(
    model.released.recommendation.decision,
    RELEASED_JSON.decision_state.recommendation.decision,
  );
  assert.deepEqual(
    model.released.alternatives.map(({ label }) => label),
    ["UPS", "800VDC"],
  );
  assert.equal(model.released.unknowns.length, 2);
});

test("[A3-G05] REJECTED ViewModel exposes only error and public binding", () => {
  const model = buildM1DemoViewModel(REJECTED_JSON);
  assert.deepEqual(Object.keys(model).sort(), ["error", "status"]);
  assert.deepEqual(Object.keys(model.error).sort(), ["binding", "errorCode", "violations"]);
  assert.equal(model.status, "REJECTED");
  const serialized = JSON.stringify(model).toLowerCase();
  [
    "decision_state",
    "recommendation",
    "claims",
    "source_ids",
    "numeric_provenance",
    "evidence_content",
    "guard",
    "quality_gate",
    "stack",
    "debug",
    "trace",
    "context",
  ].forEach((key) => assert.equal(serialized.includes(key), false, key));
});

test("[A3-G08] object, array, null, and unknown fields remain scalar-safe", () => {
  const changed = JSON.parse(JSON.stringify(RELEASED_JSON));
  changed.decision_state.recommendation.decision = { unsafe: true };
  changed.decision_state.recommendation.conditions = [null, { unsafe: true }, "保留值"];
  changed.decision_state.product_boundary.statement = ["unsafe"];
  const model = buildM1DemoViewModel(changed);
  assert.equal(model.released.recommendation.decision, "—");
  assert.deepEqual(model.released.recommendation.conditions, ["—", "—", "保留值"]);
  assert.equal(model.released.boundaries[0].statement, "—");
  assert.equal(JSON.stringify(model).includes("[object Object]"), false);
});

test("[A3-G13] diff remains inside exact scope with zero dependency/core changes", () => {
  assert.equal(repoGit("branch", "--show-current"), "codex/m1-professional-demo-mvp");
  assert.equal(repoGit("merge-base", "--is-ancestor", BASELINE, "HEAD"), "");
  assert.equal(
    repoGit("merge-base", "--is-ancestor", CERTIFIED_SNAPSHOT_COMMIT, "HEAD"),
    "",
  );
  const changedPaths = [...new Set([
    ...repoGit("diff", "--name-only", BASELINE).split("\n").filter(Boolean),
    ...repoGit("ls-files", "--others", "--exclude-standard").split("\n").filter(Boolean),
  ])].sort();
  const allowedPaths = new Set([
    "api/m1-input-understanding.js",
    "docs/m1/M1_B1F_CONFIRMATION_FALLBACK_EVIDENCE.md",
    "docs/m1/M1_B1_FINAL_INTEGRATION_EVIDENCE_20260729.md",
    "docs/m1/M1_B1_PRODUCTION_CHAIN_FIX_EVIDENCE_20260730.md",
    "docs/m1/M1_B1_FINAL_INTEGRATION_SCREENSHOTS_20260729/01-normal-confirmation.png",
    "docs/m1/M1_B1_FINAL_INTEGRATION_SCREENSHOTS_20260729/02-s3-fallback-confirmation.png",
    "docs/m1/M1_B1_FINAL_INTEGRATION_SCREENSHOTS_20260729/03-timeout-fallback-confirmation.png",
    "docs/m1/M1_B1_FINAL_INTEGRATION_SCREENSHOTS_20260729/04-confirmed-audit.png",
    "docs/m1/M1_B1_FINAL_INTEGRATION_SCREENSHOTS_20260729/05-corrected-confirmation.png",
    "docs/m1/M1_B1_FINAL_INTEGRATION_SCREENSHOTS_20260729/06-unknown-confirmation.png",
    "docs/m1/M1_CURRENT_HANDOFF.md",
    "scripts/genM1DemoSnapshots.mjs",
    "src/App.css",
    "src/App.jsx",
    "src/ask/m1/M1ConfirmedInputPanel.jsx",
    "src/ask/m1/__tests__/m1ConfirmedInput.test.js",
    "src/ask/m1/__tests__/m1ConfirmedInputUi.test.js",
    "src/ask/m1/__tests__/m1InputResolution.test.js",
    "src/ask/m1/__tests__/m1InputUnderstanding.test.js",
    "src/ask/m1/__tests__/m1ReleaseIntegration.test.js",
    "src/ask/m1/demo/M1ProfessionalDemo.jsx",
    "src/ask/m1/demo/__tests__/m1DemoSnapshot.test.js",
    "src/ask/m1/demo/data/rejected.json",
    "src/ask/m1/demo/data/released.json",
    "src/ask/m1/demo/m1DemoViewModel.js",
    "src/ask/m1/fixtures/m1InputResolutionFixtures.js",
    "src/ask/m1/m1ConfirmedInputFlow.js",
    "src/ask/m1/m1InputResolution.js",
    "src/ask/m1/runM1InputUnderstanding.js",
  ]);
  assert.deepEqual(changedPaths.filter((path) => !allowedPaths.has(path)), []);
  const frozen = repoGit(
    "diff",
    "--name-only",
    BASELINE,
    "--",
    "package.json",
    "package-lock.json",
    "src/ask/m1/contracts",
    "src/ask/m1/deterministic",
    "src/ask/m1/evidence",
    "src/ask/m1/m1DecisionCore.js",
    "src/ask/m1/m1DecisionEvidenceContext.js",
    "src/ask/m1/releaseIntegration",
  );
  assert.equal(frozen, "");
});
