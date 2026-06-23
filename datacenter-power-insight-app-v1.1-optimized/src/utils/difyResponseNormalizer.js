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
  finalRecommendation: ["核心结论", "最终建议", "决策结论摘要", "投资建议", "Investment Conclusion", "Recommendation", "Conclusion", "结论"],
  oneLineConclusion: ["一句话结论", "One-line conclusion", "One line conclusion"],
  whyNow: ["Why now", "为何现在", "为什么现在", "市场窗口与客户需求", "市场窗口"],
  whatToBuild: ["What to build", "建议构建", "建议做什么", "产品化与市场进入建议", "产品化建议", "MVP范围"],
  howToEnter: ["How to enter", "进入路径", "进入方式", "市场进入建议", "产品化与市场进入建议"],
  technicalGate: ["Technical gate", "Validation Gate", "验证门槛", "技术门槛", "关键验证门槛", "技术与产品趋势", "技术验证", "技术路线"],
  keyRisks: ["Key risks", "关键风险", "主要风险", "风险提示"],
  nextActions: ["Next actions", "下一步动作", "下一步", "投资节奏", "投资节奏、里程碑与退出条件", "里程碑"],
  exitConditions: ["Exit conditions", "退出条件", "退出/降级条件", "退出或降级条件", "投资节奏、里程碑与退出条件"],
  evidenceBoundary: ["Evidence boundary", "证据边界", "证据与可信度", "可信度", "证据", "Boundary"],
  confidence: ["Confidence", "置信度", "可信度", "可信度等级"],
  priority: ["Priority", "优先级"],
};

const INLINE_FIELD_ALIASES = {
  finalRecommendation: ["最终建议", "核心结论", "投资建议"],
  oneLineConclusion: ["一句话结论", "One-line conclusion", "One line conclusion"],
  technicalGate: ["关键验证门槛", "Validation Gate", "Technical gate", "验证门槛", "技术门槛"],
  exitConditions: ["退出/降级条件", "退出或降级条件", "退出条件", "Exit conditions"],
  confidence: ["Confidence", "置信度", "可信度", "可信度等级"],
  priority: ["Priority", "优先级"],
};

const ROUTE_HINT_ROUTES = new Set(["entity_comparison", "entity_relationship", "entity_substitution", "architecture_impact", "entity_roadmap_impact"]);

const EXPLICIT_TECHNICAL_GATE_ALIASES = new Set(["Technical gate", "Validation Gate", "验证门槛", "技术门槛", "关键验证门槛"]);

const normalizeWhitespace = (value = "") => String(value || "")
  .replace(/\r/g, "")
  .replace(/\u00a0/g, " ")
  .trim();

const uniqueValues = (items = []) => [...new Set(items.filter(Boolean))];

const normalizeHeadingText = (value = "") =>
  String(value || "")
    .replace(/^#+\s*/, "")
    .replace(/^\s*(?:[-*•]+\s*)?/, "")
    .replace(/^\s*[\d一二三四五六七八九十]+[.、．]\s*/, "")
    .replace(/[：:]\s*$/, "")
    .trim();

const normalizeComparableText = (value = "") => normalizeHeadingText(value).toLowerCase();

const stripListMarker = (value = "") =>
  normalizeWhitespace(String(value || "").replace(/^\s*(?:[-*•]+|\d+[.)]|[A-Za-z][.)])\s+/, ""));

const stripInlineLabelPrefix = (value = "", labels = []) => {
  const normalized = stripListMarker(value);
  const lowered = normalized.toLowerCase();
  for (const label of labels) {
    const loweredLabel = label.toLowerCase();
    if (lowered.startsWith(`${loweredLabel}:`) || lowered.startsWith(`${loweredLabel}：`)) {
      return normalizeWhitespace(normalized.slice(label.length + 1));
    }
  }
  return normalized;
};

export function stripDifyReasoning(value = "") {
  let text = String(value ?? "");
  const before = text;

  text = text.replace(/<think>[\s\S]*?<\/think>\s*/gi, "");
  text = text.replace(/<\/?think>/gi, "");
  text = text.trim();
  text = text.replace(/^\s*---+\s*/g, "").trim();

  return {
    text,
    stripped: before !== text,
  };
}

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

const buildHeadingCandidates = () =>
  Object.entries(SECTION_ALIASES)
    .flatMap(([key, aliases]) => aliases.map((alias) => ({
      key,
      alias,
      normalizedAlias: normalizeComparableText(alias),
    })))
    .sort((left, right) => right.normalizedAlias.length - left.normalizedAlias.length);

const SECTION_CANDIDATES = buildHeadingCandidates();

const INLINE_LABEL_INDEX = Object.fromEntries(
  Object.entries(INLINE_FIELD_ALIASES).map(([key, aliases]) => [
    key,
    aliases
      .map((alias) => ({
        alias,
        loweredAlias: alias.toLowerCase(),
      }))
      .sort((left, right) => right.alias.length - left.alias.length),
  ])
);

const detectSectionKeys = (headingText = "") => {
  const normalized = normalizeComparableText(headingText);
  if (!normalized) return [];

  const matches = SECTION_CANDIDATES.filter(({ normalizedAlias }) =>
    normalized === normalizedAlias
    || normalized.includes(normalizedAlias)
    || normalizedAlias.includes(normalized)
  );

  const deduped = new Map();
  matches.forEach(({ key, alias }) => {
    if (!deduped.has(key)) deduped.set(key, []);
    deduped.get(key).push(alias);
  });

  return Array.from(deduped.entries()).map(([key, aliases]) => ({ key, aliases }));
};

const detectSectionKeysFromLine = (rawLine = "") => {
  const headingMatch = String(rawLine || "").match(/^\s{0,3}#{1,6}\s+(.+)$/);
  if (headingMatch) {
    return {
      isHeading: true,
      matches: detectSectionKeys(headingMatch[1]),
      headingText: normalizeHeadingText(headingMatch[1]),
    };
  }

  const normalized = normalizeWhitespace(rawLine);
  if (!normalized) return { isHeading: false, matches: [] };
  if (/^\s*[-*•]/.test(rawLine)) return { isHeading: false, matches: [] };

  const colonIndex = normalized.search(/[:：]/);
  const candidateHeading = colonIndex >= 0 ? normalized.slice(0, colonIndex) : normalized;
  const inlineValue = colonIndex >= 0 ? normalizeWhitespace(normalized.slice(colonIndex + 1)) : "";
  if (inlineValue) return { isHeading: false, matches: [] };

  return {
    isHeading: false,
    matches: detectSectionKeys(candidateHeading),
    headingText: normalizeHeadingText(candidateHeading),
  };
};

const parseSections = (markdown) => {
  const sectionLines = {};
  const sectionMeta = {};
  let currentKeys = [];

  markdown.split("\n").forEach((rawLine) => {
    const { isHeading, matches, headingText } = detectSectionKeysFromLine(rawLine);

    if (matches.length) {
      currentKeys = matches.map(({ key }) => key);
      matches.forEach(({ key, aliases }) => {
        if (!sectionLines[key]) sectionLines[key] = [];
        if (sectionLines[key].length) sectionLines[key].push("");
        if (!sectionMeta[key]) sectionMeta[key] = { aliases: [], headings: [] };
        sectionMeta[key].aliases = uniqueValues([...sectionMeta[key].aliases, ...aliases]);
        sectionMeta[key].headings = uniqueValues([...sectionMeta[key].headings, headingText].filter(Boolean));
      });
      return;
    }

    if (isHeading) {
      currentKeys = [];
      return;
    }

    currentKeys.forEach((key) => {
      sectionLines[key].push(rawLine);
    });
  });

  return {
    sections: Object.fromEntries(
      Object.entries(sectionLines).map(([key, values]) => [key, normalizeWhitespace(values.join("\n"))])
    ),
    sectionMeta,
  };
};

const extractInlineField = (value = "", key) => {
  const labels = INLINE_LABEL_INDEX[key] || [];
  if (!labels.length) return "";

  const lines = String(value || "").split("\n");
  for (const rawLine of lines) {
    const normalizedLine = stripListMarker(rawLine);
    const loweredLine = normalizedLine.toLowerCase();
    for (const { alias, loweredAlias } of labels) {
      if (loweredLine.startsWith(`${loweredAlias}:`) || loweredLine.startsWith(`${loweredAlias}：`)) {
        return normalizeWhitespace(normalizedLine.slice(alias.length + 1));
      }
    }
  }

  return "";
};

const toBulletList = (value) => {
  if (!value) return [];
  const lines = String(value)
    .split("\n")
    .map((line) => stripListMarker(line))
    .filter(Boolean);
  if (lines.length > 1) return uniqueValues(lines);
  return lines[0] ? [lines[0]] : [];
};

const firstParagraph = (value = "", labels = []) =>
  String(value || "")
    .split("\n")
    .map((line) => stripInlineLabelPrefix(line, labels))
    .find(Boolean) || "";

const extractInvestmentLevelFromText = (value = "") => {
  const text = String(value || "");
  const labeledMatch = text.match(/(?:投入等级|建议投入等级)\s*[:：]?\s*(L[0-4])\b/i);
  if (labeledMatch) {
    return { investmentLevel: labeledMatch[1].toUpperCase(), warning: null };
  }

  const suggestionMatch = text.match(/(?:当前建议|建议以|建议先做|建议先以|建议)\s*(L[0-4])\b/i);
  if (suggestionMatch) {
    return { investmentLevel: suggestionMatch[1].toUpperCase(), warning: null };
  }

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

const extractInvestmentLevel = (answerText, sections) => {
  const candidates = uniqueValues([
    extractInlineField(sections.finalRecommendation, "finalRecommendation"),
    sections.finalRecommendation,
    sections.oneLineConclusion,
    answerText,
  ]);

  for (const candidate of candidates) {
    const parsed = extractInvestmentLevelFromText(candidate);
    if (parsed.investmentLevel) return parsed;
  }

  return { investmentLevel: null, warning: null };
};

const derivePriority = (investmentLevel, parsedPriority) => {
  if (parsedPriority) return parsedPriority;
  return LEVEL_PRIORITY[investmentLevel] || "中";
};

const deriveConfidence = (parsedConfidence, warnings) => {
  if (parsedConfidence) return parsedConfidence;
  return warnings.length ? "中" : "中高";
};

const deriveRouteAwareConclusion = (question, requestPayload, sections, inlineFields, answerText) => {
  const route = requestPayload?.analysisState?.routeDecision?.route || requestPayload?.resolvedContext?.analysis_goal || "";
  const sectionRecommendation = inlineFields.finalRecommendation
    || extractInlineField(sections.finalRecommendation, "finalRecommendation")
    || firstParagraph(sections.finalRecommendation, INLINE_FIELD_ALIASES.finalRecommendation);
  if (sectionRecommendation) return sectionRecommendation;
  if (ROUTE_HINT_ROUTES.has(route)) return `请按问题“${question}”的比较/关系语义，优先明确系统边界、接口约束和验证门槛。`;
  return firstParagraph(
    answerText
      .split("\n")
      .filter((line) => !/^\s{0,3}#{1,6}\s+/.test(line))
      .join("\n")
  );
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
  const extractedAnswerText = extractAnswerText(rawDifyResponse);
  const { text: answerText, stripped } = stripDifyReasoning(extractedAnswerText);
  if (!answerText) return buildFallbackContract(localFallback, "Dify returned an empty response.");

  const warnings = [];
  if (stripped) warnings.push("Dify reasoning block was stripped before display.");

  const { sections, sectionMeta } = parseSections(answerText);
  const inlineFields = Object.fromEntries(
    Object.keys(INLINE_FIELD_ALIASES).map((key) => [key, extractInlineField(answerText, key)])
  );
  const { investmentLevel, warning } = extractInvestmentLevel(answerText, sections);
  if (warning) warnings.push(warning);

  const finalRecommendation = deriveRouteAwareConclusion(question, requestPayload, sections, inlineFields, answerText);
  let technicalGate = inlineFields.technicalGate
    || extractInlineField(sections.technicalGate, "technicalGate")
    || firstParagraph(sections.technicalGate, INLINE_FIELD_ALIASES.technicalGate);
  const explicitTechnicalGate = Boolean(
    inlineFields.technicalGate
    || sectionMeta.technicalGate?.aliases?.some((alias) => EXPLICIT_TECHNICAL_GATE_ALIASES.has(alias))
  );

  if (!technicalGate && sections.technicalGate) {
    technicalGate = "详见完整报告中的技术验证、客户POC、供应链和商业门槛。";
  }

  if (technicalGate && !explicitTechnicalGate) {
    warnings.push("Dify response did not include an explicit Validation Gate section; derived technicalGate from V2.2 report content.");
  }

  if (!investmentLevel || !finalRecommendation || !technicalGate) {
    return buildFallbackContract(localFallback, "Dify response missing required contract fields.");
  }

  if (shouldFallbackForConflict(investmentLevel, answerText)) {
    return buildFallbackContract(localFallback, "Dify summary conflicted with its full report guidance.");
  }

  const parsedPriority = inlineFields.priority
    || extractInlineField(sections.priority, "priority")
    || firstParagraph(sections.priority, INLINE_FIELD_ALIASES.priority);
  const parsedConfidence = inlineFields.confidence
    || extractInlineField(sections.confidence, "confidence")
    || firstParagraph(sections.confidence, INLINE_FIELD_ALIASES.confidence);
  const oneLineConclusion = inlineFields.oneLineConclusion
    || extractInlineField(sections.oneLineConclusion, "oneLineConclusion")
    || firstParagraph(sections.oneLineConclusion, INLINE_FIELD_ALIASES.oneLineConclusion)
    || `${requestPayload?.resolvedContext?.track || question}：${finalRecommendation}`;
  const whyNow = toBulletList(sections.whyNow);
  const whatToBuild = firstParagraph(sections.whatToBuild) || "请围绕问题对象明确最小可验证方案。";
  const howToEnter = firstParagraph(sections.howToEnter) || "先确认客户场景、接口边界与验证路径，再决定投入节奏。";
  const keyRisks = toBulletList(sections.keyRisks);
  const nextActions = toBulletList(sections.nextActions);
  const evidenceBoundary = toBulletList(sections.evidenceBoundary);
  const exitConditions = inlineFields.exitConditions
    || extractInlineField(sections.exitConditions, "exitConditions")
    || firstParagraph(sections.exitConditions, INLINE_FIELD_ALIASES.exitConditions)
    || "若无法明确客户场景、技术边界和验证路径，不进入规模化投入。";

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
    warnings: uniqueValues(warnings),
    fallbackUsed: false,
    question,
    filters,
  };
}
