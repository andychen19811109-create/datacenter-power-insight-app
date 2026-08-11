import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalysisContext, buildCanonicalAnalysisInput } from "../buildAnalysisContext.js";
import {
  CANONICAL_BUSINESS_FIELDS,
  CANONICAL_SOURCE_TYPES,
  validateCanonicalAnalysisInput,
} from "../contracts/canonicalAnalysisInput.js";

const page = (overrides = {}) => ({
  normalizedFilters: {
    role: "高管",
    region: "中国",
    customer: "全部",
    application: "全部",
    track: "全部",
    time: "2026",
    ...overrides,
  },
});

test("canonical input has an exact immutable shape and only the five governed sources", () => {
  const input = buildCanonicalAnalysisInput({
    question: "800VDC在AI数据中心供电架构中的机会和风险是什么？",
    pageContext: page(),
  });
  assert.equal(validateCanonicalAnalysisInput(input).valid, true);
  assert.deepEqual(Object.keys(input).sort(), [
    "analysis_goal", "application", "customer_type", "extra_context", "known_competitors",
    "page_ctx", "question", "region", "schema_version", "snapshot_id", "time_horizon", "track",
  ]);
  for (const field of ["question", ...CANONICAL_BUSINESS_FIELDS, "page_ctx"]) {
    assert.deepEqual(Object.keys(input[field]).sort(), ["conflicts", "source", "value"]);
    assert.ok(CANONICAL_SOURCE_TYPES.includes(input[field].source));
  }
});

test("MANUAL outranks QUESTION and PAGE while preserving both conflicts", () => {
  const input = buildCanonicalAnalysisInput({
    question: "针对欧洲市场，800VDC机会和风险是什么？",
    pageContext: page({ region: "中国" }),
    manual: { region: ["东南亚"] },
  });
  assert.deepEqual(input.region.value, ["东南亚"]);
  assert.equal(input.region.source, "MANUAL");
  assert.deepEqual(input.region.conflicts, [
    { source: "QUESTION", value: ["欧洲"] },
    { source: "PAGE", value: ["中国"] },
  ]);
});

test("QUESTION outranks PAGE and exposes the conflict instead of silently overwriting", () => {
  const input = buildCanonicalAnalysisInput({
    question: "针对欧洲市场，800VDC机会和风险是什么？",
    pageContext: page({ region: "中国" }),
  });
  assert.deepEqual(input.region.value, ["欧洲"]);
  assert.equal(input.region.source, "QUESTION");
  assert.deepEqual(input.region.conflicts, [{ source: "PAGE", value: ["中国"] }]);
});

test("role, page time and 全部 remain page metadata without becoming business constraints", () => {
  const input = buildCanonicalAnalysisInput({
    question: "800VDC机会和风险是什么？",
    pageContext: page(),
  });
  assert.equal(input.page_ctx.value.user_role, "高管");
  assert.equal(input.page_ctx.value.page_time_filter, "2026");
  assert.equal(input.time_horizon.source, "UNSPECIFIED");
  assert.equal(input.time_horizon.value, "");
  assert.equal(input.customer_type.source, "UNSPECIFIED");
  assert.equal(input.application.source, "UNSPECIFIED");
  assert.equal(input.region.source, "PAGE");
  assert.deepEqual(input.region.value, ["中国"]);
});

test("global region is not fabricated as a canonical fact and raw PAGE selections remain intact", () => {
  const input = buildCanonicalAnalysisInput({
    question: "800VDC机会和风险是什么？",
    pageContext: page({ region: "全球" }),
  });
  assert.deepEqual(input.region.value, []);
  assert.equal(input.region.source, "UNSPECIFIED");
  assert.equal(input.page_ctx.value.page_region, "全球");
  assert.equal(input.page_ctx.value.raw_selections.customer, "全部");
});

test("extra_context contains only explicit user business background", () => {
  const background = "已有模块化UPS平台；两家锚点客户愿意联合验证。";
  const input = buildCanonicalAnalysisInput({
    question: "是否值得开发新产品？",
    pageContext: page(),
    manual: { extra_context: background },
  });
  assert.equal(input.extra_context.value, background);
  assert.equal(input.extra_context.source, "MANUAL");
  assert.doesNotMatch(input.extra_context.value, /R2|baseline|precedence|analysis_context|task_type|provider/i);
});

test("extra_context rejects Core, schema, trace, parser and Provider metadata", () => {
  for (const extra_context of [
    "DCPI R2 Core R2-1.3 MVP FROZEN-V1",
    "schema_version=dcpi.canonical-analysis-input.v1",
    "trace JSON: request_id=abc",
    "parser metadata should be retained",
    "Provider metadata should be copied",
  ]) {
    assert.throws(
      () => buildCanonicalAnalysisInput({ question: "是否值得开发新产品？", manual: { extra_context } }),
      /extra_context_engineering_metadata_forbidden/,
    );
  }
});

test("generic comparison syntax recognizes arbitrary Latin company names without expanding a list", () => {
  const context = buildAnalysisContext({
    question: "Alpha与Beta在AI数据中心电源和液冷方向的竞争差异是什么？",
  });
  assert.equal(context.task_type, "COMPETITIVE_ANALYSIS");
  assert.deepEqual(context.canonical_input.known_competitors.value, ["Alpha", "Beta"]);
  assert.deepEqual(context.canonical_input.track.value, ["电源", "液冷"]);
});

test("unknown company and unknown product remain unspecified and editable", () => {
  const company = buildCanonicalAnalysisInput({ question: "Acme是否值得开发新产品？" });
  const product = buildCanonicalAnalysisInput({ question: "PhotonBusX是否值得投入？" });
  assert.equal(company.known_competitors.source, "UNSPECIFIED");
  assert.equal(product.track.source, "UNSPECIFIED");
});

test("snapshot id changes with resolved run input but not with unrelated object identity", () => {
  const china = buildCanonicalAnalysisInput({ question: "800VDC机会和风险是什么？", pageContext: page({ region: "中国" }) });
  const chinaAgain = buildCanonicalAnalysisInput({ question: "800VDC机会和风险是什么？", pageContext: page({ region: "中国" }) });
  const europe = buildCanonicalAnalysisInput({ question: "800VDC机会和风险是什么？", pageContext: page({ region: "欧洲" }) });
  assert.equal(china.snapshot_id, chinaAgain.snapshot_id);
  assert.notEqual(china.snapshot_id, europe.snapshot_id);
});
