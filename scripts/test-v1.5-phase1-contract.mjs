import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  buildInsightDecisionContract,
  validateInsightDecisionContract,
} from "../src/utils/insightDecisionContract.js";

const root = resolve(new URL("..", import.meta.url).pathname);
const hashFile = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

const assertValidContract = (filters) => {
  const contract = buildInsightDecisionContract(filters);
  assert.equal(contract.contractVersion, "insightDecisionContract-v1", "contractVersion must match");
  assert.equal(contract.validation.valid, true, `contract must be valid: ${contract.validation.errors.join(", ")}`);
  assert.ok(contract.selectedContext.role, "selectedContext.role must exist");
  assert.ok(contract.selectedContext.region, "selectedContext.region must exist");
  assert.ok(contract.selectedContext.track, "selectedContext.track must exist");
  assert.ok(contract.selectedContext.timeHorizon, "selectedContext.timeHorizon must exist");
  assert.ok(contract.selectedContext.normalizedTrack, "selectedContext.normalizedTrack must exist");
  assert.ok(contract.selectedContext.entityType, "selectedContext.entityType must exist");
  assert.ok(contract.selectedContext.matchState, "selectedContext.matchState must exist");
  assert.ok(contract.chartContext.globalOnly, "global-only chart must be marked");
  assert.ok(contract.askContextPack.mustNotOverride, "askContextPack.mustNotOverride must exist");
  assert.ok(Array.isArray(contract.evidenceBoundary.claimToEvidenceMap), "claimToEvidenceMap must exist");
  return contract;
};

assertValidContract({ role: "高管", region: "全球", track: "全部", time: "2026" });
assertValidContract({ role: "产品", region: "北美", track: "塔式 UPS", time: "2028" });
assertValidContract({ role: "产品", region: "北美", track: "模块化 UPS", time: "2028" });
assertValidContract({ role: "市场", region: "中国", track: "精密空调", time: "2027" });
assertValidContract({ role: "研发", region: "欧洲", track: "液冷", time: "2030" });
const cduContract = assertValidContract({ role: "研发", region: "欧洲", track: "液冷 CDU", time: "2030" });
assert.equal(cduContract.trackContext.isPrimaryBusinessTrack, false, "液冷 CDU must not be primary business track");
assert.equal(cduContract.trackContext.entityType, "product_subsegment", "液冷 CDU must be product_subsegment");
assert.equal(cduContract.trackContext.parentBusinessTrack.label, "液冷", "液冷 CDU must belong under 液冷");
assert.ok(cduContract.unsupportedScopes.some((item) => item.scopeId === "track_not_primary_business" && item.reason.includes("设备/子产品")), "液冷 CDU must produce subsegment unsupported scope");

const industrialUpsContract = assertValidContract({ role: "产品", region: "中国", track: "工业 UPS", time: "2028" });
assert.equal(industrialUpsContract.trackContext.isPrimaryBusinessTrack, false, "工业 UPS must not be primary business track");
assert.equal(industrialUpsContract.trackContext.entityType, "application_segment", "工业 UPS must be application segment");
assert.equal(industrialUpsContract.trackContext.parentBusinessTrack.label, "塔式 UPS", "工业 UPS must belong under 塔式 UPS");
assert.ok(industrialUpsContract.unsupportedScopes.some((item) => item.scopeId === "track_not_primary_business" && item.reason.includes("应用细分")), "工业 UPS must produce application segment unsupported scope");

const powerUtilityUpsContract = assertValidContract({ role: "产品", region: "中国", track: "电力 UPS", time: "2028" });
assert.equal(powerUtilityUpsContract.trackContext.isPrimaryBusinessTrack, false, "电力 UPS must not be primary business track");
assert.equal(powerUtilityUpsContract.trackContext.entityType, "application_segment", "电力 UPS must be application segment");
assert.equal(powerUtilityUpsContract.trackContext.parentBusinessTrack.label, "塔式 UPS", "电力 UPS must belong under 塔式 UPS");

const architectureContract = assertValidContract({ role: "投资者", region: "中国", track: "800VDC", time: "2027" });
assert.equal(architectureContract.trackContext.isPrimaryBusinessTrack, false, "800VDC must not be primary business track");
assert.equal(architectureContract.trackContext.entityType, "architecture_route", "800VDC must be architecture_route");
assert.ok(architectureContract.unsupportedScopes.some((item) => item.scopeId === "track_not_primary_business" && item.reason.includes("架构路线")), "800VDC must produce architecture route unsupported scope");

const legacyUpsContract = assertValidContract({ role: "产品", region: "北美", track: "UPS", time: "2028" });
assert.equal(legacyUpsContract.selectedContext.normalizedTrack, "塔式 UPS", "legacy UPS must normalize to 塔式 UPS");
assert.equal(legacyUpsContract.selectedContext.legacyAlias, "UPS", "legacy UPS must carry legacyAlias");
assert.ok(legacyUpsContract.selectedContext.migrationNote.includes("塔式 UPS"), "legacy UPS must carry migration note");

const ganContract = assertValidContract({ role: "产品", region: "中国", track: "GaN/SiC", time: "2028" });
assert.equal(ganContract.trackContext.isPrimaryBusinessTrack, false, "GaN/SiC must not be a primary business track");
assert.ok(["technology_tag", "component_technology"].includes(ganContract.trackContext.entityType), "GaN/SiC must be technology scoped");
assert.ok(ganContract.unsupportedScopes.some((item) => item.scopeId === "track_not_primary_business"), "GaN/SiC must produce unsupported track scope");

const scopedChartContract = assertValidContract({ role: "产品", region: "北美", track: "塔式 UPS", time: "2028" });
assert.equal(scopedChartContract.chartContext.globalOnly, true, "chartContext must mark globalOnly");
assert.ok(scopedChartContract.unsupportedScopes.some((item) => item.scopeId === "chart_scope_limit" && item.reason), "unsupported chart region/track scopes need reasons");

const invalid = validateInsightDecisionContract({
  ...scopedChartContract,
  selectedContext: undefined,
});
assert.equal(invalid.valid, false, "validator must catch missing selectedContext");
assert.ok(invalid.errors.some((item) => item.includes("selectedContext")), "validator must report selectedContext errors");

for (const relativePath of [
  "src/data/ontology.js",
  "src/utils/insightDecisionContract.js",
]) {
  const mainHash = await hashFile(resolve(root, relativePath));
  const mirrorHash = await hashFile(resolve(root, "datacenter-power-insight-app-v1.1-optimized", relativePath));
  assert.equal(mainHash, mirrorHash, `${relativePath} must match mirror`);
}

console.log("V1.5 Phase 1 contract tests passed");
