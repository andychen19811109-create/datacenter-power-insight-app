import test from "node:test";
import assert from "node:assert/strict";

import { buildAskPreviewRuntimeInput } from "../runtime/buildAskPreviewRuntimeInput.js";

const buildSnapshot = (overrides = {}) => ({
  question: "What is the next Ask preview step?",
  filters: {
    role: "高管",
    region: "全球",
    customer: "全部",
    application: "全部",
    track: "全部",
    time: "2026",
  },
  context: {
    normalizedFilters: {
      role: "高管",
      region: "全球",
      customer: "全部",
      application: "全部",
      track: "全部",
      time: "2026",
    },
  },
  insightContext: {
    normalizedFilters: {
      role: "高管",
      region: "全球",
      customer: "全部",
      application: "全部",
      track: "全部",
      time: "2026",
    },
  },
  timestamp: "2026-07-01T12:00:00.000Z",
  currentPageRoute: "",
  currentPageModule: "",
  ...overrides,
});

test("buildAskPreviewRuntimeInput forces preview mode and disabled provider boundary", () => {
  const result = buildAskPreviewRuntimeInput(buildSnapshot());

  assert.equal(result.mode, "preview");
  assert.equal(result.consumerModule, "ask_power_insight");
  assert.equal(result.currentPageRoute, "/ask");
  assert.equal(result.currentPageModule, "ask");
  assert.equal(result.requestId.startsWith("req_preview_"), true);
  assert.deepEqual(result.sourceRefs, []);
  assert.deepEqual(result.claimRefs, []);
  assert.equal(result.providerOutcome.enabled, false);
  assert.equal(result.providerOutcome.status, "not_used");
  assert.deepEqual(result.providerResponse, {});
});

test("buildAskPreviewRuntimeInput keeps mapping conservative and avoids fabricated evidence", () => {
  const result = buildAskPreviewRuntimeInput(buildSnapshot({
    context: {
      normalizedFilters: {
        role: "产品",
        region: "中国",
        customer: "云服务商",
        application: "AI 训练集群",
        track: "液冷",
        time: "2027",
      },
    },
  }));

  assert.equal(result.selectedFilters.region, "CN");
  assert.equal(result.selectedFilters.customerSegment, "AIDC_cloud");
  assert.equal(result.selectedFilters.architectureLayer, "unknown");
  assert.equal(result.selectedFilters.productFamily, "unknown");
  assert.deepEqual(result.sourceRefs, []);
  assert.deepEqual(result.claimRefs, []);
  assert.equal("shadowDiagnostics" in result, false);
});

test("buildAskPreviewRuntimeInput does not rely on shadow-specific contract fields", () => {
  const result = buildAskPreviewRuntimeInput(buildSnapshot({
    currentPageRoute: "/ask",
    currentPageModule: "ask",
  }));

  assert.equal(result.mode, "preview");
  assert.equal("shadowDiagnostics" in result, false);
  assert.equal(result.productPlanningCard.id.startsWith("preview_ppc_"), true);
  assert.equal(result.productPlanningCard.version, "preview_bridge_v1");
});
