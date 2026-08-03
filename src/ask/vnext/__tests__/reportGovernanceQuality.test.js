import test from "node:test";
import assert from "node:assert/strict";

import { buildAnalysisContext } from "../buildAnalysisContext.js";
import { normalizeDifyAnalysisDraft } from "../difyDraftNormalizer.js";
import { runDcpiAnalysisAdapter } from "../analysisAdapter.js";
import { composeAskStandardReport } from "../reportComposer.js";
import { applyPublicationGuardrail } from "../publicationGuardrail.js";
import { createTestOnlyDraft } from "../fixtures/difyFixtures.js";

const normalizedKey = (value) => String(value || "")
  .replace(/[，。；、：:（）()\s]/g, "")
  .toLocaleLowerCase();

const countText = (value, fragment) =>
  String(value || "").split(fragment).length - 1;

const reportFromMarkdown = ({ question, answer, requestId }) => {
  const analysisContext = buildAnalysisContext({ question });

  const draft = normalizeDifyAnalysisDraft({
    rawResponse: { answer },
    requestId,
    question,
    analysisContext,
  });

  const adapterResult = runDcpiAnalysisAdapter({
    draft,
    analysisContext,
  });

  const report = composeAskStandardReport({
    adapterResult,
    analysisContext,
  });

  return {
    analysisContext,
    draft,
    adapterResult,
    report,
  };
};

test("semantic report roles survive Markdown heading order and public text is Markdown-free", () => {
  const question =
    "800VDC在AI数据中心供电架构中的机会和风险是什么？";

  const answer = `
# 在线分析

## 建议验证门槛
- **Gate**：具体效率、负载区间和开发周期应由企业在项目立项时确认。

## 决策结论
- **定方向**：800VDC可作为中期结构性机会，先开展小规模验证。

## 推荐建议
- **投入等级**：先做小规模验证，再根据客户、标准和生态验证结果决定是否进入产品化阶段。

## 关键驱动与机会
- 需要按设施级、母线或机架级和服务器侧分别核实系统价值。

## 替代路线
- 传统AC UPS路径。
- 现有HVDC路径。
- BBU或机架级备电路径。

## 技术风险
- 电弧、绝缘、开断、故障隔离和维护边界需要验证。

## Validation Gate
- 客户、接口、标准、安全和维护边界通过验证。

## 退出条件
- 关键客户、接口或安全验证不成立时停止投入。
`;

  const { report } = reportFromMarkdown({
    question,
    answer,
    requestId: "QUALITY_ROLE_ORDER",
  });

  const visible = JSON.stringify(report);

  assert.doesNotMatch(
    visible,
    /\*\*|```|(?:^|\n)#{1,6}\s/,
    "用户报告不得泄漏Markdown标记"
  );

  assert.doesNotMatch(
    report.one_line_conclusion,
    /建议验证门槛|具体效率、负载区间和开发周期/,
    "验证Gate不得被误选为一句话结论"
  );

  assert.match(
    report.one_line_conclusion,
    /800VDC|结构性机会/,
    "一句话结论应回答技术路线方向"
  );

  assert.match(
    report.recommended_decision,
    /小规模验证|产品化阶段/,
    "推荐决策应给出下一步投入动作"
  );

  assert.notEqual(
    normalizedKey(report.one_line_conclusion),
    normalizedKey(report.recommended_decision),
    "一句话结论与推荐决策不得完全相同"
  );
});

test("investment comparison falls back to structured object rows without inventing an overall ranking", () => {
  const analysisContext = buildAnalysisContext({
    question:
      "从产业投资角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？",
  });

  const draft = createTestOnlyDraft(
    analysisContext,
    "QUALITY_INVESTMENT_FALLBACK",
    {
      scenario_conclusions: [],
      key_facts: [],
    }
  );

  const adapterResult = runDcpiAnalysisAdapter({
    draft,
    analysisContext,
  });

  const report = composeAskStandardReport({
    adapterResult,
    analysisContext,
  });

  const comparison = JSON.stringify(report.scenario_comparison);

  assert.equal(report.status, "INSUFFICIENT_EVIDENCE");

  assert.notEqual(
    normalizedKey(report.one_line_conclusion),
    normalizedKey(report.recommended_decision),
    "证据不足时，结论与补证行动仍应承担不同语义角色"
  );

  assert.ok(
    report.scenario_comparison.length >=
      analysisContext.product_or_technology.length,
    "缺少Dify情景段落时，应形成按对象展开的结构化比较回退"
  );

  for (const object of analysisContext.product_or_technology) {
    assert.match(
      comparison,
      new RegExp(object.replace("/", "\\/")),
      `结构化比较应覆盖对象：${object}`
    );
  }

  assert.match(
    comparison,
    /不形成整体排序/,
    "结构化回退必须明确说明不形成整体排序"
  );

  assert.doesNotMatch(
    comparison,
    /BBU\s*[>＞]\s*液冷|液冷\s*[>＞]\s*GaN\/SiC|(?:综合排序|整体排序)\s*[：:]|最优|优先投入/,
    "证据不足时不得生成正向总体排序或优先级结论"
  );
});

test("qualitative evidence boundary is centralized once instead of repeated in every field", () => {
  const analysisContext = buildAnalysisContext({
    question:
      "800VDC在AI数据中心供电架构中的机会和风险是什么？",
  });

  const draft = createTestOnlyDraft(
    analysisContext,
    "QUALITY_CENTRAL_BOUNDARY",
    {
      key_facts: [],
      candidate_conclusions: [
        "800VDC可作为值得验证的中期结构性机会。",
        "建议先开展小规模架构和客户验证。",
      ],
      key_drivers: [
        "较高配电电压可能降低同等功率下的配电电流。",
        "系统价值取决于转换、保护、维护和末端接口边界。",
      ],
      validation_gates: [
        "客户、接口、标准、安全和维护边界通过验证。",
      ],
    }
  );

  const adapterResult = runDcpiAnalysisAdapter({
    draft,
    analysisContext,
  });

  const report = composeAskStandardReport({
    adapterResult,
    analysisContext,
  });

  const visible = JSON.stringify(report);

  assert.equal(
    countText(visible, "基于现有分析条件，可以推断"),
    0,
    "不得在每一条分析内容前重复注入长前缀"
  );

  assert.equal(
    countText(
      visible,
      "这一判断仍需通过可追溯的市场、标准、项目或供应链证据进一步确认"
    ),
    0,
    "不得在每一条分析内容后重复注入长免责声明"
  );

  assert.equal(
    countText(
      visible,
      "本报告中的条件性分析判断尚未绑定足够的可追溯证据"
    ),
    1,
    "证据边界应在整份报告中集中呈现一次"
  );

  assert.equal(report.evidence_summary.length, 0);

  assert.match(
    JSON.stringify([
      ...report.information_to_add,
      ...report.cannot_conclude,
    ]),
    /可追溯来源|可追溯证据/,
    "没有真实来源时必须明确说明需要补充的证据"
  );
});


test("one-line conclusion rejects quantitative execution plans", () => {
  const analysisContext = buildAnalysisContext({
    question:
      "800VDC在2028年AI数据中心供电架构中的机会和风险是什么？",
  });

  const draft = createTestOnlyDraft(
    analysisContext,
    "QUALITY_ROLE_EXECUTION_PLAN",
    {
      candidate_conclusions: [
        "2026H2前完成30kW/180kW模块样机，并完成效率、满载和故障验证。",
        "判断：800VDC可有条件进入小规模验证，但当前不应直接产品化。",
      ],
    }
  );

  const adapterResult = runDcpiAnalysisAdapter({
    draft,
    analysisContext,
  });

  const report = composeAskStandardReport({
    adapterResult,
    analysisContext,
  });

  assert.match(
    report.one_line_conclusion,
    /800VDC/,
    "一句话结论必须保留被分析的技术路线对象"
  );

  assert.match(
    report.one_line_conclusion,
    /有条件进入|不应直接产品化/,
    "一句话结论必须表达路线方向，而不是执行计划"
  );

  assert.doesNotMatch(
    report.one_line_conclusion,
    /2026H2|30kW|180kW|建议验证门槛|具体效率、负载区间/,
    "样机、时间和量化验证计划不得成为一句话结论"
  );
});

test("numeric sanitization preserves conclusion and decision field roles", () => {
  const analysisContext = buildAnalysisContext({
    question:
      "800VDC在2028年AI数据中心供电架构中的机会和风险是什么？",
  });

  const draft = createTestOnlyDraft(
    analysisContext,
    "QUALITY_FIELD_AWARE_NUMERIC_REWRITE"
  );

  const adapterResult = runDcpiAnalysisAdapter({
    draft,
    analysisContext,
  });

  const baseReport = composeAskStandardReport({
    adapterResult,
    analysisContext,
  });

  const report = applyPublicationGuardrail({
    report: {
      ...baseReport,
      one_line_conclusion:
        "判断：800VDC有条件进入验证，但2026H2前需完成30kW/180kW样机和98%效率目标。",
      recommended_decision:
        "建议2026H2前完成30kW样机和98%效率验证后再决定是否产品化。",
    },
    analysisContext,
  }).report;

  assert.doesNotMatch(
    report.one_line_conclusion,
    /建议验证门槛|具体效率、负载区间和开发周期|不作为市场事实/,
    "一句话结论不得被数值治理改写为验证Gate"
  );

  assert.match(
    report.one_line_conclusion,
    /定量依据不足|条件化|产品化|规模化/,
    "无来源数字被移除后，仍应保留结论语义"
  );

  assert.doesNotMatch(
    report.recommended_decision,
    /建议验证门槛|不作为市场事实/,
    "推荐决策不得被改写为结论无关的Gate标签"
  );

  assert.match(
    report.recommended_decision,
    /先完成|验证|再决定/,
    "无来源数字被移除后，推荐决策仍应保持行动语义"
  );

  assert.notEqual(
    normalizedKey(report.one_line_conclusion),
    normalizedKey(report.recommended_decision),
    "数值治理后，结论与行动仍需承担不同语义角色"
  );
});

test("markdown table rows never enter public list fields", () => {
  const analysisContext = buildAnalysisContext({
    question:
      "从产业投资角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？",
  });

  const draft = createTestOnlyDraft(
    analysisContext,
    "QUALITY_TABLE_ARTIFACT",
    {
      validation_gates: [
        "| 阶段 | 液冷 | BBU | GaN/SiC |",
        "|---|---|---|---|",
        "| 0-6个月 | 完成客户POC | 完成切换测试 | 完成器件测试 |",
        "--",
        "确认投资主体、时间窗口、客户采用和退出路径。",
      ],
    }
  );

  const adapterResult = runDcpiAnalysisAdapter({
    draft,
    analysisContext,
  });

  const report = composeAskStandardReport({
    adapterResult,
    analysisContext,
  });

  const visible = JSON.stringify(report.validation_gates);

  assert.doesNotMatch(
    visible,
    /\|/,
    "Markdown表格标题、分隔行和数据行不得进入公开列表"
  );

  assert.doesNotMatch(
    visible,
    /"--"/,
    "独立Markdown分隔符不得进入公开列表"
  );

  assert.match(
    visible,
    /确认投资主体、时间窗口、客户采用和退出路径/,
    "清理表格碎片时必须保留有效的普通验证条件"
  );
});
