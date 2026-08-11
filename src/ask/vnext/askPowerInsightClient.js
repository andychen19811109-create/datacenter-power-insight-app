import { createDegradedAnalysis } from "./degradedAnalysis.js";

export const createAskRequestId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `ask_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export const R2_CLIENT_TIMEOUT_MAX_MS = 120_000;

export const resolveClientTimeoutMs = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return R2_CLIENT_TIMEOUT_MAX_MS;
  return Math.min(parsed, R2_CLIENT_TIMEOUT_MAX_MS);
};

export async function analyzeAskPowerInsight({
  question,
  analysisContext,
  requestId = createAskRequestId(),
  fetchImpl = globalThis.fetch,
  timeoutMs = R2_CLIENT_TIMEOUT_MAX_MS,
}) {
  if (typeof fetchImpl !== "function") {
    return createDegradedAnalysis({ analysisContext, reason: "client_network_unavailable" });
  }
  const controller = new AbortController();
  const resolvedTimeoutMs = resolveClientTimeoutMs(timeoutMs);
  const timeout = resolvedTimeoutMs > 0
    ? setTimeout(() => controller.abort(), resolvedTimeoutMs)
    : null;
  try {
    const response = await fetchImpl("/api/ask-power-insight", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "analyze",
        question: String(question || "").trim(),
        analysisContext,
        requestId,
      }),
    });
    const payload = await response.json();
    if (!response.ok || !["report", "clarification", "degraded"].includes(payload?.mode)) {
      return createDegradedAnalysis({ analysisContext, reason: "client_response_invalid" });
    }
    return payload;
  } catch {
    return createDegradedAnalysis({ analysisContext, reason: "client_network_error" });
  } finally {
    clearTimeout(timeout);
  }
}
