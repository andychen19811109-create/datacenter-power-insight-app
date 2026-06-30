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

const lacksCleanR1PlanningBody = (answerText = "") => {
  const text = String(answerText || "");
  return !/五看/.test(text)
    || !/三定/.test(text)
    || !/证据边界/.test(text)
    || !/source_required|no_quantified_data|user_input_required|not_applicable/.test(text);
};

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

const EXPLANATION_GUARDRAIL_LEVELS = Object.freeze({
  entity_comparison: "L1",
  entity_relationship: "L1",
  entity_substitution: "L2",
  architecture_impact: "L2",
  entity_roadmap_impact: "L2",
});

const ROUTE_GUARDRAIL_SUMMARIES = Object.freeze({
  entity_comparison: {
    finalRecommendation: "当前问题属于比较/边界说明题，应先比较系统层级、场景边界、接口和验证门槛，不输出直接L3/L4立项结论。",
    whatToBuild: "先定义各对象在供电链路中的角色、输入输出、保护边界和适用场景。",
    howToEnter: "按完整报告补齐比较维度，再决定是否进入后续验证或资源分配。",
    technicalGate: "确认系统层级、负载对象、接口边界、认证标准、控制逻辑和验证门槛。",
    whyNow: ["当前问题首先是边界比较，不应直接压成单一路径投资结论。"],
    keyRisks: ["混淆不同层级或不同行业对象会放大架构和市场判断误差。"],
    nextActions: ["拆分比较维度", "确认适用场景", "核对标准与集成要求"],
    exitConditions: "若无法建立统一比较口径，不进入投资优先级判断。",
  },
  entity_relationship: {
    finalRecommendation: "当前问题属于技术关系解释题，应先明确对象层级、接口和责任边界，不输出直接L3/L4立项结论。",
    whatToBuild: "先澄清各对象在系统中的角色、变换节点、架构位置和协同关系。",
    howToEnter: "按完整报告补齐关系边界，再判断是否需要进入后续验证。",
    technicalGate: "确认系统层级、接口协议、变换节点、保护配合和验证门槛。",
    whyNow: ["当前问题聚焦关系定义和边界说明，不应被强行转换成投资结论。"],
    keyRisks: ["错误理解对象关系会导致路线图和系统架构判断失真。"],
    nextActions: ["确认对象层级", "明确接口边界", "补齐验证路径"],
    exitConditions: "若对象关系和责任边界不清，不进入组合方案立项。",
  },
  entity_substitution: {
    finalRecommendation: "当前问题属于替代性判断，应先确认替代前提、兼容边界和验证路径，不输出直接L3/L4立项结论。",
    whatToBuild: "先定义候选对象与被替代对象的职责、接口和保护边界。",
    howToEnter: "完成替代性验证前，不进入规模化投资判断。",
    technicalGate: "确认系统层级、兼容约束、保护配合和替代验证门槛。",
    whyNow: ["当前问题属于替代性分析，不应被直接折叠成单一产品机会。"],
    keyRisks: ["错误替代会导致架构与责任边界失真。"],
    nextActions: ["明确替代前提", "补齐兼容性验证", "确认系统影响范围"],
    exitConditions: "若替代前提不成立，不进入替代性投入。",
  },
  architecture_impact: {
    finalRecommendation: "当前问题属于架构影响判断，应先确认对象对拓扑、接口和验证节奏的影响，不输出直接L3/L4立项结论。",
    whatToBuild: "先定义受影响的系统层级、拓扑边界和关键约束。",
    howToEnter: "按完整报告补齐影响范围和验证顺序，再决定路线图动作。",
    technicalGate: "确认系统拓扑、接口变化、保护策略和样机验证门槛。",
    whyNow: ["当前问题首先是架构影响判断，不应被压缩为投资等级。"],
    keyRisks: ["过早收敛架构判断会放大返工和误配风险。"],
    nextActions: ["确认影响范围", "补齐拓扑边界", "形成验证计划"],
    exitConditions: "若无法明确架构影响范围，不进入路线图投入。",
  },
  entity_roadmap_impact: {
    finalRecommendation: "当前问题属于路线图影响判断，应先确认对象对平台、接口和验证节奏的影响，不输出直接L3/L4立项结论。",
    whatToBuild: "先拆分平台能力、接口约束和近期验证项。",
    howToEnter: "按完整报告补齐近期/中长期分层，再安排资源。",
    technicalGate: "确认平台边界、接口约束、控制要求和验证门槛。",
    whyNow: ["当前问题首先是路线图影响判断，不应被直接改写成投资等级。"],
    keyRisks: ["错误路线图判断会导致资源错配。"],
    nextActions: ["拆分近期与远期项", "确认平台边界", "形成验证节奏"],
    exitConditions: "若平台边界和验证节奏不清，不进入路线图投入。",
  },
});

const BOUNDARY_GUARDRAIL_SUMMARIES = Object.freeze({
  power_utility_vs_industrial_ups: {
    finalRecommendation: "当前问题属于电力UPS与工业UPS的边界比较题，应分别按应用场景、负载对象、客户结构、认证和系统集成要求比较，不能互相简化或混同。",
    whatToBuild: "先定义电力UPS在电厂、变电站、调度/通信/保护控制链路中的角色，再定义工业UPS在石化、轨交、冶金、制造、矿山和过程工业中的角色。",
    howToEnter: "先按行业场景和系统边界拆分需求，再决定是否需要分别建立产品和验证路径。",
    technicalGate: "确认应用场景、负载对象、行业标准、保护隔离、可靠性指标和系统集成要求。",
    whyNow: [
      "电力UPS面向电厂、变电站、电力调度/通信/保护控制等关键控制负载。",
      "工业UPS面向石化、轨交、冶金、制造、矿山和过程工业等复杂工业负载。",
      "二者都不是普通数据中心UPS，也不应混为一类。",
    ],
    keyRisks: ["把电力UPS简化为工业UPS子类会导致客户结构和认证要求误判。"],
    nextActions: ["拆分行业场景", "确认负载对象", "核对认证和系统集成要求"],
    exitConditions: "若无法分别建立电力场景与工业场景的边界，不进入资源分配判断。",
  },
  sst_vs_hvdc: {
    finalRecommendation: "当前问题属于SST与HVDC的技术关系解释题，应先明确二者的层级和作用边界，不输出直接L3/L4立项结论。",
    whatToBuild: "先说明SST作为固态变压器/电能变换技术方向的角色，再说明HVDC作为高压直流供配电架构的角色。",
    howToEnter: "先按架构层级、变换节点和接口边界解释关系，再决定是否需要后续验证。",
    technicalGate: "确认SST所处变换节点、HVDC架构边界、电压等级、接口、保护配合和验证路径。",
    whyNow: [
      "SST是基于电力电子变换的固态变压器/电能变换技术方向。",
      "HVDC是高压直流供配电架构。",
      "SST可以成为未来供配电架构中的变换节点或技术路径之一，但HVDC本身不是SST。",
    ],
    keyRisks: ["把技术方向和系统架构混为同一层级，会导致错误立项和路线图判断。"],
    nextActions: ["拆分层级定义", "确认架构边界", "补齐验证路径"],
    exitConditions: "若无法明确层级和边界，不进入立项判断。",
  },
});

const readGuardrail = (requestPayload, question) => {
  const guardrail = requestPayload?.guardrail || {};
  const route = guardrail.route || requestPayload?.analysisState?.routeDecision?.route || null;
  const note = guardrail.note || "";
  const isClarification = guardrail.mode === "clarification"
    || /完全不存在|不存在的产品|虚构|杜撰|编造|imaginary|fictitious|nonexistent|made-up/i.test(question || "");

  return {
    mode: isClarification ? "clarification" : (guardrail.mode || "investment"),
    route,
    boundaryKey: guardrail.boundaryKey || null,
    note,
    entityLabels: guardrail.entityLabels || [],
  };
};

const deriveGuardrailInvestmentLevel = (route) => EXPLANATION_GUARDRAIL_LEVELS[route] || "L1";

const buildGuardrailContract = ({
  question,
  filters,
  answerText,
  warnings,
  requestPayload,
  technicalGate,
  parsedPriority,
  parsedConfidence,
  mode,
  route,
  boundaryKey,
  note,
}) => {
  const localContract = requestPayload?.analysisState?.outputContract || {};
  const boundarySummary = boundaryKey ? BOUNDARY_GUARDRAIL_SUMMARIES[boundaryKey] : null;
  const routeSummary = ROUTE_GUARDRAIL_SUMMARIES[route] || ROUTE_GUARDRAIL_SUMMARIES.entity_relationship;

  if (mode === "clarification") {
    const clarificationWarning = "Applied local clarification guardrail for fictitious or unsupported object.";
    const finalRecommendation = "当前对象定义不成立或缺乏真实行业证据，不进入L3立项；请先澄清真实产品定义、应用场景、技术路径和客户需求。";
    return {
      provider: "dify",
      contractVersion: CONTRACT_VERSION,
      providerStatus: "partial",
      finalRecommendation,
      investmentLevel: "L0",
      priority: "低",
      confidence: "低",
      evidenceBoundary: [
        "当前问题触发本地澄清 guardrail，完整 Dify 报告仅作为背景参考。",
        note || "对象缺乏真实定义或行业证据，不能直接映射为立项对象。",
      ],
      oneLineConclusion: `${question}：${finalRecommendation}`,
      whyNow: ["当前对象被识别为虚构、未成立或缺乏可验证定义，继续套用投资模板会造成误判。"],
      whatToBuild: "先澄清真实产品定义、应用场景、技术路径和客户需求。",
      howToEnter: "把对象重新表述为可验证的真实产品或架构后，再进入市场或立项分析。",
      technicalGate: "请先确认真实产品定义、应用场景、技术路径、客户需求和可验证证据。",
      keyRisks: ["虚构或未定义对象会导致错误立项和错误技术外推。"],
      nextActions: ["澄清真实产品定义", "补充应用场景", "补充技术路径", "补充客户需求"],
      exitConditions: "在对象定义和行业证据不成立前，不进入立项。",
      fullText: answerText,
      fullReportMarkdown: answerText,
      warnings: uniqueValues([...warnings, clarificationWarning]),
      fallbackUsed: false,
      question,
      filters,
    };
  }

  const summary = boundarySummary || routeSummary;
  const guardrailWarning = `Applied local ${route || "explanation"} guardrail to keep a non-investment contract.`;
  const investmentLevel = deriveGuardrailInvestmentLevel(route);
  const fallbackTechnicalGate = technicalGate && technicalGate !== "---"
    ? technicalGate
    : summary.technicalGate;

  return {
    provider: "dify",
    contractVersion: CONTRACT_VERSION,
    providerStatus: "partial",
    finalRecommendation: summary.finalRecommendation,
    investmentLevel,
    priority: derivePriority(investmentLevel, parsedPriority),
    confidence: deriveConfidence(parsedConfidence || localContract.confidence, uniqueValues([...warnings, guardrailWarning])),
    evidenceBoundary: uniqueValues([
      ...(localContract.evidenceBoundary || []),
      "完整 Dify Markdown 已保留；结构化摘要已按本地 guardrail 压制投资化误判。",
      note,
    ]),
    oneLineConclusion: `${question}：${summary.finalRecommendation}`,
    whyNow: summary.whyNow,
    whatToBuild: summary.whatToBuild,
    howToEnter: summary.howToEnter,
    technicalGate: fallbackTechnicalGate,
    keyRisks: summary.keyRisks,
    nextActions: summary.nextActions,
    exitConditions: summary.exitConditions,
    fullText: answerText,
    fullReportMarkdown: answerText,
    warnings: uniqueValues([...warnings, guardrailWarning]),
    fallbackUsed: false,
    question,
    filters,
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
  const guardrail = readGuardrail(requestPayload, question);

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

  if (guardrail.mode === "clarification" || guardrail.mode === "explanation") {
    return buildGuardrailContract({
      question,
      filters,
      answerText,
      warnings,
      requestPayload,
      technicalGate,
      parsedPriority: inlineFields.priority,
      parsedConfidence: inlineFields.confidence,
      mode: guardrail.mode,
      route: guardrail.route,
      boundaryKey: guardrail.boundaryKey,
      note: guardrail.note,
    });
  }

  if (!investmentLevel || !finalRecommendation || !technicalGate) {
    return buildFallbackContract(localFallback, "Dify response missing required contract fields.");
  }

  if (shouldFallbackForConflict(investmentLevel, answerText)) {
    return buildFallbackContract(localFallback, "Dify summary conflicted with its full report guidance.");
  }

  if (lacksCleanR1PlanningBody(answerText)) {
    return buildFallbackContract(localFallback, "Dify response did not satisfy Clean R1 planning body contract.");
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
