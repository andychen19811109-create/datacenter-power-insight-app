import test from "node:test";
import assert from "node:assert/strict";
import { buildInsightContext } from "../../../utils/insightContext.js";
import { FILTER_OPTIONS } from "../../../data/marketData.js";
import { buildAnalysisContext } from "../buildAnalysisContext.js";
import { buildDifyChatRequest } from "../../../../api/ask-power-insight.js";
import {
  freezeCanonicalRunSnapshot,
  hasRunPageContextChanged,
  inheritRunFilters,
} from "../runSnapshot.js";

const filters = {
  role: "产品",
  region: "中国",
  customer: "云服务商",
  application: "AI 训练集群",
  track: "液冷",
  time: "2030",
};

test("Ask and Dashboard share the same page filters and E5 sends them to R2", () => {
  const dashboardContext = buildInsightContext(filters);
  const analysisContext = buildAnalysisContext({
    question: "这个方向值得投入吗？",
    pageContext: dashboardContext,
  });
  const canonical = analysisContext.canonical_input;
  assert.deepEqual(canonical.track.value, ["液冷"]);
  assert.equal(canonical.track.source, "PAGE");
  assert.deepEqual(canonical.application.value, ["AI 训练集群"]);
  assert.deepEqual(canonical.region.value, ["中国"]);
  assert.deepEqual(canonical.customer_type.value, ["云服务商"]);
  assert.equal(canonical.time_horizon.source, "UNSPECIFIED");
  assert.equal(canonical.page_ctx.value.user_role, "产品");
  assert.equal(canonical.page_ctx.value.page_time_filter, "2030");

  const request = buildDifyChatRequest({
    question: analysisContext.original_question,
    analysisContext,
    requestId: "E5_CONTEXT_LINKAGE",
    userId: "test-user",
  });
  assert.equal(request.inputs.track, "液冷");
  assert.equal(request.inputs.application, "AI 训练集群");
  assert.equal(request.inputs.region, "中国");
  assert.equal(request.inputs.customer_type, "云服务商");
  assert.deepEqual(JSON.parse(request.inputs.page_ctx).raw_selections, filters);
});

test("a generated run remains frozen after page changes and can explicitly re-run", () => {
  const original = buildAnalysisContext({ question: "这个方向值得投入吗？", pageContext: buildInsightContext(filters) });
  const frozen = freezeCanonicalRunSnapshot(original.canonical_input);
  const changedFilters = { ...filters, region: "北美", track: "800VDC" };

  assert.equal(hasRunPageContextChanged(frozen, buildInsightContext(changedFilters)), true);
  assert.deepEqual(frozen.page_ctx.value.raw_selections, filters);
  assert.throws(() => { frozen.page_ctx.value.raw_selections.region = "欧洲"; }, TypeError);

  const rerun = buildAnalysisContext({ question: "这个方向值得投入吗？", pageContext: buildInsightContext(changedFilters) });
  assert.notEqual(rerun.canonical_input.snapshot_id, frozen.snapshot_id);
  assert.equal(rerun.canonical_input.page_ctx.value.raw_selections.region, "北美");
  assert.equal(rerun.canonical_input.page_ctx.value.raw_selections.track, "800VDC");
});

test("related modules inherit the run filters instead of later page state", () => {
  const inherited = inheritRunFilters({
    runSelections: filters,
    currentFilters: { ...filters, region: "北美", track: "800VDC" },
    filterOptions: FILTER_OPTIONS,
  });
  assert.deepEqual(inherited, filters);
});
