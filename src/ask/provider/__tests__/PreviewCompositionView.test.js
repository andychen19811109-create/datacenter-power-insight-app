import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const testDir = dirname(fileURLToPath(import.meta.url));
const componentPath = resolve(testDir, "../PreviewCompositionView.js");
const cssPath = resolve(testDir, "../PreviewCompositionView.module.css");
const componentSource = readFileSync(componentPath, "utf8");
const cssSource = readFileSync(cssPath, "utf8");
const reactUrl = pathToFileURL(require.resolve("react")).href;
const stylesStub = "const styles = new Proxy({}, { get: (_, key) => String(key) });";
const transformedSource = componentSource
  .replace("import React from \"react\";", `const React = (await import(${JSON.stringify(reactUrl)})).default;`)
  .replace("import styles from \"./PreviewCompositionView.module.css\";", stylesStub);
const componentModule = await import(`data:text/javascript;charset=utf-8,${encodeURIComponent(transformedSource)}`);

const {
  PreviewCompositionView,
  PreviewCardSwitch,
  DecisionCard,
  BoundaryCard,
  ExpertMetricBlockCard,
  ComparisonTableCard,
  RiskRegisterCard,
  CommercialDecisionCard,
  EvidenceTraceCard,
  DiagnosticsCard,
  FallbackCard,
  UnsupportedCard,
  BlockedPreviewPanel,
  ViewModelContractErrorPanel,
} = componentModule;

const render = (element) => renderToStaticMarkup(element);
const renderView = (model) => render(React.createElement(PreviewCompositionView, { model }));
const renderCard = (card) => render(React.createElement(PreviewCardSwitch, { card }));

const baseCard = {
  componentId: "card_1",
  componentType: "decision_card",
  scenarioId: "scenario_a",
  fallbackAnchor: "scenario_a:card_1",
  renderState: "ready",
  title: "Decision Title",
  payload: {
    summary: "Decision summary",
    decision: {
      recommendation: "Proceed with validation",
    },
    claimRefs: ["claim_1"],
  },
  warnings: [],
  errors: [],
};

const readyModel = {
  scenarioId: "scenario_a",
  title: "Preview Model",
  renderState: "ready",
  notProductionReady: true,
  cards: [baseCard],
  warnings: [],
  errors: [],
};

const blockedModel = {
  scenarioId: "scenario_blocked",
  title: "Blocked Model",
  renderState: "blocked",
  notProductionReady: true,
  cards: [
    {
      ...baseCard,
      componentId: "blocked_card",
      title: "Must Not Render",
    },
  ],
  warnings: [
    {
      code: "BLOCKED_WARNING",
      message: "Blocked warning",
    },
  ],
  errors: [
    {
      code: "PREVIEW_SCHEMA_GUARD_FAILED",
      message: "Guard failed",
    },
  ],
  diagnosticsSummary: {
    reason: "schema guard",
  },
};

test("exports all isolated preview dumb components", () => {
  [
    PreviewCompositionView,
    PreviewCardSwitch,
    DecisionCard,
    BoundaryCard,
    ExpertMetricBlockCard,
    ComparisonTableCard,
    RiskRegisterCard,
    CommercialDecisionCard,
    EvidenceTraceCard,
    DiagnosticsCard,
    FallbackCard,
    UnsupportedCard,
    BlockedPreviewPanel,
    ViewModelContractErrorPanel,
  ].forEach((component) => {
    assert.equal(typeof component, "function");
  });
});

test("component source does not import preview guards fixtures or composition helpers", () => {
  [
    "validatePreviewFixture",
    "previewSchemaGuard",
    "/fixtures/",
    "composePreview",
    "composeSectionCard",
    "normalizeComponentType",
    "sanitize(",
    "cleanPayload(",
    "preview.sections",
  ].forEach((forbiddenPattern) => {
    assert.equal(componentSource.includes(forbiddenPattern), false);
  });
});

test("component source avoids blind UI fallback and raw dump patterns", () => {
  [
    "|| \"Unknown\"",
    "|| []",
    "payload?.items || []",
    "card.errors || []",
    "card.warnings || []",
    "model.cards || []",
    "JSON.stringify(card)",
    "JSON.stringify(card.payload)",
    "JSON.stringify(payload)",
  ].forEach((forbiddenPattern) => {
    assert.equal(componentSource.includes(forbiddenPattern), false);
  });
});

test("component uses CSS Modules and avoids global css imports", () => {
  assert.equal(componentSource.includes("PreviewCompositionView.module.css"), true);
  assert.equal(componentSource.includes("styles."), true);
  assert.equal(componentSource.includes("previewComposition.css"), false);
  assert.equal(componentSource.includes("global.css"), false);
  assert.equal(componentSource.includes("index.css"), false);
  assert.equal(componentSource.includes("app.css"), false);
});

test("css module avoids global selectors and resets", () => {
  assert.equal(/\bbody\b/.test(cssSource), false);
  assert.equal(/\bhtml\b/.test(cssSource), false);
  assert.equal(cssSource.includes(":root"), false);
  assert.equal(/(^|[,{]\s*)\*(\s|[,>{.#:[+~])/m.test(cssSource), false);
});

test("component source avoids deep payload access chains", () => {
  [
    ".payload.metrics[0].payload",
    "item.deepObj.subObj",
    "metric.payload.",
    "row.option.architecture",
    "JSON.stringify(card.payload)",
    "JSON.stringify(payload)",
  ].forEach((forbiddenPattern) => {
    assert.equal(componentSource.includes(forbiddenPattern), false);
  });
  assert.equal(/\.payload\.[A-Za-z0-9_$]+\.[A-Za-z0-9_$]+\.[A-Za-z0-9_$]+/.test(componentSource), false);
});

test("blocked model renders only blocked panel", () => {
  const html = renderView(blockedModel);
  assert.equal(html.includes("Blocked Model"), true);
  assert.equal(html.includes("PREVIEW_SCHEMA_GUARD_FAILED"), true);
  assert.equal(html.includes("Must Not Render"), false);
});

test("ready model renders cards", () => {
  const html = renderView(readyModel);
  assert.equal(html.includes("Preview Model"), true);
  assert.equal(html.includes("Decision Title"), true);
  assert.equal(html.includes("Decision summary"), true);
});

test("invalid model renders contract error", () => {
  const html = renderView({
    ...readyModel,
    title: null,
  });
  assert.equal(html.includes("VIEW_MODEL_CONTRACT_ERROR"), true);
});

test("empty invalid cards contract renders contract error and does not crash", () => {
  const html = renderView({
    ...readyModel,
    cards: [null],
  });
  assert.equal(html.includes("VIEW_MODEL_CONTRACT_ERROR"), true);
});

test("component does not mutate input model", () => {
  const model = structuredClone(readyModel);
  const before = JSON.stringify(model);
  renderView(model);
  assert.equal(JSON.stringify(model), before);
});

test("ready decision_card renders DecisionCard content", () => {
  const html = renderCard(baseCard);
  assert.equal(html.includes("Decision summary"), true);
  assert.equal(html.includes("Proceed with validation"), true);
});

test("ready boundary_card renders BoundaryCard content", () => {
  const html = renderCard({
    ...baseCard,
    componentType: "boundary_card",
    title: "Boundary",
    payload: {
      items: [
        {
          id: "boundary_1",
          label: "Boundary label",
          value: "Boundary value",
        },
      ],
      claimRefs: ["claim_boundary"],
    },
  });
  assert.equal(html.includes("Boundary label"), true);
  assert.equal(html.includes("claim_boundary"), true);
});

test("ready expert_metric_block renders ExpertMetricBlockCard content", () => {
  const html = renderCard({
    ...baseCard,
    componentType: "expert_metric_block",
    title: "Metrics",
    payload: {
      metricGroup: "Electrical",
      metrics: [
        {
          id: "metric_1",
          label: "Metric label",
          description: "Metric description",
          details: {
            notRendered: "Nested detail",
          },
        },
      ],
      validationRequired: true,
      requiredEvidence: ["FAT record"],
    },
  });
  assert.equal(html.includes("Metric label"), true);
  assert.equal(html.includes("FAT record"), true);
  assert.equal(html.includes("Nested detail"), false);
});

test("ready comparison_table renders ComparisonTableCard content", () => {
  const html = renderCard({
    ...baseCard,
    componentType: "comparison_table",
    title: "Comparison",
    payload: {
      rows: [
        {
          dimension: "Voltage",
          decisionImpact: "Boundary only",
        },
      ],
    },
  });
  assert.equal(html.includes("Voltage"), true);
  assert.equal(html.includes("Boundary only"), true);
});

test("comparison_table array row rejects non-scalar cells", () => {
  const html = renderCard({
    ...baseCard,
    componentType: "comparison_table",
    title: "Comparison",
    payload: {
      rows: [
        ["valid cell", { nested: "Nested Object Cell" }],
      ],
    },
  });
  assert.equal(html.includes("VIEW_MODEL_CONTRACT_ERROR"), true);
  assert.equal(html.includes("Nested Object Cell"), false);
  assert.equal(html.includes("[object Object]"), false);
  assert.equal(html.includes("valid cell"), false);
});

test("ready risk_register renders RiskRegisterCard content", () => {
  const html = renderCard({
    ...baseCard,
    componentType: "risk_register",
    title: "Risks",
    payload: {
      risks: [
        {
          id: "risk_1",
          name: "Thermal risk",
          severity: "medium",
          mitigation: "Validate airflow",
        },
      ],
    },
  });
  assert.equal(html.includes("Thermal risk"), true);
  assert.equal(html.includes("medium"), true);
});

test("ready commercial_decision_card renders CommercialDecisionCard content", () => {
  const html = renderCard({
    ...baseCard,
    componentType: "commercial_decision_card",
    title: "Commercial",
    payload: {
      decision: {
        recommendation: "Pilot first",
      },
      targetCustomers: ["AI colocation"],
      firstReferenceProject: "Reference project",
      pricingLogic: "Text-only pricing logic",
      doNotDo: ["No ROI model"],
    },
  });
  assert.equal(html.includes("AI colocation"), true);
  assert.equal(html.includes("Text-only pricing logic"), true);
});

test("ready evidence_trace renders EvidenceTraceCard content", () => {
  const html = renderCard({
    ...baseCard,
    componentType: "evidence_trace",
    title: "Evidence",
    payload: {
      claims: [
        {
          id: "claim_1",
          claimType: "source_backed",
        },
      ],
      sources: [
        {
          id: "source_1",
          evidenceConfidenceScore: 0.82,
        },
      ],
      evidenceConfidenceScore: 0.82,
      validationRequired: true,
    },
    warnings: [
      {
        code: "MISSING_EVIDENCE_SOURCE_REF",
        message: "Missing source warning",
      },
    ],
  });
  assert.equal(html.includes("0.82"), true);
  assert.equal(html.includes("validationRequired"), true);
  assert.equal(html.includes("MISSING_EVIDENCE_SOURCE_REF"), true);
});

test("ready diagnostics_badges renders DiagnosticsCard content", () => {
  const html = renderCard({
    ...baseCard,
    componentType: "diagnostics_badges",
    title: "Diagnostics",
    payload: {
      notProductionReady: true,
      providerActive: false,
      difyActive: false,
      ragActive: false,
      assumptions: ["Requires site validation"],
      missingEvidence: ["Commissioning data"],
      forbiddenClaims: ["Production-ready claim"],
    },
  });
  assert.equal(html.includes("notProductionReady"), true);
  assert.equal(html.includes("providerActive"), true);
  assert.equal(html.includes("difyActive"), true);
  assert.equal(html.includes("ragActive"), true);
  assert.equal(html.includes("Requires site validation"), true);
  assert.equal(html.includes("Commissioning data"), true);
  assert.equal(html.includes("Production-ready claim"), true);
});

test("fallback card renders errors and never renders payload content", () => {
  const html = renderCard({
    ...baseCard,
    renderState: "fallback",
    title: "Fallback",
    payload: {
      summary: "Should not render",
    },
    errors: [
      {
        code: "MISSING_SECTION_IDENTIFIER",
        message: "Missing id",
      },
      {
        code: "MALFORMED_SECTION_PAYLOAD",
        message: "Bad payload",
      },
    ],
  });
  assert.equal(html.includes("Fallback"), true);
  assert.equal(html.includes("MISSING_SECTION_IDENTIFIER"), true);
  assert.equal(html.includes("MALFORMED_SECTION_PAYLOAD"), true);
  assert.equal(html.includes("Should not render"), false);
});

test("unsupported card renders unsupported state and never renders payload content", () => {
  const html = renderCard({
    ...baseCard,
    componentType: "not_supported",
    renderState: "unsupported",
    title: "Unsupported",
    payload: {
      summary: "Should not render",
    },
    errors: [
      {
        code: "UNSUPPORTED_COMPONENT_TYPE",
        message: "Unsupported type",
      },
    ],
  });
  assert.equal(html.includes("UNSUPPORTED_COMPONENT_TYPE"), true);
  assert.equal(html.includes("not_supported"), true);
  assert.equal(html.includes("Should not render"), false);
});

test("blocked panel never renders cards", () => {
  const html = render(React.createElement(BlockedPreviewPanel, { model: blockedModel }));
  assert.equal(html.includes("Must Not Render"), false);
  assert.equal(html.includes("PREVIEW_SCHEMA_GUARD_FAILED"), true);
});

test("negative model injection renders explicit contract error without raw payload", () => {
  [
    {
      ...readyModel,
      title: null,
    },
    {
      ...readyModel,
      cards: null,
    },
    {
      ...readyModel,
      errors: "bad-errors",
    },
    {
      ...readyModel,
      cards: [
        {
          ...baseCard,
          payload: undefined,
        },
      ],
    },
    {
      ...readyModel,
      cards: [
        {
          ...baseCard,
          errors: "bad-errors",
        },
      ],
    },
    {
      ...readyModel,
      cards: [
        {
          ...baseCard,
          renderState: "mystery_state",
        },
      ],
    },
    {
      ...readyModel,
      cards: [
        {
          ...baseCard,
          payload: null,
        },
      ],
    },
    {
      ...readyModel,
      cards: [
        {
          ...baseCard,
          payload: {
            summary: "Injected safe-looking summary",
            decision: {
              nested: {
                leaked: "Nested Model Injection",
              },
            },
          },
        },
      ],
    },
  ].forEach((model) => {
    const html = renderView(model);
    assert.equal(html.includes("VIEW_MODEL_CONTRACT_ERROR"), true);
    assert.equal(html.includes("Nested Model Injection"), false);
    assert.equal(html.includes("Unknown"), false);
    assert.equal(html.includes("Decision Title"), false);
  });
});
