import {
  normalizeDifyResponseToAskContract as normalizeRoot,
  stripDifyReasoning as stripRootReasoning,
} from "../src/utils/difyResponseNormalizer.js";
import {
  normalizeDifyResponseToAskContract as normalizeMirror,
  stripDifyReasoning as stripMirrorReasoning,
} from "../datacenter-power-insight-app-v1.1-optimized/src/utils/difyResponseNormalizer.js";

const implementations = [
  {
    name: "root",
    normalize: normalizeRoot,
    stripReasoning: stripRootReasoning,
  },
  {
    name: "mirror",
    normalize: normalizeMirror,
    stripReasoning: stripMirrorReasoning,
  },
];

const longReport = `<think>
内部推理，如果没有这一段也可以另放到 Case 3。
</think>

# 《800VDC AI训练集群供电市场情报与立项决策简报 V2.2》

## 1. 决策结论摘要
- 最终建议：有条件进入，建议先做L2小规模验证
- 投入等级：L2小规模验证；保留有条件L3选项
- 优先级：中
- 置信度：中
- 一句话结论：800VDC在AI训练集群供电领域有机会，但当前应先以POC验证为主。

## 5. 技术与产品趋势
- 关键验证门槛：效率、可靠性、GPU PSU兼容性、电弧保护、供应链成熟度。

## 7. 投资节奏、里程碑与退出条件
- 0-30天：完成客户访谈。
- 30-90天：完成POC方案。
- 退出/降级条件：无客户POC或关键技术无法通过验证，则降级为L1跟踪。

## 8. 风险提示
- 技术风险：800VDC电弧保护复杂。
- 商业风险：客户可能自研。

## 9. 证据与可信度
- 知识库直接证据：无。
- 结构推断：AI功率密度提升推动高压直流方案。

## 10. 最终建议
建议以L2验证进入，若客户POC通过，再升级为有条件L3。`;

const contractReport = `## 核心结论
最终建议：有条件进入
投入等级：L2；保留有条件L3选项

## 一句话结论
800VDC可以先L2验证。

## Why now
AI训练集群功率密度提升。

## What to build
800VDC供电MVP。

## How to enter
客户POC。

## Validation Gate
效率、客户入口、供应链。

## Key risks
技术与客户风险。

## Next actions
0-30天客户访谈。

## Exit conditions
无客户POC则降级。

## Evidence boundary
结构推断。

## 完整报告
这里是完整报告。`;

const derivedGateReport = `## 1. 决策结论摘要
投入等级：L2小规模验证
一句话结论：建议以POC验证为主。

## 5. 技术与产品趋势
关键验证门槛：高压直流安全、电弧保护、PSU兼容性、客户现场验证。

## 8. 风险提示
技术风险和商业风险仍需验证。

## 9. 证据与可信度
当前证据以结构推断为主。

## 10. 最终建议
建议L2验证，不建议立即L3。`;

const localFallback = (reason) => ({
  provider: "local",
  providerStatus: "fallback",
  fallbackUsed: true,
  warnings: [`unexpected local fallback: ${reason}`],
});

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const baseParams = {
  question: "中国云服务商AI训练场景下，800VDC是否值得L3立项？",
  filters: {},
  requestPayload: {
    resolvedContext: {
      track: "800VDC",
      analysis_goal: "market_assessment",
    },
  },
  localFallback,
};

const runNormalizer = (implementation, markdown) =>
  implementation.normalize({
    ...baseParams,
    rawDifyResponse: {
      answer: markdown,
    },
  });

const assertCommonSuccess = (implementation, caseName, result, markdown) => {
  const stripped = implementation.stripReasoning(markdown).text;

  assert(result.provider === "dify", `${implementation.name} ${caseName}: provider should be dify`);
  assert(result.fallbackUsed === false, `${implementation.name} ${caseName}: should not fallback`);
  assert(result.investmentLevel === "L2", `${implementation.name} ${caseName}: investmentLevel should be L2`);
  assert(Boolean(result.finalRecommendation), `${implementation.name} ${caseName}: finalRecommendation should be present`);
  assert(Boolean(result.oneLineConclusion), `${implementation.name} ${caseName}: oneLineConclusion should be present`);
  assert(Boolean(result.technicalGate), `${implementation.name} ${caseName}: technicalGate should be present`);
  assert(Array.isArray(result.keyRisks) && result.keyRisks.length > 0, `${implementation.name} ${caseName}: keyRisks should be present`);
  assert(Array.isArray(result.nextActions) && result.nextActions.length > 0, `${implementation.name} ${caseName}: nextActions should be present`);
  assert(Boolean(result.exitConditions), `${implementation.name} ${caseName}: exitConditions should be present`);
  assert(Array.isArray(result.evidenceBoundary) && result.evidenceBoundary.length > 0, `${implementation.name} ${caseName}: evidenceBoundary should be present`);
  assert(result.fullReportMarkdown === stripped, `${implementation.name} ${caseName}: fullReportMarkdown should preserve full stripped report`);
  assert(!result.fullReportMarkdown.includes("<think>"), `${implementation.name} ${caseName}: fullReportMarkdown should not include think blocks`);
};

const runCase1 = (implementation) => {
  const result = runNormalizer(implementation, longReport);
  assertCommonSuccess(implementation, "case1", result, longReport);
  assert(result.providerStatus === "partial", `${implementation.name} case1: providerStatus should be partial because think block was stripped`);
};

const runCase2 = (implementation) => {
  const result = runNormalizer(implementation, contractReport);
  assertCommonSuccess(implementation, "case2", result, contractReport);
  assert(result.providerStatus === "success", `${implementation.name} case2: providerStatus should be success`);
};

const runCase3 = (implementation) => {
  const result = runNormalizer(implementation, derivedGateReport);
  assertCommonSuccess(implementation, "case3", result, derivedGateReport);
  assert(
    result.providerStatus === "success" || result.providerStatus === "partial",
    `${implementation.name} case3: providerStatus should remain success or partial`
  );
};

for (const implementation of implementations) {
  runCase1(implementation);
  runCase2(implementation);
  runCase3(implementation);
}

console.log("Dify normalizer cases passed for root and mirror implementations.");
