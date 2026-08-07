export const R2_STATUS_LABELS = Object.freeze({
  REPORT: "正式分析",
  LIMITED: "有限分析",
  CLARIFY: "需要澄清",
  UNSUPPORTED: "当前不支持",
});

const LOCALIZED_STATUS_LABELS = new Set(Object.values(R2_STATUS_LABELS));
const STATUS_CONTRACT_LINE = /^\s*(?:analysis[_\s-]?status|status|分析状态|状态)\s*[:：=]\s*([^\n]+?)\s*$/gim;

const INTERNAL_LEAK_PATTERNS = Object.freeze([
  /```(?:json)?\s*[\[{]/i,
  /(?:^|[\s,{;])(?:task_profile|stage_a_version|domain_status|support_level|request_id|conversation_id|message_id)\s*[:=]/im,
  /(?:^|[\s,{;])(?:audit|corrective)\s*[:=]/im,
  /(?:^|[^A-Z0-9])TP-\d{2,}\b/i,
  /\brisk\s*=\s*(?:high|medium|low|critical)\b/i,
  /(?:^|[\s,{;])(?:dify_)?(?:node_id|node_name|workflow_id|workflow_run_id|workflow_node|execution_id|run_id)\s*[:=]/im,
  /^\s*(?:TypeError|ReferenceError|SyntaxError|RangeError|Error):/m,
  /^\s*at\s+.+\(.+:\d+:\d+\)/m,
  /Traceback \(most recent call last\):/,
  /^\s*File ".+", line \d+/m,
  /(?:^|[\s,{;])(?:provider_error|error_code|error_type|status_code)\s*[:=]\s*(?:["']?[A-Z_]{3,}["']?|\d{3})/im,
]);

const normalizeStatusToken = (value) => String(value || "").trim().replace(/[。；;，,].*$/, "");

const mapStatusToken = (value) => {
  const token = normalizeStatusToken(value);
  if (LOCALIZED_STATUS_LABELS.has(token)) return token;
  return R2_STATUS_LABELS[token.toUpperCase()] || null;
};

export function assertNoR2InternalLeak(answer) {
  const value = String(answer || "");
  if (INTERNAL_LEAK_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new Error("r2_final_answer_internal_leak");
  }
}

export function resolveR2FinalStatus(answer) {
  const value = String(answer || "");
  const contract = [...value.matchAll(STATUS_CONTRACT_LINE)].at(-1)?.[1];
  if (contract) return mapStatusToken(contract) || "分析状态待确认";
  return [...LOCALIZED_STATUS_LABELS].find((label) => value.includes(label)) || R2_STATUS_LABELS.REPORT;
}

const stripStatusContractLines = (answer) => String(answer || "").replace(STATUS_CONTRACT_LINE, "");

const cleanText = (value) => String(value || "")
  .replace(/<think>[\s\S]*?<\/think>/gi, "")
  .replace(/<[^>]+>/g, "")
  .replace(/[`*_>#]/g, "")
  .replace(/\s+/g, " ")
  .trim();

const contentLine = (value) => cleanText(value.replace(/^\s*(?:[-*+] |\d+[.)、] )/, ""));
const headingLine = (value) => value.match(/^\s*(?:#{1,6}\s+|(?:[一二三四五六七八九十]+|\d+)[、.]\s*)(.+)$/);

const sectionKind = (title) => {
  if (/(?:证据|待验证|依据|引用|假设|边界)/.test(title)) return "evidence";
  if (/(?:gate|验证|风险|退出|降级)/i.test(title)) return "gate_risk";
  if (/(?:结论|摘要|建议|推荐|判断)/.test(title)) return "summary";
  return "analysis";
};

export function parseR2FinalAnswer(answer) {
  assertNoR2InternalLeak(answer);
  const lines = stripStatusContractLines(answer).replace(/\r/g, "").split("\n");
  const sections = [];
  let current = { title: "核心结论", items: [] };

  for (const rawLine of lines) {
    const heading = headingLine(rawLine);
    if (heading) {
      if (current.items.length) sections.push(current);
      current = { title: cleanText(heading[1]) || "关键分析", items: [] };
      continue;
    }
    const item = contentLine(rawLine);
    if (item) current.items.push(item);
  }
  if (current.items.length) sections.push(current);
  if (!sections.length) throw new Error("r2_final_answer_empty");
  return sections.map((section) => ({ ...section, kind: sectionKind(section.title) }));
}

export function createR2FinalReport({ answer, analysisContext }) {
  const sections = parseR2FinalAnswer(answer);
  const status = resolveR2FinalStatus(answer);
  const summary = sections.find((section) => section.kind === "summary") || sections[0];
  const analysisSections = sections.filter((section) => !["summary", "gate_risk", "evidence"].includes(section.kind));
  const gateRiskSections = sections.filter((section) => section.kind === "gate_risk");
  const evidenceSections = sections.filter((section) => section.kind === "evidence");

  return {
    status,
    title: `${analysisContext.product_or_technology.join("、") || analysisContext.companies.join("、") || "当前问题"}｜专业分析报告`,
    summary: summary.items,
    analysis_sections: analysisSections.length ? analysisSections : sections.filter((section) => section !== summary),
    gate_risk_sections: gateRiskSections,
    evidence_sections: evidenceSections,
  };
}
