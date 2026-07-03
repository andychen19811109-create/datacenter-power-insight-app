import {
  FORBIDDEN_UI_CLAIMS,
  NORMALIZED_PROVIDER_STATUSES,
  PRICING_CATEGORIES,
} from "./providerContract.js";

const {
  SCHEMA_INVALID,
  PROVIDER_ERROR,
  PROVIDER_TIMEOUT,
  BLOCKED,
  EVIDENCE_REQUIRED,
  SOURCE_STALE,
  UNSUPPORTED,
  WARNING,
  READY,
} = NORMALIZED_PROVIDER_STATUSES;

const ALLOWED_MODES = new Set(["preview", "test", "internal_review"]);
const ALLOWED_VIEWERS = new Set(["user", "reviewer", "internal"]);
const LIMITATION_ONLY_STATUSES = new Set([
  SCHEMA_INVALID,
  PROVIDER_ERROR,
  PROVIDER_TIMEOUT,
  BLOCKED,
  EVIDENCE_REQUIRED,
  UNSUPPORTED,
]);
const LIVE_WORD_PATTERN = /\b(live quote|current price|real-time price|latest quote|today'?s price|guaranteed price|available now|current quote|latest price|real-time quote)\b/gi;
const CJK_LIVE_WORD_PATTERN = /(当前价格|实时报价|今日报价|当前报价|最新价格|今日价格|可成交价)/g;
const SENSITIVE_KEY_PATTERN = /(rawproviderpayload|rawworkflowoutput|workflowid|difyworkflowid|node(name)?|appid|userid|token|promptinternals|env|stack|secret|api[_-]?key|authorization|bearer)/i;
const PRICING_REFERENCE_LABELS = Object.freeze(["reference", "trend", "historical", "indicative"]);

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const safeArray = (value) => (Array.isArray(value) ? value : []);
const dedupeStrings = (values = []) => [...new Set(values.filter((value) => typeof value === "string" && value.trim()))];
const clamp = (value, min, max, fallback) => {
  const nextValue = Number.isFinite(Number(value)) ? Number(value) : fallback;
  return Math.min(max, Math.max(min, Math.trunc(nextValue)));
};

const normalizeScalar = (value) => (value == null ? "" : String(value).trim());

const containsForbiddenUiClaim = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const normalizedValue = value.toLowerCase();
  return FORBIDDEN_UI_CLAIMS.some((item) => normalizedValue.includes(String(item).toLowerCase()));
};

const stripLiveWords = (value) => normalizeScalar(value)
  .replace(LIVE_WORD_PATTERN, "reference")
  .replace(CJK_LIVE_WORD_PATTERN, "参考信息")
  .trim();

const sanitizeString = (value, options = {}) => {
  const normalizedValue = normalizeScalar(value);
  if (!normalizedValue || containsForbiddenUiClaim(normalizedValue)) {
    return "";
  }

  if (options.allowLiveWords === true) {
    return normalizedValue;
  }

  return stripLiveWords(normalizedValue);
};

const sanitizeValue = (value, options = {}) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item, options))
      .filter((item) => item != null && item !== "" && !(isPlainObject(item) && Object.keys(item).length === 0));
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        return accumulator;
      }

      const sanitized = sanitizeValue(nestedValue, options);
      if (
        sanitized == null
        || sanitized === ""
        || (Array.isArray(sanitized) && sanitized.length === 0)
        || (isPlainObject(sanitized) && Object.keys(sanitized).length === 0)
      ) {
        return accumulator;
      }

      accumulator[key] = sanitized;
      return accumulator;
    }, {});
  }

  if (typeof value === "string") {
    return sanitizeString(value, options);
  }

  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return null;
};

const isReadyForLiveQuote = (validationResult = {}) => (
  validationResult.status === READY
  && safeArray(validationResult.renderableSections).length > 0
);

const getClaimSourceIds = (claimRef = {}, safeResponse = {}) => {
  const sourceIds = new Set(
    safeArray(safeResponse.sourceRefs)
      .map((sourceRef) => normalizeScalar(sourceRef.id))
      .filter(Boolean),
  );

  return safeArray(claimRef.linkedSourceRefIds)
    .map((sourceId) => normalizeScalar(sourceId))
    .filter((sourceId) => sourceIds.has(sourceId));
};

const shouldSuppressClaim = (claimRef = {}, safeResponse = {}) => (
  claimRef.sourceRequired === true && getClaimSourceIds(claimRef, safeResponse).length === 0
);

export const deriveProviderDisplayMode = (status) => {
  if (status === SOURCE_STALE) {
    return "reference_only";
  }

  if (status === WARNING) {
    return "warning_report";
  }

  if (status === READY) {
    return "ready_report";
  }

  return "limitation_only";
};

export const buildProviderRendererOptions = (options = {}) => {
  const mode = ALLOWED_MODES.has(options.mode) ? options.mode : "preview";
  const viewer = ALLOWED_VIEWERS.has(options.viewer) ? options.viewer : "user";

  return {
    mode,
    viewer,
    locale: normalizeScalar(options.locale) || "zh-CN",
    sectionPolicy: {
      allowClaims: options.sectionPolicy?.allowClaims !== false,
      allowSources: options.sectionPolicy?.allowSources !== false,
      allowFreshness: options.sectionPolicy?.allowFreshness !== false,
    },
    pricingLabelPolicy: {
      referenceTrendLabels: Array.isArray(options.pricingLabelPolicy?.referenceTrendLabels)
        && options.pricingLabelPolicy.referenceTrendLabels.length > 0
        ? options.pricingLabelPolicy.referenceTrendLabels.map((item) => sanitizeString(item, { allowLiveWords: true })).filter(Boolean)
        : [...PRICING_REFERENCE_LABELS],
      forbidLiveWordsUnlessReady: options.pricingLabelPolicy?.forbidLiveWordsUnlessReady !== false,
    },
    statusCopyPolicy: isPlainObject(options.statusCopyPolicy) ? { ...options.statusCopyPolicy } : {},
    includeDiagnostics: options.includeDiagnostics === true,
    maxSections: clamp(options.maxSections, 1, 12, 6),
    maxWarnings: clamp(options.maxWarnings, 0, 20, 5),
    safeCopyOnly: options.safeCopyOnly !== false,
  };
};

export const buildStatusCopy = (validationResult = {}, options = {}) => {
  const status = normalizeScalar(validationResult.status) || SCHEMA_INVALID;

  const copyByStatus = {
    [SCHEMA_INVALID]: {
      title: "新管线预览暂不可展示",
      summary: null,
      limitation: "新管线预览结果未达到安全渲染条件。",
    },
    [PROVIDER_ERROR]: {
      title: "新管线预览暂不可展示",
      summary: null,
      limitation: "本次预览未形成可安全展示的结构化结果。",
    },
    [PROVIDER_TIMEOUT]: {
      title: "新管线预览暂不可展示",
      summary: null,
      limitation: "本次预览未在安全窗口内形成可展示结果。",
    },
    [BLOCKED]: {
      title: "部分内容已阻止展示",
      summary: null,
      limitation: "部分内容未满足安全展示条件，已阻止展示。",
    },
    [EVIDENCE_REQUIRED]: {
      title: "部分内容缺少可验证来源",
      summary: null,
      limitation: "部分内容因缺少可验证来源，已阻止展示。",
    },
    [SOURCE_STALE]: {
      title: "仅可展示历史参考信息",
      summary: "以下内容仅可作为 reference / historical / trend 参考。",
      limitation: "部分来源可能过期，仅可作为历史参考。",
    },
    [UNSUPPORTED]: {
      title: "当前预览暂不支持该内容类型",
      summary: null,
      limitation: "当前内容类型未进入安全渲染范围。",
    },
    [WARNING]: {
      title: "新管线预览包含提示信息",
      summary: "以下内容为受限预览结果，不能视为完整生产报告。",
      limitation: "部分内容带有限制条件，请谨慎解读。",
    },
    [READY]: {
      title: "新管线预览结果",
      summary: sanitizeString(validationResult.safeResponse?.summary, { allowLiveWords: isReadyForLiveQuote(validationResult) }),
      limitation: "",
    },
  };

  const copy = copyByStatus[status] || copyByStatus[SCHEMA_INVALID];
  const overrideCopy = isPlainObject(options.statusCopyPolicy?.[status]) ? options.statusCopyPolicy[status] : {};

  return {
    title: sanitizeString(overrideCopy.title || copy.title, { allowLiveWords: false }) || copy.title,
    summary: sanitizeString(overrideCopy.summary || copy.summary, {
      allowLiveWords: status === READY && isReadyForLiveQuote(validationResult),
    }) || null,
    limitation: sanitizeString(overrideCopy.limitation || copy.limitation, { allowLiveWords: false }),
  };
};

const buildGenericWarningCopy = (validationResult = {}, options = {}) => {
  if (options.safeCopyOnly === false) {
    return dedupeStrings(safeArray(validationResult.warnings).map((warning) => sanitizeString(warning, { allowLiveWords: false })));
  }

  const genericWarnings = [];
  if (validationResult.status === WARNING) {
    genericWarnings.push("当前预览包含需要留意的限制提示。");
  }
  if (validationResult.status === SOURCE_STALE) {
    genericWarnings.push("当前展示内容仅可作为历史参考。");
  }

  return dedupeStrings(genericWarnings);
};

export const buildEvidenceNotices = (validationResult = {}) => safeArray(validationResult.missingEvidence)
  .map((item) => {
    const claimId = sanitizeString(item.claimId, { allowLiveWords: false });
    const claimType = sanitizeString(item.claimType, { allowLiveWords: false });
    const linkedSourceRefIds = safeArray(item.linkedSourceRefIds)
      .map((sourceId) => sanitizeString(sourceId, { allowLiveWords: false }))
      .filter(Boolean);

    return {
      claimId,
      claimType,
      linkedSourceRefIds,
      message: "该内容缺少可验证来源，暂不展示。",
    };
  })
  .filter((item) => item.claimId || item.claimType || item.linkedSourceRefIds.length > 0);

export const buildStalenessNotices = (validationResult = {}, options = {}) => safeArray(validationResult.staleSources)
  .map((item) => {
    const claimId = sanitizeString(item.claimId, { allowLiveWords: false });
    const sourceIds = safeArray(item.sourceIds)
      .map((sourceId) => sanitizeString(sourceId, { allowLiveWords: false }))
      .filter(Boolean);
    const pricingCategory = normalizeScalar(item.pricingCategory);
    const label = pricingCategory === PRICING_CATEGORIES.REFERENCE_TREND
      ? options.pricingLabelPolicy?.referenceTrendLabels?.slice(0, 3).join(" / ")
      : "historical reference";

    return {
      claimId,
      sourceIds,
      pricingCategory,
      message: `该内容仅可作为 ${label || "historical reference"} 使用。`,
    };
  })
  .filter((item) => item.claimId || item.sourceIds.length > 0 || item.message);

export const buildBlockedClaimNotices = (validationResult = {}) => safeArray(validationResult.blockedClaims)
  .map((item) => ({
    claimId: sanitizeString(item.claimId, { allowLiveWords: false }),
    claimType: sanitizeString(item.claimType, { allowLiveWords: false }),
    pricingCategory: sanitizeString(item.pricingCategory, { allowLiveWords: false }),
    status: sanitizeString(item.status, { allowLiveWords: false }),
    message: "该条内容未满足安全展示条件。",
  }))
  .filter((item) => item.claimId || item.claimType || item.pricingCategory || item.status);

export const buildSourceBadges = (validationResult = {}, options = {}) => {
  if (options.sectionPolicy?.allowSources === false) {
    return [];
  }

  return safeArray(validationResult.safeResponse?.sourceRefs)
    .map((sourceRef) => {
      const title = sanitizeString(sourceRef.title, { allowLiveWords: false });
      const publisher = sanitizeString(sourceRef.publisher, { allowLiveWords: false });
      const url = sanitizeString(sourceRef.locator, { allowLiveWords: false });
      const sourceId = sanitizeString(sourceRef.id, { allowLiveWords: false });
      const sourceType = sanitizeString(sourceRef.sourceType, { allowLiveWords: false });
      const reliabilityTier = sanitizeString(sourceRef.reliabilityTier, { allowLiveWords: false });

      return {
        sourceId,
        title,
        publisher,
        ...(url ? { url } : {}),
        ...(sourceType ? { sourceType } : {}),
        ...(reliabilityTier ? { reliabilityTier } : {}),
      };
    })
    .filter((item) => item.sourceId || item.title || item.publisher);
};

const buildResponseSection = (safeResponse = {}, validationResult = {}, options = {}) => {
  const allowLiveWords = validationResult.status === READY && isReadyForLiveQuote(validationResult);
  const panels = safeArray(safeResponse.sections)
    .map((item, index) => {
      const sanitized = sanitizeValue(item, { allowLiveWords });
      const title = sanitizeString(item?.title, { allowLiveWords });
      const body = sanitizeString(item?.body, { allowLiveWords });

      if (!title && !body && !isPlainObject(sanitized)) {
        return null;
      }

      return {
        id: sanitizeString(item?.id, { allowLiveWords: false }) || `section_${index + 1}`,
        title: title || null,
        body: body || null,
        content: isPlainObject(sanitized) ? sanitized : undefined,
      };
    })
    .filter(Boolean);

  const summary = sanitizeString(safeResponse.summary, { allowLiveWords });

  if (!summary && panels.length === 0) {
    return null;
  }

  return {
    id: validationResult.status === SOURCE_STALE ? "reference" : "response",
    kind: validationResult.status === SOURCE_STALE ? "reference" : "response",
    title: validationResult.status === SOURCE_STALE ? "历史参考内容" : "预览内容",
    summary: validationResult.status === SOURCE_STALE
      ? sanitizeString(`Historical reference: ${summary}`, { allowLiveWords: false }) || null
      : summary || null,
    panels,
  };
};

const buildClaimsSection = (safeResponse = {}, validationResult = {}, options = {}) => {
  if (options.sectionPolicy?.allowClaims === false) {
    return null;
  }

  const allowLiveWords = validationResult.status === READY && isReadyForLiveQuote(validationResult);
  const items = safeArray(safeResponse.claimRefs)
    .filter((claimRef) => !shouldSuppressClaim(claimRef, safeResponse))
    .map((claimRef) => {
      const sourceIds = getClaimSourceIds(claimRef, safeResponse);
      const claim = sanitizeString(claimRef.claim, {
        allowLiveWords,
      });
      const pricingCategory = normalizeScalar(claimRef.pricingCategory);

      if (
        validationResult.status !== READY
        && pricingCategory === PRICING_CATEGORIES.LIVE_EXACT_QUOTE
      ) {
        return null;
      }

      const item = {
        claimId: sanitizeString(claimRef.id, { allowLiveWords: false }),
        claimType: sanitizeString(claimRef.claimType, { allowLiveWords: false }),
        claim,
      };

      const confidence = sanitizeString(claimRef.confidence, { allowLiveWords: false });
      if (confidence) {
        item.confidence = confidence;
      }
      if (pricingCategory) {
        item.pricingCategory = pricingCategory;
      }
      if (sourceIds.length > 0) {
        item.sourceIds = sourceIds;
      }

      return item;
    })
    .filter(Boolean);

  if (items.length === 0) {
    return null;
  }

  return {
    id: "claims",
    kind: validationResult.status === SOURCE_STALE ? "reference_claims" : "claims",
    title: validationResult.status === SOURCE_STALE ? "历史参考要点" : "已通过验证的要点",
    items,
  };
};

const buildSourcesSection = (safeResponse = {}, validationResult = {}, options = {}) => {
  const items = buildSourceBadges({ safeResponse }, options);
  if (items.length === 0 || options.sectionPolicy?.allowSources === false) {
    return null;
  }

  return {
    id: "sources",
    kind: "sources",
    title: "来源标记",
    items,
  };
};

const buildFreshnessSection = (safeResponse = {}, validationResult = {}, options = {}) => {
  if (options.sectionPolicy?.allowFreshness === false || !isPlainObject(safeResponse.freshness)) {
    return null;
  }

  const freshness = sanitizeValue(safeResponse.freshness, {
    allowLiveWords: validationResult.status === READY && isReadyForLiveQuote(validationResult),
  });
  if (!isPlainObject(freshness) || Object.keys(freshness).length === 0) {
    return null;
  }

  return {
    id: "freshness",
    kind: "freshness",
    title: validationResult.status === SOURCE_STALE ? "历史时效信息" : "时效信息",
    freshness,
  };
};

export const sanitizeRenderableSections = (validationResult = {}, options = {}) => {
  const status = normalizeScalar(validationResult.status) || SCHEMA_INVALID;
  const safeResponse = isPlainObject(validationResult.safeResponse) ? validationResult.safeResponse : {};

  if (LIMITATION_ONLY_STATUSES.has(status)) {
    return [];
  }

  const renderableSectionNames = new Set(safeArray(validationResult.renderableSections));
  const sections = [];

  if (renderableSectionNames.has("response") || renderableSectionNames.has("reference")) {
    const responseSection = buildResponseSection(safeResponse, validationResult, options);
    if (responseSection) {
      sections.push(responseSection);
    }
  }

  if (renderableSectionNames.has("claims")) {
    const claimsSection = buildClaimsSection(safeResponse, validationResult, options);
    if (claimsSection) {
      sections.push(claimsSection);
    }
  }

  if (renderableSectionNames.has("sources")) {
    const sourcesSection = buildSourcesSection(safeResponse, validationResult, options);
    if (sourcesSection) {
      sections.push(sourcesSection);
    }
  }

  if (renderableSectionNames.has("freshness")) {
    const freshnessSection = buildFreshnessSection(safeResponse, validationResult, options);
    if (freshnessSection) {
      sections.push(freshnessSection);
    }
  }

  if (status === SOURCE_STALE) {
    return sections
      .filter((section) => section.kind === "reference" || section.kind === "reference_claims" || section.kind === "sources" || section.kind === "freshness")
      .slice(0, options.maxSections);
  }

  if (status === WARNING) {
    return sections
      .filter((section) => section.kind === "response" || section.kind === "sources")
      .slice(0, options.maxSections);
  }

  return sections.slice(0, options.maxSections);
};

const buildSafeLimitations = (validationResult = {}, copy = {}) => {
  const limitations = safeArray(validationResult.safeResponse?.limitations)
    .map((item) => sanitizeString(item, { allowLiveWords: false }))
    .filter(Boolean);

  if (copy.limitation) {
    limitations.unshift(copy.limitation);
  }

  return dedupeStrings(limitations);
};

const buildDiagnosticNotice = (validationResult = {}, options = {}) => {
  if (options.includeDiagnostics !== true) {
    return null;
  }

  if (validationResult.status === EVIDENCE_REQUIRED) {
    return "部分内容因缺少可验证来源，已阻止展示。";
  }
  if (validationResult.status === SOURCE_STALE) {
    return "部分来源可能过期，仅可作为历史参考。";
  }
  if (validationResult.status !== READY) {
    return "新管线预览结果未达到安全渲染条件。";
  }

  return null;
};

const sanitizeDecisionTrace = (validationResult = {}) => safeArray(validationResult.decisionTrace)
  .map((entry) => {
    if (!isPlainObject(entry)) {
      return null;
    }

    const sanitized = {
      step: sanitizeString(entry.step, { allowLiveWords: false }),
      status: sanitizeString(entry.status, { allowLiveWords: false }),
    };

    if (Number.isFinite(entry.errorCount)) {
      sanitized.errorCount = entry.errorCount;
    }
    if (normalizeScalar(entry.claimId)) {
      sanitized.claimId = sanitizeString(entry.claimId, { allowLiveWords: false });
    }
    if (normalizeScalar(entry.claimType)) {
      sanitized.claimType = sanitizeString(entry.claimType, { allowLiveWords: false });
    }
    if (normalizeScalar(entry.freshnessCategory)) {
      sanitized.freshnessCategory = sanitizeString(entry.freshnessCategory, { allowLiveWords: false });
    }

    return Object.keys(sanitized).length > 0 ? sanitized : null;
  })
  .filter(Boolean);

export const buildProviderRendererViewModel = (validationResult = {}, options = {}, partial = {}) => {
  const warnings = safeArray(partial.warnings).slice(0, options.maxWarnings);
  const sourceBadges = safeArray(partial.sourceBadges);
  const sections = safeArray(partial.sections).slice(0, options.maxSections);

  return {
    canRender: Boolean(partial.canRender),
    status: normalizeScalar(partial.status) || SCHEMA_INVALID,
    displayMode: normalizeScalar(partial.displayMode) || "limitation_only",
    title: sanitizeString(partial.title, { allowLiveWords: false }) || "新管线预览结果",
    summary: normalizeScalar(partial.summary) ? sanitizeString(partial.summary, { allowLiveWords: partial.status === READY }) : null,
    sections,
    limitations: safeArray(partial.limitations),
    warnings,
    evidenceNotices: safeArray(partial.evidenceNotices),
    stalenessNotices: safeArray(partial.stalenessNotices),
    blockedClaimNotices: safeArray(partial.blockedClaimNotices),
    sourceBadges,
    diagnosticNotice: normalizeScalar(partial.diagnosticNotice) || null,
    metadata: {
      mode: options.mode,
      viewer: options.viewer,
      locale: options.locale,
      status: normalizeScalar(partial.status) || SCHEMA_INVALID,
      displayMode: normalizeScalar(partial.displayMode) || "limitation_only",
      sectionCount: sections.length,
      sourceBadgeCount: sourceBadges.length,
    },
    decisionTrace: safeArray(partial.decisionTrace),
  };
};

export const renderValidatedProviderResponse = (validationResult, options = {}) => {
  const normalizedOptions = buildProviderRendererOptions(options);
  const status = normalizeScalar(validationResult?.status) || SCHEMA_INVALID;
  const displayMode = deriveProviderDisplayMode(status);
  const copy = buildStatusCopy(validationResult, normalizedOptions);
  const evidenceNotices = buildEvidenceNotices(validationResult, normalizedOptions);
  const stalenessNotices = buildStalenessNotices(validationResult, normalizedOptions);
  const blockedClaimNotices = buildBlockedClaimNotices(validationResult, normalizedOptions);
  const sourceBadges = buildSourceBadges(validationResult, normalizedOptions);
  const sections = sanitizeRenderableSections(validationResult, normalizedOptions);
  const limitations = buildSafeLimitations(validationResult, copy);
  const warnings = buildGenericWarningCopy(validationResult, normalizedOptions);
  const diagnosticNotice = buildDiagnosticNotice(validationResult, normalizedOptions);
  const decisionTrace = sanitizeDecisionTrace(validationResult);
  const canRender = status === READY || status === WARNING || status === SOURCE_STALE;

  return buildProviderRendererViewModel(validationResult, normalizedOptions, {
    canRender,
    status,
    displayMode,
    title: copy.title,
    summary: copy.summary,
    sections,
    limitations,
    warnings,
    evidenceNotices,
    stalenessNotices,
    blockedClaimNotices,
    sourceBadges,
    diagnosticNotice,
    decisionTrace,
  });
};
