import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { buildAskShadowRuntimeInput } from "../runtime/buildAskShadowRuntimeInput.js";
import { runAskShadowAdapter } from "../runtime/runAskShadowAdapter.js";

const buildSnapshot = () => ({
  question: "What is the next route?",
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

test("no provider or retrieval call is made and sourceRefs claimRefs stay empty", async () => {
  let callCount = 0;

  const result = await runAskShadowAdapter(buildSnapshot(), {
    adapter: (runtimeInput) => {
      callCount += 1;
      assert.deepEqual(runtimeInput.sourceRefs, []);
      assert.deepEqual(runtimeInput.claimRefs, []);
      assert.equal(runtimeInput.providerOutcome.enabled, false);
      assert.equal(runtimeInput.providerOutcome.status, "not_used");
      return {
        status: "ready",
        diagnostics: {
          reasonCodes: ["adapter_ready"],
        },
      };
    },
  });

  assert.equal(callCount, 1);
  assert.equal(result.status, "shadow_completed");
});

test("secret-like fields are not echoed in returned diagnostics", async () => {
  const result = await runAskShadowAdapter(buildSnapshot(), {
    adapter: () => ({
      status: "provider_error",
      diagnostics: {
        reasonCodes: ["provider_error"],
        Authorization: "Bearer abc",
        apiKey: "secret-key",
      },
    }),
  });

  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("Authorization"), false);
  assert.equal(serialized.includes("Bearer abc"), false);
  assert.equal(serialized.includes("secret-key"), false);
});

test("new runtime files contain no network or browser integration patterns", () => {
  const files = [
    new URL("../runtime/buildAskShadowRuntimeInput.js", import.meta.url),
    new URL("../runtime/runAskShadowAdapter.js", import.meta.url),
  ];
  const forbiddenPatterns = [
    /fetch\(/,
    /XMLHttpRequest/,
    /axios/,
    /Dify/,
    /DeepSeek/,
    /RAG/,
    /realtime/,
    /localStorage/,
    /sessionStorage/,
    /window\./,
    /document\./,
    /process\.env/,
  ];

  for (const file of files) {
    const content = readFileSync(file, "utf8");
    for (const pattern of forbiddenPatterns) {
      assert.equal(pattern.test(content), false);
    }
  }
});

test("buildAskShadowRuntimeInput does not depend on browser globals", () => {
  const result = buildAskShadowRuntimeInput(buildSnapshot());

  assert.equal(result.mode, "shadow");
  assert.equal(result.currentPageRoute, "/ask");
});

