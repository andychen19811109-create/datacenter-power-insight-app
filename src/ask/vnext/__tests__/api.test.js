import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  R2_CORE_BASELINE,
  R2_CORE_IDENTITY,
  buildDifyChatRequest,
  callDifyAnalysis,
  executeAskPowerInsight,
  resolveDifyTimeoutMs,
} from "../../../../api/ask-power-insight.js";
import { buildAnalysisContext } from "../buildAnalysisContext.js";
import { resolveClientTimeoutMs } from "../askPowerInsightClient.js";

const context = buildAnalysisContext({ question: "800VDC在AI数据中心供电架构中的机会和风险是什么？" });
const body = { action: "analyze", question: context.original_question, analysisContext: context, requestId: "API_TEST" };
const finalAnswer = `# 核心结论
- 800VDC应按设施、机架与服务器侧边界分层验证。

## 技术路径
- 先比较现有HVDC与机架级备电的适用条件。

## 验证Gate与主要风险
- 核实保护、维护与认证边界。

## 证据与待验证
- 需要补充目标客户的实际运行数据。`;

test("R2-1.3 request preserves the raw question and maps the canonical input contract", () => {
  const request = buildDifyChatRequest({ question: body.question, analysisContext: context, requestId: body.requestId, userId: "test-user" });
  assert.equal(request.query, body.question);
  assert.equal(request.response_mode, "blocking");
  assert.equal(request.inputs.track, "800VDC");
  assert.equal(request.inputs.application, "AI数据中心");
  assert.deepEqual(Object.keys(request.inputs).sort(), [
    "analysis_goal", "application", "customer_type", "extra_context", "known_competitors",
    "page_ctx", "region", "time_horizon", "track",
  ]);
  assert.equal(request.inputs.extra_context, "");
  assert.doesNotMatch(request.inputs.extra_context, /R2|baseline|context_id|task_type/i);
  assert.equal(JSON.parse(request.inputs.page_ctx).page_time_filter, "");
  assert.equal(request.inputs.region, "未提供");
});

test("multi-scope question context remains intact from request payload through report title", async () => {
  const question = "针对AI数据中心电源和液冷基础设施，比较两家厂商的竞争差异。";
  const multiScopeContext = buildAnalysisContext({ question });
  const request = buildDifyChatRequest({ question, analysisContext: multiScopeContext, requestId: "MULTI_SCOPE", userId: "test-user" });
  assert.equal(request.query, question);
  assert.equal(request.inputs.track, "电源 / 液冷");
  const result = await executeAskPowerInsight({ action: "analyze", question, analysisContext: multiScopeContext, requestId: "MULTI_SCOPE" }, {
    callDify: async () => ({ payload: { answer: "## 核心结论\n- 需要按电源和液冷的系统边界分别验证。" }, latency_ms: 1 }),
  });
  assert.equal(result.payload.mode, "report");
  assert.match(result.payload.report.title, /电源、液冷/);
});

test("Live R2 path uses a 120-second upper bound", () => {
  assert.equal(resolveDifyTimeoutMs(undefined), 120_000);
  assert.equal(resolveDifyTimeoutMs("162000"), 120_000);
  assert.equal(resolveDifyTimeoutMs("90000"), 90_000);
  assert.equal(resolveClientTimeoutMs(), 120_000);
  assert.equal(resolveClientTimeoutMs(162_000), 120_000);
});

test("final R2 answer reaches the renderer without a v2 draft adapter or report composer", async () => {
  const source = await readFile(new URL("../../../../api/ask-power-insight.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /normalizeDifyAnalysisDraft|runDcpiAnalysisAdapter|composeAskStandardReportWithAudit/);
  const result = await executeAskPowerInsight(body, {
    callDify: async () => ({ payload: { answer: finalAnswer }, latency_ms: 21 }),
  });
  assert.equal(result.status, 200);
  assert.equal(result.payload.mode, "report");
  assert.equal(result.payload.provider.version, R2_CORE_BASELINE);
  assert.deepEqual(result.payload.provider.identity, R2_CORE_IDENTITY);
  assert.equal(result.payload.request_trace.core_identity.name, R2_CORE_IDENTITY.name);
  assert.equal(result.payload.request_trace.snapshot_id, context.canonical_input.snapshot_id);
  assert.match(result.payload.report.summary.join("\n"), /800VDC应按设施/);
  assert.match(result.payload.report.sections.find((section) => section.title === "验证Gate与主要风险").items.join("\n"), /保护、维护与认证边界/);
  assert.match(result.payload.report.sections.find((section) => section.title === "证据与待验证").items.join("\n"), /实际运行数据/);
  assert.deepEqual(result.payload.performance, {
    total_latency_ms: result.payload.performance.total_latency_ms,
    dify_latency_ms: 21,
    timeout: false,
    degraded: false,
  });
});

test("provider failures and missing final answer become related degraded analysis", async () => {
  for (const reason of ["provider_4xx", "provider_5xx", "provider_timeout", "network_error"]) {
    const result = await executeAskPowerInsight(body, { callDify: async () => { throw new Error(reason); } });
    assert.equal(result.payload.mode, "degraded");
    assert.match(result.payload.report.one_line_conclusion, /800VDC/);
    assert.equal(result.payload.performance.degraded, true);
    assert.equal(result.payload.performance.timeout, reason === "provider_timeout");
  }
  const empty = await executeAskPowerInsight(body, { callDify: async () => ({ payload: { answer: "" }, latency_ms: 4 }) });
  assert.equal(empty.payload.mode, "degraded");
});

test("explicit internal R2 output fails closed without returning raw answer", async () => {
  const leakedAnswer = `# 决策摘要\n- 不应展示这段文本。\n\n\`\`\`json\n{"task_profile":"internal"}\n\`\`\``;
  const result = await executeAskPowerInsight(body, {
    callDify: async () => ({ payload: { answer: leakedAnswer }, latency_ms: 4 }),
  });
  assert.equal(result.status, 200);
  assert.equal(result.payload.mode, "degraded");
  assert.doesNotMatch(JSON.stringify(result.payload), /task_profile|internal/);
});

test("one analysis request performs exactly one live provider call with no retry", async () => {
  let calls = 0;
  const result = await executeAskPowerInsight(body, {
    callDify: async () => {
      calls += 1;
      throw new Error("provider_timeout");
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.payload.mode, "degraded");
});

test("callDify classifies HTTP failures without leaking response body", async () => {
  const fetch4xx = async () => ({ ok: false, status: 401, text: async () => JSON.stringify({ message: "secret detail" }) });
  const fetch5xx = async () => ({ ok: false, status: 503, text: async () => JSON.stringify({ message: "internal" }) });
  await assert.rejects(callDifyAnalysis({ question: body.question, analysisContext: context, requestId: "4", apiBaseUrl: "https://example.test/v1", apiKey: "test", fetchImpl: fetch4xx }), /provider_4xx/);
  await assert.rejects(callDifyAnalysis({ question: body.question, analysisContext: context, requestId: "5", apiBaseUrl: "https://example.test/v1", apiKey: "test", fetchImpl: fetch5xx }), /provider_5xx/);
});

test("illegal request fields and stale context bindings fail closed", async () => {
  assert.equal((await executeAskPowerInsight({ ...body, extra: true })).status, 422);
  assert.equal((await executeAskPowerInsight({ ...body, question: `${body.question} changed` })).status, 422);
});

test("each request starts a new Dify conversation and sends page context", () => {
  const request = buildDifyChatRequest({ question: body.question, analysisContext: context, requestId: "NEW_CONVERSATION", userId: "test-user" });
  assert.equal(Object.hasOwn(request, "conversation_id"), false);
  assert.deepEqual(JSON.parse(request.inputs.page_ctx), context.canonical_input.page_ctx.value);
});
