import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { BUSINESS_TRACKS, TIME_HORIZONS } from "../src/data/ontology.js";
import {
  buildFilterOptionsFromOntology,
  buildPhase2InsightContract,
  validatePhase2FilterContext,
} from "../src/utils/filterContext.js";

const root = resolve(new URL("..", import.meta.url).pathname);
const hashFile = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

const scenarios = [
  { role: "高管", region: "全球", track: "全部", time: "2026", entityType: "all", matchState: "strong_match" },
  { role: "投资者", region: "中国", track: "HVDC", time: "2027", entityType: "primary_business_track", matchState: "strong_match" },
  { role: "产品", region: "北美", track: "塔式 UPS", time: "2028", entityType: "primary_business_track", matchState: "strong_match" },
  { role: "产品", region: "北美", track: "模块化 UPS", time: "2028", entityType: "primary_business_track", matchState: "strong_match" },
  { role: "市场", region: "中国", track: "精密空调", time: "2027", entityType: "primary_business_track", matchState: "strong_match" },
  { role: "研发", region: "欧洲", track: "液冷 CDU", time: "2030", entityType: "primary_business_track", matchState: "strong_match" },
  { role: "产品", region: "中国", track: "UPS", time: "2028", entityType: "primary_business_track", matchState: "strong_match", normalizedTrack: "塔式 UPS" },
  { role: "产品", region: "中国", track: "工业 UPS", time: "2028", entityType: "application_segment", matchState: "adjacent_reference", normalizedTrack: "工业 UPS" },
  { role: "产品", region: "中国", track: "电力 UPS", time: "2028", entityType: "application_segment", matchState: "adjacent_reference", normalizedTrack: "电力 UPS" },
  { role: "投资者", region: "中国", track: "800VDC", time: "2027", entityType: "architecture_route", matchState: "adjacent_reference", normalizedTrack: "800V HVDC 架构" },
  { role: "产品", region: "中国", track: "GaN/SiC", time: "2028", entityType: "technology_tag", matchState: "not_applicable", normalizedTrack: "GaN" },
];

const options = buildFilterOptionsFromOntology();
assert.deepEqual(options.track, ["全部", ...BUSINESS_TRACKS.map((item) => item.label)], "track options must derive from ontology BUSINESS_TRACKS");
assert.deepEqual(options.time, TIME_HORIZONS.map((item) => item.label), "time options must derive from ontology TIME_HORIZONS");

for (const forbidden of ["UPS", "工业 UPS", "电力 UPS", "800VDC", "GaN/SiC", "GaN", "SiC"]) {
  assert.equal(options.track.includes(forbidden), false, `${forbidden} must not be a primary track option`);
}
for (const required of ["塔式 UPS", "模块化 UPS", "精密空调", "服务器电源"]) {
  assert.ok(options.track.includes(required), `${required} must be a track option`);
}
assert.equal(options.time.includes("2025"), false, "2025 must not be a time option");
assert.ok(options.time.includes("2028"), "2028 must be a time option");

for (const scenario of scenarios) {
  const contract = buildPhase2InsightContract(scenario);
  const validation = validatePhase2FilterContext(contract);
  assert.equal(validation.valid, true, `${scenario.track} filter context must validate: ${validation.errors.join(", ")}`);
  for (const field of ["role", "region", "track", "timeHorizon", "normalizedTrack", "entityType", "matchState"]) {
    assert.ok(contract.selectedContext[field], `${scenario.track} selectedContext.${field} must exist`);
  }
  assert.equal(contract.selectedContext.entityType, scenario.entityType, `${scenario.track} entityType must match`);
  assert.equal(contract.selectedContext.matchState, scenario.matchState, `${scenario.track} matchState must match`);
  if (scenario.normalizedTrack) assert.equal(contract.selectedContext.normalizedTrack, scenario.normalizedTrack, `${scenario.track} normalizedTrack must match`);
  if (!["all", "primary_business_track"].includes(scenario.entityType)) {
    assert.ok(contract.unsupportedScopes.some((item) => item.dimension === "track" && item.reason), `${scenario.track} must carry unsupported track reason`);
  }
}

const appSource = await readFile(resolve(root, "src/App.jsx"), "utf8");
for (const forbidden of ["800VDC", "GaN/SiC", "工业 UPS", "电力 UPS"]) {
  assert.equal(appSource.includes(forbidden), false, `App.jsx must not hardcode taxonomy special case: ${forbidden}`);
}

for (const relativePath of ["src/utils/filterContext.js"]) {
  const mainHash = await hashFile(resolve(root, relativePath));
  const mirrorHash = await hashFile(resolve(root, "datacenter-power-insight-app-v1.1-optimized", relativePath));
  assert.equal(mainHash, mirrorHash, `${relativePath} must match mirror`);
}

console.log("V1.5 Phase 2A filter context tests passed");
