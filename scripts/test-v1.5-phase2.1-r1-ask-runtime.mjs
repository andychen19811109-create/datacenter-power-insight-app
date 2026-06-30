import { strict as assert } from "node:assert";
import { analyzeAskQuestion } from "../src/utils/insightEngine.js";
import { buildDifyRequestPayload } from "../src/utils/difyRequestPayload.js";
import { normalizeDifyResponseToAskContract } from "../src/utils/difyResponseNormalizer.js";

const baseFilters = {
  role: "产品",
  region: "全球",
  customer: "全部",
  application: "全部",
  time: "2026",
};

const cases = [
  {
    id: "liquid-roadmap",
    filters: { ...baseFilters, track: "液冷" },
    question: "请输出液冷产品2026/2027/2028 Roadmap。",
    object: "液冷",
    includes: ["五看", "三定", "2026", "2027", "2028", "CDU", "cold plate", "manifold", "secondary loop", "quick connector", "leakage prevention", "control linkage", "O&M", "validation gates", "source_required", "no_quantified_data"],
  },
  {
    id: "sst-roadmap",
    filters: { ...baseFilters, track: "SST" },
    question: "请输出SST产品2026/2027/2028 Roadmap。",
    object: "SST",
    includes: ["五看", "三定", "2026", "2027", "2028", "research / prototype / validation / watch / exit", "validation horizons", "not launch commitments or short-term revenue milestones", "low maturity", "no_quantified_data"],
    excludes: ["上市日期：2026"],
  },
  {
    id: "conflict-override",
    filters: { ...baseFilters, track: "SST" },
    question: "请输出液冷产品2026/2027/2028 Roadmap。",
    object: "液冷",
    includes: ["当前筛选赛道为SST", "问题显式对象为液冷", "Liquid Cooling", "CDU", "2026", "2027", "2028"],
  },
  {
    id: "portfolio",
    filters: { ...baseFilters, role: "高管", track: "全部" },
    question: "全部赛道下，应该如何做产品组合投资取舍？",
    object: "全部",
    includes: ["Portfolio View", "不输出单一赢家", "invest / validate / watch / exit", "maturity", "risk-return", "exit", "missingInputs"],
    excludes: ["需要澄清对象"],
  },
  {
    id: "liquid-no-data",
    filters: { ...baseFilters, role: "投资者", track: "液冷" },
    question: "请给出液冷产品的TAM、ROI、目标客户和上市时间。",
    object: "液冷",
    includes: ["TAM / SAM / SOM", "no_quantified_data", "ROI", "source_required", "Evidence-needed list", "上市时间"],
    excludes: ["ROI 为 1", "上市时间为202"],
  },
  {
    id: "sst-no-data",
    filters: { ...baseFilters, role: "投资者", track: "SST" },
    question: "请给出SST的ROI、TAM、上市时间和目标客户。",
    object: "SST",
    includes: ["low maturity", "pre-commercial", "no_quantified_data", "source_required", "missingInputs", "exit"],
    excludes: ["上市时间为202", "目标客户为阿里"],
  },
];

for (const testCase of cases) {
  const result = analyzeAskQuestion(testCase.question, testCase.filters);
  const body = result.outputContract.fullText;
  const normalizedBody = body.toLowerCase();
  assert.equal(result.outputContract.resolvedPlanningObject, testCase.object, `${testCase.id}: resolved object`);
  assert.equal(result.outputContract.productPlanningCard.label, testCase.object, `${testCase.id}: card label`);
  assert.ok(body.includes("五看"), `${testCase.id}: body must include 五看`);
  assert.ok(body.includes("三定"), `${testCase.id}: body must include 三定`);
  assert.ok(body.includes("证据边界"), `${testCase.id}: body must include evidence boundary`);
  assert.ok(body.includes("Product Planning Card"), `${testCase.id}: body must include page linkage`);
  for (const token of testCase.includes || []) {
    assert.ok(normalizedBody.includes(String(token).toLowerCase()), `${testCase.id}: body must include ${token}\n${body}`);
  }
  for (const token of testCase.excludes || []) {
    assert.equal(normalizedBody.includes(String(token).toLowerCase()), false, `${testCase.id}: body must not include ${token}\n${body}`);
  }
  assert.equal(/(?:TAM|ROI)\s*[为是]\s*\d/i.test(body), false, `${testCase.id}: no numeric TAM/ROI fabrication`);
  assert.equal(/上市时间\s*[为是]\s*20\d{2}/.test(body), false, `${testCase.id}: no launch-date fabrication`);
}

const comparison = analyzeAskQuestion("HVDC 和 SST 在产品规划上应该如何区分？", { ...baseFilters, track: "全部" });
assert.equal(comparison.outputContract.planningObjectResolution.mode, "comparison", "multi-object question must enter comparison mode");
assert.ok(comparison.outputContract.planningObjectResolution.comparisonObjectIds.includes("hvdc"), "comparison must preserve HVDC");
assert.ok(comparison.outputContract.planningObjectResolution.comparisonObjectIds.includes("sst"), "comparison must preserve SST");

const localAnalysis = analyzeAskQuestion("请输出液冷产品2026/2027/2028 Roadmap。", { ...baseFilters, track: "液冷" });
const payload = buildDifyRequestPayload({
  question: localAnalysis.outputContract.question,
  filters: localAnalysis.outputContract.filters,
  insightContext: {
    productPlanningCard: localAnalysis.outputContract.productPlanningCard,
    pageSynthesisContract: localAnalysis.outputContract.pageSynthesisContract,
    evidenceBoundary: localAnalysis.outputContract.evidenceBoundary,
  },
  analysisState: localAnalysis,
});
assert.ok(payload.cleanR1Contract, "Dify payload must carry Clean R1 contract");
assert.match(payload.difyInputs.extra_context, /Clean R1 Product Planning Contract/, "Dify payload must include Clean R1 context");
assert.match(payload.difyInputs.extra_context, /missingInputs=.*source_required|missingInputs=.*no_quantified_data/, "Dify payload must carry missing inputs");

const fallback = normalizeDifyResponseToAskContract({
  rawDifyResponse: { answer: "核心结论：建议L3投入。\nValidation Gate: 做验证。" },
  question: localAnalysis.outputContract.question,
  filters: localAnalysis.outputContract.filters,
  requestPayload: { ...payload, analysisState: localAnalysis },
  localFallback: () => ({
    ...localAnalysis.outputContract,
    provider: "local",
    providerStatus: "fallback",
    warnings: [],
    fallbackUsed: true,
  }),
});
assert.equal(fallback.provider, "local", "Dify output without Clean R1 body must fallback to local");
assert.equal(fallback.providerStatus, "fallback", "fallback provider status");
assert.ok(fallback.fullText.includes("五看"), "Dify unavailable/invalid fallback must preserve expert body");

console.log("Clean R1 Ask runtime semantic tests passed");
