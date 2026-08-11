# M1-B1 Production Result Chain Fix Evidence

Date: 2026-07-30
Worktree: `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-m1-b1-result-chain-fix`
Branch: `codex/m1-b1-production-result-chain`
Authorized base: `080fa5ef9aee235ed35bc5227ee448ad0916fdc1`

## Verdict

`M1_B1_PRODUCTION_RESULT_CHAIN_FIX_PASS`

The production Ask page now continues from validated `m1.confirmed-input.v1`
through the real frozen Release Integration and renders the returned
`m1.release-result.v1` as either `RELEASED` or `REJECTED`.

## Root cause closed

1. The production confirmation endpoint stopped after
   `buildM1DecisionResolutionRequest` and returned only request ID and SHA-256.
   It never called `evaluateM1ReleaseIntegration`.
2. Draft fields indexed as `UNKNOWN` were submitted as `USER_CONFIRMED`.
   The frozen Gateway correctly rejected that mismatch as
   `UNKNOWN_INDEX_MISMATCH`.
3. With Dify unavailable, the bounded fallback could not construct the narrow
   certified UPS/800VDC architecture-comparison context, so no locally
   testable `RELEASED` path existed.

## Production behavior

- Confirmation calls the existing Decision Core input gate exactly once.
- The server then calls the real frozen Release Integration exactly once.
- A `RELEASED` result must hash-bind to the server-generated Confirmed Input
  SHA-256 before it is returned or accepted by the client.
- The page renders recommendation, scope, alternatives, unknowns, evidence,
  and public policy/snapshot/schema bindings for `RELEASED`.
- The page renders a bounded public error and violation list for `REJECTED`.
- No partial or invented decision is shown after a frozen-policy rejection.
- Strict Mode and double click remain exactly-once.
- Provider output remains draft-only; only validated Confirmed Input enters the
  deterministic decision path.

## No-Provider certified acceptance route

The following explicit question is included in the page's sample questions and
is recognized by the bounded local fallback:

> 为 CUSTOMER_X 在 REGION_ALPHA 比较 1MW UPS 与 800VDC 在 AI 数据中心受保护负载场景的架构选择，当前处于 concept evaluation，投产时间未知，关键约束未知。

It maps to the already-certified combination only:

- `decision_intent = ARCHITECTURE_CHOICE`
- `primary_product_object = POWER_ARCHITECTURE_DECISION`
- `architecture_alternatives = [UPS, 800VDC]`
- `application_scenario = AI 数据中心受保护负载`
- `power_or_system_scope = 1MW`
- `unknowns = [target_timing, critical_constraints]`

The real frozen Release Integration returns `RELEASED` for this path. Broader
or incomplete questions remain fail-closed. The previously tested 2MW question
now returns a visible `REJECTED` result rather than stopping after confirmation.

## Independent local gates

- B1 focused input/Core tests: `42/42 PASS`
- Real production App browser interaction: `10/10 PASS`
- Frozen deterministic Core: `62/62 PASS`
- Applicable Release Integration gates G02-G20: `19/19 PASS`
- Applicable Demo snapshot/view-model gates: `9/9 PASS`
- Production build: `PASS`, `2306 modules transformed`
- `git diff --check`: `PASS`
- Changed tests contain no `.only`, `.skip`, `skip:`, or `todo:`

The historical branch-identity sentinels G01 and A3-G13 intentionally assert
the completed branch name `codex/m1-b1-clean-release`; they are not applicable
to this new fix branch. Their substantive frozen-asset checks were repeated
against `origin/main` and passed.

## Frozen and excluded scope

Zero diff against `origin/main`:

- `package.json`
- `package-lock.json`
- `src/ask/m1/contracts/m1ConfirmedInput.js`
- `src/ask/m1/contracts/m1DecisionState.js`
- `src/ask/m1/contracts/m1EvidenceSnapshot.js`
- `src/ask/m1/deterministic/**`
- `src/ask/m1/evidence/**`
- `src/ask/m1/m1DecisionCore.js`
- `src/ask/m1/m1DecisionEvidenceContext.js`
- `src/ask/m1/releaseIntegration/**`
- Certified RELEASED/REJECTED JSON snapshots

The legacy Dify/API/final-decision runtime paths excluded by the clean B1
release remain absent. No package or lockfile change was made.

## External boundary

- Dify automatic input extraction remains `BLOCKED`.
- The one-step user confirmation fallback remains active.
- No Docker, Dify, Provider, or LLM call was made.
- This checkpoint does not authorize Push, PR, Merge, or Deploy.
