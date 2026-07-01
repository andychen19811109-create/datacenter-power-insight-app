# DCPI Phase 2A Thin Slice Test Matrix

## 1. Phase 2A Test Boundary

- This is a design-only test matrix.
- No test files are created in Phase 2A.
- Tests are defined for future Phase 2B.
- This matrix does not prove runtime is fixed.
- This matrix does not improve Ask output by itself.

The only covered slice is:

液冷 CDU 技术路线演进与准入门槛规划
Liquid Cooling CDU Technology Roadmap & Doorstep Gate

## 2. Test Assertion Standard

- `.toContain()` on short generic keywords is not sufficient.
- Tests must assert structured fields.
- Tests must assert `validatorStatus`, `renderMode`, `allowedToRender`, and `blockingReasons` together.
- Tests must assert `pageTrace` echo when page context is involved.
- Tests must assert `evidenceTrace` when factual claims are involved.
- Tests must assert missing-value markers when evidence is absent.

## 3. Core Positive Golden Path

Positive pass case:

- valid Technology page context
- valid `ProductPlanningCard.stateHash`
- valid `taskIntent`
- hydrated source / claim packs
- valid `evidenceTrace`
- structured provider JSON
- complete `fiveLookThreeDefine`
- expected `validatorStatus: pass`
- expected `renderMode: full_report`
- expected `allowedToRender: true`

Golden-path fixture summary:

- `currentPageRoute: /technology`
- `currentPageModule: technology`
- `productFamily: liquid_cooling_cdu`
- `architectureLayer: facility_cooling`
- `taskIntent: technical_roadmap_and_entry_gate`
- hydrated `expandedSourcePack`
- hydrated `expandedClaimPack`
- `pageTrace` echo matches request exactly

## 4. Validator Rule ID Matrix

| Rule ID | Rule name | Positive pass case | Negative block case | Required fixture input | Expected validatorStatus | Expected renderMode | Expected allowedToRender | Required blockingReasons assertion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `VAL_ERR_001` | TAM / ROI / market share without source | no TAM / ROI claims in thin CDU slice | ROI or market-size claim with empty `sourceIds` | provider response with ROI field and empty evidence | `blocked_source_required` | `source_required_report` | `false` | mentions missing source for TAM / ROI / market share |
| `VAL_ERR_002` | named customer without official evidence | no named customer claim | named customer listed without L3/L4 evidence | customer name plus missing official source | `blocked_source_required` | `source_required_report` | `false` | mentions named customer missing official evidence |
| `VAL_ERR_003` | certification without official evidence | evidence-backed positive pass with certification claim linked to official evidence, or explicit exclusion pass using `source_required` when certification is out of slice scope | certification claim asserted with no official source | certification claim without source | `blocked_source_required` | `source_required_report` | `false` | mentions certification evidence missing |
| `VAL_ERR_004` | launch date without official evidence | evidence-backed roadmap milestone or explicit exclusion pass using `source_required` when no official milestone evidence exists | launch-date claim with no official evidence | roadmap includes launch date only in prose | `blocked_source_required` | `source_required_report` | `false` | mentions launch date evidence missing |
| `VAL_ERR_005` | technical parameter without source | technical parameter carries evidenceTrace | cooling capacity or parameter with empty source list | factual parameter claim without source/freshness | `blocked_source_required` | `source_required_report` | `false` | mentions technical parameter evidence missing |
| `VAL_ERR_006` | primary object mismatch | primary object is CDU | response promotes another object as primary | request for CDU, response primary object = HVDC | `blocked_object_mismatch` | `blocked_report` | `false` | mentions primary object mismatch |
| `VAL_ERR_007` | alternative solution promoted to primary object | CDU remains primary, HVDC only contextual | alternative promoted to final recommendation | response recommends HVDC as main path | `blocked_object_mismatch` | `blocked_report` | `false` | mentions alternative promoted to primary |
| `VAL_ERR_008` | SST commercialization hallucination | no SST commercialization claim | SST short-term revenue claim inserted | response includes SST short-term commercialization | `blocked_policy_violation` | `blocked_report` | `false` | mentions SST commercialization without evidence |
| `VAL_ERR_009` | generic filler as core conclusion | filler supported by product/context/evidence/decision structure | generic filler used as core conclusion alone | output says “平台化和规模交付” without support | `blocked_generic_filler` | `blocked_report` | `false` | mentions unsupported generic filler |
| `VAL_ERR_010` | previous product / previous page leakage | response remains on current CDU tech page | previous product/page content appears | previous HVDC or market-page conclusion leaks in | `blocked_policy_violation` | `blocked_report` | `false` | mentions previous product or page leakage |
| `VAL_ERR_011` | time-window mismatch | evidence-backed positive pass with roadmap horizon matching request scope and source freshness window | response claims wrong time window | response shifts near-term roadmap to stale 2030 horizon | `blocked_freshness_unverified` | `blocked_report` | `false` | mentions time-window mismatch |
| `VAL_ERR_012` | missing page context | all required page context present | `pageContextHash` or required page field missing | request missing page context field | `blocked_page_context_missing` | `blocked_report` | `false` | mentions missing page context |
| `VAL_ERR_013` | factual claim lacks evidenceTrace | evidence-backed positive pass with roadmap / gate claim linked through non-empty evidenceTrace | roadmap/gate claim without evidenceTrace | response contains factual roadmap claim and empty evidenceTrace | `blocked_source_required` | `source_required_report` | `false` | mentions factual claim lacks evidenceTrace |
| `VAL_ERR_014` | AIDC claim lacks freshness fields | evidence-backed positive pass with publicationDate, lastVerifiedDate, and freshnessStatus present | AIDC claim lacks publication/verified/freshness fields | AIDC factual claim without freshness metadata | `blocked_freshness_unverified` | `blocked_report` | `false` | mentions freshness fields missing |
| `VAL_ERR_015` | fiveLookThreeDefine missing / empty | all required fields non-empty or set to valid missing-value markers | one required field missing or empty string | response with missing or empty look/define field | `blocked_schema_error` | `blocked_report` | `false` | mentions missing or empty fiveLookThreeDefine |
| `VAL_ERR_016` | schema / enum / minLength violation | schema-compliant response | invalid enum or empty required string | malformed response object | `blocked_schema_error` | `blocked_report` | `false` | mentions schema / enum / minLength violation |
| `VAL_ERR_017` | naked free text from provider | valid JSON response | plain text answer | provider returns prose block instead of JSON | `blocked_schema_error` | `blocked_report` | `false` | mentions naked free text |
| `VAL_ERR_018` | hidden fallback expert prose | provider error produces explicit error card | hidden expert fallback appears after provider error | provider fails and app renders expert prose anyway | `blocked_policy_violation` | `blocked_report` | `false` | mentions hidden fallback expert prose |

## 4A. Strong Positive Evidence-backed Pass Cases

This section defines strong positive pass requirements so Phase 2B cannot pass by omission alone.

For each relevant Rule ID, the positive pass case must require:

- a legitimate claim exists
- `sourceIds` are non-empty
- every `sourceId` resolves in Evidence Registry
- `evidenceTrace` links `claimId` to `sourceIds`
- `freshnessStatus` is acceptable
- `allowedUse` permits the claim type
- `forbiddenUse` does not block the claim
- expected `validatorStatus: pass` or `pass_with_warnings`
- expected `renderMode: full_report` or `warning_report`
- expected `allowedToRender: true`
- expected `blockingReasons: []`

Strong evidence-backed positive pass cases:

| Rule ID | Strong positive pass requirement |
| --- | --- |
| `VAL_ERR_003` | certification claim exists, cites official L2 or L4 certification evidence, `sourceIds` are non-empty, `evidenceTrace` resolves, and `allowedUse` permits certification rendering |
| `VAL_ERR_004` | roadmap or launch milestone claim exists with official evidence and matching time window, or the field is explicitly marked `source_required` with no hidden milestone prose when official evidence does not exist |
| `VAL_ERR_005` | technical parameter claim exists with non-empty `sourceIds`, non-empty `evidenceTrace`, valid freshness window, and vendor or standards-backed source tier |
| `VAL_ERR_011` | time-window claim exists and matches both request scope and source freshness so roadmap phase timing does not drift beyond supported horizon |
| `VAL_ERR_013` | factual roadmap or gate claim exists and every factual statement is linked through non-empty `evidenceTrace` to resolved claim and source records |
| `VAL_ERR_014` | AIDC or CDU-related claim exists and carries `publicationDate`, `lastVerifiedDate`, and `freshnessStatus` so “current” or near-current framing is evidence-bound |
| `VAL_ERR_015` | all `fiveLookThreeDefine` required fields are present and every field is either non-empty with evidence support or set to a valid missing-value marker |

Strong explicit exclusion pass cases for out-of-scope commercial claims:

- `VAL_ERR_001` TAM / ROI / market share
- `VAL_ERR_002` named customer
- `VAL_ERR_008` SST commercialization

For these out-of-scope commercial claims, the strong positive pass must require:

- the request excludes this claim type
- the response uses `not_applicable`, `source_required`, or `no_quantified_data`
- no hidden prose claim appears
- validator confirms the absence is intentional and contract-bound, not missing test coverage

Expected outcomes for explicit exclusion pass:

- `validatorStatus: pass` or `pass_with_warnings`
- `renderMode: full_report` or `warning_report`
- `allowedToRender: true`
- `blockingReasons: []`

## 5. Page-context Linkage Tests

| Test case | Expected status | Expected render mode | Expected allowedToRender |
| --- | --- | --- | --- |
| missing `pageContextHash` | `blocked_page_context_missing` | `blocked_report` | `false` |
| missing `ProductPlanningCard.stateHash` | `blocked_page_context_missing` | `blocked_report` | `false` |
| `stateHash` mismatch | `blocked_page_context_mismatch` | `blocked_report` | `false` |
| route / module mismatch | `blocked_page_context_mismatch` | `blocked_report` | `false` |
| missing `pageTrace` | `blocked_page_context_missing` | `blocked_report` | `false` |
| `pageTrace` echo mismatch | `blocked_page_context_mismatch` | `blocked_report` | `false` |
| cross-page conclusion drift | `blocked_page_context_mismatch` | `blocked_report` | `false` |

Each page-context test must also assert:

- `blockingReasons` names the exact missing or mismatched field
- no normal report content is rendered

## 6. Open-ended Question Tests

| Test case | Expected outcome |
| --- | --- |
| broad question with insufficient context | `user_input_required` or `source_required` depending on missing field type |
| missing customer segment | `user_input_required` |
| missing region | `user_input_required` |
| missing technical objective | `user_input_required` |
| missing `sourceRefs` / `claimRefs` | `source_required` or `blocked_source_required` where factual claim is attempted |
| ambiguous product family | `user_input_required` or blocked object-clarification path |

Expected outcome vocabulary must use:

- `user_input_required`
- `source_required`
- `realtime_verification_required`
- `blocked_source_required` where applicable

## 7. Evidence / Hydration Tests

| Test case | Expected outcome |
| --- | --- |
| `sourceRef` not hydrated | `source_required` or `blocked_source_required` |
| `claimRef` not hydrated | `source_required` or `blocked_source_required` |
| `expandedSourcePack` missing `freshnessStatus` | `blocked_freshness_unverified` |
| `expandedClaimPack` missing `sourceIds` | `blocked_source_required` |
| Local KB `L5` used as higher-tier evidence incorrectly | blocked policy / source validation failure |
| factual claim with empty `evidenceTrace` | `blocked_source_required` |

## 8. Generic Filler Negative Tests

Use these examples:

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

Generic filler must block only when it is used as a core conclusion without:

- product object
- context dimension
- evidence marker
- decision structure

Positive pass example:

- phrase appears inside a roadmap explanation that also includes CDU object, technology-page context, evidenceTrace marker, and a gate / milestone structure

Negative block example:

- phrase appears as the core roadmap conclusion with no CDU object, no page context, no evidence marker, and no gate / milestone structure

## 9. Renderer State Tests

| Render state | Allowed content | Forbidden content |
| --- | --- | --- |
| `full_report` | complete structured report with evidence trace | hidden fallback text |
| `warning_report` | visible warnings plus bounded report | warning suppression |
| `source_required_report` | missing evidence list and explicit markers | invented conclusions |
| `blocked_report` | block reason and corrective guidance | normal expert report sections |
| `provider_error_card` | service error message | local expert fallback prose |
| `provider_timeout_card` | timeout and retry prompt | speculative answer body |
| `data_refreshed_regenerate_required_card` | regenerate instruction | stale prior answer |
| `user_input_required_card` | required clarification fields | guessed missing business facts |

Each renderer-state test must verify:

- allowed content
- forbidden content
- no hidden expert fallback prose

## 10. Phase 2B Test Implementation Entry Criteria

Phase 2B test implementation can start only after:

- this matrix is approved by GPT
- this matrix is approved by Gemini
- user explicitly authorizes Phase 2B
- test file list is approved
- implementation file list is approved
- rollback plan is approved
