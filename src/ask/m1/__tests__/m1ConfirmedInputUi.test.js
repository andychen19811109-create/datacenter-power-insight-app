import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

import { createM1InputDraft } from "../contracts/m1ConfirmedInput.js";
import {
  buildM1FallbackContext,
  createM1InputResolutionFromUnderstandingResult,
} from "../m1ConfirmedInputFlow.js";
import {
  M1_B1_S3_INVALID_DRAFT,
  M1_B1_S3_QUESTION,
} from "../fixtures/m1InputResolutionFixtures.js";

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
    power_or_system_scope: "conflicting",
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
    "自动提取草稿",
    question,
  ].forEach((copy) => assert.match(markup, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))));
  assert.doesNotMatch(markup, /Decision Resolution 已启动/);
});

test("Provider failure uses the existing screen as a one-confirmation fallback", () => {
  const markup = renderToStaticMarkup(React.createElement(M1ConfirmedInputPanel, {
    question,
    initialDraft: createDraft("fallback"),
  }));
  assert.match(markup, /确认兜底/);
  assert.match(
    markup,
    /自动提取未通过结构校验，请确认或补充以下信息。原始问题已保留，无需重新输入。/,
  );
  assert.match(markup, /M1_INPUT_PROVIDER_TIMEOUT/);
  assert.match(markup, /原始问题（本地保留）/);
  assert.match(markup, /确认并开始分析/);
});

test("S3 invalid model draft is discarded before the same confirmation screen", () => {
  const resolution = createM1InputResolutionFromUnderstandingResult({
    question: M1_B1_S3_QUESTION,
    result: {
      mode: "m1_input_draft",
      inputDraft: JSON.parse(JSON.stringify(M1_B1_S3_INVALID_DRAFT)),
    },
  });
  const markup = renderToStaticMarkup(React.createElement(M1ConfirmedInputPanel, {
    question: M1_B1_S3_QUESTION,
    initialResolution: resolution,
  }));
  assert.match(markup, /确认兜底/);
  assert.match(markup, /M1_INPUT_DRAFT_CONTRACT_INVALID/);
  assert.match(markup, new RegExp(M1_B1_S3_QUESTION));
  assert.doesNotMatch(markup, /模型错误地将比较对象标为字段冲突/);
  assert.match(markup, /确认并开始分析/);
});
