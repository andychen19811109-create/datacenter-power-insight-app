import {
  ALLOWED_MAX_AGE_WINDOWS,
  FORBIDDEN_UI_CLAIMS,
  NORMALIZED_PROVIDER_STATUSES,
  PRICING_CATEGORIES,
  PROVIDER_CONTRACT_SCHEMA_VERSION,
} from "./providerContract.js";
import {
  evaluateEvidenceBlockingCase,
  evaluateFreshnessForClaim,
  getValidationWinner,
  hasForbiddenDiagnosticFields,
  isIsoUtcString,
  isPlainObject,
  sanitizeProviderDiagnostics,
  validateClaimRefs,
  validateNormalizedProviderResponseShape,
  validateSourceRefs,
} from "./providerContractSchema.js";

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

const STATUS_SET = new Set(Object.values(NORMALIZED_PROVIDER_STATUSES));
const NO_RENDER_STATUSES = new Set([SCHEMA_INVALID, PROVIDER_ERROR, PROVIDER_TIMEOUT]);
const LIMITATION_ONLY_STATUSES = new Set([BLOCKED, EVIDENCE_REQUIRED, UNSUPPORTED]);
const SENSITIVE_KEY_PATTERN = /(rawproviderpayload|rawworkflowoutput|workflowid|difyworkflowid|node(name)?|appid|us(er)?id|token|promptinternals|env|stack|secret|api[_-]?key|authorization|bearer|requestid|pagecontexthash)/i;

const dedupeStrings = (values = []) => [...new Set(values.filter((value) => typeof value === "string" && value.trim()))];

const dedupeObjects = (values = [], keyBuilder = (value) => JSON.stringify(value)) => {
  const seen = new Set();

  return values.filter((value) => {
    const key = keyBuilder(value);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const normalizeMode = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    return "strict";
  }

  return value.trim();
};

const containsForbiddenUiClaim = (value, forbiddenUiClaims = FORBIDDEN_UI_CLAIMS) => {
  if (typeof value !== "string") {
    return false;
  }

  const normalizedValue = value.toLowerCase();
  return forbiddenUiClaims.some((item) => normalizedValue.includes(String(item).toLowerCase()));
};

const collectKeyPaths = (value, matcher, path = "") => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectKeyPaths(item, matcher, `${path}[${index}]`));
  }

  if (!isPlainObject(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const nextPath = path ? `${path}.${key}` : key;
    const current = matcher(key, nestedValue) ? [nextPath] : [];
    return [...current, ...collectKeyPaths(nestedValue, matcher, nextPath)];
  });
};

const hasRenderableLiveQuote = (safeResponse = {}) => safeArray(safeResponse.claimRefs).some(
  (claimRef) => claimRef?.pricingCategory === PRICING_CATEGORIES.LIVE_EXACT_QUOTE,
);

const normalizeClaimRefForOptions = (claimRef = {}, options = {}) => {
  const sourceRequiredClaimTypes = new Set(safeArray(options.sourceRequiredClaimTypes));

  if (!sourceRequiredClaimTypes.has(claimRef.claimType)) {
    return claimRef;
  }

  return {
    ...claimRef,
    sourceRequired: true,
  };
};

const isUnsupportedClaimValidationOnly = (errors = []) => (
  errors.length > 0
  && errors.every(
    (error) => error.includes("freshnessSensitivity is unsupported")
      || error.includes("unsupported freshness category"),
  )
);

const sanitizeValue = (value, forbiddenUiClaims = FORBIDDEN_UI_CLAIMS) => {
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item, forbiddenUiClaims))
      .filter((item) => item != null && item !== "");
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        return accumulator;
      }

      const sanitized = sanitizeValue(nestedValue, forbiddenUiClaims);
      if (sanitized == null || sanitized === "") {
        return accumulator;
      }

      accumulator[key] = sanitized;
      return accumulator;
    }, {});
  }

  if (typeof value === "string") {
    const normalized = value.trim();
    if (!normalized || containsForbiddenUiClaim(normalized, forbiddenUiClaims)) {
      return "";
    }

    return normalized;
  }

  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  return null;
};

const collectUiClaimFailures = (response, options = {}) => {
  const forbiddenUiClaims = safeArray(options.forbiddenUiClaims);
  const unsafePaths = collectKeyPaths(
    response,
    (_key, value) => typeof value === "string" && containsForbiddenUiClaim(value, forbiddenUiClaims),
  );

  if (unsafePaths.length === 0) {
    return {
      statuses: [],
      errors: [],
      warnings: [],
      decisionTrace: [{ step: "ui_claims", status: READY, unsafePaths: [] }],
    };
  }

  return {
    statuses: [BLOCKED],
    errors: [`forbidden UI claims present: ${unsafePaths.join(", ")}`],
    warnings: [],
    decisionTrace: [{ step: "ui_claims", status: BLOCKED, unsafePaths }],
  };
};

export const buildProviderValidationOptions = (options = {}) => ({
  nowIso: options.nowIso ?? new Date().toISOString(),
  mode: normalizeMode(options.mode),
  expectedSchemaVersion: options.expectedSchemaVersion ?? PROVIDER_CONTRACT_SCHEMA_VERSION,
  allowLocalMockLimitation: options.allowLocalMockLimitation === true,
  strictEvidence: options.strictEvidence !== false,
  strictFreshness: options.strictFreshness !== false,
  forbiddenUiClaims: safeArray(options.forbiddenUiClaims).length > 0
    ? [...options.forbiddenUiClaims]
    : [...FORBIDDEN_UI_CLAIMS],
  sourceRequiredClaimTypes: safeArray(options.sourceRequiredClaimTypes),
  pricingPolicy: options.pricingPolicy ?? ALLOWED_MAX_AGE_WINDOWS,
});

export const collectEvidenceFailures = (response, options = {}) => {
  const sourceRefs = safeArray(response?.sourceRefs);
  const rawClaimRefs = safeArray(response?.claimRefs);
  const claimRefs = rawClaimRefs.map((claimRef) => normalizeClaimRefForOptions(claimRef, options));
  const statuses = [];
  const errors = [];
  const warnings = [];
  const missingEvidence = [];
  const blockedClaims = [];
  const decisionTrace = [];

  const sourceValidation = validateSourceRefs(sourceRefs);
  if (!sourceValidation.ok) {
    statuses.push(sourceValidation.status);
    errors.push(...sourceValidation.errors);
  }
  decisionTrace.push({
    step: "validate_source_refs",
    status: sourceValidation.status,
    errorCount: sourceValidation.errors.length,
  });

  const claimValidation = validateClaimRefs(claimRefs, sourceRefs);
  if (!claimValidation.ok) {
    statuses.push(
      isUnsupportedClaimValidationOnly(claimValidation.errors)
        ? UNSUPPORTED
        : claimValidation.status,
    );
    errors.push(...claimValidation.errors);
  }
  decisionTrace.push({
    step: "validate_claim_refs",
    status: claimValidation.status,
    errorCount: claimValidation.errors.length,
  });

  claimRefs.forEach((claimRef) => {
    const rawResult = evaluateEvidenceBlockingCase({
      claimRef,
      sourceRefs,
      nowIso: options.nowIso,
    });
    const result = isUnsupportedClaimValidationOnly(rawResult.errors || [])
      ? {
        ...rawResult,
        status: UNSUPPORTED,
      }
      : rawResult;

    if (result.status !== READY) {
      statuses.push(result.status);
      errors.push(...safeArray(result.errors));
    }

    if (result.status === EVIDENCE_REQUIRED) {
      missingEvidence.push({
        claimId: claimRef.id || "unknown_claim",
        claimType: claimRef.claimType || "unknown",
        linkedSourceRefIds: safeArray(claimRef.linkedSourceRefIds),
        errors: safeArray(result.errors),
      });
    }

    if (result.status === BLOCKED || result.status === UNSUPPORTED) {
      blockedClaims.push({
        claimId: claimRef.id || "unknown_claim",
        claimType: claimRef.claimType || "unknown",
        pricingCategory: claimRef.pricingCategory || PRICING_CATEGORIES.UNKNOWN,
        status: result.status,
        errors: safeArray(result.errors),
      });
    }

    decisionTrace.push({
      step: "evaluate_evidence_blocking_case",
      claimId: claimRef.id || "unknown_claim",
      status: result.status,
    });
  });

  return {
    statuses: dedupeStrings(statuses),
    errors: dedupeStrings(errors),
    warnings: dedupeStrings(warnings),
    missingEvidence: dedupeObjects(missingEvidence),
    blockedClaims: dedupeObjects(blockedClaims),
    decisionTrace,
  };
};

export const collectFreshnessFailures = (response, options = {}) => {
  const sourceRefs = safeArray(response?.sourceRefs);
  const claimRefs = safeArray(response?.claimRefs).map((claimRef) => normalizeClaimRefForOptions(claimRef, options));
  const statuses = [];
  const errors = [];
  const warnings = [];
  const staleSources = [];
  const blockedClaims = [];
  const decisionTrace = [];

  if (!isIsoUtcString(options.nowIso)) {
    return {
      statuses: [SCHEMA_INVALID],
      errors: ["nowIso must be UTC ISO-8601"],
      warnings,
      staleSources,
      blockedClaims,
      decisionTrace: [{ step: "validate_now_iso", status: SCHEMA_INVALID }],
    };
  }

  claimRefs.forEach((claimRef) => {
    const pricingWindow = claimRef.pricingCategory ? options.pricingPolicy?.[claimRef.pricingCategory] : null;
    if (
      claimRef.pricingCategory
      && claimRef.pricingCategory !== PRICING_CATEGORIES.UNKNOWN
      && pricingWindow == null
      && !Object.values(PRICING_CATEGORIES).includes(claimRef.pricingCategory)
    ) {
      statuses.push(UNSUPPORTED);
      errors.push(`unsupported pricing policy: ${claimRef.pricingCategory}`);
      blockedClaims.push({
        claimId: claimRef.id || "unknown_claim",
        claimType: claimRef.claimType || "unknown",
        pricingCategory: claimRef.pricingCategory,
        status: UNSUPPORTED,
        errors: [`unsupported pricing policy: ${claimRef.pricingCategory}`],
      });
      decisionTrace.push({
        step: "pricing_policy_check",
        claimId: claimRef.id || "unknown_claim",
        status: UNSUPPORTED,
      });
      return;
    }

    const result = evaluateFreshnessForClaim(claimRef, sourceRefs, options.nowIso);
    if (result.status !== READY) {
      statuses.push(result.status);
      errors.push(...safeArray(result.errors));
    }

    if (result.status === SOURCE_STALE) {
      warnings.push(...safeArray(result.errors));
      staleSources.push({
        claimId: claimRef.id || "unknown_claim",
        sourceIds: safeArray(claimRef.linkedSourceRefIds),
        freshnessCategory: result.freshnessCategory,
        pricingCategory: claimRef.pricingCategory || PRICING_CATEGORIES.UNKNOWN,
        errors: safeArray(result.errors),
      });
    }

    if (result.status === BLOCKED || result.status === EVIDENCE_REQUIRED || result.status === UNSUPPORTED) {
      blockedClaims.push({
        claimId: claimRef.id || "unknown_claim",
        sourceIds: safeArray(claimRef.linkedSourceRefIds),
        freshnessCategory: result.freshnessCategory,
        pricingCategory: claimRef.pricingCategory || PRICING_CATEGORIES.UNKNOWN,
        status: result.status,
        errors: safeArray(result.errors),
      });
    }

    decisionTrace.push({
      step: "evaluate_freshness_for_claim",
      claimId: claimRef.id || "unknown_claim",
      status: result.status,
      freshnessCategory: result.freshnessCategory || "unknown",
    });
  });

  return {
    statuses: dedupeStrings(statuses),
    errors: dedupeStrings(errors),
    warnings: dedupeStrings(warnings),
    staleSources: dedupeObjects(staleSources),
    blockedClaims: dedupeObjects(blockedClaims),
    decisionTrace,
  };
};

export const collectDiagnosticsFailures = (response) => {
  const statuses = [];
  const errors = [];
  const warnings = [];
  const decisionTrace = [];
  const rawPayloadPaths = collectKeyPaths(response, (key) => key === "rawProviderPayload");
  const diagnostics = isPlainObject(response?.diagnostics) ? response.diagnostics : {};

  if (rawPayloadPaths.length > 0) {
    statuses.push(SCHEMA_INVALID);
    errors.push(`rawProviderPayload is forbidden: ${rawPayloadPaths.join(", ")}`);
  }

  if (hasForbiddenDiagnosticFields(diagnostics)) {
    statuses.push(SCHEMA_INVALID);
    errors.push("diagnostics contain forbidden fields");
  }

  const sanitizedDiagnostics = sanitizeProviderDiagnostics(diagnostics);
  decisionTrace.push({
    step: "collect_diagnostics_failures",
    status: statuses.length === 0 ? READY : getValidationWinner(statuses),
    rawPayloadPaths,
  });

  return {
    statuses: dedupeStrings(statuses),
    errors: dedupeStrings(errors),
    warnings: dedupeStrings(warnings),
    sanitizedDiagnostics,
    decisionTrace,
  };
};

export const buildSafeResponse = (response, validationContext = {}) => {
  const { status, options = {} } = validationContext;

  if (!isPlainObject(response) || NO_RENDER_STATUSES.has(status)) {
    return null;
  }

  const limitations = sanitizeValue(response.limitations, options.forbiddenUiClaims) || [];
  const freshness = sanitizeValue(response.freshness, options.forbiddenUiClaims) || {};
  const sourceRefs = sanitizeValue(response.sourceRefs, options.forbiddenUiClaims) || [];
  const claimRefs = sanitizeValue(response.claimRefs, options.forbiddenUiClaims) || [];
  const basePayload = {
    schemaVersion: sanitizeValue(response.schemaVersion, options.forbiddenUiClaims),
    responseId: sanitizeValue(response.responseId, options.forbiddenUiClaims),
    provider: sanitizeValue(response.provider, options.forbiddenUiClaims) || {},
    status: sanitizeValue(response.status, options.forbiddenUiClaims),
    generatedAt: sanitizeValue(response.generatedAt, options.forbiddenUiClaims),
    freshness,
    limitations,
  };

  if (status === BLOCKED || status === EVIDENCE_REQUIRED || status === UNSUPPORTED) {
    return {
      ...basePayload,
      limitations,
      missingEvidence: dedupeObjects(validationContext.missingEvidence || []),
      staleSources: dedupeObjects(validationContext.staleSources || []),
    };
  }

  const safeResponse = {
    ...basePayload,
    sourceRefs,
    claimRefs,
  };

  const summary = sanitizeValue(response.summary, options.forbiddenUiClaims);
  if (summary) {
    safeResponse.summary = summary;
  }

  const sections = sanitizeValue(response.sections, options.forbiddenUiClaims);
  if (Array.isArray(sections) && sections.length > 0) {
    safeResponse.sections = sections;
  }

  if ((status === SOURCE_STALE || status === WARNING) && hasRenderableLiveQuote(safeResponse)) {
    delete safeResponse.summary;
    delete safeResponse.sections;
  }

  return safeResponse;
};

export const deriveRenderableSections = (context = {}) => {
  const { status, safeResponse = {} } = context;

  if (NO_RENDER_STATUSES.has(status)) {
    return [];
  }

  if (LIMITATION_ONLY_STATUSES.has(status)) {
    return ["limitations"];
  }

  if (status === SOURCE_STALE) {
    return ["reference", "limitations"];
  }

  if (status === WARNING) {
    return ["warnings", "limitations"];
  }

  if (status !== READY) {
    return [];
  }

  const sections = [];
  if (safeResponse.summary || (Array.isArray(safeResponse.sections) && safeResponse.sections.length > 0)) {
    sections.push("response");
  }
  if (safeArray(safeResponse.claimRefs).length > 0) {
    sections.push("claims");
  }
  if (safeArray(safeResponse.sourceRefs).length > 0) {
    sections.push("sources");
  }
  if (isPlainObject(safeResponse.freshness) && Object.keys(safeResponse.freshness).length > 0) {
    sections.push("freshness");
  }
  if (safeArray(safeResponse.limitations).length > 0) {
    sections.push("limitations");
  }

  return sections;
};

export const validateNormalizedProviderResponse = (response, options = {}) => {
  const normalizedOptions = buildProviderValidationOptions(options);
  const statuses = [];
  const errors = [];
  const warnings = [];
  const decisionTrace = [];

  if (!isIsoUtcString(normalizedOptions.nowIso)) {
    statuses.push(SCHEMA_INVALID);
    errors.push("nowIso must be UTC ISO-8601");
    decisionTrace.push({
      step: "validate_options",
      status: SCHEMA_INVALID,
      error: "nowIso must be UTC ISO-8601",
    });
  } else {
    decisionTrace.push({
      step: "validate_options",
      status: READY,
      mode: normalizedOptions.mode,
      allowLocalMockLimitation: normalizedOptions.allowLocalMockLimitation,
    });
  }

  const shapeValidation = validateNormalizedProviderResponseShape(response);
  if (!shapeValidation.ok) {
    statuses.push(shapeValidation.status);
    errors.push(...shapeValidation.errors);
  }
  decisionTrace.push({
    step: "validate_normalized_provider_response_shape",
    status: shapeValidation.status,
    errorCount: shapeValidation.errors.length,
  });

  if (response?.schemaVersion && response.schemaVersion !== normalizedOptions.expectedSchemaVersion) {
    statuses.push(SCHEMA_INVALID);
    errors.push("expectedSchemaVersion mismatch");
  }

  if (STATUS_SET.has(response?.status)) {
    statuses.push(response.status);
  }

  const diagnosticsFailures = collectDiagnosticsFailures(response, normalizedOptions);
  const evidenceFailures = collectEvidenceFailures(response, normalizedOptions);
  const freshnessFailures = collectFreshnessFailures(response, normalizedOptions);
  const uiClaimFailures = collectUiClaimFailures(response, normalizedOptions);

  statuses.push(
    ...diagnosticsFailures.statuses,
    ...evidenceFailures.statuses,
    ...freshnessFailures.statuses,
    ...uiClaimFailures.statuses,
  );

  errors.push(
    ...diagnosticsFailures.errors,
    ...evidenceFailures.errors,
    ...freshnessFailures.errors,
    ...uiClaimFailures.errors,
  );

  warnings.push(
    ...diagnosticsFailures.warnings,
    ...evidenceFailures.warnings,
    ...freshnessFailures.warnings,
    ...uiClaimFailures.warnings,
  );

  decisionTrace.push(
    ...diagnosticsFailures.decisionTrace,
    ...evidenceFailures.decisionTrace,
    ...freshnessFailures.decisionTrace,
    ...uiClaimFailures.decisionTrace,
  );

  const status = getValidationWinner(dedupeStrings(statuses));
  const missingEvidence = dedupeObjects(evidenceFailures.missingEvidence);
  const staleSources = dedupeObjects(freshnessFailures.staleSources);
  const blockedClaims = dedupeObjects([
    ...safeArray(evidenceFailures.blockedClaims),
    ...safeArray(freshnessFailures.blockedClaims),
  ]);
  const sanitizedDiagnostics = diagnosticsFailures.sanitizedDiagnostics;

  const safeResponse = buildSafeResponse(response, {
    status,
    options: normalizedOptions,
    missingEvidence,
    staleSources,
    blockedClaims,
  });
  const renderableSections = deriveRenderableSections({
    status,
    safeResponse,
    missingEvidence,
    staleSources,
    blockedClaims,
    warnings,
  });

  return {
    ok: status === READY || status === WARNING || status === SOURCE_STALE,
    status,
    errors: dedupeStrings(errors),
    warnings: dedupeStrings(warnings),
    safeResponse,
    blockedClaims,
    renderableSections,
    missingEvidence,
    staleSources,
    sanitizedDiagnostics,
    decisionTrace,
  };
};
