import { strict as assert } from "node:assert";
import { buildPhase2InsightContract } from "../src/utils/filterContext.js";
import {
  buildModuleContextSet,
  validateModuleContextConsistency,
} from "../src/utils/moduleContextSelectors.js";

const makeContexts = (filters) => {
  const contract = buildPhase2InsightContract(filters);
  const contexts = buildModuleContextSet(contract);
  const validation = validateModuleContextConsistency(contexts);
  assert.equal(validation.valid, true, `${filters.track} module contexts must validate: ${validation.errors.join(", ")}`);
  return { contract, contexts };
};

const base = makeContexts({ role: "高管", region: "全球", track: "全部", time: "2026" });
for (const key of ["overview", "market", "product", "technology", "companyIntelligence", "askHeader"]) {
  assert.ok(base.contexts[key].selectedContext, `${key} must consume selectedContext`);
  assert.equal(base.contexts[key].contractVersion, base.contract.contractVersion, `${key} must consume same contract`);
  assert.ok(Array.isArray(base.contexts[key].unsupportedScopes), `${key} must carry unsupportedScopes`);
}

const executive = makeContexts({ role: "高管", region: "全球", track: "全部", time: "2026" });
const investor = makeContexts({ role: "投资者", region: "全球", track: "全部", time: "2026" });
assert.notEqual(executive.contexts.overview.roleEmphasis, investor.contexts.overview.roleEmphasis, "different role must change module emphasis");

const global = makeContexts({ role: "产品", region: "全球", track: "塔式 UPS", time: "2028" });
const china = makeContexts({ role: "产品", region: "中国", track: "塔式 UPS", time: "2028" });
assert.notEqual(global.contexts.market.regionalBoundary, china.contexts.market.regionalBoundary, "different region must change boundary");

const tower = makeContexts({ role: "产品", region: "北美", track: "塔式 UPS", time: "2028" });
const modular = makeContexts({ role: "产品", region: "北美", track: "模块化 UPS", time: "2028" });
assert.notDeepEqual(tower.contexts.product.trackContext, modular.contexts.product.trackContext, "different track must change trackContext");

const near = makeContexts({ role: "产品", region: "中国", track: "工业 UPS", time: "2028" });
assert.equal(near.contexts.product.canTreatAsPrimaryTrack, false, "application_segment must not be treated as primary track");
assert.ok(near.contexts.product.unsupportedScopes.some((item) => item.dimension === "track"), "application_segment unsupported scope must propagate");

const architecture = makeContexts({ role: "投资者", region: "中国", track: "800VDC", time: "2027" });
assert.equal(architecture.contexts.product.canTreatAsPrimaryTrack, false, "architecture_route must not be treated as primary track");

const technology = makeContexts({ role: "产品", region: "中国", track: "GaN/SiC", time: "2028" });
assert.equal(technology.contexts.product.canTreatAsPrimaryTrack, false, "technology_tag must not be treated as primary track");

const time2027 = makeContexts({ role: "市场", region: "中国", track: "精密空调", time: "2027" });
const time2030 = makeContexts({ role: "市场", region: "中国", track: "精密空调", time: "2030" });
assert.notEqual(time2027.contexts.market.timeHorizonContext, time2030.contexts.market.timeHorizonContext, "different timeHorizon must change time context");

console.log("V1.5 Phase 2B module contract tests passed");
