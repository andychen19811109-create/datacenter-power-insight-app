import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createServer, loadEnv } from "vite";
import {
  R2_CORE_IDENTITY,
  callDifyAnalysis,
  executeAskPowerInsight,
} from "../api/ask-power-insight.js";

const HOST = "127.0.0.1";
const PORT = 4173;
const ACCEPTANCE_TIMEOUT_MS = 300_000;
const evidenceDir = resolve(process.argv[2] || "/tmp/dcpi-mvp-final-acceptance");
const env = loadEnv("development", process.cwd(), "DIFY_");
for (const key of ["DIFY_API_BASE_URL", "DIFY_API_KEY", "DIFY_USER_ID", "DIFY_TIMEOUT_MS"]) {
  if (env[key]) process.env[key] = env[key];
}

const acceptanceQuestions = new Map([
  ["Kstar公司是否需要花资源开发全新模块化UPS？", "Q1"],
  ["Kstar是否需要花资源开发全新一代工业UPS？", "Q2"],
  ["Gaming UPS是否值得做？", "Q3"],
  ["钠电UPS是否值得投入？", "Q4"],
  ["请分析Vertiv与华为在AI数据中心电源和液冷方向的竞争差异。", "Q5"],
  ["请判断800VDC是否会成为未来AI数据中心主流供电架构，并分析未来3年的技术成熟度、商业化进程、主要替代路线和产品布局建议。", "Q6"],
  ["中国厂商在MW级UPS与液冷CDU领域应该如何做产品规划？", "Q7"],
  ["未来3年数据中心电力电子最值得投入的赛道有哪些？", "Q8"],
  ["从投资者角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？", "Q9"],
  ["氟泵多联空调是否应该投入开发？", "Q10"],
]);

const providerCalls = new Map();

const readJsonBody = async (req) => {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 128_000) throw new Error("request_body_too_large");
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
};

const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
};

const digest = (value) => createHash("sha256").update(String(value || ""), "utf8").digest("hex");

const acceptanceClientTimeoutPlugin = {
  name: "dcpi-final-acceptance-client-timeout",
  enforce: "pre",
  transform(code, id) {
    if (!id.endsWith("/src/ask/vnext/askPowerInsightClient.js")) return null;
    const productionConstant = "export const R2_CLIENT_TIMEOUT_MAX_MS = 120_000;";
    if (!code.includes(productionConstant)) {
      throw new Error("acceptance_client_timeout_constant_not_found");
    }
    return {
      code: code.replace(
        productionConstant,
        `export const R2_CLIENT_TIMEOUT_MAX_MS = ${ACCEPTANCE_TIMEOUT_MS};`,
      ),
      map: null,
    };
  },
};

const acceptanceApiPlugin = {
  name: "dcpi-final-acceptance-api",
  configureServer(server) {
    server.middlewares.use("/__acceptance/health", (_req, res) => {
      sendJson(res, 200, { ok: true, core_identity: R2_CORE_IDENTITY.name });
    });

    server.middlewares.use("/api/ask-power-insight", async (req, res) => {
      if (req.method !== "POST") {
        sendJson(res, 405, { mode: "invalid_request", message: "仅支持POST请求。" });
        return;
      }

      let body;
      try {
        body = await readJsonBody(req);
      } catch {
        sendJson(res, 400, { mode: "invalid_request", message: "请求内容无法读取。" });
        return;
      }

      const question = String(body?.question || "").trim();
      const qid = acceptanceQuestions.get(question);
      if (!qid) {
        sendJson(res, 422, { mode: "invalid_request", message: "本验收服务仅接受固定Q1-Q10。" });
        return;
      }
      if ((providerCalls.get(qid) || 0) >= 1) {
        sendJson(res, 409, { mode: "invalid_request", message: `${qid}已完成唯一一次正式验收调用。` });
        return;
      }
      providerCalls.set(qid, 1);

      const startedAt = Date.now();
      let provider = null;
      let rawAnswer = "";
      let providerError = null;
      let difyHttpStatus = null;
      const fetchOnce = async (...args) => {
        const response = await globalThis.fetch(...args);
        difyHttpStatus = response.status;
        return response;
      };

      const result = await executeAskPowerInsight(body, {
        callDify: async (args) => {
          try {
            provider = await callDifyAnalysis({
              ...args,
              timeoutMs: ACCEPTANCE_TIMEOUT_MS,
              fetchImpl: fetchOnce,
            });
            rawAnswer = String(provider.payload?.answer || "");
            return provider;
          } catch (error) {
            const safeCategories = new Set([
              "provider_configuration_missing",
              "provider_fetch_unavailable",
              "provider_response_non_json",
              "provider_4xx",
              "provider_5xx",
              "provider_timeout",
            ]);
            providerError = safeCategories.has(error?.message)
              ? error.message
              : "provider_transport_error";
            throw error;
          }
        },
      });

      const record = {
        schema_version: "dcpi.mvp-final-acceptance-run.v1",
        qid,
        generated_at: new Date().toISOString(),
        core_identity: R2_CORE_IDENTITY,
        question,
        canonical_input_snapshot: body.analysisContext?.canonical_input || null,
        raw_r2_answer: rawAnswer || null,
        raw_r2_answer_sha256: rawAnswer ? digest(rawAnswer) : null,
        app_parsed_report: result.payload?.report || null,
        request_id: body.requestId,
        conversation_id: provider?.conversation_id || null,
        message_id: provider?.message_id || null,
        runtime: {
          acceptance_timeout_ms: ACCEPTANCE_TIMEOUT_MS,
          total_latency_ms: Date.now() - startedAt,
          dify_latency_ms: provider?.latency_ms ?? null,
          analyze_latency_ms: null,
          review_latency_ms: null,
          degraded: result.payload?.mode === "degraded",
          dify_http_status: difyHttpStatus,
          provider_error_category: providerError,
        },
        app_response_status: result.status,
        app_response_mode: result.payload?.mode || null,
      };

      await mkdir(evidenceDir, { recursive: true });
      await writeFile(resolve(evidenceDir, `${qid}.json`), `${JSON.stringify(record, null, 2)}\n`, "utf8");
      sendJson(res, result.status, result.payload);
    });
  },
};

await mkdir(evidenceDir, { recursive: true });
const server = await createServer({
  configFile: resolve("vite.config.js"),
  plugins: [acceptanceClientTimeoutPlugin, acceptanceApiPlugin],
  server: { host: HOST, port: PORT, strictPort: true, allowedHosts: true },
});
await server.listen();
process.stdout.write(`FINAL_ACCEPTANCE_URL=http://${HOST}:${PORT}\n`);
process.stdout.write(`FINAL_ACCEPTANCE_EVIDENCE=${evidenceDir}\n`);

const close = async () => {
  await server.close();
  process.exit(0);
};
process.on("SIGINT", close);
process.on("SIGTERM", close);
