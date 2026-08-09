import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalysisContext, buildCanonicalAnalysisInput } from "../buildAnalysisContext.js";

test("real Q1 keeps Kstar as a detected subject without classifying it as a competitor", () => {
  const context = buildAnalysisContext({
    question: "Kstar是否需要花资源开发全新模块化UPS？",
    pageContext: { normalizedFilters: { region: "中国" } },
  });
  assert.deepEqual(context.companies, ["Kstar"]);
  assert.deepEqual(context.canonical_input.known_competitors.value, []);
  assert.equal(context.canonical_input.known_competitors.source, "UNSPECIFIED");
  assert.deepEqual(context.canonical_input.track.value, ["模块化UPS"]);
  assert.deepEqual(context.canonical_input.region.value, ["中国"]);
  assert.equal(context.canonical_input.customer_type.source, "UNSPECIFIED");
  assert.equal(context.canonical_input.time_horizon.source, "UNSPECIFIED");
});

test("real Q5 comparison relation keeps Vertiv and Huawei in competitor role", () => {
  const input = buildCanonicalAnalysisInput({
    question: "针对AI数据中心电源和液冷基础设施，Vertiv与华为各自的竞争优势、短板和适用客户有什么差异？",
  });
  assert.deepEqual(input.known_competitors.value, ["Vertiv", "华为"]);
  assert.equal(input.known_competitors.source, "QUESTION");
  assert.deepEqual(input.track.value, ["电源", "液冷"]);
});

test("unknown single subject remains detected internally but not a known competitor", () => {
  const context = buildAnalysisContext({ question: "Acme是否需要开发新一代模块化电源平台？" });
  assert.deepEqual(context.companies, ["Acme"]);
  assert.deepEqual(context.canonical_input.known_competitors.value, []);
  assert.equal(context.canonical_input.known_competitors.source, "UNSPECIFIED");
});

test("unknown entities in an explicit comparison enter competitor role", () => {
  const input = buildCanonicalAnalysisInput({
    question: "Alpha与Beta在数据中心电源方案上有什么差异？",
  });
  assert.deepEqual(input.known_competitors.value, ["Alpha", "Beta"]);
  assert.equal(input.known_competitors.source, "QUESTION");
});

test("subject plus competitors excludes the subject and retains the facing entities", () => {
  const context = buildAnalysisContext({
    question: "如果我是Acme，面对Alpha和Beta应该采取什么产品策略？",
  });
  assert.deepEqual(context.companies, ["Acme", "Alpha", "Beta"]);
  assert.deepEqual(context.canonical_input.known_competitors.value, ["Alpha", "Beta"]);
  assert.equal(context.canonical_input.known_competitors.source, "QUESTION");
});

test("ambiguous company mention remains unspecified as a competitor", () => {
  const context = buildAnalysisContext({ question: "分析Acme的数据中心产品机会。" });
  assert.deepEqual(context.companies, ["Acme"]);
  assert.deepEqual(context.canonical_input.known_competitors.value, []);
  assert.equal(context.canonical_input.known_competitors.source, "UNSPECIFIED");
});

test("manual competitor selection outranks question role resolution", () => {
  const input = buildCanonicalAnalysisInput({
    question: "Alpha与Beta在数据中心电源方案上有什么差异？",
    manual: { known_competitors: ["Gamma"] },
  });
  assert.deepEqual(input.known_competitors.value, ["Gamma"]);
  assert.equal(input.known_competitors.source, "MANUAL");
  assert.deepEqual(input.known_competitors.conflicts, [
    { source: "QUESTION", value: ["Alpha", "Beta"] },
  ]);
});

test("explicit competitor labels work without a named-company allowlist", () => {
  const input = buildCanonicalAnalysisInput({
    question: "竞争对手包括Nimbus和Quasar，请分析进入策略。",
  });
  assert.deepEqual(input.known_competitors.value, ["Nimbus", "Quasar"]);
  assert.equal(input.known_competitors.source, "QUESTION");
});
