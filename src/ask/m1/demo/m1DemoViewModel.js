const isRecord = (value) => Boolean(value)
  && typeof value === "object"
  && !Array.isArray(value);

export const safeText = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (["string", "number", "bigint"].includes(typeof value)) {
    return String(value);
  }
  return "—";
};

const safeList = (value) => (
  Array.isArray(value) ? value.map((item) => safeText(item)) : []
);

const fieldValue = (state, group, field) => (
  state?.confirmed_input?.groups?.[group]?.fields?.[field]?.value
);

const mapBoundary = (title, value) => {
  if (!isRecord(value)) return null;
  return {
    title,
    status: safeText(value.status),
    statement: safeText(value.statement),
    impact: safeText(value.decision_impact),
    allowed: safeText(value.allowed_commitment),
    prohibited: safeText(value.prohibited_commitment),
    sources: safeList(value.source_ids),
    unknowns: safeList(value.unknown_ids),
    conditions: safeList(value.release_conditions),
  };
};

const mapReleased = (result) => {
  const state = isRecord(result.decision_state) ? result.decision_state : {};
  const recommendation = isRecord(state.recommendation)
    ? state.recommendation
    : {};
  const binding = isRecord(result.binding) ? result.binding : {};
  const evidence = isRecord(state.evidence_boundary)
    ? state.evidence_boundary
    : {};

  return {
    recommendation: {
      status: safeText(recommendation.status),
      decision: safeText(recommendation.decision),
      rationale: safeText(recommendation.rationale),
      conditions: safeList(recommendation.conditions),
      sources: safeList(recommendation.source_ids),
      unknowns: safeList(recommendation.unknown_ids),
    },
    scope: [
      ["原始问题", state?.confirmed_input?.original_question],
      ["决策意图", fieldValue(state, "decision_type", "decision_intent")],
      ["产品对象", fieldValue(state, "product_architecture", "primary_product_object")],
      ["应用场景", fieldValue(state, "application_scenario", "application_scenario")],
      ["目标客户", fieldValue(state, "customer_region", "target_customer")],
      ["区域", fieldValue(state, "customer_region", "region")],
      ["电力范围", fieldValue(state, "power_system_scope", "power_or_system_scope")],
    ].map(([label, value]) => ({ label, value: safeText(value) })),
    boundaries: [
      mapBoundary("产品边界", state.product_boundary),
      mapBoundary("受保护负载边界", state.protected_load_boundary),
      mapBoundary("系统边界", state.system_boundary),
      mapBoundary("应用适配边界", state.application_fit),
      mapBoundary("不适配边界", state.no_fit_boundary),
      mapBoundary("投入边界", state.funding_boundary),
    ].filter(Boolean),
    alternatives: Array.isArray(state.architecture_alternatives)
      ? state.architecture_alternatives.filter(isRecord).map((item) => ({
        id: safeText(item.alternative_id),
        label: safeText(item.label),
        status: safeText(item.fit_status),
        rationale: safeText(item.rationale),
        impact: safeText(item.decision_impact),
        sources: safeList(item.source_ids),
        unknowns: safeList(item.unknown_ids),
      }))
      : [],
    unknowns: Array.isArray(state.unresolved_unknowns)
      ? state.unresolved_unknowns.filter(isRecord).map((item) => ({
        id: safeText(item.unknown_id),
        field: safeText(item.field),
        status: safeText(item.status),
        description: safeText(item.description),
        impact: safeText(item.decision_impact),
        action: safeText(item.required_validation_action),
      }))
      : [],
    evidence: {
      mode: safeText(evidence.mode),
      sources: safeList(evidence.source_ids),
    },
    versions: [
      ["Release ID", result.release_id],
      ["Release Schema", result.schema_version],
      ["Decision ID", state.decision_id],
      ["Decision Schema", state.schema_version],
      ["Policy", binding.policy_version],
      ["Builder", binding.builder_version],
      ["Template Catalog", binding.template_catalog_version],
      ["Snapshot Hash", binding.snapshot_hash],
      ["Confirmed Input Hash", binding.confirmed_input_hash],
    ].map(([label, value]) => ({ label, value: safeText(value) })),
  };
};

export function buildM1DemoViewModel(result) {
  const status = safeText(result?.status);
  if (status === "REJECTED") {
    const error = isRecord(result?.error) ? result.error : {};
    const binding = isRecord(error.binding) ? error.binding : {};
    return {
      status,
      error: {
        errorCode: safeText(error.error_code),
        violations: safeList(error.violation_codes),
        binding: [
          ["Policy", binding.policy_version],
          ["Builder", binding.builder_version],
          ["Template Catalog", binding.template_catalog_version],
          ["Snapshot Hash", binding.snapshot_hash],
          ["Confirmed Input ID", binding.confirmed_input_id],
        ].map(([label, value]) => ({ label, value: safeText(value) })),
      },
    };
  }

  if (status === "RELEASED") {
    return { status, released: mapReleased(result) };
  }

  return { status, error: { errorCode: "—", violations: [], binding: [] } };
}
