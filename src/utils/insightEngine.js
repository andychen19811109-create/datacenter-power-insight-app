import {
  PRODUCT_OPPORTUNITIES,
  COMPANIES,
  TECH_MATRIX,
  CUSTOMER_PAIN_POINTS,
  INTELLIGENCE_SIGNALS,
  REGION_INSIGHTS,
} from "../data/marketData.js";
import { DOMAIN_TAXONOMY, ENTITY_REGISTRY } from "../data/domainRegistry.js";
import { buildAskAnalysisState, parseAskQuestion } from "./askParser.js";
import { routeAskQuestion } from "./askRouter.js";
import { buildAnswer, buildClarificationAnswer } from "./answerBuilders.js";

const DEFAULT_FILTERS = {
  region: "全球",
  time: "2026",
  role: "高管",
  customer: "全部",
  application: "全部",
  track: "全部",
};

const normalizeFilters = (filters = {}) => ({ ...DEFAULT_FILTERS, ...filters });

const entitySearchText = (state) =>
  state.entities.flatMap((entity) => [entity.displayName, ...entity.aliases]).join(" ").toLowerCase();

const relevanceScore = (value, searchText) => {
  const serialized = JSON.stringify(value).toLowerCase();
  const tokens = searchText.split(/\s+/).filter((token) => token.length > 1);
  return tokens.reduce((score, token) => score + (serialized.includes(token) ? 1 : 0), 0);
};

export const getRankedContext = (state, filters = {}) => {
  const normalizedFilters = normalizeFilters(filters);
  const searchText = entitySearchText(state);
  const rank = (items) => [...items].sort((a, b) => relevanceScore(b, searchText) - relevanceScore(a, searchText));
  return {
    filters: normalizedFilters,
    products: rank(PRODUCT_OPPORTUNITIES).slice(0, 5),
    companies: rank(COMPANIES).slice(0, 5),
    technologies: rank(TECH_MATRIX).slice(0, 5),
    painPoints: rank(CUSTOMER_PAIN_POINTS).slice(0, 4),
    signals: rank(INTELLIGENCE_SIGNALS).slice(0, 4),
    regionInsight: REGION_INSIGHTS[normalizedFilters.region] || REGION_INSIGHTS["全球"],
  };
};

export const analyzeAskQuestion = (question, filters = {}) => {
  const state = buildAskAnalysisState(question);
  const routeDecision = routeAskQuestion(state);
  const rankedContext = getRankedContext(state, filters);
  const answer = buildAnswer(state, routeDecision, rankedContext);
  return { state, routeDecision, rankedContext, answer };
};

export const generateAskPowerInsightAnswer = (question, filters) => analyzeAskQuestion(question, filters).answer;

// Compatibility exports for existing local diagnostics. New code should consume analyzeAskQuestion.
export { DOMAIN_TAXONOMY, ENTITY_REGISTRY, parseAskQuestion, buildAskAnalysisState, routeAskQuestion };

export const detectDomainEntity = (question) => {
  const state = buildAskAnalysisState(question);
  return {
    primaryEntity: state.primaryEntity,
    category: state.primaryEntity.category,
    matchedAliases: state.entities.flatMap((entity) => entity.matchedAliases),
    matchedEntities: state.entities,
    confidence: state.confidence,
    ambiguityLevel: state.ambiguity,
    mustNotRouteTo: state.primaryEntity.mustNotRouteTo,
    preferredMethodology: state.primaryEntity.preferredMethodology,
    unknownAcronyms: state.unknownTokens,
  };
};

export const parseQuestion = parseAskQuestion;

export const classifyQuestion = (question, suppliedState) =>
  (suppliedState?.intent ? suppliedState : buildAskAnalysisState(question)).intent.type;

export const inferProductOntology = (parsedQuestion) => {
  const state = parsedQuestion?.primaryEntity ? parsedQuestion : buildAskAnalysisState(parsedQuestion?.rawQuestion || parsedQuestion?.raw || "");
  return {
    productCategory: state.primaryEntity.category,
    entityId: state.primaryEntity.entityId,
    entityLabel: state.primaryEntity.displayName,
    ambiguityLevel: state.ambiguity,
    relationships: state.relationships,
    corrections: state.corrections,
  };
};

export const selectMethodology = (parsedQuestion) => {
  const state = parsedQuestion?.primaryEntity ? parsedQuestion : buildAskAnalysisState(parsedQuestion?.rawQuestion || parsedQuestion?.raw || "");
  return routeAskQuestion(state).methodology;
};

export const unknownEntityGuard = (question) => buildClarificationAnswer(buildAskAnalysisState(question));
export const applyScopeGuard = (_parsedQuestion, _ontology, methodology) => ({ methodology, allowedMainTopics: [], blockedMainTopics: [] });
export const validateAnswerRelevance = (answer) => answer;
