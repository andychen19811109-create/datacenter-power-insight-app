import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalysisContext } from "../buildAnalysisContext.js";
import { getClarificationQuestions, clarificationSelectionsToContext } from "../clarificationPolicy.js";

const filters = { region: "欧洲", customer: "金融", application: "边缘数据中心", track: "UPS", time: "2026" };

test("question facts outrank filters and multi-object investment context stays intact", () => {
  const context = buildAnalysisContext({
    question: "从投资者角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？",
    pageContext: { normalizedFilters: filters },
  });
  assert.deepEqual(context.product_or_technology, ["BBU", "液冷", "GaN/SiC"]);
  assert.equal(context.field_sources.product_or_technology, "QUESTION");
  assert.equal(context.product_or_technology.includes("UPS"), false, "irrelevant UPS filter must not pollute Q9");
  assert.deepEqual(context.missing_high_impact_fields, ["decision_subject"]);
});

test("technology questions ignore irrelevant company/product filters", () => {
  const context = buildAnalysisContext({
    question: "800VDC在AI数据中心供电架构中的机会和风险是什么？",
    pageContext: { normalizedFilters: filters },
  });
  assert.equal(context.task_type, "TECHNOLOGY_ROUTE");
  assert.deepEqual(context.product_or_technology, ["800VDC"]);
  assert.equal(context.product_or_technology.includes("UPS"), false);
  assert.deepEqual(context.application_scenarios, ["AI数据中心"]);
});

test("only high-impact clarification is asked and a default assumption remains visible", () => {
  const initial = buildAnalysisContext({
    question: "从投资者角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？",
    pageContext: { normalizedFilters: filters },
  });
  const questions = getClarificationQuestions(initial);
  assert.equal(questions.length, 1);
  const clarification = clarificationSelectionsToContext({}, questions);
  const confirmed = buildAnalysisContext({ question: initial.original_question, pageContext: { normalizedFilters: filters }, clarification });
  assert.equal(confirmed.decision_subject, "UNKNOWN");
  assert.equal(confirmed.field_sources.decision_subject, "CLARIFICATION");
  assert.match(confirmed.assumptions.join(" "), /默认假设/);
  assert.match(questions[0].question, /你更关注哪类投资视角/);
  assert.deepEqual(questions[0].options, ["产业投资", "财务投资", "企业战略与资源配置", "暂不确定，按多情景比较"]);
  assert.equal(getClarificationQuestions(confirmed).length, 0);
});

test("explicit investment clarification is the only source that confirms an investment subject", () => {
  const initial = buildAnalysisContext({ question: "从投资者角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？" });
  const clarification = clarificationSelectionsToContext({ decision_subject: "财务投资" }, getClarificationQuestions(initial));
  const confirmed = buildAnalysisContext({ question: initial.original_question, clarification });
  assert.equal(confirmed.decision_subject, "FINANCIAL_INVESTOR");
  assert.equal(confirmed.field_sources.decision_subject, "CLARIFICATION");
});

test("question conditions outrank Ask clarification for decision subject and risk preference", () => {
  const context = buildAnalysisContext({
    question: "从财务投资角度，以低风险方式评估800VDC机会和风险。",
    clarification: {
      decision_subject: "CORPORATE_STRATEGY",
      risk_preference: "AGGRESSIVE",
    },
  });
  assert.equal(context.decision_subject, "FINANCIAL_INVESTOR");
  assert.equal(context.field_sources.decision_subject, "QUESTION");
  assert.equal(context.risk_preference, "CONSERVATIVE");
  assert.equal(context.field_sources.risk_preference, "QUESTION");
});

test("Ask clarification fills missing context before page filters, which outrank defaults", () => {
  const pageContext = { normalizedFilters: { time: "2026" } };
  const askFirst = buildAnalysisContext({
    question: "800VDC在AI数据中心供电架构中的机会和风险是什么？",
    pageContext,
    clarification: { time_horizon: "未来3年" },
  });
  assert.equal(askFirst.time_horizon, "未来3年");
  assert.equal(askFirst.field_sources.time_horizon, "CLARIFICATION");

  const pageFirst = buildAnalysisContext({
    question: "800VDC在AI数据中心供电架构中的机会和风险是什么？",
    pageContext,
  });
  assert.equal(pageFirst.time_horizon, "2026");
  assert.equal(pageFirst.field_sources.time_horizon, "FILTER");

  const defaulted = buildAnalysisContext({ question: "800VDC在AI数据中心供电架构中的机会和风险是什么？" });
  assert.equal(defaulted.time_horizon, "unknown");
  assert.equal(defaulted.field_sources.time_horizon, "DEFAULT");
});

test("Gaming UPS and sodium UPS request product-definition clarification", () => {
  const gaming = buildAnalysisContext({ question: "Gaming UPS是否值得做？" });
  const sodium = buildAnalysisContext({ question: "钠电UPS是否值得投入？" });
  assert.deepEqual(getClarificationQuestions(gaming).map((item) => item.field), ["gaming_definition"]);
  assert.deepEqual(getClarificationQuestions(sodium).map((item) => item.field), ["sodium_scope"]);
});

test("product-definition clarification remains visible in report assumptions", () => {
  const context = buildAnalysisContext({
    question: "Gaming UPS是否值得做？",
    clarification: { gaming_definition: "电竞场馆关键负载UPS" },
  });
  assert.equal(context.missing_high_impact_fields.length, 0);
  assert.match(context.assumptions.join(" "), /电竞场馆关键负载UPS/);
});
