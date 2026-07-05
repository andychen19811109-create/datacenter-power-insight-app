const json = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
};

const readBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const envValue = (key) => String(process.env[key] || "").trim();
const stripProviderReasoningWrapper = (answer) => String(answer || "").replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "method_not_allowed" });
    return;
  }

  const apiBaseUrl = envValue("DIFY_API_BASE_URL").replace(/\/+$/, "");
  const apiKey = envValue("DIFY_API_KEY");
  const userId = envValue("DIFY_USER_ID") || "dcpi-m1-local";
  const timeoutMs = Number(envValue("DIFY_TIMEOUT_MS") || 300000);

  if (!apiBaseUrl || !apiKey) {
    json(res, 502, { error: "provider_not_configured" });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    json(res, 400, { error: "invalid_json_body" });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 30000);

  try {
    const response = await fetch(`${apiBaseUrl}/chat-messages`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: body.inputs || {},
        query: String(body.query || ""),
        response_mode: "blocking",
        user: userId,
      }),
    });

    if (!response.ok) {
      json(res, 502, { error: "provider_error", status: response.status });
      return;
    }

    const data = await response.json();
    json(res, 200, {
      answer: stripProviderReasoningWrapper(data.answer),
      conversation_id: data.conversation_id || null,
      message_id: data.message_id || null,
      metadata: data.metadata && typeof data.metadata === "object" ? data.metadata : {},
    });
  } catch (error) {
    json(res, error?.name === "AbortError" ? 504 : 502, {
      error: error?.name === "AbortError" ? "provider_timeout" : "provider_error",
    });
  } finally {
    clearTimeout(timeout);
  }
}
