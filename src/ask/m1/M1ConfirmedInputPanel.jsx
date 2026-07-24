import React, { useMemo, useState } from "react";

import {
  M1_CONFIRMATION_GROUPS,
  createM1ConfirmedInput,
  validateM1ConfirmedInput,
} from "./contracts/m1ConfirmedInput.js";
import { requestM1InputDraft } from "./m1ConfirmedInputFlow.js";

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

const StatusBadge = ({ status }) => {
  if (!STATUS_COPY[status]) return null;
  return <span className={`m1-status m1-status-${status.toLowerCase()} ${statusType(status)}`}>{STATUS_COPY[status]}</span>;
};

export const M1ConfirmedInputPanel = ({
  question,
  runDraft = requestM1InputDraft,
  initialDraft = null,
  onConfirmed = () => {},
}) => {
  const [state, setState] = useState(initialDraft ? "review" : "idle");
  const [draft, setDraft] = useState(initialDraft);
  const [editing, setEditing] = useState(false);
  const [editedValues, setEditedValues] = useState({});
  const [markedUnknownFields, setMarkedUnknownFields] = useState([]);
  const [confirmedInput, setConfirmedInput] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

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
    try {
      const nextDraft = await runDraft({ question: originalQuestion });
      setDraft(nextDraft);
      setEditedValues({});
      setMarkedUnknownFields([]);
      setEditing(false);
      setState("review");
    } catch {
      setErrorMessage("输入识别暂不可用，请稍后重试。");
      setState("idle");
    }
  };

  const toggleUnknown = (field) => {
    setMarkedUnknownFields((current) => (
      current.includes(field)
        ? current.filter((item) => item !== field)
        : [...current, field]
    ));
  };

  const confirm = () => {
    const nextConfirmedInput = createM1ConfirmedInput({
      draft,
      editedValues,
      markedUnknownFields,
    });
    const validation = validateM1ConfirmedInput(nextConfirmedInput, {
      expectedQuestion: draft.original_question,
    });
    if (!validation.ok) {
      setErrorMessage(`确认输入未通过契约校验：${validation.errors.join("、")}`);
      return;
    }
    setConfirmedInput(nextConfirmedInput);
    setEditing(false);
    setState("confirmed");
    setErrorMessage("");
    onConfirmed(nextConfirmedInput);
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
    <section className="m1-confirmation-screen" aria-label="M1 输入确认">
      <div className="m1-confirmation-header">
        <div>
          <h3>M1 输入确认</h3>
          <p>请在一次确认中修正识别结果。仅确认后的输入可进入后续 Decision Resolution。</p>
        </div>
        <span className={`badge ${draft.source.mode === "fallback" ? "amber" : "green"}`}>
          {draft.source.mode === "fallback" ? "轻量回退草稿" : "Provider 草稿"}
        </span>
      </div>

      {draft.source.mode === "fallback" && (
        <div className="m1-fallback-notice" role="status">
          Provider 超时或错误。已保留原问题，并仅提取决策类型、产品/架构及已知规模、区域、客户上下文；其余项保持 UNKNOWN。
        </div>
      )}

      <div className="m1-original-question">
        <span>原始问题（本地保留）</span>
        <p>{draft.original_question}</p>
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
        <div className="m1-confirmed-message" role="status">
          已生成 <code>{confirmedInput.schema_version}</code>；状态为 {confirmedInput.confirmation_status}。
          Decision Resolution 尚未启动。
        </div>
      )}
      {errorMessage && <div className="empty-state" role="alert">{errorMessage}</div>}

      <div className="m1-confirmation-actions">
        <button className="btn btn-primary" type="button" onClick={confirm} disabled={state === "confirmed"}>
          确认并开始分析
        </button>
        <button
          className="btn"
          type="button"
          onClick={() => {
            setEditing(true);
            setState("review");
            setConfirmedInput(null);
          }}
        >
          修改识别结果
        </button>
      </div>
    </section>
  );
};

export default M1ConfirmedInputPanel;
