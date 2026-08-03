import { createDegradedAnalysis } from "./degradedAnalysis.js";

export const createAskRequestId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `ask_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const CLIENT_TIMEOUT_MS = 121_000;

export const resolveClientTimeoutMs = (value = CLIENT_TIMEOUT_MS) => Math.min(
  Math.max(Number(value) || CLIENT_TIMEOUT_MS, 1_000),
  CLIENT_TIMEOUT_MS,
);

export async function analyzeAskPowerInsight({
  question,
  analysisContext,
  requestId = createAskRequestId(),
  fetchImpl = globalThis.fetch,
  timeoutMs = CLIENT_TIMEOUT_MS,
}) {
  if (typeof fetchImpl !== "function") {
    return createDegradedAnalysis({ analysisContext, reason: "client_network_unavailable" });
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolveClientTimeoutMs(timeoutMs));
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
