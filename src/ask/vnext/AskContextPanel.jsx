import React, { useEffect, useState } from "react";
import AnalysisContextSummary, { CANONICAL_FIELD_LABELS } from "./AnalysisContextSummary.jsx";
import { containsForbiddenExtraContextMetadata } from "./contracts/canonicalAnalysisInput.js";

const ARRAY_FIELDS = new Set(["track", "application", "region", "customer_type", "known_competitors"]);

const editableValue = (field) => Array.isArray(field.value) ? field.value.join("、") : field.value;
const parseValue = (field, value) => ARRAY_FIELDS.has(field)
  ? [...new Set(String(value || "").split(/[、,，/]/).map((item) => item.trim()).filter(Boolean))]
  : String(value || "").trim();

export default function AskContextPanel({
  question,
  analysisContext,
  compact = false,
  manualOverrides = {},
  onManualOverridesChange,
}) {
  const canonical = analysisContext?.canonical_input;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [dirtyFields, setDirtyFields] = useState([]);
  const [editorError, setEditorError] = useState("");

  useEffect(() => {
    if (!canonical || editing) return;
    setDraft(Object.fromEntries(Object.keys(CANONICAL_FIELD_LABELS).map((field) => [field, editableValue(canonical[field])])));
  }, [canonical?.snapshot_id, editing]);

  if (!canonical) return null;

  const startEditing = () => {
    setDraft(Object.fromEntries(Object.keys(CANONICAL_FIELD_LABELS).map((field) => [field, editableValue(canonical[field])])));
    setDirtyFields([]);
    setEditorError("");
    setEditing(true);
  };

  const save = () => {
    if (dirtyFields.includes("extra_context") && containsForbiddenExtraContextMetadata(draft.extra_context)) {
      setEditorError("补充背景只能填写业务信息，请移除版本、结构、追踪或服务元数据。");
      return;
    }
    const next = { ...manualOverrides };
    for (const field of dirtyFields) next[field] = parseValue(field, draft[field]);
    onManualOverridesChange?.(next);
    setEditing(false);
  };

  const clearManual = () => {
    onManualOverridesChange?.({});
    setEditing(false);
  };

  const actions = (
    <div className="vnext-context-actions">
      {Object.keys(manualOverrides).length > 0 && <button type="button" className="btn-link" onClick={clearManual}>恢复自动识别</button>}
      <button type="button" className="btn-link" onClick={startEditing}>调整分析条件</button>
    </div>
  );

  return (
    <section className={`vnext-current-context ${compact ? "compact" : ""}`} aria-label="当前分析上下文">
      <p className="vnext-current-question"><strong>当前问题：</strong>{question}</p>
      {editing ? (
        <div className="vnext-context-editor">
          <div className="vnext-context-editor-grid">
            {Object.entries(CANONICAL_FIELD_LABELS).map(([field, label]) => (
              <label key={field}>
                <span>{label}</span>
                {field === "extra_context" ? (
                  <textarea
                    value={draft[field] || ""}
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, [field]: event.target.value }));
                      setDirtyFields((current) => current.includes(field) ? current : [...current, field]);
                    }}
                  />
                ) : (
                  <input
                    value={draft[field] || ""}
                    placeholder="未指定"
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, [field]: event.target.value }));
                      setDirtyFields((current) => current.includes(field) ? current : [...current, field]);
                    }}
                  />
                )}
              </label>
            ))}
          </div>
          <p className="vnext-editor-note">人工调整仅影响本次分析，不会修改页面顶部筛选条件。</p>
          {editorError && <p className="vnext-progress" role="alert">{editorError}</p>}
          <div className="vnext-actions">
            <button type="button" className="btn" onClick={() => setEditing(false)}>取消</button>
            <button type="button" className="btn btn-primary" onClick={save}>应用本次条件</button>
          </div>
        </div>
      ) : (
        <AnalysisContextSummary canonicalInput={canonical} compact={compact} actions={actions} />
      )}
    </section>
  );
}
