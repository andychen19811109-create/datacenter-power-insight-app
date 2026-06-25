import { strict as assert } from "node:assert";
import { buildPhase2InsightContract } from "../src/utils/filterContext.js";
import {
  buildChartScopeContext,
  buildKpiScopeContext,
  validateChartScopeContext,
} from "../src/utils/chartScopeContext.js";

for (const region of ["中国", "北美", "欧洲"]) {
  const contract = buildPhase2InsightContract({ role: "产品", region, track: "塔式 UPS", time: "2028" });
  const chartContext = buildChartScopeContext(contract);
  const validation = validateChartScopeContext(chartContext, contract);
  assert.equal(validation.valid, true, `${region} chart scope must validate: ${validation.errors.join(", ")}`);
  assert.ok(chartContext.charts.every((chart) => chart.globalOnly), `${region} charts must be globalOnly`);
  assert.ok(chartContext.charts.every((chart) => chart.unsupportedRegionReason), `${region} must carry region unsupported reason`);
  assert.ok(chartContext.charts.every((chart) => chart.boundary.includes("全球")), `${region} must show globalOnly boundary`);
}

const unsupportedTrack = buildPhase2InsightContract({ role: "投资者", region: "中国", track: "800VDC", time: "2027" });
const unsupportedChart = buildChartScopeContext(unsupportedTrack);
assert.ok(unsupportedChart.charts.every((chart) => chart.unsupportedTrackReason), "unsupported track must carry reason");
assert.ok(unsupportedChart.charts.every((chart) => chart.expertInterpolation), "expert interpolation must be marked");

const technology = buildPhase2InsightContract({ role: "产品", region: "中国", track: "GaN/SiC", time: "2028" });
const kpi = buildKpiScopeContext(technology);
assert.equal(kpi.trackSpecificKpi.supported, false, "must not fabricate track-specific KPI for technology tag");
assert.ok(kpi.trackSpecificKpi.unsupportedReason, "track-specific KPI unsupported reason must exist");
assert.equal(kpi.rackPowerDensity.supported, false, "rack density must not be fabricated");
assert.equal(kpi.rackPowerDensity.status, "context_need", "rack density must only be context need");
assert.ok(kpi.marketSizeVsPriority.includes("相对评分"), "market size vs priority scoring boundary must exist");

const global = buildPhase2InsightContract({ role: "高管", region: "全球", track: "全部", time: "2026" });
const globalKpi = buildKpiScopeContext(global);
assert.equal(globalKpi.macroMarketIndicators.scope, "global", "global macro indicator must be global scoped");
assert.equal(globalKpi.macroMarketIndicators.expertInterpolation, true, "macro market indicator must mark expert interpolation");

console.log("V1.5 Phase 2D chart scope tests passed");
