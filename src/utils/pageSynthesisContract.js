import { getProductPlanningCard, listMissingInputs, summarizeField } from "../data/productPlanningCards.js";
import { TAXONOMY_OBJECTS, TAXONOMY_SCOPE } from "../data/taxonomyRegistry.js";

export const PAGE_LINKAGE_STATEMENT = "本回答基于同一份产品规划合同，并综合总览、市场、产品、技术和公司能力五类页面输入生成；缺失事实保留 source_required / no_quantified_data / user_input_required / not_applicable。";

const pick = (field) => ({
  value: field?.value ?? null,
  text: summarizeField(field),
  evidenceStatus: field?.evidenceStatus || "source_required",
  applicability: field?.applicability || "source_required",
  caveat: field?.caveat || "Source required.",
});

export function buildPageSynthesisContract(resolution) {
  const card = getProductPlanningCard(resolution.resolvedObjectId);
  if (!card) {
    return {
      resolution,
      card: null,
      pageLinkageStatement: PAGE_LINKAGE_STATEMENT,
      missingInputs: ["planningCard:source_required"],
      unsupportedReason: "当前解析对象缺少可用的产品规划合同。",
      taxonomyScope: TAXONOMY_SCOPE,
    };
  }

  return {
    resolution,
    card,
    taxonomyObject: TAXONOMY_OBJECTS[card.objectId],
    taxonomyScope: TAXONOMY_SCOPE,
    pageLinkageStatement: PAGE_LINKAGE_STATEMENT,
    overviewInput: {
      planningObject: card.label,
      mode: card.mode,
      maturity: pick(card.technology.maturity),
      pdcPriority: pick(card.pdc.priority),
      roadmap2026: pick(card.roadmap.year2026),
      roadmap2027: pick(card.roadmap.year2027),
      roadmap2028: pick(card.roadmap.year2028),
      exitCondition: pick(card.evidence.caveats),
    },
    marketInput: {
      definition: pick(card.market.definition),
      trend: pick(card.market.trend),
      customerSegments: pick(card.customer.targetSegments),
      scenarios: pick(card.customer.scenarios),
      buyingLogic: pick(card.customer.buyingLogic),
      marketSize: pick(card.market.tamSamSomOrNoData),
      regionalBoundary: pick(card.market.regionalBoundary),
    },
    productInput: {
      family: pick(card.product.family),
      boundary: pick(card.product.boundary),
      components: pick(card.product.components),
      skuOrRange: pick(card.product.skuOrRange),
      pdc: {
        projectValue: pick(card.pdc.projectValue),
        roi: pick(card.pdc.ROIOrNoData),
        revenue: pick(card.pdc.threeYearRevenueImpactOrNoData),
        budget: pick(card.pdc.budgetOrNoData),
        launchDate: pick(card.pdc.launchDate),
      },
      lcm: {
        lifecycleStage: pick(card.lcm.lifecycleStage),
        replacementProduct: pick(card.lcm.replacementProduct),
        migrationStrategy: pick(card.lcm.migrationStrategy),
      },
    },
    technologyInput: {
      architecturePosition: pick(card.technology.architecturePosition),
      interfaces: pick(card.technology.interfaces),
      validationGates: pick(card.technology.validationGates),
      specs: Object.fromEntries(Object.entries(card.specs).map(([key, value]) => [key, pick(value)])),
    },
    companiesInput: {
      benchmarkCompetitors: pick(card.competition.benchmarkCompetitors),
      capabilityMap: pick(card.competition.capabilityMap),
      entryBarriers: pick(card.competition.entryBarriers),
    },
    missingInputs: listMissingInputs(card),
  };
}
