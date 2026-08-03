import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalysisContext } from "../buildAnalysisContext.js";
import { classifyMvpCapability } from "../capabilityPolicy.js";

const cases = [
  { id: "Q1", expected: "FULL_REPORT", questions: ["Kstar是否需要花资源开发全新模块化UPS？", "Kstar该不该立项模块化UPS？", "中国市场下Kstar值得开发全新模块化UPS吗？"] },
  { id: "Q2", expected: "FULL_REPORT", questions: ["800VDC在AI数据中心供电架构中的机会和风险是什么？", "AI数据中心800VDC有哪些机会与风险？", "北美AI数据中心采用800VDC的技术路线风险是什么？"] },
  { id: "Q3", expected: "CLARIFICATION_REQUIRED", questions: ["从投资者角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？", "投资者怎么比较BBU、液冷和GaN/SiC？", "未来3年投资BBU、液冷、GaN/SiC如何排序？"] },
  { id: "Q4", expected: "LIMITED_ANALYSIS", questions: ["Kstar是否需要花资源开发全新一代工业UPS？", "Kstar该不该投入工业UPS？", "欧洲市场下Kstar工业UPS是否值得立项？"] },
  { id: "Q5", expected: "CLARIFICATION_REQUIRED", questions: ["钠电UPS是否值得投入？", "钠离子UPS值得做吗？", "面向云服务商，钠电UPS是否应该立项？"] },
  { id: "Q6", expected: "LIMITED_ANALYSIS", questions: ["请分析Vertiv与华为在AI数据中心电源和液冷方向的竞争差异。", "Vertiv和华为的AI数据中心电源液冷竞争有何不同？", "北美市场下Vertiv与华为AI电源和液冷能力怎么比？"] },
  { id: "Q7", expected: "LIMITED_ANALYSIS", questions: ["中国厂商在MW级UPS与液冷CDU领域应该如何做产品规划？", "中国企业如何规划MW级UPS和液冷CDU产品？", "未来3年中国厂商MW级UPS与液冷CDU路线图怎么做？"] },
  { id: "Q8", expected: "CLARIFICATION_REQUIRED", questions: ["Gaming UPS是否值得做？", "游戏UPS值得立项吗？", "北美Gaming UPS产品有没有投入价值？"] },
  { id: "Q9", expected: "LIMITED_ANALYSIS", questions: ["未来3年数据中心电力电子最值得投入的赛道有哪些？", "数据中心电力电子未来三年哪些赛道优先？", "欧洲未来3年数据中心供电赛道如何排优先级？"] },
];

for (const item of cases) {
  test(`${item.id} standard, paraphrase and context-change capability boundary is honest`, () => {
    const outcomes = item.questions.map((question, index) => {
      const context = buildAnalysisContext({
        question,
        pageContext: { normalizedFilters: { region: index === 2 ? "欧洲" : "全球", track: "UPS", application: "全部", customer: "全部", time: "2026" } },
      });
      assert.ok(context.original_question);
      return classifyMvpCapability(context);
    });
    assert.deepEqual(outcomes, [item.expected, item.expected, item.expected]);
  });
}
