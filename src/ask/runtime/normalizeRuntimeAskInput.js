import { CONSUMER_MODULES } from "../contracts/validatorStatus.js";

const ALLOWED_MODES = new Set(["shadow", "preview", "test_only"]);
const SUPPORTED_CONSUMER_MODULES = new Set(Object.values(CONSUMER_MODULES));
const DEFAULT_TIMESTAMP = "1970-01-01T00:00:00.000Z";

const normalizeScalar = (value) => (value == null ? "" : String(value).trim());

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const stableClone = (value, fallback) => {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
};

const cloneObject = (value) => (isPlainObject(value) ? stableClone(value, {}) : {});
const cloneArray = (value) => (Array.isArray(value) ? stableClone(value, []) : []);

const firstNonEmpty = (...values) => {
  for (const value of values) {
    const normalized = normalizeScalar(value);
    if (normalized) {
      return normalized;
    }
  }

  return "";
};

export const normalizeRuntimeAskInput = (runtimeInput = {}, options = {}) => {
  try {
    const rawInput = isPlainObject(runtimeInput) ? runtimeInput : {};
    const rawOptions = isPlainObject(options) ? options : {};
    const modeCandidate = normalizeScalar(rawInput.mode || rawOptions.mode).toLowerCase();
    const mode = ALLOWED_MODES.has(modeCandidate) ? modeCandidate : "test_only";
    const consumerModule = firstNonEmpty(rawInput.consumerModule, rawOptions.consumerModule);
    const blockedReasonCodes = [];

    if (!consumerModule) {
      blockedReasonCodes.push("missing_consumer_module");
    } else if (!SUPPORTED_CONSUMER_MODULES.has(consumerModule)) {
      blockedReasonCodes.push("unsupported_consumer_module");
    }

    return {
      mode,
      consumerModule,
      blockedReasonCodes,
      userQuestion: firstNonEmpty(rawInput.userQuestion, rawInput.question, rawInput.prompt, rawInput.userInput),
      taskIntent: firstNonEmpty(rawInput.taskIntent, rawOptions.defaultTaskIntent, "runtime_adapter_test"),
      currentPageRoute: firstNonEmpty(rawInput.currentPageRoute, rawInput.route),
      currentPageModule: firstNonEmpty(rawInput.currentPageModule, rawInput.module),
      pageContextHash: firstNonEmpty(rawInput.pageContextHash, rawInput.pageContext?.pageContextHash),
      requestId: firstNonEmpty(rawInput.requestId, rawOptions.requestId, "req_runtime_adapter"),
      timestamp: firstNonEmpty(rawInput.timestamp, rawOptions.now, DEFAULT_TIMESTAMP),
      selectedFilters: cloneObject(rawInput.selectedFilters),
      pageContext: cloneObject(rawInput.pageContext),
      productPlanningCard: cloneObject(rawInput.productPlanningCard),
      sourceRefs: cloneArray(rawInput.sourceRefs),
      claimRefs: cloneArray(rawInput.claimRefs),
      evidenceInputs: cloneObject(rawInput.evidenceInputs || rawInput.evidence),
      providerOutcome: cloneObject(rawInput.providerOutcome),
      providerResponse: cloneObject(rawInput.providerResponse),
    };
  } catch {
    return {
      mode: "test_only",
      consumerModule: "",
      blockedReasonCodes: ["missing_consumer_module"],
      userQuestion: "",
      taskIntent: "runtime_adapter_test",
      currentPageRoute: "",
      currentPageModule: "",
      pageContextHash: "",
      requestId: "req_runtime_adapter",
      timestamp: DEFAULT_TIMESTAMP,
      selectedFilters: {},
      pageContext: {},
      productPlanningCard: {},
      sourceRefs: [],
      claimRefs: [],
      evidenceInputs: {},
      providerOutcome: {},
      providerResponse: {},
    };
  }
};
