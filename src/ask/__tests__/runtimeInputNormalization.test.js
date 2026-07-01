import test from "node:test";
import assert from "node:assert/strict";

import { normalizeRuntimeAskInput } from "../runtime/normalizeRuntimeAskInput.js";

test("default mode falls back to test_only", () => {
  const result = normalizeRuntimeAskInput({
    consumerModule: "ask_power_insight",
  });

  assert.equal(result.mode, "test_only");
});

test("valid modes are preserved", () => {
  assert.equal(normalizeRuntimeAskInput({ mode: "shadow", consumerModule: "ask_power_insight" }).mode, "shadow");
  assert.equal(normalizeRuntimeAskInput({ mode: "preview", consumerModule: "ask_power_insight" }).mode, "preview");
  assert.equal(normalizeRuntimeAskInput({ mode: "test_only", consumerModule: "ask_power_insight" }).mode, "test_only");
});

test("missing consumerModule is blocked with exact reason code", () => {
  const result = normalizeRuntimeAskInput({});

  assert.deepStrictEqual(result.blockedReasonCodes, ["missing_consumer_module"]);
});

test("unsupported consumerModule is blocked with exact reason code", () => {
  const result = normalizeRuntimeAskInput({
    consumerModule: "legacy_module",
  });

  assert.deepStrictEqual(result.blockedReasonCodes, ["unsupported_consumer_module"]);
});

test("runtime input object is not mutated", () => {
  const runtimeInput = {
    consumerModule: "ask_power_insight",
    question: "What is the current CDU roadmap?",
    selectedFilters: {
      productFamily: "liquid_cooling_cdu",
    },
    sourceRefs: [{ sourceId: "src_001" }],
  };
  const before = JSON.stringify(runtimeInput);

  normalizeRuntimeAskInput(runtimeInput);

  assert.equal(JSON.stringify(runtimeInput), before);
});

test("page context and product planning card inputs are preserved for downstream bridge", () => {
  const runtimeInput = {
    consumerModule: "ask_power_insight",
    currentPageRoute: "/technology",
    currentPageModule: "technology",
    pageContext: {
      pageContextHash: "ctx_001",
      pageSummaries: {
        technology: "adapter bridge",
      },
    },
    productPlanningCard: {
      id: "ppc_001",
      version: "v1",
      stateHash: "ppc_hash_001",
      productFamily: "liquid_cooling_cdu",
    },
  };

  const result = normalizeRuntimeAskInput(runtimeInput);

  assert.deepStrictEqual(result.pageContext, runtimeInput.pageContext);
  assert.deepStrictEqual(result.productPlanningCard, runtimeInput.productPlanningCard);
});
