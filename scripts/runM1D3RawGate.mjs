import { runM1InvestmentDecision } from "../src/ask/m1/runM1InvestmentDecision.js";

const requiredEnv = ["DIFY_API_BASE_URL", "DIFY_API_KEY"];
const missing = requiredEnv.filter((key) => !String(process.env[key] || "").trim());
if (missing.length > 0) {
  console.log(`M1_RAW_GATE_BLOCKED missing_provider_configuration=${missing.join(",")}`);
  process.exit(2);
}

const timeoutMs = Number(process.env.DIFY_TIMEOUT_MS || 300000);
const apiBaseUrl = String(process.env.DIFY_API_BASE_URL).replace(/\/+$/, "");
const userId = String(process.env.DIFY_USER_ID || "dcpi-m1-raw-gate");
const stripProviderReasoningWrapper = (answer) => String(answer || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

const providerTransport = async (providerRequest) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 30000);
  try {
    const response = await fetch(`${apiBaseUrl}/chat-messages`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${process.env.DIFY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: providerRequest.inputs,
        query: providerRequest.query,
        response_mode: "blocking",
        user: userId,
      }),
    });
    if (!response.ok) return { status: "provider_error" };
    const data = await response.json();
    return { status: "ready", answer: stripProviderReasoningWrapper(data.answer) };
  } catch (error) {
    return { status: error?.name === "AbortError" ? "provider_timeout" : "provider_error" };
  } finally {
    clearTimeout(timeout);
  }
};

const question = "一家中国 UPS 厂商，是否应在未来 18–24 个月投资开发面向北美 AI Colocation 市场的 1MW 级模块化 UPS 平台？";
const filters = {
  role: "高管",
  region: "全球",
  customer: "全部",
  application: "AI Data Center",
  track: "全部",
  time: "2026",
};

const result = await runM1InvestmentDecision({ question, filters, providerTransport });
if (result.mode !== "m1_investment") {
  console.log(JSON.stringify({
    rawGate: "FAIL",
    mode: result.mode,
    reasonCode: result.reasonCode || null,
    validationErrors: result.validationErrors || [],
  }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  rawGate: "PASS",
  result: result.result,
}, null, 2));
