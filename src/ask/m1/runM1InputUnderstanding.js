import {
  parseAndValidateM1InputContext,
} from "./contracts/m1InputContext.js";
import { buildM1WorkflowRequest } from "./m1WorkflowTransport.js";

const unavailable = (reasonCode, extra = {}) => ({
  mode: "m1_input_unavailable",
  reasonCode,
  ...extra,
});

const summarizeAttempt = (response, attempt, requestPayloadIdentical) => ({
  attempt,
  status: response?.status || "provider_error",
  reasonCode: response?.reasonCode || null,
  retryable: response?.retryable === true,
  requestPayloadIdentical,
  httpStatus: response?.httpStatus || null,
  workflowStatus: response?.workflowStatus || null,
  workflowRunId: response?.workflowRunId || null,
  workflowId: response?.workflowId || null,
  errorCode: response?.errorCode || null,
  errorMessage: response?.errorMessage || null,
});

export const runM1InputUnderstanding = async ({
  question,
  workflowTransport,
  expectedWorkflowId,
}) => {
  const rawUserQuestion = question === null || question === undefined ? "" : String(question);
  if (!rawUserQuestion.trim()) return unavailable("empty_question");
  if (typeof workflowTransport !== "function") return unavailable("workflow_transport_missing");

  const request = buildM1WorkflowRequest({ rawUserQuestion });
  const response = await workflowTransport(request);
  const attempts = [summarizeAttempt(response, 1, true)];
  if (response?.status !== "ready") {
    return unavailable(response?.reasonCode || "provider_error", {
      providerCalled: true,
      attemptCount: attempts.length,
      attempts,
      workflowRunId: response?.workflowRunId,
      workflowId: response?.workflowId,
    });
  }
  if (expectedWorkflowId && response.workflowId !== expectedWorkflowId) {
    return unavailable("workflow_identity_mismatch", {
      providerCalled: true,
      attemptCount: attempts.length,
      attempts,
      workflowRunId: response.workflowRunId,
      workflowId: response.workflowId,
      expectedWorkflowId,
    });
  }

  const validation = parseAndValidateM1InputContext(
    response.outputs?.m1_input_context,
    {
      expectedQuestion: rawUserQuestion,
      authoritativeQuestion: rawUserQuestion,
    },
  );
  if (!validation.ok) {
    return unavailable("input_context_invalid", {
      providerCalled: true,
      attemptCount: attempts.length,
      attempts,
      validationErrors: validation.errors,
      workflowRunId: response.workflowRunId,
    });
  }

  return {
    mode: "m1_input_context",
    providerCalled: true,
    attemptCount: attempts.length,
    attempts,
    inputContext: validation.context,
    workflowRunId: response.workflowRunId,
    workflowId: response.workflowId,
    elapsedTime: response.elapsedTime,
    totalTokens: response.totalTokens,
  };
};
