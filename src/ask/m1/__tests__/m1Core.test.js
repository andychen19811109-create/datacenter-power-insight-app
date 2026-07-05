import test from "node:test";
import assert from "node:assert/strict";

import { buildM1ProviderRequest } from "../buildM1ProviderRequest.js";
import { evaluateM1ProfileEligibility } from "../m1ProfileEligibility.js";
import {
  parseAndValidateM1ExpertResult,
  validateM1ExpertResult,
} from "../parseAndValidateM1ExpertResult.js";
import { resolveM1DecisionContext, resolveM1PresentationPerspective } from "../resolveM1DecisionContext.js";
import { runM1InvestmentDecision } from "../runM1InvestmentDecision.js";

const representativeQuestion = "Kstar 是否值得投入 300kW UPS for North America AI data center colocation over the next 5 years?";
const baseFilters = {
  role: "高管",
  region: "全球",
  customer: "全部",
  application: "AI Data Center",
  track: "全部",
  time: "2026",
};

const context = {
  productObject: "UPS",
  application: "AI Data Center",
  customerType: "High-density Colocation",
  region: "North America",
  powerClass: "300kW",
  investmentHorizon: "5 years",
  vendorProfile: "Kstar",
  vendorCapabilityBaseline: "Kstar mentioned; verified capability baseline remains Unknown unless supplied by M1 evidence or user-provided context.",
};

const validResult = () => ({
  profileVersion: "m1-investment-report-v1",
  mode: "m1_investment",
  evidenceSnapshotDate: "2026-07-05",
  resolvedContext: context,
  executiveDecision: {
    decision: "CONDITIONAL_INVEST",
    requiredAction: "VALIDATE",
    fundingBoundary: "Fund only architecture and customer validation until critical unknowns close.",
    decisionConfidence: "medium",
    investmentThesis: "AI data-center UPS opportunity requires validation of dynamic load response, safety certification path, and customer reference fit before scale investment.",
    criticalUnknowns: ["Vendor capability baseline", "customer reference path"],
  },
  whyNow: [
    { evidenceClass: "VERIFIED_FACT", sourceIds: ["m1_nvidia_800vdc"], point: "AI workloads create fast power swings." },
  ],
  marketSignals: [
    { evidenceClass: "VERIFIED_FACT", sourceIds: ["m1_digital_realty_hd_colo"], signal: "High-density colocation offers reach 150kW per cabinet." },
  ],
  customerPains: [
    { evidenceClass: "EXPERT_INFERENCE", sourceIds: ["m1_digital_realty_hd_colo"], pain: "Fast deployment at high density", productImplication: "Reference design must fit prefabricated deployment paths.", decisionImpact: "Gate first reference customer before full platform spend." },
  ],
  applicationBoundary: {
    bestFit: "AI/HPC high-density colocation requiring validated UPS dynamic behavior.",
    secondaryFit: "Prefabricated power rooms where certification and service can be proven.",
    noFit: "Generic low-density enterprise UPS replacement without AI load-step requirement.",
  },
  powerArchitecture: {
    productPosition: "UPS remains a power-continuity product at the AC-to-load protection boundary.",
    architectureTransitionBoundary: "800VDC is a transition signal, not proof that AC UPS is obsolete.",
    keyInterfaces: ["generator coordination", "battery control", "rack power distribution"],
  },
  criticalTechnicalMetrics: [
    { evidenceClass: "MUST_VALIDATE", sourceIds: [], metric: "0-100% step-load response", thresholdOrValidationGate: "Lab test across duty cycles without unnecessary battery cycling.", decisionImpact: "Failure forces architecture reset." },
  ],
  competitivePosition: {
    competitorStrategicLogic: "Schneider and Vertiv signal compact high-density UPS and AI load-control priorities.",
    competitiveParity: "Parity requires validated dynamic controls and certification path.",
    whiteSpace: "Application-specific validation bundle for AI colocation references.",
  },
  commercialDecision: {
    targetCustomer: "High-density AI colocation operator",
    entryModel: "Reference validation partnership",
    firstReferenceLogic: "Start where high-density rack power and fast deployment are explicit.",
    commercialBarriers: ["service coverage", "certification scope"],
    doNotLeadWith: ["lower price", "generic AI-ready claim"],
  },
  riskRegister: [
    { evidenceClass: "MUST_VALIDATE", sourceIds: [], risk: "Dynamic load instability", decisionImpact: "Can invalidate product architecture.", earlyWarning: "Battery micro-discharge under repeated swings.", killTrigger: "Cannot pass repeated step-load test without unsafe battery cycling.", requiredResponse: "Stop full funding and reset controls architecture." },
  ],
  evidenceAndUncertainty: [
    { evidenceClass: "VERIFIED_FACT", sourceIds: ["m1_ul_1778"], point: "UL 1778 is a UPS standard reference.", uncertainty: "New platform certification scope remains project-specific." },
  ],
  decisionGates: [
    { gate: "Dynamic load validation", observablePassCondition: "Pass repeated AI load-step profile under defined duty cycles.", missingEvidence: ["lab report"] },
  ],
  actions30_60_90: [
    { window: "30 days", objective: "Frame validation scope", actions: ["Define load-step protocol"], requiredEvidence: ["test plan"], endDecision: "VALIDATE" },
    { window: "60 days", objective: "Customer reference design", actions: ["Select reference customer"], requiredEvidence: ["customer acceptance criteria"], endDecision: "SCOPE_DOWN" },
    { window: "90 days", objective: "Funding decision", actions: ["Review test evidence"], requiredEvidence: ["validated test result"], endDecision: "PROCEED" },
  ],
});

test("representative UPS AI investment question activates M1", () => {
  const result = evaluateM1ProfileEligibility({ question: representativeQuestion, filters: baseFilters });
  assert.equal(result.eligible, true);
  assert.equal(result.route, "entity_investment");
  assert.equal(result.primaryEntityId, "ups");
});

test("same-family product-form development intent routes to investment without hard-coded phrasing", () => {
  [
    "一家UPS厂商要不要开发模块化UPS平台并投入北美AI colocation市场？",
    "UPS vendor 是否值得投入开发 data center UPS platform for AI colocation?",
    "中国不间断电源厂商未来18到24个月是否应该投资1MW modular UPS platform for North America AI colocation?",
  ].forEach((question) => {
    const result = evaluateM1ProfileEligibility({ question, filters: baseFilters });
    assert.equal(result.eligible, true);
    assert.equal(result.route, "entity_investment");
  });
});

test("true relationship comparison substitution semantics remain outside M1", () => {
  [
    ["UPS 和模块化UPS是什么关系？", "entity_relationship"],
    ["modular UPS vs monolithic UPS for AI data centers", "entity_comparison"],
    ["BBU会不会替代UPS？", "entity_substitution"],
  ].forEach(([question, route]) => {
    const result = evaluateM1ProfileEligibility({ question, filters: baseFilters });
    assert.equal(result.eligible, false);
    assert.equal(result.route, route);
  });
});

test("non-M1 investment and open architecture/comparison questions do not activate M1", () => {
  [
    "Should we invest in CDU for AI Data Center liquid cooling?",
    "What are the opportunity and risk of 800VDC for AI data centers?",
    "Compare modular UPS vs monolithic UPS for AI data centers.",
  ].forEach((question) => {
    assert.equal(evaluateM1ProfileEligibility({ question, filters: baseFilters }).eligible, false);
  });
});

test("Provider is not called for non-eligible question and no legacy fallback leaks into M1", async () => {
  let called = false;
  const result = await runM1InvestmentDecision({
    question: "Should we invest in CDU for AI Data Center liquid cooling?",
    filters: baseFilters,
    providerTransport: async () => {
      called = true;
      return { status: "ready", answer: "{}" };
    },
  });
  assert.equal(called, false);
  assert.equal(result.mode, "legacy");
  assert.equal(result.result, undefined);
});

test("decision context resolves question precedence and frozen slots", () => {
  const eligibility = evaluateM1ProfileEligibility({ question: representativeQuestion, filters: baseFilters });
  const resolved = resolveM1DecisionContext({ question: representativeQuestion, filters: baseFilters, eligibility });
  assert.deepEqual(Object.keys(resolved), [
    "productObject",
    "application",
    "customerType",
    "region",
    "powerClass",
    "investmentHorizon",
    "vendorProfile",
    "vendorCapabilityBaseline",
  ]);
  assert.equal(resolved.region, "North America");
  assert.equal(resolved.powerClass, "300kW");
  assert.equal(resolved.investmentHorizon, "5 years");
  assert.equal(resolveM1PresentationPerspective(baseFilters), "高管");
});

test("filters.time does not become investmentHorizon", () => {
  const eligibility = evaluateM1ProfileEligibility({ question: "Should we invest in UPS for AI Data Center colocation?", filters: baseFilters });
  const resolved = resolveM1DecisionContext({ question: "Should we invest in UPS for AI Data Center colocation?", filters: baseFilters, eligibility });
  assert.equal(resolved.investmentHorizon, "Unknown");
});

test("valid pure JSON and one outer json fence parse", () => {
  assert.equal(parseAndValidateM1ExpertResult(JSON.stringify(validResult())).ok, true);
  assert.equal(parseAndValidateM1ExpertResult(`\`\`\`json\n${JSON.stringify(validResult())}\n\`\`\``).ok, true);
});

test("malformed provider shapes fail closed", () => {
  assert.equal(parseAndValidateM1ExpertResult(`<think>hidden</think>\n${JSON.stringify(validResult())}`).ok, false);
  assert.equal(parseAndValidateM1ExpertResult("# Heading\nbad").ok, false);
  assert.equal(parseAndValidateM1ExpertResult("{bad").ok, false);
  assert.equal(validateM1ExpertResult({ ...validResult(), marketSignals: undefined }).ok, false);
  assert.equal(validateM1ExpertResult({
    ...validResult(),
    whyNow: [{ evidenceClass: "VERIFIED_FACT", sourceIds: ["unknown_source"], point: "bad" }],
  }).ok, false);
  assert.equal(validateM1ExpertResult({
    ...validResult(),
    whyNow: [{ evidenceClass: "VERIFIED_FACT", sourceIds: [], point: "bad" }],
  }).ok, false);
  assert.equal(validateM1ExpertResult({
    ...validResult(),
    whyNow: [{ evidenceClass: "EXPERT_INFERENCE", sourceIds: [], point: "bad" }],
  }).ok, false);
  assert.equal(validateM1ExpertResult({
    ...validResult(),
    riskRegister: [{ ...validResult().riskRegister[0], killTrigger: "" }],
  }).ok, false);
  assert.equal(validateM1ExpertResult({
    ...validResult(),
    decisionGates: [{ ...validResult().decisionGates[0], observablePassCondition: "" }],
  }).ok, false);
});

test("provider error timeout and malformed result return sanitized unavailable", async () => {
  const errorResult = await runM1InvestmentDecision({ question: representativeQuestion, filters: baseFilters, providerTransport: async () => ({ status: "provider_error" }) });
  const timeoutResult = await runM1InvestmentDecision({ question: representativeQuestion, filters: baseFilters, providerTransport: async () => ({ status: "provider_timeout" }) });
  const malformedResult = await runM1InvestmentDecision({ question: representativeQuestion, filters: baseFilters, providerTransport: async () => ({ status: "ready", answer: "{bad" }) });
  [errorResult, timeoutResult, malformedResult].forEach((result) => {
    assert.equal(result.mode, "m1_unavailable");
    assert.equal(result.userMessage, "Expert investment decision analysis is temporarily unavailable.");
    assert.equal(result.result, undefined);
  });
});

test("provider request excludes golden reference and legacy artifacts", () => {
  const eligibility = evaluateM1ProfileEligibility({ question: representativeQuestion, filters: baseFilters });
  const request = buildM1ProviderRequest({
    question: representativeQuestion,
    filters: baseFilters,
    eligibility,
    resolvedContext: context,
    presentationPerspective: "高管",
  });
  const extraContext = request.inputs.extra_context;
  assert.equal(extraContext.includes(representativeQuestion), false);
  assert.equal(extraContext.includes("expected answer"), false);
  assert.equal(extraContext.includes("correct answer"), false);
  assert.equal(extraContext.includes("expected decision"), false);
  assert.equal(extraContext.includes("correct decision"), false);
  assert.equal(extraContext.includes("should conclude"), false);
  assert.equal(extraContext.includes("D1"), false);
  assert.equal(JSON.stringify(request).includes("legacy opportunity score"), false);
  assert.equal(JSON.stringify(request).includes("legacy L0-L4 answer"), false);
  assert.equal(JSON.stringify(request).includes("legacy executiveBrief"), false);
});

test("valid provider result returns sanitized M1 core result", async () => {
  const result = await runM1InvestmentDecision({
    question: representativeQuestion,
    filters: baseFilters,
    providerTransport: async () => ({ status: "ready", answer: JSON.stringify(validResult()) }),
  });
  assert.equal(result.mode, "m1_investment");
  assert.equal(result.result.profileVersion, "m1-investment-report-v1");
  assert.equal(result.result.resolvedContext.powerClass, "300kW");
});
