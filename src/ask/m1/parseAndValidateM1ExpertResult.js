import { M1_EVIDENCE_SNAPSHOT_DATE, M1_SOURCE_IDS } from "./m1EvidencePack.js";

export const M1_DECISIONS = Object.freeze(["INVEST", "CONDITIONAL_INVEST", "WATCH", "NO_GO"]);
export const M1_REQUIRED_ACTIONS = Object.freeze(["VALIDATE", "PROCEED", "SCOPE_DOWN", "ARCHITECTURE_RESET", "KILL"]);
export const M1_EVIDENCE_CLASSES = Object.freeze(["VERIFIED_FACT", "EXPERT_INFERENCE", "MUST_VALIDATE"]);

const TOP_LEVEL_KEYS = Object.freeze([
  "profileVersion",
  "mode",
  "evidenceSnapshotDate",
  "resolvedContext",
  "executiveDecision",
  "whyNow",
  "marketSignals",
  "customerPains",
  "applicationBoundary",
  "powerArchitecture",
  "criticalTechnicalMetrics",
  "competitivePosition",
  "commercialDecision",
  "riskRegister",
  "evidenceAndUncertainty",
  "decisionGates",
  "actions30_60_90",
]);

const CONTEXT_KEYS = Object.freeze([
  "productObject",
  "application",
  "customerType",
  "region",
  "powerClass",
  "investmentHorizon",
  "vendorProfile",
  "vendorCapabilityBaseline",
]);

const unavailable = (reasonCode) => ({
  mode: "m1_unavailable",
  userMessage: "Expert investment decision analysis is temporarily unavailable.",
  reasonCode,
});

const isPlainObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const asArray = (value) => Array.isArray(value) ? value : [];
const hasAll = (object, keys) => keys.every((key) => Object.hasOwn(object, key));
const hasOnly = (object, keys) => Object.keys(object).every((key) => keys.includes(key));

export const parseM1ExpertJson = (answer) => {
  const raw = String(answer || "").trim();
  const fenceMatch = raw.match(/^```json\s*([\s\S]*?)\s*```$/i);
  const parseTarget = fenceMatch ? fenceMatch[1].trim() : raw;
  if (!fenceMatch && /^#{1,6}\s/m.test(raw)) {
    return { ok: false, error: "markdown_report_rejected" };
  }
  try {
    return { ok: true, value: JSON.parse(parseTarget) };
  } catch {
    return { ok: false, error: "malformed_json" };
  }
};

const collectEvidenceErrors = (item, path) => {
  if (!isPlainObject(item) || item.evidenceClass === undefined) return [];
  const errors = [];
  if (!M1_EVIDENCE_CLASSES.includes(item.evidenceClass)) errors.push(`${path}.evidenceClass invalid`);
  const sourceIds = asArray(item.sourceIds);
  if (["VERIFIED_FACT", "EXPERT_INFERENCE"].includes(item.evidenceClass) && sourceIds.length === 0) {
    errors.push(`${path}.sourceIds required`);
  }
  sourceIds.forEach((sourceId) => {
    if (!M1_SOURCE_IDS.has(sourceId)) errors.push(`${path}.sourceIds unknown ${sourceId}`);
  });
  return errors;
};

const walkEvidence = (value, path = "result") => {
  if (Array.isArray(value)) return value.flatMap((item, index) => walkEvidence(item, `${path}[${index}]`));
  if (!isPlainObject(value)) return [];
  return [
    ...collectEvidenceErrors(value, path),
    ...Object.entries(value).flatMap(([key, entry]) => walkEvidence(entry, `${path}.${key}`)),
  ];
};

export const validateM1ExpertResult = (result) => {
  const errors = [];
  if (!isPlainObject(result)) return { ok: false, errors: ["result_not_object"] };
  if (!hasAll(result, TOP_LEVEL_KEYS) || TOP_LEVEL_KEYS.some((key) => result[key] == null)) errors.push("missing_required_top_level_module");
  if (!hasOnly(result, TOP_LEVEL_KEYS)) errors.push("unexpected_top_level_module");
  if (result.profileVersion !== "m1-investment-report-v1") errors.push("invalid_profileVersion");
  if (result.mode !== "m1_investment") errors.push("invalid_mode");
  if (result.evidenceSnapshotDate !== M1_EVIDENCE_SNAPSHOT_DATE) errors.push("invalid_evidenceSnapshotDate");

  if (!isPlainObject(result.resolvedContext) || !hasAll(result.resolvedContext, CONTEXT_KEYS) || !hasOnly(result.resolvedContext, CONTEXT_KEYS)) {
    errors.push("resolvedContext_not_exact_eight_slots");
  }

  const decision = result.executiveDecision;
  if (!isPlainObject(decision)) {
    errors.push("executiveDecision_missing");
  } else {
    ["decision", "requiredAction", "fundingBoundary", "decisionConfidence", "investmentThesis", "criticalUnknowns"].forEach((key) => {
      if (!Object.hasOwn(decision, key)) errors.push(`executiveDecision.${key}_missing`);
    });
    if (!M1_DECISIONS.includes(decision.decision)) errors.push("invalid_decision_enum");
    if (!M1_REQUIRED_ACTIONS.includes(decision.requiredAction)) errors.push("invalid_requiredAction_enum");
    if (!isNonEmptyString(decision.investmentThesis)) errors.push("empty_executive_decision");
  }

  const boundary = result.applicationBoundary;
  if (!isPlainObject(boundary) || !isNonEmptyString(boundary.noFit)) errors.push("applicationBoundary.noFit_required");

  asArray(result.customerPains).forEach((pain, index) => {
    if (!isNonEmptyString(pain?.pain)) errors.push(`customerPains[${index}].pain_required`);
    if (!isNonEmptyString(pain?.productImplication) && !isNonEmptyString(pain?.decisionImpact)) errors.push(`customerPains[${index}].decision_link_required`);
  });
  asArray(result.criticalTechnicalMetrics).forEach((metric, index) => {
    if (!isNonEmptyString(metric?.thresholdOrValidationGate)) errors.push(`criticalTechnicalMetrics[${index}].threshold_required`);
    if (!isNonEmptyString(metric?.decisionImpact)) errors.push(`criticalTechnicalMetrics[${index}].decisionImpact_required`);
  });
  asArray(result.riskRegister).forEach((risk, index) => {
    if (!isNonEmptyString(risk?.killTrigger)) errors.push(`riskRegister[${index}].killTrigger_required`);
    if (!isNonEmptyString(risk?.earlyWarning)) errors.push(`riskRegister[${index}].earlyWarning_required`);
    if (!isNonEmptyString(risk?.requiredResponse)) errors.push(`riskRegister[${index}].requiredResponse_required`);
  });
  asArray(result.decisionGates).forEach((gate, index) => {
    if (!isNonEmptyString(gate?.observablePassCondition)) errors.push(`decisionGates[${index}].observablePassCondition_required`);
  });

  errors.push(...walkEvidence(result));
  return { ok: errors.length === 0, errors };
};

export const parseAndValidateM1ExpertResult = (answer) => {
  const parsed = parseM1ExpertJson(answer);
  if (!parsed.ok) return { ok: false, failure: unavailable(parsed.error), errors: [parsed.error] };
  const validation = validateM1ExpertResult(parsed.value);
  if (!validation.ok) return { ok: false, failure: unavailable("m1_validation_failed"), errors: validation.errors };
  return { ok: true, result: parsed.value, errors: [] };
};

export const buildM1UnavailableResult = unavailable;
