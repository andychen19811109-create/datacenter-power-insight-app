const PREVIEW_ROOT_FIELDS = [
  "scenarioId",
  "title",
  "userQuestion",
  "previewType",
  "status",
  "safeForUserDisplay",
  "notProductionReady",
  "sourceRefs",
  "claimRefs",
  "diagnostics",
  "sections",
];

const PREVIEW_ROOT_FIELD_SET = new Set(PREVIEW_ROOT_FIELDS);

const FORBIDDEN_ROOT_FIELDS = [
  "controlStateMachine",
  "physicalFormBoundary",
  "interfaceBoundary",
  "transportEnvelope",
  "timeToRevenue",
  "fatSatBoundary",
  "complianceMatrix",
  "localCodeCompliance",
  "integratedWarrantyBoundary",
  "legacyArchitectureMatrix",
  "commercialMaturity",
  "vendorEntryLayer",
  "vendorCategory",
  "architectureAlert",
  "baselineReference",
  "engineeringCalculation",
  "deliveryModel",
  "assumptionBaseline",
  "serviceability",
  "dewPoint",
  "flowRate",
  "pressureDrop",
  "generatorCoordination",
  "batteryMicrocycling",
  "wpc",
];

const ALLOWED_CLAIM_TYPES = [
  "source_backed",
  "source_backed_inference",
  "vendor_claim_with_validation_required",
  "expert_recommendation",
  "expert_recommendation_assumption",
  "engineering_calculation_with_assumption",
  "missing_evidence",
  "forbidden_claim",
];

const ALLOWED_CLAIM_TYPE_SET = new Set(ALLOWED_CLAIM_TYPES);
const FORBIDDEN_ROOT_FIELD_SET = new Set(FORBIDDEN_ROOT_FIELDS);
const NORMALIZE_CLAIM_TEXT_PATTERN = /[\s\u3000`~!@#$%^&*()_\-+=[\]{};:'"\\|,.<>/?，。！？；：、“”‘’（）【】《》、·—…￥]+/g;

const FORBIDDEN_CLAIM_TERMS = [
  "100%解决",
  "绝对安全",
  "完全消除",
  "彻底避免",
  "零风险",
  "永不故障",
  "无需验证",
  "一定节省",
  "必然替代",
  "已经成熟通用",
  "业内首创",
  "全球领先",
  "革命性",
  "颠覆性",
  "唯一方案",
  "最优方案",
  "终极方案",
  "全场景适用",
  "即插即用无需现场工程",
  "默认 Ask 质量已提升",
  "Preview 已 production-ready",
  "Provider 已接入",
  "Dify 已接入",
  "DeepSeek 已接入",
  "RAG 已接入",
  "800VDC 已经是成熟通用架构",
  "48V/54V 已经过时",
  "Power Block 一定节省 40% 时间",
  "厂商 reference design 等于客户量产部署",
  "100% safe",
  "zero risk",
  "fully eliminates",
  "guaranteed",
  "always saves",
  "production-ready",
  "provider is active",
  "Dify is active",
  "RAG is active",
  "800VDC is universally mature",
  "48V/54V is obsolete",
  "reference design equals production deployment",
];

const buildResult = (errors = []) => ({
  ok: errors.length === 0,
  errors,
});

const buildError = (code, path, message, extra = {}) => ({
  code,
  path,
  message,
  ...extra,
});

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const hasNonEmptyArray = (value) => Array.isArray(value) && value.length > 0;

export const normalizeClaimText = (text) => (
  typeof text === "string"
    ? text
      .toLowerCase()
      .replace(NORMALIZE_CLAIM_TEXT_PATTERN, "")
      .trim()
    : ""
);

export const normalizeForbiddenTerm = (term) => normalizeClaimText(term);

const FORBIDDEN_CLAIM_PATTERNS = FORBIDDEN_CLAIM_TERMS.map((term) => ({
  term,
  normalizedTerm: normalizeForbiddenTerm(term),
}));

const collectStringTargets = (value, path) => {
  if (typeof value === "string" && value.trim()) {
    return [{ path, value }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectStringTargets(item, `${path}[${index}]`));
  }

  return [];
};

const collectSectionTargets = (sections = []) => {
  if (!Array.isArray(sections)) {
    return [];
  }

  return sections.flatMap((section, sectionIndex) => {
    if (!isPlainObject(section)) {
      return [];
    }

    const targets = [
      ...collectStringTargets(section.title, `sections[${sectionIndex}].title`),
      ...collectStringTargets(section.summary, `sections[${sectionIndex}].summary`),
      ...collectStringTargets(section.body, `sections[${sectionIndex}].body`),
    ];

    const metrics = Array.isArray(section.metrics) ? section.metrics : [];
    metrics.forEach((metric, metricIndex) => {
      if (!isPlainObject(metric)) {
        return;
      }

      targets.push(
        ...collectStringTargets(metric.description, `sections[${sectionIndex}].metrics[${metricIndex}].description`),
      );
    });

    const items = Array.isArray(section.items) ? section.items : [];
    items.forEach((item, itemIndex) => {
      if (!isPlainObject(item)) {
        return;
      }

      targets.push(
        ...collectStringTargets(item.value, `sections[${sectionIndex}].items[${itemIndex}].value`),
      );
    });

    const risks = Array.isArray(section.risks) ? section.risks : [];
    risks.forEach((risk, riskIndex) => {
      if (!isPlainObject(risk)) {
        return;
      }

      targets.push(
        ...collectStringTargets(risk.description, `sections[${sectionIndex}].risks[${riskIndex}].description`),
        ...collectStringTargets(risk.mitigation, `sections[${sectionIndex}].risks[${riskIndex}].mitigation`),
      );
    });

    return targets;
  });
};

const validateSectionPayloads = (sections) => {
  if (!Array.isArray(sections)) {
    return [
      buildError("PREVIEW_SECTIONS_INVALID", "sections", "sections must be an array"),
    ];
  }

  if (sections.length === 0) {
    return [
      buildError("PREVIEW_SECTIONS_EMPTY", "sections", "sections must contain at least one section"),
    ];
  }

  const errors = [];

  sections.forEach((section, sectionIndex) => {
    const path = `sections[${sectionIndex}]`;

    if (!isPlainObject(section)) {
      errors.push(buildError("PREVIEW_SECTION_INVALID", path, "section must be a plain object"));
      return;
    }

    if ("metrics" in section) {
      if (!Array.isArray(section.metrics)) {
        errors.push(buildError("PREVIEW_SECTION_METRICS_INVALID", `${path}.metrics`, "metrics must be an array"));
      } else if (section.metrics.length === 0) {
        errors.push(buildError("PREVIEW_SECTION_METRICS_EMPTY", `${path}.metrics`, "metrics must contain at least one metric"));
      } else {
        section.metrics.forEach((metric, metricIndex) => {
          if (!isPlainObject(metric)) {
            errors.push(buildError(
              "PREVIEW_SECTION_METRIC_INVALID",
              `${path}.metrics[${metricIndex}]`,
              "metric must be a plain object",
            ));
          }
        });
      }
    }

    if ("items" in section) {
      if (!Array.isArray(section.items)) {
        errors.push(buildError("PREVIEW_SECTION_ITEMS_INVALID", `${path}.items`, "items must be an array"));
      } else if (section.items.length === 0) {
        errors.push(buildError("PREVIEW_SECTION_ITEMS_EMPTY", `${path}.items`, "items must contain at least one item"));
      } else {
        section.items.forEach((item, itemIndex) => {
          if (!isPlainObject(item)) {
            errors.push(buildError(
              "PREVIEW_SECTION_ITEM_INVALID",
              `${path}.items[${itemIndex}]`,
              "item must be a plain object",
            ));
          }
        });
      }
    }

    if ("risks" in section) {
      if (!Array.isArray(section.risks)) {
        errors.push(buildError("PREVIEW_SECTION_RISKS_INVALID", `${path}.risks`, "risks must be an array"));
      } else if (section.risks.length === 0) {
        errors.push(buildError("PREVIEW_SECTION_RISKS_EMPTY", `${path}.risks`, "risks must contain at least one risk"));
      } else {
        section.risks.forEach((risk, riskIndex) => {
          if (!isPlainObject(risk)) {
            errors.push(buildError(
              "PREVIEW_SECTION_RISK_INVALID",
              `${path}.risks[${riskIndex}]`,
              "risk must be a plain object",
            ));
          }
        });
      }
    }
  });

  return errors;
};

export const validatePreviewRootSchema = (preview) => {
  if (!isPlainObject(preview)) {
    return buildResult([
      buildError("PREVIEW_MALFORMED", "preview", "preview must be a plain object"),
    ]);
  }

  const errors = [];
  const keys = Object.keys(preview);

  PREVIEW_ROOT_FIELDS.forEach((field) => {
    if (!(field in preview)) {
      errors.push(buildError("PREVIEW_ROOT_FIELD_MISSING", field, `${field} is required at preview root`));
    }
  });

  keys.forEach((field) => {
    if (!PREVIEW_ROOT_FIELD_SET.has(field)) {
      const code = FORBIDDEN_ROOT_FIELD_SET.has(field)
        ? "PREVIEW_SCENARIO_FIELD_AT_ROOT"
        : "PREVIEW_ROOT_FIELD_FORBIDDEN";
      errors.push(buildError(code, field, `${field} is not allowed at preview root`));
    }
  });

  return buildResult(errors);
};

export const validateSourceRefs = (sourceRefs) => {
  if (!Array.isArray(sourceRefs)) {
    return buildResult([
      buildError("PREVIEW_SOURCE_REFS_INVALID", "sourceRefs", "sourceRefs must be an array"),
    ]);
  }

  const errors = [];
  if (sourceRefs.length === 0) {
    errors.push(buildError("PREVIEW_SOURCE_REFS_EMPTY", "sourceRefs", "sourceRefs must contain at least one sourceRef"));
  }
  const seenIds = new Set();

  sourceRefs.forEach((sourceRef, index) => {
    const path = `sourceRefs[${index}]`;

    if (!isPlainObject(sourceRef)) {
      errors.push(buildError("PREVIEW_SOURCE_REF_INVALID", path, "sourceRef must be a plain object"));
      return;
    }

    ["id", "title", "sourceType", "confidence"].forEach((field) => {
      if (!isNonEmptyString(sourceRef[field])) {
        errors.push(buildError("PREVIEW_SOURCE_REF_FIELD_REQUIRED", `${path}.${field}`, `${field} is required`));
      }
    });

    if (!("evidenceConfidenceScore" in sourceRef)) {
      errors.push(buildError(
        "PREVIEW_EVIDENCE_CONFIDENCE_REQUIRED",
        `${path}.evidenceConfidenceScore`,
        "evidenceConfidenceScore is required",
      ));
    } else if (typeof sourceRef.evidenceConfidenceScore !== "number" || Number.isNaN(sourceRef.evidenceConfidenceScore)) {
      errors.push(buildError(
        "PREVIEW_EVIDENCE_CONFIDENCE_TYPE",
        `${path}.evidenceConfidenceScore`,
        "evidenceConfidenceScore must be a number",
      ));
    } else if (sourceRef.evidenceConfidenceScore < 0 || sourceRef.evidenceConfidenceScore > 1) {
      errors.push(buildError(
        "PREVIEW_EVIDENCE_CONFIDENCE_RANGE",
        `${path}.evidenceConfidenceScore`,
        "evidenceConfidenceScore must be between 0 and 1",
        { value: sourceRef.evidenceConfidenceScore },
      ));
    }

    if (isNonEmptyString(sourceRef.id)) {
      if (seenIds.has(sourceRef.id)) {
        errors.push(buildError("PREVIEW_SOURCE_REF_DUPLICATE_ID", `${path}.id`, `duplicate sourceRef id: ${sourceRef.id}`));
      }
      seenIds.add(sourceRef.id);
    }
  });

  return buildResult(errors);
};

export const validateClaimRefs = (claimRefs, sourceRefs = []) => {
  if (!Array.isArray(claimRefs)) {
    return buildResult([
      buildError("PREVIEW_CLAIM_REFS_INVALID", "claimRefs", "claimRefs must be an array"),
    ]);
  }

  const sourceIdSet = new Set(
    Array.isArray(sourceRefs)
      ? sourceRefs.map((sourceRef) => sourceRef?.id).filter(isNonEmptyString)
      : [],
  );
  const errors = [];
  if (claimRefs.length === 0) {
    errors.push(buildError("PREVIEW_CLAIM_REFS_EMPTY", "claimRefs", "claimRefs must contain at least one claimRef"));
  }
  const seenIds = new Set();

  claimRefs.forEach((claimRef, index) => {
    const path = `claimRefs[${index}]`;

    if (!isPlainObject(claimRef)) {
      errors.push(buildError("PREVIEW_CLAIM_REF_INVALID", path, "claimRef must be a plain object"));
      return;
    }

    ["id", "claim", "confidence"].forEach((field) => {
      if (!isNonEmptyString(claimRef[field])) {
        errors.push(buildError("PREVIEW_CLAIM_REF_FIELD_REQUIRED", `${path}.${field}`, `${field} is required`));
      }
    });

    if (!("claimType" in claimRef)) {
      errors.push(buildError("PREVIEW_CLAIM_TYPE_REQUIRED", `${path}.claimType`, "claimType is required"));
    } else if (!ALLOWED_CLAIM_TYPE_SET.has(claimRef.claimType)) {
      errors.push(buildError("PREVIEW_CLAIM_TYPE_UNSUPPORTED", `${path}.claimType`, `unsupported claimType: ${claimRef.claimType}`));
    }

    if (!Array.isArray(claimRef.sourceRefs)) {
      errors.push(buildError("PREVIEW_CLAIM_SOURCE_REFS_INVALID", `${path}.sourceRefs`, "sourceRefs must be an array"));
    } else {
      claimRef.sourceRefs.forEach((sourceId, sourceIndex) => {
        if (!isNonEmptyString(sourceId)) {
          errors.push(buildError(
            "PREVIEW_CLAIM_SOURCE_REF_ID_INVALID",
            `${path}.sourceRefs[${sourceIndex}]`,
            "sourceRef id must be a non-empty string",
          ));
          return;
        }

        if (!sourceIdSet.has(sourceId)) {
          errors.push(buildError(
            "PREVIEW_CLAIM_SOURCE_REF_MISSING",
            `${path}.sourceRefs[${sourceIndex}]`,
            `claimRef links missing sourceRef id: ${sourceId}`,
          ));
        }
      });
    }

    if (isNonEmptyString(claimRef.id)) {
      if (seenIds.has(claimRef.id)) {
        errors.push(buildError("PREVIEW_CLAIM_REF_DUPLICATE_ID", `${path}.id`, `duplicate claimRef id: ${claimRef.id}`));
      }
      seenIds.add(claimRef.id);
    }

    if (
      claimRef.claimType === "vendor_claim_with_validation_required"
      && claimRef.validationRequired !== true
    ) {
      errors.push(buildError(
        "PREVIEW_VENDOR_CLAIM_VALIDATION_REQUIRED",
        `${path}.validationRequired`,
        "vendor_claim_with_validation_required must include validationRequired: true",
      ));
    }

    if (claimRef.claimType === "forbidden_claim") {
      errors.push(buildError(
        "PREVIEW_FORBIDDEN_CLAIM_TYPE",
        `${path}.claimType`,
        "forbidden_claim is not allowed to pass fixture validation",
      ));
    }
  });

  return buildResult(errors);
};

export const detectForbiddenClaims = (preview) => {
  if (!isPlainObject(preview)) {
    return buildResult([
      buildError("PREVIEW_MALFORMED", "preview", "preview must be a plain object"),
    ]);
  }

  const targets = [
    ...collectStringTargets(preview.title, "title"),
    ...collectStringTargets(preview.summary, "summary"),
    ...collectSectionTargets(preview.sections),
    ...(Array.isArray(preview.claimRefs)
      ? preview.claimRefs.flatMap((claimRef, index) => collectStringTargets(claimRef?.claim, `claimRefs[${index}].claim`))
      : []),
    ...collectStringTargets(preview.diagnostics?.assumptions, "diagnostics.assumptions"),
    ...collectStringTargets(preview.diagnostics?.forbiddenClaims, "diagnostics.forbiddenClaims"),
  ];

  const errors = [];

  targets.forEach(({ path, value }) => {
    const normalizedValue = normalizeClaimText(value);

    if (!normalizedValue) {
      return;
    }

    FORBIDDEN_CLAIM_PATTERNS.forEach(({ term, normalizedTerm }) => {
      if (normalizedTerm && normalizedValue.includes(normalizedTerm)) {
        errors.push({
          code: "FORBIDDEN_CLAIM_DETECTED",
          path,
          value,
          matchedTerm: term,
        });
      }
    });
  });

  return buildResult(errors);
};

export const validatePreviewFixture = (preview) => {
  if (!isPlainObject(preview)) {
    return buildResult([
      buildError("PREVIEW_MALFORMED", "preview", "preview must be a plain object"),
    ]);
  }

  const rootValidation = validatePreviewRootSchema(preview);
  const sourceValidation = validateSourceRefs(preview.sourceRefs);
  const claimValidation = validateClaimRefs(preview.claimRefs, preview.sourceRefs);
  const sectionValidationErrors = validateSectionPayloads(preview.sections);
  const forbiddenClaimValidation = detectForbiddenClaims(preview);

  return buildResult([
    ...rootValidation.errors,
    ...sourceValidation.errors,
    ...claimValidation.errors,
    ...sectionValidationErrors,
    ...forbiddenClaimValidation.errors,
  ]);
};

export const PREVIEW_ROOT_WHITELIST = Object.freeze([...PREVIEW_ROOT_FIELDS]);
export const PREVIEW_FORBIDDEN_ROOT_FIELDS = Object.freeze([...FORBIDDEN_ROOT_FIELDS]);
export const PREVIEW_ALLOWED_CLAIM_TYPES = Object.freeze([...ALLOWED_CLAIM_TYPES]);
