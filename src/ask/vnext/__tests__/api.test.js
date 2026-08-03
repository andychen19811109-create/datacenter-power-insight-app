import test from "node:test";
import assert from "node:assert/strict";
import {
  DIFY_BASELINE_VERSION,
  buildDifyChatRequest,
  callDifyAnalysis,
  executeAskPowerInsight,
  resolveDifyTimeoutMs,
} from "../../../../api/ask-power-insight.js";
import { buildAnalysisContext } from "../buildAnalysisContext.js";
import { createTestOnlyDraft } from "../fixtures/difyFixtures.js";
import { resolveClientTimeoutMs } from "../askPowerInsightClient.js";

const context = buildAnalysisContext({ question: "800VDC在AI数据中心供电架构中的机会和风险是什么？" });
const body = { action: "analyze", question: context.original_question, analysisContext: context, requestId: "API_TEST" };

test("Dify V2.2 request keeps raw question in query and maps vNext context into published inputs", () => {
  const request = buildDifyChatRequest({ question: body.question, analysisContext: context, requestId: body.requestId, userId: "test-user" });
  assert.equal(request.query, body.question);
  assert.equal(request.response_mode, "blocking");
  assert.equal(request.inputs.track, "800VDC");
  assert.equal(request.inputs.application, "AI数据中心");
  assert.deepEqual(Object.keys(request.inputs).sort(), [
    "analysis_goal",
    "application",
    "customer_type",
    "extra_context",
    "known_competitors",
    "region",
    "time_horizon",
    "track",
  ]);
  assert.match(request.inputs.extra_context, /baseline=V2\.2/);
  assert.match(request.inputs.extra_context, new RegExp(context.context_id));
  assert.match(request.inputs.extra_context, /local_route=architecture_impact/);
  assert.match(request.inputs.extra_context, /local_intent=technology_route/);
  assert.match(request.inputs.extra_context, /guardrail_mode=explanation/);
  assert.equal(Object.hasOwn(request.inputs, "analysis_context_json"), false);
  assert.equal(Object.hasOwn(request.inputs, "task_type"), false);
  assert.equal(Object.hasOwn(request.inputs, "request_id"), false);
  assert.equal(Object.hasOwn(request.inputs, "query"), false);

  const investmentContext = buildAnalysisContext({
    question: "从产业投资角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？",
  });
  const investmentRequest = buildDifyChatRequest({
    question: investmentContext.original_question,
    analysisContext: investmentContext,
    requestId: "V22_MULTI_OBJECT",
    userId: "test-user",
  });
  assert.equal(investmentRequest.inputs.track, "BBU / 液冷 / GaN/SiC");
  assert.match(investmentRequest.inputs.extra_context, /guardrail_mode=investment/);
  assert.equal(investmentRequest.inputs.time_horizon, "未提供");
});

test("timeout is 30 seconds by default and hard-capped at 120 seconds", () => {
  assert.equal(resolveDifyTimeoutMs(undefined), 30_000);
  assert.equal(resolveDifyTimeoutMs("90000"), 90_000);
  assert.equal(resolveDifyTimeoutMs("150000"), 120_000);
  assert.equal(resolveDifyTimeoutMs("12000"), 12_000);
  assert.equal(resolveClientTimeoutMs(), 121_000);
  assert.equal(resolveClientTimeoutMs(150_000), 121_000);
});

test("valid JSON draft passes Adapter and Composer through API boundary", async () => {
  const result = await executeAskPowerInsight(body, {
    callDify: async () => ({ payload: { answer: JSON.stringify(createTestOnlyDraft(context, body.requestId)) }, latency_ms: 21 }),
  });
  assert.equal(result.status, 200);
  assert.equal(result.payload.mode, "report");
  assert.equal(result.payload.report.schema_version, "dcpi.ask-report.v1");
  assert.equal(result.payload.report.status, "CONDITIONAL");
  assert.equal(result.payload.provider.version, DIFY_BASELINE_VERSION);
});

test("TEST_ONLY observability records all stages without raw content or credentials", async () => {
  const result = await executeAskPowerInsight(body, {
    includeObservability: true,
    callDify: async () => ({ payload: { answer: JSON.stringify(createTestOnlyDraft(context, body.requestId)) }, latency_ms: 21, request_build_ms: 2 }),
  });
  const telemetry = result.payload.diagnostics.observability;
  assert.deepEqual(Object.keys(telemetry).sort(), [
    "adapter_ms", "composer_ms", "dify_roundtrip_ms", "filtered_claim_count", "normalize_ms",
    "normalized_claim_count", "publication_guardrail_ms", "published_claim_count", "raw_output_chars",
    "request_build_ms", "total_ms",
  ]);
  assert.equal(telemetry.request_build_ms, 2);
  assert.equal(telemetry.dify_roundtrip_ms, 21);
  assert.equal(typeof telemetry.raw_output_chars, "number");
  assert.doesNotMatch(JSON.stringify(telemetry), /TEST_ONLY|api[_-]?key|bearer/i);
});

test("provider 4xx, 5xx, timeout, network, invalid JSON and empty output all become related degraded analysis", async () => {
  for (const reason of ["provider_4xx", "provider_5xx", "provider_timeout", "network_error"]) {
    const result = await executeAskPowerInsight(body, { callDify: async () => { throw new Error(reason); } });
    assert.equal(result.payload.mode, "degraded");
    assert.match(result.payload.report.one_line_conclusion, /800VDC/);
  }
  const invalid = await executeAskPowerInsight(body, { callDify: async () => ({ payload: { answer: "not json or markdown" }, latency_ms: 4 }) });
  assert.equal(invalid.payload.mode, "degraded");
  const empty = await executeAskPowerInsight(body, { callDify: async () => ({ payload: { answer: "" }, latency_ms: 4 }) });
  assert.equal(empty.payload.mode, "degraded");
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

test("callDify classifies provider HTTP failures without leaking response body", async () => {
  const fetch4xx = async () => ({ ok: false, status: 401, text: async () => JSON.stringify({ message: "secret detail" }) });
  const fetch429 = async () => ({ ok: false, status: 429, text: async () => JSON.stringify({ message: "rate detail" }) });
  const fetch5xx = async () => ({ ok: false, status: 503, text: async () => JSON.stringify({ message: "internal" }) });
  const fetchInvalidJson = async () => ({ ok: true, status: 200, text: async () => "not-json" });
  await assert.rejects(callDifyAnalysis({ question: body.question, analysisContext: context, requestId: "4", apiBaseUrl: "https://example.test/v1", apiKey: "test", fetchImpl: fetch4xx }), /provider_4xx/);
  await assert.rejects(callDifyAnalysis({ question: body.question, analysisContext: context, requestId: "429", apiBaseUrl: "https://example.test/v1", apiKey: "test", fetchImpl: fetch429 }), /provider_4xx/);
  await assert.rejects(callDifyAnalysis({ question: body.question, analysisContext: context, requestId: "5", apiBaseUrl: "https://example.test/v1", apiKey: "test", fetchImpl: fetch5xx }), /provider_5xx/);
  await assert.rejects(callDifyAnalysis({ question: body.question, analysisContext: context, requestId: "json", apiBaseUrl: "https://example.test/v1", apiKey: "test", fetchImpl: fetchInvalidJson }), /provider_response_non_json/);
});

test("illegal request fields and stale context bindings fail closed", async () => {
  assert.equal((await executeAskPowerInsight({ ...body, extra: true })).status, 422);
  assert.equal((await executeAskPowerInsight({ ...body, question: `${body.question} changed` })).status, 422);
});

test("internal Adapter reason codes stay diagnostic-only and reports use controlled user language", async () => {
  const investmentContext = buildAnalysisContext({
    question: "从产业投资角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？",
  });
  const requestId = "USER_LANGUAGE_GATE";
  const contradictoryDraft = createTestOnlyDraft(investmentContext, requestId, {
    candidate_conclusions: ["液冷最高优先，应优先投入。", "液冷最低优先，仅跟踪。"],
  });
  const result = await executeAskPowerInsight({
    action: "analyze",
    question: investmentContext.original_question,
    analysisContext: investmentContext,
    requestId,
  }, {
    callDify: async () => ({ payload: { answer: JSON.stringify(contradictoryDraft) }, latency_ms: 1 }),
  });
  const userLimits = result.payload.report.cannot_conclude.join("\n");
  assert.equal(result.payload.report.status, "INSUFFICIENT_EVIDENCE");
  assert.match(result.payload.report.one_line_conclusion, /不输出无条件单一排序|不能形成无条件单一排序/);
  assert.match(result.payload.report.recommended_decision, /不输出无条件单一排序|不能形成无条件单一排序/);
  assert.match(JSON.stringify(result.payload.report.core_analysis_sections), /GaN\/SiC｜功率器件技术对象/);
  assert.doesNotMatch(JSON.stringify(result.payload.report.core_analysis_sections), /COMPONENT_TECHNOLOGY|PRODUCT|SOLUTION/);
  assert.match(userLimits, /排序或投入建议前后不一致/);
  assert.doesNotMatch(userLimits, /ranking_or_investment_conflict/);
  assert.doesNotMatch(userLimits, /\b[a-z]+(?:_[a-z0-9]+)+\b/);
});
