const SENSITIVE_PATTERN = /(authorization|bearer|api[_-]?key|secret|token|env)/i;

const normalizeScalar = (value) => (value == null ? "" : String(value).trim());

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const stableClone = (value, fallback) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
};

const sanitizeMessage = (value) => {
  const normalized = normalizeScalar(value);
  return SENSITIVE_PATTERN.test(normalized) ? "" : normalized;
};

const buildDiagnostics = (summary, message = "") => ({
  safe: true,
  noSecrets: true,
  summary,
  message: sanitizeMessage(message),
});

export const normalizeProviderOutcome = (providerOutcome = {}, options = {}) => {
  try {
    const rawOutcome = isPlainObject(providerOutcome) ? providerOutcome : {};
    const rawOptions = isPlainObject(options) ? options : {};
    const rawStatus = normalizeScalar(rawOutcome.status || rawOutcome.provider_status || rawOutcome.providerStatus).toLowerCase();
    const placeholderResponse = isPlainObject(rawOutcome.response)
      ? stableClone(rawOutcome.response, {})
      : isPlainObject(rawOutcome.result)
        ? stableClone(rawOutcome.result, {})
        : {};
    const providerDisabled = rawOutcome.enabled === false || rawOptions.providerEnabled === false;
    const hasExceptionShape = Boolean(
      rawOutcome.error
      || rawOutcome.exception
      || rawOutcome.stack
      || rawOutcome.name === "Error"
    );

    if (providerDisabled || (!rawStatus && Object.keys(rawOutcome).length === 0) || rawStatus === "disabled" || rawStatus === "not_used") {
      return {
        provider_status: "not_used",
        status: "ready",
        reasonCodes: [],
        diagnostics: buildDiagnostics("provider_not_used"),
        response: {},
      };
    }

    if (rawOutcome.timeout === true || rawStatus === "timeout" || rawStatus === "provider_timeout") {
      return {
        provider_status: "not_used",
        status: "provider_timeout",
        reasonCodes: ["provider_timeout"],
        diagnostics: buildDiagnostics("provider_timeout", rawOutcome.message),
        response: {},
      };
    }

    if (hasExceptionShape || rawStatus === "provider_error" || rawStatus === "error") {
      return {
        provider_status: "not_used",
        status: "provider_error",
        reasonCodes: ["provider_error"],
        diagnostics: buildDiagnostics("provider_error", rawOutcome.message || rawOutcome.error?.message),
        response: {},
      };
    }

    if (rawOutcome.malformed === true || rawStatus === "malformed" || rawStatus === "invalid") {
      return {
        provider_status: "not_used",
        status: "provider_error",
        reasonCodes: ["provider_malformed_response"],
        diagnostics: buildDiagnostics("provider_malformed_response", rawOutcome.message),
        response: {},
      };
    }

    if ((rawStatus === "placeholder_ready" || rawStatus === "ready" || rawStatus === "ok") && Object.keys(placeholderResponse).length > 0) {
      return {
        provider_status: "placeholder_ready",
        status: "ready",
        reasonCodes: [],
        diagnostics: buildDiagnostics("placeholder_ready"),
        response: placeholderResponse,
      };
    }

    return {
      provider_status: "not_used",
      status: "provider_error",
      reasonCodes: ["provider_malformed_response"],
      diagnostics: buildDiagnostics("provider_malformed_response"),
      response: {},
    };
  } catch {
    return {
      provider_status: "not_used",
      status: "provider_error",
      reasonCodes: ["provider_error"],
      diagnostics: buildDiagnostics("provider_error"),
      response: {},
    };
  }
};
