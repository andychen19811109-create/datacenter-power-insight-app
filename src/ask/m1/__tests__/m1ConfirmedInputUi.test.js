import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

import {
  handleM1ConfirmedInputSubmission,
  toPublicM1InputUnderstandingResult,
} from "../../../../api/m1-input-understanding.js";
import {
  hashM1ConfirmedInput,
  buildM1DecisionResolutionRequest,
} from "../m1DecisionCore.js";
import { evaluateM1ReleaseIntegration } from "../releaseIntegration/index.js";
import {
  M1_B1_S1_QUESTION,
  M1_B1_S1_VALID_CONTEXT,
  M1_B1_S1_VALID_DRAFT,
  M1_B1_S2_QUESTION,
  M1_B1_S2_VALID_CONTEXT,
  M1_B1_S3_INVALID_CONTEXT,
  M1_B1_S3_QUESTION,
} from "../fixtures/m1InputResolutionFixtures.js";

const REPO_ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SCREENSHOT_DIR = String(process.env.M1_CAPTURE_UI_EVIDENCE_DIR || "").trim();
const clone = (value) => JSON.parse(JSON.stringify(value));

let fixtureMode = "s1";
let forceCoreFailure = false;
let vite;
let chrome;
let cdp;
let appUrl;
let chromeProfile;
let lastNormalConfirmedInput;

const M1_CERTIFIED_RELEASE_QUESTION = (
  "为 CUSTOMER_X 在 REGION_ALPHA 比较 1MW UPS 与 800VDC 在 AI 数据中心受保护负载场景的架构选择，"
  + "当前处于 concept evaluation，投产时间未知，关键约束未知。"
);

const audit = {
  inputResolutionCalls: 0,
  confirmationSubmissions: 0,
  coreCalls: 0,
  releaseCalls: 0,
  providerCalls: 0,
  lastConfirmedInput: null,
  lastRequest: null,
  lastReleaseResult: null,
};

const resetAudit = () => {
  audit.inputResolutionCalls = 0;
  audit.confirmationSubmissions = 0;
  audit.coreCalls = 0;
  audit.releaseCalls = 0;
  audit.providerCalls = 0;
  audit.lastConfirmedInput = null;
  audit.lastRequest = null;
  audit.lastReleaseResult = null;
  forceCoreFailure = false;
};

const readJsonBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
};

const inputResultForMode = () => {
  if (fixtureMode === "certified_fallback") {
    return {
      mode: "m1_input_unavailable",
      reasonCode: "provider_unavailable",
    };
  }
  if (fixtureMode === "s1") {
    return {
      mode: "m1_input_context",
      inputContext: clone(M1_B1_S1_VALID_CONTEXT),
    };
  }
  if (fixtureMode === "s2") {
    return {
      mode: "m1_input_context",
      inputContext: clone(M1_B1_S2_VALID_CONTEXT),
    };
  }
  if (fixtureMode === "s3") {
    return {
      mode: "m1_input_context",
      inputContext: clone(M1_B1_S3_INVALID_CONTEXT),
    };
  }
  if (fixtureMode === "timeout") {
    return {
      mode: "m1_input_unavailable",
      reasonCode: "provider_timeout",
    };
  }
  if (fixtureMode === "missing") {
    const inputDraft = clone(M1_B1_S1_VALID_DRAFT);
    delete inputDraft.groups.customer_region.fields.region;
    return { mode: "m1_input_draft", inputDraft };
  }
  if (fixtureMode === "illegal_status") {
    const inputContext = clone(M1_B1_S1_VALID_CONTEXT);
    inputContext.field_provenance.region.status = "ASSUMED";
    return { mode: "m1_input_context", inputContext };
  }
  if (fixtureMode === "illegal_field") {
    const inputContext = clone(M1_B1_S1_VALID_CONTEXT);
    inputContext.unexpected_provider_field = "must-not-pass";
    return { mode: "m1_input_context", inputContext };
  }
  if (fixtureMode === "invalid_value") {
    const inputContext = clone(M1_B1_S1_VALID_CONTEXT);
    inputContext.region = 42;
    inputContext.field_provenance.region.value = 42;
    return { mode: "m1_input_context", inputContext };
  }
  return {
    mode: "m1_input_unavailable",
    reasonCode: "provider_unavailable",
  };
};

const apiFixturePlugin = () => ({
  name: "m1-production-chain-controlled-api",
  configureServer(server) {
    server.middlewares.use("/api/m1-input-understanding", async (req, res) => {
      if (req.method !== "POST") {
        sendJson(res, 405, { error: "method_not_allowed" });
        return;
      }
      const body = await readJsonBody(req);
      if (Object.hasOwn(body, "action") || Object.hasOwn(body, "confirmedInput")) {
        audit.confirmationSubmissions += 1;
        const result = handleM1ConfirmedInputSubmission(body, {
          decisionCoreEntry: ({ confirmedInput }) => {
            audit.coreCalls += 1;
            audit.lastConfirmedInput = clone(confirmedInput);
            if (forceCoreFailure) {
              throw new Error("sensitive-test-stack-provider-token");
            }
            const request = buildM1DecisionResolutionRequest({ confirmedInput });
            audit.lastRequest = clone(request);
            return request;
          },
          releaseIntegration: (confirmedInput) => {
            audit.releaseCalls += 1;
            const result = evaluateM1ReleaseIntegration(confirmedInput);
            audit.lastReleaseResult = clone(result);
            return result;
          },
        });
        sendJson(res, result.status, result.payload);
        return;
      }

      audit.inputResolutionCalls += 1;
      if (fixtureMode === "json_error") {
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.end("{\"mode\":");
        return;
      }
      sendJson(res, 200, toPublicM1InputUnderstandingResult(inputResultForMode()));
    });
  },
});

const reservePort = async () => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    server.close((error) => error ? reject(error) : resolve(port));
  });
});

class CdpConnection {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(url);
    this.ready = new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result || {});
    });
  }

  async send(method, params = {}) {
    await this.ready;
    const id = this.nextId;
    this.nextId += 1;
    const result = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return result;
  }

  close() {
    this.socket.close();
  }
}

const waitForChromeTarget = async (port) => {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("chrome_debug_target_timeout");
};

const evaluate = async (expression) => {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || "browser_evaluation_failed");
  }
  return result.result?.value;
};

const waitFor = async (expression, timeoutMs = 10000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(`Boolean(${expression})`)) return;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`browser_wait_timeout:${expression}`);
};

const clickButton = async (copy, { twice = false } = {}) => {
  const serialized = JSON.stringify(copy);
  const clicked = await evaluate(`(() => {
    const button = [...document.querySelectorAll("button")]
      .find((item) => item.textContent.includes(${serialized}) && !item.disabled);
    if (!button) return false;
    button.click();
    ${twice ? "button.click();" : ""}
    return true;
  })()`);
  assert.equal(clicked, true, `button not found: ${copy}`);
};

const setTextareaValue = async (selector, value) => {
  const serializedSelector = JSON.stringify(selector);
  const serializedValue = JSON.stringify(value);
  const changed = await evaluate(`(() => {
    const textarea = document.querySelector(${serializedSelector});
    if (!textarea) return false;
    const setter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value"
    ).set;
    setter.call(textarea, ${serializedValue});
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
  assert.equal(changed, true, `textarea not found: ${selector}`);
};

const openScenario = async ({ mode, question }) => {
  fixtureMode = mode;
  resetAudit();
  await cdp.send("Page.navigate", { url: appUrl });
  await waitFor("document.querySelector('.app-container')");
  await clickButton("Ask PowerInsight");
  await waitFor("document.querySelector('textarea:not([id^=\"m1-\"])')");
  await setTextareaValue("textarea:not([id^=\"m1-\"])", question);
  await clickButton("识别并确认输入");
  await waitFor("document.querySelector('.m1-confirmation-screen')");
};

const capture = async (fileName, selector = ".m1-confirmation-screen") => {
  if (!SCREENSHOT_DIR) return;
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await evaluate(`document.querySelector(${JSON.stringify(selector)})
    ?.scrollIntoView({ block: "start" })`);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const result = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  fs.writeFileSync(path.join(SCREENSHOT_DIR, fileName), Buffer.from(result.data, "base64"));
};

const waitForCoreStatus = async (status) => {
  await waitFor(`document.querySelector('[data-m1-core-status="${status}"]')`);
};

const coreStatus = async () => evaluate(
  "document.querySelector('[data-m1-core-status]')?.dataset.m1CoreStatus || null",
);

const waitForReleaseStatus = async (status) => {
  await waitFor(`document.querySelector('[data-m1-release-status="${status}"]')`);
};

test.before(async () => {
  assert.equal(fs.existsSync(CHROME), true, "Google Chrome is required for real App interaction tests");
  vite = await createServer({
    root: REPO_ROOT,
    logLevel: "silent",
    server: {
      host: "127.0.0.1",
      port: 0,
      strictPort: false,
    },
    plugins: [apiFixturePlugin()],
  });
  await vite.listen();
  const address = vite.httpServer.address();
  appUrl = `http://127.0.0.1:${address.port}/`;

  const debugPort = await reservePort();
  chromeProfile = fs.mkdtempSync(path.join(os.tmpdir(), "m1-production-chain-chrome-"));
  chrome = spawn(CHROME, [
    "--headless=new",
    "--disable-background-networking",
    "--disable-component-update",
    "--disable-default-apps",
    "--disable-extensions",
    "--disable-sync",
    "--no-first-run",
    "--no-default-browser-check",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${chromeProfile}`,
    "about:blank",
  ], {
    stdio: "ignore",
  });

  const webSocketUrl = await waitForChromeTarget(debugPort);
  cdp = new CdpConnection(webSocketUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
});

test.after(async () => {
  cdp?.close();
  chrome?.kill("SIGTERM");
  await vite?.close();
  if (chromeProfile && chromeProfile.startsWith(os.tmpdir())) {
    fs.rmSync(chromeProfile, { recursive: true, force: true });
  }
});

test("production App editing and non-confirmation state changes keep Core at zero", async () => {
  await openScenario({ mode: "s1", question: M1_B1_S1_QUESTION });
  const text = await evaluate("document.body.innerText");
  const dataBoundaryCopy = (
    "该问题及确认后的输入会发送至服务端，用于输入理解和确定性分析。"
    + "如启用受控 Provider，其输出仅作为待确认草稿，不直接生成最终决策。"
  );
  assert.match(text, /原始问题/);
  assert.equal(text.includes(dataBoundaryCopy), true);
  assert.doesNotMatch(text, /原始问题（本地保留）|本地保留/);
  assert.match(text, /Provider.*仅作为待确认草稿，不直接生成最终决策/);
  assert.equal(text.includes(M1_B1_S1_QUESTION), true);
  assert.equal(audit.inputResolutionCalls, 1);
  assert.equal(audit.coreCalls, 0);
  assert.equal(audit.releaseCalls, 0);
  await clickButton("修改识别结果");
  await setTextareaValue("#m1-region", "欧洲");
  await evaluate("window.dispatchEvent(new Event('resize'))");
  assert.equal(audit.coreCalls, 0);
  assert.equal(audit.releaseCalls, 0);
  assert.equal(await coreStatus(), null);
  console.log("M1_APP_AUDIT pre_confirmation_core_calls=0 input_resolution_calls=1");
});

test("real App renders certified RELEASED result from the no-Provider fallback exactly once", async () => {
  await openScenario({
    mode: "certified_fallback",
    question: M1_CERTIFIED_RELEASE_QUESTION,
  });
  assert.equal(audit.coreCalls, 0);
  assert.equal(audit.releaseCalls, 0);
  await capture("01-normal-confirmation.png");
  await clickButton("确认并开始分析", { twice: true });
  await waitForCoreStatus("accepted");
  await waitForReleaseStatus("RELEASED");
  await evaluate("window.dispatchEvent(new Event('resize'))");
  await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(audit.confirmationSubmissions, 1);
  assert.equal(audit.coreCalls, 1);
  assert.equal(audit.releaseCalls, 1);
  assert.equal(audit.lastReleaseResult.status, "RELEASED");
  assert.equal(audit.lastRequest.inputs.confirmed_input_hash.length, 64);
  assert.equal(
    audit.lastRequest.inputs.confirmed_input_hash,
    hashM1ConfirmedInput(audit.lastConfirmedInput),
  );
  lastNormalConfirmedInput = clone(audit.lastConfirmedInput);
  const text = await evaluate("document.body.innerText");
  assert.match(text, /确定性结果已生成/);
  assert.match(text, /决策结论/);
  assert.match(text, /Request ID：\s*m1_dr_[a-f0-9]{20}/);
  assert.match(text, /Confirmed Input SHA-256：\s*[a-f0-9]{64}/);
  assert.equal(text.includes(audit.lastRequest.inputs.confirmed_input_hash), true);
  assert.doesNotMatch(text, /Decision Resolution 尚未调用/);
  await capture("04-released-result.png", "[data-m1-release-status='RELEASED']");
  console.log(JSON.stringify({
    evidence: "M1_APP_AUDIT",
    strictMode: true,
    preConfirmationCoreCalls: 0,
    postConfirmationCoreCalls: audit.coreCalls,
    releaseIntegrationCalls: audit.releaseCalls,
    doubleClickSubmissionCalls: audit.confirmationSubmissions,
    coreEntry: "buildM1DecisionResolutionRequest",
    hash: audit.lastRequest.inputs.confirmed_input_hash,
  }));
});

test("USER_CORRECTED reaches Core with corrected facts/status and a regenerated hash", async () => {
  await openScenario({ mode: "s1", question: M1_B1_S1_QUESTION });
  await clickButton("修改识别结果");
  await setTextareaValue("#m1-region", "欧洲");
  assert.equal(audit.coreCalls, 0);
  await clickButton("确认并开始分析");
  await waitForCoreStatus("accepted");
  assert.equal(audit.coreCalls, 1);
  assert.equal(audit.releaseCalls, 1);
  const confirmed = audit.lastConfirmedInput;
  assert.equal(confirmed.confirmation_status, "USER_CORRECTED");
  assert.equal(confirmed.groups.customer_region.fields.region.value, "欧洲");
  assert.equal(
    confirmed.groups.customer_region.fields.region.confirmed_status,
    "USER_CORRECTED",
  );
  const prior = clone(confirmed);
  prior.confirmation_status = "USER_CONFIRMED";
  prior.groups.customer_region.fields.region.value = "北美";
  prior.groups.customer_region.fields.region.confirmed_status = "USER_CONFIRMED";
  const priorHash = hashM1ConfirmedInput(prior);
  const correctedHash = audit.lastRequest.inputs.confirmed_input_hash;
  assert.notEqual(correctedHash, priorHash);
  await capture("05-corrected-confirmation.png", "[data-m1-core-status='accepted']");
  console.log(JSON.stringify({
    evidence: "M1_APP_CORRECTION_HASH",
    coreCalls: audit.coreCalls,
    priorHash,
    correctedHash,
  }));
});

test("USER_MARKED_UNKNOWN reaches Core with canonical value/status and a regenerated hash", async () => {
  await openScenario({ mode: "s2", question: M1_B1_S2_QUESTION });
  assert.equal(audit.coreCalls, 0);
  await clickButton("确认并开始分析");
  await waitForCoreStatus("accepted");
  assert.equal(audit.coreCalls, 1);
  assert.equal(audit.releaseCalls, 1);
  const confirmed = audit.lastConfirmedInput;
  const record = confirmed.groups.customer_region.fields.target_customer;
  assert.equal(confirmed.confirmation_status, "USER_MARKED_UNKNOWN");
  assert.equal(record.value, "unknown");
  assert.equal(record.confirmed_status, "USER_MARKED_UNKNOWN");
  const prior = clone(confirmed);
  prior.confirmation_status = "USER_CONFIRMED";
  prior.groups.customer_region.fields.target_customer.confirmed_status = "USER_CONFIRMED";
  const priorHash = hashM1ConfirmedInput(prior);
  const unknownHash = audit.lastRequest.inputs.confirmed_input_hash;
  assert.notEqual(unknownHash, priorHash);
  await capture("06-unknown-confirmation.png", "[data-m1-core-status='accepted']");
  console.log(JSON.stringify({
    evidence: "M1_APP_UNKNOWN_HASH",
    coreCalls: audit.coreCalls,
    priorHash,
    unknownHash,
    value: record.value,
    status: record.confirmed_status,
  }));
});

test("S3 invalid Provider context enters the same production fallback screen and never reaches confirmed facts", async () => {
  await openScenario({ mode: "s3", question: M1_B1_S3_QUESTION });
  assert.equal(audit.inputResolutionCalls, 1);
  assert.equal(audit.coreCalls, 0);
  assert.equal(
    await evaluate("document.querySelector('.m1-confirmation-screen')?.dataset.m1ResolutionState"),
    "FALLBACK_CONFIRMATION_REQUIRED",
  );
  const beforeText = await evaluate("document.body.innerText");
  assert.match(beforeText, /M1_INPUT_DRAFT_UNEXPECTED_FIELDS/);
  assert.doesNotMatch(beforeText, /模型错误地将比较对象标为字段冲突|provider_internal_detail/);
  await capture("02-s3-fallback-confirmation.png");
  await clickButton("确认并开始分析");
  await waitForCoreStatus("accepted");
  assert.equal(audit.coreCalls, 1);
  assert.equal(audit.releaseCalls, 1);
  await waitForReleaseStatus("REJECTED");
  assert.doesNotMatch(
    JSON.stringify(audit.lastConfirmedInput),
    /模型错误地将比较对象标为字段冲突|provider_internal_detail|runtime_context_s3_invalid/,
  );
  console.log("M1_APP_AUDIT s3_input_resolution_calls=1 pre_core=0 post_core=1 invalid_provider_facts=false");
});

test("unsupported product-investment input renders a bounded REJECTED result instead of stopping", async () => {
  await openScenario({ mode: "s1", question: M1_B1_S1_QUESTION });
  await clickButton("确认并开始分析");
  await waitForCoreStatus("accepted");
  await waitForReleaseStatus("REJECTED");
  assert.equal(audit.coreCalls, 1);
  assert.equal(audit.releaseCalls, 1);
  assert.equal(audit.lastReleaseResult.status, "REJECTED");
  assert.equal(audit.lastReleaseResult.error.error_code, "UNSUPPORTED_COMBINATION");
  const text = await evaluate("document.body.innerText");
  assert.match(text, /当前输入未通过冻结发布策略/);
  assert.match(text, /UNSUPPORTED_COMBINATION/);
  assert.match(text, /Request ID：\s*m1_dr_[a-f0-9]{20}/);
  assert.match(text, /Confirmed Input SHA-256：\s*[a-f0-9]{64}/);
  assert.equal(text.includes(audit.lastRequest.inputs.confirmed_input_hash), true);
  assert.doesNotMatch(text, /Decision Resolution 尚未调用/);
  await capture("05-rejected-result.png", "[data-m1-release-status='REJECTED']");
});

test("Provider timeout uses the production fallback once with no retry and keeps Core blocked", async () => {
  await openScenario({ mode: "timeout", question: M1_B1_S1_QUESTION });
  assert.equal(audit.inputResolutionCalls, 1);
  assert.equal(audit.providerCalls, 0);
  assert.equal(audit.coreCalls, 0);
  const text = await evaluate("document.body.innerText");
  assert.match(text, /M1_INPUT_PROVIDER_TIMEOUT/);
  assert.match(text, new RegExp(M1_B1_S1_QUESTION));
  await capture("03-timeout-fallback-confirmation.png");
  console.log("M1_APP_AUDIT timeout_resolution_calls=1 automatic_retries=0 core_calls=0");
});

test("missing, illegal status, illegal field, invalid value, and JSON errors cannot enter Core", async () => {
  const cases = [
    ["missing", "M1_INPUT_DRAFT_MISSING_FIELDS"],
    ["illegal_status", "M1_INPUT_DRAFT_INVALID_STATUS"],
    ["illegal_field", "M1_INPUT_DRAFT_UNEXPECTED_FIELDS"],
    ["invalid_value", "M1_INPUT_DRAFT_CONTRACT_INVALID"],
    ["json_error", "M1_INPUT_JSON_INVALID"],
  ];
  for (const [mode, errorCode] of cases) {
    await openScenario({ mode, question: M1_B1_S1_QUESTION });
    const text = await evaluate("document.body.innerText");
    assert.match(text, new RegExp(errorCode));
    assert.equal(audit.inputResolutionCalls, 1, mode);
    assert.equal(audit.coreCalls, 0, mode);
    assert.equal(audit.releaseCalls, 0, mode);
  }
  console.log("M1_APP_AUDIT invalid_provider_cases=5 all_core_calls=0");
});

test("stale hash injection is rejected before the production Core spy", async () => {
  assert.ok(lastNormalConfirmedInput);
  resetAudit();
  const payload = {
    action: "m1_confirmed_input",
    confirmedInput: lastNormalConfirmedInput,
    confirmedInputHash: "0".repeat(64),
  };
  const result = await evaluate(`fetch("/api/m1-input-understanding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(${JSON.stringify(payload)})
  }).then(async (response) => ({ status: response.status, body: await response.json() }))`);
  assert.equal(result.status, 422);
  assert.equal(result.body.mode, "m1_decision_core_rejected");
  assert.equal(
    result.body.reasonCode,
    "M1_CONFIRMED_INPUT_SUBMISSION_INVALID",
  );
  assert.equal(audit.coreCalls, 0);
  assert.equal(audit.releaseCalls, 0);
  console.log("M1_APP_AUDIT stale_hash_fail_closed=true core_calls=0");
});

test("Core exceptions are safely bounded in the real App and expose no internal details", async () => {
  await openScenario({ mode: "s1", question: M1_B1_S1_QUESTION });
  forceCoreFailure = true;
  await clickButton("确认并开始分析");
  await waitForCoreStatus("rejected");
  assert.equal(audit.coreCalls, 1);
  assert.equal(audit.releaseCalls, 0);
  const text = await evaluate("document.body.innerText");
  assert.match(text, /确定性分析链保持阻断/);
  assert.doesNotMatch(text, /sensitive-test-stack-provider-token|stack|Secret|Token|Bearer/);
  console.log("M1_APP_AUDIT bounded_core_error=true sensitive_details_visible=false");
});
