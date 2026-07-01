# DCPI Data Schema And Validator Contract

## 7.1 Purpose

Define the three required contract layers:

1. Request Payload Context
2. Response Payload LLM JSON
3. Validator Enforcement Report

## 7.2 Request Payload Contract

Example JSON:

```json
{
  "schemaVersion": "1.0.0",
  "requestId": "req_2026_07_01_0001",
  "userQuestion": "液冷 CDU 技术路线演进与准入门槛如何规划？",
  "taskIntent": "technical_roadmap_and_entry_gate",
  "currentPageRoute": "/technology",
  "currentPageModule": "technology",
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
  "sourcePack": [
    {
      "sourceId": "src_001",
      "sourceTier": "L4_vendor_official"
    }
  ],
  "claimPack": [
    {
      "claimId": "clm_001",
      "objectId": "obj_cdu"
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
  "decisionSummary": "Define CDU entry gate by technical readiness and source-backed boundary conditions.",
  "fiveLookThreeDefine": {
    "lookTrend": "source_required",
    "lookCustomer": "user_input_required",
    "lookCompetition": "source_required",
    "lookSelf": "source_required",
    "lookTechnology": "Validated technical roadmap for CDU only.",
    "defineDirection": "Focus on validated CDU technical route.",
    "defineProduct": "Doorstep gate for CDU product entry.",
    "defineRhythm": "Phase gate by readiness and validation status."
  },
  "technicalRoadmap": [
    {
      "phase": "P1",
      "milestone": "core technical readiness",
      "status": "source_required"
    }
  ],
  "doorstepGate": {
    "gateName": "CDU_entry_gate",
    "status": "warning_report"
  },
  "readinessGate": {
    "gateName": "technical_readiness",
    "status": "realtime_verification_required"
  },
  "risks": [
    "freshnessStatus unknown for key performance claims"
  ],
  "missingInputs": [
    "customer deployment constraint"
  ],
  "sourceRequiredItems": [
    "technical_parameter",
    "certification"
  ],
  "evidenceTrace": [
    {
      "claimId": "clm_001",
      "sourceIds": ["src_001"]
    }
  ],
  "pageTrace": [
    {
      "currentPageRoute": "/technology",
      "pageContextHash": "ctx_hash_001"
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
