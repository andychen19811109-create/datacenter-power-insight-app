import { validateRequestContract } from "../contracts/requestContract.js";
import { validateResponseContract } from "../contracts/responseContract.js";
import {
  CLAIM_TYPES,
  GENERIC_FILLER_TERMS,
  isBlockedStatus,
  isMissingValueMarker,
  mapStatusToRenderMode,
  SOURCE_TIERS,
  VALIDATOR_STATUS,
} from "../contracts/validatorStatus.js";

const COMMERCIAL_CLAIM_TYPES = new Set([
  CLAIM_TYPES.TAM,
  CLAIM_TYPES.ROI,
  CLAIM_TYPES.MARKET_SHARE,
]);
const CURRENT_SENSITIVE_CLAIMS = new Set([
  CLAIM_TYPES.AIDC_TREND,
  CLAIM_TYPES.TECHNICAL_PARAMETER,
  CLAIM_TYPES.COMPANY_REVENUE,
  CLAIM_TYPES.ANNUAL_REPORT_METRIC,
  CLAIM_TYPES.QUARTERLY_REPORT_METRIC,
  CLAIM_TYPES.PARTNERSHIP_CUSTOMER,
]);

const buildReport = (status, blockingReasons = [], extras = {}) => ({
  validatorStatus: status,
  renderMode: mapStatusToRenderMode(status),
  allowedToRender: status === VALIDATOR_STATUS.PASS || status === VALIDATOR_STATUS.PASS_WITH_WARNINGS,
  blockingReasons,
  warnings: extras.warnings || [],
  missingEvidence: extras.missingEvidence || [],
  objectMismatch: extras.objectMismatch || [],
  pageContextStatus: extras.pageContextStatus || "pass",
  freshnessStatus: extras.freshnessStatus || "current",
  genericFillerFindings: extras.genericFillerFindings || [],
  previousTrackLeakage: extras.previousTrackLeakage || [],
});

const normalizeScalar = (value) => (value == null ? "" : String(value).trim());
const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const buildEvidenceMap = (evidenceTrace = []) => Object.fromEntries(
  evidenceTrace.map((entry) => [
    normalizeScalar(entry.claimId),
    toArray(entry.sourceIds).map((value) => normalizeScalar(value)).filter(Boolean),
  ]),
);

const getExpectedObjectId = (request = {}) =>
  normalizeScalar(
    request.productPlanningCard?.productFamily
    || request.selectedFilters?.productFamily,
  );

const getPrimaryResponseObjectId = (response = {}) => {
  const primaryRole = toArray(response.entityRoles).find((entry) => normalizeScalar(entry.role) === "primary_product_object");
  if (primaryRole?.entityId || primaryRole?.objectId) {
    return normalizeScalar(primaryRole.entityId || primaryRole.objectId);
  }

  return normalizeScalar(response.resolvedObjects?.[0]?.objectId);
};

const hasOfficialSourceTier = (sources = [], tiers = []) => sources.some((source) => tiers.includes(source.sourceTier));

const fieldHasGenericFiller = (value) =>
  typeof value === "string" && GENERIC_FILLER_TERMS.some((term) => value.includes(term));

const collectCoreConclusionFields = (response = {}) => [
  response.decisionSummary,
  response.fiveLookThreeDefine?.defineDirection,
  response.fiveLookThreeDefine?.defineProduct,
  response.fiveLookThreeDefine?.definePace,
  response.fiveLookThreeDefine?.defineRhythm,
].filter(Boolean);

const detectFactualClaims = (response = {}, expandedClaimPack = []) => {
  if (expandedClaimPack.length) return true;

  const textPayload = [
    response.decisionSummary,
    ...toArray(response.risks),
    ...toArray(response.technicalRoadmap).flatMap((item) => Object.values(item || {})),
  ].filter((value) => typeof value === "string");

  return textPayload.some((value) => value && !isMissingValueMarker(value));
};

export const validateAskResponse = ({
  request,
  providerResponse,
  expandedSourcePack = [],
  expandedClaimPack = [],
} = {}) => {
  const requestValidation = validateRequestContract(request);
  if (!requestValidation.ok) {
    return buildReport(requestValidation.validatorStatus, ["VAL_ERR_012", ...requestValidation.blockingReasons], {
      pageContextStatus: "missing",
    });
  }

  const responseValidation = validateResponseContract(providerResponse, requestValidation.normalizedRequest);
  if (!responseValidation.ok) {
    if (responseValidation.validatorStatus === VALIDATOR_STATUS.PROVIDER_ERROR) {
      const fallbackDetected = Boolean(
        providerResponse?.decisionSummary
        || providerResponse?.technicalRoadmap?.length
        || providerResponse?.fiveLookThreeDefine,
      );
      if (fallbackDetected) {
        return buildReport(VALIDATOR_STATUS.BLOCKED_POLICY_VIOLATION, ["VAL_ERR_018", "hidden fallback expert prose after provider_error"], {
          previousTrackLeakage: [],
        });
      }
      return buildReport(VALIDATOR_STATUS.PROVIDER_ERROR, responseValidation.blockingReasons);
    }

    if (responseValidation.validatorStatus === VALIDATOR_STATUS.PROVIDER_TIMEOUT) {
      const fallbackDetected = Boolean(
        providerResponse?.decisionSummary
        || providerResponse?.technicalRoadmap?.length
        || providerResponse?.fiveLookThreeDefine,
      );
      if (fallbackDetected) {
        return buildReport(VALIDATOR_STATUS.BLOCKED_POLICY_VIOLATION, ["VAL_ERR_018", "hidden fallback expert prose after provider_timeout"]);
      }
      return buildReport(VALIDATOR_STATUS.PROVIDER_TIMEOUT, responseValidation.blockingReasons);
    }

    if (responseValidation.blockingReasons.includes("provider response must be a structured JSON object")) {
      return buildReport(VALIDATOR_STATUS.BLOCKED_SCHEMA_ERROR, ["VAL_ERR_017", ...responseValidation.blockingReasons]);
    }

    if (responseValidation.validatorStatus === VALIDATOR_STATUS.BLOCKED_SOURCE_REQUIRED) {
      return buildReport(VALIDATOR_STATUS.BLOCKED_SOURCE_REQUIRED, ["VAL_ERR_013", ...responseValidation.blockingReasons], {
        missingEvidence: [{ requiredField: "evidenceTrace" }],
      });
    }

    return buildReport(responseValidation.validatorStatus, ["VAL_ERR_016", ...responseValidation.blockingReasons]);
  }

  const response = responseValidation.normalizedResponse;
  const evidenceMap = buildEvidenceMap(response.evidenceTrace);
  const expectedObjectId = getExpectedObjectId(requestValidation.normalizedRequest);
  const primaryObjectId = getPrimaryResponseObjectId(response);

  const pageTrace = response.pageTrace[0] || {};
  const pageContextMismatch =
    normalizeScalar(pageTrace.currentPageRoute) !== normalizeScalar(requestValidation.normalizedRequest.currentPageRoute)
    || normalizeScalar(pageTrace.currentPageModule) !== normalizeScalar(requestValidation.normalizedRequest.currentPageModule)
    || normalizeScalar(pageTrace.pageContextHash) !== normalizeScalar(requestValidation.normalizedRequest.pageContextHash)
    || normalizeScalar(pageTrace.productPlanningCardId) !== normalizeScalar(requestValidation.normalizedRequest.productPlanningCard.id)
    || normalizeScalar(pageTrace.productPlanningCardVersion) !== normalizeScalar(requestValidation.normalizedRequest.productPlanningCard.version)
    || normalizeScalar(pageTrace.productPlanningCardStateHash) !== normalizeScalar(requestValidation.normalizedRequest.productPlanningCard.stateHash);
  if (pageContextMismatch) {
    return buildReport(VALIDATOR_STATUS.BLOCKED_PAGE_CONTEXT_MISMATCH, ["pageTrace echo mismatch"], {
      pageContextStatus: "mismatch",
    });
  }

  if (expectedObjectId && primaryObjectId && primaryObjectId !== expectedObjectId) {
    const responseObjectIds = toArray(response.resolvedObjects).map((item) => normalizeScalar(item.objectId));
    if (responseObjectIds.includes(expectedObjectId)) {
      return buildReport(VALIDATOR_STATUS.BLOCKED_OBJECT_MISMATCH, ["VAL_ERR_007", "alternative solution promoted to primary object"], {
        objectMismatch: [{ expectedObjectId, primaryObjectId }],
      });
    }

    return buildReport(VALIDATOR_STATUS.BLOCKED_OBJECT_MISMATCH, ["VAL_ERR_006", "primary object mismatch"], {
      objectMismatch: [{ expectedObjectId, primaryObjectId }],
    });
  }

  if (toArray(response.previousTrackLeakage).length > 0) {
    return buildReport(VALIDATOR_STATUS.BLOCKED_POLICY_VIOLATION, ["VAL_ERR_010", "previous product or page leakage"], {
      previousTrackLeakage: toArray(response.previousTrackLeakage),
    });
  }

  const fillerFindings = collectCoreConclusionFields(response)
    .filter((field) => fieldHasGenericFiller(field))
    .map((field) => ({ field }));
  if (fillerFindings.length > 0) {
    const hasProductObject = Boolean(primaryObjectId);
    const selectedFilters = requestValidation.normalizedRequest.selectedFilters || {};
    const hasContextDimension = Boolean(
      selectedFilters.customerSegment
      || selectedFilters.region
      || selectedFilters.architectureLayer
      || selectedFilters.workloadType
      || selectedFilters.deploymentMode
    );
    const hasEvidenceMarker = response.evidenceTrace.length > 0;
    const hasDecisionStructure = Boolean(
      toArray(response.technicalRoadmap).length
      || response.doorstepGate
      || response.readinessGate
      || toArray(response.risks).length
    );

    if (!(hasProductObject && hasContextDimension && hasEvidenceMarker && hasDecisionStructure)) {
      return buildReport(VALIDATOR_STATUS.BLOCKED_GENERIC_FILLER, ["VAL_ERR_009", "unsupported generic filler"], {
        genericFillerFindings: fillerFindings,
      });
    }
  }

  if (!detectFactualClaims(response, expandedClaimPack) && response.decisionSummary) {
    return buildReport(VALIDATOR_STATUS.PASS, []);
  }

  const sourceById = Object.fromEntries(expandedSourcePack.map((source) => [source.sourceId, source]));

  for (const claim of expandedClaimPack) {
    const supportingSources = claim.sourceIds.map((sourceId) => sourceById[sourceId]).filter(Boolean);
    const traceSourceIds = evidenceMap[claim.claimId] || [];

    if (COMMERCIAL_CLAIM_TYPES.has(claim.claimType) && (claim.sourceIds.length === 0 || traceSourceIds.length === 0)) {
      return buildReport(VALIDATOR_STATUS.BLOCKED_SOURCE_REQUIRED, ["VAL_ERR_001", "missing source for TAM / ROI / market share"], {
        missingEvidence: [{ claimId: claim.claimId, requiredField: "sourceIds/evidenceTrace" }],
      });
    }

    if (
      claim.claimType === CLAIM_TYPES.NAMED_CUSTOMER
      && !hasOfficialSourceTier(supportingSources, [
        SOURCE_TIERS.L3_CUSTOMER_CLOUD_OPERATOR_OFFICIAL,
        SOURCE_TIERS.L4_VENDOR_OFFICIAL,
      ])
    ) {
      return buildReport(VALIDATOR_STATUS.BLOCKED_SOURCE_REQUIRED, ["VAL_ERR_002", "named customer missing official evidence"], {
        missingEvidence: [{ claimId: claim.claimId, requiredField: "officialSource" }],
      });
    }

    if (
      claim.claimType === CLAIM_TYPES.CERTIFICATION
      && !hasOfficialSourceTier(supportingSources, [
        SOURCE_TIERS.L2_STANDARD_INDUSTRY_BODY,
        SOURCE_TIERS.L1_GOVERNMENT_REGULATION,
        SOURCE_TIERS.L4_VENDOR_OFFICIAL,
      ])
    ) {
      return buildReport(VALIDATOR_STATUS.BLOCKED_SOURCE_REQUIRED, ["VAL_ERR_003", "certification evidence missing"], {
        missingEvidence: [{ claimId: claim.claimId, requiredField: "officialCertificationSource" }],
      });
    }

    if (claim.claimType === CLAIM_TYPES.LAUNCH_DATE && !hasOfficialSourceTier(supportingSources, [
      SOURCE_TIERS.L3_CUSTOMER_CLOUD_OPERATOR_OFFICIAL,
      SOURCE_TIERS.L4_VENDOR_OFFICIAL,
      SOURCE_TIERS.L2_STANDARD_INDUSTRY_BODY,
    ])) {
      return buildReport(VALIDATOR_STATUS.BLOCKED_SOURCE_REQUIRED, ["VAL_ERR_004", "launch date evidence missing"], {
        missingEvidence: [{ claimId: claim.claimId, requiredField: "launchDateSource" }],
      });
    }

    if (
      claim.claimType === CLAIM_TYPES.TECHNICAL_PARAMETER
      && (claim.sourceIds.length === 0 || !claim.freshnessStatus)
    ) {
      return buildReport(VALIDATOR_STATUS.BLOCKED_SOURCE_REQUIRED, ["VAL_ERR_005", "technical parameter evidence missing"], {
        missingEvidence: [{ claimId: claim.claimId, requiredField: "sourceIds/freshnessStatus" }],
      });
    }

    if (
      claim.claimType === CLAIM_TYPES.SST_COMMERCIALIZATION
      && !hasOfficialSourceTier(supportingSources, [
        SOURCE_TIERS.L3_CUSTOMER_CLOUD_OPERATOR_OFFICIAL,
        SOURCE_TIERS.L4_VENDOR_OFFICIAL,
      ])
    ) {
      return buildReport(VALIDATOR_STATUS.BLOCKED_POLICY_VIOLATION, ["VAL_ERR_008", "SST commercialization without evidence"]);
    }

    if (traceSourceIds.length === 0 && !isMissingValueMarker(response.decisionSummary)) {
      return buildReport(VALIDATOR_STATUS.BLOCKED_SOURCE_REQUIRED, ["VAL_ERR_013", "factual claim lacks evidenceTrace"], {
        missingEvidence: [{ claimId: claim.claimId, requiredField: "evidenceTrace" }],
      });
    }

    if (CURRENT_SENSITIVE_CLAIMS.has(claim.claimType)) {
      const sourceMissingFreshness = supportingSources.some((source) =>
        !source.publicationDate || !source.lastVerifiedDate || !source.freshnessStatus || source.freshnessStatus === "unknown"
      );
      if (sourceMissingFreshness || !claim.freshnessStatus || claim.freshnessStatus === "unknown") {
        return buildReport(VALIDATOR_STATUS.BLOCKED_FRESHNESS_UNVERIFIED, ["VAL_ERR_014", "freshness fields missing"], {
          freshnessStatus: "realtime_unverified",
        });
      }
    }

    if (claim.consumerModule === "company_intelligence") {
      if (claim.currentness && ["current", "latest", "recent"].includes(claim.currentness) && !claim.freshnessStatus) {
        return buildReport(VALIDATOR_STATUS.BLOCKED_FRESHNESS_UNVERIFIED, ["VAL_ERR_014", "company intelligence freshness unverified"], {
          freshnessStatus: "realtime_unverified",
        });
      }

      if (
        claim.claimType === CLAIM_TYPES.PARTNERSHIP_CUSTOMER
        && !hasOfficialSourceTier(supportingSources, [
          SOURCE_TIERS.L3_CUSTOMER_CLOUD_OPERATOR_OFFICIAL,
          SOURCE_TIERS.L4_VENDOR_OFFICIAL,
        ])
      ) {
        return buildReport(VALIDATOR_STATUS.BLOCKED_SOURCE_REQUIRED, ["VAL_ERR_002", "company partnership missing official source"]);
      }
    }
  }

  const fiveLook = response.fiveLookThreeDefine;
  const requiredFiveLookFields = [
    fiveLook.lookMarket,
    fiveLook.lookCustomer,
    fiveLook.lookCompetition,
    fiveLook.lookTechnology,
    fiveLook.lookSelf,
    fiveLook.defineDirection,
    fiveLook.defineProduct,
    fiveLook.definePace,
  ];
  if (requiredFiveLookFields.some((field) => !field || normalizeScalar(field) === "")) {
    return buildReport(VALIDATOR_STATUS.BLOCKED_SCHEMA_ERROR, ["VAL_ERR_015", "missing or empty fiveLookThreeDefine"]);
  }

  const roadmapYears = toArray(response.technicalRoadmap)
    .map((item) => Number(item?.year))
    .filter((value) => Number.isFinite(value));
  const maxAllowedYear = Number(requestValidation.normalizedRequest.timeWindow?.maxYear);
  if (Number.isFinite(maxAllowedYear) && roadmapYears.some((year) => year > maxAllowedYear)) {
    return buildReport(VALIDATOR_STATUS.BLOCKED_FRESHNESS_UNVERIFIED, ["VAL_ERR_011", "time-window mismatch"], {
      freshnessStatus: "stale",
    });
  }

  return buildReport(VALIDATOR_STATUS.PASS, []);
};

