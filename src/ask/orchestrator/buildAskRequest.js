import { buildPageContext } from "../context/buildPageContext.js";
import { buildProductPlanningCardContext } from "../context/buildProductPlanningCardContext.js";
import { validateRequestContract } from "../contracts/requestContract.js";
import { mapStatusToRenderMode, VALIDATOR_STATUS } from "../contracts/validatorStatus.js";

const FACTUAL_QUESTION_PATTERN = /latest|recent|current|revenue|annual report|quarterly|partnership|customer win|新闻|最新|当前|最近|营收|年报|季报|合作|客户|参数|认证|发布时间|launch|certification/i;
const PRODUCT_FAMILY_CUES = [
  "cdu",
  "liquid_cooling_cdu",
  "hvdc",
  "ups",
  "sst",
  "bbu",
];

const buildResult = (status, blockingReasons, normalizedRequest = null) => ({
  ok: status === VALIDATOR_STATUS.PASS,
  validatorStatus: status,
  renderMode: mapStatusToRenderMode(status),
  allowedToRender: status === VALIDATOR_STATUS.PASS,
  blockingReasons,
  normalizedRequest,
});

const detectMentionedFamilies = (question = "") => {
  const normalized = String(question || "").toLowerCase();
  return PRODUCT_FAMILY_CUES.filter((term) => normalized.includes(term));
};

export const buildAskRequest = (input = {}) => {
  const pageContext = input.pageContext?.pageContextHash
    ? input.pageContext
    : buildPageContext({
        currentPageRoute: input.currentPageRoute,
        currentPageModule: input.currentPageModule,
        selectedFilters: input.selectedFilters,
        pageContext: input.pageContext,
        productPlanningCard: input.productPlanningCard,
      });
  const productPlanningCard = input.productPlanningCard?.stateHash
    ? input.productPlanningCard
    : buildProductPlanningCardContext(input.productPlanningCard);

  const request = {
    schemaVersion: input.schemaVersion || "1.0.0",
    requestId: input.requestId || "req_local_phase2b",
    userQuestion: input.userQuestion || "",
    taskIntent: input.taskIntent || "",
    currentPageRoute: input.currentPageRoute || pageContext.currentPageRoute,
    currentPageModule: input.currentPageModule || pageContext.currentPageModule,
    pageContextHash: input.pageContextHash || pageContext.pageContextHash,
    timestamp: input.timestamp || new Date().toISOString(),
    selectedFilters: input.selectedFilters || pageContext.selectedFilters || {},
    productPlanningCard,
    pageContext: {
      ...(input.pageContext || pageContext),
      pageContextHash: input.pageContextHash || pageContext.pageContextHash,
    },
    sourceRefs: Array.isArray(input.sourceRefs) ? input.sourceRefs : [],
    claimRefs: Array.isArray(input.claimRefs) ? input.claimRefs : [],
    responseFormat: "structured_json_only",
  };

  const requestValidation = validateRequestContract(request);
  if (!requestValidation.ok) {
    return requestValidation;
  }

  const normalizedRequest = requestValidation.normalizedRequest;
  const selectedFilters = normalizedRequest.selectedFilters || {};
  const missingInputs = [];

  if (!selectedFilters.customerSegment) {
    missingInputs.push("customerSegment");
  }
  if (!selectedFilters.region) {
    missingInputs.push("region");
  }
  if (!selectedFilters.architectureLayer) {
    missingInputs.push("technicalObjective");
  }

  const mentionedFamilies = detectMentionedFamilies(normalizedRequest.userQuestion);
  const selectedProductFamily = selectedFilters.productFamily || normalizedRequest.productPlanningCard.productFamily;

  if (!selectedProductFamily && mentionedFamilies.length > 1) {
    return buildResult(VALIDATOR_STATUS.USER_INPUT_REQUIRED, ["ambiguous product family"], normalizedRequest);
  }

  if (selectedProductFamily && mentionedFamilies.length > 1 && !mentionedFamilies.includes(selectedProductFamily.toLowerCase())) {
    return buildResult(VALIDATOR_STATUS.BLOCKED_OBJECT_MISMATCH, ["question conflicts with selected product family"], normalizedRequest);
  }

  if (!selectedProductFamily) {
    return buildResult(VALIDATOR_STATUS.USER_INPUT_REQUIRED, ["productFamily is required"], normalizedRequest);
  }

  if (missingInputs.length) {
    return buildResult(
      VALIDATOR_STATUS.USER_INPUT_REQUIRED,
      missingInputs.map((field) => `${field} is required`),
      normalizedRequest,
    );
  }

  if (
    FACTUAL_QUESTION_PATTERN.test(normalizedRequest.userQuestion)
    && normalizedRequest.sourceRefs.length === 0
    && normalizedRequest.claimRefs.length === 0
  ) {
    return buildResult(
      VALIDATOR_STATUS.SOURCE_REQUIRED,
      ["factual claim requires sourceRefs or claimRefs"],
      normalizedRequest,
    );
  }

  return requestValidation;
};

