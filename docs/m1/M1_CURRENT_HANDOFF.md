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
- Provider/model: `langgenius/deepseek/deepseek` / `deepseek-v4-flash`
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
