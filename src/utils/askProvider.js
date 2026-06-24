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

const buildLocalFallback = (analysis) => (reason) =>
  normalizeLocalContract(analysis, "fallback", reason ? [reason] : []);

const readErrorMessage = async (response) => {
  try {
    const payload = await response.json();
    return payload.error || payload.details || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
};

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
    return localFallback("Fetch API unavailable; fallback to local provider.");
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
      const errorMessage = await readErrorMessage(response);
      return localFallback(`Dify provider request failed: ${errorMessage}`);
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
      ? "Dify provider request timed out."
      : `Dify provider request failed: ${error?.message || "Unknown error"}`;
    return localFallback(reason);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
