const trimBaseUrl = (value) => String(value || "").replace(/\/+$/, "");
const RETRYABLE_HTTP_STATUSES = new Set([408, 429]);
const TRANSIENT_PROVIDER_ERROR = /timeout|timed out|rate limit|overload|temporar|connection|unavailable|provider/i;

const isRetryableHttpStatus = (status) => RETRYABLE_HTTP_STATUSES.has(status) || status >= 500;
const isRetryableWorkflowFailure = (payload) => TRANSIENT_PROVIDER_ERROR.test(String(payload?.data?.error || ""));
const parseResponseBody = (body) => {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
};

export const buildM1WorkflowRequest = ({ rawUserQuestion }) => ({
  inputs: { raw_user_question: rawUserQuestion },
  response_mode: "blocking",
});

export const fetchM1WorkflowAppInfo = async ({
  apiBaseUrl = process.env.DIFY_M1_WORKFLOW_API_BASE_URL,
  apiKey = process.env.DIFY_M1_WORKFLOW_API_KEY,
  fetchImpl = globalThis.fetch,
} = {}) => {
  const baseUrl = trimBaseUrl(apiBaseUrl);
  if (!baseUrl || !String(apiKey || "").trim()) {
    throw new Error("m1_workflow_configuration_missing");
  }
  if (typeof fetchImpl !== "function") throw new Error("m1_workflow_fetch_missing");

  try {
    const response = await fetchImpl(`${baseUrl}/info`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const rawBody = await response.text();
    const payload = parseResponseBody(rawBody);
    if (!response.ok || !payload) {
      return {
        status: "provider_error",
        reasonCode: "provider_app_info_error",
        httpStatus: response.status,
        errorCode: payload?.code || null,
        errorMessage: payload?.message || null,
      };
    }
    return {
      status: "ready",
      appInfo: {
        name: payload.name,
        mode: payload.mode,
        description: payload.description || "",
        tags: Array.isArray(payload.tags) ? payload.tags : [],
      },
    };
  } catch {
    return {
      status: "provider_error",
      reasonCode: "provider_app_info_transport_error",
    };
  }
};

export const createM1WorkflowTransport = ({
  apiBaseUrl = process.env.DIFY_M1_WORKFLOW_API_BASE_URL,
  apiKey = process.env.DIFY_M1_WORKFLOW_API_KEY,
  timeoutMs = Number(process.env.DIFY_M1_WORKFLOW_TIMEOUT_MS || 90000),
  userId = "dcpi-m1-professional-demo",
  fetchImpl = globalThis.fetch,
} = {}) => {
  const baseUrl = trimBaseUrl(apiBaseUrl);
  if (!baseUrl || !String(apiKey || "").trim()) {
    throw new Error("m1_workflow_configuration_missing");
  }
  if (typeof fetchImpl !== "function") throw new Error("m1_workflow_fetch_missing");

  return async (request) => {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 90000,
    );
    try {
      const response = await fetchImpl(`${baseUrl}/workflows/run`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...request, user: userId }),
      });
      const rawBody = await response.text();
      const payload = parseResponseBody(rawBody);
      if (!response.ok) {
        return {
          status: "provider_error",
          reasonCode: "provider_http_error",
          retryable: isRetryableHttpStatus(response.status),
          httpStatus: response.status,
          errorCode: payload?.code || null,
          errorMessage: payload?.message || null,
        };
      }
      if (!payload) {
        return {
          status: "provider_error",
          reasonCode: "provider_response_invalid",
          retryable: false,
          httpStatus: response.status,
        };
      }
      if (payload?.data?.status !== "succeeded") {
        return {
          status: "provider_error",
          reasonCode: "provider_workflow_error",
          retryable: isRetryableWorkflowFailure(payload),
          workflowRunId: payload?.data?.id,
          workflowId: payload?.data?.workflow_id,
          workflowStatus: payload?.data?.status || "unknown",
          errorMessage: payload?.data?.error || null,
        };
      }
      return {
        status: "ready",
        workflowRunId: payload.data.id,
        workflowId: payload.data.workflow_id,
        elapsedTime: payload.data.elapsed_time,
        totalTokens: payload.data.total_tokens,
        outputs: payload.data.outputs || {},
      };
    } catch (error) {
      return {
        status: "provider_error",
        reasonCode: error?.name === "AbortError" ? "provider_timeout" : "provider_transport_error",
        retryable: true,
      };
    } finally {
      clearTimeout(timeout);
    }
  };
};
