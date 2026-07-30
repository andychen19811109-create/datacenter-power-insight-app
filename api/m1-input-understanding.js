import { createM1WorkflowTransport } from "../src/ask/m1/m1WorkflowTransport.js";
import { runM1InputUnderstanding } from "../src/ask/m1/runM1InputUnderstanding.js";
import {
  classifyM1InputResolutionError,
} from "../src/ask/m1/m1InputResolution.js";
import {
  buildM1DecisionResolutionRequest,
} from "../src/ask/m1/m1DecisionCore.js";

export const M1_CONFIRMED_INPUT_SUBMISSION_ACTION = "m1_confirmed_input";

const isPlainObject = (value) => Boolean(value)
  && typeof value === "object"
  && !Array.isArray(value);

const hasExactKeys = (value, keys) => {
  if (!isPlainObject(value)) return false;
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
};

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

export const toPublicM1InputUnderstandingResult = (result) => {
  if (result?.mode === "m1_input_context") {
    return {
      mode: "m1_input_context",
      inputContext: result.inputContext,
    };
  }
  if (result?.mode === "m1_input_draft") {
    return {
      mode: "m1_input_draft",
      inputDraft: result.inputDraft,
    };
  }
  return {
    mode: "m1_input_unavailable",
    reasonCode: classifyM1InputResolutionError({
      reasonCode: result?.reasonCode,
      validationErrors: result?.validationErrors,
    }),
  };
};

export const handleM1ConfirmedInputSubmission = (
  body,
  { decisionCoreEntry = buildM1DecisionResolutionRequest } = {},
) => {
  if (!hasExactKeys(body, ["action", "confirmedInput"])
    || body.action !== M1_CONFIRMED_INPUT_SUBMISSION_ACTION
    || typeof decisionCoreEntry !== "function") {
    return {
      status: 422,
      payload: {
        mode: "m1_decision_core_rejected",
        reasonCode: "M1_CONFIRMED_INPUT_SUBMISSION_INVALID",
      },
    };
  }

  try {
    const request = decisionCoreEntry({
      confirmedInput: body.confirmedInput,
    });
    return {
      status: 200,
      payload: {
        mode: "m1_decision_core_accepted",
        requestId: request.request_id,
        confirmedInputHash: request.inputs.confirmed_input_hash,
        confirmedInputSchemaVersion: request.inputs.confirmed_input_schema_version,
        confirmationStatus: body.confirmedInput.confirmation_status,
      },
    };
  } catch {
    return {
      status: 422,
      payload: {
        mode: "m1_decision_core_rejected",
        reasonCode: "M1_CONFIRMED_INPUT_REJECTED",
      },
    };
  }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    json(res, 405, { error: "method_not_allowed" });
    return;
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    json(res, 400, { error: "invalid_json_body" });
    return;
  }

  if (isPlainObject(body)
    && (Object.hasOwn(body, "action") || Object.hasOwn(body, "confirmedInput"))) {
    const result = handleM1ConfirmedInputSubmission(body);
    json(res, result.status, result.payload);
    return;
  }

  const question = String(body.question || "");
  try {
    const result = await runM1InputUnderstanding({
      question,
      workflowTransport: createM1WorkflowTransport(),
      expectedWorkflowId: String(process.env.DIFY_M1_PUBLISHED_WORKFLOW_ID || "").trim() || undefined,
    });
    json(res, 200, toPublicM1InputUnderstandingResult(result));
  } catch {
    json(res, 200, toPublicM1InputUnderstandingResult(null));
  }
}
