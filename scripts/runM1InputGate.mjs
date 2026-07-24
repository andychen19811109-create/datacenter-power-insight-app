import { createM1WorkflowTransport } from "../src/ask/m1/m1WorkflowTransport.js";
import { evaluateM1ProfessionalEligibility } from "../src/ask/m1/m1ProfessionalEligibility.js";
import { runM1InputUnderstanding } from "../src/ask/m1/runM1InputUnderstanding.js";

const normalize = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");
const includesToken = (value, token) => normalize(value).includes(normalize(token));
const serialized = (value) => JSON.stringify(value);

const cases = [
  {
    id: "A1",
    category: "short_underspecified",
    question: "合成测试样例：模块机要不要做？",
    expect: { inScope: true, product: ["模块机", "模块化UPS", "UPS"], intent: ["product_investment", "product_definition", "roadmap_priority"], unknown: ["region", "target_customer"] },
  },
  {
    id: "A2",
    category: "short_underspecified",
    question: "Synthetic placeholder test: should we invest in a UPS product?",
    expect: { inScope: true, product: ["UPS", "uninterruptible"], intent: ["product_investment", "product_definition"], unknown: ["region", "target_customer"] },
  },
  {
    id: "B1",
    category: "modular_ups_product_development",
    question: "合成测试样例：面向虚构大模型机房开发模块化UPS平台，是否值得进入产品定义？",
    expect: { inScope: true, product: ["模块化UPS", "UPS"], intent: ["product_investment", "product_definition"], scenario: ["大模型机房"] },
  },
  {
    id: "B2",
    category: "modular_ups_product_development",
    question: "Synthetic placeholder test: define a modular UPS using swappable 电力模块 for a fictional AI facility—proceed with product development?",
    expect: { inScope: true, product: ["modular UPS", "模块化UPS", "UPS"], intent: ["product_investment", "product_definition"], preserve: ["电力模块"] },
  },
  {
    id: "C1",
    category: "customer_region_power_specific",
    question: "合成测试样例：为虚构区域 REGION_ALPHA 的虚构客户 CUSTOMER_X 评估 1MW 模块化UPS，目标阶段为概念验证。",
    expect: { inScope: true, product: ["模块化UPS", "UPS"], region: ["REGION_ALPHA"], customer: ["CUSTOMER_X"], power: ["1MW"] },
  },
  {
    id: "C2",
    category: "customer_region_power_specific",
    question: "Synthetic placeholder test: CUSTOMER_Y in REGION_BETA asks whether a 500kW UPS platform should enter pilot validation in 18 months.",
    expect: { inScope: true, product: ["UPS"], region: ["REGION_BETA"], customer: ["CUSTOMER_Y"], power: ["500kW"], timing: ["18 months", "18个月"] },
  },
  {
    id: "D1",
    category: "architecture_choice",
    question: "合成测试样例：智算中心供配电架构应比较 UPS、BBU 和 800VDC，三种方案都必须保留，当前只做架构选择。",
    expect: { inScope: true, product: ["UPS"], intent: ["architecture_choice"], alternatives: ["UPS", "BBU", "800VDC"], scenario: ["智算中心"] },
  },
  {
    id: "D2",
    category: "architecture_choice",
    question: "Synthetic placeholder test: evaluate modular UPS versus HVDC and direct-current 800VDC for GPU clusters; do not drop any option.",
    expect: { inScope: true, product: ["modular UPS", "模块化UPS", "UPS"], intent: ["architecture_choice"], alternatives: ["UPS", "HVDC", "800VDC"], scenario: ["GPU"] },
  },
  {
    id: "E1",
    category: "existing_product_upgrade",
    question: "合成测试样例：现有模块机面对 GPU负载跃迁，是否需要升级动态响应和备电控制能力？",
    expect: { inScope: true, product: ["模块机", "模块化UPS", "UPS"], intent: ["product_definition", "roadmap_priority", "product_investment"], preserve: ["GPU负载跃迁", "备电"] },
  },
  {
    id: "E2",
    category: "existing_product_upgrade",
    question: "Synthetic placeholder test: can the current high-power UPS product be upgraded for rapid GPU cluster load steps, or is a new platform required?",
    expect: { inScope: true, product: ["UPS"], intent: ["product_definition", "roadmap_priority", "architecture_choice"], preserve: ["GPU"] },
  },
  {
    id: "F1",
    category: "incomplete_but_usable",
    question: "合成测试样例：想评估智算中心的大功率电源产品，区域、客户、功率和时间都还没定。",
    expect: { inScope: true, product: ["大功率电源", "UPS"], intent: ["product_investment", "product_definition"], unknown: ["region", "target_customer", "power_or_system_scope", "target_timing"] },
  },
  {
    id: "F2",
    category: "incomplete_but_usable",
    question: "Synthetic placeholder test: assess a UPS investment for an AI facility; customer, geography, size, and schedule are intentionally unknown.",
    expect: { inScope: true, product: ["UPS"], intent: ["product_investment"], unknown: ["region", "target_customer", "power_or_system_scope", "target_timing"] },
  },
  {
    id: "G1",
    category: "conflicting_context",
    question: "合成测试样例：同一模块化UPS项目的功率被描述为 500kW 和 1MW，区域同时写 REGION_ALPHA 与 REGION_BETA；不要替我选。",
    expect: { inScope: true, product: ["模块化UPS", "UPS"], contradictions: ["500kW", "1MW", "REGION_ALPHA", "REGION_BETA"] },
  },
  {
    id: "G2",
    category: "conflicting_context",
    question: "Synthetic placeholder test: the UPS platform is called both a concept study and a launch-ready product, with target timing stated as 12 months and 36 months.",
    expect: { inScope: true, product: ["UPS"], contradictions: ["concept", "launch", "12 months", "36 months"] },
  },
  {
    id: "H1",
    category: "chinese_industry_terminology",
    question: "合成测试样例：大模型机房的模块机、备电和大功率电源如何形成可投资的产品边界？",
    expect: { inScope: true, product: ["模块机", "大功率电源", "UPS"], intent: ["product_investment", "product_definition"], preserve: ["大模型机房", "备电"] },
  },
  {
    id: "H2",
    category: "chinese_industry_terminology",
    question: "合成测试样例：GPU集群供配电架构考虑模块化UPS、电力模块、直流供电、HVDC与BBU，是否应优先做路线评估？",
    expect: { inScope: true, product: ["模块化UPS", "UPS"], intent: ["architecture_choice", "roadmap_priority"], alternatives: ["UPS", "HVDC", "BBU"], preserve: ["GPU集群", "电力模块", "直流供电"] },
  },
  {
    id: "I1",
    category: "long_narrative",
    question: "合成测试样例：虚构客户 CUSTOMER_LONG 计划在 REGION_GAMMA 建一个智算中心，担心 GPU负载跃迁影响备电。团队一方建议 1MW 模块化UPS，另一方要求同步比较 800VDC 和 BBU。当前只是预研，目标 24 个月，商业回报仍未知。请形成可用于下一步决策的输入上下文。",
    expect: { inScope: true, product: ["模块化UPS", "UPS"], region: ["REGION_GAMMA"], customer: ["CUSTOMER_LONG"], power: ["1MW"], alternatives: ["UPS", "800VDC", "BBU"], preserve: ["GPU负载跃迁", "备电", "24"] },
  },
  {
    id: "I2",
    category: "long_narrative",
    question: "Synthetic placeholder test: CUSTOMER_STORY in REGION_DELTA operates a fictional GPU cluster. The team is exploring a 750kW UPS upgrade, but also wants HVDC retained as an architecture alternative. This is an early feasibility stage with no verified economics or launch date, and the key constraint is repeated fast load transitions.",
    expect: { inScope: true, product: ["UPS"], region: ["REGION_DELTA"], customer: ["CUSTOMER_STORY"], power: ["750kW"], alternatives: ["HVDC"], preserve: ["GPU", "load transition"] },
  },
  {
    id: "J1",
    category: "out_of_scope",
    question: "合成测试样例：是否投资开发液冷 CDU 来解决虚构 GPU 机房的冷却问题？",
    expect: { inScope: false, product: ["CDU"], intent: ["product_investment", "product_definition"] },
  },
  {
    id: "J2",
    category: "out_of_scope",
    question: "Synthetic placeholder test: should a fictional team build a data-center fire suppression sensor platform?",
    expect: { inScope: false, product: ["fire", "suppression", "sensor"], intent: ["product_investment", "product_definition"] },
  },
];

const evaluateCase = (context, expectation) => {
  const failures = [];
  const eligibility = evaluateM1ProfessionalEligibility(context);
  if (eligibility.eligible !== expectation.inScope) failures.push(`eligibility_expected_${expectation.inScope}`);
  const checkAny = (field, expected, label = field) => {
    if (expected && !expected.some((token) => includesToken(context[field], token))) failures.push(`${label}_not_preserved`);
  };
  checkAny("primary_product_object", expectation.product, "primary_product_object");
  if (expectation.intent && !expectation.intent.includes(context.decision_intent)) failures.push("decision_intent_wrong");
  checkAny("application_scenario", expectation.scenario, "application_scenario");
  checkAny("region", expectation.region, "region");
  checkAny("target_customer", expectation.customer, "target_customer");
  checkAny("power_or_system_scope", expectation.power, "power_or_system_scope");
  checkAny("target_timing", expectation.timing, "target_timing");

  if (expectation.alternatives) {
    expectation.alternatives.forEach((alternative) => {
      if (!context.architecture_alternatives.some((value) => includesToken(value, alternative))) {
        failures.push(`architecture_alternative_dropped:${alternative}`);
      }
    });
  }
  if (expectation.unknown) {
    expectation.unknown.forEach((field) => {
      const provenance = context.field_provenance[field];
      if (!["UNKNOWN", "ASSUMED"].includes(provenance?.status)) failures.push(`missing_field_confirmed:${field}`);
    });
  }
  if (expectation.contradictions) {
    const contradictionText = serialized(context.contradictions);
    if (context.contradictions.length === 0) failures.push("contradiction_dropped");
    expectation.contradictions.forEach((token) => {
      if (!includesToken(contradictionText, token)) failures.push(`contradiction_value_dropped:${token}`);
    });
  }
  if (expectation.preserve) {
    const contextText = serialized(context);
    expectation.preserve.forEach((token) => {
      if (!includesToken(contextText, token)) failures.push(`explicit_term_dropped:${token}`);
    });
  }
  if (context.clarification_required) {
    const marks = (context.clarification_question.match(/[?？]/g) || []).length;
    if (marks > 1) failures.push("more_than_one_clarification");
  }
  return { failures, eligibility };
};

const startedAt = Date.now();
const workflowTransport = createM1WorkflowTransport({ userId: "dcpi-m1-d1-synthetic-input-gate" });
const results = [];

for (const testCase of cases) {
  const caseStartedAt = Date.now();
  const run = await runM1InputUnderstanding({
    question: testCase.question,
    workflowTransport,
  });
  if (run.mode !== "m1_input_context") {
    results.push({
      id: testCase.id,
      category: testCase.category,
      status: "FAIL",
      failures: [run.reasonCode, ...(run.validationErrors || [])],
      workflowRunId: run.workflowRunId || null,
      elapsedMs: Date.now() - caseStartedAt,
    });
    console.error(`${testCase.id} FAIL ${run.reasonCode}`);
    continue;
  }
  const evaluation = evaluateCase(run.inputContext, testCase.expect);
  results.push({
    id: testCase.id,
    category: testCase.category,
    status: evaluation.failures.length === 0 ? "PASS" : "FAIL",
    failures: evaluation.failures,
    workflowRunId: run.workflowRunId,
    providerElapsedSeconds: run.elapsedTime,
    elapsedMs: Date.now() - caseStartedAt,
    summary: {
      decision_intent: run.inputContext.decision_intent,
      primary_product_object: run.inputContext.primary_product_object,
      architecture_alternatives: run.inputContext.architecture_alternatives,
      application_scenario: run.inputContext.application_scenario,
      target_customer: run.inputContext.target_customer,
      region: run.inputContext.region,
      power_or_system_scope: run.inputContext.power_or_system_scope,
      target_timing: run.inputContext.target_timing,
      unknowns: run.inputContext.unknowns,
      contradictions: run.inputContext.contradictions,
      clarification_required: run.inputContext.clarification_required,
      recognition_confidence: run.inputContext.recognition_confidence,
      eligibility: evaluation.eligibility,
    },
  });
  console.error(`${testCase.id} ${evaluation.failures.length === 0 ? "PASS" : `FAIL ${evaluation.failures.join(",")}`}`);
}

const failures = results.filter((result) => result.status === "FAIL");
const verdict = failures.length === 0 ? "INPUT_GATE_PASS" : "INPUT_GATE_FAIL";
console.log(JSON.stringify({
  verdict,
  workflowIdentity: "DCPI M1 Professional Demo MVP",
  appId: "ff285777-08a1-4ca5-a4ea-d91c298c1dd9",
  providerModel: "deepseek-v4-flash",
  endpoint: "/v1/workflows/run",
  schemaVersion: "m1.input.v1",
  caseCount: results.length,
  categoryCount: new Set(results.map((result) => result.category)).size,
  elapsedMs: Date.now() - startedAt,
  materialFailureCount: failures.length,
  results,
}, null, 2));

process.exit(failures.length === 0 ? 0 : 1);
