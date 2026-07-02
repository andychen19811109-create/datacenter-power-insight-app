# DCPI Phase 2C-C Shadow Implementation and Test Plan

## 1. Purpose

This document defines the future implementation gate for Phase 2C-C.

It does not implement Phase 2C-C.

## 2. Proposed Future Implementation Name

Phase 2C-C Shadow Mode Wiring — Legacy Output Default

## 3. Candidate Future Files

| File | Classification | Expected change type | Reason | User-visible behavior risk | Implementation risk |
| --- | --- | --- | --- | --- | --- |
| `src/ask/runtime/runAskShadowAdapter.js` | required | new wrapper module | isolate shadow-only execution, error swallowing, and diagnostics sanitation around `runAskPipelineAdapter` | low if kept side-channel only | low |
| `src/App.jsx` | required | very small targeted edit | import the shadow wrapper, capture snapshot, optionally retain in-memory diagnostics ref, and call the wrapper from `generateAnswer` | medium because visible Ask state lives here | medium |
| `src/ask/runtime/buildAskShadowRuntimeInput.js` | optional but strongly recommended | new helper module | isolate UI snapshot to adapter-input mapping so `App.jsx` stays small and mapping logic stays testable | low | medium |
| `src/ask/__tests__/runtimeShadowAdapterNoImpact.test.js` | required | new test file | prove legacy answer remains unchanged across shadow success, blocked, and throw paths | none | low |
| `src/ask/__tests__/runtimeShadowBridgeContract.test.js` | required | new test file | prove snapshot mapping, `taskIntent`, `pageContextHash`, and minimal card contract stay deterministic | none | medium |
| `src/ask/__tests__/runtimeShadowProviderBoundary.test.js` | required | new test file | prove provider stays disabled and no Dify / DeepSeek / RAG / Web path activates | none | low |
| `src/utils/insightEngine.js` | should avoid | no change | legacy visible answer path must remain untouched in Phase 2C-C | high if changed | high |
| `src/ask/runtime/runAskPipelineAdapter.js` | should avoid | no change | keep the existing pure adapter foundation stable and reuse it as-is | medium | high |
| `src/ask/orchestrator/buildAskRequest.js` | should avoid | no change | Phase 2C-C is bridge wiring, not request-contract redesign | medium | high |
| `src/ask/orchestrator/hydrateEvidencePacks.js` | should avoid | no change | evidence hydration behavior is out of scope and must not be widened here | medium | high |
| `src/ask/validator/validateAskResponse.js` | should avoid | no change | response validator behavior is not the C1 bridge problem | medium | high |
| `src/App.css` | should avoid | no change | no UI or layout change is allowed | high | low |
| `src/main.jsx` | should avoid | no change | entry bootstrap does not need to move for Phase 2C-C | low | medium |
| `package.json` | should avoid | no change | no package additions are allowed | high | low |
| `package-lock.json` and other lockfiles | should avoid | no change | lockfile churn is out of scope | high | low |
| `api/**` | should avoid | no change | no API work is authorized | high | medium |
| `.env*` | should avoid | no change | no env changes are authorized | high | low |

## 4. Future App.jsx Touch Limit

The future `App.jsx` change must stay deliberately small.

Target limit:

- only import the shadow wrapper
- optionally create one non-rendered ref or callback for diagnostics
- call the shadow wrapper from `generateAnswer` as a side-channel
- do not modify visible answer rendering
- do not replace legacy answer generation
- do not add a UI toggle
- do not add preview UI
- do not alter CSS or layout
- ideally under 10 to 20 changed lines
- no broad refactor

## 5. Future runAskShadowAdapter Contract

The future shadow wrapper should own only bridge responsibilities and must never become a second visible runtime.

Required wrapper behavior:

- accepts a UI snapshot
- builds normalized runtime input for `runAskPipelineAdapter`
- calls `runAskPipelineAdapter`
- catches all exceptions
- returns a sanitized diagnostics object
- never throws to caller
- never calls provider / Dify / DeepSeek / RAG / Web
- never mutates legacy answer
- can accept an injected adapter function for tests

Recommended pseudocode:

```js
export async function runAskShadowAdapter(
  snapshot,
  {
    adapter = runAskPipelineAdapter,
    providerEnabled = false,
  } = {},
) {
  const runtimeInput = buildAskShadowRuntimeInput(snapshot);

  try {
    const result = adapter(
      {
        ...runtimeInput,
        mode: "shadow",
        providerOutcome: { enabled: false, status: "not_used" },
        providerResponse: {},
        sourceRefs: [],
        claimRefs: [],
      },
      { providerEnabled: false },
    );

    return sanitizeShadowDiagnostics(result);
  } catch {
    return {
      safe: true,
      status: "shadow_wrapper_error",
      reasonCodes: ["shadow_wrapper_error"],
    };
  }
}
```

## 6. Required Tests

Phase 2C-C implementation must add and pass at least these tests:

1. legacy answer remains unchanged when shadow succeeds
2. legacy answer remains unchanged when shadow returns blocked
3. legacy answer remains unchanged when shadow throws
4. shadow result is not user-visible
5. no provider / Dify / DeepSeek / RAG / realtime Web call
6. shadow diagnostics are sanitized
7. missing `consumerModule` blocks inside shadow but does not block legacy output
8. unsupported `consumerModule` blocks inside shadow but does not block legacy output
9. `renderAskReportState` failure inside adapter does not affect legacy output
10. `sourceRefs = []` / `claimRefs = []` strategy does not affect legacy output
11. existing 119 tests still pass
12. if feasible, an App/runtime regression test proves `generateAnswer` still writes the same legacy answer state

Recommended test focus:

- assert the legacy `answer` object before and after shadow remains byte-for-byte equivalent
- assert no shadow-only diagnostic escapes into rendered JSX
- assert disabled-provider behavior matches the current `normalizeProviderOutcome(...)` contract

## 7. Future Gate Sequence

Recommended future gate order:

1. Phase 2C-C1 Design Docs
2. GPT review
3. Gemini review
4. Phase 2C-C2 Local Implementation Gate
5. GPT code review
6. Gemini code review
7. Draft PR Gate
8. Ready / Body / Merge Risk / Merge / Post-merge gates

## 8. Forbidden Scope for Phase 2C-C

Phase 2C-C implementation must explicitly forbid:

- replacing legacy Ask output
- rendering shadow report
- preview mode
- provider calls
- Dify / DeepSeek / RAG / realtime Web
- Companies UI freshness integration
- Vercel or deployment inspection
- production behavior claims
- broad `App.jsx` refactor
- CSS or UI redesign
- package changes
- env changes
- API changes
- changes to `src/utils/insightEngine.js`
- changes to the Phase 2B core validator / orchestrator / renderer files

## 9. Risk Assessment

Overall future implementation risk remains MEDIUM.

Reasoning:

- `App.jsx` will likely need a small touch because `generateAnswer` is the current runtime entry
- the visible answer state must be protected from all shadow outcomes
- bridge mapping gaps for `taskIntent`, `productFamily`, `customerSegment`, `architectureLayer`, and time handling are non-trivial
- the pure adapter foundation already exists and already isolates provider and validation states
- an isolated `runAskShadowAdapter.js` wrapper reduces the blast radius

Risk downgrade condition:

- if a future design proves `App.jsx` can remain almost unchanged and all mapping logic lives in a dedicated helper plus wrapper, implementation risk may be reclassified downward after review

## 10. Implementation Readiness Criteria

Phase 2C-C implementation may proceed only if:

- docs are merged or explicitly accepted
- candidate file scope is approved
- bridge contract is accepted by GPT and Gemini
- test matrix is accepted
- no unresolved mapping blocker remains without an explicit `"unknown"` fallback rule
- implementation gate explicitly authorizes `src` changes

