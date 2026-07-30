import React, { useMemo, useRef, useState } from "react";

import {
  M1_CONFIRMATION_GROUPS,
  createM1ConfirmedInput,
  validateM1ConfirmedInput,
} from "./contracts/m1ConfirmedInput.js";
import {
  createM1FallbackConfirmationRequired,
  createM1ReadyForConfirmation,
  validateM1InputResolution,
} from "./m1InputResolution.js";
import {
  createM1FallbackResolution,
  requestM1InputResolution,
} from "./m1ConfirmedInputFlow.js";
import M1ReleaseResultPanel from "./M1ReleaseResultPanel.jsx";

const GROUP_LABELS = Object.freeze({
  decision_type: "1. 决策类型",
  product_architecture: "2. 产品 / 架构",
  application_scenario: "3. 应用场景",
  customer_region: "4. 客户 / 区域",
  power_system_scope: "5. 功率 / 系统边界",
  constraints_unknowns: "6. 约束 / 未知项",
});

const FIELD_LABELS = Object.freeze({
  decision_intent: "决策类型",
  primary_product_object: "主要产品对象",
  architecture_alternatives: "架构备选",
  application_scenario: "应用场景",
  target_customer: "目标客户",
  region: "区域",
  power_or_system_scope: "功率 / 系统边界",
  investment_or_product_stage: "投资 / 产品阶段",
  target_timing: "目标时间",
  critical_constraints: "关键约束",
  unknowns: "未知项",
  contradictions: "冲突项",
});

const STATUS_COPY = Object.freeze({
  INFERRED: "INFERRED · 系统推断",
  UNKNOWN: "UNKNOWN · 待确认",
  CONFLICTING: "CONFLICTING · 信息冲突",
  ASSUMED: "INFERRED · 暂定",
});

const statusType = (status) => status === "CONFLICTING"
  ? "red"
  : status === "UNKNOWN"
    ? "amber"
    : "cyan";

const fieldDisplayValue = (value) => Array.isArray(value) ? value.join("\n") : String(value ?? "");

const draftUnknownFields = (draft) => {
  const indexed = draft?.groups?.constraints_unknowns?.fields?.unknowns?.value;
  if (!Array.isArray(indexed)) return [];
  const confirmable = new Set(
    Object.values(M1_CONFIRMATION_GROUPS)
      .flat()
      .filter((field) => field !== "unknowns" && field !== "contradictions"),
  );
  return [...new Set(indexed.filter((field) => confirmable.has(field)))];
};

const StatusBadge = ({ status }) => {
  if (!STATUS_COPY[status]) return null;
  return <span className={`m1-status m1-status-${status.toLowerCase()} ${statusType(status)}`}>{STATUS_COPY[status]}</span>;
};

const seedResolution = ({ question, initialResolution, initialDraft }) => {
  if (initialResolution) {
    const validation = validateM1InputResolution(initialResolution, {
      expectedQuestion: String(question ?? ""),
    });
    if (validation.ok) return initialResolution;
    return createM1FallbackResolution({
      question,
      reasonCode: "input_resolution_invalid",
      validationErrors: validation.errors,
    });
  }
  if (!initialDraft) return null;
  if (initialDraft.source?.mode === "fallback") {
    return createM1FallbackConfirmationRequired({
      question,
      draft: initialDraft,
      errorCode: initialDraft.source.reason_code,
    });
  }
  return createM1ReadyForConfirmation({ question, draft: initialDraft });
};

export const M1ConfirmedInputPanel = ({
  question,
  runResolution = requestM1InputResolution,
  initialResolution = null,
  initialDraft = null,
  onConfirmed,
}) => {
  const initial = seedResolution({ question, initialResolution, initialDraft });
  const [state, setState] = useState(initial ? "review" : "idle");
  const [resolution, setResolution] = useState(initial);
  const [draft, setDraft] = useState(initial?.confirmation_draft || null);
  const [editing, setEditing] = useState(false);
  const [editedValues, setEditedValues] = useState({});
  const [markedUnknownFields, setMarkedUnknownFields] = useState(
    draftUnknownFields(initial?.confirmation_draft),
  );
  const [confirmedInput, setConfirmedInput] = useState(null);
  const [decisionCoreResult, setDecisionCoreResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const confirmationSubmittedRef = useRef(false);

  const markedUnknown = useMemo(() => new Set(markedUnknownFields), [markedUnknownFields]);

  const startUnderstanding = async () => {
    const originalQuestion = String(question || "");
    if (!originalQuestion.trim()) {
      setErrorMessage("请先输入自然语言问题。");
      return;
    }
    setState("loading");
    setErrorMessage("");
    setConfirmedInput(null);
    setDecisionCoreResult(null);
    confirmationSubmittedRef.current = false;
    try {
      let nextResolution = await runResolution({ question: originalQuestion });
      const validation = validateM1InputResolution(nextResolution, {
        expectedQuestion: originalQuestion,
      });
      if (!validation.ok) {
        nextResolution = createM1FallbackResolution({
          question: originalQuestion,
          reasonCode: "input_resolution_invalid",
          validationErrors: validation.errors,
        });
      }
      setResolution(nextResolution);
      setDraft(nextResolution.confirmation_draft);
      setEditedValues({});
      setMarkedUnknownFields(draftUnknownFields(nextResolution.confirmation_draft));
      setEditing(false);
      setState("review");
    } catch {
      const nextResolution = createM1FallbackResolution({
        question: originalQuestion,
        reasonCode: "provider_unavailable",
      });
      setResolution(nextResolution);
      setDraft(nextResolution.confirmation_draft);
      setEditedValues({});
      setMarkedUnknownFields(draftUnknownFields(nextResolution.confirmation_draft));
      setEditing(false);
      setState("review");
    }
  };

  const toggleUnknown = (field) => {
    setMarkedUnknownFields((current) => (
      current.includes(field)
        ? current.filter((item) => item !== field)
        : [...current, field]
    ));
  };

  const confirm = async () => {
    if (confirmationSubmittedRef.current) return;
    confirmationSubmittedRef.current = true;

    const nextConfirmedInput = createM1ConfirmedInput({
      draft,
      editedValues,
      markedUnknownFields,
    });
    const validation = validateM1ConfirmedInput(nextConfirmedInput, {
      expectedQuestion: draft.original_question,
    });
    if (!validation.ok) {
      confirmationSubmittedRef.current = false;
      setErrorMessage(`确认输入未通过契约校验：${validation.errors.join("、")}`);
      return;
    }
    if (typeof onConfirmed !== "function") {
      setConfirmedInput(nextConfirmedInput);
      setDecisionCoreResult({ status: "rejected" });
      setEditing(false);
      setState("confirmed");
      setErrorMessage("确认输入未能通过 Decision Core 输入门，请修改后重试。");
      return;
    }

    setConfirmedInput(nextConfirmedInput);
    setDecisionCoreResult({ status: "pending" });
    setEditing(false);
    setState("confirmed");
    setErrorMessage("");
    try {
      const result = await onConfirmed(nextConfirmedInput);
      setDecisionCoreResult({
        status: "accepted",
        requestId: result.requestId,
        confirmedInputHash: result.confirmedInputHash,
        releaseResult: result.releaseResult,
      });
    } catch {
      setDecisionCoreResult({ status: "rejected" });
      setErrorMessage("确认输入未能完成确定性分析，请修改后重试。");
    }
  };

  if (state === "idle" || state === "loading") {
    return (
      <section className="m1-confirmed-input-entry" aria-label="M1 输入确认">
        <div className="m1-entry-copy">
          <strong>M1 专业分析输入</strong>
          <span>先识别，再由你确认或修正。Provider 输出只作为草稿。</span>
        </div>
        <button
          className="btn btn-primary"
          type="button"
          onClick={startUnderstanding}
          disabled={state === "loading"}
        >
          {state === "loading" ? "正在识别输入…" : "识别并确认输入"}
        </button>
        {errorMessage && <div className="empty-state" role="alert">{errorMessage}</div>}
      </section>
    );
  }

  return (
    <section
      className="m1-confirmation-screen"
      aria-label="M1 输入确认"
      data-m1-resolution-state={resolution.state}
    >
      <div className="m1-confirmation-header">
        <div>
          <h3>M1 输入确认</h3>
          <p>请在一次确认中修正识别结果。仅确认后的输入可进入后续 Decision Resolution。</p>
        </div>
        <span className={`badge ${resolution.state === "FALLBACK_CONFIRMATION_REQUIRED" ? "amber" : "green"}`}>
          {resolution.state === "FALLBACK_CONFIRMATION_REQUIRED"
            ? "确认兜底"
            : "自动提取草稿"}
        </span>
      </div>

      {resolution.state === "FALLBACK_CONFIRMATION_REQUIRED" && (
        <div className="m1-fallback-notice" role="status">
          {resolution.error.user_message}
          <div><code>{resolution.error.code}</code></div>
        </div>
      )}

      <div className="m1-original-question">
        <span>原始问题</span>
        <p>{draft.original_question}</p>
        <p>
          <small>
            该问题及确认后的输入会发送至服务端，用于输入理解和确定性分析。如启用受控 Provider，其输出仅作为待确认草稿，不直接生成最终决策。
          </small>
        </p>
      </div>

      <div className="m1-group-grid">
        {Object.entries(M1_CONFIRMATION_GROUPS).map(([groupId, fields]) => (
          <fieldset className="m1-confirmation-group" key={groupId}>
            <legend>{GROUP_LABELS[groupId]}</legend>
            {fields.map((field) => {
              const record = draft.groups[groupId].fields[field];
              const currentValue = Object.hasOwn(editedValues, field)
                ? editedValues[field]
                : fieldDisplayValue(record.value);
              return (
                <div className="m1-field" key={field}>
                  <div className="m1-field-heading">
                    <label htmlFor={`m1-${field}`}>{FIELD_LABELS[field]}</label>
                    <StatusBadge status={record.draft_status} />
                  </div>
                  <textarea
                    id={`m1-${field}`}
                    value={markedUnknown.has(field) ? "unknown" : currentValue}
                    readOnly={!editing || markedUnknown.has(field)}
                    onChange={(event) => setEditedValues((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))}
                    rows={Array.isArray(record.value) ? 2 : 1}
                  />
                  {editing && (
                    <button
                      type="button"
                      className={`btn m1-unknown-toggle ${markedUnknown.has(field) ? "active" : ""}`}
                      onClick={() => toggleUnknown(field)}
                    >
                      {markedUnknown.has(field) ? "取消标记 UNKNOWN" : "标记为 UNKNOWN"}
                    </button>
                  )}
                </div>
              );
            })}
          </fieldset>
        ))}
      </div>

      {confirmedInput && (
        <div
          className="m1-confirmed-message"
          role="status"
          data-m1-core-status={decisionCoreResult?.status || "pending"}
        >
          已生成 <code>{confirmedInput.schema_version}</code>；状态为 {confirmedInput.confirmation_status}。
          {decisionCoreResult?.status === "accepted" ? (
            <>
              Decision Core 输入门及 Release Integration 已完成。
              <div>Request ID：<code>{decisionCoreResult.requestId}</code></div>
              <div>Confirmed Input SHA-256：<code>{decisionCoreResult.confirmedInputHash}</code></div>
            </>
          ) : decisionCoreResult?.status === "rejected"
            ? "确定性分析链保持阻断。"
            : "正在执行确定性分析与发布门。"}
        </div>
      )}
      {decisionCoreResult?.status === "accepted" && decisionCoreResult.releaseResult && (
        <M1ReleaseResultPanel result={decisionCoreResult.releaseResult} />
      )}
      {errorMessage && <div className="empty-state" role="alert">{errorMessage}</div>}

      <div className="m1-confirmation-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={confirm}
          disabled={state === "confirmed" || confirmationSubmittedRef.current}
        >
          确认并开始分析
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => {
            confirmationSubmittedRef.current = false;
            setEditing(true);
            setState("review");
            setConfirmedInput(null);
            setDecisionCoreResult(null);
            setErrorMessage("");
          }}
        >
          修改识别结果
        </button>
      </div>
    </section>
  );
};

export default M1ConfirmedInputPanel;
