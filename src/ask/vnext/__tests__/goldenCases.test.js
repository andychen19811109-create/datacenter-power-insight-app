import test from "node:test";
import assert from "node:assert/strict";
import { buildAnalysisContext } from "../buildAnalysisContext.js";
import { runDcpiAnalysisAdapter } from "../analysisAdapter.js";
import { composeAskStandardReport } from "../reportComposer.js";
import { createTestOnlyDraft } from "../fixtures/difyFixtures.js";

const goldenCases = [
  {
    id: "GC-01",
    questions: [
      "Kstar是否需要花资源开发全新模块化UPS？",
      "Kstar该不该立项全新的模块化UPS？",
      "请评估Kstar投入新一代模块化UPS是否合理。",
      "Kstar开发全新模块化UPS产品的机会、风险和Gate是什么？",
      "从产品公司角度，Kstar是否值得做新的模块化UPS？",
    ],
    expectedTask: "PRODUCT_INITIATIVE",
    expectedObjects: ["模块化UPS"],
    expectedStatus: "CONDITIONAL",
  },
  {
    id: "GC-02",
    questions: [
      "800VDC在AI数据中心供电架构中的机会和风险是什么？",
      "请分析AI数据中心采用800VDC的技术机会、限制与风险。",
      "800VDC用于AI数据中心供电有哪些价值和技术风险？",
      "AI数据中心800VDC路线是否成熟，替代路线和验证路径是什么？",
      "从设施级到GPU侧，800VDC供电架构的机会和风险如何？",
    ],
    expectedTask: "TECHNOLOGY_ROUTE",
    expectedObjects: ["800VDC"],
    expectedStatus: "CONDITIONAL",
  },
  {
    id: "GC-03",
    questions: [
      "从产业投资角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？",
      "产业投资者应如何比较BBU、液冷和GaN/SiC的风险收益？",
      "请按近期和长期评估BBU、液冷、GaN/SiC的产业投资优先级。",
      "如果做战略产业投资，BBU、液冷与GaN/SiC怎么情景化排序？",
      "BBU、液冷、GaN/SiC对产业投资者各有什么风险收益边界？",
    ],
    expectedTask: "INVESTMENT_COMPARISON",
    expectedObjects: ["BBU", "液冷", "GaN/SiC"],
    expectedStatus: "INSUFFICIENT_EVIDENCE",
  },
];

for (const golden of goldenCases) {
  test(`${golden.id} five expressions preserve objects, task and report direction`, () => {
    const directions = [];
    for (const [index, question] of golden.questions.entries()) {
      const context = buildAnalysisContext({ question, pageContext: { normalizedFilters: { region: "全球", track: "UPS" } } });
      assert.equal(context.task_type, golden.expectedTask, `${question}: task`);
      assert.deepEqual(context.product_or_technology, golden.expectedObjects, `${question}: objects`);
      const draft = createTestOnlyDraft(context, `TEST_ONLY_${golden.id}_${index}`);
      const adapter = runDcpiAnalysisAdapter({ draft, analysisContext: context });
      assert.equal(adapter.status, golden.expectedStatus, `${question}: adapter`);
      const report = composeAskStandardReport({ adapterResult: adapter, analysisContext: context });
      assert.equal(report.status, golden.expectedStatus);
      assert.ok(report.core_analysis_sections.length >= 2);
      if (golden.id === "GC-02") assert.match(JSON.stringify(report.core_analysis_sections), /设施级|母线\/机架级|GPU或服务器侧/);
      assert.doesNotMatch(JSON.stringify(report), /TEST_ONLY|TEST_ONLY_SOURCE|受控测试/);
      directions.push(report.one_line_conclusion);
    }
    assert.equal(new Set(directions).size, 1, "fixture conclusion direction must not reverse across paraphrases");
  });
}
