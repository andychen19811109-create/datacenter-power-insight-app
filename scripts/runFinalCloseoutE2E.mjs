import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { loadEnv } from "vite";
import {
  R2_CORE_IDENTITY,
  buildDifyChatRequest,
  callDifyAnalysis,
  executeAskPowerInsight,
} from "../api/ask-power-insight.js";
import { buildAnalysisContext } from "../src/ask/vnext/buildAnalysisContext.js";

const outputPath = resolve(process.argv[2] || "/tmp/dcpi-final-closeout-e2e.json");
const loaded = loadEnv("development", process.cwd(), "DIFY_");
for (const key of ["DIFY_API_BASE_URL", "DIFY_API_KEY", "DIFY_USER_ID", "DIFY_TIMEOUT_MS"]) {
  if (loaded[key]) process.env[key] = loaded[key];
}

const cases = [
  { id: "E1_Q1", question: "Kstar是否需要花资源开发全新模块化UPS？" },
  { id: "E2_Q5", question: "请分析Vertiv与华为在AI数据中心电源和液冷方向的竞争差异。" },
  { id: "E3_Q6", question: "请判断800VDC是否会成为未来AI数据中心主流供电架构，并分析未来3年的技术成熟度、商业化进程、主要替代路线和产品布局建议。" },
  { id: "E4_Q9", question: "从投资者角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？" },
  {
    id: "E5_CONTEXT_LINKAGE",
    question: "这个方向值得投入吗？",
    pageContext: {
      normalizedFilters: {
        role: "产品",
        region: "中国",
        customer: "云服务商",
        application: "AI 训练集群",
        track: "800VDC",
        time: "2030",
      },
    },
  },
  { id: "E6_INSUFFICIENT", question: "我们应该开发这个产品吗？" },
];

const results = [];
for (const item of cases) {
  const startedAt = Date.now();
  const analysisContext = buildAnalysisContext({
    question: item.question,
    pageContext: item.pageContext,
  });
  const requestId = `FINAL_CLOSEOUT_${item.id}_${Date.now()}`;
  const request = buildDifyChatRequest({
    question: item.question,
    analysisContext,
    requestId,
    userId: process.env.DIFY_USER_ID || "dcpi-mvp-final-closeout",
  });
  let provider = null;
  let rawAnswer = null;
  let result;
  try {
    provider = await callDifyAnalysis({
      question: item.question,
      analysisContext,
      requestId,
    });
    rawAnswer = String(provider.payload?.answer || "");
    result = await executeAskPowerInsight(
      { action: "analyze", question: item.question, analysisContext, requestId },
      { callDify: async () => provider },
    );
  } catch (error) {
    result = await executeAskPowerInsight(
      { action: "analyze", question: item.question, analysisContext, requestId },
      { callDify: async () => { throw error; } },
    );
  }

  const record = {
    id: item.id,
    generated_at: new Date().toISOString(),
    core_identity: R2_CORE_IDENTITY,
    question: item.question,
    canonical_input_snapshot: analysisContext.canonical_input,
    request_inputs: request.inputs,
    raw_answer: rawAnswer,
    mode: result.payload.mode,
    rendered_report: result.payload.report,
    request_trace: result.payload.request_trace,
    performance: {
      total_latency_ms: Date.now() - startedAt,
      dify_latency_ms: provider?.latency_ms ?? null,
      timeout: result.payload.performance?.timeout ?? false,
      degraded: result.payload.mode === "degraded",
    },
  };
  results.push(record);
  process.stdout.write(`${item.id} mode=${record.mode} status=${record.rendered_report?.status || "无"} total_ms=${record.performance.total_latency_ms} dify_ms=${record.performance.dify_latency_ms ?? "无"} timeout=${record.performance.timeout}\n`);
}

await writeFile(outputPath, `${JSON.stringify({
  schema_version: "dcpi.mvp-final-closeout-e2e.v1",
  generated_at: new Date().toISOString(),
  core_identity: R2_CORE_IDENTITY,
  results,
}, null, 2)}\n`, "utf8");
process.stdout.write(`EVIDENCE_FILE=${outputPath}\n`);
