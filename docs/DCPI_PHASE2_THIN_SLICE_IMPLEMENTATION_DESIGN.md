# DCPI Phase 2A Thin Slice Implementation Design

## 1. Phase 2A Boundary

- Phase 2A is design-only.
- Phase 2A does not modify runtime.
- Phase 2A does not improve Ask answer quality by itself.
- Phase 2A does not solve Ask runtime root cause.
- Phase 2A does not authorize Phase 2B code implementation.
- Phase 2A does not authorize R1.1 or R1.2.

Phase 2A converts the Phase 1A contract set into a practical implementation design for one thin vertical slice only:

液冷 CDU 技术路线演进与准入门槛规划
Liquid Cooling CDU Technology Roadmap & Doorstep Gate

The design must stay inside the allowed scope from the Phase 1A plan:

- 看技术
- 定产品
- 定节奏
- page-context linkage
- source / claim hydration
- evidenceTrace enforcement
- missing-value markers
- validator-controlled rendering

The design explicitly excludes:

- Colo ROI
- market size projection
- overseas GTM
- full investment decision
- broad commercial strategy
- customer revenue forecast
- named customer claims without evidence

## 2. Thin Slice User Scenario

User asks from the Technology page:

`液冷 CDU 技术路线演进与准入门槛如何规划？`

Required bound scenario:

- `currentPageRoute`: `/technology`
- `currentPageModule`: `technology`
- `productFamily`: `liquid_cooling_cdu`
- `architectureLayer`: `facility_cooling`
- `taskIntent`: `technical_roadmap_and_entry_gate`
- `ProductPlanningCard.id`: `ppc_cdu_tech_gate`
- `ProductPlanningCard.version`: `v1`
- `ProductPlanningCard.stateHash`: `ppc_hash_001`
- `pageContextHash`: `ctx_hash_001`

Scenario intent:

- The user is not asking for ROI.
- The user is not asking for market size.
- The user is not asking for named customer wins.
- The user is asking for source-bound technical roadmap and entry-gate planning.

Required business output shape:

- 看技术
- 定产品
- 定节奏
- technical roadmap phases
- doorstep gate
- readiness gate
- risks
- missing inputs
- evidenceTrace-backed conclusions or explicit missing-value markers

## 3. End-to-End Data Flow

### Step 1. APP Lightweight Workspace

- Input:
  - current page route
  - current page module
  - selected filters
  - ProductPlanningCard
  - user question
- Output:
  - structured page context payload
  - `pageContextHash`
  - `ProductPlanningCard.stateHash`
  - normalized `taskIntent` candidate
- Allowed responsibility:
  - capture UI state
  - package context
  - present validator state
- Forbidden responsibility:
  - expert conclusion generation
  - local investment judgment
  - hidden fallback prose
- Failure state:
  - if route/module/state hash is missing or inconsistent, stop before provider and return blocked page-context state

### Step 2. Backend / API Orchestrator

- Input:
  - APP request payload
  - selected filters
  - product planning context
  - user question
- Output:
  - provider-ready structured request
  - `sourceRefs`
  - `claimRefs`
  - `responseFormat: structured_json_only`
- Allowed responsibility:
  - request assembly
  - source / claim selection
  - hydration orchestration
  - validator invocation
- Forbidden responsibility:
  - fabricating source data
  - inventing claims
  - bypassing validator
- Failure state:
  - `blocked_page_context_missing`
  - `blocked_page_context_mismatch`
  - `blocked_schema_error`

### Step 3. Evidence Registry Hydration

- Input:
  - `sourceRefs`
  - `claimRefs`
  - page context identifiers
- Output:
  - `expandedSourcePack`
  - `expandedClaimPack`
- Allowed responsibility:
  - pointer resolution
  - freshness attachment
  - allowed / forbidden use attachment
- Forbidden responsibility:
  - converting missing source data into narrative conclusions
  - accepting raw refs as evidence
- Failure state:
  - unresolved refs produce `source_required` or `realtime_verification_required`

### Step 4. Local KB / RAG Retrieval Boundary

- Input:
  - product family
  - architecture layer
  - user question
- Output:
  - local KB references
  - optional snippets with IDs
  - metadata candidates
- Allowed responsibility:
  - support retrieval
  - add structured references
- Forbidden responsibility:
  - outranking official evidence
  - becoming factual proof by itself
- Failure state:
  - local KB remains `L5` and cannot promote unsupported claims

### Step 5. Provider Structured Request

- Input:
  - validated request payload
  - hydrated source / claim packs
  - allowed missing-value markers
- Output:
  - provider request JSON
- Allowed responsibility:
  - constrained expert reasoning over structured evidence
- Forbidden responsibility:
  - free-text response mode
  - unbounded role drift
- Failure state:
  - `provider_error`
  - `provider_timeout`

### Step 6. Provider Structured Response

- Input:
  - provider prompt and structured payload
- Output:
  - structured JSON only
  - `pageTrace`
  - `evidenceTrace`
  - `fiveLookThreeDefine`
  - roadmap / gate / risk objects
- Allowed responsibility:
  - open-ended reasoning within schema
- Forbidden responsibility:
  - naked free text
  - missing `pageTrace`
  - factual claims without `evidenceTrace`
- Failure state:
  - invalid provider response is blocked before render

### Step 7. Validator

- Input:
  - provider JSON
  - request context
  - hydrated evidence packs
- Output:
  - `validatorStatus`
  - `renderMode`
  - `allowedToRender`
  - `blockingReasons`
  - `warnings`
  - `missingEvidence`
- Allowed responsibility:
  - schema validation
  - page-context enforcement
  - evidence enforcement
  - generic filler blocking
  - previous-track leakage blocking
- Forbidden responsibility:
  - silently downgrading blocked output into normal content
- Failure state:
  - any blocked status forces non-normal render path

### Step 8. Professional UI Renderer

- Input:
  - validated response
  - validator report
- Output:
  - one allowed UI report state
- Allowed responsibility:
  - render structured report
  - show warnings and missing-value markers
- Forbidden responsibility:
  - inventing facts
  - hiding blocked states
  - expert fallback generation
- Failure state:
  - show blocked / source-required / provider-error card instead of prose answer

## 4. Future File-level Implementation Map

This section is design-only.

Do not create or edit these files in Phase 2A.

### `src/ask/contracts/requestContract.js`

- Purpose: define request schema and pre-provider hard blocking.
- Exported function / object name:
  - `REQUEST_CONTRACT`
  - `validateRequestContract`
- Input shape:
  - request payload candidate object
- Output shape:
  - normalized request or blocking error object
- Forbidden behavior:
  - filling missing fields with business defaults

### `src/ask/contracts/responseContract.js`

- Purpose: define provider response schema and missing-value marker rules.
- Exported function / object name:
  - `RESPONSE_CONTRACT`
  - `validateResponseContract`
- Input shape:
  - provider JSON candidate
- Output shape:
  - normalized response object or schema error
- Forbidden behavior:
  - accepting naked free text

### `src/ask/contracts/validatorStatus.js`

- Purpose: centralize validator statuses, render modes, and blocked-state mapping.
- Exported function / object name:
  - `VALIDATOR_STATUS`
  - `RENDER_MODE`
  - `mapStatusToRenderMode`
- Input shape:
  - validator status code
- Output shape:
  - render mode and allowed-to-render flag
- Forbidden behavior:
  - allowing blocked status to map to full report

### `src/ask/context/buildPageContext.js`

- Purpose: build page route/module/filter context with `pageContextHash`.
- Exported function / object name:
  - `buildPageContext`
- Input shape:
  - route
  - module
  - selected filters
  - page summaries
- Output shape:
  - `pageContext`
  - `pageContextHash`
- Forbidden behavior:
  - returning empty hash for active Ask request

### `src/ask/context/buildProductPlanningCardContext.js`

- Purpose: package ProductPlanningCard identity and state hash.
- Exported function / object name:
  - `buildProductPlanningCardContext`
- Input shape:
  - card model
- Output shape:
  - card context object with `id`, `version`, `stateHash`
- Forbidden behavior:
  - dropping card identity or hash

### `src/ask/orchestrator/buildAskRequest.js`

- Purpose: assemble the full provider request payload from UI and context builders.
- Exported function / object name:
  - `buildAskRequest`
- Input shape:
  - page context
  - card context
  - question
  - task intent
  - source refs
  - claim refs
- Output shape:
  - request payload compliant with contract
- Forbidden behavior:
  - allowing provider call with missing hash, empty question, or missing task intent

### `src/ask/orchestrator/hydrateEvidencePacks.js`

- Purpose: resolve `sourceRefs` / `claimRefs` into expanded packs.
- Exported function / object name:
  - `hydrateEvidencePacks`
- Input shape:
  - `sourceRefs`
  - `claimRefs`
  - registry interfaces
- Output shape:
  - `expandedSourcePack`
  - `expandedClaimPack`
  - hydration warnings / errors
- Forbidden behavior:
  - passing unhydrated refs through as evidence

### `src/ask/provider/structuredProviderClient.js`

- Purpose: issue provider call and normalize provider transport errors.
- Exported function / object name:
  - `callStructuredProvider`
  - `normalizeProviderTransportError`
- Input shape:
  - structured request
- Output shape:
  - structured provider response
  - `provider_error`
  - `provider_timeout`
- Forbidden behavior:
  - returning raw prose on timeout or transport failure

### `src/ask/validator/validateAskResponse.js`

- Purpose: execute validator ordering and Rule ID enforcement.
- Exported function / object name:
  - `validateAskResponse`
- Input shape:
  - request payload
  - provider response
  - expanded evidence packs
- Output shape:
  - validator enforcement report
- Forbidden behavior:
  - skipping page-context or evidence checks

### `src/ask/renderer/renderAskReportState.jsx`

- Purpose: map validator outputs to UI report cards and sections.
- Exported function / object name:
  - `renderAskReportState`
  - `AskReportState`
- Input shape:
  - validator report
  - validated response
- Output shape:
  - one renderable UI state
- Forbidden behavior:
  - converting blocked output into confident expert prose

## 5. Request Payload Assembly Design

Pseudo-code only:

```text
function buildAskRequest(input):
  assert input.currentPageRoute is non-empty
  assert input.currentPageModule is non-empty
  assert input.userQuestion is non-empty
  assert input.taskIntent is non-empty
  assert input.pageContextHash is non-empty
  assert input.productPlanningCard.stateHash is non-empty

  if input.currentPageRoute/currentPageModule mismatch:
    return blocked_page_context_mismatch

  return {
    schemaVersion,
    requestId,
    currentPageRoute,
    currentPageModule,
    selectedFilters,
    productPlanningCard,
    pageContextHash,
    pageContext,
    timestamp,
    userQuestion,
    taskIntent,
    sourceRefs,
    claimRefs,
    responseFormat: "structured_json_only"
  }
```

Hard blocking before provider call:

- `pageContextHash` missing -> `blocked_page_context_missing`
- `ProductPlanningCard.stateHash` missing -> `blocked_page_context_missing`
- `currentPageRoute` / `currentPageModule` mismatch -> `blocked_page_context_mismatch`
- `taskIntent` missing -> `blocked_schema_error`
- `userQuestion` empty -> `blocked_schema_error`

## 6. Source / Claim Hydration Design

Hydration flow:

`sourceRef` / `claimRef`
-> Evidence Registry
-> `expandedSourcePack` / `expandedClaimPack`

Rules:

- Unhydrated refs are pointers only.
- Unhydrated refs cannot be rendered as evidence.
- Unhydrated refs cannot be used as factual claims.
- Hydration failure produces `source_required` or `realtime_verification_required`.
- Local KB remains `L5` unless promoted by metadata.

Pseudo-code only:

```text
function hydrateEvidencePacks(sourceRefs, claimRefs):
  expandedSourcePack = resolveSources(sourceRefs)
  expandedClaimPack = resolveClaims(claimRefs)

  if any required source ref fails:
    return hydration_error("source_required")

  if freshness cannot be verified for required source:
    return hydration_warning("realtime_verification_required")

  return { expandedSourcePack, expandedClaimPack }
```

## 6A. Source Tier Selection Matrix and Freshness Window

Do not conflict with the Phase 1A canonical source tiers.

Preserved Phase 1A source tiers:

- `L1_government_regulation`
- `L2_standard_industry_body`
- `L3_customer_cloud_operator_official`
- `L4_vendor_official`
- `L5_local_kb`
- `L6_uncorroborated_reference`

Source selection by claim type:

| Claim type | Preferred source tier order | Notes |
| --- | --- | --- |
| regulation / compliance | L1 -> L2 -> L4 | L1 controls binding policy claims |
| standard / certification | L2 -> L1 -> L4 | standards and certification must cite official bodies or vendor official docs |
| customer / cloud operator deployment | L3 -> L4 -> L2 | named customer claims require L3 customer/cloud/operator official or L4 vendor official |
| vendor product parameter | L4 -> L2 -> L3 | technical parameter must cite vendor official docs or recognized standard |
| CDU architecture rule | L2 -> L4 -> L3 | standard first, vendor architecture docs second |
| AIDC trend / customer scenario | L3 -> L2 -> L4 | must preserve freshness and context scope |
| local product planning assumption | L5 plus explicit `expertJudgment` / `user_input_required` marker | cannot back hard factual claims alone |
| unsupported third-party reference | L6 only as context | cannot back validator-approved hard claims |

Freshness windows:

- `L1_government_regulation`: verify current version before binding claim.
- `L2_standard_industry_body`: recheck at least every 180 days or when edition changes.
- `L3_customer_cloud_operator_official`: use latest annual / quarterly / official technical disclosure; recheck every reporting cycle or every 90 days for current AIDC claims.
- `L4_vendor_official`: use latest official datasheet / white paper / manual / architecture guide; recheck every 90 days for AIDC/CDU current claims.
- `L5_local_kb`: stale by default until mapped to L1-L4 evidence or explicitly labeled as local assumption.
- `L6_uncorroborated_reference`: never sufficient for hard factual claim.

Rules:

- Official sources outrank Local KB.
- Local KB may help retrieval but must not become proof.
- A claim with unknown freshness must become `realtime_verification_required`, `realtime_unverified`, or `source_required`.
- Do not use words such as `latest`, `recent`, `industry consensus`, or `current market` without freshness proof.
- `expandedSourcePack` must carry `sourceTier`, `publicationDate`, `lastVerifiedDate`, `freshnessStatus`, `allowedUse`, and `forbiddenUse`.
- `expandedClaimPack` must carry `claimType`, `sourceIds`, `freshnessStatus`, `allowedUse`, `forbiddenUse`, and `evidenceStatus`.

## 7. Provider Boundary Design

Provider request rules:

- provider receives structured request only
- provider receives hydrated evidence packs only
- provider must not receive raw refs as evidence
- provider must not be asked for free-form fallback prose

Provider response rules:

- provider returns structured JSON only
- naked free text is illegal
- provider error returns `provider_error`
- timeout returns `provider_timeout`
- provider output never bypasses Validator

Pseudo-code for provider response normalization:

```text
function normalizeProviderResponse(rawResponse):
  if transportError:
    return { providerState: "provider_error" }

  if timeout:
    return { providerState: "provider_timeout" }

  if rawResponse is not valid JSON:
    return schema_error("blocked_schema_error")

  if rawResponse contains naked free text:
    return schema_error("blocked_schema_error")

  return parsedStructuredResponse
```

## 8. Validator Execution Design

Validator order:

1. schema validation
2. page context validation
3. object validation
4. hydration validation
5. evidenceTrace validation
6. freshness validation
7. generic filler validation
8. previous-track leakage validation
9. render decision

Validator output mapping:

- `validatorStatus`
  - final pass / warning / blocked status
- `renderMode`
  - UI state selector
- `allowedToRender`
  - hard boolean gate
- `blockingReasons`
  - machine-assertable block reasons
- `warnings`
  - non-blocking evidence or freshness warnings
- `missingEvidence`
  - missing source / claim field list

Required design rule:

- No later validator step can override an earlier blocked state into a pass.

## 9. Renderer State Design

### `full_report`

- Trigger condition:
  - `validatorStatus: pass`
- Allowed content:
  - complete structured report
  - evidence trace
  - roadmap / gate / risks
- Forbidden content:
  - hidden fallback text
- User-facing message style:
  - confident but source-bound professional report

### `warning_report`

- Trigger condition:
  - `validatorStatus: pass_with_warnings`
- Allowed content:
  - structured report plus explicit warning banner
- Forbidden content:
  - suppressing warnings
- User-facing message style:
  - usable report with visible caution

### `source_required_report`

- Trigger condition:
  - `validatorStatus: blocked_source_required`
- Allowed content:
  - source-required sections
  - missing evidence list
  - explicit markers
- Forbidden content:
  - invented conclusions
- User-facing message style:
  - constrained, explicit, non-speculative

### `blocked_report`

- Trigger condition:
  - blocked schema, page-context, object, policy, freshness, or generic filler status
- Allowed content:
  - block reason
  - corrective instruction
- Forbidden content:
  - normal report sections
- User-facing message style:
  - direct and corrective

### `provider_error_card`

- Trigger condition:
  - provider transport or service error
- Allowed content:
  - service unavailable notice
- Forbidden content:
  - fallback expert answer
- User-facing message style:
  - short operational failure card

### `provider_timeout_card`

- Trigger condition:
  - provider timeout
- Allowed content:
  - timeout message
  - retry suggestion
- Forbidden content:
  - speculative answer body
- User-facing message style:
  - retry-oriented status card

### `data_refreshed_regenerate_required_card`

- Trigger condition:
  - `blocked_page_context_mismatch`
- Allowed content:
  - stale context warning
  - regenerate instruction
- Forbidden content:
  - old response body
- User-facing message style:
  - explicit refresh / regenerate prompt

### `user_input_required_card`

- Trigger condition:
  - question lacks required context dimension
- Allowed content:
  - required missing inputs
- Forbidden content:
  - inferred missing business facts
- User-facing message style:
  - guided clarification request

### Renderer Content Exclusivity Rules

Rules:

1. `blocked_report` is exclusive.
   - It must render only:
     - `blockingReasons`
     - exact failed field / Rule ID when available
     - corrective instruction
   - It must not render:
     - `fiveLookThreeDefine`
     - roadmap
     - `doorstepGate`
     - `readinessGate`
     - risks
     - normal report sections
     - speculative business suggestions
     - local expert prose

2. `source_required_report` is evidence-request only.
   - It may render:
     - `missingEvidence`
     - `sourceRequiredItems`
     - `claimIds` needing evidence
     - required source tier
     - user action needed to provide source
   - It must not render:
     - inferred recommendation
     - roadmap conclusion
     - product entry recommendation
     - customer / ROI / launch / parameter claims
     - prose suggestions pretending to be professional advice

3. `provider_error_card` and `provider_timeout_card` are operational states only.
   - They may render:
     - provider error / timeout message
     - retry instruction
     - escalation instruction
   - They must not trigger:
     - local expert fallback answer
     - hidden static CDU answer
     - generic liquid cooling roadmap text
     - cached old response body

4. `full_report` must render required metadata.
   - It must show:
     - `evidenceTrace`
     - `pageTrace`
     - `validatorStatus`
     - `freshnessNotice`
     - missing markers, if any
   - If any of these are missing, renderer must downgrade to `warning_report` or block according to validator result.

5. `warning_report` must display warnings visibly.
   - It must not hide freshness warnings, partial evidence warnings, or missing optional fields.

6. No renderer state may convert a blocked validator status into normal expert text.

Renderer must not:

- hide validator warnings
- turn blocked claims into confident prose
- invent missing facts
- generate local expert fallback text

## 10. Historical Failure Protection

1. Ask cannot connect with previous modules.
   - Protection: `pageContextHash`, `ProductPlanningCard.stateHash`, `pageTrace`, route/module blocking.
2. Ask output is too generic / too AI.
   - Protection: structured JSON, generic filler blocking, no business defaults, required evidence markers.
3. Ask cannot parse open-ended questions accurately.
   - Protection: explicit `taskIntent`, structured request assembly, clarification / missing-input handling.
4. Ask leaks previous product / previous page content.
   - Protection: previous-track leakage validation and cross-page drift blocking.
5. Ask fabricates claims without evidence.
   - Protection: hydration before provider reasoning, `evidenceTrace` enforcement, `source_required` markers.
6. Ask uses shallow tests to pass.
   - Protection: Rule ID-based matrix with validator status + render mode + blocking reasons assertions together.

## 11. Non-goals

- no source implementation
- no runtime change
- no tests implementation
- no Vercel / Dify / env change
- no R1.1
- no R1.2
- no Ask fix claim
- no production quality claim

## 12. Phase 2B Entry Criteria

Phase 2B can only start after:

- Phase 2A docs reviewed by GPT
- Phase 2A docs reviewed by Gemini
- user explicitly authorizes Phase 2B
- implementation file list is approved
- test matrix is approved
- rollback plan is approved
- no unresolved blockers remain
