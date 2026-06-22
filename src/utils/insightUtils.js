import { SOURCE_REGISTRY } from "../data/marketData.js";
import { buildInsightContext } from "./insightContext.js";

export const source = (ref) => SOURCE_REGISTRY[ref] || SOURCE_REGISTRY.expert;

// Compatibility helpers now delegate to the single V1.3 context pipeline.
export const scoreProducts = (filters) =>
  buildInsightContext(filters).productContext.opportunities.map((product) => ({
    ...product,
    matchScore: product.score,
    matchType: product.match.trackMatch ? "赛道直接机会" : product.isRelevant ? "细分场景机会" : "相邻机会",
  }));

export const getFilteredCustomerPainPoints = (filters) =>
  buildInsightContext(filters).marketContext.painPoints.map((pain) => ({
    ...pain,
    matchType: pain.isDirectMatch ? "精确匹配" : "相邻相关",
  }));

export const getFilteredCompanies = (filters) => buildInsightContext(filters).companyContext.companies;

export const getFilteredIntelligence = (filters) => buildInsightContext(filters).intelligenceContext.signals;

export const getFilteredTechMatrix = (filters) => buildInsightContext(filters).technologyContext;

export const getSegmentSummary = (filters) => buildInsightContext(filters).segmentLabel;

export const getRoleInsight = (filters) => buildInsightContext(filters).executiveBrief;
