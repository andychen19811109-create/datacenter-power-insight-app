# DCPI Phase 2C-D Preview Mode UI Contract

## 1. Phase Definition

Phase 2C-D defines Explicit Preview Mode for Ask PowerInsight.

This document is design-only.

Explicit Preview Mode means a manual user-visible preview of the new Ask pipeline while legacy Ask remains the default output.

This is not a default replacement.

This is not a quality-improvement claim.

This is not provider / Dify / DeepSeek / RAG integration.

This is not production behavior verification.

This is not Companies UI freshness integration.

## 2. Current Baseline

Current baseline from Phase 2C-C:

- `AskPowerInsightTab` exists in `src/App.jsx`.
- Existing state includes `question`, `answer`, and `shadowDiagnosticsRef`.
- Existing `generateAnswer` calls `generateStructuredAskPowerInsightAnswer(question, filters)` and passes the result to `setAnswer(...)`.
- Existing shadow adapter runs as a side-channel.
- Existing `answer` is the legacy-visible output.
- Existing shadow diagnostics are not rendered.

Current visible Ask contract:

- legacy Ask output remains default
- `setAnswer(...)` continues to receive only legacy answer
- the side-channel does not replace or overwrite legacy rendering

## 3. Preview UI Principle

Approved UX for future D2:

- Option 1: add a second explicit button near the existing Generate action
- recommended button label: `生成新管线预览`
- acceptable helper labels:
- `实验性预览：新 Ask Pipeline`
- `本地新管线预览，不代表默认输出`

Mandatory principles:

- normal `生成分析` remains unchanged
- preview does not auto-run when clicking normal Generate
- preview is manual only
- preview must be separate from legacy answer
- preview must not use toggle wording
- preview must not imply the new pipeline is better, upgraded, production-ready, or default

## 4. React State Contract

Future Preview Mode must use separate React state.

Mandatory state rules:

- legacy `answer` remains the only state written by the normal legacy path
- future preview state must not reuse `answer`
- future preview state must not write preview data to `answer`
- preview output must not reuse or overwrite `answer`
- `setAnswer(...)` must continue to receive only legacy answer

Suggested preview state shape may be documented but not implemented in D1:

```js
previewState = {
  status: "idle" | "loading" | "ready" | "warning" | "blocked" | "error",
  renderState: null,
  userMessage: "",
  requestedQuestion: "",
  requestedAt: "",
}
```

Recommended interpretation:

- `status` controls preview-only UI state
- `renderState` stores the sanitized preview payload for preview rendering only
- `userMessage` stores a safe summary for the preview panel only
- `requestedQuestion` and `requestedAt` help detect stale preview output without touching legacy answer behavior

## 5. Preview Button Behavior Contract

The preview action must be a second explicit manual button.

Mandatory button behavior:

- clicking `生成分析` must keep existing behavior unchanged
- clicking `生成分析` must not auto-run preview
- clicking the preview button must request preview only
- the preview button must not mutate legacy answer state
- the preview button must not call `setAnswer` with preview data
- preview entry must not be presented as a toggle such as `使用新 Pipeline`
- preview wording must stay experimental, local, and non-default

Disallowed interaction patterns:

- auto-preview after normal Generate
- replacing Generate with Preview
- combining legacy and preview output in one write path
- wording that implies default replacement

## 6. Preview Panel Rendering Contract

The preview panel must render separately from the legacy answer block.

Mandatory rendering rules:

- preview content must not render inside the legacy answer block
- preview content must not overwrite legacy answer display
- preview panel may appear adjacent to or below the legacy result, but as a separate panel
- preview UI copy must clearly mark the result as preview / experimental / local pipeline
- preview rendering must remain bounded to user-safe fields only
- preview must not inspect Vercel / deployment / Dify
- preview must not call provider / Dify / DeepSeek / RAG / realtime Web

Recommended panel semantics:

- show preview status
- show sanitized preview message
- show preview report content only from approved user-visible fields
- show warnings or blocking reasons only in sanitized preview form

## 7. Allowed User-visible Fields

Only the following preview fields are approved for user-visible rendering:

- `renderMode`
- `messageType`
- `allowedSections`
- `payload.response`
- `payload.warnings`
- `payload.blockingReasons`
- `payload.missingEvidence`
- `payload.sourceRequiredItems`

Rendering contract:

- render only sanitized, user-safe preview output
- do not widen the visible field list during D2 without a separate gate
- treat anything outside this list as diagnostics-only by default

## 8. Diagnostics-only Fields

The following fields are diagnostics-only and forbidden from rendering:

- raw `request`
- raw `validation`
- `diagnostics.reasonCodes`
- `diagnostics.timings`
- `requestId`
- `pageContextHash`
- `taskIntent`
- provider normalization internals
- stack traces
- raw exception messages
- secrets/tokens/env text

Diagnostics-only handling contract:

- these fields may exist for local debugging or tests later
- these fields must not be user-visible in Preview Mode
- raw diagnostics must not be copied into helper text, warnings, or fallback text

## 9. Copywriting Guardrails

Allowed positioning:

- preview
- experimental
- local pipeline
- non-default output

Copy must make clear:

- legacy Ask remains default
- preview is manual only
- preview is not a replacement
- preview is not proof of quality improvement
- preview is not production validation

Forbidden wording patterns:

- `升级版答案`
- `更专业答案`
- `新版已替换`
- `AI增强正式结果`
- `已接入 Dify / DeepSeek`
- `实时数据已更新`
- `生产环境已验证`
- `升级版`
- `优化版`
- `更好`
- `正式版`
- `替换`

## 10. Non-goals

Phase 2C-D D1 does not authorize:

- no default replacement
- no provider call
- no Dify call
- no DeepSeek call
- no RAG / realtime Web
- no Companies UI integration
- no Vercel / deployment verification
- no App.css change
- no `src/utils/insightEngine.js` change
- no Phase 2B core file changes
- no Phase 2C-C shadow file changes
- no implementation of Preview Mode in this document gate
