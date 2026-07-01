import { buildPageContext } from "../context/buildPageContext.js";
import { buildProductPlanningCardContext } from "../context/buildProductPlanningCardContext.js";
import { mapStatusToRenderMode, VALIDATOR_STATUS } from "../contracts/validatorStatus.js";
import { buildAskRequest } from "../orchestrator/buildAskRequest.js";
import { hydrateEvidencePacks } from "../orchestrator/hydrateEvidencePacks.js";
import { renderAskReportState } from "../renderer/renderAskReportState.js";
import { validateAskResponse } from "../validator/validateAskResponse.js";
import { normalizeProviderOutcome } from "./normalizeProviderOutcome.js";
import { normalizeRuntimeAskInput } from "./normalizeRuntimeAskInput.js";

const DEFAULT_PHASE2B = Object.freeze({
  buildPageContext,
  buildProductPlanningCardContext,
  buildAskRequest,
  hydrateEvidencePacks,
  validateAskResponse,
  renderAskReportState,
});

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const safeClone = (value, fallback = null) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
};

const dedupe = (items = []) => [...new Set(items.filter(Boolean))];

const sanitizeNormalizedInput = (normalizedInput = {}) => ({
  ...normalizedInput,
  evidenceInputs: {},
  providerOutcome: {},
  providerResponse: {},
});

const buildTiming = (startedAt) => {
  const elapsed = Date.now() - startedAt;
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : 0;
};

const createBaseResult = ({ mode, status, request = null, validation = {}, renderState = {}, diagnostics = {} }) => ({
  mode,
  status,
  request: safeClone(request, {}),
  validation: safeClone(validation, {}),
  renderState: safeClone(renderState, {}),
  diagnostics: {
    safe: true,
    reasonCodes: dedupe(diagnostics.reasonCodes || []),
    timings: {
      adapter_overhead_ms: Number.isFinite(diagnostics.timings?.adapter_overhead_ms)
        ? Math.max(0, diagnostics.timings.adapter_overhead_ms)
        : 0,
    },
    noSecrets: true,
  },
});

const buildReportStub = (validatorStatus, blockingReasons = []) => ({
  validatorStatus,
  renderMode: mapStatusToRenderMode(validatorStatus),
  allowedToRender: false,
  blockingReasons,
  warnings: [],
});

const buildFallbackRenderState = (validatorReport = {}) => ({
  renderMode: mapStatusToRenderMode(validatorReport.validatorStatus || VALIDATOR_STATUS.PROVIDER_ERROR),
  messageType: validatorReport.validatorStatus || VALIDATOR_STATUS.PROVIDER_ERROR,
  safe: true,
  fallbackReason: "adapter_render_state_unavailable",
});

const safeRenderAskReportState = (phase2b, validatorReport = {}, response = {}) => {
  try {
    return {
      renderState: safeClone(
        phase2b.renderAskReportState({ validatorReport, response }),
        buildFallbackRenderState(validatorReport),
      ),
      didFallback: false,
    };
  } catch {
    return {
      renderState: buildFallbackRenderState(validatorReport),
      didFallback: true,
    };
  }
};

const mapHydrationReasonsToCodes = (hydration = {}, consumerModule = "") => {
  const reasons = hydration.blockingReasons || [];
  const codes = [];

  for (const reason of reasons) {
    if (reason.includes("does not apply to claim") || reason.includes("is excluded by appliesToModules")) {
      codes.push("applies_to_modules_mismatch");
      if (consumerModule === "company_intelligence") {
        codes.push("company_intelligence_ask_only_source");
      }
    }
    if (reason.includes("cannot rely on L5_local_kb alone")) {
      codes.push("l5_local_kb_hard_fact_blocked");
    }
    if (reason.includes("cannot rely on L6_uncorroborated_reference")) {
      codes.push("l6_uncorroborated_reference_hard_fact_blocked");
    }
    if (reason.includes("outside freshness window")) {
      codes.push("stale_l4_fresh_l5_laundering_blocked");
    }
  }

  return dedupe(codes);
};

const mapStatusToAdapterStatus = (validatorReport = {}, renderState = {}) => {
  if (validatorReport.validatorStatus === VALIDATOR_STATUS.PROVIDER_TIMEOUT) {
    return "provider_timeout";
  }
  if (validatorReport.validatorStatus === VALIDATOR_STATUS.PROVIDER_ERROR) {
    return "provider_error";
  }
  if (
    validatorReport.validatorStatus === VALIDATOR_STATUS.PASS_WITH_WARNINGS
    || renderState.renderMode === "warning_report"
  ) {
    return "warning_report";
  }
  if (validatorReport.validatorStatus === VALIDATOR_STATUS.PASS) {
    return "ready";
  }
  return "blocked";
};

const createRendererFailureResult = ({ phase2b, normalizedInput, validation = {}, startedAt }) => {
  const validatorReport = buildReportStub(VALIDATOR_STATUS.PROVIDER_ERROR, ["adapter_unhandled_exception"]);
  const { renderState } = safeRenderAskReportState(phase2b, validatorReport, {});

  return createBaseResult({
    mode: normalizedInput.mode,
    status: "provider_error",
    request: {},
    validation,
    renderState,
    diagnostics: {
      reasonCodes: ["adapter_unhandled_exception"],
      timings: { adapter_overhead_ms: buildTiming(startedAt) },
    },
  });
};

export const runAskPipelineAdapter = (runtimeInput = {}, options = {}) => {
  const startedAt = Date.now();
  const rawOptions = isPlainObject(options) ? options : {};
  const phase2b = {
    ...DEFAULT_PHASE2B,
    ...(isPlainObject(rawOptions.phase2b) ? rawOptions.phase2b : {}),
  };
  const normalizedInput = normalizeRuntimeAskInput(runtimeInput, rawOptions);

  try {
    if (normalizedInput.blockedReasonCodes.includes("missing_consumer_module")) {
      const validatorReport = buildReportStub(VALIDATOR_STATUS.BLOCKED_SCHEMA_ERROR, ["missing_consumer_module"]);
      const { renderState, didFallback } = safeRenderAskReportState(phase2b, validatorReport, {});
      return createBaseResult({
        mode: normalizedInput.mode,
        status: "blocked",
        request: {},
        validation: {
          normalizedInput: sanitizeNormalizedInput(normalizedInput),
          requestContract: validatorReport,
        },
        renderState,
        diagnostics: {
          reasonCodes: didFallback
            ? ["missing_consumer_module", "adapter_unhandled_exception"]
            : ["missing_consumer_module"],
          timings: { adapter_overhead_ms: buildTiming(startedAt) },
        },
      });
    }

    if (normalizedInput.blockedReasonCodes.includes("unsupported_consumer_module")) {
      const validatorReport = buildReportStub(VALIDATOR_STATUS.BLOCKED_SCHEMA_ERROR, ["unsupported_consumer_module"]);
      const { renderState, didFallback } = safeRenderAskReportState(phase2b, validatorReport, {});
      return createBaseResult({
        mode: normalizedInput.mode,
        status: "blocked",
        request: {},
        validation: {
          normalizedInput: sanitizeNormalizedInput(normalizedInput),
          requestContract: validatorReport,
        },
        renderState,
        diagnostics: {
          reasonCodes: didFallback
            ? ["unsupported_consumer_module", "adapter_unhandled_exception"]
            : ["unsupported_consumer_module"],
          timings: { adapter_overhead_ms: buildTiming(startedAt) },
        },
      });
    }

    const pageContext = phase2b.buildPageContext({
      currentPageRoute: normalizedInput.currentPageRoute,
      currentPageModule: normalizedInput.currentPageModule,
      selectedFilters: normalizedInput.selectedFilters,
      pageContext: normalizedInput.pageContext,
      productPlanningCard: normalizedInput.productPlanningCard,
    });
    const productPlanningCard = phase2b.buildProductPlanningCardContext(normalizedInput.productPlanningCard);
    const requestContract = phase2b.buildAskRequest({
      requestId: normalizedInput.requestId,
      userQuestion: normalizedInput.userQuestion,
      taskIntent: normalizedInput.taskIntent,
      currentPageRoute: normalizedInput.currentPageRoute || pageContext.currentPageRoute,
      currentPageModule: normalizedInput.currentPageModule || pageContext.currentPageModule,
      pageContextHash: normalizedInput.pageContextHash || pageContext.pageContextHash,
      timestamp: normalizedInput.timestamp,
      selectedFilters: normalizedInput.selectedFilters,
      productPlanningCard,
      pageContext,
      sourceRefs: normalizedInput.sourceRefs,
      claimRefs: normalizedInput.claimRefs,
    });

    if (!requestContract.ok) {
      const { renderState, didFallback } = safeRenderAskReportState(phase2b, requestContract, {});
      return createBaseResult({
        mode: normalizedInput.mode,
        status: "blocked",
        request: requestContract.normalizedRequest || {},
        validation: {
          normalizedInput: sanitizeNormalizedInput(normalizedInput),
          requestContract,
        },
        renderState,
        diagnostics: {
          reasonCodes: dedupe([
            ...(requestContract.blockingReasons || []),
            ...(didFallback ? ["adapter_unhandled_exception"] : []),
          ]),
          timings: { adapter_overhead_ms: buildTiming(startedAt) },
        },
      });
    }

    const request = requestContract.normalizedRequest || {};
    const registry = rawOptions.registry || normalizedInput.evidenceInputs.registry || normalizedInput.evidenceInputs;
    const hydration = phase2b.hydrateEvidencePacks({
      sourceRefs: request.sourceRefs,
      claimRefs: request.claimRefs,
      registry,
      now: normalizedInput.timestamp,
    });

    if (hydration.validatorStatus !== VALIDATOR_STATUS.PASS) {
      const reasonCodes = mapHydrationReasonsToCodes(hydration, normalizedInput.consumerModule);
      const { renderState, didFallback } = safeRenderAskReportState(phase2b, hydration, {});
      return createBaseResult({
        mode: normalizedInput.mode,
        status: "blocked",
        request,
        validation: {
          normalizedInput: sanitizeNormalizedInput(normalizedInput),
          requestContract,
          hydration,
        },
        renderState,
        diagnostics: {
          reasonCodes: didFallback
            ? dedupe([...reasonCodes, "adapter_unhandled_exception"])
            : reasonCodes,
          timings: { adapter_overhead_ms: buildTiming(startedAt) },
        },
      });
    }

    const provider = normalizeProviderOutcome(
      normalizedInput.providerOutcome,
      { providerEnabled: rawOptions.providerEnabled },
    );

    if (provider.status === "provider_timeout") {
      const validatorReport = buildReportStub(VALIDATOR_STATUS.PROVIDER_TIMEOUT, provider.reasonCodes);
      const { renderState, didFallback } = safeRenderAskReportState(phase2b, validatorReport, {});
      return createBaseResult({
        mode: normalizedInput.mode,
        status: "provider_timeout",
        request,
        validation: {
          normalizedInput: sanitizeNormalizedInput(normalizedInput),
          requestContract,
          hydration,
          provider,
        },
        renderState,
        diagnostics: {
          reasonCodes: didFallback
            ? dedupe([...provider.reasonCodes, "adapter_unhandled_exception"])
            : provider.reasonCodes,
          timings: { adapter_overhead_ms: buildTiming(startedAt) },
        },
      });
    }

    if (provider.status === "provider_error") {
      const validatorReport = buildReportStub(VALIDATOR_STATUS.PROVIDER_ERROR, provider.reasonCodes);
      const { renderState, didFallback } = safeRenderAskReportState(phase2b, validatorReport, {});
      return createBaseResult({
        mode: normalizedInput.mode,
        status: "provider_error",
        request,
        validation: {
          normalizedInput: sanitizeNormalizedInput(normalizedInput),
          requestContract,
          hydration,
          provider,
        },
        renderState,
        diagnostics: {
          reasonCodes: didFallback
            ? dedupe([...provider.reasonCodes, "adapter_unhandled_exception"])
            : provider.reasonCodes,
          timings: { adapter_overhead_ms: buildTiming(startedAt) },
        },
      });
    }

    const providerResponse = Object.keys(provider.response || {}).length > 0
      ? provider.response
      : (Object.keys(normalizedInput.providerResponse || {}).length > 0 ? normalizedInput.providerResponse : safeClone(rawOptions.providerResponse, {}));
    const validatorReport = phase2b.validateAskResponse({
      request,
      providerResponse,
      expandedSourcePack: hydration.expandedSourcePack,
      expandedClaimPack: hydration.expandedClaimPack,
    });
    const { renderState, didFallback } = safeRenderAskReportState(phase2b, validatorReport, providerResponse);

    if (didFallback) {
      return createRendererFailureResult({
        phase2b,
        normalizedInput,
        validation: {
          normalizedInput: sanitizeNormalizedInput(normalizedInput),
          requestContract,
          hydration,
          provider,
          validatorReport,
        },
        startedAt,
      });
    }

    return createBaseResult({
      mode: normalizedInput.mode,
      status: mapStatusToAdapterStatus(validatorReport, renderState),
      request,
      validation: {
        normalizedInput: sanitizeNormalizedInput(normalizedInput),
        requestContract,
        hydration,
        provider,
        validatorReport,
      },
      renderState,
      diagnostics: {
        reasonCodes: dedupe([
          ...provider.reasonCodes,
          ...mapHydrationReasonsToCodes(hydration, normalizedInput.consumerModule),
        ]),
        timings: { adapter_overhead_ms: buildTiming(startedAt) },
      },
    });
  } catch {
    return createRendererFailureResult({
      phase2b,
      normalizedInput,
      validation: {
        normalizedInput: sanitizeNormalizedInput(normalizedInput),
      },
      startedAt,
    });
  }
};
