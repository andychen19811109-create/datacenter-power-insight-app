import { strict as assert } from "node:assert";
import { buildPhase2InsightContract } from "../src/utils/filterContext.js";
import {
  buildRecommendedQuestions,
  validateRecommendedQuestions,
} from "../src/utils/recommendedQuestionsContext.js";

const scenarios = [
  { role: "高管", region: "全球", track: "全部", time: "2026" },
  { role: "投资者", region: "中国", track: "HVDC", time: "2027" },
  { role: "产品", region: "北美", track: "塔式 UPS", time: "2028" },
  { role: "产品", region: "北美", track: "模块化 UPS", time: "2028" },
  { role: "市场", region: "中国", track: "精密空调", time: "2027" },
  { role: "研发", region: "欧洲", track: "液冷 CDU", time: "2030" },
  { role: "产品", region: "中国", track: "UPS", time: "2028" },
  { role: "产品", region: "中国", track: "工业 UPS", time: "2028" },
  { role: "产品", region: "中国", track: "电力 UPS", time: "2028" },
  { role: "投资者", region: "中国", track: "800VDC", time: "2027" },
  { role: "产品", region: "中国", track: "GaN/SiC", time: "2028" },
];

const questionSets = scenarios.map((scenario) => {
  const contract = buildPhase2InsightContract(scenario);
  const questions = buildRecommendedQuestions(contract);
  const validation = validateRecommendedQuestions(questions, contract);
  assert.equal(validation.valid, true, `${scenario.track} questions must validate: ${validation.errors.join(", ")}`);
  return { scenario, contract, questions, joined: questions.join("\n") };
});

assert.equal(new Set(questionSets.map((item) => item.joined)).size, scenarios.length, "11 scenario question sets must not be identical");

const roleA = buildRecommendedQuestions(buildPhase2InsightContract({ role: "高管", region: "全球", track: "全部", time: "2026" }));
const roleB = buildRecommendedQuestions(buildPhase2InsightContract({ role: "研发", region: "全球", track: "全部", time: "2026" }));
assert.notDeepEqual(roleA, roleB, "role change must change questions");

const regionA = buildRecommendedQuestions(buildPhase2InsightContract({ role: "产品", region: "全球", track: "塔式 UPS", time: "2028" }));
const regionB = buildRecommendedQuestions(buildPhase2InsightContract({ role: "产品", region: "北美", track: "塔式 UPS", time: "2028" }));
assert.notDeepEqual(regionA, regionB, "region change must change questions");

const trackA = buildRecommendedQuestions(buildPhase2InsightContract({ role: "产品", region: "北美", track: "塔式 UPS", time: "2028" }));
const trackB = buildRecommendedQuestions(buildPhase2InsightContract({ role: "产品", region: "北美", track: "模块化 UPS", time: "2028" }));
assert.notDeepEqual(trackA, trackB, "track change must change questions");

const timeA = buildRecommendedQuestions(buildPhase2InsightContract({ role: "产品", region: "北美", track: "塔式 UPS", time: "2027" }));
const timeB = buildRecommendedQuestions(buildPhase2InsightContract({ role: "产品", region: "北美", track: "塔式 UPS", time: "2028" }));
assert.notDeepEqual(timeA, timeB, "timeHorizon change must change questions");

const architecture = questionSets.find((item) => item.scenario.track === "800VDC").joined;
assert.ok(architecture.includes("架构验证"), "architecture route must ask architecture validation question");
assert.ok(architecture.includes("迁移路径"), "architecture route must ask migration path question");
assert.ok(architecture.includes("HVDC") && architecture.includes("SST"), "architecture route must mention HVDC/SST relationship");
assert.equal(/产品赛道机会/.test(architecture), false, "architecture route must not generate product track opportunity wording");

const technology = questionSets.find((item) => item.scenario.track === "GaN/SiC").joined;
assert.ok(technology.includes("器件技术"), "technology tag must ask device technology question");
assert.ok(technology.includes("服务器电源"), "technology tag must ask server power adaptation question");
assert.ok(technology.includes("成熟度"), "technology tag must ask maturity question");
assert.equal(/产品赛道机会/.test(technology), false, "technology tag must not generate product track opportunity wording");

for (const track of ["工业 UPS", "电力 UPS"]) {
  const joined = questionSets.find((item) => item.scenario.track === track).joined;
  assert.ok(joined.includes("塔式 UPS 应用细分"), `${track} must be framed as tower UPS application segment`);
  assert.ok(joined.includes("客户场景") || joined.includes("认证可靠性"), `${track} must ask scenario or reliability question`);
  assert.equal(/一级赛道机会|产品赛道机会/.test(joined), false, `${track} must not be framed as primary product track opportunity`);
}

const cooling = questionSets.find((item) => item.scenario.track === "精密空调").joined;
assert.ok(cooling.includes("热管理"), "precision cooling must generate thermal management question");
assert.ok(cooling.includes("液冷 CDU"), "precision cooling must discuss liquid CDU substitution/complement");

console.log("V1.5 Phase 2C recommended question tests passed");
