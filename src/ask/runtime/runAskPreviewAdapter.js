import { buildAskPreviewRuntimeInput } from "./buildAskPreviewRuntimeInput.js";
import { runAskPipelineAdapter } from "./runAskPipelineAdapter.js";

const SENSITIVE_PATTERN = /(authorization|bearer|api[_-]?key|secret|token|env|stack|requestid|pagecontexthash)/i;
const SENSITIVE_KEY_PATTERN = /(authorization|bearer|api[_-]?key|secret|token|env|stack|requestid|pagecontexthash|taskintent|diagnostics|validation|request|timings)/i;
const LOCAL_PREVIEW_LIMITATION_MESSAGE = "当前为本地新管线预览模式，未调用外部 Provider，因此暂不展示完整新管线报告。默认 Ask 结果未受影响。";

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const safeClone = (value, fallback = null) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
};

const normalizeScalar = (value) => (value == null ? "" : String(value).trim());

const sanitizeString = (value, fallback = "") => {
  const normalized = normalizeScalar(value);

  if (!normalized || SENSITIVE_PATTERN.test(normalized)) {
    return fallback;
  }

  return normalized;
};

const sanitizeValue = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce((accumulator, [key, nestedValue]) => {
      if (SENSITIVE_KEY_PATTERN.test(normalizeScalar(key))) {
        return accumulator;
      }

      accumulator[key] = sanitizeValue(nestedValue);
      return accumulator;
    }, {});
  }

  if (typeof value === "string") {
    return sanitizeString(value, "");
  }

  if (
    value == null
    || typeof value === "number"
    || typeof value === "boolean"
  ) {
    return value;
  }

  return safeClone(value, null);
};

const buildSafeRenderState = (renderState = {}) => {
  if (!isPlainObject(renderState)) {
    return null;
  }

  return {
    renderMode: sanitizeString(renderState.renderMode),
    messageType: sanitizeString(renderState.messageType),
    allowedSections: Array.isArray(renderState.allowedSections)
      ? renderState.allowedSections.map((item) => sanitizeString(item)).filter(Boolean)
      : [],
    payload: {
      response: sanitizeValue(renderState.payload?.response),
      warnings: Array.isArray(renderState.payload?.warnings)
        ? renderState.payload.warnings.map((item) => sanitizeValue(item))
        : [],
      blockingReasons: Array.isArray(renderState.payload?.blockingReasons)
        ? renderState.payload.blockingReasons.map((item) => sanitizeValue(item))
        : [],
      missingEvidence: Array.isArray(renderState.payload?.missingEvidence)
        ? renderState.payload.missingEvidence.map((item) => sanitizeValue(item))
        : [],
      sourceRequiredItems: Array.isArray(renderState.payload?.sourceRequiredItems)
        ? renderState.payload.sourceRequiredItems.map((item) => sanitizeValue(item))
        : [],
    },
  };
};

const buildLocalPreviewLimitationRenderState = () => ({
  renderMode: "warning_report",
  messageType: "local_preview_limitation",
  allowedSections: ["warnings"],
  payload: {
    response: null,
    warnings: [LOCAL_PREVIEW_LIMITATION_MESSAGE],
    blockingReasons: [],
    missingEvidence: [],
    sourceRequiredItems: [],
  },
});

const buildPreviewResult = ({
  status,
  renderState = null,
  userMessage = "",
  requestedQuestion = "",
  requestedAt = "",
}) => ({
  status,
  renderState,
  userMessage: sanitizeString(userMessage),
  requestedQuestion: sanitizeString(requestedQuestion),
  requestedAt: sanitizeString(requestedAt),
});

const mapPreviewStatus = (adapterStatus) => {
  if (adapterStatus === "ready") {
    return "ready";
  }

  if (adapterStatus === "warning_report") {
    return "warning";
  }

  if (adapterStatus === "blocked") {
    return "blocked";
  }

  return "error";
};

const buildUserMessage = (status) => {
  switch (status) {
    case "ready":
      return "本地新管线预览已生成。";
    case "warning":
      return "本地新管线预览已生成，包含需要留意的提示。";
    case "blocked":
      return "当前本地新管线预览未满足展示条件。";
    default:
      return "当前仅支持本地实验性预览，本次预览暂不可用。";
  }
};

const hasNoItems = (value) => !Array.isArray(value) || value.length === 0;

const isEmptyPlainObject = (value) => isPlainObject(value) && Object.keys(value).length === 0;

const isProviderDisabledRuntimeInput = (runtimeInput) => (
  runtimeInput?.providerOutcome?.enabled === false
  && runtimeInput?.providerOutcome?.status === "not_used"
  && Array.isArray(runtimeInput.sourceRefs)
  && runtimeInput.sourceRefs.length === 0
  && Array.isArray(runtimeInput.claimRefs)
  && runtimeInput.claimRefs.length === 0
  && isEmptyPlainObject(runtimeInput.providerResponse)
);

const isLocalPreviewLimitation = ({ adapterStatus, adapterResult, runtimeInput }) => {
  if (adapterStatus !== "blocked" || !isProviderDisabledRuntimeInput(runtimeInput)) {
    return false;
  }

  const payload = adapterResult?.renderState?.payload;
  const blockingReasons = Array.isArray(payload?.blockingReasons) ? payload.blockingReasons : [];

  return (
    blockingReasons.includes("VAL_ERR_016")
    && hasNoItems(payload?.missingEvidence)
    && hasNoItems(payload?.sourceRequiredItems)
    && adapterStatus !== "provider_error"
    && adapterStatus !== "provider_timeout"
  );
};

export const runAskPreviewAdapter = async (snapshot = {}, options = {}) => {
  const rawOptions = isPlainObject(options) ? options : {};
  const buildInput = typeof rawOptions.buildInput === "function"
    ? rawOptions.buildInput
    : buildAskPreviewRuntimeInput;
  const adapter = typeof rawOptions.adapter === "function"
    ? rawOptions.adapter
    : runAskPipelineAdapter;
  const requestedQuestion = sanitizeString(snapshot.question || snapshot.userQuestion);
  const requestedAt = sanitizeString(snapshot.timestamp || new Date().toISOString());

  let runtimeInput = {};

  try {
    runtimeInput = buildInput(snapshot);
  } catch {
    return buildPreviewResult({
      status: "error",
      renderState: null,
      userMessage: buildUserMessage("error"),
      requestedQuestion,
      requestedAt,
    });
  }

  if (!isPlainObject(runtimeInput)) {
    return buildPreviewResult({
      status: "error",
      renderState: null,
      userMessage: buildUserMessage("error"),
      requestedQuestion,
      requestedAt,
    });
  }

  try {
    const adapterResult = await adapter(runtimeInput, {
      ...(isPlainObject(rawOptions.adapterOptions) ? rawOptions.adapterOptions : {}),
      providerEnabled: false,
    });

    if (!isPlainObject(adapterResult)) {
      return buildPreviewResult({
        status: "error",
        renderState: null,
        userMessage: buildUserMessage("error"),
        requestedQuestion,
        requestedAt,
      });
    }

    const adapterStatus = normalizeScalar(adapterResult.status);
    const localPreviewLimitation = isLocalPreviewLimitation({
      adapterStatus,
      adapterResult,
      runtimeInput,
    });
    const normalizedAdapterStatus = localPreviewLimitation ? "warning_report" : adapterStatus;
    const previewStatus = mapPreviewStatus(normalizedAdapterStatus);
    const isUnexpectedProviderStatus = adapterStatus === "provider_error" || adapterStatus === "provider_timeout";
    const safeRenderState = localPreviewLimitation
      ? buildLocalPreviewLimitationRenderState()
      : isUnexpectedProviderStatus
      ? null
      : buildSafeRenderState(adapterResult.renderState);

    return buildPreviewResult({
      status: previewStatus,
      renderState: safeRenderState,
      userMessage: localPreviewLimitation ? LOCAL_PREVIEW_LIMITATION_MESSAGE : buildUserMessage(previewStatus),
      requestedQuestion: requestedQuestion || runtimeInput.userQuestion,
      requestedAt: requestedAt || runtimeInput.timestamp,
    });
  } catch {
    return buildPreviewResult({
      status: "error",
      renderState: null,
      userMessage: buildUserMessage("error"),
      requestedQuestion: requestedQuestion || runtimeInput.userQuestion,
      requestedAt: requestedAt || runtimeInput.timestamp,
    });
  }
};
