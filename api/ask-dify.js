const DEFAULT_TIMEOUT_MS = 90000;

const readRequestBody = (req) => {
  if (!req?.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body;
};

const parseTimeoutMs = () => {
  const value = Number(process.env.DIFY_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_TIMEOUT_MS;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const baseUrl = process.env.DIFY_API_BASE_URL?.trim();
  const apiKey = process.env.DIFY_API_KEY?.trim();
  if (!baseUrl || !apiKey) {
    return res.status(503).json({ error: "Dify provider not configured" });
  }

  const { question, difyInputs } = readRequestBody(req);
  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Question is required" });
  }

  const endpoint = `${baseUrl.replace(/\/$/, "")}/chat-messages`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), parseTimeoutMs());

  try {
    const difyResponse = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: difyInputs || {},
        query: question,
        response_mode: "blocking",
        user: process.env.DIFY_USER_ID || "powerinsight-user",
      }),
      signal: controller.signal,
    });

    const text = await difyResponse.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = { answer: text };
    }

    if (!difyResponse.ok) {
      return res.status(502).json({
        error: "Dify request failed",
        details: payload.message || payload.error || payload.code || null,
      });
    }

    return res.status(200).json({
      answer: payload.answer || "",
      conversation_id: payload.conversation_id || null,
      message_id: payload.message_id || null,
      metadata: payload.metadata || null,
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      return res.status(504).json({ error: "Dify request timed out" });
    }
    return res.status(502).json({ error: "Dify request failed", details: error?.message || "Unknown error" });
  } finally {
    clearTimeout(timeout);
  }
}
