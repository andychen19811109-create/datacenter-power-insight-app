const CONTRACT_VERSION = "ask-contract-v1";

const LEVEL_PRIORITY = {
  L0: "低",
  L1: "低",
  L2: "中",
  L3: "中高",
  L4: "高",
};

const DEFAULT_WARNING = "Dify response could not be normalized safely; fallback to local provider.";

const SECTION_ALIASES = {
  finalRecommendation: ["核心结论", "最终建议", "Investment Conclusion", "Recommendation", "Conclusion", "结论"],
  oneLineConclusion: ["一句话结论", "One-line conclusion", "One line conclusion"],
  whyNow: ["Why now", "为何现在", "为什么现在"],
  whatToBuild: ["What to build", "建议构建", "建议做什么"],
  howToEnter: ["How to enter", "进入路径", "进入方式"],
  technicalGate: ["Technical gate", "Validation Gate", "验证门槛", "技术门槛"],
  keyRisks: ["Key risks", "关键风险", "主要风险"],
  nextActions: ["Next actions", "下一步动作", "下一步"],
  exitConditions: ["Exit conditions", "退出条件"],
  evidenceBoundary: ["Evidence boundary", "证据边界", "Boundary"],
  confidence: ["Confidence", "置信度"],
  priority: ["Priority", "优先级"],
};

const ROUTE_HINT_ROUTES = new Set(["entity_comparison", "entity_relationship", "entity_substitution", "architecture_impact", "entity_roadmap_impact"]);

const normalizeWhitespace = (value = "") => String(value || "")
  .replace(/\r/g, "")
  .replace(/\u00a0/g, " ")
  .trim();

const uniqueValues = (items = []) => [...new Set(items.filter(Boolean))];

const cleanLine = (value = "") => normalizeWhitespace(String(value || "").replace(/^#+\s*/, ""));

const extractAnswerText = (rawDifyResponse) => {
  if (typeof rawDifyResponse === "string") return normalizeWhitespace(rawDifyResponse);
  if (!rawDifyResponse || typeof rawDifyResponse !== "object") return "";
  return normalizeWhitespace(
    rawDifyResponse.answer
    || rawDifyResponse.text
    || rawDifyResponse.message
    || rawDifyResponse.data?.answer
    || ""
  );
};

const buildHeadingIndex = () =>
  Object.entries(SECTION_ALIASES).flatMap(([key, aliases]) => aliases.map((alias) => [alias.toLowerCase(), key]));

const SECTION_INDEX = new Map(buildHeadingIndex());

const detectSectionKey = (line) => {
  const normalized = cleanLine(line);
  if (!normalized) return null;
  for (const [alias, key] of SECTION_INDEX.entries()) {
    const lowered = normalized.toLowerCase();
    if (lowered === alias || lowered.startsWith(`${alias}:`) || lowered.startsWith(`${alias}：`)) {
      return { key, inlineValue: normalizeWhitespace(normalized.slice(alias.length + (lowered[alias.length] === ":" || lowered[alias.length] === "：" ? 1 : 0))) };
    }
  }
  return null;
};

const parseSections = (markdown) => {
  const sections = {};
  let currentKey = null;

  markdown.split("\n").forEach((rawLine) => {
    const line = cleanLine(rawLine);
    const sectionMatch = detectSectionKey(line);
    if (sectionMatch) {
      currentKey = sectionMatch.key;
      sections[currentKey] = [];
      if (sectionMatch.inlineValue) sections[currentKey].push(sectionMatch.inlineValue);
      return;
    }
    if (currentKey) sections[currentKey].push(rawLine);
  });

  return Object.fromEntries(
    Object.entries(sections).map(([key, values]) => [key, normalizeWhitespace(values.join("\n"))])
  );
};

const stripListMarker = (value = "") => normalizeWhitespace(String(value || "").replace(/^[-*•\d.)\s]+/, ""));

const toBulletList = (value) => {
  if (!value) return [];
  const lines = String(value)
    .split("\n")
    .map((line) => stripListMarker(line))
    .filter(Boolean);
  if (lines.length > 1) return uniqueValues(lines);
  return lines[0] ? [lines[0]] : [];
};

const firstParagraph = (value = "") =>
  String(value || "")
    .split("\n")
    .map((line) => stripListMarker(line))
    .find(Boolean) || "";

const extractInvestmentLevel = (text) => {
  const rangeMatch = text.match(/L([0-4])\s*[-/]\s*L([0-4])/i);
  if (rangeMatch) {
    return {
      investmentLevel: `L${Math.min(Number(rangeMatch[1]), Number(rangeMatch[2]))}`,
      warning: `Dify returned L${rangeMatch[1]}-L${rangeMatch[2]}; normalized to L${Math.min(Number(rangeMatch[1]), Number(rangeMatch[2]))} with L${Math.max(Number(rangeMatch[1]), Number(rangeMatch[2]))} as conditional option.`,
    };
  }
  const singleMatch = text.match(/\bL([0-4])\b/i);
  return singleMatch ? { investmentLevel: `L${singleMatch[1]}`, warning: null } : { investmentLevel: null, warning: null };
};

const derivePriority = (investmentLevel, parsedPriority) => {
  if (parsedPriority) return parsedPriority;
  return LEVEL_PRIORITY[investmentLevel] || "中";
};

const deriveConfidence = (parsedConfidence, warnings) => {
  if (parsedConfidence) return parsedConfidence;
  return warnings.length ? "中" : "中高";
};

const deriveRouteAwareConclusion = (question, requestPayload, sections, answerText) => {
  const route = requestPayload?.analysisState?.routeDecision?.route || requestPayload?.resolvedContext?.analysis_goal || "";
  const sectionRecommendation = firstParagraph(sections.finalRecommendation);
  if (sectionRecommendation) return sectionRecommendation;
  if (ROUTE_HINT_ROUTES.has(route)) return `请按问题“${question}”的比较/关系语义，优先明确系统边界、接口约束和验证门槛。`;
  return firstParagraph(answerText);
};

const shouldFallbackForConflict = (investmentLevel, answerText) =>
  investmentLevel === "L0"
  && /L2|L3|L4|条件性投入|预研|小规模验证|POC|选择性投入|战略投入/i.test(answerText);

const buildFallbackContract = (localFallback, reason) => {
  const fallbackContract = localFallback?.(reason);
  return {
    ...fallbackContract,
    provider: "local",
    contractVersion: CONTRACT_VERSION,
    providerStatus: "fallback",
    fallbackUsed: true,
    warnings: uniqueValues([...(fallbackContract?.warnings || []), reason || DEFAULT_WARNING]),
  };
};

export function normalizeDifyResponseToAskContract({
  rawDifyResponse,
  question,
  filters,
  requestPayload,
  localFallback,
}) {
  const answerText = extractAnswerText(rawDifyResponse);
  if (!answerText) return buildFallbackContract(localFallback, "Dify returned an empty response.");

  const sections = parseSections(answerText);
  const warnings = [];
  const { investmentLevel, warning } = extractInvestmentLevel(answerText);
  if (warning) warnings.push(warning);

  const finalRecommendation = deriveRouteAwareConclusion(question, requestPayload, sections, answerText);
  const technicalGate = firstParagraph(sections.technicalGate);

  if (!investmentLevel || !finalRecommendation || !technicalGate) {
    return buildFallbackContract(localFallback, "Dify response missing required contract fields.");
  }

  if (shouldFallbackForConflict(investmentLevel, answerText)) {
    return buildFallbackContract(localFallback, "Dify summary conflicted with its full report guidance.");
  }

  const parsedPriority = firstParagraph(sections.priority);
  const parsedConfidence = firstParagraph(sections.confidence);
  const oneLineConclusion = firstParagraph(sections.oneLineConclusion) || `${requestPayload?.resolvedContext?.track || question}：${finalRecommendation}`;
  const whyNow = toBulletList(sections.whyNow);
  const whatToBuild = firstParagraph(sections.whatToBuild) || "请围绕问题对象明确最小可验证方案。";
  const howToEnter = firstParagraph(sections.howToEnter) || "先确认客户场景、接口边界与验证路径，再决定投入节奏。";
  const keyRisks = toBulletList(sections.keyRisks);
  const nextActions = toBulletList(sections.nextActions);
  const evidenceBoundary = toBulletList(sections.evidenceBoundary);
  const exitConditions = firstParagraph(sections.exitConditions) || "若无法明确客户场景、技术边界和验证路径，不进入规模化投入。";

  const providerStatus = warnings.length ? "partial" : "success";

  return {
    provider: "dify",
    contractVersion: CONTRACT_VERSION,
    providerStatus,
    finalRecommendation,
    investmentLevel,
    priority: derivePriority(investmentLevel, parsedPriority),
    confidence: deriveConfidence(parsedConfidence, warnings),
    evidenceBoundary: evidenceBoundary.length ? evidenceBoundary : ["Dify 输出为 Markdown 报告，当前结构化摘要来自本地标准化器。"],
    oneLineConclusion,
    whyNow: whyNow.length ? whyNow : ["当前输出来自 Dify Markdown 报告标准化，建议结合完整报告判断。"],
    whatToBuild,
    howToEnter,
    technicalGate,
    keyRisks: keyRisks.length ? keyRisks : ["请结合完整报告补充关键风险。"],
    nextActions: nextActions.length ? nextActions : ["结合完整报告补齐下一步动作。"],
    exitConditions,
    fullText: answerText,
    fullReportMarkdown: answerText,
    warnings,
    fallbackUsed: false,
    question,
    filters,
  };
}
