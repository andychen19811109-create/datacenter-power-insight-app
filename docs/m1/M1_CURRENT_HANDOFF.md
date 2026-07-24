# M1 Current Handoff

## Repository checkpoint

- Worktree: `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-m1-demo`
- Branch: `codex/m1-professional-demo-mvp`
- Starting checkpoint: `244c0f89b3e655196580899b57dea3be146a8a0b`
- Source baseline commit: `c9bcb7ebb2dd373a5e3a4052746e1a376b33a852`
- Original dirty worktree: `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-phase2b`
- Original dirty state is preserved: three modified M1 files plus one untracked D3 acceptance script, with the tracked diff unchanged at 98 insertions and 5 deletions.

## Tested system identity

- Dedicated Dify app: `DCPI M1 Professional Demo MVP`
- Dify App ID: `ff285777-08a1-4ca5-a4ea-d91c298c1dd9`
- Pre-remediation published workflow ID: `f3a0e837-9399-46ce-a999-73f483ec6ab3`
- Remediation published workflow ID: `62f2e65f-87c1-4beb-992d-dab9ccd2e55a`
- Provider-reset published workflow ID: `e35180f4-370e-4148-9a99-80084ffe0abc`
- Message-layout correction published workflow ID: `6f87fc5a-4272-48a9-901c-c34133878e33`
- Provider/model: `langgenius/deepseek/deepseek` / `deepseek-v4-flash`
- Provider-reset candidate: `langgenius/siliconflow/siliconflow` / `Qwen/Qwen3.5-397B-A17B`
- Endpoint: `POST /v1/workflows/run`
- Input schema: `m1.input.v1`
- `.env.local` is ignored, contains local runtime configuration, and must never be committed.

## Current D1 files

1. `scripts/runM1InputGate.mjs`
2. `src/ask/m1/__tests__/m1InputUnderstanding.test.js`
3. `src/ask/m1/contracts/m1InputContext.js`
4. `src/ask/m1/m1ProfessionalEligibility.js`
5. `src/ask/m1/m1WorkflowTransport.js`
6. `src/ask/m1/runM1InputUnderstanding.js`

## Input remediation gate state

- Final verdict: `INPUT_REMEDIATION_GATE_FAIL`
- Decisive post-remediation run: 25 cases, one complete run only.
- Original matrix substantive result: `15 PASS / 5 FAIL`.
- Holdout substantive result: `4 PASS / 1 FAIL`.
- Combined substantive result: `19 PASS / 6 FAIL`.
- The instrumented `0 PASS / 25 FAIL` was caused by comparing the pre-publication workflow-version UUID with the published remediation workflow-version UUID and is not a valid semantic score.
- No second remediation, prompt-tuning pass, model switch, or second Gate run was performed.
- Decision Resolution: `NOT_STARTED`.
- Claim Boundary and deterministic Claim Guard: not started.
- Final seven-section report: not started.

## Remediation implemented

1. Clarification was separated from eligibility.
2. `POWER_ARCHITECTURE_DECISION` was added as the canonical comparison subject with complete alternatives.
3. The bounded intent taxonomy was changed to `PRODUCT_INVESTMENT`, `PRODUCT_DEVELOPMENT`, `PRODUCT_UPGRADE`, `ARCHITECTURE_CHOICE`, `PRODUCT_FIT_ASSESSMENT`, and `OUT_OF_SCOPE`.
4. Explicit `UNKNOWN` provenance may retain the user's unavailable statement; omitted unknowns retain an empty source span.
5. One same-payload retry is permitted only for a retryable transport/provider error, with both attempts recorded.
6. The dedicated Dify Input Understanding prompt was updated and published on the same app and `deepseek-v4-flash` model.

## Material failure evidence

1. Three intent/product-object distinctions:
   - `A1`: returned `PRODUCT_DEVELOPMENT`; expected `PRODUCT_INVESTMENT`.
   - `B1`: returned `PRODUCT_INVESTMENT`; expected `PRODUCT_DEVELOPMENT`.
   - `G1`: returned `PRODUCT_DEVELOPMENT`; expected `PRODUCT_FIT_ASSESSMENT`.
2. Two explicit-`UNKNOWN` provenance failures:
   - `F1`: treated explicit unknown power as `power_or_system_scope="大功率"` instead of `unknown`.
   - Holdout `K5`: retained unknown values but did not preserve explicit-unknown provenance correctly for load size and launch date.
3. Transport failure:
   - `I2`: returned one non-transient HTTP `400`; one attempt only, correctly no retry under the transient-only policy.
4. Workflow identity instrumentation:
   - Successful cases used published workflow version `62f2e65f-87c1-4beb-992d-dab9ccd2e55a`; comparing it with pre-publication version `f3a0e837-9399-46ce-a999-73f483ec6ab3` caused the invalid instrumented `0/25`.

## Remaining issue classification

1. Workflow-version identity test defect.
2. Explicit-`UNKNOWN` deterministic contract defect.
3. HTTP `400` transport/payload defect.
4. Provider semantic reliability failure.

## Verification and next decision

- Pre-Gate bounded unit test: `9 PASS / 0 FAIL`.
- Legacy regression was not run because the decisive Gate failed and the failure policy requires an immediate stop after handoff update.
- Next authorized action: `INPUT_PROVIDER_RESET_AND_INTEGRITY_GATE`.
- No second Prompt remediation is authorized.
- No alias expansion is authorized.
- No taxonomy tuning is authorized.
- No Decision Resolution is authorized.
- No second model may be tried after the next single candidate.

## Input Provider Reset and Integrity Gate

- Final verdict: `INPUT_PROVIDER_RESET_GATE_FAIL`.
- Dedicated App identity was verified through the same Service API credential boundary:
  - App: `DCPI M1 Professional Demo MVP`
  - App ID: `ff285777-08a1-4ca5-a4ea-d91c298c1dd9`
  - Mode: `workflow`
- Every Gate run recorded and matched published workflow version `e35180f4-370e-4148-9a99-80084ffe0abc`.
- Selected single candidate:
  - Provider: `langgenius/siliconflow/siliconflow`
  - Model: `Qwen/Qwen3.5-397B-A17B`
  - Dify response type: `CHAT`
  - Service API response mode: `blocking`
  - Temperature: unsupported by the selected Provider and removed by Dify
  - Timeout: `90000 ms`
  - Model-card native context: `262144` tokens
  - Output-token control: not exposed by this Dify Provider configuration; Provider default retained
- Selection basis: the candidate was already online under the configured SiliconFlow credential, is a 397B-total/17B-active post-trained model, has a 262144-token native context, and has published Chinese and instruction-following capability evidence. No comparative model execution was performed.

### Deterministic integrity diagnoses and corrections

1. Workflow identity:
   - Cause: the prior Gate compared every run with a pre-publication workflow-version UUID.
   - Local correction: verify the dedicated App name and mode through `GET /info`, require the expected published workflow-version UUID as Gate input, reject any different workflow UUID, and record the UUID for every run.
2. Explicit `UNKNOWN` provenance:
   - Cause: the local deterministic validator allowed `status="UNKNOWN"` to accompany a concrete normalized scalar value.
   - Local correction: an UNKNOWN-capable scalar with `status="UNKNOWN"` must be exactly `unknown`; `unknown` must use `UNKNOWN`; `conflicting` and `CONFLICTING` must agree. Non-empty versus empty `source_span` remains the explicit-versus-omitted distinction.
3. Original I2 HTTP `400`:
   - Exact pre-correction response: `invalid_param` / `raw_user_question in input form must be less than 256 characters`.
   - Cause: `raw_user_question` was a Dify `text` input with maximum length `256`; I2 contains `332` characters.
   - Dify correction: changed only that variable definition to `paragraph` with maximum length `4096`. The test question was not shortened or rewritten.
4. Transport diagnostics:
   - Local correction: preserve bounded HTTP/workflow error code and message evidence so deterministic validation failures are diagnosable.

### Provider-reset Gate evidence

- Original A–J: `0 PASS / 20 FAIL`.
- Existing holdouts K1–K5: `0 PASS / 5 FAIL`.
- New unseen holdouts L1–L5: `0 PASS / 5 FAIL`.
- Combined: `0 PASS / 30 FAIL`.
- All 30 failures were the same non-transient Provider workflow failure:
  - SiliconFlow HTTP `400`
  - code `20015`
  - `"messages" in request are illegal: No user query found in messages`
- The frozen Input Understanding node currently supplies the complete instruction and raw input in a SYSTEM message. Making this Provider execute would require changing the message-role structure, which is outside this Gate's Provider/model-only change authority.
- All 30 cases used:
  - one Provider/model
  - one published workflow version
  - one attempt per case
  - zero retries
- There were no workflow-identity false failures and no original input-length `400` after the Dify input correction.
- Bounded local Input Understanding unit test before the decisive Gate: `12 PASS / 0 FAIL`.
- Legacy regression: not run because the decisive Gate failed and the failure policy requires stop after this handoff update.
- Git state: Provider-reset local changes, the five new holdouts, and this handoff update remain uncommitted.
- Local commit: none.
- No second Provider, Prompt change, taxonomy change, sentence patch, Decision Resolution work, push, merge, deployment, or release action was performed.
- This failure ends the current two-node Input Understanding implementation path under the present MVP plan.

## Provider reset message-layout completion

- Authorized Dify change:
  - The existing SYSTEM message visible text was unchanged (`3456` characters before and after).
  - Exactly one `user` message was added.
  - Its only content is the workflow-native Dify variable chip `用户输入 / raw_user_question`.
  - No Prompt semantics, examples, aliases, classification hints, intent rules, architecture rules, fallback instructions, LLM nodes, Provider, or model were changed.
- Published workflow version: `6f87fc5a-4272-48a9-901c-c34133878e33`.
- Provider/model remained `langgenius/siliconflow/siliconflow` / `Qwen/Qwen3.5-397B-A17B`.
- Smoke verdict: `MESSAGE_LAYOUT_SMOKE_PASS`.
  - `S1` short underspecified UPS investment: PASS, one attempt.
  - `S2` UPS/BBU/HVDC/800VDC architecture comparison: PASS, one attempt.
  - `S3` 577-character narrative: PASS after the permitted same-payload retry; attempt 1 timed out and attempt 2 succeeded.
  - All three had no `20015`, no HTTP `400`, valid JSON, valid `m1.input.v1`, exact raw-question receipt, and valid App/workflow identity.
- Full Gate verdict: `INPUT_PROVIDER_RESET_GATE_FAIL`.
  - Original A-J: `11 PASS / 9 FAIL`.
  - Existing K1-K5: `5 PASS / 0 FAIL`.
  - Existing L1-L5: `5 PASS / 0 FAIL`.
  - Combined: `21 PASS / 9 FAIL`.
- Failed cases and classifications:
  - `B1`, `C1`, `E1`, `G1`, `H2`, `I1`: Provider run succeeded, but deterministic schema validation rejected loss of exact `raw_user_question`.
  - `I2`: Provider run succeeded, but deterministic schema validation rejected `field_provenance.target_timing.unknown_status_mismatch`.
  - `E2`, `G2`: non-retryable workflow failure, `ChunkedEncodingError` / `Response ended prematurely`.
- Gate evidence: `docs/m1/M1_INPUT_PROVIDER_RESET_GATE_EVIDENCE.json`.
- Bounded M1 unit tests and legacy regression were not run because the full Gate failed.
- Git state: all authorized local changes, this handoff update, and the Gate evidence remain uncommitted.
- Local commit: none.
- No Prompt remediation, Provider/model change, Decision Resolution, push, merge, deployment, or release action was performed.
- Exact smallest next decision: decide whether to authorize a new, separately scoped remediation gate for raw-question preservation, UNKNOWN provenance consistency, and the two premature-response transport failures; otherwise close the M1 Input Provider path as failed.

---

## Input Pipeline Final Closure

- Final checkpoint baseline: `1f50c75`
- Final targeted completion result: `6 PASS / 3 FAIL`
- Failed cases:
  - `B1`: decision intent wrong
  - `I1`: explicit power/system scope not preserved
  - `I2`: provider timeout after one permitted identical-payload retry
- Full 30-case Gate was not run because the targeted Gate failed.
- Final verdict: `INPUT_PIPELINE_COMPLETION_FAIL`
- Fully automatic, no-confirmation Input Understanding path is not qualified for the MVP.
- No further Prompt tuning, Provider switching, alias expansion, retry expansion, or automatic Input Gate remediation is authorized.
- Decision Resolution remains not started.
- Current approved product direction:
  `natural-language question → M1InputDraft → one confirmation/correction step → M1ConfirmedInput`
- Only `M1ConfirmedInput` may enter Decision Resolution.
- Provider output is draft data and must not be treated as authoritative user input.
- Current authorized next implementation package:
  `M1 CONFIRMED INPUT MVP`

---

## M1 Confirmed Input MVP completion

- Implementation verdict: `M1_CONFIRMED_INPUT_MVP_PASS`.
- Implemented path:
  `natural question → M1InputDraft → one confirmation/correction screen → M1ConfirmedInput`.
- Provider output remains draft-only and uses schema `m1.input-draft.v1`.
- Confirmed input uses the exact versioned schema `m1.confirmed-input.v1`.
- The exact original question is retained locally and validated as part of confirmation.
- The one confirmation screen contains six editable groups:
  1. decision type
  2. product / architecture
  3. application scenario
  4. customer / region
  5. power / system scope
  6. constraints / unknowns
- Draft provenance visibly marks `INFERRED`, `UNKNOWN`, and `CONFLICTING`.
- Confirmed field statuses are limited to `USER_CONFIRMED`, `USER_CORRECTED`, and `USER_MARKED_UNKNOWN`.
- The browser uses `POST /api/m1-input-understanding`; that local route reuses the existing `runM1InputUnderstanding` and `createM1WorkflowTransport`.
- Provider timeout/error produces a lightweight local fallback limited to decision type, product / architecture, and known scale / region / customer context. Missing context remains `UNKNOWN`.
- Focused confirmed-input contract/UI tests: `6 PASS / 0 FAIL`.
- Existing Input Understanding focused regression: `12 PASS / 0 FAIL`.
- Production build: PASS; existing large-chunk warning only.
- Browser-visible normal flow: PASS; created `m1.confirmed-input.v1 / USER_CONFIRMED` and visibly kept Decision Resolution unstarted.
- Browser-visible Provider-failure fallback: PASS; preserved the original question and displayed bounded fallback context plus `UNKNOWN` fields.
- Clean-tab browser console for both smokes: `0 errors / 0 warnings`.
- Detailed local evidence: `docs/m1/M1_CONFIRMED_INPUT_MVP_EVIDENCE.md`.
- Local commit subject: `Build M1 confirmed input flow`.
- No Dify, Prompt, Provider, workflow, Decision Resolution, report, PDF, push, merge, or deployment change was performed.
- Smallest next decision: authorize or reject a separately scoped Decision Resolution input-gate design that accepts only validated `m1.confirmed-input.v1`.
