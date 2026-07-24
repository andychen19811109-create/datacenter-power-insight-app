import {
  M1_ARCHITECTURE_DECISION_SUBJECT,
  M1_INPUT_DECISION_INTENTS,
} from "./contracts/m1InputContext.js";

const normalize = (value) => String(value || "").toLowerCase().replace(/[\s_-]+/g, "");
const M1_PRODUCT_FORMS = Object.freeze([
  "ups",
  "模块机",
  "模块化ups",
  "大功率电源",
  "备电",
  "uninterruptiblepowersupply",
  "modularups",
]);
const M1_DECISION_INTENTS = new Set(
  M1_INPUT_DECISION_INTENTS.filter((intent) => intent !== "OUT_OF_SCOPE"),
);

export const evaluateM1ProfessionalEligibility = (inputContext) => {
  if (!inputContext || inputContext.schema_version !== "m1.input.v1") {
    return { eligible: false, mode: "unsupported", reasonCodes: ["normalized_context_missing"] };
  }
  const normalizedObject = normalize(inputContext.primary_product_object);
  const architectureDecisionInScope = inputContext.primary_product_object === M1_ARCHITECTURE_DECISION_SUBJECT
    && inputContext.decision_intent === "ARCHITECTURE_CHOICE"
    && Array.isArray(inputContext.architecture_alternatives)
    && inputContext.architecture_alternatives.length >= 2;
  const productInScope = architectureDecisionInScope
    || M1_PRODUCT_FORMS.some((term) => normalizedObject.includes(normalize(term)));
  const intentInScope = M1_DECISION_INTENTS.has(inputContext.decision_intent);
  const reasonCodes = [];
  if (!productInScope) reasonCodes.push("primary_product_out_of_m1_scope");
  if (!intentInScope) reasonCodes.push("decision_intent_out_of_m1_scope");
  return {
    eligible: productInScope && intentInScope,
    mode: productInScope && intentInScope ? "m1_professional_demo" : "unsupported",
    reasonCodes,
    normalizedFromContextId: inputContext.context_id,
  };
};
