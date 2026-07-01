import { buildAskShadowRuntimeInput } from "./buildAskShadowRuntimeInput.js";
import { runAskPipelineAdapter } from "./runAskPipelineAdapter.js";

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const dedupe = (items = []) => [...new Set(items.filter(Boolean))].slice(0, 16);

const toNonNegative = (value) => (Number.isFinite(value) && value >= 0 ? value : 0);

const buildSafeResult = ({
  status,
  adapterStatus = "",
  runtimeInput = {},
  reasonCodes = [],
  startedAt = 0,
}) => ({
  safe: true,
  noSecrets: true,
  mode: "shadow",
  status,
  adapterStatus,
  requestId: runtimeInput.requestId || "",
  pageContextHash: runtimeInput.pageContextHash || "",
  taskIntent: runtimeInput.taskIntent || "",
  reasonCodes: dedupe(reasonCodes),
  timings: {
    total_ms: toNonNegative(Date.now() - startedAt),
  },
});

const emitDiagnostics = (callback, payload) => {
  if (typeof callback !== "function") {
    return;
  }

  try {
    callback(payload);
  } catch {
    // Diagnostics callback must not affect shadow execution.
  }
};

const mapShadowStatus = (adapterStatus) => {
  if (adapterStatus === "ready" || adapterStatus === "warning_report") {
    return "shadow_completed";
  }

  return "shadow_blocked";
};

export const runAskShadowAdapter = async (snapshot = {}, options = {}) => {
  const startedAt = Date.now();
  const rawOptions = isPlainObject(options) ? options : {};
  const buildInput = typeof rawOptions.buildInput === "function"
    ? rawOptions.buildInput
    : buildAskShadowRuntimeInput;
  const adapter = typeof rawOptions.adapter === "function"
    ? rawOptions.adapter
    : runAskPipelineAdapter;

  let runtimeInput = {};
  let builderReasonCodes = [];

  try {
    const builtInput = buildInput(snapshot);
    if (!isPlainObject(builtInput)) {
      const failedResult = buildSafeResult({
        status: "shadow_failed",
        reasonCodes: ["shadow_input_build_failed"],
        startedAt,
      });
      emitDiagnostics(rawOptions.onDiagnostics, failedResult);
      return failedResult;
    }

    builderReasonCodes = builtInput.shadowDiagnostics?.reasonCodes || [];
    runtimeInput = {
      ...builtInput,
    };
    delete runtimeInput.shadowDiagnostics;
  } catch {
    const failedResult = buildSafeResult({
      status: "shadow_failed",
      reasonCodes: ["shadow_input_build_failed"],
      startedAt,
    });
    emitDiagnostics(rawOptions.onDiagnostics, failedResult);
    return failedResult;
  }

  try {
    const adapterResult = adapter(runtimeInput, {
      ...(isPlainObject(rawOptions.adapterOptions) ? rawOptions.adapterOptions : {}),
      providerEnabled: false,
    });

    if (!isPlainObject(adapterResult)) {
      const failedResult = buildSafeResult({
        status: "shadow_failed",
        runtimeInput,
        reasonCodes: [...builderReasonCodes, "shadow_adapter_invalid_result"],
        startedAt,
      });
      emitDiagnostics(rawOptions.onDiagnostics, failedResult);
      return failedResult;
    }

    const safeResult = buildSafeResult({
      status: mapShadowStatus(adapterResult.status || ""),
      adapterStatus: String(adapterResult.status || ""),
      runtimeInput,
      reasonCodes: [
        ...builderReasonCodes,
        ...(adapterResult.diagnostics?.reasonCodes || []),
      ],
      startedAt,
    });
    emitDiagnostics(rawOptions.onDiagnostics, safeResult);
    return safeResult;
  } catch {
    const failedResult = buildSafeResult({
      status: "shadow_failed",
      runtimeInput,
      reasonCodes: [...builderReasonCodes, "shadow_adapter_exception"],
      startedAt,
    });
    emitDiagnostics(rawOptions.onDiagnostics, failedResult);
    return failedResult;
  }
};

