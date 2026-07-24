# M1 Confirmed Input MVP Evidence

## Gate identity

- Date: 2026-07-24
- Worktree: `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-m1-demo`
- Branch: `codex/m1-professional-demo-mvp`
- Expected and verified starting HEAD: `63d3d59`
- Starting tree: clean
- Provider, Prompt, Dify workflow, deployment, Decision Resolution, report, and PDF: unchanged / not started

## Implemented boundary

The implemented path is:

`natural question → M1InputDraft → one confirmation/correction screen → M1ConfirmedInput`

The browser sends the original question to `POST /api/m1-input-understanding`. The local API route invokes the existing `runM1InputUnderstanding` with the existing `createM1WorkflowTransport`. The Provider result is converted to `m1.input-draft.v1`; it is never treated as confirmed input.

Only an input created by `createM1ConfirmedInput` and accepted by `validateM1ConfirmedInput` has schema version `m1.confirmed-input.v1`. The UI stops after creating that object and visibly states that Decision Resolution has not started.

## Contract evidence

- Schema: `m1.confirmed-input.v1`
- Original question: exact `original_question`, validated against the expected question
- Exact editable groups:
  1. `decision_type`
  2. `product_architecture`
  3. `application_scenario`
  4. `customer_region`
  5. `power_system_scope`
  6. `constraints_unknowns`
- Draft provenance displayed when applicable: `INFERRED`, `UNKNOWN`, `CONFLICTING`
- Confirmed statuses only:
  - `USER_CONFIRMED`
  - `USER_CORRECTED`
  - `USER_MARKED_UNKNOWN`
- Exact-key validation rejects extra groups, invalid statuses, and replacement of the original question.

## Provider-failure fallback evidence

When Input Understanding is unavailable, the local fallback:

- preserves the exact original question;
- extracts only the decision type;
- extracts product / architecture tokens;
- extracts known power scale, region, and customer tokens;
- marks absent material fields `UNKNOWN`;
- marks multiple detected power values `CONFLICTING`;
- displays a visible lightweight-fallback notice;
- still requires the same user confirmation/correction step.

## Focused automated verification

Command:

`node --test src/ask/m1/__tests__/m1ConfirmedInput.test.js src/ask/m1/__tests__/m1ConfirmedInputUi.test.js`

Result:

- 6 passed
- 0 failed
- Contract cases: exact six-group contract, original-question preservation, correction / marked-unknown statuses, fail-closed validation, bounded fallback
- UI cases: normal Provider-draft screen and Provider-failure fallback screen

Existing Input Understanding focused regression:

`node --test src/ask/m1/__tests__/m1InputUnderstanding.test.js`

- 12 passed
- 0 failed

Build:

`npm run build`

- PASS
- Vite 5.4.21
- 2299 modules transformed
- Existing bundle-size warning only; no build error

The clean M1 worktree had no `node_modules`. Verification temporarily used the already-installed dependency directory from the known sibling Phase 2B worktree through a local symlink. The symlink was removed immediately after verification and is not part of the change set.

## Browser-visible smoke evidence

Surface:

- Built application preview
- In-app browser
- Local controlled same-origin smoke API
- No Dify, Prompt, Provider, or workflow mutation

Normal flow:

1. Opened Ask PowerInsight.
2. Entered `为 CUSTOMER_BROWSER 在 REGION_BROWSER 比较 500kW UPS 与 800VDC`.
3. Clicked `识别并确认输入`.
4. Verified visible `Provider 草稿`.
5. Verified the original question and all six groups.
6. Verified visible `INFERRED` and `UNKNOWN` markers.
7. Clicked `确认并开始分析`.
8. Verified visible `m1.confirmed-input.v1`, `USER_CONFIRMED`, and `Decision Resolution 尚未启动`.
9. Clean-tab browser console: 0 errors / 0 warnings.

Provider-failure fallback:

1. Entered `FAILURE_SMOKE 为 CUSTOMER_FALLBACK 在 REGION_FALLBACK 评估 750kW UPS`.
2. Controlled API returned `m1_input_unavailable / provider_timeout`.
3. Clicked `识别并确认输入`.
4. Verified visible `轻量回退草稿`.
5. Verified the exact original question remained visible.
6. Verified the fallback notice limits extraction to decision type, product / architecture, known scale, region, and customer.
7. Verified absent fields remained visibly `UNKNOWN`.
8. Clean-tab browser console: 0 errors / 0 warnings.

The controlled browser smoke proves browser-visible UI behavior only; it is not represented as a new live Provider qualification run.
