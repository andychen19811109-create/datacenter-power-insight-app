# DCPI Data Schema And Validator Contract

## 7.1 Purpose

Define the three required contract layers:

1. Request Payload Context
2. Response Payload LLM JSON
3. Validator Enforcement Report

## 7.1A Contract Notation

Notation:

- `type`: expected data type
- `required`: field must exist
- `enum`: field must match one of the listed values
- `minLength: 1`: empty string is forbidden
- `nullable: false`: null is forbidden
- `sourceBound: true`: field must be backed by `evidenceTrace` unless set to an allowed missing-value marker
- `echoRequired: true`: response must echo request value exactly
- `registryHydrated: true`: value must come from Evidence Registry hydration

Allowed missing-value markers:

- `source_required`
- `user_input_required`
- `no_quantified_data`
- `realtime_verification_required`
- `not_applicable`

Rules:

- Empty strings are forbidden in Request Payload, Response Payload, and Validator Enforcement Report.
- Text fields must not use business-biased fallback defaults.
- If evidence is missing, use one of the allowed missing-value markers.
- If a field is `sourceBound` and has no `evidenceTrace`, Validator must block or downgrade.
- JSON examples are non-normative; Type Definitions and Validator Mapping Table are normative.
- No provider response may be rendered unless it passes Validator Enforcement Report.

## 7.1B Request Payload Type Definition

Required top-level fields:

- `schemaVersion`
- `requestId`
- `userQuestion`
- `taskIntent`
- `currentPageRoute`
- `currentPageModule`
- `pageContextHash`
- `timestamp`
- `selectedFilters`
- `productPlanningCard`
- `pageContext`
- `responseFormat`

Field constraints:

| Field | Type | Required | Constraint |
| --- | --- | --- | --- |
| schemaVersion | string | yes | minLength: 1 |
| requestId | string | yes | minLength: 1 |
| userQuestion | string | yes | minLength: 1 |
| taskIntent | string | yes | enum controlled by router contract |
| currentPageRoute | string | yes | minLength: 1 |
| currentPageModule | string | yes | enum: overview, market, product, technology, companies, ask |
| pageContextHash | string | yes | minLength: 1 |
| timestamp | string | yes | ISO timestamp |
| responseFormat | string | yes | enum: structured_json_only |
| productPlanningCard.id | string | yes | minLength: 1 |
| productPlanningCard.version | string | yes | minLength: 1 |
| productPlanningCard.stateHash | string | yes | minLength: 1 |
| pageContext.pageContextHash | string | yes | must equal top-level pageContextHash |

Blocking:

- Missing `currentPageRoute` -> `blocked_page_context_missing`
- Missing `pageContextHash` -> `blocked_page_context_missing`
- Missing `userQuestion` -> `blocked_schema_error`
- Empty string in required field -> `blocked_schema_error`
- `currentPageRoute` / `currentPageModule` mismatch -> `blocked_page_context_mismatch`
- `productPlanningCard.stateHash` mismatch -> `blocked_page_context_mismatch`

## 7.1C Response Payload Type Definition

Required top-level fields:

- `schemaVersion`
- `responseId`
- `taskIntent`
- `resolvedObjects`
- `entityRoles`
- `decisionSummary`
- `fiveLookThreeDefine`
- `technicalRoadmap`
- `doorstepGate`
- `readinessGate`
- `risks`
- `missingInputs`
- `sourceRequiredItems`
- `evidenceTrace`
- `pageTrace`
- `freshnessNotice`
- `validatorHints`

Field constraints:

| Field | Type | Required | Constraint |
| --- | --- | --- | --- |
| schemaVersion | string | yes | minLength: 1 |
| responseId | string | yes | minLength: 1 |
| taskIntent | string | yes | must match `request.taskIntent` |
| decisionSummary | string | yes | sourceBound or allowed missing-value marker |
| fiveLookThreeDefine.lookTrend | string | yes | sourceBound or allowed missing-value marker |
| fiveLookThreeDefine.lookCustomer | string | yes | sourceBound or allowed missing-value marker |
| fiveLookThreeDefine.lookCompetition | string | yes | sourceBound or allowed missing-value marker |
| fiveLookThreeDefine.lookSelf | string | yes | sourceBound or allowed missing-value marker |
| fiveLookThreeDefine.lookTechnology | string | yes | sourceBound or allowed missing-value marker |
| fiveLookThreeDefine.defineDirection | string | yes | sourceBound or allowed missing-value marker |
| fiveLookThreeDefine.defineProduct | string | yes | sourceBound or allowed missing-value marker |
| fiveLookThreeDefine.defineRhythm | string | yes | sourceBound or allowed missing-value marker |
| evidenceTrace | array | yes | required for non-marker factual claims |
| pageTrace | array | yes | echoRequired |
| freshnessNotice | string | yes | enum: current, stale, realtime_unverified, unknown, realtime_verification_required |

Blocking:

- Missing `evidenceTrace` for factual claim -> `blocked_source_required`
- Missing `pageTrace` -> `blocked_page_context_missing`
- `pageTrace` echo mismatch -> `blocked_page_context_mismatch`
- Empty `fiveLookThreeDefine` field -> `blocked_schema_error`
- Naked free text outside JSON -> `blocked_schema_error`

## 7.1D Validator Enforcement Report Type Definition

Required top-level fields:

- `validatorStatus`
- `blockingReasons`
- `warnings`
- `missingEvidence`
- `objectMismatch`
- `pageContextStatus`
- `freshnessStatus`
- `genericFillerFindings`
- `previousTrackLeakage`
- `allowedToRender`
- `renderMode`

Allowed `validatorStatus` values:

- `pass`
- `pass_with_warnings`
- `blocked_source_required`
- `blocked_object_mismatch`
- `blocked_schema_error`
- `blocked_policy_violation`
- `blocked_generic_filler`
- `blocked_page_context_missing`
- `blocked_page_context_mismatch`
- `blocked_freshness_unverified`

Allowed `renderMode` values:

- `full_report`
- `warning_report`
- `source_required_report`
- `blocked_report`

Rules:

- `allowedToRender` must be `false` for every `blocked_*` status.
- `renderMode` must be `blocked_report` for `blocked_schema_error`, `blocked_object_mismatch`, `blocked_policy_violation`, `blocked_generic_filler`, `blocked_page_context_missing`, and `blocked_page_context_mismatch`.
- `renderMode` must be `source_required_report` for `blocked_source_required`.
- `renderMode` may be `warning_report` for `pass_with_warnings`.
- `renderMode` must be `full_report` only when `validatorStatus` is `pass`.

## 7.2 Request Payload Contract

Request payload may carry lightweight refs only:

- `sourceRefs`
- `claimRefs`

Example JSON:

```json
{
  "schemaVersion": "1.0.0",
  "requestId": "req_2026_07_01_0001",
  "userQuestion": "液冷 CDU 技术路线演进与准入门槛如何规划？",
  "taskIntent": "technical_roadmap_and_entry_gate",
  "currentPageRoute": "/technology",
  "currentPageModule": "technology",
  "pageContextHash": "ctx_hash_001",
  "timestamp": "2026-07-01T00:00:00Z",
  "selectedFilters": {
    "productFamily": "liquid_cooling_cdu",
    "customerSegment": "AIDC_cloud",
    "region": "CN",
    "architectureLayer": "facility_cooling"
  },
  "productPlanningCard": {
    "id": "ppc_cdu_tech_gate",
    "version": "v1",
    "stateHash": "ppc_hash_001",
    "productFamily": "liquid_cooling_cdu",
    "architectureLayer": "facility_cooling",
    "customerSegment": "AIDC_cloud",
    "region": "CN"
  },
  "pageContext": {
    "overview": "overview context summary",
    "market": "market context summary",
    "product": "product context summary",
    "technology": "technology context summary",
    "companies": "companies context summary",
    "pageContextHash": "ctx_hash_001"
  },
  "sourceRefs": [
    {
      "sourceId": "src_001",
      "sourceTier": "L4_vendor_official",
      "registryKey": "registry_src_001",
      "pageContextHash": "ctx_hash_001",
      "allowedUseHint": "technical_roadmap_only"
    }
  ],
  "claimRefs": [
    {
      "claimId": "clm_001",
      "objectId": "obj_cdu",
      "claimType": "technical_parameter",
      "registryKey": "registry_clm_001",
      "pageContextHash": "ctx_hash_001"
    }
  ],
  "localKbPack": [
    {
      "sourceId": "kb_001",
      "sourceTier": "L5_local_kb"
    }
  ],
  "missingContext": [],
  "forbiddenClaims": [
    "tam_without_source",
    "named_customer_without_official_evidence"
  ],
  "responseFormat": "structured_json_only"
}
```

## 7.2A Ref Payload vs Expanded Registry Object

Request payload may include lightweight references:

`sourceRefs`:

- `sourceId`
- `sourceTier`
- `registryKey`
- `pageContextHash`
- `allowedUseHint`

`claimRefs`:

- `claimId`
- `objectId`
- `claimType`
- `registryKey`
- `pageContextHash`

Backend / API Orchestrator must hydrate refs into:

`expandedSourcePack`

- `sourceId`
- `title`
- `organization`
- `sourceTier`
- `url` or `localPath`
- `publicationDate`
- `lastVerifiedDate`
- `freshnessStatus`
- `allowedUse`
- `forbiddenUse`

`expandedClaimPack`

- `claimId`
- `claimText`
- `objectId`
- `claimType`
- `sourceIds`
- `confidence`
- `allowedUse`
- `forbiddenUse`
- `freshnessStatus`

Rules:

- Provider must not receive unhydrated refs as factual evidence.
- Validator must not approve unhydrated refs as evidence.
- Renderer must not show unhydrated refs as sources.
- Hydration failure must produce `source_required` or `realtime_verification_required`.
- `expandedSourcePack` / `expandedClaimPack` are required before factual claims can be rendered.

## 7.3 Response Payload Contract

Example JSON:

```json
{
  "schemaVersion": "1.0.0",
  "responseId": "resp_2026_07_01_0001",
  "taskIntent": "technical_roadmap_and_entry_gate",
  "resolvedObjects": [
    {
      "objectId": "obj_cdu",
      "objectType": "product",
      "objectName": "Liquid Cooling CDU"
    }
  ],
  "entityRoles": [
    {
      "entityId": "obj_cdu",
      "role": "primary_product_object"
    }
  ],
  "decisionSummary": "source_required",
  "fiveLookThreeDefine": {
    "lookTrend": "source_required",
    "lookCustomer": "user_input_required",
    "lookCompetition": "source_required",
    "lookSelf": "user_input_required",
    "lookTechnology": "source_required",
    "defineDirection": "source_required",
    "defineProduct": "source_required",
    "defineRhythm": "source_required"
  },
  "technicalRoadmap": [
    {
      "phase": "P1",
      "milestone": "source_required",
      "status": "source_required"
    }
  ],
  "doorstepGate": {
    "gateName": "source_required",
    "status": "source_required"
  },
  "readinessGate": {
    "gateName": "source_required",
    "status": "realtime_verification_required"
  },
  "risks": [
    "realtime_verification_required"
  ],
  "missingInputs": [
    "user_input_required"
  ],
  "sourceRequiredItems": [
    "technical_parameter",
    "certification"
  ],
  "evidenceTrace": [],
  "pageTrace": [
    {
      "currentPageRoute": "/technology",
      "currentPageModule": "technology",
      "pageContextHash": "ctx_hash_001",
      "productPlanningCardId": "ppc_cdu_tech_gate",
      "productPlanningCardVersion": "v1",
      "productPlanningCardStateHash": "ppc_hash_001"
    }
  ],
  "freshnessNotice": "realtime_verification_required",
  "validatorHints": [
    "block_named_customer_without_official_source"
  ]
}
```

For fields without evidence, require one of:

- `source_required`
- `user_input_required`
- `no_quantified_data`
- `realtime_verification_required`
- `not_applicable`

Do not allow empty strings or speculative prose.

## 7.4 Validator Enforcement Report Contract

Example JSON:

```json
{
  "validatorStatus": "blocked_source_required",
  "blockingReasons": [
    "named customer claim missing official evidence"
  ],
  "warnings": [
    "freshness unverified for technical parameter"
  ],
  "missingEvidence": [
    {
      "claimId": "clm_002",
      "requiredField": "sourceIds"
    }
  ],
  "objectMismatch": [],
  "pageContextStatus": "pass",
  "freshnessStatus": "realtime_unverified",
  "genericFillerFindings": [],
  "previousTrackLeakage": [],
  "allowedToRender": false,
  "renderMode": "source_required_report"
}
```

Allowed `validatorStatus` values:

- `pass`
- `pass_with_warnings`
- `blocked_source_required`
- `blocked_object_mismatch`
- `blocked_schema_error`
- `blocked_policy_violation`
- `blocked_generic_filler`
- `blocked_page_context_missing`
- `blocked_page_context_mismatch`
- `blocked_freshness_unverified`

Allowed `renderMode` values:

- `full_report`
- `warning_report`
- `source_required_report`
- `blocked_report`

## 7.5 Evidence / Source Contract

Every source must include:

- `sourceId`
- `title`
- `organization`
- `sourceTier`
  - `L1_government_regulation`
  - `L2_standard_industry_body`
  - `L3_customer_cloud_operator_official`
  - `L4_vendor_official`
  - `L5_local_kb`
  - `L6_uncorroborated_reference`
- `url` or `localPath`
- `publicationDate`
- `lastVerifiedDate`
- `freshnessStatus`
  - `current`
  - `stale`
  - `realtime_unverified`
  - `unknown`
- `allowedUse`
- `forbiddenUse`

Every claim must include:

- `claimId`
- `claimText`
- `objectId`
- `claimType`
- `sourceIds`
- `confidence`
- `allowedUse`
- `forbiddenUse`
- `freshnessStatus`

## 7.6 No Business Defaults

JSON Schema must not use business-biased default values.

Forbidden:

- default TAM values
- default ROI values
- default product recommendation
- default launch timing
- default named customers
- default efficiency / capacity / reliability values
- default market share

If evidence is missing, use:

- `source_required`
- `user_input_required`
- `no_quantified_data`
- `realtime_verification_required`
- `not_applicable`

## 7.7 Validator Blocking Rules

Validator must block or downgrade:

1. TAM / ROI / market share without sources
2. named customer claims without official evidence
3. certification claims without official evidence
4. launch date claims without official evidence
5. technical parameters without source
6. object mismatch
7. alternative solution promoted to primary object
8. SST short-term revenue or commercialization claims without official evidence
9. generic AI filler as core conclusion
10. previous product leakage after product switching
11. time-window mismatch
12. missing page context
13. missing evidenceTrace
14. missing AIDC freshness fields
15. fiveLookThreeDefine missing or empty
16. schema violation
17. naked free text from LLM provider
18. hidden fallback expert prose

## 7.7A Validator Rule Mapping Table

| Rule ID | Blocking Condition | validatorStatus | renderMode |
| --- | --- | --- | --- |
| VAL_ERR_001 | TAM / ROI / market share claim has empty sourceIds or missing evidenceTrace | blocked_source_required | source_required_report |
| VAL_ERR_002 | named customer claim lacks official L3 customer or L4 vendor evidence | blocked_source_required | source_required_report |
| VAL_ERR_003 | certification claim lacks official certification or vendor official evidence | blocked_source_required | source_required_report |
| VAL_ERR_004 | launch date claim lacks official evidence | blocked_source_required | source_required_report |
| VAL_ERR_005 | technical parameter claim lacks sourceIds or freshnessStatus | blocked_source_required | source_required_report |
| VAL_ERR_006 | response primary object differs from request productPlanningCard object | blocked_object_mismatch | blocked_report |
| VAL_ERR_007 | alternative solution is promoted to primary object without explicit user intent | blocked_object_mismatch | blocked_report |
| VAL_ERR_008 | SST short-term revenue or commercialization claim lacks official evidence | blocked_policy_violation | blocked_report |
| VAL_ERR_009 | generic filler phrase is used as a core conclusion without product object, context dimension, evidence marker, and decision structure | blocked_generic_filler | blocked_report |
| VAL_ERR_010 | response contains previous product / previous page content after product switching | blocked_policy_violation | blocked_report |
| VAL_ERR_011 | time-window in response does not match request or source freshness | blocked_freshness_unverified | blocked_report |
| VAL_ERR_012 | request is missing pageContextHash or required page context fields | blocked_page_context_missing | blocked_report |
| VAL_ERR_013 | factual claim lacks evidenceTrace | blocked_source_required | source_required_report |
| VAL_ERR_014 | AIDC-related claim lacks publicationDate, lastVerifiedDate, or freshnessStatus | blocked_freshness_unverified | blocked_report |
| VAL_ERR_015 | fiveLookThreeDefine is missing, empty, or contains empty strings | blocked_schema_error | blocked_report |
| VAL_ERR_016 | response violates required schema, enum, or minLength constraint | blocked_schema_error | blocked_report |
| VAL_ERR_017 | LLM provider returns naked free text instead of structured JSON | blocked_schema_error | blocked_report |
| VAL_ERR_018 | system attempts hidden fallback expert prose after provider error or timeout | blocked_policy_violation | blocked_report |

Rules:

- Phase 2 tests must target Rule IDs, not generic keywords.
- `.toContain()` on short generic keywords is not sufficient.
- Each Rule ID must have at least one positive pass test and one negative block test before implementation can pass.
- Validator test output must assert `validatorStatus`, `renderMode`, `allowedToRender`, and `blockingReasons` together.

## 7.8 Generic Filler Negative Assertions

Include generic filler phrase examples:

- 平台化和规模交付
- 加强可靠性
- 全面优化
- 持续提升
- 深化布局
- 打造生态
- 赋能客户
- 降本增效
- 推动高质量发展
- 端到端能力全面升级

These fail only when used as core conclusions without product object, context dimension, evidence marker, and decision-structure support.

## 7.9 Test Derivability

The contract must be directly convertible into Phase 2 tests.

Tests must include:

- schema validation
- object correctness
- page-context linkage
- evidenceTrace presence
- source_required behavior
- freshness blocking
- generic filler negative assertions
- SST commercialization hallucination blocking
- alternative-to-primary blocking
- previous-track leakage blocking
- fiveLookThreeDefine completeness
- no naked provider text
- no local fallback expert prose

State that `.toContain()` on short generic keywords is insufficient as an acceptance test.
