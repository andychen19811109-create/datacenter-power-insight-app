export const R2_STATUS_LABELS = Object.freeze({
  REPORT: "正式分析",
  LIMITED: "有限分析",
  CLARIFY: "需要澄清",
  UNSUPPORTED: "当前不支持",
});

const LOCALIZED_STATUS_LABELS = new Set(Object.values(R2_STATUS_LABELS));
const STATUS_CONTRACT_LINE = /^\s*(?:#{1,6}\s*)?(?:analysis[_\s-]?status|status|分析状态|状态)\s*(?:[:：=]\s*([^\n]+?))?\s*$/im;

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
  return inspectR2FinalAnswer(answer).status;
}

const inspectR2FinalAnswer = (answer) => {
  const lines = String(answer || "").replace(/\r/g, "").split("\n");
  const visibleLines = [];
  let contractStatus = null;

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(STATUS_CONTRACT_LINE);
    if (!match) {
      visibleLines.push(lines[index]);
      continue;
    }
    const inlineValue = match[1];
    if (inlineValue) {
      contractStatus = mapStatusToken(inlineValue) || "分析状态待确认";
      continue;
    }
    const nextIndex = lines.findIndex((line, candidate) => candidate > index && line.trim());
    if (nextIndex > index) {
      const nextStatus = mapStatusToken(lines[nextIndex]);
      if (nextStatus) {
        contractStatus = nextStatus;
        index = nextIndex;
      } else {
        contractStatus = "分析状态待确认";
      }
    } else {
      contractStatus = "分析状态待确认";
    }
  }

  return {
    status: contractStatus || [...LOCALIZED_STATUS_LABELS].find((label) => String(answer || "").includes(label)) || R2_STATUS_LABELS.REPORT,
    visibleAnswer: visibleLines.join("\n"),
  };
};

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
  const lines = inspectR2FinalAnswer(answer).visibleAnswer.split("\n");
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
  const actionSection = sections.find((section) => /(?:推荐动作|推荐行动|行动|下一步|建议)/.test(section.title));
  const conditionSection = sections.find((section) => /(?:gate|验证|条件|边界|风险|退出|证据|待验证)/i.test(section.title));

  return {
    status,
    title: `${analysisContext.product_or_technology.join("、") || analysisContext.companies.join("、") || "当前问题"}｜专业分析报告`,
    summary: summary.items,
    decision_summary: {
      core_conclusion: summary?.items?.length ? summary.items : ["当前证据不足以形成明确核心结论"],
      recommended_actions: actionSection?.items?.length ? actionSection.items : ["当前证据不足以形成明确行动建议"],
      key_conditions: conditionSection?.items?.length ? conditionSection.items : ["当前证据不足以确认关键条件或边界"],
    },
    analysis_sections: analysisSections.length ? analysisSections : sections.filter((section) => section !== summary),
    gate_risk_sections: gateRiskSections,
    evidence_sections: evidenceSections,
  };
}
