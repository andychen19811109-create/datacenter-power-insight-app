import React, { useMemo, useState } from "react";

import { PreviewCompositionView } from "./PreviewCompositionView.js";
import { composePreview } from "./previewComposition.js";
import scenario1UpsAiGpuLoadStepResponse from "./fixtures/scenario1UpsAiGpuLoadStepResponse.js";
import scenario2LiquidCoolingCduBoundary from "./fixtures/scenario2LiquidCoolingCduBoundary.js";
import scenario3HvdcArchitectureBoundary from "./fixtures/scenario3HvdcArchitectureBoundary.js";
import scenario4PowerBlockBoundary from "./fixtures/scenario4PowerBlockBoundary.js";
import styles from "./ProviderPreviewLab.module.css";

const h = React.createElement;

export const PROVIDER_PREVIEW_SCENARIOS = [
  {
    id: "ups-ai-gpu-load-step-response",
    label: "UPS / AI GPU Load Step Response",
    fixture: scenario1UpsAiGpuLoadStepResponse,
  },
  {
    id: "liquid-cooling-cdu-120kw-rack-boundary",
    label: "Liquid Cooling CDU / 120kW Rack Boundary",
    fixture: scenario2LiquidCoolingCduBoundary,
  },
  {
    id: "800vdc-hvdc-architecture-boundary",
    label: "800VDC / HVDC Architecture Boundary",
    fixture: scenario3HvdcArchitectureBoundary,
  },
  {
    id: "1mw-integrated-power-module-power-block",
    label: "1MW Integrated Power Module / Power Block",
    fixture: scenario4PowerBlockBoundary,
  },
];

const runtimeStatuses = [
  "Provider inactive",
  "Dify inactive",
  "RAG inactive",
];

export const getProviderPreviewModel = (scenario) => composePreview(scenario.fixture);

export const ProviderPreviewLab = () => {
  const [activeScenarioId, setActiveScenarioId] = useState(PROVIDER_PREVIEW_SCENARIOS[0].id);
  const activeScenario = PROVIDER_PREVIEW_SCENARIOS.find((scenario) => scenario.id === activeScenarioId)
    || PROVIDER_PREVIEW_SCENARIOS[0];
  const model = useMemo(() => getProviderPreviewModel(activeScenario), [activeScenario]);

  return h("section", { className: styles.lab, "aria-labelledby": "provider-preview-lab-title" },
    h("header", { className: styles.header },
      h("div", { className: styles.headingGroup },
        h("p", { className: styles.eyebrow }, "Provider Preview"),
        h("h2", { id: "provider-preview-lab-title", className: styles.title }, "Provider Preview Lab")),
      h("div", { className: styles.badgeRow },
        h("span", { className: styles.warningBadge }, "Not Production Ready"),
        runtimeStatuses.map((status) => h("span", { className: styles.statusBadge, key: status }, status)))),
    h("div", { className: styles.layout },
      h("aside", { className: styles.selector, "aria-label": "Provider preview scenarios" },
        PROVIDER_PREVIEW_SCENARIOS.map((scenario) => (
          h("button", {
            type: "button",
            key: scenario.id,
            className: `${styles.scenarioButton} ${activeScenario.id === scenario.id ? styles.activeScenario : ""}`,
            onClick: () => setActiveScenarioId(scenario.id),
          },
          h("span", { className: styles.scenarioLabel }, scenario.label),
          h("span", { className: styles.scenarioMeta }, scenario.fixture.scenarioId))
        ))),
      h("div", { className: styles.previewPane },
        h("div", { className: styles.notice },
          "Static fixture preview only. Existing fixtures are composed by composePreview before rendering."),
        h(PreviewCompositionView, { model }))));
};

export default ProviderPreviewLab;
