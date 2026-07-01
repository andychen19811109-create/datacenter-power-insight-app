import {
  isMissingValueMarker,
  mapStatusToRenderMode,
  VALIDATOR_STATUS,
} from "./validatorStatus.js";

const REQUIRED_TOP_LEVEL_FIELDS = [
  "schemaVersion",
  "responseId",
  "taskIntent",
  "resolvedObjects",
  "entityRoles",
  "decisionSummary",
  "fiveLookThreeDefine",
  "technicalRoadmap",
  "doorstepGate",
  "readinessGate",
  "risks",
  "missingInputs",
  "sourceRequiredItems",
  "evidenceTrace",
  "pageTrace",
  "freshnessNotice",
  "validatorHints",
];

const normalizeScalar = (value) => (value == null ? "" : String(value).trim());

const normalizeFiveLookThreeDefine = (value = {}) => {
  const normalized = {
    lookMarket: normalizeScalar(value.lookMarket || value.lookTrend),
    lookTrend: normalizeScalar(value.lookTrend || value.lookMarket),
    lookCustomer: normalizeScalar(value.lookCustomer),
    lookCompetition: normalizeScalar(value.lookCompetition),
    lookTechnology: normalizeScalar(value.lookTechnology),
    lookSelf: normalizeScalar(value.lookSelf),
    defineDirection: normalizeScalar(value.defineDirection),
    defineProduct: normalizeScalar(value.defineProduct),
    definePace: normalizeScalar(value.definePace || value.defineRhythm),
    defineRhythm: normalizeScalar(value.defineRhythm || value.definePace),
  };

  return normalized;
};

const errorResult = (status, blockingReasons, normalizedResponse = null) => ({
  ok: false,
  validatorStatus: status,
  renderMode: mapStatusToRenderMode(status),
  allowedToRender: false,
  blockingReasons,
  normalizedResponse,
});

const hasEmptyRequiredString = (value) => typeof value === "string" && value.trim().length === 0;

const hasFactualClaimPayload = (response = {}) => {
  if (Array.isArray(response.evidenceTrace) && response.evidenceTrace.length > 0) {
    return true;
  }

  return [
    response.decisionSummary,
    ...(Array.isArray(response.technicalRoadmap) ? response.technicalRoadmap.flatMap((item) => Object.values(item || {})) : []),
    ...(Array.isArray(response.risks) ? response.risks : []),
  ].some((value) => typeof value === "string" && value && !isMissingValueMarker(value));
};

export const validateResponseContract = (response, request = {}) => {
  if (response?.providerState === VALIDATOR_STATUS.PROVIDER_ERROR) {
    return errorResult(VALIDATOR_STATUS.PROVIDER_ERROR, ["provider returned error state"], response);
  }

  if (response?.providerState === VALIDATOR_STATUS.PROVIDER_TIMEOUT) {
    return errorResult(VALIDATOR_STATUS.PROVIDER_TIMEOUT, ["provider returned timeout state"], response);
  }

  if (!response || typeof response !== "object" || Array.isArray(response)) {
    return errorResult(VALIDATOR_STATUS.BLOCKED_SCHEMA_ERROR, ["provider response must be a structured JSON object"]);
  }

  const missingFields = REQUIRED_TOP_LEVEL_FIELDS.filter((field) => !(field in response));
  if (missingFields.length) {
    return errorResult(
      VALIDATOR_STATUS.BLOCKED_SCHEMA_ERROR,
      missingFields.map((field) => `${field} is required`),
      response,
    );
  }

  const normalizedResponse = {
    ...response,
    schemaVersion: normalizeScalar(response.schemaVersion),
    responseId: normalizeScalar(response.responseId),
    taskIntent: normalizeScalar(response.taskIntent),
    decisionSummary: normalizeScalar(response.decisionSummary),
    fiveLookThreeDefine: normalizeFiveLookThreeDefine(response.fiveLookThreeDefine),
    technicalRoadmap: Array.isArray(response.technicalRoadmap) ? response.technicalRoadmap : [],
    risks: Array.isArray(response.risks) ? response.risks : [],
    missingInputs: Array.isArray(response.missingInputs) ? response.missingInputs : [],
    sourceRequiredItems: Array.isArray(response.sourceRequiredItems) ? response.sourceRequiredItems : [],
    evidenceTrace: Array.isArray(response.evidenceTrace) ? response.evidenceTrace : [],
    pageTrace: Array.isArray(response.pageTrace) ? response.pageTrace : [],
    validatorHints: Array.isArray(response.validatorHints) ? response.validatorHints : [],
    freshnessNotice: normalizeScalar(response.freshnessNotice),
  };

  if (normalizedResponse.taskIntent !== normalizeScalar(request.taskIntent)) {
    return errorResult(VALIDATOR_STATUS.BLOCKED_SCHEMA_ERROR, ["taskIntent must match request.taskIntent"], normalizedResponse);
  }

  if (
    hasEmptyRequiredString(normalizedResponse.schemaVersion)
    || hasEmptyRequiredString(normalizedResponse.responseId)
    || hasEmptyRequiredString(normalizedResponse.taskIntent)
    || hasEmptyRequiredString(normalizedResponse.decisionSummary)
    || hasEmptyRequiredString(normalizedResponse.freshnessNotice)
  ) {
    return errorResult(VALIDATOR_STATUS.BLOCKED_SCHEMA_ERROR, ["required response string fields must be non-empty"], normalizedResponse);
  }

  const requiredFiveLookFields = [
    "lookMarket",
    "lookCustomer",
    "lookCompetition",
    "lookTechnology",
    "lookSelf",
    "defineDirection",
    "defineProduct",
    "definePace",
  ];
  const missingFiveLookFields = requiredFiveLookFields.filter((field) => {
    const value = normalizedResponse.fiveLookThreeDefine[field];
    return !value || hasEmptyRequiredString(value);
  });

  if (missingFiveLookFields.length) {
    return errorResult(
      VALIDATOR_STATUS.BLOCKED_SCHEMA_ERROR,
      missingFiveLookFields.map((field) => `${field} is required in fiveLookThreeDefine`),
      normalizedResponse,
    );
  }

  const invalidMarkers = requiredFiveLookFields.filter((field) => {
    const value = normalizedResponse.fiveLookThreeDefine[field];
    return value && !isMissingValueMarker(value) && hasEmptyRequiredString(value);
  });
  if (invalidMarkers.length) {
    return errorResult(VALIDATOR_STATUS.BLOCKED_SCHEMA_ERROR, invalidMarkers, normalizedResponse);
  }

  if (normalizedResponse.pageTrace.length === 0) {
    return errorResult(VALIDATOR_STATUS.BLOCKED_PAGE_CONTEXT_MISSING, ["pageTrace is required"], normalizedResponse);
  }

  if (hasFactualClaimPayload(normalizedResponse) && normalizedResponse.evidenceTrace.length === 0) {
    return errorResult(VALIDATOR_STATUS.BLOCKED_SOURCE_REQUIRED, ["factual claims require evidenceTrace"], normalizedResponse);
  }

  return {
    ok: true,
    validatorStatus: VALIDATOR_STATUS.PASS,
    renderMode: mapStatusToRenderMode(VALIDATOR_STATUS.PASS),
    allowedToRender: true,
    blockingReasons: [],
    normalizedResponse,
  };
};

