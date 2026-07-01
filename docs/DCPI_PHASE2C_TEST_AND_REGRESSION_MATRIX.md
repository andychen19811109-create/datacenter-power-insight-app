# DCPI Phase 2C Test And Regression Matrix

## 1. Test Strategy

Phase 2C testing MUST protect the legacy Ask runtime while validating the new adapter and phased rollout controls.

The strategy MUST cover:

- legacy Ask zero-regression
- adapter pure-function contract tests
- shadow mode isolation tests
- preview mode explicit opt-in tests
- provider error isolation tests
- freshness reuse tests
- Companies & Intelligence future reuse tests
- performance and timeout tests

### 1.1 Core Testing Principles

The matrix remains contract-first.

Tests MUST assert deterministic state objects rather than generic prose fragments.

Tests SHOULD prefer exact assertions across:

- `validatorStatus`
- `renderMode`
- `allowedToRender`
- `blockingReasons`
- warnings
- freshness summary

### 1.2 Legacy Protection Rule

No implementation phase may pass unless legacy Ask zero-regression is demonstrated for the approved scope.

## 2. Required Regression Matrix

| Area | Test Case | Expected Result | Blocking Severity | Phase | Automation Candidate |
| --- | --- | --- | --- | --- | --- |
| Legacy Default | legacy Ask output still renders when new pipeline fails | legacy Ask remains visible, new path failure stays isolated | P0 | 2C-B / 2C-C / 2C-D / 2C-E | automated integration |
| Adapter Request Mapping | adapter maps page context correctly | request contract receives correct route, module, filters, and `pageContextHash` | P0 | 2C-B | automated unit |
| Adapter Request Mapping | adapter maps `ProductPlanningCard.stateHash` correctly | request contract preserves card id, version, and state hash exactly | P0 | 2C-B | automated unit |
| Module Freshness Reuse | missing `consumerModule` blocks | validator or hydration returns blocked schema state with exact blocking reason | P0 | 2C-B | automated unit |
| Module Freshness Reuse | `company_intelligence` claim cannot use Ask-only source | hydration or validator blocks cross-module misuse | P0 | 2C-B / 2C-C | automated unit |
| Freshness Enforcement | stale L4 plus fresh L5 blocks | result is blocked freshness or source-required; laundering does not pass | P0 | 2C-B / 2C-E | automated unit |
| Renderer Mapping | `pass_with_warnings` renders `warning_report` | warning report state returned, warnings visible | P1 | 2C-B / 2C-D | automated unit |
| Provider Isolation | provider timeout creates timeout card | deterministic timeout state returned, no normal report rendered | P0 | 2C-E | automated unit |
| Provider Isolation | provider malformed response creates `provider_error` card | deterministic provider error state returned | P0 | 2C-E | automated unit |
| Shadow Isolation | shadow failure does not affect legacy output | legacy Ask still serves, shadow failure remains diagnostic only | P0 | 2C-C | automated integration |
| Preview Gating | preview toggle off keeps legacy default | no preview content shown, legacy output unchanged | P0 | 2C-D | automated integration |
| Preview Gating | preview toggle on displays pipeline preview only | preview state shown only under explicit opt-in | P1 | 2C-D | automated integration |
| Scope Guard | no `App.jsx` default switch before approved gate | no default rendering-path replacement occurs | P0 | 2C-B / 2C-C / 2C-D | static check plus code review |
| Provider Scope Guard | no Dify or RAG call before provider gate | no provider network path executes before 2C-E approval | P0 | 2C-B / 2C-C / 2C-D | static check plus test spy |
| Diagnostics Safety | no secrets in diagnostics | diagnostics omit env values, keys, and credentials | P0 | 2C-B / 2C-C / 2C-D / 2C-E | automated unit |
| Performance Safety | no infinite retries or unbounded evidence expansion | execution stays bounded; retries remain capped at zero or approved limit | P0 | 2C-B / 2C-C / 2C-E | automated unit plus perf harness |

## 3. Additional Coverage Areas

### 3.1 Adapter Pure-function Contract Tests

The adapter contract suite SHOULD include:

- missing page context -> blocked state
- ambiguous product family -> clarification state
- factual question without refs -> source-required state
- page/module mismatch -> blocked mismatch state
- deterministic mapping from validator status to render-safe state

### 3.2 Shadow Mode Isolation Tests

Shadow tests SHOULD prove:

- shadow path can fail independently
- legacy Ask still resolves
- shadow diagnostics remain non-user-facing
- shadow execution does not mutate normal renderer state

### 3.3 Preview Mode Explicit Opt-in Tests

Preview tests SHOULD prove:

- default off
- explicit on
- reversible off
- no sticky default switch without local user action

### 3.4 Provider Error Isolation Tests

Provider boundary tests SHOULD prove:

- malformed provider payload becomes `provider_error`
- provider timeout becomes timeout card
- provider failure never forces fallback expert prose
- provider failure never replaces legacy Ask default output

### 3.5 Freshness Reuse Tests

Freshness reuse tests SHOULD prove:

- required freshness fields remain mandatory
- `L5_local_kb` alone cannot support hard factual claim
- `L6_uncorroborated_reference` cannot support hard factual claim
- stale official evidence cannot be laundered by fresh local notes

### 3.6 Companies & Intelligence Future Reuse Tests

Future reuse tests SHOULD prove:

- `consumerModule` remains required
- `appliesToModules` is enforced for cross-module source reuse
- `company_intelligence` freshness-sensitive claims require official freshness metadata
- Ask-only source applicability does not silently pass Companies reuse

### 3.7 Performance and Timeout Tests

Performance tests SHOULD prove:

- adapter path respects timeout budget
- shadow path does not block first legacy response
- diagnostics stay bounded
- evidence hydration remains bounded

## 4. Exit Criteria

The following gates are required before moving from docs to implementation:

- Phase 2C-A docs merged
- Gemini final docs review pass
- Codex implementation prompt for Phase 2C-B approved
- adapter file scope defined
- test file scope defined
- legacy Ask regression cases defined

No Phase 2C-B implementation should start before those conditions are accepted.

## 5. P0 Regression Traps

Historical P0 traps that MUST remain explicit in the implementation test set:

- Ask cannot connect to page or module context
- output becomes too generic or AI-like
- weak evidence or no source trace
- stale or unverifiable claims
- old Ask broken by new pipeline
- provider error leaks to user
- Companies & Intelligence stale claims treated as current
- local KB laundering hard factual claims

## 6. Recommended Test Layers

| Layer | Primary Goal | Typical Assertions |
| --- | --- | --- |
| unit | pure-function adapter and mapping correctness | exact state object, exact blocking reason |
| contract | request, hydration, validator, and renderer boundaries stay aligned | status plus render mode plus metadata |
| integration | legacy Ask remains default while new pipeline is introduced | user-visible output path unchanged |
| performance | timeout budget and bounded work | elapsed time, bounded retries, bounded hydration |
| static scope | no forbidden file or runtime path expansion | file boundary and call-path checks |

## 7. Implementation-readiness Notes

This matrix is implementation-ready only if the future Phase 2C-B prompt names:

- target adapter file scope
- target test file scope
- zero-regression verification path
- shadow and preview gating mechanism
- explicit no-provider-before-2C-E rule

## 8. Non-claims

This document does not claim:

- the runtime integration already exists
- preview mode already exists
- shadow mode already exists
- provider integration is active
- Ask runtime is fixed
- Ask output quality is improved
- root cause is solved
