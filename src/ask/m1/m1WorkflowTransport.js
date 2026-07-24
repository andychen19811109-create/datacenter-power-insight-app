const trimBaseUrl = (value) => String(value || "").replace(/\/+$/, "");

export const buildM1WorkflowRequest = ({ rawUserQuestion }) => ({
  inputs: { raw_user_question: rawUserQuestion },
  response_mode: "blocking",
});

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
      if (!response.ok) return { status: "provider_error", httpStatus: response.status };
      const payload = await response.json();
      if (payload?.data?.status !== "succeeded") {
        return { status: "provider_error", workflowStatus: payload?.data?.status || "unknown" };
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
      return { status: error?.name === "AbortError" ? "provider_timeout" : "provider_error" };
    } finally {
      clearTimeout(timeout);
    }
  };
};
