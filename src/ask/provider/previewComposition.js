import { validatePreviewFixture } from "./previewSchemaGuard.js";

const SUPPORTED_COMPONENT_TYPES = new Set([
  "decision_card",
  "boundary_card",
  "expert_metric_block",
  "comparison_table",
  "risk_register",
  "commercial_decision_card",
  "evidence_trace",
  "diagnostics_badges",
]);

const SECTION_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const safeArray = (value) => (Array.isArray(value) ? value : []);
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const safeScenarioId = (value) => (isNonEmptyString(value) ? value.trim() : "unknown_scenario");
const safeTitle = (value, fallback = "Unsupported or malformed section") => (isNonEmptyString(value) ? value.trim() : fallback);

const normalizeComponentType = (componentType) => {
  if (!isNonEmptyString(componentType)) {
    return null;
  }

  if (componentType === "metric_block") {
    return "expert_metric_block";
  }

  if (componentType === "commercial_recommendation") {
    return "commercial_decision_card";
  }

  return componentType;
};

const inferComponentType = (section = {}) => {
  const explicitType = normalizeComponentType(section.componentType);
  if (explicitType) {
    return explicitType;
  }

  if (safeArray(section.metrics).length > 0) {
    return "expert_metric_block";
  }

  if (safeArray(section.rows).length > 0) {
    return "comparison_table";
  }

  if (safeArray(section.risks).length > 0) {
    return "risk_register";
  }

  if (safeArray(section.items).length > 0) {
    return "boundary_card";
  }

  if (
    section.decision != null
    || safeArray(section.targetCustomers).length > 0
    || isNonEmptyString(section.firstReferenceProject)
    || safeArray(section.doNotDo).length > 0
  ) {
    return "commercial_decision_card";
  }

  return "decision_card";
};

const buildCardBase = ({
  componentId,
  componentType,
  scenarioId,
  fallbackAnchor,
  renderState,
  title,
  payload = {},
  warnings = [],
  errors = [],
}) => ({
  componentId,
  componentType,
  scenarioId,
  fallbackAnchor,
  renderState,
  title,
  payload,
  warnings,
  errors,
});

const buildFallbackCard = ({
  scenarioId,
  sectionId,
  sectionIndex = 0,
  componentType = "decision_card",
  title = "Unsupported or malformed section",
  errors = [],
}) => {
  const fallbackSectionId = validateSectionIdentifier(sectionId)
    ? sectionId
    : `missing_section_${sectionIndex}`;

  return buildCardBase({
    componentId: fallbackSectionId,
    componentType,
    scenarioId,
    fallbackAnchor: createFallbackAnchor(scenarioId, fallbackSectionId),
    renderState: "fallback",
    title,
    payload: {},
    warnings: [],
    errors,
  });
};

const buildUnsupportedCard = ({
  scenarioId,
  sectionId,
  sectionIndex = 0,
  componentType,
  title,
}) => {
  const normalizedSectionId = validateSectionIdentifier(sectionId)
    ? sectionId
    : `missing_section_${sectionIndex}`;

  return buildCardBase({
    componentId: normalizedSectionId,
    componentType,
    scenarioId,
    fallbackAnchor: createFallbackAnchor(scenarioId, normalizedSectionId),
    renderState: "unsupported",
    title: safeTitle(title),
    payload: {},
    warnings: [],
    errors: [
      {
        code: "UNSUPPORTED_COMPONENT_TYPE",
        message: "Section component type is unsupported.",
      },
    ],
  });
};

const buildDecisionPayload = (section) => {
  if (section.decision != null && !isPlainObject(section.decision)) {
    return {
      ok: false,
      error: {
        code: "MALFORMED_SECTION_PAYLOAD",
        message: "decision_card.decision must be a plain object.",
      },
    };
  }

  const hasMeaningfulContent = (
    isNonEmptyString(section.summary)
    || isNonEmptyString(section.body)
    || isPlainObject(section.decision)
    || isNonEmptyString(section.decision?.recommendation)
  );

  if (!hasMeaningfulContent) {
    return {
      ok: false,
      error: {
        code: "MALFORMED_SECTION_PAYLOAD",
        message: "decision_card requires summary, body, or decision content.",
      },
    };
  }

  return {
    ok: true,
    payload: {
      summary: isNonEmptyString(section.summary) ? section.summary : null,
      body: isNonEmptyString(section.body) ? section.body : null,
      decision: isPlainObject(section.decision) ? { ...section.decision } : {},
    },
    warnings: [],
  };
};

const buildBoundaryPayload = (section) => {
  const items = safeArray(section.items);
  if (items.length === 0) {
    return {
      ok: false,
      error: {
        code: "MALFORMED_SECTION_PAYLOAD",
        message: "boundary_card.items must be a non-empty array.",
      },
    };
  }

  const warnings = [];
  const validItems = items.reduce((accumulator, item, itemIndex) => {
    if (!isPlainObject(item)) {
      warnings.push({
        code: "MALFORMED_BOUNDARY_ITEM",
        message: `boundary_card.items[${itemIndex}] is invalid and was ignored.`,
      });
      return accumulator;
    }

    if (!isNonEmptyString(item.label) && !isNonEmptyString(item.value)) {
      warnings.push({
        code: "MALFORMED_BOUNDARY_ITEM",
        message: `boundary_card.items[${itemIndex}] is missing label and value.`,
      });
      return accumulator;
    }

    accumulator.push({
      id: isNonEmptyString(item.id) ? item.id : null,
      label: isNonEmptyString(item.label) ? item.label : null,
      value: isNonEmptyString(item.value) ? item.value : null,
      details: isPlainObject(item.details) ? { ...item.details } : {},
    });
    return accumulator;
  }, []);

  if (validItems.length === 0) {
    return {
      ok: false,
      error: {
        code: "MALFORMED_SECTION_PAYLOAD",
        message: "boundary_card.items must include at least one valid item.",
      },
    };
  }

  return {
    ok: true,
    payload: {
      summary: isNonEmptyString(section.summary) ? section.summary : null,
      body: isNonEmptyString(section.body) ? section.body : null,
      items: validItems,
    },
    warnings,
  };
};

const buildMetricPayload = (section) => {
  const metrics = safeArray(section.metrics);
  if (metrics.length === 0) {
    return {
      ok: false,
      error: {
        code: "MALFORMED_SECTION_PAYLOAD",
        message: "metric_block.metrics must be a non-empty array.",
      },
    };
  }

  const warnings = [];
  const validMetrics = metrics.reduce((accumulator, metric, metricIndex) => {
    if (!isPlainObject(metric)) {
      warnings.push({
        code: "MALFORMED_METRIC",
        message: `expert_metric_block.metrics[${metricIndex}] is invalid and was ignored.`,
      });
      return accumulator;
    }

    if (!isNonEmptyString(metric.id) && !isNonEmptyString(metric.label) && !isNonEmptyString(metric.description)) {
      warnings.push({
        code: "MALFORMED_METRIC",
        message: `expert_metric_block.metrics[${metricIndex}] has no usable identifier.`,
      });
      return accumulator;
    }

    accumulator.push({
      id: isNonEmptyString(metric.id) ? metric.id : null,
      label: isNonEmptyString(metric.label) ? metric.label : null,
      value: isNonEmptyString(metric.value) ? metric.value : null,
      description: isNonEmptyString(metric.description) ? metric.description : null,
      details: isPlainObject(metric.details) ? { ...metric.details } : {},
    });
    return accumulator;
  }, []);

  if (validMetrics.length === 0) {
    return {
      ok: false,
      error: {
        code: "MALFORMED_SECTION_PAYLOAD",
        message: "metric_block.metrics must include at least one valid metric.",
      },
    };
  }

  return {
    ok: true,
    payload: {
      summary: isNonEmptyString(section.summary) ? section.summary : null,
      metrics: validMetrics,
    },
    warnings,
  };
};

const buildComparisonPayload = (section) => {
  const rows = safeArray(section.rows);
  if (rows.length === 0) {
    return {
      ok: false,
      error: {
        code: "MALFORMED_SECTION_PAYLOAD",
        message: "comparison_table.rows must be a non-empty array.",
      },
    };
  }

  const validRows = rows.filter((row) => isPlainObject(row) || Array.isArray(row));
  if (validRows.length === 0) {
    return {
      ok: false,
      error: {
        code: "MALFORMED_SECTION_PAYLOAD",
        message: "comparison_table.rows must include at least one valid row.",
      },
    };
  }

  return {
    ok: true,
    payload: {
      rows: validRows.map((row) => (isPlainObject(row) ? { ...row } : [...row])),
    },
    warnings: [],
  };
};

const buildRiskPayload = (section) => {
  const risks = safeArray(section.risks);
  if (risks.length === 0) {
    return {
      ok: false,
      error: {
        code: "MALFORMED_SECTION_PAYLOAD",
        message: "risk_register.risks must be a non-empty array.",
      },
    };
  }

  const warnings = [];
  const validRisks = risks.reduce((accumulator, risk, riskIndex) => {
    if (!isPlainObject(risk)) {
      warnings.push({
        code: "MALFORMED_RISK",
        message: `risk_register.risks[${riskIndex}] is invalid and was ignored.`,
      });
      return accumulator;
    }

    if (!isNonEmptyString(risk.id) && !isNonEmptyString(risk.name) && !isNonEmptyString(risk.description)) {
      warnings.push({
        code: "MALFORMED_RISK",
        message: `risk_register.risks[${riskIndex}] has no usable identifier.`,
      });
      return accumulator;
    }

    const severity = isNonEmptyString(risk.severity) ? risk.severity : "Unclassified Risk";
    if (!isNonEmptyString(risk.severity)) {
      warnings.push({
        code: "UNKNOWN_RISK_SEVERITY",
        message: `risk_register.risks[${riskIndex}] severity is unknown and was defaulted.`,
      });
    }

    accumulator.push({
      id: isNonEmptyString(risk.id) ? risk.id : null,
      name: isNonEmptyString(risk.name) ? risk.name : null,
      description: isNonEmptyString(risk.description) ? risk.description : null,
      mitigation: isNonEmptyString(risk.mitigation) ? risk.mitigation : null,
      severity,
    });
    return accumulator;
  }, []);

  if (validRisks.length === 0) {
    return {
      ok: false,
      error: {
        code: "MALFORMED_SECTION_PAYLOAD",
        message: "risk_register.risks must include at least one valid risk.",
      },
    };
  }

  return {
    ok: true,
    payload: {
      risks: validRisks,
    },
    warnings,
  };
};

const buildCommercialPayload = (section) => {
  const payload = {
    decision: isPlainObject(section.decision) ? { ...section.decision } : null,
    targetCustomers: safeArray(section.targetCustomers).filter(isNonEmptyString),
    firstReferenceProject: isNonEmptyString(section.firstReferenceProject) ? section.firstReferenceProject : null,
    doNotDo: safeArray(section.doNotDo).filter(isNonEmptyString),
  };

  const hasContent = (
    payload.decision
    || payload.targetCustomers.length > 0
    || payload.firstReferenceProject
    || payload.doNotDo.length > 0
  );

  if (!hasContent) {
    return {
      ok: false,
      error: {
        code: "MALFORMED_SECTION_PAYLOAD",
        message: "commercial_decision_card requires commercial recommendation content.",
      },
    };
  }

  return {
    ok: true,
    payload,
    warnings: [],
  };
};

const composeKnownPayload = (componentType, section) => {
  switch (componentType) {
    case "decision_card":
      return buildDecisionPayload(section);
    case "boundary_card":
      return buildBoundaryPayload(section);
    case "expert_metric_block":
      return buildMetricPayload(section);
    case "comparison_table":
      return buildComparisonPayload(section);
    case "risk_register":
      return buildRiskPayload(section);
    case "commercial_decision_card":
      return buildCommercialPayload(section);
    default:
      return {
        ok: false,
        error: {
          code: "UNSUPPORTED_COMPONENT_TYPE",
          message: "Section component type is unsupported.",
        },
      };
  }
};

export const validateSectionIdentifier = (sectionId) => (
  isNonEmptyString(sectionId) && SECTION_ID_PATTERN.test(sectionId)
);

export const createFallbackAnchor = (scenarioId, sectionId) => (
  `${safeScenarioId(scenarioId)}:${isNonEmptyString(sectionId) ? sectionId.trim() : "missing_section"}`
);

export const isSupportedComponentType = (componentType) => (
  SUPPORTED_COMPONENT_TYPES.has(normalizeComponentType(componentType))
);

export const composeSectionCard = (section, context = {}) => {
  const scenarioId = safeScenarioId(context.scenarioId);
  const sectionIndex = Number.isInteger(context.sectionIndex) ? context.sectionIndex : 0;

  if (!isPlainObject(section)) {
    return buildFallbackCard({
      scenarioId,
      sectionIndex,
      componentType: "decision_card",
      errors: [
        {
          code: "MISSING_SECTION_IDENTIFIER",
          message: "Section id is missing or invalid.",
        },
        {
          code: "MALFORMED_SECTION_PAYLOAD",
          message: "Section must be a plain object.",
        },
      ],
    });
  }

  const componentType = inferComponentType(section);
  const hasValidSectionId = validateSectionIdentifier(section.id);
  if (!hasValidSectionId) {
    return buildFallbackCard({
      scenarioId,
      sectionIndex,
      componentType: isSupportedComponentType(componentType) ? componentType : "decision_card",
      errors: [
        {
          code: "MISSING_SECTION_IDENTIFIER",
          message: "Section id is missing or invalid.",
        },
      ],
    });
  }

  if (!isSupportedComponentType(componentType)) {
    return buildUnsupportedCard({
      scenarioId,
      sectionId: section.id,
      sectionIndex,
      componentType,
      title: section.title,
    });
  }

  const payloadResult = composeKnownPayload(componentType, section);
  if (!payloadResult.ok) {
    return buildFallbackCard({
      scenarioId,
      sectionId: section.id,
      sectionIndex,
      componentType,
      title: safeTitle(section.title),
      errors: [payloadResult.error],
    });
  }

  return buildCardBase({
    componentId: section.id,
    componentType,
    scenarioId,
    fallbackAnchor: createFallbackAnchor(scenarioId, section.id),
    renderState: "ready",
    title: safeTitle(section.title),
    payload: payloadResult.payload,
    warnings: payloadResult.warnings,
    errors: [],
  });
};

export const composeEvidenceTraceCard = (preview, context = {}) => {
  const scenarioId = safeScenarioId(context.scenarioId ?? preview?.scenarioId);
  const sourceRefs = safeArray(preview?.sourceRefs);
  const claimRefs = safeArray(preview?.claimRefs);
  const warnings = [];
  const sourceIdSet = new Set(sourceRefs.map((sourceRef) => sourceRef?.id).filter(isNonEmptyString));

  const payload = {
    sourceRefs: sourceRefs
      .filter(isPlainObject)
      .map((sourceRef, index) => {
        if (typeof sourceRef.evidenceConfidenceScore !== "number") {
          warnings.push({
            code: "MISSING_EVIDENCE_CONFIDENCE_SCORE",
            message: `sourceRefs[${index}] is missing evidenceConfidenceScore.`,
          });
        }

        return {
          id: isNonEmptyString(sourceRef.id) ? sourceRef.id : null,
          title: isNonEmptyString(sourceRef.title) ? sourceRef.title : null,
          sourceType: isNonEmptyString(sourceRef.sourceType) ? sourceRef.sourceType : null,
          confidence: isNonEmptyString(sourceRef.confidence) ? sourceRef.confidence : null,
          evidenceConfidenceScore: typeof sourceRef.evidenceConfidenceScore === "number"
            ? sourceRef.evidenceConfidenceScore
            : null,
        };
      }),
    claimRefs: claimRefs
      .filter(isPlainObject)
      .map((claimRef, index) => {
        const linkedSourceRefs = safeArray(claimRef.sourceRefs).filter(isNonEmptyString);

        linkedSourceRefs.forEach((sourceRefId) => {
          if (!sourceIdSet.has(sourceRefId)) {
            warnings.push({
              code: "MISSING_EVIDENCE_SOURCE_REF",
              message: `claimRefs[${index}] references missing sourceRef id: ${sourceRefId}.`,
            });
          }
        });

        if (claimRef.validationRequired === true) {
          warnings.push({
            code: "VALIDATION_REQUIRED_CLAIM",
            message: `claimRefs[${index}] requires validation before production use.`,
          });
        }

        return {
          id: isNonEmptyString(claimRef.id) ? claimRef.id : null,
          claim: isNonEmptyString(claimRef.claim) ? claimRef.claim : null,
          claimType: isNonEmptyString(claimRef.claimType) ? claimRef.claimType : null,
          sourceRefs: linkedSourceRefs,
          confidence: isNonEmptyString(claimRef.confidence) ? claimRef.confidence : null,
          validationRequired: claimRef.validationRequired === true,
        };
      }),
  };

  if (payload.sourceRefs.length === 0 && payload.claimRefs.length === 0) {
    return buildCardBase({
      componentId: "evidence_trace",
      componentType: "evidence_trace",
      scenarioId,
      fallbackAnchor: createFallbackAnchor(scenarioId, "evidence_trace"),
      renderState: "fallback",
      title: "Evidence Trace",
      payload: {},
      warnings,
      errors: [
        {
          code: "MALFORMED_SECTION_PAYLOAD",
          message: "Evidence trace requires sourceRefs or claimRefs.",
        },
      ],
    });
  }

  return buildCardBase({
    componentId: "evidence_trace",
    componentType: "evidence_trace",
    scenarioId,
    fallbackAnchor: createFallbackAnchor(scenarioId, "evidence_trace"),
    renderState: "ready",
    title: "Evidence Trace",
    payload,
    warnings,
    errors: [],
  });
};

export const composeDiagnosticsCard = (preview, context = {}) => {
  const scenarioId = safeScenarioId(context.scenarioId ?? preview?.scenarioId);
  const diagnostics = isPlainObject(preview?.diagnostics) ? preview.diagnostics : {};
  const warnings = [];

  if (!isPlainObject(preview?.diagnostics)) {
    warnings.push({
      code: "DIAGNOSTICS_MISSING",
      message: "Preview diagnostics are missing; a minimal diagnostics card was created.",
    });
  }

  return buildCardBase({
    componentId: "diagnostics",
    componentType: "diagnostics_badges",
    scenarioId,
    fallbackAnchor: createFallbackAnchor(scenarioId, "diagnostics"),
    renderState: "ready",
    title: "Diagnostics",
    payload: {
      notProductionReady: preview?.notProductionReady === true,
      providerActive: diagnostics.providerActive === true,
      difyActive: diagnostics.difyActive === true,
      ragActive: diagnostics.ragActive === true,
      assumptions: safeArray(diagnostics.assumptions).filter(isNonEmptyString),
      missingEvidence: safeArray(diagnostics.missingEvidence).filter((item) => item != null),
      forbiddenClaims: safeArray(diagnostics.forbiddenClaims).filter((item) => item != null),
    },
    warnings,
    errors: [],
  });
};

export const composePreviewCards = (preview) => {
  const scenarioId = safeScenarioId(preview?.scenarioId);
  const sectionCards = safeArray(preview?.sections).map((section, sectionIndex) => (
    composeSectionCard(section, { scenarioId, sectionIndex })
  ));

  const cards = [...sectionCards];
  if (safeArray(preview?.sourceRefs).length > 0 || safeArray(preview?.claimRefs).length > 0) {
    cards.push(composeEvidenceTraceCard(preview, { scenarioId }));
  }
  cards.push(composeDiagnosticsCard(preview, { scenarioId }));
  return cards;
};

export const composePreview = (preview) => {
  const scenarioId = safeScenarioId(preview?.scenarioId);
  const title = safeTitle(preview?.title, "Preview blocked");
  const validationResult = validatePreviewFixture(preview);

  if (!validationResult.ok) {
    return {
      scenarioId,
      title,
      renderState: "blocked",
      notProductionReady: preview?.notProductionReady === true,
      cards: [],
      warnings: [],
      errors: validationResult.errors.map((error) => ({
        code: "PREVIEW_SCHEMA_GUARD_FAILED",
        message: error.message || error.code || "Preview schema guard failed.",
        path: error.path || "preview",
      })),
      diagnosticsSummary: {
        notProductionReady: preview?.notProductionReady === true,
      },
    };
  }

  const cards = composePreviewCards(preview);
  return {
    scenarioId,
    title,
    renderState: "ready",
    notProductionReady: preview?.notProductionReady === true,
    cards,
    warnings: cards.flatMap((card) => safeArray(card.warnings).map((warning) => ({
      ...warning,
      componentId: card.componentId,
    }))),
    errors: cards.flatMap((card) => safeArray(card.errors).map((error) => ({
      ...error,
      componentId: card.componentId,
    }))),
  };
};
