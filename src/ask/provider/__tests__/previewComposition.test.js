import test from "node:test";
import assert from "node:assert/strict";

import scenario1UpsAiGpuLoadStepResponse from "../fixtures/scenario1UpsAiGpuLoadStepResponse.js";
import scenario2LiquidCoolingCduBoundary from "../fixtures/scenario2LiquidCoolingCduBoundary.js";
import scenario3HvdcArchitectureBoundary from "../fixtures/scenario3HvdcArchitectureBoundary.js";
import scenario4PowerBlockBoundary from "../fixtures/scenario4PowerBlockBoundary.js";
import {
  composeDiagnosticsCard,
  composeEvidenceTraceCard,
  composePreview,
  composePreviewCards,
  composeSectionCard,
  createFallbackAnchor,
  isSupportedComponentType,
  validateSectionIdentifier,
} from "../previewComposition.js";

const sectionCardFrom = (preview, id) => composePreview(preview).cards.find((card) => card.componentId === id);

test("valid Scenario 1 returns renderState ready", () => {
  assert.equal(composePreview(scenario1UpsAiGpuLoadStepResponse).renderState, "ready");
});

test("valid Scenario 2 returns renderState ready", () => {
  assert.equal(composePreview(scenario2LiquidCoolingCduBoundary).renderState, "ready");
});

test("valid Scenario 3 returns renderState ready", () => {
  assert.equal(composePreview(scenario3HvdcArchitectureBoundary).renderState, "ready");
});

test("valid Scenario 4 returns renderState ready", () => {
  assert.equal(composePreview(scenario4PowerBlockBoundary).renderState, "ready");
});

test("guard failure returns blocked renderState", () => {
  const preview = {
    ...scenario1UpsAiGpuLoadStepResponse,
    sourceRefs: [],
  };
  const result = composePreview(preview);

  assert.equal(result.renderState, "blocked");
  assert.equal(result.errors.some((error) => error.code === "PREVIEW_SCHEMA_GUARD_FAILED"), true);
});

test("forbidden claim returns blocked renderState", () => {
  const result = composePreview({
    ...scenario1UpsAiGpuLoadStepResponse,
    title: "绝 对 安 全方案",
  });

  assert.equal(result.renderState, "blocked");
});

test("malformed root input returns blocked model", () => {
  const result = composePreview(null);

  assert.equal(result.renderState, "blocked");
  assert.deepEqual(result.cards, []);
});

test("blocked model has empty cards", () => {
  const result = composePreview({
    ...scenario1UpsAiGpuLoadStepResponse,
    claimRefs: [],
  });

  assert.deepEqual(result.cards, []);
});

test("every card has componentId and fallbackAnchor", () => {
  composePreview(scenario1UpsAiGpuLoadStepResponse).cards.forEach((card) => {
    assert.equal(typeof card.componentId, "string");
    assert.equal(typeof card.fallbackAnchor, "string");
  });
});

test("every fallbackAnchor includes scenarioId", () => {
  composePreview(scenario1UpsAiGpuLoadStepResponse).cards.forEach((card) => {
    assert.equal(card.fallbackAnchor.includes(scenario1UpsAiGpuLoadStepResponse.scenarioId), true);
  });
});

test("valid section anchor equals scenarioId and section id", () => {
  const card = sectionCardFrom(scenario1UpsAiGpuLoadStepResponse, "s1_boundary");
  assert.equal(card.fallbackAnchor, `${scenario1UpsAiGpuLoadStepResponse.scenarioId}:s1_boundary`);
});

test("missing section id creates missing_section anchor", () => {
  const cards = composePreviewCards({
    ...scenario1UpsAiGpuLoadStepResponse,
    sections: [
      {
        ...scenario1UpsAiGpuLoadStepResponse.sections[0],
        id: "",
      },
    ],
  });
  const fallback = cards.find((card) => card.renderState === "fallback");
  assert.equal(fallback.fallbackAnchor, `${scenario1UpsAiGpuLoadStepResponse.scenarioId}:missing_section_0`);
});

test("componentId does not contain raw user question text", () => {
  composePreview(scenario1UpsAiGpuLoadStepResponse).cards.forEach((card) => {
    assert.equal(card.componentId.includes(scenario1UpsAiGpuLoadStepResponse.userQuestion), false);
  });
});

test("missing section id creates fallback card", () => {
  const card = composeSectionCard({
    ...scenario1UpsAiGpuLoadStepResponse.sections[0],
    id: undefined,
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.renderState, "fallback");
  assert.equal(card.errors.some((error) => error.code === "MISSING_SECTION_IDENTIFIER"), true);
});

test("empty string id creates fallback card", () => {
  assert.equal(validateSectionIdentifier(""), false);
});

test("whitespace-only id creates fallback card", () => {
  assert.equal(validateSectionIdentifier("   "), false);
});

test("id with spaces creates fallback card", () => {
  assert.equal(validateSectionIdentifier("decision summary"), false);
});

test("id with newline creates fallback card", () => {
  assert.equal(validateSectionIdentifier("decision\nsummary"), false);
});

test("non-string id creates fallback card", () => {
  assert.equal(validateSectionIdentifier(123), false);
});

test("fallback payload is empty object", () => {
  const card = composeSectionCard({
    ...scenario1UpsAiGpuLoadStepResponse.sections[0],
    id: "bad id",
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.deepEqual(card.payload, {});
});

test("metric_block normalizes to expert_metric_block", () => {
  const card = composeSectionCard({
    id: "metric_block_section",
    componentType: "metric_block",
    title: "Metrics",
    metrics: [
      {
        id: "metric_1",
        label: "Metric 1",
      },
    ],
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.componentType, "expert_metric_block");
});

test("commercial_recommendation normalizes to commercial_decision_card", () => {
  const card = composeSectionCard({
    id: "commercial_card",
    componentType: "commercial_recommendation",
    title: "Commercial",
    targetCustomers: ["AI colocation"],
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.componentType, "commercial_decision_card");
  assert.equal(card.renderState, "ready");
});

test("unknown componentType creates unsupported card", () => {
  const card = composeSectionCard({
    id: "unsupported_card",
    componentType: "unknown_widget",
    title: "Unsupported",
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.renderState, "unsupported");
});

test("unsupported card payload is empty object and has error", () => {
  const card = composeSectionCard({
    id: "unsupported_card",
    componentType: "unknown_widget",
    title: "Unsupported",
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.deepEqual(card.payload, {});
  assert.equal(card.errors.some((error) => error.code === "UNSUPPORTED_COMPONENT_TYPE"), true);
});

test("valid decision_card produces ready card", () => {
  const card = composeSectionCard({
    id: "decision_summary",
    componentType: "decision_card",
    title: "Decision",
    summary: "Use staged validation.",
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.renderState, "ready");
});

test("malformed decision_card produces fallback card with empty payload", () => {
  const card = composeSectionCard({
    id: "decision_summary",
    componentType: "decision_card",
    title: "Decision",
    decision: "invalid",
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.renderState, "fallback");
  assert.deepEqual(card.payload, {});
});

test("valid boundary_card produces ready card", () => {
  const card = composeSectionCard({
    id: "boundary_section",
    componentType: "boundary_card",
    title: "Boundary",
    items: [
      {
        label: "Boundary",
        value: "Explicit interface",
      },
    ],
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.renderState, "ready");
});

test("boundary_card with empty items produces fallback", () => {
  const card = composeSectionCard({
    id: "boundary_section",
    componentType: "boundary_card",
    title: "Boundary",
    items: [],
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.renderState, "fallback");
});

test("valid metric_block produces ready card", () => {
  const card = composeSectionCard({
    id: "metric_section",
    componentType: "metric_block",
    title: "Metrics",
    metrics: [
      {
        label: "Metric",
        description: "Explain metric",
      },
    ],
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.renderState, "ready");
});

test("metric_block with empty metrics produces fallback", () => {
  const card = composeSectionCard({
    id: "metric_section",
    componentType: "metric_block",
    title: "Metrics",
    metrics: [],
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.renderState, "fallback");
});

test("valid comparison_table produces ready card", () => {
  const card = composeSectionCard({
    id: "comparison_section",
    componentType: "comparison_table",
    title: "Comparison",
    rows: [
      {
        option: "A",
        value: "B",
      },
    ],
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.renderState, "ready");
});

test("comparison_table with empty rows produces fallback", () => {
  const card = composeSectionCard({
    id: "comparison_section",
    componentType: "comparison_table",
    title: "Comparison",
    rows: [],
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.renderState, "fallback");
});

test("valid risk_register produces ready card", () => {
  const card = composeSectionCard({
    id: "risk_section",
    componentType: "risk_register",
    title: "Risk",
    risks: [
      {
        id: "risk_1",
        description: "Keep watch",
        severity: "High",
      },
    ],
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.renderState, "ready");
});

test("risk_register with unknown severity remains ready with warning", () => {
  const card = composeSectionCard({
    id: "risk_section",
    componentType: "risk_register",
    title: "Risk",
    risks: [
      {
        id: "risk_1",
        description: "Keep watch",
      },
    ],
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.renderState, "ready");
  assert.equal(card.warnings.some((warning) => warning.code === "UNKNOWN_RISK_SEVERITY"), true);
  assert.equal(card.payload.risks[0].severity, "Unclassified Risk");
});

test("risk_register with empty risks produces fallback", () => {
  const card = composeSectionCard({
    id: "risk_section",
    componentType: "risk_register",
    title: "Risk",
    risks: [],
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.renderState, "fallback");
});

test("valid commercial card produces ready card", () => {
  const card = composeSectionCard({
    id: "commercial_section",
    componentType: "commercial_decision_card",
    title: "Commercial",
    decision: {
      recommendation: "Start with lighthouse accounts.",
    },
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.renderState, "ready");
});

test("empty commercial payload produces fallback", () => {
  const card = composeSectionCard({
    id: "commercial_section",
    componentType: "commercial_decision_card",
    title: "Commercial",
  }, {
    scenarioId: scenario1UpsAiGpuLoadStepResponse.scenarioId,
    sectionIndex: 0,
  });

  assert.equal(card.renderState, "fallback");
});

test("evidence_trace card is generated when sourceRefs or claimRefs exist", () => {
  const cards = composePreview(scenario1UpsAiGpuLoadStepResponse).cards;
  assert.ok(cards.find((card) => card.componentId === "evidence_trace"));
});

test("diagnostics card is always generated", () => {
  const cards = composePreview(scenario1UpsAiGpuLoadStepResponse).cards;
  assert.ok(cards.find((card) => card.componentId === "diagnostics"));
});

test("evidence card contains evidenceConfidenceScore", () => {
  const card = composeEvidenceTraceCard(scenario1UpsAiGpuLoadStepResponse);
  assert.equal(typeof card.payload.sourceRefs[0].evidenceConfidenceScore, "number");
});

test("vendor_claim_with_validation_required remains visible in evidence payload", () => {
  const card = composeEvidenceTraceCard(scenario1UpsAiGpuLoadStepResponse);
  assert.equal(card.payload.claimRefs.some((claimRef) => claimRef.validationRequired === true), true);
});

test("missing sourceRef link creates warning", () => {
  const card = composeEvidenceTraceCard({
    ...scenario1UpsAiGpuLoadStepResponse,
    claimRefs: [
      {
        ...scenario1UpsAiGpuLoadStepResponse.claimRefs[0],
        sourceRefs: ["src_missing"],
      },
    ],
  });

  assert.equal(card.warnings.some((warning) => warning.code === "MISSING_EVIDENCE_SOURCE_REF"), true);
});

test("diagnostics card preserves notProductionReady and assumptions", () => {
  const card = composeDiagnosticsCard(scenario1UpsAiGpuLoadStepResponse);
  assert.equal(card.payload.notProductionReady, true);
  assert.deepEqual(card.payload.assumptions, scenario1UpsAiGpuLoadStepResponse.diagnostics.assumptions);
});

test("diagnostics card preserves missingEvidence", () => {
  const card = composeDiagnosticsCard({
    ...scenario1UpsAiGpuLoadStepResponse,
    diagnostics: {
      ...scenario1UpsAiGpuLoadStepResponse.diagnostics,
      missingEvidence: ["Need FAT evidence"],
    },
  });

  assert.deepEqual(card.payload.missingEvidence, ["Need FAT evidence"]);
});

test("one malformed section does not prevent other valid sections from composing", () => {
  const cards = composePreviewCards({
    ...scenario1UpsAiGpuLoadStepResponse,
    sections: [
      scenario1UpsAiGpuLoadStepResponse.sections[0],
      {
        id: "bad section",
        componentType: "decision_card",
      },
    ],
  });

  assert.equal(cards.some((card) => card.componentId === "s1_boundary" && card.renderState === "ready"), true);
  assert.equal(cards.some((card) => card.renderState === "fallback"), true);
});

test("null section creates fallback and no throw", () => {
  const cards = composePreviewCards({
    ...scenario1UpsAiGpuLoadStepResponse,
    sections: [null],
  });

  assert.equal(cards[0].renderState, "fallback");
});

test("malformed known section does not create blocked page in card composition", () => {
  const cards = composePreviewCards({
    ...scenario1UpsAiGpuLoadStepResponse,
    sections: [
      {
        id: "metric_section",
        componentType: "metric_block",
        metrics: [],
      },
    ],
  });

  assert.equal(cards[0].renderState, "fallback");
});

test("unknown component does not create blocked page in card composition", () => {
  const cards = composePreviewCards({
    ...scenario1UpsAiGpuLoadStepResponse,
    sections: [
      {
        id: "unknown_section",
        componentType: "mystery_widget",
      },
    ],
  });

  assert.equal(cards[0].renderState, "unsupported");
});

test("only root guard failure creates blocked page", () => {
  const readyResult = composePreview(scenario1UpsAiGpuLoadStepResponse);
  const blockedResult = composePreview({
    ...scenario1UpsAiGpuLoadStepResponse,
    sections: [],
  });

  assert.equal(readyResult.renderState, "ready");
  assert.equal(blockedResult.renderState, "blocked");
});

test("createFallbackAnchor uses scenarioId and sectionId", () => {
  assert.equal(
    createFallbackAnchor("scenario_1", "decision_summary"),
    "scenario_1:decision_summary",
  );
});

test("supported component type helper respects normalized types", () => {
  assert.equal(isSupportedComponentType("metric_block"), true);
  assert.equal(isSupportedComponentType("commercial_recommendation"), true);
  assert.equal(isSupportedComponentType("mystery_widget"), false);
});
