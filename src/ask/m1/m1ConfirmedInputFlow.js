import {
  createM1InputDraft,
  validateM1ConfirmedInput,
} from "./contracts/m1ConfirmedInput.js";
import { validateM1InputContext } from "./contracts/m1InputContext.js";
import {
  M1_INPUT_RESOLUTION_ERROR_CODES,
  classifyM1InputResolutionError,
  createM1FallbackConfirmationRequired,
  createM1ReadyForConfirmation,
  validateM1ResolutionDraft,
} from "./m1InputResolution.js";

export const M1_CONFIRMED_INPUT_SUBMISSION_ACTION = "m1_confirmed_input";
export const M1_DECISION_CORE_ACCEPTED_MODE = "m1_decision_core_accepted";

const isNonEmptyString = (value) => (
  typeof value === "string" && value.trim().length > 0
);

const matchAll = (question, pattern) => [...String(question).matchAll(pattern)].map((match) => match[0]);
const firstMatch = (question, pattern) => String(question).match(pattern)?.[0] || "unknown";
const unique = (values) => [...new Set(values)];

const fallbackDecisionIntent = (question) => {
  const text = String(question);
  if (/比较|架构|路线|compare|versus|vs\.?/i.test(text)) return "ARCHITECTURE_CHOICE";
  if (/升级|upgrade/i.test(text)) return "PRODUCT_UPGRADE";
  if (/开发|定义|build|develop/i.test(text)) return "PRODUCT_DEVELOPMENT";
  if (/适配|评估|fit|assess/i.test(text)) return "PRODUCT_FIT_ASSESSMENT";
  return "PRODUCT_INVESTMENT";
};

export const buildM1FallbackContext = (question) => {
  const text = String(question || "");
  const powerValues = unique(matchAll(text, /\b\d+(?:\.\d+)?\s*(?:MW|kW)\b/gi));
  const region = firstMatch(
    text,
    /\bREGION_[A-Z0-9_]+\b|中国|北美|欧洲|亚太|全球|东南亚|中东/i,
  );
  const customer = firstMatch(
    text,
    /\b(?:CUSTOMER|ACCOUNT|ORG)_[A-Z0-9_]+\b|(?:客户|customer)\s*[:：]?\s*[A-Z0-9_\-\u4e00-\u9fff]{2,30}/i,
  );
  const products = unique(matchAll(text, /模块化\s*UPS|模块机|UPS|BBU|HVDC|800VDC|大功率电源/gi));
  const primaryProduct = products.find((item) => /UPS|模块机|大功率电源/i.test(item))
    || (products.length > 1 ? "POWER_ARCHITECTURE_DECISION" : products[0])
    || "unknown";
  const architectureAlternatives = products.filter((item) => item !== primaryProduct);
  const conflictingPower = powerValues.length > 1;

  return {
    schema_version: "m1.input.v1",
    context_id: `fallback_${Date.now()}`,
    raw_user_question: text,
    decision_intent: fallbackDecisionIntent(text),
    primary_product_object: primaryProduct,
    architecture_alternatives: architectureAlternatives,
    application_scenario: firstMatch(text, /智算中心|AI\s*数据中心|数据中心|GPU\s*集群|colocation|data\s*(?:center|hall)/i),
    target_customer: customer,
    region,
    power_or_system_scope: conflictingPower ? "conflicting" : powerValues[0] || "unknown",
    investment_or_product_stage: "unknown",
    target_timing: "unknown",
    critical_constraints: [],
    stated_evidence: [],
    assumptions: [],
    unknowns: [
      ...(customer === "unknown" ? ["target_customer"] : []),
      ...(region === "unknown" ? ["region"] : []),
      ...(powerValues.length === 0 ? ["power_or_system_scope"] : []),
    ],
    contradictions: conflictingPower
      ? [{ field: "power_or_system_scope", values: powerValues, explanation: "原问题包含多个规模值。" }]
      : [],
    clarification_required: false,
    clarification_question: null,
    clarification_reason: null,
    recognition_confidence: 0,
    field_provenance: {},
  };
};

export const createM1FallbackResolution = ({
  question,
  reasonCode,
  validationErrors = [],
}) => {
  const errorCode = classifyM1InputResolutionError({
    reasonCode,
    validationErrors,
  });
  const draft = createM1InputDraft({
    question,
    inputContext: buildM1FallbackContext(question),
    sourceMode: "fallback",
    reasonCode: errorCode,
  });
  return createM1FallbackConfirmationRequired({
    question,
    draft,
    errorCode,
  });
};

const resolveProviderDraft = ({ question, draft }) => {
  const validation = validateM1ResolutionDraft(draft, {
    expectedQuestion: String(question ?? ""),
  });
  if (!validation.ok) {
    return createM1FallbackResolution({
      question,
      reasonCode: "input_draft_invalid",
      validationErrors: validation.errors,
    });
  }
  return createM1ReadyForConfirmation({ question, draft });
};

export const createM1InputResolutionFromUnderstandingResult = ({
  question,
  result,
}) => {
  if (result?.mode === "m1_input_draft") {
    return resolveProviderDraft({
      question,
      draft: result.inputDraft,
    });
  }
  if (result?.mode === "m1_input_context") {
    const contextValidation = validateM1InputContext(result.inputContext, {
      expectedQuestion: String(question ?? ""),
    });
    if (!contextValidation.ok) {
      return createM1FallbackResolution({
        question,
        reasonCode: "input_context_invalid",
        validationErrors: contextValidation.errors,
      });
    }
    const draft = createM1InputDraft({
      question,
      inputContext: result.inputContext,
      sourceMode: "provider",
    });
    return resolveProviderDraft({ question, draft });
  }
  return createM1FallbackResolution({
    question,
    reasonCode: result?.reasonCode || M1_INPUT_RESOLUTION_ERROR_CODES.PROVIDER_UNAVAILABLE,
    validationErrors: result?.validationErrors,
  });
};

export const requestM1InputResolution = async ({
  question,
  fetchImpl = globalThis.fetch,
  endpoint = "/api/m1-input-understanding",
}) => {
  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
    });
  } catch {
    return createM1FallbackResolution({
      question,
      reasonCode: M1_INPUT_RESOLUTION_ERROR_CODES.PROVIDER_UNAVAILABLE,
    });
  }
  let result = null;
  try {
    result = await response.json();
  } catch {
    return createM1FallbackResolution({
      question,
      reasonCode: M1_INPUT_RESOLUTION_ERROR_CODES.JSON_INVALID,
    });
  }
  if (!response.ok && result?.mode !== "m1_input_unavailable") {
    result = {
      mode: "m1_input_unavailable",
      reasonCode: M1_INPUT_RESOLUTION_ERROR_CODES.PROVIDER_UNAVAILABLE,
    };
  }
  return createM1InputResolutionFromUnderstandingResult({ question, result });
};

export const submitM1ConfirmedInputToDecisionCore = async ({
  confirmedInput,
  fetchImpl = globalThis.fetch,
  endpoint = "/api/m1-input-understanding",
}) => {
  const validation = validateM1ConfirmedInput(confirmedInput, {
    expectedQuestion: confirmedInput?.original_question,
  });
  if (!validation.ok || typeof fetchImpl !== "function") {
    throw new Error("m1_confirmed_input_submission_invalid");
  }

  let response;
  try {
    response = await fetchImpl(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: M1_CONFIRMED_INPUT_SUBMISSION_ACTION,
        confirmedInput,
      }),
    });
  } catch {
    throw new Error("m1_decision_core_submission_unavailable");
  }

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error("m1_decision_core_submission_invalid_response");
  }

  if (!response.ok
    || result?.mode !== M1_DECISION_CORE_ACCEPTED_MODE
    || !isNonEmptyString(result.requestId)
    || !/^[a-f0-9]{64}$/.test(String(result.confirmedInputHash || ""))
    || result.confirmedInputSchemaVersion !== "m1.confirmed-input.v1"
    || result.confirmationStatus !== confirmedInput.confirmation_status) {
    throw new Error("m1_decision_core_submission_rejected");
  }

  return {
    mode: result.mode,
    requestId: result.requestId,
    confirmedInputHash: result.confirmedInputHash,
    confirmedInputSchemaVersion: result.confirmedInputSchemaVersion,
    confirmationStatus: result.confirmationStatus,
  };
};
