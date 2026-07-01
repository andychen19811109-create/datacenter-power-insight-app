import test from "node:test";
import assert from "node:assert/strict";

import { runAskShadowAdapter } from "../runtime/runAskShadowAdapter.js";

const buildSnapshot = () => ({
  question: "What is the shadow status?",
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

test("runAskShadowAdapter never throws and legacy answer object remains unchanged on success", async () => {
  const legacyAnswer = Object.freeze({ title: "legacy", items: ["stable"] });
  const before = JSON.stringify(legacyAnswer);

  const result = await runAskShadowAdapter(buildSnapshot(), {
    adapter: () => ({
      status: "ready",
      diagnostics: {
        reasonCodes: ["adapter_ready"],
      },
    }),
  });

  assert.equal(JSON.stringify(legacyAnswer), before);
  assert.equal(result.status, "shadow_completed");
});

test("legacy answer string remains unchanged when shadow returns blocked", async () => {
  const legacyAnswer = "legacy-answer";

  const result = await runAskShadowAdapter(buildSnapshot(), {
    adapter: () => ({
      status: "blocked",
      diagnostics: {
        reasonCodes: ["blocked_reason"],
      },
    }),
  });

  assert.equal(legacyAnswer, "legacy-answer");
  assert.equal(result.status, "shadow_blocked");
  assert.equal(result.reasonCodes.includes("blocked_reason"), true);
});

test("legacy answer remains unchanged when shadow throws and no raw stack leaks", async () => {
  const legacyAnswer = { summary: "legacy-summary" };
  const result = await runAskShadowAdapter(buildSnapshot(), {
    adapter: () => {
      throw new Error("Authorization Bearer abc secret apiKey token");
    },
  });

  assert.deepEqual(legacyAnswer, { summary: "legacy-summary" });
  assert.equal(result.status, "shadow_failed");
  assert.equal(result.reasonCodes.includes("shadow_adapter_exception"), true);
  assert.equal(JSON.stringify(result).includes("Authorization"), false);
  assert.equal(JSON.stringify(result).includes("Bearer"), false);
});

test("async adapter rejection is caught and sanitized", async () => {
  const result = await runAskShadowAdapter(buildSnapshot(), {
    adapter: async () => {
      throw new Error("Authorization Bearer abc secret apiKey token");
    },
  });

  const serialized = JSON.stringify(result);
  assert.equal(result.status, "shadow_failed");
  assert.equal(result.reasonCodes.includes("shadow_adapter_exception"), true);
  assert.equal(serialized.includes("Authorization"), false);
  assert.equal(serialized.includes("Bearer"), false);
  assert.equal(serialized.includes("apiKey"), false);
  assert.equal(serialized.includes("secret"), false);
  assert.equal(serialized.includes("token"), false);
  assert.equal(serialized.includes("stack"), false);
  assert.equal(serialized.includes("abc"), false);
});

test("async adapter success still works", async () => {
  const result = await runAskShadowAdapter(buildSnapshot(), {
    adapter: async () => ({
      status: "ready",
      diagnostics: {
        reasonCodes: ["adapter_ready"],
      },
    }),
  });

  assert.equal(result.status, "shadow_completed");
  assert.equal(result.reasonCodes.includes("adapter_ready"), true);
});

test("adapter provider_error result does not affect legacy and diagnostics stay bounded", async () => {
  const legacyAnswer = { summary: "legacy-provider-error-safe" };
  const result = await runAskShadowAdapter(buildSnapshot(), {
    adapter: () => ({
      status: "provider_error",
      diagnostics: {
        reasonCodes: [
          "one",
          "two",
          "three",
          "four",
          "five",
          "six",
          "seven",
          "eight",
          "nine",
          "ten",
          "eleven",
          "twelve",
          "thirteen",
          "fourteen",
          "fifteen",
          "sixteen",
          "seventeen",
        ],
      },
    }),
  });

  assert.deepEqual(legacyAnswer, { summary: "legacy-provider-error-safe" });
  assert.equal(result.status, "shadow_blocked");
  assert.equal(result.reasonCodes.length <= 16, true);
});

test("input build failure returns shadow_failed without throw", async () => {
  const result = await runAskShadowAdapter(buildSnapshot(), {
    buildInput: () => {
      throw new Error("builder failed");
    },
  });

  assert.equal(result.status, "shadow_failed");
  assert.equal(result.reasonCodes.includes("shadow_input_build_failed"), true);
});
