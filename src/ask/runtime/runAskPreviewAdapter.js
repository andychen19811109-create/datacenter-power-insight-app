import { buildAskPreviewRuntimeInput } from "./buildAskPreviewRuntimeInput.js";
import { runAskPipelineAdapter } from "./runAskPipelineAdapter.js";

const SENSITIVE_PATTERN = /(authorization|bearer|api[_-]?key|secret|token|env|stack|requestid|pagecontexthash)/i;
const SENSITIVE_KEY_PATTERN = /(authorization|bearer|api[_-]?key|secret|token|env|stack|requestid|pagecontexthash|taskintent|diagnostics|validation|request|timings)/i;

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
    const previewStatus = mapPreviewStatus(adapterStatus);
    const isUnexpectedProviderStatus = adapterStatus === "provider_error" || adapterStatus === "provider_timeout";
    const safeRenderState = isUnexpectedProviderStatus
      ? null
      : buildSafeRenderState(adapterResult.renderState);

    return buildPreviewResult({
      status: previewStatus,
      renderState: safeRenderState,
      userMessage: buildUserMessage(previewStatus),
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
