import {
  createM1WorkflowTransport,
  fetchM1WorkflowAppInfo,
} from "../src/ask/m1/m1WorkflowTransport.js";
import { evaluateM1ProfessionalEligibility } from "../src/ask/m1/m1ProfessionalEligibility.js";
import { runM1InputUnderstanding } from "../src/ask/m1/runM1InputUnderstanding.js";
import { M1_ARCHITECTURE_DECISION_SUBJECT } from "../src/ask/m1/contracts/m1InputContext.js";

const normalize = (value) => String(value || "").toLowerCase().replace(/\s+/g, "");
const includesToken = (value, token) => normalize(value).includes(normalize(token));
const serialized = (value) => JSON.stringify(value);
const EXPECTED_APP = Object.freeze({
  id: "ff285777-08a1-4ca5-a4ea-d91c298c1dd9",
  name: "DCPI M1 Professional Demo MVP",
  mode: "workflow",
});
const EXPECTED_WORKFLOW_ID = String(process.env.DIFY_M1_PUBLISHED_WORKFLOW_ID || "").trim();
const SELECTED_PROVIDER = "langgenius/siliconflow/siliconflow";
const SELECTED_MODEL = "Qwen/Qwen3.5-397B-A17B";

const cases = [
  {
    id: "A1",
    suite: "original",
    category: "short_underspecified",
    question: "合成测试样例：模块机要不要做？",
    expect: { inScope: true, product: ["模块机", "模块化UPS", "UPS"], intent: "PRODUCT_INVESTMENT", omittedUnknown: ["region", "target_customer"] },
  },
  {
    id: "A2",
    suite: "original",
    category: "short_underspecified",
    question: "Synthetic placeholder test: should we invest in a UPS product?",
    expect: { inScope: true, product: ["UPS", "uninterruptible"], intent: "PRODUCT_INVESTMENT", omittedUnknown: ["region", "target_customer"] },
  },
  {
    id: "B1",
    suite: "original",
    category: "modular_ups_product_development",
    question: "合成测试样例：面向虚构大模型机房开发模块化UPS平台，是否值得进入产品定义？",
    expect: { inScope: true, product: ["模块化UPS", "UPS"], intent: "PRODUCT_DEVELOPMENT", scenario: ["大模型机房"] },
  },
  {
    id: "B2",
    suite: "original",
    category: "modular_ups_product_development",
    question: "Synthetic placeholder test: define a modular UPS using swappable 电力模块 for a fictional AI facility—proceed with product development?",
    expect: { inScope: true, product: ["modular UPS", "模块化UPS", "UPS"], intent: "PRODUCT_DEVELOPMENT", preserve: ["电力模块"] },
  },
  {
    id: "C1",
    suite: "original",
    category: "customer_region_power_specific",
    question: "合成测试样例：为虚构区域 REGION_ALPHA 的虚构客户 CUSTOMER_X 评估 1MW 模块化UPS，目标阶段为概念验证。",
    expect: { inScope: true, product: ["模块化UPS", "UPS"], intent: "PRODUCT_FIT_ASSESSMENT", region: ["REGION_ALPHA"], customer: ["CUSTOMER_X"], power: ["1MW"] },
  },
  {
    id: "C2",
    suite: "original",
    category: "customer_region_power_specific",
    question: "Synthetic placeholder test: CUSTOMER_Y in REGION_BETA asks whether a 500kW UPS platform should enter pilot validation in 18 months.",
    expect: { inScope: true, product: ["UPS"], intent: "PRODUCT_DEVELOPMENT", region: ["REGION_BETA"], customer: ["CUSTOMER_Y"], power: ["500kW"], timing: ["18 months", "18个月"] },
  },
  {
    id: "D1",
    suite: "original",
    category: "architecture_choice",
    question: "合成测试样例：智算中心供配电架构应比较 UPS、BBU 和 800VDC，三种方案都必须保留，当前只做架构选择。",
    expect: { inScope: true, architectureSubject: true, intent: "ARCHITECTURE_CHOICE", alternatives: ["UPS", "BBU", "800VDC"], scenario: ["智算中心"] },
  },
  {
    id: "D2",
    suite: "original",
    category: "architecture_choice",
    question: "Synthetic placeholder test: evaluate modular UPS versus HVDC and direct-current 800VDC for GPU clusters; do not drop any option.",
    expect: { inScope: true, architectureSubject: true, intent: "ARCHITECTURE_CHOICE", alternatives: ["modular UPS", "HVDC", "800VDC"], scenario: ["GPU"] },
  },
  {
    id: "E1",
    suite: "original",
    category: "existing_product_upgrade",
    question: "合成测试样例：现有模块机面对 GPU负载跃迁，是否需要升级动态响应和备电控制能力？",
    expect: { inScope: true, product: ["模块机", "模块化UPS", "UPS"], intent: "PRODUCT_UPGRADE", preserve: ["GPU负载跃迁", "备电"] },
  },
  {
    id: "E2",
    suite: "original",
    category: "existing_product_upgrade",
    question: "Synthetic placeholder test: can the current high-power UPS product be upgraded for rapid GPU cluster load steps, or is a new platform required?",
    expect: { inScope: true, product: ["UPS"], intent: "PRODUCT_UPGRADE", preserve: ["GPU"] },
  },
  {
    id: "F1",
    suite: "original",
    category: "incomplete_but_usable",
    question: "合成测试样例：想评估智算中心的大功率电源产品，区域、客户、功率和时间都还没定。",
    expect: { inScope: true, product: ["大功率电源", "UPS"], intent: "PRODUCT_FIT_ASSESSMENT", explicitUnknown: ["region", "target_customer", "power_or_system_scope", "target_timing"] },
  },
  {
    id: "F2",
    suite: "original",
    category: "incomplete_but_usable",
    question: "Synthetic placeholder test: assess a UPS investment for an AI facility; customer, geography, size, and schedule are intentionally unknown.",
    expect: { inScope: true, product: ["UPS"], intent: "PRODUCT_INVESTMENT", explicitUnknown: ["region", "target_customer", "power_or_system_scope", "target_timing"] },
  },
  {
    id: "G1",
    suite: "original",
    category: "conflicting_context",
    question: "合成测试样例：同一模块化UPS项目的功率被描述为 500kW 和 1MW，区域同时写 REGION_ALPHA 与 REGION_BETA；不要替我选。",
    expect: { inScope: true, product: ["模块化UPS", "UPS"], intent: "PRODUCT_FIT_ASSESSMENT", contradictions: ["500kW", "1MW", "REGION_ALPHA", "REGION_BETA"] },
  },
  {
    id: "G2",
    suite: "original",
    category: "conflicting_context",
    question: "Synthetic placeholder test: the UPS platform is called both a concept study and a launch-ready product, with target timing stated as 12 months and 36 months.",
    expect: { inScope: true, product: ["UPS"], intent: "PRODUCT_DEVELOPMENT", contradictions: ["concept", "launch", "12 months", "36 months"] },
  },
  {
    id: "H1",
    suite: "original",
    category: "chinese_industry_terminology",
    question: "合成测试样例：大模型机房的模块机、备电和大功率电源如何形成可投资的产品边界？",
    expect: { inScope: true, product: ["模块机", "模块化UPS", "UPS"], intent: "PRODUCT_INVESTMENT", preserve: ["大模型机房", "备电", "大功率电源"] },
  },
  {
    id: "H2",
    suite: "original",
    category: "chinese_industry_terminology",
    question: "合成测试样例：GPU集群供配电架构考虑模块化UPS、电力模块、直流供电、HVDC与BBU，是否应优先做路线评估？",
    expect: { inScope: true, architectureSubject: true, intent: "ARCHITECTURE_CHOICE", alternatives: ["模块化UPS", "电力模块", "直流供电", "HVDC", "BBU"], preserve: ["GPU集群"] },
  },
  {
    id: "I1",
    suite: "original",
    category: "long_narrative",
    question: "合成测试样例：虚构客户 CUSTOMER_LONG 计划在 REGION_GAMMA 建一个智算中心，担心 GPU负载跃迁影响备电。团队一方建议 1MW 模块化UPS，另一方要求同步比较 800VDC 和 BBU。当前只是预研，目标 24 个月，商业回报仍未知。请形成可用于下一步决策的输入上下文。",
    expect: { inScope: true, architectureSubject: true, intent: "ARCHITECTURE_CHOICE", region: ["REGION_GAMMA"], customer: ["CUSTOMER_LONG"], power: ["1MW"], alternatives: ["模块化UPS", "800VDC", "BBU"], preserve: ["GPU负载跃迁", "备电", "24"], explicitUnknownText: ["商业回报"] },
  },
  {
    id: "I2",
    suite: "original",
    category: "long_narrative",
    question: "Synthetic placeholder test: CUSTOMER_STORY in REGION_DELTA operates a fictional GPU cluster. The team is exploring a 750kW UPS upgrade, but also wants HVDC retained as an architecture alternative. This is an early feasibility stage with no verified economics or launch date, and the key constraint is repeated fast load transitions.",
    expect: { inScope: true, product: ["UPS"], intent: "PRODUCT_UPGRADE", region: ["REGION_DELTA"], customer: ["CUSTOMER_STORY"], power: ["750kW"], alternatives: ["HVDC"], preserve: ["GPU", "load transition"], explicitUnknown: ["target_timing"] },
  },
  {
    id: "J1",
    suite: "original",
    category: "out_of_scope",
    question: "合成测试样例：是否投资开发液冷 CDU 来解决虚构 GPU 机房的冷却问题？",
    expect: { inScope: false, product: ["CDU"], intent: "OUT_OF_SCOPE" },
  },
  {
    id: "J2",
    suite: "original",
    category: "out_of_scope",
    question: "Synthetic placeholder test: should a fictional team build a data-center fire suppression sensor platform?",
    expect: { inScope: false, product: ["fire", "suppression", "sensor"], intent: "OUT_OF_SCOPE" },
  },
  {
    id: "K1",
    suite: "holdout",
    category: "architecture_comparison_holdout",
    question: "For a new accelerator hall, compare BBU, HVDC, and a conventional UPS before choosing the facility power path.",
    expect: { inScope: true, architectureSubject: true, intent: "ARCHITECTURE_CHOICE", alternatives: ["BBU", "HVDC", "UPS"], scenario: ["accelerator hall"] },
  },
  {
    id: "K2",
    suite: "holdout",
    category: "long_narrative_holdout",
    question: "客户 ORG_ZETA 准备在 REGION_EPSILON 建设推理集群，初步按 1.5MW 规划。工程团队希望把模块化 UPS 与 800VDC 同台评估，项目仍在可研阶段，收益数据目前无法提供，计划窗口为 30 个月。",
    expect: { inScope: true, architectureSubject: true, intent: "ARCHITECTURE_CHOICE", alternatives: ["模块化 UPS", "800VDC"], region: ["REGION_EPSILON"], customer: ["ORG_ZETA"], power: ["1.5MW"], timing: ["30"], preserve: ["收益数据目前无法提供"] },
  },
  {
    id: "K3",
    suite: "holdout",
    category: "product_upgrade_holdout",
    question: "Our installed 2MW UPS cannot comfortably follow repeated AI load ramps; decide whether its controls and power modules need an upgrade while keeping full replacement as a later alternative.",
    expect: { inScope: true, product: ["UPS"], intent: "PRODUCT_UPGRADE", power: ["2MW"], preserve: ["controls", "power modules", "replacement"] },
  },
  {
    id: "K4",
    suite: "holdout",
    category: "conflicting_region_customer_holdout",
    question: "同一项 UPS 适配评估里，服务区域一处写 REGION_NORTH、另一处写 REGION_WEST，目标客户也同时出现 ACCOUNT_A 与 ACCOUNT_B；请完整保留冲突后再判断适配性。",
    expect: { inScope: true, product: ["UPS"], intent: "PRODUCT_FIT_ASSESSMENT", contradictions: ["REGION_NORTH", "REGION_WEST", "ACCOUNT_A", "ACCOUNT_B"] },
  },
  {
    id: "K5",
    suite: "holdout",
    category: "incomplete_usable_holdout",
    question: "We need an investment decision on a modular UPS for colocation, but the load size and launch date are not available yet.",
    expect: { inScope: true, product: ["modular UPS", "UPS"], intent: "PRODUCT_INVESTMENT", explicitUnknown: ["power_or_system_scope", "target_timing"], scenario: ["colocation"] },
  },
  {
    id: "L1",
    suite: "unseen",
    category: "intent_distinction_unseen",
    question: "A supplier already has a qualified 1MW UPS platform. The decision is whether to fund entry into a new data-center segment, not to redesign or upgrade the product.",
    expect: { inScope: true, product: ["UPS"], intent: "PRODUCT_INVESTMENT", power: ["1MW"], preserve: ["fund entry", "not to redesign"] },
  },
  {
    id: "L2",
    suite: "unseen",
    category: "architecture_comparison_unseen",
    question: "某加速计算园区需要在飞轮 UPS、锂电 BBU 与 800VDC 直供之间选择供电路线，三条路径都要保留后再比较。",
    expect: { inScope: true, architectureSubject: true, intent: "ARCHITECTURE_CHOICE", alternatives: ["飞轮 UPS", "锂电 BBU", "800VDC"] },
  },
  {
    id: "L3",
    suite: "unseen",
    category: "explicit_unknown_unseen",
    question: "Assess whether a modular UPS fits a high-density data hall. The buyer identity and commissioning quarter are explicitly unavailable, while the required capacity is 900kW.",
    expect: { inScope: true, product: ["modular UPS", "UPS"], intent: "PRODUCT_FIT_ASSESSMENT", power: ["900kW"], explicitUnknown: ["target_customer", "target_timing"], scenario: ["high-density data hall"] },
  },
  {
    id: "L4",
    suite: "unseen",
    category: "long_narrative_unseen",
    question: "A fictional operator named ACCOUNT_LONGFORM is planning an accelerator facility in REGION_THETA. Its engineering group wants to define a new modular UPS platform around a 1.2MW block, with serviceable power modules and tolerance for repeated workload ramps. BBU must remain documented as a future alternative, the present activity is product definition rather than an architecture selection, and a pilot is targeted in 28 months. Customer economics are explicitly unavailable today.",
    expect: { inScope: true, product: ["modular UPS", "UPS"], intent: "PRODUCT_DEVELOPMENT", region: ["REGION_THETA"], customer: ["ACCOUNT_LONGFORM"], power: ["1.2MW"], timing: ["28"], alternatives: ["BBU"], preserve: ["serviceable power modules", "workload ramps"], explicitUnknownText: ["Customer economics are explicitly unavailable"] },
  },
  {
    id: "L5",
    suite: "unseen",
    category: "conflicting_context_unseen",
    question: "For one modular UPS fit assessment, the design basis says 600kW but the commercial brief says 1.2MW; the intended buyer is described both as a hyperscale owner and as a colocation operator. Preserve both conflicts.",
    expect: { inScope: true, product: ["modular UPS", "UPS"], intent: "PRODUCT_FIT_ASSESSMENT", contradictions: ["600kW", "1.2MW", "hyperscale owner", "colocation operator"] },
  },
];

const evaluateCase = (context, expectation, run) => {
  const failures = [];
  const eligibility = evaluateM1ProfessionalEligibility(context);
  if (eligibility.eligible !== expectation.inScope) failures.push(`eligibility_expected_${expectation.inScope}`);
  const checkAny = (field, expected, label = field) => {
    if (expected && !expected.some((token) => includesToken(context[field], token))) failures.push(`${label}_not_preserved`);
  };
  if (expectation.architectureSubject) {
    if (context.primary_product_object !== M1_ARCHITECTURE_DECISION_SUBJECT) {
      failures.push("architecture_decision_subject_wrong");
    }
  } else {
    checkAny("primary_product_object", expectation.product, "primary_product_object");
  }
  if (expectation.intent && context.decision_intent !== expectation.intent) failures.push("decision_intent_wrong");
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
  if (expectation.omittedUnknown) {
    expectation.omittedUnknown.forEach((field) => {
      const provenance = context.field_provenance[field];
      if (!["UNKNOWN", "ASSUMED"].includes(provenance?.status)) failures.push(`missing_field_confirmed:${field}`);
      if (provenance?.status === "UNKNOWN" && provenance.source_span?.length > 0) {
        failures.push(`omitted_unknown_has_explicit_span:${field}`);
      }
    });
  }
  if (expectation.explicitUnknown) {
    expectation.explicitUnknown.forEach((field) => {
      const provenance = context.field_provenance[field];
      if (normalize(context[field]) !== "unknown") failures.push(`explicit_unknown_value_wrong:${field}`);
      if (provenance?.status !== "UNKNOWN") failures.push(`explicit_unknown_status_wrong:${field}`);
      if (!Array.isArray(provenance?.source_span) || provenance.source_span.length === 0) {
        failures.push(`explicit_unknown_statement_missing:${field}`);
      }
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
    const { raw_user_question: _rawUserQuestion, context_id: _contextId, ...semanticContext } = context;
    const contextText = serialized(semanticContext);
    expectation.preserve.forEach((token) => {
      if (!includesToken(contextText, token)) failures.push(`explicit_term_dropped:${token}`);
    });
  }
  if (expectation.explicitUnknownText) {
    const provenanceText = serialized({
      unknowns: context.unknowns,
      stated_evidence: context.stated_evidence,
      field_provenance: context.field_provenance,
    });
    expectation.explicitUnknownText.forEach((token) => {
      if (!includesToken(provenanceText, token)) failures.push(`explicit_unknown_statement_dropped:${token}`);
    });
  }
  if (context.clarification_required) {
    const marks = (context.clarification_question.match(/[?？]/g) || []).length;
    if (marks > 1) failures.push("more_than_one_clarification");
  }
  if (run.workflowId !== EXPECTED_WORKFLOW_ID) failures.push("unexpected_published_workflow_version");
  if (run.attemptCount > 2) failures.push("more_than_one_technical_retry");
  if (run.attemptCount === 2) {
    if (run.attempts?.[0]?.status !== "provider_error" || run.attempts?.[0]?.retryable !== true) {
      failures.push("retry_not_transient_provider_error");
    }
  }
  return { failures, eligibility };
};

const startedAt = Date.now();
const workflowTransport = createM1WorkflowTransport({ userId: "dcpi-m1-d1-synthetic-input-gate" });
const appIdentity = await fetchM1WorkflowAppInfo();
const appIdentityFailures = [];
if (appIdentity.status !== "ready") appIdentityFailures.push(appIdentity.reasonCode || "app_identity_unavailable");
if (appIdentity.appInfo?.name !== EXPECTED_APP.name) appIdentityFailures.push("unexpected_app_name");
if (appIdentity.appInfo?.mode !== EXPECTED_APP.mode) appIdentityFailures.push("unexpected_app_mode");
if (!EXPECTED_WORKFLOW_ID) appIdentityFailures.push("expected_published_workflow_version_missing");
if (appIdentityFailures.length > 0) {
  console.log(JSON.stringify({
    verdict: "INPUT_PROVIDER_RESET_GATE_FAIL",
    appIdentity: EXPECTED_APP,
    appIdentityObserved: appIdentity,
    appIdentityFailures,
    workflowId: EXPECTED_WORKFLOW_ID || null,
    caseCount: 0,
    materialFailureCount: appIdentityFailures.length,
    results: [],
  }, null, 2));
  process.exit(1);
}
const results = [];

for (const testCase of cases) {
  const caseStartedAt = Date.now();
  const run = await runM1InputUnderstanding({
    question: testCase.question,
    workflowTransport,
    expectedWorkflowId: EXPECTED_WORKFLOW_ID,
  });
  if (run.mode !== "m1_input_context") {
    results.push({
      id: testCase.id,
      suite: testCase.suite,
      category: testCase.category,
      status: "FAIL",
      failures: [run.reasonCode, ...(run.validationErrors || [])],
      workflowRunId: run.workflowRunId || null,
      workflowId: run.workflowId || null,
      attemptCount: run.attemptCount || 0,
      attempts: run.attempts || [],
      elapsedMs: Date.now() - caseStartedAt,
    });
    console.error(`${testCase.id} FAIL ${run.reasonCode}`);
    continue;
  }
  const evaluation = evaluateCase(run.inputContext, testCase.expect, run);
  results.push({
    id: testCase.id,
    suite: testCase.suite,
    category: testCase.category,
    status: evaluation.failures.length === 0 ? "PASS" : "FAIL",
    failures: evaluation.failures,
    workflowRunId: run.workflowRunId,
    workflowId: run.workflowId,
    attemptCount: run.attemptCount,
    attempts: run.attempts,
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
const retryEvidence = results
  .filter((result) => result.attemptCount > 1)
  .map(({ id, attemptCount, attempts, status }) => ({ id, attemptCount, attempts, status }));
const originalResults = results.filter((result) => result.suite === "original");
const holdoutResults = results.filter((result) => result.suite === "holdout");
const unseenResults = results.filter((result) => result.suite === "unseen");
const verdict = failures.length === 0 ? "INPUT_PROVIDER_RESET_GATE_PASS" : "INPUT_PROVIDER_RESET_GATE_FAIL";
console.log(JSON.stringify({
  verdict,
  workflowIdentity: EXPECTED_APP.name,
  appId: EXPECTED_APP.id,
  appIdentityObserved: appIdentity.appInfo,
  workflowId: EXPECTED_WORKFLOW_ID,
  provider: SELECTED_PROVIDER,
  providerModel: SELECTED_MODEL,
  endpoint: "/v1/workflows/run",
  responseMode: "blocking",
  timeoutMs: Number(process.env.DIFY_M1_WORKFLOW_TIMEOUT_MS || 90000),
  temperature: "unsupported_by_selected_provider",
  contextWindowTokens: 262144,
  maxOutputTokens: "provider_default",
  schemaVersion: "m1.input.v1",
  caseCount: results.length,
  originalCaseCount: originalResults.length,
  originalPassCount: originalResults.filter((result) => result.status === "PASS").length,
  holdoutCaseCount: holdoutResults.length,
  holdoutPassCount: holdoutResults.filter((result) => result.status === "PASS").length,
  unseenCaseCount: unseenResults.length,
  unseenPassCount: unseenResults.filter((result) => result.status === "PASS").length,
  categoryCount: new Set(results.map((result) => result.category)).size,
  elapsedMs: Date.now() - startedAt,
  materialFailureCount: failures.length,
  retryEvidence,
  results,
}, null, 2));

process.exit(failures.length === 0 ? 0 : 1);
