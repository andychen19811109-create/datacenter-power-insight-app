import {
  ALLOWED_MAX_AGE_WINDOWS,
  CONFIDENCE_LEVELS,
  FORBIDDEN_DIAGNOSTIC_FIELDS,
  FORBIDDEN_REQUEST_FIELDS,
  FRESHNESS_CATEGORIES,
  LIVE_EXACT_QUOTE_INDICATORS,
  NORMALIZED_PROVIDER_RESPONSE_REQUIRED_FIELDS,
  NORMALIZED_PROVIDER_STATUSES,
  PRICING_CATEGORIES,
  PROVIDER_CONTRACT_SCHEMA_VERSION,
  PROVIDER_MODES,
  PROVIDER_REQUEST_REQUIRED_FIELDS,
  REFERENCE_TREND_PRICING_INDICATORS,
  RELIABILITY_TIERS,
  SOURCE_TYPES,
  VALIDATION_STATUS_PRECEDENCE,
} from "./providerContract.js";

const HOUR_IN_MS = 60 * 60 * 1000;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const DAY_PRECISION_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)?$/;
const PRICING_WORD_PATTERN = /价格|报价|实价|成交价|price|pricing|quote|offer/i;
const AMBIGUOUS_CURRENT_PRICE_PATTERN = /当前|现在|最新|latest|recent|current|today|valid|成交|final/i;

const statusValues = new Set(Object.values(NORMALIZED_PROVIDER_STATUSES));
const providerModeValues = new Set(Object.values(PROVIDER_MODES));
const sourceTypeValues = new Set(Object.values(SOURCE_TYPES));
const reliabilityTierValues = new Set(Object.values(RELIABILITY_TIERS));
const confidenceValues = new Set(Object.values(CONFIDENCE_LEVELS));
const freshnessCategoryValues = new Set(Object.values(FRESHNESS_CATEGORIES));
const pricingCategoryValues = new Set(Object.values(PRICING_CATEGORIES));

export const isPlainObject = (value) => (
  Boolean(value) && typeof value === "object" && !Array.isArray(value)
);

export const isNonEmptyString = (value) => (
  typeof value === "string" && value.trim().length > 0
);

export const isIsoUtcString = (value) => (
  typeof value === "string" && ISO_UTC_PATTERN.test(value)
);

const isDayOrIsoUtcString = (value) => (
  typeof value === "string" && DAY_PRECISION_PATTERN.test(value)
);

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const collectForbiddenFieldPaths = (value, forbiddenFields, path = "") => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectForbiddenFieldPaths(item, forbiddenFields, `${path}[${index}]`)
    );
  }

  if (!isPlainObject(value)) {
    return [];
  }

  const forbiddenSet = new Set(forbiddenFields.map((field) => field.toLowerCase()));
  const paths = [];

  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase();
    const nextPath = path ? `${path}.${key}` : key;

    if (
      forbiddenSet.has(normalizedKey)
      || /dify.*(token|workflow|app)/i.test(key)
      || /(api[_-]?key|authorization|bearer|secret|raw.*payload|raw.*trace)/i.test(key)
    ) {
      paths.push(nextPath);
    }

    paths.push(...collectForbiddenFieldPaths(nestedValue, forbiddenFields, nextPath));
  }

  return paths;
};

const buildResult = (errors = [], fallbackStatus = NORMALIZED_PROVIDER_STATUSES.SCHEMA_INVALID) => ({
  ok: errors.length === 0,
  status: errors.length === 0 ? NORMALIZED_PROVIDER_STATUSES.READY : fallbackStatus,
  errors,
});

const findByIds = (sourceRefs = [], ids = []) => {
  const sourceById = new Map(sourceRefs.map((sourceRef) => [sourceRef.id, sourceRef]));
  return ids.map((sourceId) => sourceById.get(sourceId)).filter(Boolean);
};

const getClaimFreshnessCategory = (claimRef = {}) => {
  if (claimRef.pricingCategory === PRICING_CATEGORIES.LIVE_EXACT_QUOTE) {
    return FRESHNESS_CATEGORIES.PRICING_LIVE_EXACT_QUOTE;
  }

  if (claimRef.pricingCategory === PRICING_CATEGORIES.REFERENCE_TREND) {
    return FRESHNESS_CATEGORIES.PRICING_REFERENCE_TREND;
  }

  return claimRef.freshnessSensitivity;
};

const hasHourPrecisionTimestamp = (value) => isIsoUtcString(value);

const getBestSourceTimestamp = (sourceRef = {}) => (
  sourceRef.publishedAt || sourceRef.freshnessAsOf || sourceRef.accessedAt
);

export const hasForbiddenRequestFields = (request) => (
  collectForbiddenFieldPaths(request, FORBIDDEN_REQUEST_FIELDS).length > 0
);

export const hasForbiddenDiagnosticFields = (diagnostics) => (
  collectForbiddenFieldPaths(diagnostics, FORBIDDEN_DIAGNOSTIC_FIELDS).length > 0
);

export const validateProviderRequestShape = (request) => {
  const errors = [];

  if (!isPlainObject(request)) {
    return buildResult(["request must be a plain object"]);
  }

  for (const field of PROVIDER_REQUEST_REQUIRED_FIELDS) {
    if (!(field in request)) {
      errors.push(`${field} is required`);
    }
  }

  for (const field of ["requestId", "question", "intent", "locale"]) {
    if (field in request && !isNonEmptyString(request[field])) {
      errors.push(`${field} must be a non-empty string`);
    }
  }

  if ("taskContext" in request && !isPlainObject(request.taskContext)) {
    errors.push("taskContext must be a plain object");
  }

  if ("constraints" in request && !isPlainObject(request.constraints)) {
    errors.push("constraints must be a plain object");
  }

  if ("policies" in request && !isPlainObject(request.policies)) {
    errors.push("policies must be a plain object");
  }

  if (request.objects != null && !Array.isArray(request.objects)) {
    errors.push("objects must be an array when provided");
  }

  if (request.constraints?.previewOnly !== true) {
    errors.push("constraints.previewOnly must be true");
  }

  if (request.constraints?.noFabricatedEvidence !== true) {
    errors.push("constraints.noFabricatedEvidence must be true");
  }

  if (request.constraints?.noDefaultAskReplacement !== true) {
    errors.push("constraints.noDefaultAskReplacement must be true");
  }

  const forbiddenPaths = collectForbiddenFieldPaths(request, FORBIDDEN_REQUEST_FIELDS);
  if (forbiddenPaths.length > 0) {
    errors.push(`forbidden request fields: ${forbiddenPaths.join(", ")}`);
  }

  return buildResult(errors);
};

export const validateNormalizedProviderResponseShape = (response) => {
  const errors = [];

  if (!isPlainObject(response)) {
    return buildResult(["response must be a plain object"]);
  }

  for (const field of NORMALIZED_PROVIDER_RESPONSE_REQUIRED_FIELDS) {
    if (!(field in response)) {
      errors.push(`${field} is required`);
    }
  }

  if (response.schemaVersion !== PROVIDER_CONTRACT_SCHEMA_VERSION) {
    errors.push("schemaVersion is unsupported");
  }

  if ("status" in response && !statusValues.has(response.status)) {
    errors.push("status is unsupported");
  }

  if ("generatedAt" in response && !isIsoUtcString(response.generatedAt)) {
    errors.push("generatedAt must be UTC ISO-8601");
  }

  if ("provider" in response) {
    if (!isPlainObject(response.provider)) {
      errors.push("provider must be a plain object");
    } else if (response.provider.mode && !providerModeValues.has(response.provider.mode)) {
      errors.push("provider.mode is unsupported");
    }
  }

  if ("sourceRefs" in response && !Array.isArray(response.sourceRefs)) {
    errors.push("sourceRefs must be an array");
  }

  if ("claimRefs" in response && !Array.isArray(response.claimRefs)) {
    errors.push("claimRefs must be an array");
  }

  if ("limitations" in response && !Array.isArray(response.limitations)) {
    errors.push("limitations must be an array");
  }

  const forbiddenPaths = collectForbiddenFieldPaths(response, [
    ...FORBIDDEN_DIAGNOSTIC_FIELDS,
    "rawProviderPayload",
  ]);
  if (forbiddenPaths.length > 0) {
    errors.push(`forbidden response fields: ${forbiddenPaths.join(", ")}`);
  }

  return buildResult(errors);
};

export const classifyPricingClaimText = (claimText) => {
  const text = normalizeText(claimText);

  if (!text) {
    return PRICING_CATEGORIES.UNKNOWN;
  }

  if (LIVE_EXACT_QUOTE_INDICATORS.some((indicator) => text.includes(indicator.toLowerCase()))) {
    return PRICING_CATEGORIES.LIVE_EXACT_QUOTE;
  }

  if (REFERENCE_TREND_PRICING_INDICATORS.some((indicator) => text.includes(indicator.toLowerCase()))) {
    return PRICING_CATEGORIES.REFERENCE_TREND;
  }

  if (!PRICING_WORD_PATTERN.test(text)) {
    return PRICING_CATEGORIES.UNKNOWN;
  }

  if (AMBIGUOUS_CURRENT_PRICE_PATTERN.test(text)) {
    return PRICING_CATEGORIES.LIVE_EXACT_QUOTE;
  }

  return PRICING_CATEGORIES.UNKNOWN;
};

export const getValidationWinner = (statuses = []) => {
  if (!Array.isArray(statuses) || statuses.length === 0) {
    return NORMALIZED_PROVIDER_STATUSES.READY;
  }

  if (statuses.some((status) => !statusValues.has(status))) {
    return NORMALIZED_PROVIDER_STATUSES.SCHEMA_INVALID;
  }

  for (const status of VALIDATION_STATUS_PRECEDENCE) {
    if (statuses.includes(status)) {
      return status;
    }
  }

  return NORMALIZED_PROVIDER_STATUSES.READY;
};

export const validateSourceRefs = (sourceRefs) => {
  const errors = [];

  if (!Array.isArray(sourceRefs)) {
    return buildResult(["sourceRefs must be an array"]);
  }

  const seenIds = new Set();

  sourceRefs.forEach((sourceRef, index) => {
    if (!isPlainObject(sourceRef)) {
      errors.push(`sourceRefs[${index}] must be a plain object`);
      return;
    }

    for (const field of ["id", "title", "publisher", "locator", "sourceType", "reliabilityTier", "accessedAt"]) {
      if (!isNonEmptyString(sourceRef[field])) {
        errors.push(`sourceRefs[${index}].${field} is required`);
      }
    }

    if (seenIds.has(sourceRef.id)) {
      errors.push(`duplicate sourceRef id: ${sourceRef.id}`);
    }
    seenIds.add(sourceRef.id);

    if (sourceRef.accessedAt && !isIsoUtcString(sourceRef.accessedAt)) {
      errors.push(`sourceRefs[${index}].accessedAt must be UTC ISO-8601`);
    }

    if (sourceRef.sourceType && !sourceTypeValues.has(sourceRef.sourceType)) {
      errors.push(`sourceRefs[${index}].sourceType is unsupported`);
    }

    if (sourceRef.reliabilityTier && !reliabilityTierValues.has(sourceRef.reliabilityTier)) {
      errors.push(`sourceRefs[${index}].reliabilityTier is unsupported`);
    }

    if (/^(fake|todo|tbd|unknown)$/i.test(String(sourceRef.locator || "").trim())) {
      errors.push(`sourceRefs[${index}].locator must not be fake or empty`);
    }
  });

  return buildResult(errors);
};

export const validateClaimRefs = (claimRefs, sourceRefs = []) => {
  const errors = [];

  if (!Array.isArray(claimRefs)) {
    return buildResult(["claimRefs must be an array"]);
  }

  const sourceIds = new Set(Array.isArray(sourceRefs) ? sourceRefs.map((sourceRef) => sourceRef?.id).filter(Boolean) : []);
  const seenIds = new Set();
  let evidenceRequired = false;

  claimRefs.forEach((claimRef, index) => {
    if (!isPlainObject(claimRef)) {
      errors.push(`claimRefs[${index}] must be a plain object`);
      return;
    }

    for (const field of ["id", "claim", "claimType", "linkedSourceRefIds", "confidence", "freshnessSensitivity", "sourceRequired", "status"]) {
      if (!(field in claimRef)) {
        errors.push(`claimRefs[${index}].${field} is required`);
      }
    }

    if (seenIds.has(claimRef.id)) {
      errors.push(`duplicate claimRef id: ${claimRef.id}`);
    }
    seenIds.add(claimRef.id);

    if (!Array.isArray(claimRef.linkedSourceRefIds)) {
      errors.push(`claimRefs[${index}].linkedSourceRefIds must be an array`);
      evidenceRequired = true;
    } else if (claimRef.sourceRequired === true && claimRef.linkedSourceRefIds.length === 0) {
      errors.push(`claimRefs[${index}] source-required claim is missing linkedSourceRefIds`);
      evidenceRequired = true;
    }

    for (const sourceId of claimRef.linkedSourceRefIds || []) {
      if (!sourceIds.has(sourceId)) {
        errors.push(`claimRefs[${index}] links missing sourceRef id: ${sourceId}`);
        evidenceRequired = true;
      }
    }

    if (claimRef.confidence && !confidenceValues.has(claimRef.confidence)) {
      errors.push(`claimRefs[${index}].confidence is unsupported`);
    }

    if (claimRef.freshnessSensitivity && !freshnessCategoryValues.has(claimRef.freshnessSensitivity)) {
      errors.push(`claimRefs[${index}].freshnessSensitivity is unsupported`);
    }

    if (claimRef.status && !statusValues.has(claimRef.status)) {
      errors.push(`claimRefs[${index}].status is unsupported`);
    }

    if (classifyPricingClaimText(claimRef.claim) !== PRICING_CATEGORIES.UNKNOWN && !pricingCategoryValues.has(claimRef.pricingCategory)) {
      errors.push(`claimRefs[${index}].pricingCategory is required for pricing claims`);
    }
  });

  return buildResult(
    errors,
    evidenceRequired ? NORMALIZED_PROVIDER_STATUSES.EVIDENCE_REQUIRED : NORMALIZED_PROVIDER_STATUSES.SCHEMA_INVALID,
  );
};

export const evaluateFreshnessForClaim = (claimRef, sourceRefs = [], nowIso) => {
  const errors = [];

  if (!isPlainObject(claimRef)) {
    return {
      status: NORMALIZED_PROVIDER_STATUSES.SCHEMA_INVALID,
      errors: ["claimRef must be a plain object"],
    };
  }

  if (!isIsoUtcString(nowIso)) {
    return {
      status: NORMALIZED_PROVIDER_STATUSES.SCHEMA_INVALID,
      errors: ["nowIso must be UTC ISO-8601"],
      freshnessCategory: getClaimFreshnessCategory(claimRef),
    };
  }

  const freshnessCategory = getClaimFreshnessCategory(claimRef);
  const windowConfig = ALLOWED_MAX_AGE_WINDOWS[freshnessCategory];

  if (!windowConfig) {
    return {
      status: NORMALIZED_PROVIDER_STATUSES.UNSUPPORTED,
      errors: [`unsupported freshness category: ${freshnessCategory}`],
      freshnessCategory,
    };
  }

  const linkedSources = findByIds(sourceRefs, claimRef.linkedSourceRefIds || []);
  if (claimRef.sourceRequired === true && linkedSources.length === 0) {
    return {
      status: NORMALIZED_PROVIDER_STATUSES.EVIDENCE_REQUIRED,
      errors: ["source-required claim has no valid linked sourceRefs"],
      freshnessCategory,
    };
  }

  const nowMs = Date.parse(nowIso);
  const sourceErrors = [];

  for (const sourceRef of linkedSources) {
    const timestamp = getBestSourceTimestamp(sourceRef);

    if (!timestamp) {
      sourceErrors.push(`sourceRef ${sourceRef.id} is missing timestamp`);
      continue;
    }

    const validTimestamp = windowConfig.precision === "hour"
      ? hasHourPrecisionTimestamp(timestamp)
      : isDayOrIsoUtcString(timestamp);

    if (!validTimestamp) {
      sourceErrors.push(`sourceRef ${sourceRef.id} has invalid timestamp precision`);
      continue;
    }

    const sourceMs = Date.parse(timestamp);
    const ageHours = (nowMs - sourceMs) / HOUR_IN_MS;

    if (!Number.isFinite(ageHours) || ageHours < 0) {
      sourceErrors.push(`sourceRef ${sourceRef.id} has invalid timestamp`);
      continue;
    }

    if (ageHours > windowConfig.maxAgeHours) {
      sourceErrors.push(`sourceRef ${sourceRef.id} is outside ${windowConfig.maxAgeHours} hour TTL`);
    }
  }

  if (sourceErrors.length === 0) {
    return {
      status: NORMALIZED_PROVIDER_STATUSES.READY,
      errors: [],
      freshnessCategory,
    };
  }

  if (freshnessCategory === FRESHNESS_CATEGORIES.PRICING_LIVE_EXACT_QUOTE) {
    return {
      status: linkedSources.length === 0
        ? NORMALIZED_PROVIDER_STATUSES.EVIDENCE_REQUIRED
        : NORMALIZED_PROVIDER_STATUSES.BLOCKED,
      errors: sourceErrors,
      freshnessCategory,
    };
  }

  return {
    status: NORMALIZED_PROVIDER_STATUSES.SOURCE_STALE,
    errors: sourceErrors,
    freshnessCategory,
  };
};

export const evaluateEvidenceBlockingCase = ({ claimRef, sourceRefs = [], nowIso } = {}) => {
  if (!isPlainObject(claimRef)) {
    return {
      status: NORMALIZED_PROVIDER_STATUSES.SCHEMA_INVALID,
      errors: ["claimRef must be a plain object"],
    };
  }

  const pricingCategory = claimRef.pricingCategory || classifyPricingClaimText(claimRef.claim);
  const normalizedClaimRef = {
    ...claimRef,
    pricingCategory,
    freshnessSensitivity: pricingCategory === PRICING_CATEGORIES.LIVE_EXACT_QUOTE
      ? FRESHNESS_CATEGORIES.PRICING_LIVE_EXACT_QUOTE
      : claimRef.freshnessSensitivity,
  };

  const linkResult = validateClaimRefs([normalizedClaimRef], sourceRefs);
  if (!linkResult.ok && linkResult.status === NORMALIZED_PROVIDER_STATUSES.EVIDENCE_REQUIRED) {
    return linkResult;
  }

  if (pricingCategory === PRICING_CATEGORIES.LIVE_EXACT_QUOTE) {
    return evaluateFreshnessForClaim(normalizedClaimRef, sourceRefs, nowIso);
  }

  if (!linkResult.ok) {
    return linkResult;
  }

  return evaluateFreshnessForClaim(normalizedClaimRef, sourceRefs, nowIso);
};

export const sanitizeProviderDiagnostics = (diagnostics) => {
  if (!isPlainObject(diagnostics)) {
    return {
      safe: true,
      reasonCodes: [],
    };
  }

  return {
    safe: diagnostics.safe === false ? true : true,
    reasonCodes: Array.isArray(diagnostics.reasonCodes)
      ? diagnostics.reasonCodes.filter(isNonEmptyString)
      : [],
    ...(isNonEmptyString(diagnostics.sanitizedTraceId)
      ? { sanitizedTraceId: diagnostics.sanitizedTraceId }
      : {}),
    ...(providerModeValues.has(diagnostics.providerMode)
      ? { providerMode: diagnostics.providerMode }
      : {}),
  };
};
