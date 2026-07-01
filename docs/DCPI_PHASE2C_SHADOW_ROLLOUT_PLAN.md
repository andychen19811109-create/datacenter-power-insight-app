# DCPI Phase 2C Shadow Rollout Plan

## 1. Rollout Principle

The rollout strategy for Phase 2C MUST be conservative and reversible.

The following principles are mandatory:

- legacy Ask output remains default
- the Phase 2B pipeline first enters shadow mode
- shadow output is diagnostic only
- preview output requires explicit manual opt-in
- no production-readiness claim may be made until a separate gate approves it

## 2. Rollout Model

### 2.1 Serving Model

The serving model MUST progress in layers:

1. legacy Ask serves the user-visible result
2. Phase 2B integration is introduced behind an adapter
3. shadow execution observes behavior without replacing legacy output
4. preview execution becomes manually visible only after a later explicit gate
5. provider-backed runtime expansion remains deferred to a separate later phase

### 2.2 Release Discipline

Each phase MUST define:

- allowed scope
- forbidden scope
- exit criteria
- rollback behavior
- test requirement

No phase may auto-expand into the next phase without a separate gate.

## 3. Phase Sequence

### 3.1 Phase Table

| Phase | Allowed Scope | Forbidden Scope | Exit Criteria | Rollback Behavior | Test Requirement |
| --- | --- | --- | --- | --- | --- |
| Phase 2C-A | design docs only | code changes, runtime integration, UI switch, provider activation | 3 design docs complete, scope clean, local docs commit created, review bundle prepared | no rollback needed beyond discarding local docs branch if later rejected | docs self-review complete |
| Phase 2C-B | pure adapter implementation only, pure-function runtime wrapper, no default UI switch | provider activation, preview default, shadow default replacement, `src/App.jsx` default behavior switch, external retrieval | adapter returns deterministic states, legacy path preserved, file scope approved, local tests pass | disable adapter path and retain legacy default | adapter contract tests and zero-regression tests required |
| Phase 2C-C | shadow mode wiring with non-user-facing diagnostics, legacy output unchanged | user-visible replacement, provider fallback prose, preview default on | shadow path runs safely, failures isolated, legacy Ask unchanged, diagnostics bounded | disable shadow execution and retain legacy Ask only | shadow isolation tests and performance tests required |
| Phase 2C-D | explicit preview mode, manual opt-in only | default-on preview, production-readiness claim, hidden preview activation | preview reversible, opt-in only, blocked/warning/source-required states visible, legacy default unchanged | disable preview flag/toggle and keep legacy Ask only | preview toggle tests, renderer-state tests, reversal tests required |
| Phase 2C-E | provider or Dify or realtime evidence integration only after separate gate | silent provider activation, unvalidated provider output, production rollout without provider isolation | provider boundary approved, deterministic timeout/error mapping verified, evidence/freshness validation enforced | disable provider path and fall back to legacy plus optional non-provider preview/shadow | provider isolation, timeout, malformed-response, and source/freshness validation tests required |

### 3.2 Phase Discipline

Each phase MUST stop if its own exit criteria are not met.

Each later phase MUST inherit the earlier phase safety boundaries:

- legacy Ask remains default
- blocked results do not become normal reports
- provider failure never replaces validated output

## 4. Shadow Mode Behavior

### 4.1 Shadow Definition

Shadow mode is a non-user-facing execution path.

It exists to compare runtime behavior and capture diagnostics without replacing legacy Ask output.

### 4.2 Shadow Guarantees

The following shadow guarantees are mandatory:

- shadow run is non-user-facing
- shadow failure is logged only or held in diagnostic state
- shadow failure cannot block legacy Ask output
- shadow result cannot replace legacy output
- shadow result must include `validatorStatus`, `renderMode`, freshness summary, `blockingReasons`, and warnings
- sensitive diagnostics must not expose env secrets or API keys

### 4.3 Shadow Result Envelope

Shadow diagnostics SHOULD retain at least:

| Field | Purpose |
| --- | --- |
| `requestId` | correlate runtime attempt |
| `pipelineAttempted` | record whether shadow path executed |
| `validatorStatus` | preserve final validator result |
| `renderMode` | preserve projected render state |
| `freshnessSummary` | capture freshness risk at a glance |
| `blockingReasons` | preserve exact block reasons |
| `warnings` | preserve non-blocking concerns |
| `providerState` | preserve provider operational status when later enabled |

## 5. Preview Mode Behavior

### 5.1 Preview Entry Rule

Preview mode MUST be explicit-toggle only and default off.

Preview mode MUST remain reversible.

### 5.2 Preview Visibility Rules

Preview mode may later show:

- validator status
- evidence trace
- freshness warnings
- blocked report
- warning report
- source-required report

Preview mode MUST NOT:

- claim production readiness
- silently replace legacy Ask default
- become mandatory for normal users

### 5.3 State Storage Constraint

Optional `localStorage` usage is allowed later for local preview preference persistence, but no external config center is allowed in this rollout track.

## 6. Rollback Plan

### 6.1 Rollback Priorities

Rollback MUST preserve system stability by removing newer behaviors before touching legacy Ask.

### 6.2 Required Rollback Actions

If later rollout steps misbehave, the rollback plan is:

1. disable preview
2. disable shadow
3. keep legacy Ask
4. keep existing data model unchanged
5. avoid dependency rollback
6. avoid Vercel or env rollback if the implementation respected the approved boundary

### 6.3 Rollback Properties

The rollout plan assumes:

- no data migration
- no dependency rollback
- no Vercel/env rollback needed if implemented correctly

## 7. Operational Safety Rules

The rollout MUST preserve these safety rules across all later implementation phases:

- legacy Ask first response must not be blocked by shadow execution
- preview must remain opt-in only
- blocked or malformed pipeline output must not appear as normal answer content
- timeout and provider failures must map to deterministic operational states
- diagnostics must stay bounded and secret-safe

## 8. Exit Readiness Signals

The rollout can move forward only when each phase proves:

- scope stayed within gate
- legacy Ask remained default where required
- validator and renderer state transitions are deterministic
- no hidden provider or local fallback path exists
- rollback remains simple and immediate

## 9. Non-claims

This rollout plan does not claim:

- runtime integration is already complete
- shadow mode code exists yet
- preview mode code exists yet
- provider integration is active
- Ask runtime is fixed
- Ask output quality is improved
- root cause is solved
