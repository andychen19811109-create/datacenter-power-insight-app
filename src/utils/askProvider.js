import { analyzeAskQuestion } from "./insightEngine.js";
import { buildDifyRequestPayload } from "./difyRequestPayload.js";
import { normalizeDifyResponseToAskContract } from "./difyResponseNormalizer.js";

const CONTRACT_VERSION = "ask-contract-v1";
const DEFAULT_PROVIDER_TIMEOUT_MS = 120000;

const readProviderTimeoutMs = () => {
  const rawValue = import.meta.env?.VITE_DIFY_PROVIDER_TIMEOUT_MS;
  const value = Number(rawValue || DEFAULT_PROVIDER_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_PROVIDER_TIMEOUT_MS;
};

const ensureList = (value, fallback = []) => Array.isArray(value) ? value : fallback;
const PRODUCTIZED_EXTERNAL_FALLBACK_COPY = "外部专家引擎暂不可用，已回退本地专家规则引擎。";
const PRODUCTIZED_LOCAL_COPY = "当前使用：本地专家规则引擎。";

const normalizeLocalContract = (analysis, providerStatus = "success", extraWarnings = []) => {
  const localContract = analysis.outputContract || {};
  return {
    ...localContract,
    provider: "local",
    contractVersion: CONTRACT_VERSION,
    providerStatus,
    fullText: localContract.fullText || analysis.answer || "",
    fullReportMarkdown: null,
    warnings: [...new Set(extraWarnings.filter(Boolean))],
    fallbackUsed: providerStatus === "fallback",
    whyNow: ensureList(localContract.whyNow, ["本地规则引擎未生成 Why now 列表。"]),
    keyRisks: ensureList(localContract.keyRisks, ["本地规则引擎未生成风险列表。"]),
    nextActions: ensureList(localContract.nextActions, ["本地规则引擎未生成下一步动作。"]),
    evidenceBoundary: ensureList(localContract.evidenceBoundary, ["当前结论来自本地规则引擎。"]),
  };
};

const buildLocalFallback = (analysis) => (reason = PRODUCTIZED_EXTERNAL_FALLBACK_COPY) =>
  normalizeLocalContract(analysis, "fallback", [reason]);

export async function generateAskWithProvider({ question, filters, insightContext }) {
  const analysis = analyzeAskQuestion(question, filters);
  const localFallback = buildLocalFallback(analysis);
  const requestPayload = buildDifyRequestPayload({
    question,
    filters,
    insightContext: insightContext || analysis.rankedContext?.insightContext,
    analysisState: analysis,
  });

  if (typeof fetch !== "function") {
    return localFallback(PRODUCTIZED_LOCAL_COPY);
  }

  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeout = controller
    ? setTimeout(() => controller.abort(), readProviderTimeoutMs())
    : null;

  try {
    const response = await fetch("/api/ask-dify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        difyInputs: requestPayload.difyInputs,
        requestPayload,
      }),
      signal: controller?.signal,
    });

    if (!response.ok) {
      return localFallback(PRODUCTIZED_EXTERNAL_FALLBACK_COPY);
    }

    const rawDifyResponse = await response.json();
    return normalizeDifyResponseToAskContract({
      rawDifyResponse,
      question,
      filters,
      requestPayload: { ...requestPayload, analysisState: analysis },
      localFallback,
    });
  } catch (error) {
    const reason = error?.name === "AbortError"
      ? PRODUCTIZED_EXTERNAL_FALLBACK_COPY
      : PRODUCTIZED_EXTERNAL_FALLBACK_COPY;
    return localFallback(reason);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
