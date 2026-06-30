import { strict as assert } from "node:assert";
import { buildPhase2InsightContract } from "../src/utils/filterContext.js";
import {
  PRODUCT_PLANNING_CONTRACT_VERSION,
  STEP_A_SUPPORTED_ENTITY_IDS,
  summarizeProductPlanningCardForAsk,
  validateProductPlanningCard,
} from "../src/utils/productPlanningContract.js";
import { buildDifyRequestPayload } from "../src/utils/difyRequestPayload.js";
import { analyzeAskQuestion } from "../src/utils/insightEngine.js";

const SAFE_UNSUPPORTED_STATUSES = new Set([
  "source_required",
  "no_quantified_data",
  "user_input_required",
]);

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

const scenarios = [
  { track: "模块化 UPS", entityId: "modular_ups" },
  { track: "液冷", entityId: "liquid_cooling" },
  { track: "PDU/RPP/STS", entityId: "pdu_rpp_sts" },
  { track: "HVDC", entityId: "hvdc" },
  { track: "SST", entityId: "sst" },
  { track: "全部", entityId: "portfolio" },
];

const allFieldEntries = (card) => Object.entries(card)
  .filter(([, value]) => value && typeof value === "object" && !Array.isArray(value))
  .flatMap(([sectionName, section]) =>
    Object.entries(section)
      .filter(([, field]) => field && typeof field === "object" && "evidenceStatus" in field)
      .map(([fieldName, field]) => ({ sectionName, fieldName, field })));

for (const scenario of scenarios) {
  const contract = buildPhase2InsightContract({
    role: "产品",
    region: "全球",
    customer: "全部",
    application: "全部",
    track: scenario.track,
    time: "2026",
  });
  const planning = contract.productPlanningCardContract;
  const card = planning.card;

  assert.equal(planning.contractVersion, PRODUCT_PLANNING_CONTRACT_VERSION, `${scenario.track} contract version`);
  assert.equal(planning.supported, true, `${scenario.track} must be Step A supported`);
  assert.equal(card.entityId, scenario.entityId, `${scenario.track} must resolve to expected seed card`);
  assert.ok(STEP_A_SUPPORTED_ENTITY_IDS.includes(card.entityId), `${scenario.track} entity must be in Step A supported list`);
  assert.equal(planning.validation.valid, true, `${scenario.track} planning contract valid: ${planning.validation.errors.join(", ")}`);
  assert.equal(validateProductPlanningCard(card).valid, true, `${scenario.track} card validator must pass`);

  for (const { fieldName, field } of allFieldEntries(card)) {
    assert.ok(field.evidenceStatus, `${scenario.track}.${fieldName} must carry evidenceStatus`);
    assert.ok(Array.isArray(field.evidenceRefs), `${scenario.track}.${fieldName} must carry evidenceRefs`);
    assert.equal(typeof field.caveat, "string", `${scenario.track}.${fieldName} must carry caveat`);
    if (field.value === null) {
      assert.ok(
        SAFE_UNSUPPORTED_STATUSES.has(field.evidenceStatus),
        `${scenario.track}.${fieldName} null must be source_required/no_quantified_data/user_input_required`
      );
    }
    if (QUANTIFIED_FIELD_NAMES.has(fieldName)) {
      assert.notEqual(field.evidenceStatus, "expert_judgment", `${scenario.track}.${fieldName} quantified field must not use expert_judgment`);
    }
  }
}

const modularUps = buildPhase2InsightContract({ track: "模块化 UPS", time: "2026" }).productPlanningCard;
assert.ok(modularUps.product.productFamily.value, "Modular UPS must include product family");
assert.ok(modularUps.roadmap.mvp.value, "Modular UPS must include roadmap MVP boundary");
assert.ok(modularUps.pdc.ROIOrNoData.evidenceStatus === "no_quantified_data", "Modular UPS PDC ROI must remain no-data");
assert.ok(modularUps.lcm.lifecycleStage.value, "Modular UPS must include LCM boundary");

const liquidCooling = buildPhase2InsightContract({ track: "液冷", time: "2026" }).productPlanningCard;
const liquidForm = String(liquidCooling.product.formFactor.value);
for (const token of ["CDU", "cold plate", "manifold", "secondary loop"]) {
  assert.ok(liquidForm.includes(token), `Liquid cooling must distinguish ${token}`);
}
assert.equal(liquidCooling.specs.coolingCapacity.evidenceStatus, "source_required", "Liquid cooling cooling capacity must not be invented");

const pdu = buildPhase2InsightContract({ track: "PDU/RPP/STS", time: "2026" }).productPlanningCard;
for (const token of ["PDU", "RPP", "STS"]) {
  assert.ok(String(pdu.product.productFamily.value).includes(token), `PDU/RPP/STS must preserve ${token}`);
}
assert.equal(/generic power distribution/i.test(pdu.product.productPositioning.value), false, "PDU/RPP/STS must not flatten into generic distribution");

const hvdc = buildPhase2InsightContract({ track: "HVDC", time: "2026" }).productPlanningCard;
assert.match(hvdc.product.scopeBoundary.value, /800VDC/, "HVDC must include 800VDC architecture boundary");
assert.match(hvdc.gtm.salesTalkTrack.value, /SST|800VDC|architecture|架构/, "HVDC GTM must preserve architecture constraints");

const sst = buildPhase2InsightContract({ track: "SST", time: "2026" }).productPlanningCard;
assert.equal(sst.technology.maturity.value, "low", "SST must stay low maturity");
assert.equal(sst.roadmap.launch.value, null, "SST must not have short-term launch");
assert.equal(sst.pdc.threeYearRevenueImpactOrNoData.evidenceStatus, "no_quantified_data", "SST revenue must remain no-data");

const portfolioContract = buildPhase2InsightContract({ track: "全部", time: "2026" }).productPlanningCardContract;
assert.equal(portfolioContract.card.mode, "portfolio_view", "Portfolio must use portfolio_view mode");
assert.match(portfolioContract.askBoundary.portfolioRule, /Portfolio View/, "Portfolio Ask boundary must require Portfolio View");
assert.equal(portfolioContract.card.product.skuOrPowerRange.applicability, "not_applicable", "Portfolio must not own a single SKU");
assert.doesNotMatch(portfolioContract.card.productPositioning?.value || "", /winner|top track/i, "Portfolio must not become one winner");

const askResult = analyzeAskQuestion("全部赛道应该如何做资源分配？", { track: "全部", role: "高管", region: "全球", time: "2026" });
assert.ok(
  askResult.outputContract.evidenceBoundary.some((item) => /Product Planning Card/.test(item)),
  "Local Ask output must include Product Planning Card evidence boundary"
);
assert.ok(
  askResult.outputContract.evidenceBoundary.some((item) => /Portfolio View/.test(item)),
  "Local Ask output must preserve Portfolio View boundary"
);

const difyPayload = buildDifyRequestPayload({
  question: "SST 是否适合 2026 年直接商业化？",
  filters: { track: "SST", role: "投资者", region: "全球", time: "2026" },
  insightContext: {
    ...buildPhase2InsightContract({ track: "SST", role: "投资者", region: "全球", time: "2026" }).insightContext,
    productPlanningCardContract: buildPhase2InsightContract({ track: "SST", role: "投资者", region: "全球", time: "2026" }).productPlanningCardContract,
  },
  analysisState: analyzeAskQuestion("SST 是否适合 2026 年直接商业化？", { track: "SST", role: "投资者", region: "全球", time: "2026" }),
});

assert.equal(difyPayload.productPlanningCardSummary.trackLabel, "SST", "Dify payload must carry Product Planning Card summary");
assert.match(difyPayload.difyInputs.extra_context, /Product Planning Card Contract/, "Dify extra context must include Product Planning Card contract");
assert.match(difyPayload.difyInputs.extra_context, /不得覆盖 Product Planning Card/, "Dify extra context must block overriding local card");
assert.match(difyPayload.difyInputs.extra_context, /maturity=low/, "Dify extra context must preserve SST low maturity");

console.log("V1.5 Phase 2.1 Product Planning Card contract tests passed");
