import {
  parseAndValidateM1InputContext,
} from "./contracts/m1InputContext.js";
import { buildM1WorkflowRequest } from "./m1WorkflowTransport.js";

const unavailable = (reasonCode, extra = {}) => ({
  mode: "m1_input_unavailable",
  reasonCode,
  ...extra,
});

export const runM1InputUnderstanding = async ({
  question,
  workflowTransport,
}) => {
  const rawUserQuestion = String(question || "").trim();
  if (!rawUserQuestion) return unavailable("empty_question");
  if (typeof workflowTransport !== "function") return unavailable("workflow_transport_missing");

  const request = buildM1WorkflowRequest({ rawUserQuestion });
  const response = await workflowTransport(request);
  if (response?.status === "provider_timeout") return unavailable("provider_timeout", { providerCalled: true });
  if (response?.status !== "ready") return unavailable("provider_error", { providerCalled: true });

  const validation = parseAndValidateM1InputContext(
    response.outputs?.m1_input_context,
    { expectedQuestion: rawUserQuestion },
  );
  if (!validation.ok) {
    return unavailable("input_context_invalid", {
      providerCalled: true,
      validationErrors: validation.errors,
      workflowRunId: response.workflowRunId,
    });
  }

  return {
    mode: "m1_input_context",
    providerCalled: true,
    inputContext: validation.context,
    workflowRunId: response.workflowRunId,
    workflowId: response.workflowId,
    elapsedTime: response.elapsedTime,
    totalTokens: response.totalTokens,
  };
};
