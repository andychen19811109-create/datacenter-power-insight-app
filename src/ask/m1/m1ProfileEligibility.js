import { parseAskQuestion } from "../../utils/askParser.js";
import { routeAskQuestion } from "../../utils/askRouter.js";

const M1_UPS_ENTITY_IDS = new Set(["ups", "data_center_ups", "modular_ups", "monolithic_ups"]);
const AI_DATA_CENTER_TERMS = [
  "ai data center",
  "aidc",
  "ai factory",
  "ai colocation",
  "ai training data center",
  "ai数据中心",
  "ai 数据中心",
  "智算中心",
  "ai工厂",
  "ai 工厂",
  "高密度ai",
  "高密度 ai",
  "ai/hpc",
];

const normalizeText = (value) => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
const hasAiDataCenterContext = (value) => {
  const normalized = normalizeText(value);
  return AI_DATA_CENTER_TERMS.some((term) => normalized.includes(normalizeText(term)));
};

const applicationContextFrom = (question, filters = {}) => {
  if (hasAiDataCenterContext(question)) {
    return { source: "explicit_question", value: "AI Data Center" };
  }
  if (hasAiDataCenterContext(filters.application)) {
    return { source: "current_filter", value: filters.application };
  }
  return { source: "unknown", value: "Unknown" };
};

export const buildM1AskClassification = (question) => {
  const askState = parseAskQuestion(question);
  const routeDecision = routeAskQuestion(askState);
  return { askState, routeDecision };
};

export const evaluateM1ProfileEligibility = ({ question, filters = {}, askState, routeDecision }) => {
  const classification = askState && routeDecision
    ? { askState, routeDecision }
    : buildM1AskClassification(question);
  const primaryEntityId = classification.askState.primaryEntity?.entityId || "unknown";
  const applicationContext = applicationContextFrom(question, filters);
  const failures = [];

  if (classification.routeDecision.route !== "entity_investment") failures.push("route_not_entity_investment");
  if (!M1_UPS_ENTITY_IDS.has(primaryEntityId)) failures.push("primary_entity_not_m1_ups_family");
  if (applicationContext.value === "Unknown") failures.push("application_context_not_ai_data_center");

  return {
    mode: failures.length === 0 ? "m1_investment" : "legacy",
    eligible: failures.length === 0,
    reasonCodes: failures,
    primaryEntityId,
    route: classification.routeDecision.route,
    applicationContext,
    askState: classification.askState,
    routeDecision: classification.routeDecision,
    providerAllowed: failures.length === 0,
  };
};

export const isM1Eligible = (input) => evaluateM1ProfileEligibility(input).eligible;
