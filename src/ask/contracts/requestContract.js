import { isRouteModuleConsistent } from "../context/buildPageContext.js";
import { mapStatusToRenderMode, VALIDATOR_STATUS } from "./validatorStatus.js";

const normalizeScalar = (value) => (value == null ? "" : String(value).trim());

const resultFor = (status, blockingReasons = [], normalizedRequest = null) => ({
  ok: status === VALIDATOR_STATUS.PASS,
  validatorStatus: status,
  renderMode: mapStatusToRenderMode(status),
  allowedToRender: status === VALIDATOR_STATUS.PASS,
  blockingReasons,
  normalizedRequest,
});

export const validateRequestContract = (request = {}) => {
  const normalizedRequest = {
    schemaVersion: normalizeScalar(request.schemaVersion),
    requestId: normalizeScalar(request.requestId),
    userQuestion: normalizeScalar(request.userQuestion),
    taskIntent: normalizeScalar(request.taskIntent),
    currentPageRoute: normalizeScalar(request.currentPageRoute),
    currentPageModule: normalizeScalar(request.currentPageModule),
    pageContextHash: normalizeScalar(request.pageContextHash),
    timestamp: normalizeScalar(request.timestamp),
    responseFormat: normalizeScalar(request.responseFormat),
    selectedFilters: request.selectedFilters || {},
    timeWindow: request.timeWindow || {},
    productPlanningCard: {
      id: normalizeScalar(request.productPlanningCard?.id),
      version: normalizeScalar(request.productPlanningCard?.version),
      stateHash: normalizeScalar(request.productPlanningCard?.stateHash),
      productFamily: normalizeScalar(request.productPlanningCard?.productFamily),
      architectureLayer: normalizeScalar(request.productPlanningCard?.architectureLayer),
      customerSegment: normalizeScalar(request.productPlanningCard?.customerSegment),
      region: normalizeScalar(request.productPlanningCard?.region),
      workloadType: normalizeScalar(request.productPlanningCard?.workloadType),
      deploymentMode: normalizeScalar(request.productPlanningCard?.deploymentMode),
    },
    pageContext: {
      ...(request.pageContext || {}),
      pageContextHash: normalizeScalar(request.pageContext?.pageContextHash),
    },
    sourceRefs: Array.isArray(request.sourceRefs) ? request.sourceRefs : [],
    claimRefs: Array.isArray(request.claimRefs) ? request.claimRefs : [],
  };

  if (!normalizedRequest.schemaVersion) {
    return resultFor(VALIDATOR_STATUS.BLOCKED_SCHEMA_ERROR, ["schemaVersion is required"], normalizedRequest);
  }

  if (!normalizedRequest.requestId) {
    return resultFor(VALIDATOR_STATUS.BLOCKED_SCHEMA_ERROR, ["requestId is required"], normalizedRequest);
  }

  if (!normalizedRequest.userQuestion) {
    return resultFor(VALIDATOR_STATUS.BLOCKED_SCHEMA_ERROR, ["userQuestion is required"], normalizedRequest);
  }

  if (!normalizedRequest.taskIntent) {
    return resultFor(VALIDATOR_STATUS.BLOCKED_SCHEMA_ERROR, ["taskIntent is required"], normalizedRequest);
  }

  const missingPageContextFields = [
    ["currentPageRoute", normalizedRequest.currentPageRoute],
    ["currentPageModule", normalizedRequest.currentPageModule],
    ["pageContextHash", normalizedRequest.pageContextHash],
    ["productPlanningCard.id", normalizedRequest.productPlanningCard.id],
    ["productPlanningCard.version", normalizedRequest.productPlanningCard.version],
    ["productPlanningCard.stateHash", normalizedRequest.productPlanningCard.stateHash],
    ["pageContext.pageContextHash", normalizedRequest.pageContext.pageContextHash],
  ].filter(([, value]) => !value);

  if (missingPageContextFields.length) {
    return resultFor(
      VALIDATOR_STATUS.BLOCKED_PAGE_CONTEXT_MISSING,
      missingPageContextFields.map(([field]) => `${field} is required`),
      normalizedRequest,
    );
  }

  if (!isRouteModuleConsistent(normalizedRequest.currentPageRoute, normalizedRequest.currentPageModule)) {
    return resultFor(
      VALIDATOR_STATUS.BLOCKED_PAGE_CONTEXT_MISMATCH,
      ["currentPageRoute/currentPageModule mismatch"],
      normalizedRequest,
    );
  }

  if (normalizedRequest.pageContext.pageContextHash !== normalizedRequest.pageContextHash) {
    return resultFor(
      VALIDATOR_STATUS.BLOCKED_PAGE_CONTEXT_MISMATCH,
      ["pageContext.pageContextHash must match top-level pageContextHash"],
      normalizedRequest,
    );
  }

  if (normalizedRequest.responseFormat && normalizedRequest.responseFormat !== "structured_json_only") {
    return resultFor(
      VALIDATOR_STATUS.BLOCKED_SCHEMA_ERROR,
      ["responseFormat must be structured_json_only"],
      normalizedRequest,
    );
  }

  return resultFor(VALIDATOR_STATUS.PASS, [], normalizedRequest);
};
