const FORBIDDEN = [
  /向\+/, /单柜\+/, /预计左右/, /\*模块/, /持续跟踪跟踪/,
  /当前没有可发布内容/, /当前在线草稿未形成可解析/,
  /默认分析时间范围）重复/, /COMPONENT_TECHNOLOGY/, /ranking_or_investment_conflict/,
  /TEST_ONLY/, /TEST_ONLY_SOURCE/, /对象定义来自受控测试输入/, /受控测试草稿/, /DEV Fixture/,
  /\*\*/, /```/,
  /\|(?:[^|]*\|){1,}/,
  /^\s*-{2,}\s*$/m,
];
const isMarkdownTableArtifact = (value) => {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/^-{2,}$/.test(text)) return true;
  return (text.match(/\|/g) || []).length >= 2;
};

const normalize = (value) => {
  const raw = String(value || "");
  if (isMarkdownTableArtifact(raw)) return "";

  return raw
    .replace(/```(?:[a-z0-9_-]+)?/gi, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/持续跟踪跟踪/g, "持续跟踪")
    .replace(/有条件进入[^。；]*有条件进入/g, "有条件进入")
    .replace(/。{2,}/g, "。")
    .replace(/\s+/g, " ")
    .trim();
};
const key = (value) => normalize(value).replace(/[，。；、：:（）()\s]/g, "").toLocaleLowerCase();
const uniqueStrings = (values) => [...new Map(values.map((value) => [key(value), normalize(value)])) .values()]
  .filter((value) => value && !FORBIDDEN.some((pattern) => pattern.test(value)));

const cleanSections = (sections) => sections.map((section) => ({
  ...section,
  title: normalize(section.title),
  items: uniqueStrings(section.items || []),
})).filter((section) => section.title && section.items.length);

export function lintUserReport(report, analysisContext) {
  const issues = [];
  const copy = {
    ...report,
    title: normalize(report.title),
    one_line_conclusion: normalize(report.one_line_conclusion),
    recommended_decision: normalize(report.recommended_decision),
    key_assumptions: uniqueStrings(report.key_assumptions),
    analysis_scope: uniqueStrings(report.analysis_scope),
    core_analysis_sections: cleanSections(report.core_analysis_sections),
    scenario_comparison: (report.scenario_comparison || [])
      .map((item) => ({
        ...item,
        scenario: normalize(item.scenario),
        conclusion: normalize(item.conclusion),
      }))
      .filter((item) => item.scenario && item.conclusion),
    alternatives: uniqueStrings(report.alternatives),
    risks: Object.fromEntries(Object.entries(report.risks).map(([type, items]) => [type, uniqueStrings(items)])),
    uncertainties: uniqueStrings(report.uncertainties),
    recommended_actions: uniqueStrings(report.recommended_actions),
    validation_gates: uniqueStrings(report.validation_gates),
    exit_conditions: uniqueStrings(report.exit_conditions),
    information_to_add: uniqueStrings(report.information_to_add),
    cannot_conclude: uniqueStrings(report.cannot_conclude),
  };
  const visible = JSON.stringify(copy);
  for (const pattern of FORBIDDEN) if (pattern.test(visible)) issues.push(`forbidden:${pattern}`);
  if (new Set(copy.key_assumptions.map(key)).size !== copy.key_assumptions.length) issues.push("duplicate_assumptions");
  if (copy.evidence_summary.some((item) => !item.source_ref && /直接证据/.test(item.statement))) issues.push("unsourced_direct_evidence");
  if (analysisContext.task_type === "INVESTMENT_COMPARISON" && analysisContext.decision_subject === "UNKNOWN"
    && analysisContext.field_sources.decision_subject === "QUESTION") issues.push("decision_subject_source_fabricated");
  if (copy.status === "INSUFFICIENT_EVIDENCE" && !/(?:不输出|不能形成|不得输出).{0,16}(?:综合排序|整体排序|单一排序)/.test(visible)
    && /(?:综合排序|整体排序|风险收益最高|最优|优先投入|BBU\s*[>＞]|液冷\s*[>＞]|GaN\/SiC\s*[>＞])/.test(visible)) issues.push("ranking_under_insufficient_evidence");
  return { report: copy, valid: issues.length === 0, issues };
}
