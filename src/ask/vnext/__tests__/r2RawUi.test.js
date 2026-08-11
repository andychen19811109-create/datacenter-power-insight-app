import test from "node:test";
import assert from "node:assert/strict";
import { readFile, rm, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { buildAnalysisContext } from "../buildAnalysisContext.js";
import { createR2FinalReport } from "../r2FinalReport.js";

const fixtureRoot = new URL("../fixtures/r2-1.3/", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("manifest.json", fixtureRoot), "utf8"));
const raw = (id) => readFile(new URL(manifest.fixtures[id].file, fixtureRoot), "utf8");

const renderFixture = async (Component, id, options = {}) => {
  const context = buildAnalysisContext({
    question: manifest.fixtures[id].question,
    pageContext: options.pageContext,
  });
  const report = createR2FinalReport({ answer: await raw(id), analysisContext: context });
  return {
    context,
    report,
    html: renderToStaticMarkup(React.createElement(Component, {
      report,
      analysisContext: context,
      pageContextChanged: Boolean(options.pageContextChanged),
      onReanalyze: () => {},
      onNavigate: () => {},
    })),
  };
};

test("accepted RAW renders through the actual React report UI without semantic reconstruction", async () => {
  const cacheDir = await mkdtemp(join(tmpdir(), "dcpi-r2-ui-"));
  const server = await createServer({
    appType: "custom",
    cacheDir,
    logLevel: "silent",
    server: { middlewareMode: true },
  });
  try {
    const { default: R2FinalReport } = await server.ssrLoadModule("/src/ask/vnext/R2FinalReport.jsx");

    const q1 = await renderFixture(R2FinalReport, "Q1", {
      pageContext: { normalizedFilters: { region: "中国" } },
    });
    assert.equal((q1.html.match(/有限分析/g) || []).length, 1, "status appears only in the badge");
    assert.ok(q1.html.indexOf("有限分析") < q1.html.indexOf("核心结论"));
    assert.ok(q1.html.indexOf("核心结论") < q1.html.indexOf("本次分析条件"));
    assert.match(q1.html, /当前不应直接启动“全新模块化UPS”大规模立项/);
    assert.doesNotMatch(q1.html, /当前证据不足以形成明确行动建议/);
    assert.ok(q1.html.indexOf("核心结论") < q1.html.indexOf("市场机会与是否需要产品干预"));
    assert.match(q1.html, /验证节点、风险与退出条件/);
    assert.match(q1.html, /Gate 1：获得代表互联网\/云数据中心客户的正式POC/);
    assert.match(q1.html, /已知竞争对手<\/span><strong>未指定<\/strong><small>未指定/);
    assert.match(q1.html, /目标区域<\/span><strong>中国<\/strong><small>来自页面/);

    const q5 = await renderFixture(R2FinalReport, "Q5");
    assert.match(q5.html, /AI数据中心电源与液冷基础设施/);
    assert.match(q5.html, /Vertiv/);
    assert.match(q5.html, /华为/);
    assert.match(q5.html, /厂商公开宣传，尚未获得第三方独立验证/);
    assert.match(q5.html, /<table>/);

    const q6 = await renderFixture(R2FinalReport, "Q6");
    assert.match(q6.html, /技术路线、机会与风险/);
    assert.match(q6.html, /验证Gate、主要风险与退出条件/);
    assert.match(q6.html, /<table>/);
    assert.match(q6.html, /<ol>/);

    const snapshot = await renderFixture(R2FinalReport, "Q6", {
      pageContext: { normalizedFilters: { role: "高管", region: "中国", customer: "全部", application: "全部", track: "全部", time: "2026" } },
      pageContextChanged: true,
    });
    assert.match(snapshot.html, /页面条件已变化/);
    assert.match(snapshot.html, /本报告仍基于原分析条件/);
    assert.match(snapshot.html, /按当前条件重新分析/);
    assert.match(snapshot.html, /目标区域/);
    assert.match(snapshot.html, /中国/);
    for (const label of ["相关模块", "市场", "产品", "技术", "公司与情报"]) assert.match(snapshot.html, new RegExp(label));
  } finally {
    await server.close();
    await rm(cacheDir, { recursive: true, force: true });
  }
});
