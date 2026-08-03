import { validateAnalysisContext } from "../src/ask/vnext/contracts/analysisContext.js";
import { normalizeDifyAnalysisDraft } from "../src/ask/vnext/difyDraftNormalizer.js";
import { runDcpiAnalysisAdapter } from "../src/ask/vnext/analysisAdapter.js";
import { composeAskStandardReportWithAudit } from "../src/ask/vnext/reportComposer.js";
import { createDegradedAnalysis } from "../src/ask/vnext/degradedAnalysis.js";
import { createObservabilityRecord } from "../src/ask/vnext/observability.js";

const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_TIMEOUT_MS = 120_000;
const MAX_BODY_BYTES = 128_000;
export const DIFY_BASELINE_VERSION = "V2.2";

const DIFY_V22_DEFAULT_VALUE = "未提供";
const V22_TASK_GOALS = Object.freeze({
  PRODUCT_INITIATIVE: "评估产品立项、市场窗口、能力差距、投入等级、验证Gate和退出条件",
  TECHNOLOGY_ROUTE: "评估技术路线的机会、限制、风险、架构边界、替代路线和验证路径",
  INVESTMENT_COMPARISON: "按投资主体、周期、对象层级和风险偏好进行情景化风险收益比较",
  COMPETITIVE_ANALYSIS: "比较厂商在指定产品、技术和场景中的能力、证据边界与不能外推的结论",
  PORTFOLIO_PLANNING: "形成分阶段产品组合与资源配置建议、验证Gate和退出条件",
  TREND_PRIORITIZATION: "按时间窗口、证据充分性和商业化条件比较技术赛道",
  UNKNOWN: "形成带对象边界、风险、证据限制和验证路径的专业分析",
});

const V22_LOCAL_ROUTES = Object.freeze({
  PRODUCT_INITIATIVE: "product_roadmap",
  TECHNOLOGY_ROUTE: "architecture_impact",
  INVESTMENT_COMPARISON: "entity_comparison",
  COMPETITIVE_ANALYSIS: "entity_comparison",
  PORTFOLIO_PLANNING: "entity_roadmap_impact",
  TREND_PRIORITIZATION: "entity_comparison",
  UNKNOWN: "generic_domain_entity",
});

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

export const resolveDifyTimeoutMs = (value = process.env.DIFY_TIMEOUT_MS) => {
  const parsed = Number(value || DEFAULT_TIMEOUT_MS);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(parsed, MAX_TIMEOUT_MS);
};

const joinV22Input = (values) => values?.length ? values.join(" / ") : DIFY_V22_DEFAULT_VALUE;

export const buildDifyChatRequest = ({ question, analysisContext, requestId, userId }) => {
  const taskType = analysisContext.task_type;
  const localRoute = V22_LOCAL_ROUTES[taskType] || V22_LOCAL_ROUTES.UNKNOWN;
  const guardrailMode = ["PRODUCT_INITIATIVE", "INVESTMENT_COMPARISON"].includes(taskType)
    ? "investment"
    : "explanation";
  const extraContext = [
    "【DCPI MVP vNext Application Adapter Context】",
    `baseline=${DIFY_BASELINE_VERSION}`,
    `analysis_context_schema_version=${analysisContext.schema_version}`,
    `request_id=${requestId}`,
    `task_type=${taskType}`,
    `local_route=${localRoute}`,
    `local_intent=${taskType.toLowerCase()}`,
    `guardrail_mode=${guardrailMode}`,
    "guardrail_note=V2.2内容必须由vNext Adapter复核对象、任务、证据、数字、矛盾和情景边界。",
    "用户问题和用户澄清优先于页面筛选条件；不相关筛选条件不得改变核心结论。",
    "Dify输出仅作为分析草稿，之后必须通过DCPI Analysis Adapter和Report Composer。",
    "不得输出无来源精确数字；多对象问题不得压缩为单一对象；不确定内容必须条件化。",
    `analysis_context_json=${JSON.stringify(analysisContext)}`,
  ].join("\n");

  return {
    inputs: {
      track: joinV22Input(analysisContext.product_or_technology),
      application: joinV22Input(analysisContext.application_scenarios),
      region: joinV22Input(analysisContext.regions),
      customer_type: joinV22Input(analysisContext.customer_types),
      analysis_goal: V22_TASK_GOALS[taskType] || V22_TASK_GOALS.UNKNOWN,
      known_competitors: joinV22Input(analysisContext.companies),
      time_horizon: analysisContext.time_horizon && analysisContext.time_horizon !== "unknown"
        ? analysisContext.time_horizon
        : DIFY_V22_DEFAULT_VALUE,
      extra_context: extraContext,
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
  timeoutMs = resolveDifyTimeoutMs(),
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
  const timeout = setTimeout(() => controller.abort(), Math.min(timeoutMs, MAX_TIMEOUT_MS));
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
  const startedAt = Date.now();
  if (!hasExactKeys(body, ["action", "question", "analysisContext", "requestId"])
    || body.action !== "analyze"
    || typeof body.question !== "string"
    || !body.question.trim()
    || typeof body.requestId !== "string"
    || !body.requestId.trim()) {
    return { status: 422, payload: { mode: "invalid_request", message: "请求格式无效，请修改问题后重试。" } };
  }
  const contextValidation = validateAnalysisContext(body.analysisContext);
  if (!contextValidation.valid || body.analysisContext.original_question !== body.question.trim()) {
    return { status: 422, payload: { mode: "invalid_request", message: "分析上下文已变化，请重新开始分析。" } };
  }

  try {
    const providerStartedAt = Date.now();
    const provider = await (dependencies.callDify || callDifyAnalysis)({
      question: body.question.trim(),
      analysisContext: body.analysisContext,
      requestId: body.requestId,
      ...dependencies.providerOptions,
    });
    const normalizeStartedAt = Date.now();
    const draft = normalizeDifyAnalysisDraft({
      rawResponse: provider.payload,
      requestId: body.requestId,
      question: body.question.trim(),
      analysisContext: body.analysisContext,
    });
    const normalizeMs = Date.now() - normalizeStartedAt;
    const adapterStartedAt = Date.now();
    const adapter = runDcpiAnalysisAdapter({ draft, analysisContext: body.analysisContext });
    const adapterMs = Date.now() - adapterStartedAt;
    if (adapter.status === "NEEDS_CLARIFICATION") {
      return {
        status: 200,
        payload: {
          mode: "clarification",
          questions: adapter.clarification_questions,
          analysisContext: body.analysisContext,
        },
      };
    }
    if (!adapter.draft || adapter.status === "UNSUPPORTED") {
      return {
        status: 200,
        payload: createDegradedAnalysis({ analysisContext: body.analysisContext, reason: "analysis_outside_supported_boundary" }),
      };
    }
    const composerStartedAt = Date.now();
    const composed = composeAskStandardReportWithAudit({ adapterResult: adapter, analysisContext: body.analysisContext });
    const composerMs = Date.now() - composerStartedAt;
    const diagnostics = dependencies.includeObservability ? {
      observability: createObservabilityRecord({
        startedAt,
        stages: {
          request_build_ms: provider.request_build_ms || 0,
          dify_roundtrip_ms: provider.latency_ms || Date.now() - providerStartedAt,
          normalize_ms: normalizeMs,
          adapter_ms: adapterMs,
          publication_guardrail_ms: composed.publication_guardrail_ms,
          composer_ms: composerMs,
        },
        rawOutput: provider.payload?.answer,
        draft,
        report: composed.report,
        audit: composed.audit,
      }),
    } : {};
    return {
      status: 200,
      payload: {
        mode: "report",
        report: composed.report,
        analysisContext: body.analysisContext,
        provider: {
          available: true,
          version: DIFY_BASELINE_VERSION,
          latency_ms: provider.latency_ms,
        },
        ...(dependencies.includeObservability ? { diagnostics } : {}),
      },
    };
  } catch (error) {
    return {
      status: 200,
      payload: createDegradedAnalysis({
        analysisContext: body.analysisContext,
        reason: ["provider_timeout", "provider_4xx", "provider_5xx", "provider_configuration_missing", "provider_response_non_json"]
          .includes(error?.message) ? error.message : "provider_output_invalid",
      }),
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
