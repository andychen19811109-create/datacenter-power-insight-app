import {
  normalizeDifyResponseToAskContract as normalizeRoot,
  stripDifyReasoning as stripRootReasoning,
} from "../src/utils/difyResponseNormalizer.js";
import { buildDifyRequestPayload } from "../src/utils/difyRequestPayload.js";
import { analyzeAskQuestion } from "../src/utils/insightEngine.js";
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
- 证据边界：no_quantified_data；source_required。

## 11. Clean R1规划体
### 五看
- 看场景：AI训练集群。
- 看客户：云服务商。
- 看技术：800VDC供电。
- 看交付：先POC。
- 看风险：电弧保护与PSU兼容性。
### 三定
- 定对象：800VDC供电方案。
- 定MVP：客户POC验证包。
- 定验证门槛：效率、可靠性、GPU PSU兼容性、电弧保护、供应链成熟度。
### 证据边界
- no_quantified_data：缺少可引用TAM、ROI和客户POC量化数据。
- source_required：若进入L3，需要客户访谈、供应链报价和测试数据。

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
结构推断。no_quantified_data；source_required。

## 五看
- 看场景：AI训练集群。
- 看客户：云服务商。
- 看技术：800VDC供电。
- 看交付：先POC。
- 看风险：电弧保护与PSU兼容性。

## 三定
- 定对象：800VDC供电方案。
- 定MVP：客户POC验证包。
- 定验证门槛：效率、可靠性、GPU PSU兼容性、电弧保护、供应链成熟度。

## 证据边界
- no_quantified_data：缺少可引用TAM、ROI和客户POC量化数据。
- source_required：若进入L3，需要客户访谈、供应链报价和测试数据。

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
当前证据以结构推断为主；证据边界：no_quantified_data；source_required。

## 五看
- 看场景：AI训练集群。
- 看客户：云服务商。
- 看技术：800VDC供电。
- 看交付：先POC。
- 看风险：电弧保护与PSU兼容性。

## 三定
- 定对象：800VDC供电方案。
- 定MVP：客户POC验证包。
- 定验证门槛：高压直流安全、电弧保护、PSU兼容性、客户现场验证。

## 证据边界
- no_quantified_data：缺少可引用TAM、ROI和客户POC量化数据。
- source_required：若进入L3，需要客户访谈、供应链报价和测试数据。

## 10. 最终建议
建议L2验证，不建议立即L3。`;

const comparisonReport = `<think>
比较题不应直接输出投资等级。
</think>

# 《电力UPS与工业UPS市场情报与立项决策简报 V2.2》

## 1. 决策结论摘要
- 最终建议：建议L3推进
- 投入等级：L3
- 一句话结论：两类UPS都值得加大投入

## 5. 技术与产品趋势
- 主流技术路径：双转换纯在线拓扑。

## 10. 最终建议
建议优先投入L3。`;

const relationshipReport = `<think>
关系题不应被强行立项化。
</think>

# 《SST/HVDC市场情报与立项决策简报 V2.2》

## 1. 决策结论摘要
- 最终建议：建议L3预研
- 投入等级：L3-L4
- 一句话结论：SST和HVDC都应同步立项

## 5. 技术与产品趋势
- 主流技术路径：中压交流经过SST转成800V直流。

## 10. 最终建议
建议直接按L3推进。`;

const fictitiousReport = `<think>
虚构对象不应进入投资模板。
</think>

# 《量子蒸汽UPS市场情报与立项决策简报 V2.2》

## 1. 决策结论摘要
- 最终建议：建议L3进入
- 投入等级：L3-L4
- 一句话结论：量子蒸汽UPS具备战略机会

## 5. 技术与产品趋势
- 主流技术路径：UPS、HVDC、SST。

## 10. 最终建议
建议立即立项。`;

const localFallback = (reason) => ({
  provider: "local",
  providerStatus: "fallback",
  fallbackUsed: true,
  warnings: [`unexpected local fallback: ${reason}`],
});

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const buildParamsForQuestion = (question) => {
  const analysis = analyzeAskQuestion(question, {});
  return {
    question,
    filters: {},
    requestPayload: {
      ...buildDifyRequestPayload({
        question,
        filters: {},
        insightContext: analysis.rankedContext?.insightContext,
        analysisState: analysis,
      }),
      analysisState: analysis,
    },
    localFallback,
  };
};

const baseParams = buildParamsForQuestion("中国云服务商AI训练场景下，800VDC是否值得L3立项？");

const runNormalizer = (implementation, markdown) =>
  implementation.normalize({
    ...baseParams,
    rawDifyResponse: {
      answer: markdown,
    },
  });

const runNormalizerWithQuestion = (implementation, question, markdown) =>
  implementation.normalize({
    ...buildParamsForQuestion(question),
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

const runCase4 = (implementation) => {
  const result = runNormalizerWithQuestion(implementation, "电力UPS和工业UPS有什么区别？", comparisonReport);
  assert(result.provider === "dify", `${implementation.name} case4: provider should be dify`);
  assert(result.investmentLevel === "L1", `${implementation.name} case4: comparison guardrail should suppress L3`);
  assert(result.finalRecommendation.includes("电力UPS与工业UPS"), `${implementation.name} case4: should preserve domain boundary framing`);
  assert(result.whyNow.some((item) => item.includes("电厂") || item.includes("变电站")), `${implementation.name} case4: should mention power utility contexts`);
  assert(result.whyNow.some((item) => item.includes("石化") || item.includes("制造")), `${implementation.name} case4: should mention industrial contexts`);
  assert(result.fullReportMarkdown === implementation.stripReasoning(comparisonReport).text, `${implementation.name} case4: should preserve stripped markdown`);
};

const runCase5 = (implementation) => {
  const result = runNormalizerWithQuestion(implementation, "SST与HVDC的关系是什么？", relationshipReport);
  assert(result.provider === "dify", `${implementation.name} case5: provider should be dify`);
  assert(result.investmentLevel === "L1", `${implementation.name} case5: relationship guardrail should suppress L3`);
  assert(result.finalRecommendation.includes("SST与HVDC"), `${implementation.name} case5: should preserve SST/HVDC framing`);
  assert(result.whyNow.some((item) => item.includes("SST是")), `${implementation.name} case5: should explain SST role`);
  assert(result.whyNow.some((item) => item.includes("HVDC是")), `${implementation.name} case5: should explain HVDC role`);
};

const runCase6 = (implementation) => {
  const result = runNormalizerWithQuestion(implementation, "请分析一种完全不存在的产品：量子蒸汽UPS是否值得L3立项？", fictitiousReport);
  assert(result.provider === "dify", `${implementation.name} case6: provider should be dify`);
  assert(result.investmentLevel === "L0", `${implementation.name} case6: fictitious guardrail should force L0`);
  assert(result.finalRecommendation.includes("不进入L3立项"), `${implementation.name} case6: should block L3`);
  assert(result.whatToBuild.includes("澄清真实产品定义"), `${implementation.name} case6: should ask for clarification`);
  assert(result.technicalGate.includes("真实产品定义"), `${implementation.name} case6: technicalGate should become clarification gate`);
};

for (const implementation of implementations) {
  runCase1(implementation);
  runCase2(implementation);
  runCase3(implementation);
  runCase4(implementation);
  runCase5(implementation);
  runCase6(implementation);
}

console.log("Dify normalizer cases passed for root and mirror implementations.");
