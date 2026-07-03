import React from "react";

import styles from "./PreviewCompositionView.module.css";

const KNOWN_COMPONENTS = new Set([
  "decision_card",
  "boundary_card",
  "expert_metric_block",
  "comparison_table",
  "risk_register",
  "commercial_decision_card",
  "evidence_trace",
  "diagnostics_badges",
]);

const h = React.createElement;

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isScalar = (value) => (
  typeof value === "string"
  || typeof value === "number"
  || typeof value === "boolean"
  || value === null
);
const isString = (value) => typeof value === "string";
const isMessageList = (value) => (
  Array.isArray(value)
  && value.every((entry) => (
    isPlainObject(entry)
    && isString(entry.code)
    && (entry.message === undefined || isString(entry.message))
  ))
);
const isScalarList = (value) => Array.isArray(value) && value.every(isScalar);
const isRenderableObject = (value, allowedNestedObjectFields = []) => (
  isPlainObject(value)
  && Object.entries(value).every(([key, entryValue]) => (
    isScalar(entryValue)
    || isScalarList(entryValue)
    || (allowedNestedObjectFields.includes(key) && isPlainObject(entryValue))
  ))
);
const isRenderableObjectList = (value, allowedNestedObjectFields = []) => (
  Array.isArray(value)
  && value.every((entry) => isRenderableObject(entry, allowedNestedObjectFields))
);
const hasCardShell = (card) => (
  isPlainObject(card)
  && isString(card.componentId)
  && isString(card.componentType)
  && isString(card.scenarioId)
  && isString(card.fallbackAnchor)
  && isString(card.renderState)
  && isString(card.title)
  && isPlainObject(card.payload)
  && isMessageList(card.warnings)
  && isMessageList(card.errors)
);
const hasModelShell = (model) => (
  isPlainObject(model)
  && isString(model.scenarioId)
  && isString(model.title)
  && isString(model.renderState)
  && typeof model.notProductionReady === "boolean"
  && Array.isArray(model.cards)
  && isMessageList(model.warnings)
  && isMessageList(model.errors)
);
const hasDecisionPayload = (payload) => (
  isPlainObject(payload)
  && (payload.summary === undefined || isScalar(payload.summary))
  && (payload.decision === undefined || isRenderableObject(payload.decision))
  && (payload.claimRefs === undefined || isScalarList(payload.claimRefs))
);
const hasBoundaryPayload = (payload) => (
  isPlainObject(payload)
  && (payload.items === undefined || isRenderableObjectList(payload.items, ["details"]))
  && (payload.claimRefs === undefined || isScalarList(payload.claimRefs))
);
const hasMetricPayload = (payload) => (
  isPlainObject(payload)
  && (payload.metricGroup === undefined || isScalar(payload.metricGroup))
  && (payload.metrics === undefined || isRenderableObjectList(payload.metrics, ["details"]))
  && (payload.validationRequired === undefined || typeof payload.validationRequired === "boolean")
  && (payload.requiredEvidence === undefined || isScalarList(payload.requiredEvidence))
);
const hasComparisonPayload = (payload) => (
  isPlainObject(payload)
  && Array.isArray(payload.rows)
  && payload.rows.every((row) => Array.isArray(row) || isRenderableObject(row))
);
const hasRiskPayload = (payload) => (
  isPlainObject(payload)
  && (payload.risks === undefined || isRenderableObjectList(payload.risks))
);
const hasCommercialPayload = (payload) => (
  isPlainObject(payload)
  && (payload.decision === undefined || payload.decision === null || isRenderableObject(payload.decision))
  && (payload.targetCustomers === undefined || isScalarList(payload.targetCustomers))
  && (payload.firstReferenceProject === undefined || isScalar(payload.firstReferenceProject))
  && (payload.pricingLogic === undefined || isScalar(payload.pricingLogic))
  && (payload.doNotDo === undefined || isScalarList(payload.doNotDo))
);
const hasEvidencePayload = (payload) => (
  isPlainObject(payload)
  && (payload.claims === undefined || isRenderableObjectList(payload.claims))
  && (payload.claimRefs === undefined || isRenderableObjectList(payload.claimRefs))
  && (payload.sources === undefined || isRenderableObjectList(payload.sources))
  && (payload.sourceRefs === undefined || isRenderableObjectList(payload.sourceRefs))
  && (payload.evidenceConfidenceScore === undefined || isScalar(payload.evidenceConfidenceScore))
  && (payload.validationRequired === undefined || typeof payload.validationRequired === "boolean")
);
const hasDiagnosticsPayload = (payload) => (
  isPlainObject(payload)
  && (payload.notProductionReady === undefined || typeof payload.notProductionReady === "boolean")
  && (payload.providerActive === undefined || typeof payload.providerActive === "boolean")
  && (payload.difyActive === undefined || typeof payload.difyActive === "boolean")
  && (payload.ragActive === undefined || typeof payload.ragActive === "boolean")
  && (payload.assumptions === undefined || isScalarList(payload.assumptions))
  && (payload.missingEvidence === undefined || isScalarList(payload.missingEvidence))
  && (payload.forbiddenClaims === undefined || isScalarList(payload.forbiddenClaims))
);
const hasKnownPayloadContract = (card) => {
  if (!hasCardShell(card)) {
    return false;
  }

  if (card.renderState === "fallback" || card.renderState === "unsupported") {
    return true;
  }

  if (card.renderState !== "ready") {
    return false;
  }

  switch (card.componentType) {
    case "decision_card":
      return hasDecisionPayload(card.payload);
    case "boundary_card":
      return hasBoundaryPayload(card.payload);
    case "expert_metric_block":
      return hasMetricPayload(card.payload);
    case "comparison_table":
      return hasComparisonPayload(card.payload);
    case "risk_register":
      return hasRiskPayload(card.payload);
    case "commercial_decision_card":
      return hasCommercialPayload(card.payload);
    case "evidence_trace":
      return hasEvidencePayload(card.payload);
    case "diagnostics_badges":
      return hasDiagnosticsPayload(card.payload);
    default:
      return false;
  }
};
const renderScalar = (value) => {
  if (value === null) {
    return null;
  }

  return String(value);
};
const renderField = (label, value, key) => (
  value === undefined
    ? null
    : h("div", { className: styles.field, key },
      h("dt", { className: styles.fieldLabel }, label),
      h("dd", { className: styles.fieldValue }, renderScalar(value)))
);
const renderObjectFields = (value, keyPrefix) => {
  if (!isPlainObject(value)) {
    return null;
  }

  return h("dl", { className: styles.fields, key: keyPrefix },
    Object.entries(value).map(([key, entryValue]) => (
      isScalar(entryValue)
        ? renderField(key, entryValue, `${keyPrefix}-${key}`)
        : null
    )))
  ;
};
const renderScalarItems = (items, keyPrefix) => {
  if (!Array.isArray(items)) {
    return null;
  }

  return h("ul", { className: styles.list, key: keyPrefix },
    items.map((item, index) => (
      h("li", { className: styles.listItem, key: `${keyPrefix}-${index}` }, renderScalar(item))
    )))
  ;
};
const renderMessages = (messages, tone, keyPrefix) => (
  h("ul", { className: `${styles.messages} ${styles[tone]}`, key: keyPrefix },
    messages.map((message, index) => (
      h("li", { className: styles.message, key: `${keyPrefix}-${message.code}-${index}` },
        h("strong", null, message.code),
        message.message === undefined ? null : h("span", null, message.message))
    )))
);
const renderStatus = (card) => (
  h("div", { className: styles.meta },
    h("span", { className: styles.badge }, card.componentId),
    h("span", { className: styles.badge }, card.fallbackAnchor))
);
const renderCardFrame = (card, children, tone = "card") => (
  h("section", { className: `${styles.card} ${styles[tone]}` },
    h("header", { className: styles.cardHeader },
      h("h3", { className: styles.cardTitle }, card.title),
      renderStatus(card)),
    children,
    renderMessages(card.warnings, "warning", `${card.componentId}-warnings`),
    renderMessages(card.errors, "error", `${card.componentId}-errors`))
);
const renderObjectList = (items, keyPrefix) => {
  if (!Array.isArray(items)) {
    return null;
  }

  return h("div", { className: styles.stack, key: keyPrefix },
    items.map((item, index) => (
      h("article", { className: styles.row, key: `${keyPrefix}-${index}` },
        renderObjectFields(item, `${keyPrefix}-${index}`))
    )))
  ;
};
const renderComparisonRows = (rows) => (
  h("div", { className: styles.table },
    rows.map((row, rowIndex) => (
      h("div", { className: styles.tableRow, key: `row-${rowIndex}` },
        Array.isArray(row)
          ? row.map((cell, cellIndex) => (
            h("span", { className: styles.tableCell, key: `cell-${rowIndex}-${cellIndex}` }, renderScalar(cell))
          ))
          : Object.entries(row).map(([key, value]) => (
            h("span", { className: styles.tableCell, key: `cell-${rowIndex}-${key}` },
              h("strong", null, key),
              isScalar(value) ? h("span", null, renderScalar(value)) : null)
          )))
    )))
);

export const ViewModelContractErrorPanel = () => (
  h("section", { className: `${styles.card} ${styles.contractError}` },
    h("h3", { className: styles.cardTitle }, "VIEW_MODEL_CONTRACT_ERROR"),
    h("p", { className: styles.notice }, "The preview view model cannot be rendered safely."))
);

export const BlockedPreviewPanel = ({ model }) => {
  if (!hasModelShell(model) || model.renderState !== "blocked") {
    return h(ViewModelContractErrorPanel);
  }

  return h("section", { className: `${styles.card} ${styles.blocked}` },
    h("header", { className: styles.cardHeader },
      h("h2", { className: styles.title }, model.title),
      h("span", { className: styles.badge }, model.scenarioId)),
    renderMessages(model.warnings, "warning", "blocked-warnings"),
    renderMessages(model.errors, "error", "blocked-errors"),
    isPlainObject(model.diagnosticsSummary)
      ? renderObjectFields(model.diagnosticsSummary, "blocked-diagnostics")
      : null)
  ;
};

export const FallbackCard = ({ card }) => {
  if (!hasCardShell(card) || card.renderState !== "fallback") {
    return h(ViewModelContractErrorPanel);
  }

  return renderCardFrame(card, h("p", { className: styles.notice }, "Fallback preview card."), "fallback");
};

export const UnsupportedCard = ({ card }) => {
  if (!hasCardShell(card) || card.renderState !== "unsupported") {
    return h(ViewModelContractErrorPanel);
  }

  return renderCardFrame(card,
    h("dl", { className: styles.fields },
      renderField("componentType", card.componentType, "component-type")),
    "unsupported");
};

export const DecisionCard = ({ card }) => {
  if (!hasKnownPayloadContract(card) || card.componentType !== "decision_card") {
    return h(ViewModelContractErrorPanel);
  }

  const payload = card.payload;
  return renderCardFrame(card,
    h("div", { className: styles.stack },
      renderField("summary", payload.summary, "summary"),
      renderObjectFields(payload.decision, "decision"),
      renderScalarItems(payload.claimRefs, "claimRefs")));
};

export const BoundaryCard = ({ card }) => {
  if (!hasKnownPayloadContract(card) || card.componentType !== "boundary_card") {
    return h(ViewModelContractErrorPanel);
  }

  const payload = card.payload;
  return renderCardFrame(card,
    h("div", { className: styles.stack },
      renderObjectList(payload.items, "boundary-items"),
      renderScalarItems(payload.claimRefs, "boundary-claimRefs")));
};

export const ExpertMetricBlockCard = ({ card }) => {
  if (!hasKnownPayloadContract(card) || card.componentType !== "expert_metric_block") {
    return h(ViewModelContractErrorPanel);
  }

  const payload = card.payload;
  return renderCardFrame(card,
    h("div", { className: styles.stack },
      renderField("metricGroup", payload.metricGroup, "metricGroup"),
      renderObjectList(payload.metrics, "metrics"),
      renderField("validationRequired", payload.validationRequired, "validationRequired"),
      renderScalarItems(payload.requiredEvidence, "requiredEvidence")));
};

export const ComparisonTableCard = ({ card }) => {
  if (!hasKnownPayloadContract(card) || card.componentType !== "comparison_table") {
    return h(ViewModelContractErrorPanel);
  }

  return renderCardFrame(card, renderComparisonRows(card.payload.rows));
};

export const RiskRegisterCard = ({ card }) => {
  if (!hasKnownPayloadContract(card) || card.componentType !== "risk_register") {
    return h(ViewModelContractErrorPanel);
  }

  return renderCardFrame(card, renderObjectList(card.payload.risks, "risks"));
};

export const CommercialDecisionCard = ({ card }) => {
  if (!hasKnownPayloadContract(card) || card.componentType !== "commercial_decision_card") {
    return h(ViewModelContractErrorPanel);
  }

  const payload = card.payload;
  return renderCardFrame(card,
    h("div", { className: styles.stack },
      renderObjectFields(payload.decision, "commercial-decision"),
      renderScalarItems(payload.targetCustomers, "targetCustomers"),
      renderField("firstReferenceProject", payload.firstReferenceProject, "firstReferenceProject"),
      renderField("pricingLogic", payload.pricingLogic, "pricingLogic"),
      renderScalarItems(payload.doNotDo, "doNotDo")));
};

export const EvidenceTraceCard = ({ card }) => {
  if (!hasKnownPayloadContract(card) || card.componentType !== "evidence_trace") {
    return h(ViewModelContractErrorPanel);
  }

  const payload = card.payload;
  return renderCardFrame(card,
    h("div", { className: styles.stack },
      renderObjectList(payload.claims, "claims"),
      renderObjectList(payload.claimRefs, "claimRefs"),
      renderObjectList(payload.sources, "sources"),
      renderObjectList(payload.sourceRefs, "sourceRefs"),
      renderField("evidenceConfidenceScore", payload.evidenceConfidenceScore, "evidenceConfidenceScore"),
      renderField("validationRequired", payload.validationRequired, "validationRequired")));
};

export const DiagnosticsCard = ({ card }) => {
  if (!hasKnownPayloadContract(card) || card.componentType !== "diagnostics_badges") {
    return h(ViewModelContractErrorPanel);
  }

  const payload = card.payload;
  return renderCardFrame(card,
    h("div", { className: styles.stack },
      renderField("notProductionReady", payload.notProductionReady, "notProductionReady"),
      renderField("providerActive", payload.providerActive, "providerActive"),
      renderField("difyActive", payload.difyActive, "difyActive"),
      renderField("ragActive", payload.ragActive, "ragActive"),
      renderScalarItems(payload.assumptions, "assumptions"),
      renderScalarItems(payload.missingEvidence, "missingEvidence"),
      renderScalarItems(payload.forbiddenClaims, "forbiddenClaims")));
};

export const PreviewCardSwitch = ({ card }) => {
  if (!hasCardShell(card)) {
    return h(ViewModelContractErrorPanel);
  }

  if (card.renderState === "fallback") {
    return h(FallbackCard, { card });
  }

  if (card.renderState === "unsupported") {
    return h(UnsupportedCard, { card });
  }

  if (card.renderState !== "ready" || !KNOWN_COMPONENTS.has(card.componentType)) {
    return h(ViewModelContractErrorPanel);
  }

  switch (card.componentType) {
    case "decision_card":
      return h(DecisionCard, { card });
    case "boundary_card":
      return h(BoundaryCard, { card });
    case "expert_metric_block":
      return h(ExpertMetricBlockCard, { card });
    case "comparison_table":
      return h(ComparisonTableCard, { card });
    case "risk_register":
      return h(RiskRegisterCard, { card });
    case "commercial_decision_card":
      return h(CommercialDecisionCard, { card });
    case "evidence_trace":
      return h(EvidenceTraceCard, { card });
    case "diagnostics_badges":
      return h(DiagnosticsCard, { card });
    default:
      return h(ViewModelContractErrorPanel);
  }
};

export const PreviewCompositionView = ({ model }) => {
  if (!hasModelShell(model)) {
    return h(ViewModelContractErrorPanel);
  }

  if (model.renderState === "blocked") {
    return h(BlockedPreviewPanel, { model });
  }

  if (model.renderState !== "ready") {
    return h(ViewModelContractErrorPanel);
  }

  return h("section", { className: styles.preview },
    h("header", { className: styles.header },
      h("h2", { className: styles.title }, model.title),
      h("span", { className: styles.badge }, model.scenarioId),
      h("span", { className: styles.badge }, String(model.notProductionReady))),
    renderMessages(model.warnings, "warning", "model-warnings"),
    renderMessages(model.errors, "error", "model-errors"),
    h("div", { className: styles.cards },
      model.cards.map((card, index) => (
        h(PreviewCardSwitch, { card, key: `preview-card-${index}` })
      ))))
  ;
};
