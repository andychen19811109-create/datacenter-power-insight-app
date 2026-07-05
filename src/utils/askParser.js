import { ENTITY_BY_ID, ENTITY_REGISTRY, normalizeAlias } from "../data/domainRegistry.js";

const RELATION_CUES = {
  roadmap_impact: ["路线图", "roadmap"],
  substitution: ["替代", "取代", "replace", "replacement"],
  comparison: ["区别", "不同", "差异", "vs", "versus", "哪个更", "哪一个更", "compare"],
  impact: ["影响", "impact", "affect"],
  relationship: ["关系", "relationship", "关联", "和", "与", "及", "/", "、"],
};

const NEGATION_CUES = [
  "not referring to",
  "does not mean",
  "i don't mean",
  "i do not mean",
  "不是这里的重点",
  "不是重点",
  "不是问",
  "不讨论",
  "不是指",
  "并非",
  "不指",
  "不是",
  "not",
];
const NEGATION_FOCUS_TERMS = ["重点", "讨论", "分析", "问", "focus", "discuss", "asking"];
const INVESTMENT_CUES = ["是否应该投入", "是否值得投入", "是否值得", "值不值得", "要不要", "投入", "投资", "立项", "值得做", "开发"];
const ROADMAP_CUES = ["路线图", "技术路线", "roadmap", "产品规划", "规划", "sku"];
const MARKET_CUES = ["市场", "机会", "全球", "增长", "赛道", "定位"];
const NON_ANALYTICAL_CUES = ["写诗", "写一首", "讲笑话", "写故事", "write a poem", "write a story", "creative writing"];
const OUT_OF_DOMAIN_CUES = ["gaming laptop", "游戏笔记本", "smartphone", "手机推荐", "stock price", "股价"];
const CONTEXTUAL_ACRONYMS = new Set(["AI", "AIDC", "DC", "AC", "PUE", "TCO", "BMS", "EMS"]);

const COMPANY_ALIASES = [
  { id: "vertiv", displayName: "Vertiv", aliases: ["Vertiv", "维谛", "维谛技术"] },
  { id: "huawei", displayName: "Huawei Digital Power", aliases: ["Huawei", "华为", "华为数字能源"] },
  { id: "schneider", displayName: "Schneider Electric", aliases: ["Schneider", "施耐德", "施耐德电气"] },
  { id: "eaton", displayName: "Eaton", aliases: ["Eaton", "伊顿"] },
  { id: "delta", displayName: "Delta Electronics", aliases: ["Delta", "台达", "台达电子"] },
  { id: "kehua", displayName: "Kehua", aliases: ["Kehua", "科华", "科华数据"] },
];

const includesNormalized = (question, term) => question.includes(normalizeAlias(term));
const hasAnyCue = (normalizedQuestion, cues) => cues.some((cue) => includesNormalized(normalizedQuestion, cue));
const findFirstCue = (normalizedQuestion, cues) =>
  cues
    .map((cue) => ({ cue, normalizedCue: normalizeAlias(cue), index: normalizedQuestion.indexOf(normalizeAlias(cue)) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index || b.normalizedCue.length - a.normalizedCue.length)[0] || null;

const findEntityMentions = (normalizedQuestion) => {
  const candidates = ENTITY_REGISTRY.flatMap((registryEntity, registryIndex) =>
    registryEntity.normalizedAliases.flatMap((normalizedEntityAlias) => {
      const matches = [];
      let start = 0;
      while (normalizedEntityAlias && start <= normalizedQuestion.length) {
        const index = normalizedQuestion.indexOf(normalizedEntityAlias, start);
        if (index < 0) break;
        matches.push({
          entityId: registryEntity.entityId,
          category: registryEntity.category,
          displayName: registryEntity.displayName,
          normalizedAlias: normalizedEntityAlias,
          index,
          end: index + normalizedEntityAlias.length,
          registryIndex,
        });
        start = index + Math.max(1, normalizedEntityAlias.length);
      }
      return matches;
    })
  ).sort((a, b) => a.index - b.index || (b.end - b.index) - (a.end - a.index) || a.registryIndex - b.registryIndex);

  const accepted = [];
  candidates.forEach((candidate) => {
    const nested = accepted.some((item) => candidate.index >= item.index && candidate.end <= item.end);
    if (!nested) accepted.push(candidate);
  });
  return accepted;
};

const findNegationOccurrences = (normalizedQuestion) => {
  const occurrences = [];
  const cues = NEGATION_CUES
    .map((cue) => ({ cue, normalizedCue: normalizeAlias(cue) }))
    .sort((a, b) => b.normalizedCue.length - a.normalizedCue.length);

  cues.forEach(({ cue, normalizedCue }) => {
    let index = normalizedQuestion.indexOf(normalizedCue);
    while (index >= 0) {
      const end = index + normalizedCue.length;
      const overlaps = occurrences.some((item) => index < item.end && end > item.index);
      if (!overlaps) occurrences.push({ cue, normalizedCue, index, end });
      index = normalizedQuestion.indexOf(normalizedCue, index + Math.max(1, normalizedCue.length));
    }
  });

  return occurrences.sort((a, b) => a.index - b.index);
};

const parseCorrections = (normalizedQuestion, mentions) =>
  findNegationOccurrences(normalizedQuestion).flatMap(({ cue, index: cueIndex, end: cueEnd }) => {
    const preceding = [...mentions].filter((item) => item.end <= cueIndex).sort((a, b) => b.end - a.end)[0];
    const following = mentions.filter((item) => item.index >= cueEnd).sort((a, b) => a.index - b.index);
    const left = preceding || following[0];
    const right = preceding ? following[0] : following[1];
    if (!left) return [];

    const sameCanonicalEntity = right?.entityId === left.entityId;
    const explicitlyAlternativeMeaning = normalizedQuestion.includes(normalizeAlias("另外一个缩写"));
    const betweenCueAndNextEntity = normalizedQuestion.slice(cueEnd, following[0]?.index ?? normalizedQuestion.length);
    const deEmphasizesPreceding = Boolean(preceding) && NEGATION_FOCUS_TERMS.some((term) =>
      betweenCueAndNextEntity.includes(normalizeAlias(term))
    );
    const negatedMention = sameCanonicalEntity || explicitlyAlternativeMeaning
      ? left
      : !preceding
        ? following[0]
        : deEmphasizesPreceding
          ? preceding
          : null;

    return [{
      cue,
      sourceEntityId: left.entityId,
      rejectedEntityId: right?.entityId || null,
      sourceAlias: left.normalizedAlias,
      rejectedAlias: right?.normalizedAlias || null,
      negatedEntityId: negatedMention?.entityId || null,
      negatedAlias: negatedMention?.normalizedAlias || null,
      requiresClarification: sameCanonicalEntity || explicitlyAlternativeMeaning,
    }];
  });

const groupEntities = (mentions) => {
  const groups = new Map();
  mentions.forEach((mention) => {
    if (!groups.has(mention.entityId)) {
      groups.set(mention.entityId, {
        ...ENTITY_BY_ID[mention.entityId],
        matchedAliases: [],
        firstIndex: mention.index,
      });
    }
    const item = groups.get(mention.entityId);
    if (!item.matchedAliases.includes(mention.normalizedAlias)) item.matchedAliases.push(mention.normalizedAlias);
    item.firstIndex = Math.min(item.firstIndex, mention.index);
  });
  return [...groups.values()].sort((a, b) => a.firstIndex - b.firstIndex);
};

const isSameCategoryInvestmentDevelopmentMention = (normalizedQuestion, mentions) => {
  if (mentions.length < 2) return false;
  if (!hasAnyCue(normalizedQuestion, INVESTMENT_CUES)) return false;
  const categories = new Set(mentions.map((mention) => mention.category));
  if (categories.size !== 1) return false;
  const hasGenericFamily = mentions.some((mention) => mention.entityId === "ups");
  const hasSpecificForm = mentions.some((mention) => mention.entityId !== "ups");
  return hasGenericFamily && hasSpecificForm;
};

const detectRelationType = (normalizedQuestion, mentions) => {
  if (mentions.length < 2) return null;
  if (RELATION_CUES.roadmap_impact.some((cue) => includesNormalized(normalizedQuestion, cue)) && RELATION_CUES.impact.some((cue) => includesNormalized(normalizedQuestion, cue))) return "roadmap_impact";
  if (RELATION_CUES.substitution.some((cue) => includesNormalized(normalizedQuestion, cue))) return "substitution";
  if (RELATION_CUES.comparison.some((cue) => includesNormalized(normalizedQuestion, cue))) return "comparison";
  if (RELATION_CUES.impact.some((cue) => includesNormalized(normalizedQuestion, cue))) return "impact";
  if (isSameCategoryInvestmentDevelopmentMention(normalizedQuestion, mentions) && !hasAnyCue(normalizedQuestion, ["关系", "relationship", "关联"])) return null;
  if (RELATION_CUES.relationship.some((cue) => includesNormalized(normalizedQuestion, cue))) return "relationship";
  return "relationship";
};

const detectLanguage = (question) => {
  const hasChinese = /[\u3400-\u9fff]/.test(question);
  const hasEnglish = /[a-z]/i.test(question);
  return hasChinese && hasEnglish ? "mixed" : hasChinese ? "zh" : "en";
};

const extractCompanies = (normalizedQuestion) => COMPANY_ALIASES.filter((company) =>
  company.aliases.some((alias) => normalizedQuestion.includes(normalizeAlias(alias)))
);

const buildIntent = (normalizedQuestion, relationType, correctionRequired, hasKnownEntity) => {
  if (correctionRequired) return { type: "clarification", confidence: 1, matchedTerms: ["correction"] };
  const nonAnalytical = NON_ANALYTICAL_CUES.filter((term) => includesNormalized(normalizedQuestion, term));
  if (nonAnalytical.length) return { type: "non_analytical", confidence: 1, matchedTerms: nonAnalytical };
  const outOfDomain = OUT_OF_DOMAIN_CUES.filter((term) => includesNormalized(normalizedQuestion, term));
  if (outOfDomain.length) return { type: "out_of_domain", confidence: 1, matchedTerms: outOfDomain };
  if (relationType) return { type: relationType, confidence: 0.96, matchedTerms: [relationType] };
  const investment = INVESTMENT_CUES.filter((term) => includesNormalized(normalizedQuestion, term));
  if (investment.length) return { type: hasKnownEntity ? "product_investment" : "clarification", confidence: 0.94, matchedTerms: investment };
  const roadmap = ROADMAP_CUES.filter((term) => includesNormalized(normalizedQuestion, term));
  if (roadmap.length) return { type: "product_roadmap", confidence: 0.88, matchedTerms: roadmap };
  const market = MARKET_CUES.filter((term) => includesNormalized(normalizedQuestion, term));
  if (market.length) return { type: "market_analysis", confidence: 0.82, matchedTerms: market };
  return { type: "domain_analysis", confidence: hasKnownEntity ? 0.78 : 0.4, matchedTerms: [] };
};

export const parseAskQuestion = (question) => {
  const rawQuestion = String(question || "").trim();
  const normalizedQuestion = normalizeAlias(rawQuestion);
  const allMentions = findEntityMentions(normalizedQuestion);
  const negations = NEGATION_CUES.filter((cue) => includesNormalized(normalizedQuestion, cue));
  const corrections = parseCorrections(normalizedQuestion, allMentions);
  const invalidatedEntityIds = new Set(corrections.map((item) => item.negatedEntityId).filter(Boolean));
  const activeMentions = allMentions.filter((item) => !invalidatedEntityIds.has(item.entityId));
  const negatedEntities = groupEntities(allMentions.filter((item) => invalidatedEntityIds.has(item.entityId)));
  const entities = groupEntities(activeMentions);
  const unknownEntity = ENTITY_BY_ID.unknown;
  const primaryEntity = entities[0] || unknownEntity;
  const secondaryEntities = entities.slice(1);
  const relationType = detectRelationType(normalizedQuestion, activeMentions);
  const relationships = relationType
    ? [{
        type: relationType,
        sourceEntityId: activeMentions[0]?.entityId || primaryEntity.entityId,
        targetEntityId: activeMentions[1]?.entityId || null,
        sourceAlias: activeMentions[0]?.normalizedAlias || null,
        targetAlias: activeMentions[1]?.normalizedAlias || null,
      }]
    : [];
  const recognizedAliases = allMentions.map((item) => item.normalizedAlias);
  const acronymTokens = rawQuestion.match(/\b[A-Z][A-Z0-9/-]{1,12}\b/g) || [];
  const unknownTokens = [...new Set([
    ...acronymTokens.filter((token) => {
      const normalizedToken = normalizeAlias(token);
      return !recognizedAliases.some((alias) => alias.includes(normalizedToken)) && !CONTEXTUAL_ACRONYMS.has(token);
    }),
    ...corrections.filter((item) => item.requiresClarification).map((item) => item.sourceAlias?.toUpperCase()).filter(Boolean),
  ])];
  const correctionRequired = corrections.some((item) => item.requiresClarification);
  const intent = buildIntent(normalizedQuestion, relationType, correctionRequired, primaryEntity.entityId !== "unknown");
  const constraints = {
    globalMarket: ["全球", "global", "overseas"].some((term) => includesNormalized(normalizedQuestion, term)),
    dataCenter: ["数据中心", "AIDC", "AI data center", "智算中心"].some((term) => includesNormalized(normalizedQuestion, term)),
    powerUtility: ["变电站", "调度中心", "电厂", "继保", "电力通信"].some((term) => includesNormalized(normalizedQuestion, term)),
  };
  const companies = extractCompanies(normalizedQuestion);
  const ambiguity = correctionRequired || primaryEntity.entityId === "unknown" ? "high" : entities.length > 1 ? "medium" : "low";
  const confidence = correctionRequired ? 0.2 : primaryEntity.entityId === "unknown" ? 0 : entities.length > 1 ? 0.86 : 0.97;

  return {
    rawQuestion,
    normalizedQuestion,
    language: detectLanguage(rawQuestion),
    entityMentions: allMentions,
    entities,
    primaryEntity,
    secondaryEntities,
    relationships,
    negations,
    negatedEntities,
    corrections,
    intent,
    constraints,
    companies,
    ambiguity,
    unknownTokens,
    confidence,
  };
};

export const buildAskAnalysisState = parseAskQuestion;
