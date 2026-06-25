import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildFilterOptionsFromOntology, buildPhase2InsightContract } from "../src/utils/filterContext.js";
import { buildModuleContextSet, validateModuleContextConsistency } from "../src/utils/moduleContextSelectors.js";
import { buildRecommendedQuestions, validateRecommendedQuestions } from "../src/utils/recommendedQuestionsContext.js";
import { buildChartScopeContext, validateChartScopeContext } from "../src/utils/chartScopeContext.js";

const root = resolve(new URL("..", import.meta.url).pathname);
const scenarios = [
  { name: "高管 / 全球 / 全部 / 2026", role: "高管", region: "全球", track: "全部", time: "2026" },
  { name: "投资者 / 中国 / HVDC / 2027", role: "投资者", region: "中国", track: "HVDC", time: "2027" },
  { name: "产品 / 北美 / 塔式 UPS / 2028", role: "产品", region: "北美", track: "塔式 UPS", time: "2028" },
  { name: "产品 / 北美 / 模块化 UPS / 2028", role: "产品", region: "北美", track: "模块化 UPS", time: "2028" },
  { name: "市场 / 中国 / 精密空调 / 2027", role: "市场", region: "中国", track: "精密空调", time: "2027" },
  { name: "研发 / 欧洲 / 液冷 CDU / 2030", role: "研发", region: "欧洲", track: "液冷 CDU", time: "2030" },
  { name: "产品 / 中国 / UPS / 2028", role: "产品", region: "中国", track: "UPS", time: "2028" },
  { name: "产品 / 中国 / 工业 UPS / 2028", role: "产品", region: "中国", track: "工业 UPS", time: "2028" },
  { name: "产品 / 中国 / 电力 UPS / 2028", role: "产品", region: "中国", track: "电力 UPS", time: "2028" },
  { name: "投资者 / 中国 / 800VDC / 2027", role: "投资者", region: "中国", track: "800VDC", time: "2027" },
  { name: "产品 / 中国 / GaN/SiC / 2028", role: "产品", region: "中国", track: "GaN/SiC", time: "2028" },
];

const results = [];
for (const scenario of scenarios) {
  const contract = buildPhase2InsightContract(scenario);
  const moduleContext = buildModuleContextSet(contract);
  const moduleValidation = validateModuleContextConsistency(moduleContext);
  const recommendedQuestions = buildRecommendedQuestions(contract);
  const questionValidation = validateRecommendedQuestions(recommendedQuestions, contract);
  const chartScope = buildChartScopeContext(contract);
  const chartValidation = validateChartScopeContext(chartScope, contract);

  assert.equal(contract.validation.valid, true, `${scenario.name} contract must be valid`);
  assert.equal(moduleValidation.valid, true, `${scenario.name} moduleContext must be valid: ${moduleValidation.errors.join(", ")}`);
  assert.equal(questionValidation.valid, true, `${scenario.name} questions must be valid: ${questionValidation.errors.join(", ")}`);
  assert.equal(chartValidation.valid, true, `${scenario.name} chartScope must be valid: ${chartValidation.errors.join(", ")}`);
  assert.ok(contract.selectedContext.normalizedTrack, `${scenario.name} normalizedTrack must exist`);
  assert.ok(contract.selectedContext.entityType, `${scenario.name} entityType must exist`);
  assert.ok(contract.selectedContext.matchState, `${scenario.name} matchState must exist`);
  results.push({
    scenario: scenario.name,
    normalizedTrack: contract.selectedContext.normalizedTrack,
    entityType: contract.selectedContext.entityType,
    matchState: contract.selectedContext.matchState,
    moduleContext: moduleValidation.valid,
    recommendedQuestions: questionValidation.valid,
    chartScope: chartValidation.valid,
  });
}

const appSource = await readFile(resolve(root, "src/App.jsx"), "utf8");
assert.equal(appSource.includes("2025"), false, "App.jsx must not reintroduce 2025 time option");
const filterOptions = buildFilterOptionsFromOntology();
assert.equal(filterOptions.time.includes("2025"), false, "filter options must not reintroduce 2025 time option");
assert.equal(filterOptions.time.includes("2028"), true, "filter options must include 2028");
for (const forbidden of ["800VDC", "GaN/SiC", "工业 UPS", "电力 UPS"]) {
  assert.equal(appSource.includes(forbidden), false, `App.jsx must not hardcode ${forbidden}`);
}

execFileSync(process.execPath, ["scripts/runAskRegression.mjs"], { cwd: root, stdio: "inherit" });
execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });

console.table(results);
console.log("V1.5 Phase 2 acceptance tests passed");
