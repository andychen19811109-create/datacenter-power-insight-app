import { validateAnalysisContext } from "../src/ask/vnext/contracts/analysisContext.js";
import { validateCanonicalAnalysisInput } from "../src/ask/vnext/contracts/canonicalAnalysisInput.js";
import { createR2FinalReport } from "../src/ask/vnext/r2FinalReport.js";
import { createDegradedAnalysis } from "../src/ask/vnext/degradedAnalysis.js";
import { R2_CORE_BASELINE, R2_CORE_IDENTITY } from "./_r2-core-identity.js";

export { R2_CORE_BASELINE, R2_CORE_IDENTITY } from "./_r2-core-identity.js";

const MAX_BODY_BYTES = 128_000;
export const R2_TIMEOUT_MAX_MS = 120_000;
export const config = { maxDuration: 120 };

const R2_DEFAULT_VALUE = "未提供";

const json = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
};

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const hasExactKeys = (value, keys) => isPlainObject(value)
  && Object.keys(value).sort().join("|") === [...keys].sort().join("|");
const trimBaseUrl = (value) => String(value || "").trim().replace(/\/+$/, "");

const readBody = async (req) => {
  // Vercel dev may parse application/json before the function handler runs.
  if (isPlainObject(req.body)) return req.body;

  if (typeof req.body === "string" && req.body.trim()) {
    if (Buffer.byteLength(req.body, "utf8") > MAX_BODY_BYTES) {
      throw new Error("request_body_too_large");
    }
    return JSON.parse(req.body);
  }

  if (Buffer.isBuffer(req.body)) {
    if (req.body.length > MAX_BODY_BYTES) {
      throw new Error("request_body_too_large");
    }
    return JSON.parse(req.body.toString("utf8") || "{}");
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("request_body_too_large");
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
};

export const resolveDifyTimeoutMs = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return R2_TIMEOUT_MAX_MS;
  return Math.min(parsed, R2_TIMEOUT_MAX_MS);
};

const joinR2Input = (values) => values?.length ? values.join(" / ") : R2_DEFAULT_VALUE;
const scalarR2Input = (value) => String(value || "").trim() || R2_DEFAULT_VALUE;

export const buildDifyChatRequest = ({ question, analysisContext, requestId, userId }) => {
  const canonicalInput = analysisContext.canonical_input;
  const validation = validateCanonicalAnalysisInput(canonicalInput);
  if (!validation.valid || canonicalInput.question.value !== String(question || "").trim()) {
    throw new Error("canonical_input_invalid");
  }

  return {
    inputs: {
      track: joinR2Input(canonicalInput.track.value),
      application: joinR2Input(canonicalInput.application.value),
      region: joinR2Input(canonicalInput.region.value),
      customer_type: joinR2Input(canonicalInput.customer_type.value),
      analysis_goal: scalarR2Input(canonicalInput.analysis_goal.value),
      known_competitors: joinR2Input(canonicalInput.known_competitors.value),
      time_horizon: scalarR2Input(canonicalInput.time_horizon.value),
      extra_context: canonicalInput.extra_context.value,
      page_ctx: JSON.stringify(canonicalInput.page_ctx.value),
    },
    query: question,
    response_mode: "blocking",
    user: userId,
  };
};

export async function callDifyAnalysis({
  question,
  analysisContext,
  requestId,
  apiBaseUrl = process.env.DIFY_API_BASE_URL,
  apiKey = process.env.DIFY_API_KEY,
  userId = process.env.DIFY_USER_ID || "dcpi-mvp-vnext",
  timeoutMs = resolveDifyTimeoutMs(process.env.DIFY_TIMEOUT_MS),
  fetchImpl = globalThis.fetch,
}) {
  const baseUrl = trimBaseUrl(apiBaseUrl);
  if (!baseUrl || !String(apiKey || "").trim()) throw new Error("provider_configuration_missing");
  if (typeof fetchImpl !== "function") throw new Error("provider_fetch_unavailable");
  const controller = new AbortController();
  const startedAt = Date.now();
  const requestStartedAt = Date.now();
  const request = buildDifyChatRequest({ question, analysisContext, requestId, userId });
  const requestBuildMs = Date.now() - requestStartedAt;
  const timeout = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetchImpl(`${baseUrl}/chat-messages`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    const rawText = await response.text();
    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch {
      throw new Error("provider_response_non_json");
    }
    if (!response.ok) throw new Error(response.status >= 500 ? "provider_5xx" : "provider_4xx");
    return {
      payload,
      latency_ms: Date.now() - startedAt,
      request_build_ms: requestBuildMs,
      conversation_id: payload.conversation_id || null,
      message_id: payload.message_id || payload.id || null,
    };
  } catch (error) {
    if (error?.name === "AbortError") throw new Error("provider_timeout");
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function executeAskPowerInsight(body, dependencies = {}) {
  const executionStartedAt = Date.now();
  if (!hasExactKeys(body, ["action", "question", "analysisContext", "requestId"])
    || body.action !== "analyze"
    || typeof body.question !== "string"
    || !body.question.trim()
    || typeof body.requestId !== "string"
    || !body.requestId.trim()) {
    return { status: 422, payload: { mode: "invalid_request", message: "请求格式无效，请修改问题后重试。" } };
  }
  const contextValidation = validateAnalysisContext(body.analysisContext);
  const canonicalValidation = validateCanonicalAnalysisInput(body.analysisContext?.canonical_input);
  if (!contextValidation.valid
    || !canonicalValidation.valid
    || body.analysisContext.original_question !== body.question.trim()
    || body.analysisContext.canonical_input.question.value !== body.question.trim()) {
    return { status: 422, payload: { mode: "invalid_request", message: "分析上下文已变化，请重新开始分析。" } };
  }

  try {
    const provider = await (dependencies.callDify || callDifyAnalysis)({
      question: body.question.trim(),
      analysisContext: body.analysisContext,
      requestId: body.requestId,
      ...dependencies.providerOptions,
    });
    const report = createR2FinalReport({
      answer: provider.payload?.answer,
      analysisContext: body.analysisContext,
    });
    return {
      status: 200,
      payload: {
        mode: "report",
        report,
        analysisContext: body.analysisContext,
        canonicalInput: body.analysisContext.canonical_input,
        request_trace: {
          request_id: body.requestId,
          snapshot_id: body.analysisContext.canonical_input.snapshot_id,
          core_identity: R2_CORE_IDENTITY,
          conversation_id: provider.conversation_id,
          message_id: provider.message_id,
        },
        provider: {
          available: true,
          identity: R2_CORE_IDENTITY,
          version: R2_CORE_IDENTITY.name,
          latency_ms: provider.latency_ms,
        },
        performance: {
          total_latency_ms: Date.now() - executionStartedAt,
          dify_latency_ms: provider.latency_ms,
          timeout: false,
          degraded: false,
        },
      },
    };
  } catch (error) {
    const degradedReason = ["provider_timeout", "provider_4xx", "provider_5xx", "provider_configuration_missing", "provider_response_non_json"]
      .includes(error?.message) ? error.message : "provider_output_invalid";
    return {
      status: 200,
      payload: {
        ...createDegradedAnalysis({
          analysisContext: body.analysisContext,
          reason: degradedReason,
        }),
        analysisContext: body.analysisContext,
        canonicalInput: body.analysisContext.canonical_input,
        request_trace: {
          request_id: body.requestId,
          snapshot_id: body.analysisContext.canonical_input.snapshot_id,
          core_identity: R2_CORE_IDENTITY,
          conversation_id: null,
          message_id: null,
        },
        performance: {
          total_latency_ms: Date.now() - executionStartedAt,
          dify_latency_ms: null,
          timeout: degradedReason === "provider_timeout",
          degraded: true,
        },
      },
    };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { mode: "invalid_request", message: "仅支持POST请求。" });
    return;
  }
  let body;
  try {
    body = await readBody(req);
  } catch {
    json(res, 400, { mode: "invalid_request", message: "请求内容无法读取。" });
    return;
  }
  const result = await executeAskPowerInsight(body);
  json(res, result.status, result.payload);
}
