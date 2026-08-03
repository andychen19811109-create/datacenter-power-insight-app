import { getClarificationQuestions } from "./clarificationPolicy.js";

const includes = (items, value) => items.some((item) => item.toLowerCase() === value.toLowerCase());

export function classifyMvpCapability(analysisContext) {
  if (getClarificationQuestions(analysisContext).length) return "CLARIFICATION_REQUIRED";
  const objects = analysisContext.product_or_technology;
  const companies = analysisContext.companies;
  if (analysisContext.task_type === "PRODUCT_INITIATIVE" && companies.includes("Kstar") && includes(objects, "模块化UPS")) return "FULL_REPORT";
  if (analysisContext.task_type === "TECHNOLOGY_ROUTE" && includes(objects, "800VDC")) return "FULL_REPORT";
  if (analysisContext.task_type === "INVESTMENT_COMPARISON"
    && ["BBU", "液冷", "GaN/SiC"].every((item) => includes(objects, item))) return "FULL_REPORT";
  if (["PRODUCT_INITIATIVE", "COMPETITIVE_ANALYSIS", "PORTFOLIO_PLANNING", "TREND_PRIORITIZATION", "TECHNOLOGY_ROUTE"].includes(analysisContext.task_type)
    && (objects.length || companies.length)) return "LIMITED_ANALYSIS";
  return "UNSUPPORTED";
}
