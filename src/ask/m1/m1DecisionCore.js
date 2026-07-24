import { createHash } from "node:crypto";

import {
  M1_CONFIRMED_INPUT_SCHEMA_VERSION,
  M1_DRAFT_SCHEMA_VERSION,
  validateM1ConfirmedInput,
} from "./contracts/m1ConfirmedInput.js";
import {
  M1_DECISION_METHOD_VERSION,
  M1_DECISION_OUTPUTS,
  M1_DECISION_STATE_SCHEMA_VERSION,
  M1_EVIDENCE_SOURCE_IDS,
  validateM1DecisionState,
} from "./contracts/m1DecisionState.js";

export class M1DecisionCoreError extends Error {
  constructor(code, details = []) {
    super(code);
    this.name = "M1DecisionCoreError";
    this.code = code;
    this.details = details;
  }
}

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
};

export const canonicalStringifyM1ConfirmedInput = (confirmedInput) => (
  JSON.stringify(canonicalize(confirmedInput))
);

export const hashM1ConfirmedInput = (confirmedInput) => (
  createHash("sha256")
    .update(canonicalStringifyM1ConfirmedInput(confirmedInput), "utf8")
    .digest("hex")
);

export const assertM1ConfirmedInputGate = (input, options = {}) => {
  if (input?.schema_version === M1_DRAFT_SCHEMA_VERSION) {
    throw new M1DecisionCoreError("m1_decision_core_draft_rejected");
  }
  if (input?.schema_version !== M1_CONFIRMED_INPUT_SCHEMA_VERSION) {
    throw new M1DecisionCoreError("m1_decision_core_confirmed_schema_required");
  }
  const validation = validateM1ConfirmedInput(input, options);
  if (!validation.ok) {
    throw new M1DecisionCoreError("m1_decision_core_confirmed_input_invalid", validation.errors);
  }
  return input;
};

export const buildM1DecisionResolutionRequest = ({ confirmedInput }) => {
  const acceptedInput = assertM1ConfirmedInputGate(confirmedInput);
  const confirmedInputHash = hashM1ConfirmedInput(acceptedInput);
  return {
    request_id: `m1_dr_${confirmedInputHash.slice(0, 20)}`,
    inputs: {
      confirmed_input_id: acceptedInput.confirmed_input_id,
      confirmed_input_schema_version: acceptedInput.schema_version,
      confirmed_input_hash: confirmedInputHash,
      decision_state_schema_version: M1_DECISION_STATE_SCHEMA_VERSION,
      confirmed_input_json: canonicalStringifyM1ConfirmedInput(acceptedInput),
    },
    contract: {
      decision_method_version: M1_DECISION_METHOD_VERSION,
      decision_outputs: Object.keys(M1_DECISION_OUTPUTS),
      evidence_source_ids: [...M1_EVIDENCE_SOURCE_IDS],
    },
  };
};

const responseOutputs = (response) => (
  response?.outputs
  || response?.data?.outputs
  || response?.data?.data?.outputs
);

const extractDecisionStatePayload = (response) => {
  if (response?.schema_version === M1_DECISION_STATE_SCHEMA_VERSION) return response;
  const outputs = responseOutputs(response);
  const payload = outputs?.decision_state_json ?? outputs?.decision_state;
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      throw new M1DecisionCoreError("m1_decision_core_response_json_invalid");
    }
  }
  if (payload && typeof payload === "object") return payload;
  throw new M1DecisionCoreError("m1_decision_core_response_missing");
};

export const parseM1DecisionResolutionResponse = ({
  confirmedInput,
  response,
}) => {
  const acceptedInput = assertM1ConfirmedInputGate(confirmedInput);
  const confirmedInputHash = hashM1ConfirmedInput(acceptedInput);
  const decisionState = extractDecisionStatePayload(response);
  const validation = validateM1DecisionState(decisionState, {
    confirmedInput: acceptedInput,
    inputHash: confirmedInputHash,
  });
  if (!validation.ok) {
    throw new M1DecisionCoreError("m1_decision_core_decision_state_invalid", validation.errors);
  }
  return decisionState;
};

export const runM1DecisionResolution = async ({
  confirmedInput,
  decisionResolutionTransport,
}) => {
  if (typeof decisionResolutionTransport !== "function") {
    throw new M1DecisionCoreError("m1_decision_core_transport_required");
  }
  const request = buildM1DecisionResolutionRequest({ confirmedInput });
  const response = await decisionResolutionTransport(request);
  return {
    request,
    decisionState: parseM1DecisionResolutionResponse({
      confirmedInput,
      response,
    }),
  };
};
