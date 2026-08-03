import {
  DIFY_ANALYSIS_DRAFT_SCHEMA_VERSION,
  validateDifyAnalysisDraft,
} from "./contracts/difyAnalysisDraft.js";

const unique = (values) => [...new Set(values.map((item) => String(item || "").trim()).filter(Boolean))];

const stripPublicMarkdown = (value) => String(value || "")
  .replace(/```(?:[a-z0-9_-]+)?/gi, "")
  .replace(/^\s{0,3}#{1,6}\s+/gm, "")
  .replace(/\*\*([^*]+)\*\*/g, "$1")
  .replace(/__([^_]+)__/g, "$1")
  .replace(/`([^`]+)`/g, "$1")
  .trim();

export const stripReasoning = (value) => String(value || "")
  .replace(/<think>[\s\S]*?<\/think>/gi, "")
  .replace(/```(?:json)?\s*/gi, (match) => match.toLowerCase().includes("json") ? "" : match)
  .trim();

const extractAnswer = (response) => {
  if (typeof response === "string") return response;
  if (!response || typeof response !== "object") return "";
  if (typeof response.answer === "string") return response.answer;
  if (typeof response.output === "string") return response.output;
  if (typeof response.data?.outputs?.answer === "string") return response.data.outputs.answer;
  return "";
};

const parseJsonCandidate = (text) => {
  const cleaned = text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  if (!cleaned.startsWith("{")) return null;
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("dify_draft_json_invalid");
  }
};

const markdownSections = (text) => {
  const sections = [];
  let current = { title: "导言", lines: [] };
  for (const line of text.split(/\r?\n/)) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      if (current.lines.some((item) => item.trim())) sections.push(current);
      current = { title: stripPublicMarkdown(heading[1]), lines: [] };
    } else {
      current.lines.push(line);
    }
  }
  if (current.lines.some((item) => item.trim())) sections.push(current);
  return sections;
};

const sectionItems = (section) => unique(section.lines.map((line) => stripPublicMarkdown(line
  .replace(/^\s*[-*+]\s*/, "")
  .replace(/^\s*\d+[.)、]\s*/, ""))));

const findSections = (sections, patterns) => sections.filter((section) =>
  patterns.some((pattern) => section.title.toLowerCase().includes(pattern.toLowerCase())));

const collectItems = (sections, patterns) => unique(findSections(sections, patterns).flatMap(sectionItems));

const classifyObjectType = (name, companies) => {
  if (companies.includes(name)) return "COMPANY";
  if (/800vdc|hvdc|供电架构|架构/i.test(name)) return "ARCHITECTURE";
  if (/液冷|微模块|电力模块/i.test(name)) return "SOLUTION";
  if (/gan|sic|sst|器件/i.test(name)) return "COMPONENT_TECHNOLOGY";
  if (/ups|bbu|cdu/i.test(name)) return "PRODUCT";
  return "UNKNOWN";
};

const parseTaggedFact = (line) => {
  const tag = line.match(/^\[(DIRECT|INDIRECT|PUBLIC_CONSENSUS|INFERENCE|ASSUMPTION)\]\s*/i);
  const source = line.match(/\s*\|\s*source_ref\s*=\s*([^|]+)$/i);
  const statement = line
    .replace(/^\[(DIRECT|INDIRECT|PUBLIC_CONSENSUS|INFERENCE|ASSUMPTION)\]\s*/i, "")
    .replace(/\s*\|\s*source_ref\s*=\s*([^|]+)$/i, "")
    .trim();
  return {
    statement,
    evidence_type: tag ? tag[1].toUpperCase() : "INFERENCE",
    source_ref: source ? source[1].trim() : null,
  };
};

const buildMarkdownDraft = ({ text, requestId, question, analysisContext }) => {
  const sections = markdownSections(text);
  if (sections.length < 2) throw new Error("dify_draft_unstructured_text");
  const isGateSection = (section) =>
    /(?:gate|门槛|验证条件|验证边界)/i.test(section.title);

  const conclusionSections = sections.filter((section) =>
    !isGateSection(section)
    && /(?:决策结论|最终结论|一句话结论|结论|decision)/i.test(section.title));

  const recommendationSections = sections.filter((section) =>
    !isGateSection(section)
    && /(?:推荐建议|推荐决策|推荐行动|推荐|建议|投入等级|recommendation)/i.test(section.title));

  const conclusions = unique([
    ...conclusionSections.flatMap(sectionItems),
    ...recommendationSections.flatMap(sectionItems),
  ]);

  const scenarios = findSections(sections, ["情景", "scenario"]).flatMap((section) =>
    sectionItems(section).map((item) => {
      const [scenario, ...rest] = item.split(/[：:]/);
      return { scenario: scenario.trim(), conclusion: rest.join("：").trim() || item };
    }));
  const facts = collectItems(sections, ["事实", "证据", "evidence", "fact"]).map(parseTaggedFact);
  const allObjects = unique([...(analysisContext.product_or_technology || []), ...(analysisContext.companies || [])]);
  const marketRisks = collectItems(sections, ["市场风险"]);
  const technicalRisks = collectItems(sections, ["技术风险", "限制"]);
  const commercialRisks = collectItems(sections, ["商业风险"]);
  const organizationalRisks = collectItems(sections, ["组织风险", "能力风险"]);
  const genericRisks = collectItems(sections, ["风险"]);

  return {
    schema_version: DIFY_ANALYSIS_DRAFT_SCHEMA_VERSION,
    request_id: requestId,
    original_question: question,
    task_type: analysisContext.task_type,
    understood_decision: conclusions[0] || `围绕“${question}”形成条件化决策分析`,
    objects: allObjects.map((name) => ({
      name,
      object_type: classifyObjectType(name, analysisContext.companies || []),
    })),
    assumed_context: [...(analysisContext.assumptions || [])],
    clarification_questions: [],
    candidate_conclusions: conclusions,
    scenario_conclusions: scenarios,
    key_facts: facts,
    key_drivers: collectItems(sections, ["驱动", "机会", "价值", "why"]),
    alternatives: collectItems(sections, ["替代", "备选", "alternative"]),
    risks: {
      market: marketRisks.length ? marketRisks : genericRisks,
      technical: technicalRisks,
      commercial: commercialRisks,
      organizational: organizationalRisks,
    },
    recommended_actions: collectItems(sections, ["行动", "下一步", "action"]),
    validation_gates: collectItems(sections, ["验证gate", "验证 gate", "验证门槛", "validation gate"]),
    exit_conditions: collectItems(sections, ["退出", "exit"]),
    uncertainties: collectItems(sections, ["不确定", "uncertaint"]),
    missing_information: collectItems(sections, ["缺失", "待补充", "missing"]),
    raw_report_markdown: text,
  };
};

export function normalizeDifyAnalysisDraft({ rawResponse, requestId, question, analysisContext }) {
  const answer = stripReasoning(extractAnswer(rawResponse));
  if (!answer) throw new Error("dify_draft_empty");
  const jsonCandidate = parseJsonCandidate(answer);
  const draft = jsonCandidate || buildMarkdownDraft({
    text: answer,
    requestId,
    question,
    analysisContext,
  });
  const validation = validateDifyAnalysisDraft(draft);
  if (!validation.valid) throw new Error(`dify_draft_invalid:${validation.errors.join(",")}`);
  if (draft.request_id !== requestId || draft.original_question !== question || draft.task_type !== analysisContext.task_type) {
    throw new Error("dify_draft_binding_mismatch");
  }
  return draft;
}
