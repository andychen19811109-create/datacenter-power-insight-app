const countDraftClaims = (draft) => {
  if (!draft) return 0;
  return (draft.key_facts?.length || 0)
    + (draft.key_drivers?.length || 0)
    + (draft.candidate_conclusions?.length || 0)
    + (draft.scenario_conclusions?.length || 0)
    + (draft.alternatives?.length || 0)
    + (draft.recommended_actions?.length || 0);
};

const countPublishedClaims = (report) => {
  if (!report) return 0;
  return (report.key_facts?.length || 0)
    + (report.core_analysis_sections || []).reduce((count, section) => count + section.items.length, 0)
    + (report.scenario_comparison?.length || 0)
    + (report.alternatives?.length || 0)
    + (report.recommended_actions?.length || 0);
};

export function createObservabilityRecord({ stages = {}, rawOutput = null, draft = null, report = null, audit = null, startedAt = Date.now() }) {
  const rawText = typeof rawOutput === "string" ? rawOutput : rawOutput == null ? "" : JSON.stringify(rawOutput);
  return {
    request_build_ms: Number(stages.request_build_ms || 0),
    dify_roundtrip_ms: Number(stages.dify_roundtrip_ms || 0),
    normalize_ms: Number(stages.normalize_ms || 0),
    adapter_ms: Number(stages.adapter_ms || 0),
    publication_guardrail_ms: Number(stages.publication_guardrail_ms || 0),
    composer_ms: Number(stages.composer_ms || 0),
    total_ms: Math.max(0, Date.now() - startedAt),
    raw_output_chars: rawText.length,
    normalized_claim_count: countDraftClaims(draft),
    published_claim_count: countPublishedClaims(report),
    filtered_claim_count: audit?.filtered_fields?.length || 0,
  };
}
