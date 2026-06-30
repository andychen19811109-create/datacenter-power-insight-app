import { strict as assert } from "node:assert";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildInsightContext } from "../src/utils/insightContext.js";
import { buildPhase2InsightContract } from "../src/utils/filterContext.js";
import {
  buildDefaultAskQuestion,
  buildRecommendedQuestions,
} from "../src/utils/recommendedQuestionsContext.js";

const root = resolve(new URL("..", import.meta.url).pathname);
const forbiddenPrimary = /800VDC|GaN\/SiC|变压器/;

const contextFor = (track) => buildInsightContext({
  role: "产品",
  region: "中国",
  customer: "云服务商",
  application: "AI 训练集群",
  track,
  time: "2027",
});

const assertPrimaryTrack = (track, forbidden = forbiddenPrimary) => {
  const context = contextFor(track);
  assert.ok(context.productContext.primaryOpportunity, `${track} must have a primaryOpportunity`);
  assert.equal(context.productContext.primaryOpportunity.track, track, `${track} must remain the primary object`);
  assert.equal(context.productContext.primaryOpportunity.relationshipToSelectedTrack, "primary", `${track} primary must be labeled primary`);
  assert.equal(forbidden.test(context.executiveBrief), false, `${track} executive summary must not be replaced by unrelated high-score object: ${context.executiveBrief}`);
  assert.notEqual(context.productContext.topOpportunities[0]?.relationshipToSelectedTrack, "adjacent", `${track} first top opportunity must not be adjacent`);
  return context;
};

assertPrimaryTrack("精密空调");
const liquid = assertPrimaryTrack("液冷", /800VDC/);
assert.equal(/只讲 CDU|仅.*CDU/.test(liquid.executiveBrief), false, "液冷 executive summary must not collapse to CDU only");
assertPrimaryTrack("PDU/RPP/STS");
assertPrimaryTrack("服务器电源", /800VDC/);
assertPrimaryTrack("塔式 UPS");
assertPrimaryTrack("SST", /800VDC/);

const hvdc = assertPrimaryTrack("HVDC", /GaN\/SiC|变压器/);
assert.equal(hvdc.productContext.primaryOpportunity.track, "HVDC", "HVDC must stay primary");
assert.ok(hvdc.productContext.adjacentOpportunities.some((item) => item.track === "800VDC" && item.relationshipToSelectedTrack === "adjacent"), "HVDC may include adjacent 800VDC but it must be labeled adjacent");

for (const track of ["精密空调", "液冷", "PDU/RPP/STS", "服务器电源"]) {
  const context = contextFor(track);
  assert.ok(context.productContext.adjacentOpportunities.every((item) => item.relationshipToSelectedTrack === "adjacent"), `${track} adjacent opportunities must be labeled`);
  assert.ok(context.productContext.adjacentOpportunities.every((item) => item.track !== context.productContext.primaryOpportunity?.track), `${track} adjacent opportunities must not duplicate primary`);
}

for (const track of ["氟泵多联", "磁悬浮", "间接蒸发冷", "Manifold", "母线槽", "unknown term"]) {
  const context = contextFor(track);
  const visibleText = [
    context.executiveBrief,
    context.productContext.primaryOpportunity?.track,
    context.productContext.opportunities.map((item) => item.track).join(" "),
  ].join("\n");
  assert.equal(context.productContext.primaryOpportunity, null, `${track} must not create unrelated primaryOpportunity`);
  assert.ok(context.productContext.unsupportedOrContextNeed, `${track} must be isolated as unsupported/context_need`);
  assert.equal(/800VDC/.test(visibleText), false, `${track} must not fallback to 800VDC: ${visibleText}`);
}

const defaultQuestionCases = [
  ["精密空调", /精密空调|氟泵多联|磁悬浮|间接蒸发冷|风液协同/, /电力UPS/],
  ["液冷", /液冷|冷板式|浸没式|CDU|Manifold/, /只.*CDU/],
  ["PDU/RPP/STS", /末端配电|PDU|RPP|STS|配电/, /800VDC/],
  ["服务器电源", /服务器电源|PSU/, /800VDC/],
  ["HVDC", /HVDC/, /电力UPS/],
  ["SST", /SST/, /800VDC.*主/],
  ["BBU", /BBU/, /电力UPS/],
  ["微模块", /微模块/, /电力UPS/],
  ["一体化电力模块", /一体化电力模块/, /电力UPS/],
];

for (const [track, expected, forbidden] of defaultQuestionCases) {
  const contract = buildPhase2InsightContract({ role: "产品", region: "中国", track, time: "2027" });
  const question = buildDefaultAskQuestion(contract);
  assert.match(question, expected, `${track} default question must follow selectedContext: ${question}`);
  assert.equal(forbidden.test(question), false, `${track} default question must not leak unrelated object: ${question}`);
}

const defaultA = buildDefaultAskQuestion(buildPhase2InsightContract({ role: "产品", region: "中国", track: "精密空调", time: "2027" }));
const defaultB = buildDefaultAskQuestion(buildPhase2InsightContract({ role: "产品", region: "中国", track: "液冷", time: "2027" }));
assert.notEqual(defaultA, defaultB, "default question must change when selectedContext changes");

const depthCases = [
  ["精密空调", [/氟泵多联/, /磁悬浮/, /气悬浮/, /间接蒸发冷|风液协同/]],
  ["液冷", [/冷板式/, /浸没式/, /后门换热/, /CDU/, /Manifold/, /一次\/二次侧|一次.*二次侧/]],
  ["PDU/RPP/STS", [/末端配电/, /RPP/, /STS/, /PDU/, /母线槽/, /双路供电/]],
  ["服务器电源", [/PSU/, /高压输入/, /48V|54V/, /功率密度/]],
];

for (const [track, patterns] of depthCases) {
  const contract = buildPhase2InsightContract({ role: "产品", region: "中国", track, time: "2027" });
  const joined = buildRecommendedQuestions(contract).join("\n");
  for (const pattern of patterns) {
    assert.match(joined, pattern, `${track} recommended questions missing domain depth ${pattern}: ${joined}`);
  }
}

const appSource = await readFile(resolve(root, "src/App.jsx"), "utf8");
const askProviderSource = await readFile(resolve(root, "src/utils/askProvider.js"), "utf8");
const userVisibleSource = `${appSource}\n${askProviderSource}`;
for (const forbidden of [
  "HTTP 404",
  "Dify provider request failed",
  "Provider POC",
  "Prototype Agent",
  "Fallback: Local Rule Engine",
]) {
  assert.equal(userVisibleSource.includes(forbidden), false, `user-visible copy must not include ${forbidden}`);
}
assert.ok(userVisibleSource.includes("外部专家引擎暂不可用，已回退本地专家规则引擎"), "fallback copy must be productized Chinese");
assert.ok(userVisibleSource.includes("当前使用：本地专家规则引擎"), "local engine copy must be productized Chinese");

console.log("V1.5 PR13 blocker tests passed");
