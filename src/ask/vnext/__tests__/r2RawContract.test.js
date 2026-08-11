import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { buildAnalysisContext } from "../buildAnalysisContext.js";
import { createR2FinalReport } from "../r2FinalReport.js";
import { R2_CORE_IDENTITY } from "../../../../api/_r2-core-identity.js";

const fixtureRoot = new URL("../fixtures/r2-1.3/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.json", fixtureRoot), "utf8"));
const readRaw = (id) => readFile(new URL(manifest.fixtures[id].file, fixtureRoot), "utf8");
const digest = (value) => createHash("sha256").update(value).digest("hex");
const reportFor = async (id) => {
  const raw = await readRaw(id);
  const context = buildAnalysisContext({ question: manifest.fixtures[id].question });
  return { raw, context, report: createR2FinalReport({ answer: raw, analysisContext: context }) };
};

test("accepted RAW fixture bytes match the provenance manifest", async () => {
  for (const id of ["Q1", "Q5", "Q6"]) {
    const raw = await readRaw(id);
    assert.equal(digest(raw), manifest.fixtures[id].sha256, id);
  }
  assert.equal(manifest.core_identity, R2_CORE_IDENTITY.name);
  assert.equal(R2_CORE_IDENTITY.name, `DCPI R2 Core ${R2_CORE_IDENTITY.version} MVP ${R2_CORE_IDENTITY.lifecycle}`);
  assert.equal(manifest.source_bundle.sha256, "dbc3baeb26c7b6d6a9748854de98a5341a0d4f6f6992590048b3e09affc8b3f2");
});

test("Q1 status is badge-only, explicit core conclusion wins and Gate/Risk/Exit stays one section", async () => {
  const { report } = await reportFor("Q1");
  assert.equal(report.status, "有限分析");
  assert.equal(report.core_conclusion.title, "核心结论");
  assert.match(report.summary.join("\n"), /当前不应直接启动“全新模块化UPS”大规模立项/);
  assert.doesNotMatch(report.summary.join("\n"), /分析状态/);
  assert.equal(Object.hasOwn(report, "decision_summary"), false);
  assert.doesNotMatch(JSON.stringify(report), /当前证据不足以形成明确行动建议/);
  const gate = report.sections.find((section) => section.title === "验证节点、风险与退出条件");
  assert.ok(gate);
  assert.match(gate.raw_markdown, /Gate 1：/);
  assert.match(gate.raw_markdown, /主要风险：/);
  assert.match(gate.raw_markdown, /退出条件：/);
  assert.equal(report.sections.some((section) => /^\d+[.、]|^Gate \d|^G\d/.test(section.title)), false);
  assert.ok(report.sections.find((section) => section.title === "路径比较与推荐投入").blocks.some((block) => block.type === "table"));
});

test("Q5 preserves power plus cooling, named entities and evidence wording without APP rewrite", async () => {
  const { report } = await reportFor("Q5");
  const visible = JSON.stringify(report.sections);
  assert.equal(report.status, "有限分析");
  assert.match(visible, /AI数据中心电源与液冷基础设施/);
  assert.match(visible, /Vertiv/);
  assert.match(visible, /华为/);
  assert.match(visible, /厂商公开宣传，尚未获得第三方独立验证/);
  assert.match(visible, /缺乏直接证据，目前只能作为行业结构推断与待验证假设/);
  assert.ok(report.sections.find((section) => section.title === "基于现有证据的方向性比较（非对称）").blocks.some((block) => block.type === "table"));
});

test("Q6 keeps table, numbered risks, Gate and exit conditions inside their Markdown sections", async () => {
  const { report } = await reportFor("Q6");
  const route = report.sections.find((section) => section.title === "技术路线、机会与风险");
  const gate = report.sections.find((section) => section.title === "验证Gate、主要风险与退出条件");
  assert.equal(report.status, "有限分析");
  assert.ok(route.blocks.some((block) => block.type === "table"));
  assert.ok(route.blocks.some((block) => block.type === "ordered_list" && block.items.length === 4));
  assert.match(gate.raw_markdown, /G1 技术可行性/);
  assert.match(gate.raw_markdown, /退出条件对应上述主要风险触发点/);
  assert.equal(report.sections.some((section) => /^\d+[.、]|^Gate \d|^G\d/.test(section.title)), false);
});
