# DCPI Phase 2C Runtime Integration Design

## 1. Purpose and Non-claims

### 1.1 Purpose

Phase 2C-A defines the runtime-integration design for the Phase 2B Ask pipeline foundation.

This document is design-only.

### 1.2 Non-claims

Phase 2C-A MUST be treated as design-only.

Phase 2C-A MUST NOT be interpreted as:

- code implementation complete
- runtime integration complete
- UI default switch complete
- Dify activation complete
- RAG activation complete
- realtime provider activation complete
- Ask runtime fixed
- Ask output quality improved
- root cause solved

Stated directly, Phase 2C-A includes:

- no code implementation
- no runtime integration
- no UI default switch
- no Dify activation
- no RAG activation
- no realtime provider activation
- no claim that Ask runtime is fixed
- no claim that Ask output quality is improved
- no claim that root cause is solved

## 2. Runtime Integration Target

### 2.1 Target Shape

The eventual integration target is a bounded adapter layer that sits between the legacy Ask runtime entrypoint and the Phase 2B pure-function pipeline.

The adapter MUST convert runtime inputs into the Phase 2B request contract, invoke the existing pure-function pipeline boundaries in order, and convert the final validator output into a render-safe state object.

### 2.2 Default Protection

The following rules are mandatory:

- legacy Ask remains the default output path
- the Phase 2B pipeline is not directly wired into the UI in Phase 2C-A
- the adapter must be pure-function first
- the adapter must map runtime input into the Phase 2B request contract
- the adapter must map Phase 2B validator output into render-safe state
- the adapter must never throw into UI
- the adapter must return deterministic `provider_error`, `provider_timeout`, `blocked`, `warning`, and `preview` states

### 2.3 Integration Objective

The Phase 2B pipeline MUST be introduced as a controlled runtime subsystem, not as a new default renderer and not as a replacement for legacy Ask during early rollout.

## 3. Adapter Boundary

### 3.1 Responsibilities

The future adapter MUST own these responsibilities:

- input normalization
- page context packaging
- `ProductPlanningCard` context packaging
- evidence pack hydration input
- validator execution boundary
- render state mapping
- provider and timeout isolation placeholder
- diagnostics metadata output

### 3.2 Proposed Execution Order

The runtime adapter SHOULD execute in this order:

1. Capture raw runtime invocation input.
2. Normalize route, module, selected filters, question, and card identity.
3. Build page context package.
4. Build `ProductPlanningCard` context package.
5. Build the Phase 2B request object.
6. Run request-contract validation.
7. Run evidence hydration against registry-backed refs.
8. Pass only normalized, hydrated data into downstream validation or future provider boundary.
9. Convert final validator status into one render-safe state object.
10. Return diagnostics metadata without mutating UI state directly.

### 3.3 Adapter Must Not

The adapter MUST NOT:

- do direct DOM rendering
- mutate UI state directly
- perform provider calls in Phase 2C-B unless separately authorized later
- perform local expert fallback
- generate hidden static answers
- bypass `validatorStatus`
- bypass `renderMode`
- bypass `allowedToRender`
- bypass `blockingReasons`

### 3.4 Deterministic Return Contract

The adapter SHOULD always return a single normalized result envelope similar to:

| Field | Requirement |
| --- | --- |
| `legacyPathUsed` | MUST indicate whether legacy Ask remained the serving path |
| `pipelineAttempted` | MUST indicate whether Phase 2B path executed |
| `requestContractStatus` | MUST preserve request validation outcome |
| `hydrationStatus` | MUST preserve evidence hydration outcome |
| `validatorStatus` | MUST preserve final validator decision |
| `renderMode` | MUST map directly from validator or provider operational state |
| `allowedToRender` | MUST remain authoritative |
| `blockingReasons` | MUST remain machine-assertable |
| `warnings` | MUST remain visible to later preview/shadow consumers |
| `diagnostics` | MUST be bounded and secret-safe |

## 4. Runtime Input Mapping

### 4.1 Required Runtime Inputs

The future adapter MUST capture enough runtime input to satisfy the existing Phase 2B request contract:

- `currentPageRoute`
- `currentPageModule`
- `selectedFilters`
- `productPlanningCard`
- `pageContext`
- `pageContextHash`
- `userQuestion`
- `taskIntent`
- `sourceRefs`
- `claimRefs`
- `timestamp`

### 4.2 Context Packaging Reuse

The adapter MUST reuse the existing context-building shape already established by:

- `buildPageContext`
- `buildProductPlanningCardContext`
- `buildAskRequest`

The adapter MUST NOT introduce a second, incompatible page-context contract.

### 4.3 Failure Mapping

If request construction fails, the adapter MUST return a render-safe blocked or clarification state rather than throwing.

Examples:

- missing page hash -> blocked page-context state
- route/module mismatch -> blocked mismatch state
- ambiguous product family -> clarification state
- factual question without refs -> source-required state

## 5. Multi-module Freshness Reuse Contract

### 5.1 Reuse Goal

Phase 2B established a freshness and evidence foundation that MUST be reusable across:

- Companies & Intelligence
- Market
- Product
- Technology
- Dashboard

Phase 2C-A defines the reuse contract only. It does not authorize direct Companies UI modification.

### 5.2 Module-agnostic Contract

The reuse contract MUST remain module-agnostic at the source and claim level.

Every reusable source/claim object MUST support:

- `sourceRef` / `claimRef` pointer usage
- later hydration into expanded packs
- module-aware consumer checks
- freshness metadata enforcement
- tier-aware factual-claim enforcement

### 5.3 Required Cross-module Fields

The following fields are mandatory for future reuse:

| Object | Field | Requirement |
| --- | --- | --- |
| Source | `consumerModule` | required |
| Source | `appliesToModules` | required for cross-module source reuse |
| Source | `sourceTier` | required |
| Source | `publicationDate` | required for freshness-sensitive official evidence |
| Source | `lastVerifiedDate` | required for freshness-sensitive official evidence |
| Source | `freshnessStatus` | required |
| Claim | `consumerModule` | required |
| Claim | `claimType` | required |
| Claim | `sourceIds` | required for hard factual claim |
| Claim | `freshnessStatus` | required for freshness-sensitive claim families |

### 5.4 Enforcement Rules

The following rules MUST remain preserved:

- `consumerModule` is required
- `appliesToModules` is required for cross-module source reuse
- source tier enforcement remains active
- `publicationDate`, `lastVerifiedDate`, and `freshnessStatus` remain required where freshness matters
- stale `L4_vendor_official` plus fresh `L5_local_kb` laundering must remain blocked
- `L5_local_kb` alone cannot support a hard factual claim
- `L6_uncorroborated_reference` cannot support a hard factual claim
- a `company_intelligence` claim cannot silently reuse an Ask-only source unless module applicability explicitly permits it

### 5.5 Module Reuse Pattern

The expected reuse pattern is:

1. module emits lightweight `sourceRef` / `claimRef`
2. adapter passes refs to hydration layer
3. hydration enforces `consumerModule` and `appliesToModules`
4. validator enforces evidence, object, and freshness constraints
5. preview/shadow consumers read only normalized states

No Phase 2C-A activity may modify Companies UI directly.

## 6. Provider Boundary

### 6.1 Boundary Position

The provider boundary is defined now but MUST stay disabled.

Dify, DeepSeek, realtime Web retrieval, and RAG-backed live evidence expansion are Phase 2C-E or later only.

### 6.2 Provider Rules

When provider integration is later authorized, these rules MUST apply:

- provider timeout converts to deterministic timeout card
- provider malformed response converts to `provider_error` card
- provider failure cannot affect legacy Ask default output
- provider output must pass evidence, source, and freshness validation before render
- provider output must never bypass request-contract or validator gates

### 6.3 Operational Isolation

Provider execution MUST be isolated from the legacy Ask serving path.

If provider-side execution fails:

- legacy Ask output remains available
- preview remains optional
- shadow remains diagnostic only
- no user-facing unvalidated expert prose is allowed

## 7. Performance and Safety

### 7.1 Runtime Safety

The shadow pipeline MUST NOT block the legacy Ask first response.

The adapter MUST support a timeout budget and a deterministic timeout exit path.

### 7.2 Resource Controls

The following controls are mandatory:

- diagnostics must be capped
- no unbounded evidence expansion
- no repeated provider retries in Phase 2C-A, 2C-B, or 2C-C
- no expensive runtime side effects

### 7.3 Determinism and Observability

The adapter SHOULD produce bounded diagnostics such as:

- request contract result
- hydration status
- validator status
- render mode
- warning count
- blocking reason count
- freshness summary

Diagnostics MUST NOT expose secrets, tokens, raw env values, or provider credentials.

## 8. Implementation Readiness Notes

Phase 2C-B implementation SHOULD stay limited to an adapter-layer file scope that wraps, but does not rewrite, the Phase 2B pure-function foundation.

The first implementation goal is safe integration structure, not answer-quality expansion.

## 9. Explicit Boundary Summary

Phase 2C-A MUST preserve all of the following:

- legacy Ask default remains protected
- no runtime UI default switch
- no direct provider activation
- no hidden fallback answer path
- no bypass of request, hydration, validator, or render contracts
- no claim that Ask runtime is fixed
- no claim that Ask output quality is improved
- no claim that root cause is solved
