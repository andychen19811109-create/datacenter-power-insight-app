import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import scenario1UpsAiGpuLoadStepResponse from "../fixtures/scenario1UpsAiGpuLoadStepResponse.js";
import scenario2LiquidCoolingCduBoundary from "../fixtures/scenario2LiquidCoolingCduBoundary.js";
import scenario3HvdcArchitectureBoundary from "../fixtures/scenario3HvdcArchitectureBoundary.js";
import scenario4PowerBlockBoundary from "../fixtures/scenario4PowerBlockBoundary.js";
import { composePreview } from "../previewComposition.js";

const require = createRequire(import.meta.url);
const testDir = dirname(fileURLToPath(import.meta.url));
const providerDir = resolve(testDir, "..");
const repoRoot = resolve(testDir, "../../../..");
const componentPath = resolve(providerDir, "ProviderPreviewLab.js");
const cssPath = resolve(providerDir, "ProviderPreviewLab.module.css");
const appPath = resolve(repoRoot, "src/App.jsx");
const componentSource = readFileSync(componentPath, "utf8");
const cssSource = readFileSync(cssPath, "utf8");
const appSource = readFileSync(appPath, "utf8");
const reactUrl = pathToFileURL(require.resolve("react")).href;
const compositionUrl = pathToFileURL(resolve(providerDir, "previewComposition.js")).href;
const fixtureUrls = {
  scenario1: pathToFileURL(resolve(providerDir, "fixtures/scenario1UpsAiGpuLoadStepResponse.js")).href,
  scenario2: pathToFileURL(resolve(providerDir, "fixtures/scenario2LiquidCoolingCduBoundary.js")).href,
  scenario3: pathToFileURL(resolve(providerDir, "fixtures/scenario3HvdcArchitectureBoundary.js")).href,
  scenario4: pathToFileURL(resolve(providerDir, "fixtures/scenario4PowerBlockBoundary.js")).href,
};
const stylesStub = "const styles = new Proxy({}, { get: (_, key) => String(key) });";
const viewStub = "const PreviewCompositionView = ({ model }) => React.createElement(\"article\", { \"data-preview-composition-view\": \"true\" }, model.title);";
const transformedSource = componentSource
  .replace("import React, { useMemo, useState } from \"react\";", `const React = (await import(${JSON.stringify(reactUrl)})).default; const { useMemo, useState } = React;`)
  .replace("import { PreviewCompositionView } from \"./PreviewCompositionView.js\";", viewStub)
  .replace("import { composePreview } from \"./previewComposition.js\";", `const { composePreview } = await import(${JSON.stringify(compositionUrl)});`)
  .replace("import scenario1UpsAiGpuLoadStepResponse from \"./fixtures/scenario1UpsAiGpuLoadStepResponse.js\";", `const scenario1UpsAiGpuLoadStepResponse = (await import(${JSON.stringify(fixtureUrls.scenario1)})).default;`)
  .replace("import scenario2LiquidCoolingCduBoundary from \"./fixtures/scenario2LiquidCoolingCduBoundary.js\";", `const scenario2LiquidCoolingCduBoundary = (await import(${JSON.stringify(fixtureUrls.scenario2)})).default;`)
  .replace("import scenario3HvdcArchitectureBoundary from \"./fixtures/scenario3HvdcArchitectureBoundary.js\";", `const scenario3HvdcArchitectureBoundary = (await import(${JSON.stringify(fixtureUrls.scenario3)})).default;`)
  .replace("import scenario4PowerBlockBoundary from \"./fixtures/scenario4PowerBlockBoundary.js\";", `const scenario4PowerBlockBoundary = (await import(${JSON.stringify(fixtureUrls.scenario4)})).default;`)
  .replace("import styles from \"./ProviderPreviewLab.module.css\";", stylesStub);
const componentModule = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(transformedSource)}`);

const {
  PROVIDER_PREVIEW_SCENARIOS,
  ProviderPreviewLab,
  getProviderPreviewModel,
} = componentModule;

const scenarioFixtures = [
  scenario1UpsAiGpuLoadStepResponse,
  scenario2LiquidCoolingCduBoundary,
  scenario3HvdcArchitectureBoundary,
  scenario4PowerBlockBoundary,
];

const render = (element) => renderToStaticMarkup(element);

test("ProviderPreviewLab renders status badges scenarios and composed preview path", () => {
  const html = render(React.createElement(ProviderPreviewLab));

  assert.equal(html.includes("Provider Preview Lab"), true);
  assert.equal(html.includes("Not Production Ready"), true);
  assert.equal(html.includes("Provider inactive"), true);
  assert.equal(html.includes("Dify inactive"), true);
  assert.equal(html.includes("RAG inactive"), true);
  [
    "UPS / AI GPU Load Step Response",
    "Liquid Cooling CDU / 120kW Rack Boundary",
    "800VDC / HVDC Architecture Boundary",
    "1MW Integrated Power Module / Power Block",
  ].forEach((label) => {
    assert.equal(html.includes(label), true);
  });
  assert.equal(html.includes("data-preview-composition-view"), true);
  assert.equal(html.includes(scenario1UpsAiGpuLoadStepResponse.title), true);
});

test("all scenarios are backed by fixtures and composePreview ready models", () => {
  assert.equal(PROVIDER_PREVIEW_SCENARIOS.length, 4);
  PROVIDER_PREVIEW_SCENARIOS.forEach((scenario, index) => {
    assert.equal(scenario.fixture, scenarioFixtures[index]);
    const model = getProviderPreviewModel(scenario);
    assert.deepEqual(model, composePreview(scenarioFixtures[index]));
    assert.equal(model.renderState, "ready");
    assert.equal(model.notProductionReady, true);
  });
});

test("ProviderPreviewLab source uses composePreview and PreviewCompositionView without raw fixture dumps", () => {
  assert.equal(componentSource.includes("composePreview(scenario.fixture)"), true);
  assert.equal(componentSource.includes("PreviewCompositionView"), true);
  assert.equal(componentSource.includes("JSON.stringify(preview)"), false);
  assert.equal(componentSource.includes("JSON.stringify(payload)"), false);
  assert.equal(componentSource.includes("JSON.stringify("), false);
  assert.equal(componentSource.includes("|| \"Unknown\""), false);
  assert.equal(componentSource.includes("[object Object]"), false);
});

test("ProviderPreviewLab does not activate Provider Dify DeepSeek RAG runtime or API calls", () => {
  [
    "/api/ask-dify",
    "runAskPreviewAdapter",
    "runAskPipelineAdapter",
    "runAskShadowAdapter",
    "fetch(",
    "axios",
    "DeepSeek",
    "deepseek",
    "providerActive: true",
    "difyActive: true",
    "ragActive: true",
  ].forEach((forbiddenPattern) => {
    assert.equal(componentSource.includes(forbiddenPattern), false);
  });
});

test("App.jsx contains only controlled Provider Preview entry wiring", () => {
  assert.equal(appSource.includes("import { ProviderPreviewLab } from \"./ask/provider/ProviderPreviewLab\";"), true);
  assert.equal(appSource.includes("{ id: \"provider-preview\", icon: Sparkles, label: \"Provider Preview\" }"), true);
  assert.equal(appSource.includes("if (activeTab === \"provider-preview\") return <ProviderPreviewLab />;"), true);
  assert.equal(appSource.includes("if (activeTab === \"ask\") return <AskPowerInsightTab"), true);
});

test("ProviderPreviewLab CSS uses CSS Modules without global selectors or resets", () => {
  assert.equal(componentSource.includes("ProviderPreviewLab.module.css"), true);
  assert.equal(componentSource.includes("styles."), true);
  assert.equal(/\bbody\b/.test(cssSource), false);
  assert.equal(/\bhtml\b/.test(cssSource), false);
  assert.equal(cssSource.includes(":root"), false);
  assert.equal(/(^|[,{]\s*)\*(\s|[,>{.#:[+~])/m.test(cssSource), false);
});

test("current changed files stay inside release MVP allowed scope", () => {
  const changedFiles = execFileSync("git", ["diff", "--name-only", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim().split("\n").filter(Boolean);
  const allowedFiles = new Set([
    "src/App.jsx",
    "src/ask/provider/ProviderPreviewLab.js",
    "src/ask/provider/ProviderPreviewLab.module.css",
    "src/ask/provider/__tests__/ProviderPreviewLab.test.js",
    "src/ask/provider/PreviewCompositionView.module.css",
  ]);

  assert.deepEqual(changedFiles.filter((file) => !allowedFiles.has(file)), []);
});
