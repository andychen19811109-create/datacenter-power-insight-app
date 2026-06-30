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
    whyNow: ensureList(localContract.whyNow, ["当前产品规划合同未生成市场窗口列表。"]),
    keyRisks: ensureList(localContract.keyRisks, ["当前产品规划合同未生成风险列表。"]),
    nextActions: ensureList(localContract.nextActions, ["当前产品规划合同未生成下一步动作。"]),
    evidenceBoundary: ensureList(localContract.evidenceBoundary, ["当前结论来自产品规划合同，缺失事实按证据边界处理。"]),
  };
};

const buildLocalFallback = (analysis) => (reason) =>
  normalizeLocalContract(
    analysis,
    "fallback",
    reason ? ["外部增强暂不可用；已使用产品规划合同生成，证据边界保持不变。"] : []
  );

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
    insightContext: {
      ...(insightContext || analysis.rankedContext?.insightContext || {}),
      productPlanningCard: analysis.outputContract?.productPlanningCard,
      pageSynthesisContract: analysis.outputContract?.pageSynthesisContract,
      evidenceBoundary: analysis.outputContract?.evidenceBoundary,
    },
    analysisState: analysis,
  });

  if (typeof fetch !== "function") {
    return localFallback("external_unavailable");
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
      await readErrorMessage(response);
      return localFallback("external_unavailable");
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
      ? "external_timeout"
      : "external_unavailable";
    return localFallback(reason);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
