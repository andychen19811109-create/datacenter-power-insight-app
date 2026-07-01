import { RENDER_MODE, VALIDATOR_STATUS } from "../contracts/validatorStatus.js";

const COMMON_FORBIDDEN_SECTIONS = Object.freeze([
  "fiveLookThreeDefine",
  "technicalRoadmap",
  "doorstepGate",
  "readinessGate",
  "risks",
]);

export const renderAskReportState = ({ validatorReport = {}, response = {} } = {}) => {
  if (validatorReport.validatorStatus === VALIDATOR_STATUS.PROVIDER_ERROR) {
    return {
      renderMode: RENDER_MODE.PROVIDER_ERROR_CARD,
      allowedSections: ["message", "retryInstruction"],
      forbiddenSections: COMMON_FORBIDDEN_SECTIONS,
      messageType: "provider_error",
      payload: {
        blockingReasons: validatorReport.blockingReasons || [],
      },
    };
  }

  if (validatorReport.validatorStatus === VALIDATOR_STATUS.PROVIDER_TIMEOUT) {
    return {
      renderMode: RENDER_MODE.PROVIDER_TIMEOUT_CARD,
      allowedSections: ["message", "retryInstruction"],
      forbiddenSections: COMMON_FORBIDDEN_SECTIONS,
      messageType: "provider_timeout",
      payload: {
        blockingReasons: validatorReport.blockingReasons || [],
      },
    };
  }

  if (validatorReport.validatorStatus === VALIDATOR_STATUS.USER_INPUT_REQUIRED) {
    return {
      renderMode: RENDER_MODE.USER_INPUT_REQUIRED_CARD,
      allowedSections: ["missingInputs", "clarificationPrompt"],
      forbiddenSections: COMMON_FORBIDDEN_SECTIONS,
      messageType: "user_input_required",
      payload: {
        blockingReasons: validatorReport.blockingReasons || [],
      },
    };
  }

  if (
    validatorReport.validatorStatus === VALIDATOR_STATUS.BLOCKED_PAGE_CONTEXT_MISMATCH
    && validatorReport.pageContextStatus === "mismatch"
  ) {
    return {
      renderMode: RENDER_MODE.DATA_REFRESHED_REGENERATE_REQUIRED_CARD,
      allowedSections: ["blockingReasons", "correctiveInstruction"],
      forbiddenSections: COMMON_FORBIDDEN_SECTIONS,
      messageType: "data_refreshed_regenerate_required",
      payload: {
        blockingReasons: validatorReport.blockingReasons || [],
      },
    };
  }

  if (validatorReport.renderMode === RENDER_MODE.SOURCE_REQUIRED_REPORT) {
    return {
      renderMode: RENDER_MODE.SOURCE_REQUIRED_REPORT,
      allowedSections: ["missingEvidence", "sourceRequiredItems", "claimIds"],
      forbiddenSections: COMMON_FORBIDDEN_SECTIONS,
      messageType: "source_required",
      payload: {
        missingEvidence: validatorReport.missingEvidence || [],
        sourceRequiredItems: response.sourceRequiredItems || [],
      },
    };
  }

  if (validatorReport.renderMode === RENDER_MODE.BLOCKED_REPORT) {
    return {
      renderMode: RENDER_MODE.BLOCKED_REPORT,
      allowedSections: ["blockingReasons", "correctiveInstruction"],
      forbiddenSections: COMMON_FORBIDDEN_SECTIONS,
      messageType: "blocked",
      payload: {
        blockingReasons: validatorReport.blockingReasons || [],
      },
    };
  }

  const hasRequiredMetadata = Boolean(
    Array.isArray(response.evidenceTrace) && response.evidenceTrace.length > 0
    && Array.isArray(response.pageTrace) && response.pageTrace.length > 0
    && validatorReport.validatorStatus
    && response.freshnessNotice
  );

  if (!hasRequiredMetadata) {
    return {
      renderMode: RENDER_MODE.WARNING_REPORT,
      allowedSections: ["decisionSummary", "warnings", "freshnessNotice"],
      forbiddenSections: [],
      messageType: "warning",
      payload: {
        warnings: [...(validatorReport.warnings || []), "required report metadata is incomplete"],
      },
    };
  }

  if (validatorReport.renderMode === RENDER_MODE.WARNING_REPORT) {
    return {
      renderMode: RENDER_MODE.WARNING_REPORT,
      allowedSections: [
        "decisionSummary",
        "fiveLookThreeDefine",
        "technicalRoadmap",
        "doorstepGate",
        "readinessGate",
        "risks",
        "evidenceTrace",
        "pageTrace",
        "freshnessNotice",
        "warnings",
      ],
      forbiddenSections: [],
      messageType: "warning",
      payload: {
        response,
        warnings: validatorReport.warnings || [],
      },
    };
  }

  return {
    renderMode: RENDER_MODE.FULL_REPORT,
    allowedSections: [
      "decisionSummary",
      "fiveLookThreeDefine",
      "technicalRoadmap",
      "doorstepGate",
      "readinessGate",
      "risks",
      "evidenceTrace",
      "pageTrace",
      "freshnessNotice",
    ],
    forbiddenSections: [],
    messageType: "full_report",
    payload: {
      response,
      validatorStatus: validatorReport.validatorStatus,
    },
  };
};
