import { classifyEntity } from "../data/ontology.js";
import {
  APPLICABILITY_STATUSES,
  EVIDENCE_STATUSES,
  PRODUCT_PLANNING_CARD_SEEDS,
  PRODUCT_PLANNING_PAGE_CONSUMPTION,
  PRODUCT_PLANNING_SECTIONS,
} from "../data/productPlanningCards.js";

export const PRODUCT_PLANNING_CONTRACT_VERSION = "productPlanningCardContract-v1";

export const STEP_A_SUPPORTED_ENTITY_IDS = Object.freeze([
  "modular_ups",
  "liquid_cooling",
  "pdu_rpp_sts",
  "hvdc",
  "sst",
  "portfolio",
]);

const REQUIRED_SECTION_FIELDS = Object.freeze({
  customer: ["targetCustomers", "applicationScenarios", "buyingLogic", "customerPainPoints"],
  market: ["marketDefinition", "marketSizingMethod", "tamSamSomOrNoData", "growthDrivers", "regionalDifferences", "dataBoundary"],
  competition: ["benchmarkCompetitors", "capabilityDifferences", "entryBarriers", "competitorEvidenceBoundary"],
  selfFit: ["selfCapabilityAssumption", "knownGaps", "userInputRequired", "improvementActions", "doNotInventInternalFacts"],
  product: ["productPositioning", "scopeBoundary", "productFamily", "skuOrPowerRange", "formFactor", "mvp"],
  specs: ["efficiency", "powerDensity", "moduleHeight", "rackPower", "coolingCapacity", "PUE_WUE", "supplyTemperature", "pressureControl", "certification", "reliability"],
  technology: ["architecturePosition", "upstreamInterface", "downstreamInterface", "technologyRoutes", "validationGates", "maturity", "standardsRisk"],
  roadmap: ["year2026", "year2027", "year2028", "mvp", "pilot", "transferToProduction", "launch"],
  gtm: ["targetIndustries", "lighthouseCustomers", "channels", "certificationPath", "salesTools", "regionalEntrySequence", "salesTalkTrack"],
  pdc: ["projectValue", "targetMarket", "marketCapacityOrNoData", "threeYearRevenueImpactOrNoData", "budgetOrNoData", "ROIOrNoData", "priority", "charterDate", "launchDate"],
  lcm: ["lifecycleStage", "replacementProduct", "replacementType", "limitedDate", "stopSellDate", "serviceEndDate", "migrationStrategy"],
  evidence: ["facts", "expertJudgment", "sourceRequired", "noQuantifiedData", "confidenceLevel", "caveats"],
});

const QUANTIFIED_FIELD_NAMES = new Set([
  "tamSamSomOrNoData",
  "cagrOrNoData",
  "marketCapacityOrNoData",
  "threeYearRevenueImpactOrNoData",
  "budgetOrNoData",
  "ROIOrNoData",
  "efficiency",
  "powerDensity",
  "rackPower",
  "coolingCapacity",
  "PUE_WUE",
]);

const INTERNAL_CAPABILITY_FIELDS = new Set([
  "selfCapabilityAssumption",
  "knownGaps",
  "improvementActions",
]);

const SAFE_NULL_STATUSES = new Set([
  "source_required",
  "no_quantified_data",
  "user_input_required",
]);

const normalizeTrack = (filters = {}) => filters.track || filters.normalizedTrack || "全部";

const resolveSeedKey = (selectedContext = {}) => {
  if (selectedContext.entityType === "all" || selectedContext.normalizedTrack === "全部") return "portfolio";
  if (selectedContext.entityId && PRODUCT_PLANNING_CARD_SEEDS[selectedContext.entityId]) return selectedContext.entityId;
  return null;
};

const isFieldValue = (field) =>
  field
  && typeof field === "object"
  && "value" in field
  && "evidenceStatus" in field
  && Array.isArray(field.evidenceRefs)
  && "caveat" in field;

const validateFieldValue = ({ section, fieldName, field }, errors) => {
  if (!isFieldValue(field)) {
    errors.push(`invalid-field-wrapper:${section}.${fieldName}`);
    return;
  }
  if (!EVIDENCE_STATUSES.includes(field.evidenceStatus)) {
    errors.push(`invalid-evidence-status:${section}.${fieldName}:${field.evidenceStatus}`);
  }
  if (field.applicability && !APPLICABILITY_STATUSES.includes(field.applicability)) {
    errors.push(`invalid-applicability:${section}.${fieldName}:${field.applicability}`);
  }
  if (field.value === null && !SAFE_NULL_STATUSES.has(field.evidenceStatus)) {
    errors.push(`unsafe-null-evidence:${section}.${fieldName}:${field.evidenceStatus}`);
  }
  if (QUANTIFIED_FIELD_NAMES.has(fieldName) && field.evidenceStatus === "expert_judgment") {
    errors.push(`quantified-field-cannot-use-expert-judgment:${section}.${fieldName}`);
  }
  if (INTERNAL_CAPABILITY_FIELDS.has(fieldName) && field.evidenceStatus !== "user_input_required") {
    errors.push(`internal-capability-must-require-user-input:${section}.${fieldName}`);
  }
  if ((fieldName === "charterDate" || fieldName === "launchDate") && field.value !== null) {
    errors.push(`date-must-not-be-invented:${section}.${fieldName}`);
  }
};

const validateSection = (card, section, errors) => {
  const sectionValue = card?.[section];
  if (!sectionValue) {
    errors.push(`missing-section:${section}`);
    return;
  }
  REQUIRED_SECTION_FIELDS[section].forEach((fieldName) => {
    if (!(fieldName in sectionValue)) {
      errors.push(`missing-field:${section}.${fieldName}`);
      return;
    }
    validateFieldValue({ section, fieldName, field: sectionValue[fieldName] }, errors);
  });
  Object.entries(sectionValue).forEach(([fieldName, field]) => {
    if (!REQUIRED_SECTION_FIELDS[section].includes(fieldName)) {
      validateFieldValue({ section, fieldName, field }, errors);
    }
  });
};

const buildAskBoundary = (card, selectedContext) => ({
  mode: card?.mode || "unsupported",
  sourceOfTruth: "Product Planning Card local contract",
  selectedTrack: selectedContext.normalizedTrack,
  mustNotOverride: [
    "evidenceStatus",
    "track maturity",
    "applicability",
    "no-data quantitative fields",
    "Portfolio View allocation mode",
    "HVDC/SST boundary",
  ],
  prohibitedClaims: [
    "TAM/SAM/SOM/CAGR",
    "ROI/revenue/budget",
    "charterDate/launchDate",
    "named lighthouse customers",
    "internal capability",
    "certification/reliability/spec metrics without sources",
  ],
  portfolioRule: selectedContext.entityType === "all"
    ? "Answer as Portfolio View; do not select one winning track."
    : "Answer for the selected Product Planning Card only.",
});

export function validateProductPlanningCard(card) {
  const errors = [];
  PRODUCT_PLANNING_SECTIONS.forEach((section) => validateSection(card, section, errors));

  if (card?.entityId === "sst") {
    if (card.technology?.maturity?.value !== "low") errors.push("sst-maturity-must-remain-low");
    if (card.roadmap?.launch?.value !== null) errors.push("sst-launch-must-not-be-populated");
    if (card.pdc?.threeYearRevenueImpactOrNoData?.evidenceStatus !== "no_quantified_data") errors.push("sst-revenue-must-remain-no-data");
  }

  if (card?.entityId === "hvdc") {
    const boundaryText = [
      card.product?.scopeBoundary?.value,
      card.technology?.architecturePosition?.value,
      card.gtm?.salesTalkTrack?.value,
    ].flat().join(" ");
    if (!/SST|800VDC|architecture|架构|边界/.test(boundaryText)) errors.push("hvdc-missing-architecture-boundary");
  }

  if (card?.entityId === "liquid_cooling") {
    const form = String(card.product?.formFactor?.value || "");
    ["cold plate", "CDU", "manifold", "secondary"].forEach((token) => {
      if (!form.includes(token)) errors.push(`liquid-cooling-missing-component:${token}`);
    });
  }

  if (card?.entityId === "pdu_rpp_sts") {
    const family = String(card.product?.productFamily?.value || "");
    ["PDU", "RPP", "STS"].forEach((token) => {
      if (!family.includes(token)) errors.push(`pdu-rpp-sts-missing-family:${token}`);
    });
    if (/generic power distribution/i.test(String(card.product?.productPositioning?.value || ""))) {
      errors.push("pdu-rpp-sts-flattened-to-generic-distribution");
    }
  }

  if (card?.entityId === "modular_ups") {
    ["productFamily", "mvp"].forEach((field) => {
      if (!card.product?.[field]?.value) errors.push(`modular-ups-missing-product-${field}`);
    });
    ["mvp", "pilot"].forEach((field) => {
      if (!card.roadmap?.[field]?.value && card.roadmap?.[field]?.evidenceStatus !== "source_required") errors.push(`modular-ups-missing-roadmap-${field}`);
    });
    if (!card.pdc || !card.lcm) errors.push("modular-ups-missing-pdc-lcm");
  }

  if (card?.entityId === "portfolio") {
    if (card.mode !== "portfolio_view") errors.push("portfolio-mode-must-be-portfolio-view");
    if (card.product?.skuOrPowerRange?.applicability !== "not_applicable") errors.push("portfolio-must-not-own-single-sku");
    if (!/without selecting a single winner|no-single-winner|不能.*单一|not.*single/i.test(String(card.product?.mvp?.value || ""))) {
      errors.push("portfolio-must-state-no-single-winner-rule");
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function buildProductPlanningCardContract(filters = {}, options = {}) {
  const selectedContext = options.selectedContext || {
    ...classifyEntity(normalizeTrack(filters)),
    track: normalizeTrack(filters),
    normalizedTrack: classifyEntity(normalizeTrack(filters)).label,
  };
  const seedKey = resolveSeedKey(selectedContext);
  const card = seedKey ? PRODUCT_PLANNING_CARD_SEEDS[seedKey] : null;
  const validation = card
    ? validateProductPlanningCard(card)
    : {
      valid: true,
      errors: [],
      warnings: [`Step A Product Planning Card is not seeded for ${selectedContext.normalizedTrack}.`],
    };

  return {
    contractVersion: PRODUCT_PLANNING_CONTRACT_VERSION,
    step: "V1.5 Phase 2.1 Step A",
    supportedEntityIds: STEP_A_SUPPORTED_ENTITY_IDS,
    selectedContext,
    supported: Boolean(card),
    unsupportedReason: card ? null : "Step A is limited to 5+1 representative Product Planning Cards.",
    card,
    pageConsumption: PRODUCT_PLANNING_PAGE_CONSUMPTION,
    askBoundary: buildAskBoundary(card, selectedContext),
    validation,
  };
}

export function summarizeProductPlanningCardForAsk(contract) {
  const card = contract?.card;
  if (!card) {
    return {
      supported: false,
      summary: contract?.unsupportedReason || "No Step A Product Planning Card is available.",
      prohibitedClaims: contract?.askBoundary?.prohibitedClaims || [],
    };
  }

  return {
    supported: true,
    cardId: card.cardId,
    mode: card.mode,
    trackLabel: card.trackLabel,
    productBoundary: card.product.scopeBoundary,
    marketBoundary: card.market.dataBoundary,
    maturity: card.technology.maturity,
    roadmapBoundary: card.roadmap.launch,
    pdcBoundary: card.pdc.ROIOrNoData,
    evidenceBoundary: card.evidence.noQuantifiedData,
    askBoundary: contract.askBoundary,
  };
}
