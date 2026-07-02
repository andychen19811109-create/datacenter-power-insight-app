# DCPI Phase 2C-D Preview Mode Implementation and Test Plan

## 1. D2 Implementation Goal

The future D2 goal is to add an explicit manual Preview entry in Ask PowerInsight so a user can inspect new pipeline output without replacing the default legacy answer path.

The future implementation goal is intentionally narrow:

- default Generate behavior remains unchanged
- legacy `answer` remains legacy-only
- Preview Mode is manual-only
- preview output is user-safe
- no provider / Dify / DeepSeek / RAG / realtime Web activation
- no production or deployment claim

This document does not implement D2.

## 2. Maximum D2 File Scope

Maximum allowed D2 files:

1. `src/App.jsx`
2. `src/ask/runtime/buildAskPreviewRuntimeInput.js`
3. `src/ask/runtime/runAskPreviewAdapter.js`
4. `src/ask/__tests__/runtimePreviewAdapterNoImpact.test.js`
5. `src/ask/__tests__/runtimePreviewBridgeContract.test.js`
6. `src/ask/__tests__/runtimePreviewUiContract.test.js`

Possible but should avoid:

- `src/ask/runtime/buildAskShadowRuntimeInput.js`
- `src/ask/runtime/runAskShadowAdapter.js`
- `src/ask/runtime/normalizeRuntimeAskInput.js`
- `src/ask/runtime/runAskPipelineAdapter.js`
- `src/ask/renderer/renderAskReportState.js`

Forbidden:

- `src/App.css`
- `src/utils/insightEngine.js`
- `package.json`
- lockfiles
- `api/**`
- `.env*`
- `vercel.json`
- deployment config

Scope rule:

- if D2 requires edits outside the maximum allowed scope, stop and redesign before implementation

## 3. Preview Runtime Input Contract

Future `buildAskPreviewRuntimeInput.js` should be a pure deterministic function.

Mandatory contract:

- no React imports
- no browser globals
- no network
- no provider call
- `mode: "preview"`
- `consumerModule: "ask_power_insight"`
- `requestId` prefix `req_preview_`
- `route: "/ask"` or equivalent
- `module: "ask"`
- conservative UI filter mapping
- no fabricated `productFamily`
- no fabricated `architectureLayer`
- no fabricated evidence
- `sourceRefs: []`
- `claimRefs: []`
- `providerOutcome.enabled = false`
- `providerOutcome.status = "not_used"`
- `providerResponse: {}`
- no reliance on shadow-specific fields

Input-building rules:

- reuse explicit Ask runtime context that already exists in `src/App.jsx`
- keep unresolved mappings conservative with omission or `"unknown"` rather than inference
- do not infer `architectureLayer` from broad application selections
- do not infer `productFamily` from broad track selections
- keep evidence arrays empty until a separate evidence integration gate authorizes otherwise

## 4. Preview Adapter Contract

Future `runAskPreviewAdapter.js` must be a pure wrapper around `runAskPipelineAdapter`.

Mandatory contract:

- no provider call
- no network
- no Dify / DeepSeek / RAG / realtime Web
- catches sync throw and async rejection
- never throws to caller
- returns only user-safe preview object
- includes sanitized `status`
- includes sanitized `renderState`
- includes safe `userMessage`
- excludes raw `request` / `validation` / diagnostics internals
- excludes stack traces and raw error messages

Status mapping contract:

- `ready`
- `warning_report`
- `blocked`
- `provider_error`
- `provider_timeout`
- exception -> safe `error`

Adapter safety rule:

- `providerOutcome.enabled = false` and `providerOutcome.status = "not_used"` remain enforced even if future callers pass unexpected options

## 5. App.jsx Integration Contract

Future `src/App.jsx` integration may only add bounded preview wiring.

Required integration behavior:

- import `runAskPreviewAdapter`
- add preview-only state
- add preview handler
- add second button
- add separate preview panel
- keep existing `generateAnswer` semantics unchanged
- keep `setAnswer(legacyAnswer)` unchanged
- do not call `setAnswer` from preview handler
- do not render preview inside legacy answer block
- do not modify routes/tabs/global layout
- do not modify Product / Market / Companies pages
- no CSS file change

Design implication:

- preview state and preview panel are local Ask-tab additions only
- legacy answer rendering remains the authoritative default output path

## 6. Test Plan

### runtimePreviewAdapterNoImpact.test.js

Must verify:

- preview adapter never throws
- sync throw is caught
- async rejection is caught
- output excludes raw request
- output excludes validation tree
- output excludes diagnostics internals
- output excludes raw error / stack
- provider disabled remains enforced
- no network/provider patterns appear
- status mapping works

### runtimePreviewBridgeContract.test.js

Must verify:

- `mode: "preview"`
- `requestId` prefix `req_preview_`
- `consumerModule: "ask_power_insight"`
- `sourceRefs` empty
- `claimRefs` empty
- `providerOutcome.enabled = false`
- `providerOutcome.status = "not_used"`
- conservative filter mapping
- no `architectureLayer` inference from broad application
- no `productFamily` inference from broad track
- no use of shadow-only fields

### runtimePreviewUiContract.test.js

Must verify:

- preview handler must not call `setAnswer`
- `generateAnswer` remains legacy-only
- preview state is separate from `answer`
- preview panel is separate from legacy answer block
- normal Generate does not auto-run preview
- preview button label exists
- forbidden copy is absent
- no `App.css` import or change is required

## 7. Regression Baseline

Future D2 must preserve the current baseline and expand coverage.

Mandatory regression baseline:

- existing 138 tests continue to pass
- new preview tests are added
- total tests must increase beyond 138
- zero failed
- zero skipped
- zero todo

Interpretation:

- Preview Mode is not acceptable if it preserves behavior only manually but regresses the automated baseline

## 8. Failure and Rollback Strategy

Block and redesign if any of the following occurs:

- preview causes default answer drift
- preview needs `App.css`
- preview requires core adapter changes
- preview exposes diagnostics
- provider / Dify / RAG appears

Rollback strategy:

- remove preview files
- remove `src/App.jsx` preview-only additions
- do not touch the legacy answer path
- do not modify `src/utils/insightEngine.js`
- keep rollback strictly bounded to preview-only additions

## 9. Acceptance Criteria

Future D2 may pass only if:

- default Generate behavior is unchanged
- `answer` remains legacy-only
- Preview is manual-only
- Preview has separate state
- preview output is user-safe
- no provider / Dify / RAG / realtime Web path activates
- no `App.css` change is required
- no core file changes are required outside the approved D2 scope
- tests pass
- no production or deployment claim appears in UI or docs

## 10. Final Non-Claims

Even after future D2 implementation, the work must not claim:

- Ask quality is improved yet
- default output is replaced
- provider is active
- Dify / DeepSeek is active
- RAG / realtime Web is active
- Preview is anything other than experimental/local
- production / Vercel behavior is verified
