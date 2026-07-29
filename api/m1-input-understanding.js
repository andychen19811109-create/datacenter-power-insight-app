import { createM1WorkflowTransport } from "../src/ask/m1/m1WorkflowTransport.js";
import { runM1InputUnderstanding } from "../src/ask/m1/runM1InputUnderstanding.js";
import {
  classifyM1InputResolutionError,
} from "../src/ask/m1/m1InputResolution.js";

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
