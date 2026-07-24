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
const M1_DECISION_INTENTS = new Set([
  "product_investment",
  "architecture_choice",
  "product_definition",
  "market_entry",
  "roadmap_priority",
]);

export const evaluateM1ProfessionalEligibility = (inputContext) => {
  if (!inputContext || inputContext.schema_version !== "m1.input.v1") {
    return { eligible: false, mode: "unsupported", reasonCodes: ["normalized_context_missing"] };
  }
  const normalizedObject = normalize(inputContext.primary_product_object);
  const productInScope = M1_PRODUCT_FORMS.some((term) => normalizedObject.includes(normalize(term)));
  const intentInScope = M1_DECISION_INTENTS.has(inputContext.decision_intent);
  const ambiguousCore = inputContext.clarification_required === true
    && ["primary_product_object", "decision_intent", "application_scenario", "architecture_alternatives"]
      .some((field) => inputContext.field_provenance?.[field]?.status === "UNKNOWN"
        || inputContext.field_provenance?.[field]?.status === "CONFLICTING");
  const reasonCodes = [];
  if (!productInScope) reasonCodes.push("primary_product_out_of_m1_scope");
  if (!intentInScope) reasonCodes.push("decision_intent_out_of_m1_scope");
  if (ambiguousCore) reasonCodes.push("essential_clarification_required");
  return {
    eligible: productInScope && intentInScope && !ambiguousCore,
    mode: productInScope && intentInScope && !ambiguousCore ? "m1_professional_demo" : "unsupported",
    reasonCodes,
    normalizedFromContextId: inputContext.context_id,
  };
};
