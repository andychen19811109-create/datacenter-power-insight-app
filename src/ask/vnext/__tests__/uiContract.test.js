import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("App routes the only Ask navigation entry to vNext and removes M1 Demo navigation", async () => {
  const app = await read("../../../App.jsx");
  const nav = app.slice(app.indexOf("const navItems"), app.indexOf("const render"));
  const render = app.slice(app.indexOf("const render"), app.indexOf("  return (\n    <div className=\"app-container\">"));
  assert.equal((nav.match(/label: "Ask PowerInsight"/g) || []).length, 1);
  assert.equal(nav.includes("M1 Demo"), false);
  assert.match(render, /<AskPowerInsightExperience/);
  assert.equal(render.includes("<M1ProfessionalDemo"), false);
});

test("input UI exposes one analyze action, context, scope and recommended questions", async () => {
  const source = await read("../AskPowerInsightExperience.jsx");
  assert.equal((source.match(/className="btn btn-primary vnext-submit"/g) || []).length, 1);
  assert.match(source, /AskContextPanel/);
  assert.match(source, /开发验证环境｜当前结果来自受控测试夹具，不代表Live分析/);
  assert.match(source, /推荐问题/);
  assert.match(source, /支持范围/);
  assert.equal(source.includes("生成新管线预览"), false);
  assert.equal(source.includes("M1ConfirmedInputPanel"), false);
  assert.equal(source.includes("RELEASED"), false);
  assert.equal(source.includes("O1—O7"), false);
});

test("static protection: Ask route uses the direct section-first R2 renderer", async () => {
  const app = await read("../../../App.jsx");
  const experience = await read("../AskPowerInsightExperience.jsx");
  const report = await read("../R2FinalReport.jsx");
  assert.match(app, /activeTab !== "ask"/);
  assert.match(experience, /import R2FinalReport/);
  assert.match(experience, /<R2FinalReport/);
  assert.match(experience, /pageContextChanged/);
  assert.match(report, /report\.remaining_sections\.map/);
  assert.match(report, /MarkdownBlocks/);
  assert.match(report, /<table>/);
  assert.equal(report.includes("DecisionBlock"), false);
  assert.equal(report.includes("推荐动作"), false);
});

test("clarification is chip-based, capped at three and allows defaults", async () => {
  const source = await read("../ClarificationPanel.jsx");
  assert.match(source, /slice\(0, 3\)/);
  assert.match(source, /vnext-chip/);
  assert.match(source, /采用默认假设/);
  assert.equal(source.includes("UNKNOWN"), false);
  assert.equal(source.includes("CONFLICTING"), false);
});

test("report and degraded UI expose required user-facing evidence and recovery controls", async () => {
  const report = await read("../AskStandardReport.jsx");
  const degraded = await read("../DegradedAnalysisPanel.jsx");
  for (const label of ["一句话结论", "推荐决策", "关键假设", "证据边界", "分析范围", "核心分析", "主要风险", "不确定性", "推荐行动", "验证条件", "退出条件", "当前不能下的结论", "相关模块与证据"]) {
    assert.match(report, new RegExp(label));
  }
  assert.match(degraded, /受限分析模式/);
  assert.match(degraded, /在线专业分析当前不可用/);
  assert.match(degraded, /重试/);
  assert.match(degraded, /修改问题/);
});
