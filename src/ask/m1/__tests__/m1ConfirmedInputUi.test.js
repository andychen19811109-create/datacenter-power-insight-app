import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { createM1InputDraft } from "../contracts/m1ConfirmedInput.js";
import { buildM1FallbackContext } from "../m1ConfirmedInputFlow.js";

const question = "为 CUSTOMER_X 在 REGION_ALPHA 比较 500kW UPS 与 800VDC。";

const createDraft = (sourceMode) => createM1InputDraft({
  question,
  sourceMode,
  reasonCode: sourceMode === "fallback" ? "provider_timeout" : null,
  inputContext: {
    ...buildM1FallbackContext(question),
    context_id: `ui_${sourceMode}`,
    decision_intent: "ARCHITECTURE_CHOICE",
    architecture_alternatives: ["800VDC"],
    application_scenario: "AI 数据中心",
    target_timing: "unknown",
    contradictions: [{
      field: "power_or_system_scope",
      values: ["500kW", "1MW"],
      explanation: "规模冲突",
    }],
    field_provenance: {
      decision_intent: { status: "INFERRED" },
      primary_product_object: { status: "INFERRED" },
      architecture_alternatives: { status: "EXPLICIT" },
      application_scenario: { status: "INFERRED" },
      target_customer: { status: "EXPLICIT" },
      region: { status: "EXPLICIT" },
      power_or_system_scope: { status: "CONFLICTING" },
      investment_or_product_stage: { status: "UNKNOWN" },
      target_timing: { status: "UNKNOWN" },
      critical_constraints: { status: "UNKNOWN" },
    },
  },
});

let vite;
let M1ConfirmedInputPanel;

test.before(async () => {
  vite = await createServer({
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });
  ({ M1ConfirmedInputPanel } = await vite.ssrLoadModule("/src/ask/m1/M1ConfirmedInputPanel.jsx"));
});

test.after(async () => {
  await vite.close();
});

test("normal confirmation screen renders six editable groups, statuses, and primary actions", () => {
  const markup = renderToStaticMarkup(React.createElement(M1ConfirmedInputPanel, {
    question,
    initialDraft: createDraft("provider"),
  }));
  [
    "1. 决策类型",
    "2. 产品 / 架构",
    "3. 应用场景",
    "4. 客户 / 区域",
    "5. 功率 / 系统边界",
    "6. 约束 / 未知项",
    "INFERRED · 系统推断",
    "UNKNOWN · 待确认",
    "CONFLICTING · 信息冲突",
    "确认并开始分析",
    "修改识别结果",
    question,
  ].forEach((copy) => assert.match(markup, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))));
  assert.doesNotMatch(markup, /Decision Resolution 已启动/);
});

test("Provider failure screen is visibly marked as a lightweight fallback", () => {
  const markup = renderToStaticMarkup(React.createElement(M1ConfirmedInputPanel, {
    question,
    initialDraft: createDraft("fallback"),
  }));
  assert.match(markup, /轻量回退草稿/);
  assert.match(markup, /Provider 超时或错误/);
  assert.match(markup, /仅提取决策类型、产品\/架构及已知规模、区域、客户上下文/);
  assert.match(markup, /原始问题（本地保留）/);
});
