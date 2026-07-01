# DCPI Phase 2C-C Shadow Bridge Contract

## 1. Purpose

Phase 2C-C defines Shadow Mode Wiring with Legacy Output Default.

This contract is design-only and exists to define the bridge between the current Ask UI state and the Phase 2B adapter foundation before any runtime wiring starts.

Mandatory Phase 2C-C purpose boundaries:

- shadow mode is side-channel only
- legacy answer remains the only user-visible output
- shadow result is not rendered
- shadow failure does not block legacy answer
- no provider / Dify / DeepSeek / RAG / realtime Web calls
- no Preview Mode
- no production behavior claim

## 2. Runtime Entry

The current Ask runtime entry is in `src/App.jsx`.

The current Ask action is:

- `generateAnswer`
- `setAnswer(generateStructuredAskPowerInsightAnswer(question, filters))`

The current visible Ask state is:

- `answer`

The current visible Ask rendering path is:

- `src/App.jsx`
- `generateStructuredAskPowerInsightAnswer(question, filters)`
- `src/utils/insightEngine.js`
- legacy answer object
- `App.jsx` `answer` state
- `App.jsx` render tree

Phase 2C-C must preserve that path as the only visible output path.

The future shadow bridge may be inserted only as a small side-channel adjacent to `generateAnswer`. It must not replace the legacy call and must not change how `answer` is rendered.

## 3. Legacy Output Protection Contract

The following rules are hard requirements:

- `setAnswer(...)` must continue to receive only legacy output
- shadow output must never be assigned to `answer`
- shadow status must never determine whether legacy answer is rendered
- shadow exception must be swallowed by the shadow wrapper
- no CSS change
- no layout change
- no visual output change
- no UI copy change
- no route or default-tab behavior change

## 4. UI Snapshot Contract

The shadow bridge must capture one immutable Ask-time snapshot before any shadow execution starts.

Required snapshot fields:

- `question`
- `filters`
- `context.normalizedFilters`
- `insightContext`
- `timestamp`
- `currentPageRoute`
- `currentPageModule`

Recommended snapshot shape:

```js
{
  question,
  filters,
  normalizedFilters: context.normalizedFilters,
  insightContext,
  timestamp: new Date().toISOString(),
  currentPageRoute: "/ask",
  currentPageModule: "ask",
}
```

Contract notes:

- `currentPageRoute` should default to `"/ask"` because the execution entry is the Ask tab.
- `currentPageModule` should default to `"ask"` so the value remains consistent with the current `ROUTE_MODULE_MAP` in `src/ask/context/buildPageContext.js`.
- `insightContext` should be deep-cloned before the shadow call to prevent accidental mutation during side-channel execution.
- The snapshot must remain immutable for the lifetime of the shadow call.
- If future work needs upstream-page hints, they must be added as extra metadata and must not replace `"/ask"` / `"ask"` as the top-level route-module pair.

## 5. UI Filters to Adapter selectedFilters Mapping

The bridge must distinguish three cases:

1. safe deterministic mapping
2. unresolved mapping
3. forbidden inference

Safe deterministic mapping means an explicit local lookup table exists and is covered by tests.

Unresolved mapping means the bridge records a bounded diagnostics reason and uses `"unknown"`, `"not_available"`, or omission without affecting legacy output.

Forbidden inference means the bridge must not guess a domain value from broad UI intent, vague wording, or company-specific assumptions.

### 5.1 Mapping Table

| UI filter | Current UI values | Intended adapter field | Phase 2C-C bridge rule |
| --- | --- | --- | --- |
| `role` | `高管`, `投资者`, `市场`, `产品`, `研发` | no direct `selectedFilters.*` field | keep in snapshot/page context only; do not coerce into `productFamily`, `customerSegment`, `region`, or `architectureLayer`; add `shadow_mapping_unresolved_role` |
| `region` | `全球`, `中国`, `北美`, `欧洲`, `亚太` | `selectedFilters.region`, `productPlanningCard.region` | use explicit local lookup only; recommended lookup: `全球 -> global`, `中国 -> CN`, `北美 -> NA`, `欧洲 -> EU`, `亚太 -> APAC`; otherwise set `"unknown"` and add `shadow_mapping_unresolved_region` |
| `customer` | `全部`, `云服务商`, `第三方数据中心`, `电信运营商`, `金融`, `制造业`, `能源与电力`, `政府`, `边缘计算` | `selectedFilters.customerSegment`, `productPlanningCard.customerSegment` | only populate from approved one-to-one lookups; the current repo proves `云服务商 -> AIDC_cloud` through existing tests, but other labels should remain `"unknown"` until explicitly approved and tested |
| `application` | `全部`, `AI 训练集群`, `AI 推理集群`, `超大规模数据中心`, `第三方托管数据中心`, `存量改造`, `新建 AI Factory`, `边缘数据中心` | `selectedFilters.architectureLayer` | default unresolved; application scenario is not the same thing as architecture layer; set `"unknown"` and add `shadow_mapping_unresolved_application` unless a future gate adds a tested lookup |
| `track` | `全部`, `UPS`, `模块化 UPS`, `HVDC`, `800VDC`, `液冷`, `BBU`, `变压器`, `开关柜`, `GaN/SiC`, `SST`, `一体化电力模块`, `微模块` | `selectedFilters.productFamily`, possibly `productPlanningCard.productFamily` | default unresolved for broad tracks; do not infer a specific product family such as `liquid_cooling_cdu` from a generic track like `液冷`; set `"unknown"` and add `shadow_mapping_unresolved_track` unless a future gate approves a one-to-one mapping |
| `time` | `2025`, `2026`, `2027`, `2030` | `selectedFilters.timeframe` or request `timeWindow` | keep raw year in snapshot; if the future adapter formally supports `selectedFilters.timeframe`, pass the year string through unchanged; otherwise omit from adapter input and add `shadow_mapping_unresolved_time` |

### 5.2 Mapping Rules

Mandatory mapping rules:

- do not invent domain mapping
- use explicit `"unknown"` / `"not_available"` / omitted value strategy
- record a shadow diagnostics reason code when mapping is unresolved
- unresolved mapping must never affect legacy answer
- unresolved mapping must never trigger a visible warning in the legacy UI

Forbidden inference examples:

- inferring `architectureLayer` directly from `AI 训练集群`
- inferring `productFamily` directly from `液冷`
- inferring customer segment from a named company mentioned in the question
- inferring a deployment mode or workload type that the UI did not collect

## 6. taskIntent Derivation Strategy

Phase 2C-C task intent derivation must remain deterministic and local.

Requirements:

- no LLM classification
- no provider call
- no Dify / DeepSeek
- based on question text and current page context only
- fallback must be a conservative Ask default
- unresolved intent must produce shadow diagnostics only
- unresolved intent must never block legacy answer

Phase 2C-C should reuse already-proven task-intent names where possible:

- `technical_roadmap_and_entry_gate`
- `company_fact_check`

Recommended deterministic derivation:

```js
function deriveShadowTaskIntent({ question, currentPageModule }) {
  const text = String(question || "").toLowerCase();

  if (
    currentPageModule === "companies"
    || /company|vendor|competitor|厂商|公司|客户/.test(text)
  ) {
    return {
      taskIntent: "company_fact_check",
      reasonCodes: [],
    };
  }

  if (
    currentPageModule === "technology"
    || /roadmap|gate|milestone|技术|路线|门槛|验证/.test(text)
  ) {
    return {
      taskIntent: "technical_roadmap_and_entry_gate",
      reasonCodes: [],
    };
  }

  return {
    taskIntent: "technical_roadmap_and_entry_gate",
    reasonCodes: ["shadow_task_intent_defaulted"],
  };
}
```

This contract intentionally prefers a small, tested intent vocabulary over an expanded but weakly grounded taxonomy.

## 7. pageContextHash Strategy

The bridge must use a deterministic, stable, local hash strategy.

Requirements:

- based on `currentPageRoute`, `currentPageModule`, normalized filters, and a timestamp strategy only if truly needed
- no external dependency
- no crypto package addition
- no network
- stable enough for shadow diagnostics
- never user-visible

Phase 2C-C should reuse the existing local hashing approach already present in `src/ask/context/buildPageContext.js`:

- `stableStringify(...)`
- `createDeterministicHash(...)`

Recommended strategy:

- hash route
- hash module
- hash normalized UI filters
- hash the mapped shadow `selectedFilters`
- hash the minimal `productPlanningCard` seed
- keep `timestamp` outside the hash by default so repeated identical asks stay comparable

Recommended pseudocode:

```js
const hashPayload = {
  currentPageRoute,
  currentPageModule,
  normalizedFilters,
  mappedSelectedFilters,
  productPlanningCardSeed,
};

const pageContextHash = createDeterministicHash(hashPayload);
```

Timestamp strategy:

- store `timestamp` separately in the shadow snapshot
- do not add raw timestamp entropy to `pageContextHash` in Phase 2C-C
- if collision handling is ever needed later, add a coarse optional bucket only under a separate approved gate

## 8. productPlanningCard Minimal Stub Contract

Phase 2C-C needs a minimal safe stub that satisfies the request contract without creating a visible Product Planning Card artifact.

Required stub fields:

- `id`
- `version`
- `stateHash`
- `productFamily`
- `customerSegment`
- `region`
- `architectureLayer`

Recommended stub shape:

```js
{
  id: `shadow_ppc_${currentPageModule}_${pageContextHash}`,
  version: "shadow_bridge_v1",
  stateHash: `ppc_${pageContextHash.replace(/^ctx_/, "")}`,
  productFamily: mappedSelectedFilters.productFamily || "unknown",
  customerSegment: mappedSelectedFilters.customerSegment || "unknown",
  region: mappedSelectedFilters.region || "unknown",
  architectureLayer: mappedSelectedFilters.architectureLayer || "unknown",
}
```

Rules:

- generated only for shadow bridge
- no user-visible card creation
- no Product page behavior change
- unresolved fields must be marked as `unknown` or `not_available`
- must not fabricate customer or project evidence
- should remain compatible with `buildProductPlanningCardContext(...)`

## 9. sourceRefs / claimRefs Strategy

Phase 2C-C shadow policy for evidence references should remain explicitly empty.

Recommended strategy:

- `sourceRefs = []`
- `claimRefs = []`

Rules:

- no retrieval
- no RAG
- no Dify
- no DeepSeek
- no Web
- source-required outcomes are acceptable in shadow
- blocked outcomes are acceptable in shadow
- provider-error outcomes are acceptable in shadow
- these outcomes must never affect legacy answer

## 10. providerOutcome / providerResponse Strategy

Provider interaction must stay disabled.

Phase 2C-C contract:

- `providerOutcome` must be disabled / not used
- `providerResponse` must be empty
- no `providerInvoker`
- no actual model or API call
- no secrets
- shadow diagnostics must remain sanitized

Recommended bridge behavior:

```js
const providerOptions = { providerEnabled: false };
const providerOutcome = { enabled: false, status: "not_used" };
const providerResponse = {};
```

This remains consistent with the current `normalizeProviderOutcome(...)` behavior, which already normalizes disabled provider state to `provider_status: "not_used"`.

## 11. Shadow Diagnostics Storage Strategy

Recommended default:

- internal in-memory side-channel only
- likely `useRef` in `App.jsx` or a small local callback passed to the shadow wrapper
- not rendered
- not persisted
- not written to `localStorage`
- not attached to `window` by default
- not sent to network
- not logged to console by default in production
- sanitized and bounded if retained

Recommended retained diagnostics fields:

- `requestId`
- `pageContextHash`
- `taskIntent`
- `status`
- `validatorStatus`
- `renderMode`
- `reasonCodes`
- `timings`

Recommended bounds:

- keep only the latest N shadow attempts in memory, where N is small
- truncate free-text fields if any future gate allows them
- never store provider payloads, raw stack traces, auth headers, or env-like strings

Explicitly rejected as the Phase 2C-C default:

- `window.__DCPI_SHADOW_LOGS__`
- `localStorage`
- `sessionStorage`
- backend logging
- Vercel or deployment telemetry
- Dify logging

Those options require a later explicit dev-only diagnostics gate if they are ever reconsidered.

## 12. Shadow Execution Contract

Future shadow execution must follow this order:

1. capture UI snapshot
2. compute legacy answer exactly as today
3. set legacy answer exactly as today
4. run shadow adapter as a side-channel in a safe wrapper
5. swallow all shadow errors
6. store sanitized bounded diagnostics only if allowed
7. never modify visible answer

Recommended control-flow sketch:

```js
const snapshot = captureShadowSnapshot();
const legacyAnswer = generateStructuredAskPowerInsightAnswer(question, filters);

setAnswer(legacyAnswer);

void runAskShadowAdapter(snapshot, { providerEnabled: false })
  .then(storeShadowDiagnosticsIfAllowed)
  .catch(() => {
    // swallow by contract
  });
```

Mandatory execution guarantees:

- visible behavior must remain correct even if shadow blocks
- visible behavior must remain correct even if shadow errors
- visible behavior must remain correct even if shadow throws
- shadow may complete later than legacy answer and still must not mutate visible state

## 13. Non-Claims

This design doc does not claim:

- Ask runtime is fixed
- Ask output quality is improved
- Dify is active
- DeepSeek is active
- RAG is active
- realtime Web is active
- provider is active
- Preview Mode is active
- production behavior is verified

