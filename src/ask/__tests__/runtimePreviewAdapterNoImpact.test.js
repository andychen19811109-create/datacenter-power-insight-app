import test from "node:test";
import assert from "node:assert/strict";

import { runAskPreviewAdapter } from "../runtime/runAskPreviewAdapter.js";

const buildSnapshot = () => ({
  question: "What is the preview status?",
  context: {
    normalizedFilters: {
      role: "高管",
      region: "中国",
      customer: "云服务商",
      application: "AI 训练集群",
      track: "液冷",
      time: "2026",
    },
  },
  insightContext: {
    normalizedFilters: {
      role: "高管",
      region: "中国",
      customer: "云服务商",
      application: "AI 训练集群",
      track: "液冷",
      time: "2026",
    },
  },
  timestamp: "2026-07-01T12:00:00.000Z",
});

test("preview adapter returns user-safe preview result and preserves disabled provider boundary", async () => {
  let receivedRuntimeInput = null;
  let receivedOptions = null;

  const result = await runAskPreviewAdapter(buildSnapshot(), {
    adapter: async (runtimeInput, adapterOptions) => {
      receivedRuntimeInput = runtimeInput;
      receivedOptions = adapterOptions;

      return {
        status: "warning_report",
        renderState: {
          renderMode: "warning_report",
          messageType: "pass_with_warnings",
          allowedSections: ["response", "warnings"],
          payload: {
            response: {
              summary: "preview-safe",
            },
            warnings: ["需要补充证据"],
            blockingReasons: [],
            missingEvidence: [],
            sourceRequiredItems: [],
          },
          diagnostics: {
            reasonCodes: ["should_not_surface"],
          },
        },
        diagnostics: {
          reasonCodes: ["adapter_warning"],
          timings: {
            adapter_overhead_ms: 12,
          },
        },
      };
    },
  });

  assert.deepEqual(receivedRuntimeInput.sourceRefs, []);
  assert.deepEqual(receivedRuntimeInput.claimRefs, []);
  assert.equal(receivedRuntimeInput.providerOutcome.enabled, false);
  assert.equal(receivedRuntimeInput.providerOutcome.status, "not_used");
  assert.equal(receivedOptions.providerEnabled, false);
  assert.equal(result.status, "warning");
  assert.equal(result.renderState.renderMode, "warning_report");
  assert.equal(result.renderState.messageType, "pass_with_warnings");
  assert.equal("diagnostics" in result.renderState, false);
  assert.equal(result.userMessage.includes("本地新管线预览"), true);
});

test("preview adapter catches sync throw and does not leak raw secrets", async () => {
  const result = await runAskPreviewAdapter(buildSnapshot(), {
    adapter: () => {
      throw new Error("Authorization Bearer abc secret apiKey token");
    },
  });

  const serialized = JSON.stringify(result);
  assert.equal(result.status, "error");
  assert.equal(result.renderState, null);
  assert.equal(serialized.includes("Authorization"), false);
  assert.equal(serialized.includes("Bearer"), false);
  assert.equal(serialized.includes("apiKey"), false);
  assert.equal(serialized.includes("secret"), false);
  assert.equal(serialized.includes("token"), false);
  assert.equal(serialized.includes("stack"), false);
});

test("preview adapter catches async rejection and suppresses request internals", async () => {
  const result = await runAskPreviewAdapter(buildSnapshot(), {
    adapter: async () => {
      throw new Error("requestId=req_preview_001 pageContextHash=ctx_001 env=prod");
    },
  });

  const serialized = JSON.stringify(result);
  assert.equal(result.status, "error");
  assert.equal(result.renderState, null);
  assert.equal(serialized.includes("requestId"), false);
  assert.equal(serialized.includes("pageContextHash"), false);
  assert.equal(serialized.includes("env"), false);
});

test("unexpected provider status is mapped to safe local error without provider claims", async () => {
  const result = await runAskPreviewAdapter(buildSnapshot(), {
    adapter: async () => ({
      status: "provider_timeout",
      renderState: {
        renderMode: "provider_timeout_card",
        messageType: "provider_timeout",
        payload: {
          response: "should_not_render",
        },
      },
    }),
  });

  const serialized = JSON.stringify(result);
  assert.equal(result.status, "error");
  assert.equal(result.renderState, null);
  assert.equal(result.userMessage.includes("Dify"), false);
  assert.equal(result.userMessage.includes("DeepSeek"), false);
  assert.equal(result.userMessage.includes("实时数据已更新"), false);
  assert.equal(serialized.includes("provider_timeout_card"), false);
});
