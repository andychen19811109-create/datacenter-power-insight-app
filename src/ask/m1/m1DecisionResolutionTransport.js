import { M1DecisionCoreError } from "./m1DecisionCore.js";

export const M1_DECISION_RESOLUTION_ENV = Object.freeze({
  apiUrl: "DIFY_M1_DECISION_RESOLUTION_API_URL",
  apiKey: "DIFY_M1_DECISION_RESOLUTION_API_KEY",
  publishedWorkflowId: "DIFY_M1_DECISION_RESOLUTION_PUBLISHED_WORKFLOW_ID",
});

const configuredValue = (name, explicitValue) => (
  String(explicitValue ?? process.env[name] ?? "").trim()
);

const boundedProviderError = (status, payload) => {
  const code = String(payload?.code || payload?.data?.error || `http_${status}`).slice(0, 120);
  const message = String(payload?.message || payload?.data?.message || "workflow_request_failed")
    .slice(0, 500);
  return new M1DecisionCoreError("m1_decision_resolution_transport_failed", [
    `status:${status}`,
    `code:${code}`,
    `message:${message}`,
  ]);
};

export const createM1DecisionResolutionTransport = ({
  apiUrl,
  apiKey,
  expectedWorkflowId,
  fetchImpl = globalThis.fetch,
  timeoutMs = 90000,
  user = "dcpi-m1-local",
} = {}) => {
  const endpoint = configuredValue(M1_DECISION_RESOLUTION_ENV.apiUrl, apiUrl);
  const credential = configuredValue(M1_DECISION_RESOLUTION_ENV.apiKey, apiKey);
  const workflowId = configuredValue(
    M1_DECISION_RESOLUTION_ENV.publishedWorkflowId,
    expectedWorkflowId,
  );
  if (!endpoint) throw new M1DecisionCoreError("m1_decision_resolution_api_url_missing");
  if (!credential) throw new M1DecisionCoreError("m1_decision_resolution_api_key_missing");
  if (!workflowId) {
    throw new M1DecisionCoreError("m1_decision_resolution_published_workflow_id_missing");
  }
  if (typeof fetchImpl !== "function") {
    throw new M1DecisionCoreError("m1_decision_resolution_fetch_missing");
  }

  return async (request) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${credential}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: request.inputs,
          response_mode: "blocking",
          user,
        }),
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === "AbortError") {
        throw new M1DecisionCoreError("m1_decision_resolution_timeout");
      }
      throw new M1DecisionCoreError("m1_decision_resolution_network_error", [
        String(error?.message || "network_error").slice(0, 500),
      ]);
    } finally {
      clearTimeout(timeout);
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new M1DecisionCoreError("m1_decision_resolution_response_not_json", [
        `status:${response.status}`,
      ]);
    }
    if (!response.ok || payload?.data?.status === "failed") {
      throw boundedProviderError(response.status, payload);
    }

    const actualWorkflowId = String(
      payload?.data?.workflow_id || payload?.workflow_id || "",
    ).trim();
    if (actualWorkflowId !== workflowId) {
      throw new M1DecisionCoreError("m1_decision_resolution_workflow_identity_mismatch", [
        `expected:${workflowId}`,
        `actual:${actualWorkflowId || "missing"}`,
      ]);
    }
    return {
      workflowRunId: payload?.workflow_run_id || payload?.data?.id || null,
      workflowId: actualWorkflowId,
      outputs: payload?.data?.outputs || payload?.outputs || {},
    };
  };
};
