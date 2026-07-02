import test from "node:test";
import assert from "node:assert/strict";

import { buildAskShadowRuntimeInput } from "../runtime/buildAskShadowRuntimeInput.js";

const buildSnapshot = (overrides = {}) => ({
  question: "What is the next Ask step?",
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

test("buildAskShadowRuntimeInput returns mode shadow with default ask route/module", () => {
  const result = buildAskShadowRuntimeInput(buildSnapshot());

  assert.equal(result.mode, "shadow");
  assert.equal(result.currentPageRoute, "/ask");
  assert.equal(result.currentPageModule, "ask");
  assert.deepEqual(result.sourceRefs, []);
  assert.deepEqual(result.claimRefs, []);
  assert.equal(result.providerOutcome.enabled, false);
  assert.equal(result.providerOutcome.status, "not_used");
});

test("minimal productPlanningCard stub exists", () => {
  const result = buildAskShadowRuntimeInput(buildSnapshot());

  assert.equal(result.productPlanningCard.id.startsWith("shadow_ppc_"), true);
  assert.equal(result.productPlanningCard.version, "shadow_bridge_v1");
  assert.equal(Boolean(result.productPlanningCard.stateHash), true);
});

test("selectedFilters mapping is conservative", () => {
  const result = buildAskShadowRuntimeInput(buildSnapshot({
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
  assert.equal("role" in result.selectedFilters, false);
  assert.equal(result.shadowDiagnostics.reasonCodes.includes("shadow_mapping_unresolved_application"), true);
  assert.equal(result.shadowDiagnostics.reasonCodes.includes("shadow_mapping_unresolved_track"), true);
  assert.equal(result.shadowDiagnostics.reasonCodes.includes("shadow_mapping_unresolved_time"), true);
});

test("region maps only through explicit whitelist and unresolved customer stays unknown", () => {
  const result = buildAskShadowRuntimeInput(buildSnapshot({
    context: {
      normalizedFilters: {
        role: "研发",
        region: "拉美",
        customer: "制造业",
        application: "全部",
        track: "全部",
        time: "2026",
      },
    },
  }));

  assert.equal(result.selectedFilters.region, "unknown");
  assert.equal(result.selectedFilters.customerSegment, "unknown");
  assert.equal(result.shadowDiagnostics.reasonCodes.includes("shadow_mapping_unresolved_region"), true);
  assert.equal(result.shadowDiagnostics.reasonCodes.includes("shadow_mapping_unresolved_customer"), true);
});

test("taskIntent defaulting emits shadow_task_intent_defaulted", () => {
  const result = buildAskShadowRuntimeInput(buildSnapshot({
    question: "Summarize the current direction",
  }));

  assert.equal(result.taskIntent, "technical_roadmap_and_entry_gate");
  assert.equal(result.shadowDiagnostics.reasonCodes.includes("shadow_task_intent_defaulted"), true);
});

test("pageContextHash is deterministic for same normalized snapshot", () => {
  const snapshot = buildSnapshot({
    question: "任意问题",
    context: {
      normalizedFilters: {
        role: "市场",
        region: "中国",
        customer: "云服务商",
        application: "AI 推理集群",
        track: "800VDC",
        time: "2027",
      },
    },
  });

  const first = buildAskShadowRuntimeInput(snapshot);
  const second = buildAskShadowRuntimeInput(snapshot);

  assert.equal(first.pageContextHash, second.pageContextHash);
});

