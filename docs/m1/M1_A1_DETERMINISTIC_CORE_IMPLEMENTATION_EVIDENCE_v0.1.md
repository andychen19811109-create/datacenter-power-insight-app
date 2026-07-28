# M1-A1 Deterministic Decision Core Implementation Evidence v0.1

## A. Preflight

- Repository: `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-m1-demo`
- Branch: `codex/m1-professional-demo-mvp`
- Corrective Gate starting HEAD: `77feee87b1ee0287c6c50e7973ef93f71afe146b`
- Initial worktree: clean
- Targeted correction ZIP SHA-256: `ff23c7ffbc47f496baf6ec86e8b39d9224b894de03376f807caf04426b8654ac`
- Targeted correction manifest verification: 2/2 controlled payload files `OK`
- Required review and Gate documents: completely read before correction
- Production authority: one unambiguous implementation each for Decision State Validator, Evidence Snapshot Validator, Evidence Guard, Confirmed Input hash, and Evidence Snapshot hash
- Network, Dify, Provider, and LLM calls during correction: 0

## B. Contract and corrective closure

### Contract validation boundary

- Runtime Contract Schema checks: artifact identity/root checks plus dependency-free validation of the supported JSON Schema subset
- Runtime Policy, Template, fail-closed error, and Release Result instances: validated through that dependency-free validator
- External Draft 2020-12 meta-validation: retained as separate evidence from the original implementation Gate; not presented as the runtime validation mechanism and not rerun for this correction
- 27 top-level Decision State fields covered: YES
- All nested required fields covered: YES
- Uncovered field paths: `[]`
- Required Template bindings: 65
- Resolved Template bindings: 65
- Evidence annotations resolved: 16/16
- Source authority assertions matched: 3/3

### Certified Policy enforcement

- Runtime Policy is structurally validated before certification comparison
- Production Gateway accepts only canonical object equality with the bundled certified Policy
- Same-version Policy content mismatch: `POLICY_SCHEMA_INVALID`
- Required violation code: `policy_artifact_not_certified`
- Policy ID, mapping, annotation category/family, selection mode, outcome, Source authority, certified Snapshot hash, and coordinated Policy/Snapshot mutations: REJECTED with no Decision State
- Schema-valid synthetic Policy genericity is tested only through the internal Schema validator; it is not released through the production Gateway

### Independent Product Decision Quality Gate

- Removed Quality Gate self-comparison input
- Direct authorities: Decision State, Confirmed Input, certified Policy, certified Templates, selected Evidence, and extracted input facts
- Builder is not called by the Quality Gate
- Alternatives: independently checked for exact confirmed labels, mapped IDs, fit status, Templates, Unknown IDs, and `ARCHITECTURE_ALTERNATIVE` Sources
- Unknowns: independently checked one-for-one across unresolved records, UNKNOWN Claims, gates, validation actions, owner, status, and Templates
- Evidence Claims: independently checked one-for-one for exact ID, statement, type, Source, scope, numeric value/provenance, and auxiliary Templates
- Policy-generated text and conservative records: checked directly against Policy and Template authorities
- Six high-risk arrays: exact `[]`
- Blocking-Unknown timing, commitment, funding, and confidence: independently checked

### Source ID closure

- Always empty: Product/System/No-fit boundaries, O1-O7, and Recommendation
- `protected_load_boundary` and `application_fit`: only `APPLICATION_FIT`-authorized selected Sources
- Each Architecture Alternative: only its selected `ARCHITECTURE_ALTERNATIVE`-authorized Sources
- Claim Candidate Source rules: unchanged

### Determinism and immutability

- Two identical Gateway runs: deeply equal
- Confirmed Input, Evidence Snapshot, Decision Policy, Template Catalog, and supplied hashes: unchanged after Gateway execution

## C. Corrective changed files

| Path | Purpose |
|---|---|
| `src/ask/m1/deterministic/internal/artifacts.js` | Structural Policy validation followed by exact canonical certified-Policy enforcement. |
| `src/ask/m1/deterministic/internal/builder.js` | Remove decorative Source IDs and emit only explicitly authorized slot-derived Sources. |
| `src/ask/m1/deterministic/internal/qualityGate.js` | Independently validate Decision State from certified authorities without Builder self-comparison. |
| `src/ask/m1/deterministic/internal/selection.js` | Remove the generic aggregate all-selected-source output. |
| `src/ask/m1/deterministic/runM1DecisionReleaseGateway.js` | Pass independent authority inputs to the Product Decision Quality Gate. |
| `src/ask/m1/__tests__/m1DeterministicDecisionCore.test.js` | Correct component/Gateway claims and add A37-A42 plus explicit Source-slot, determinism, and immutability checks. |
| `docs/m1/M1_A1_DETERMINISTIC_CORE_IMPLEMENTATION_EVIDENCE_v0.1.md` | Record corrective Gate closure and verified results. |

No Contract JSON, Policy, Template, Schema, Evidence Snapshot, frozen Validator,
Evidence Guard, UI, Renderer, Report, CSS, dependency, API, or network
configuration file was changed.

## D. Test evidence

### Focused deterministic-core Gate

Command:

```text
node --test src/ask/m1/__tests__/m1DeterministicDecisionCore.test.js
```

Result: `62 passed / 0 failed / 0 skipped / 0 todo`

### Positive Gate table

| ID | Result |
|---|---|
| P01 | PASS |
| P02 | PASS |
| P03 | PASS |
| P04 | PASS |
| P05 | PASS |
| P06 | PASS |
| P07 | PASS |
| P08 | PASS |
| P09 | PASS |
| P10 | PASS |
| P11 | PASS |
| P12 | PASS |
| P13 | PASS |
| P14 | PASS |
| P15 | PASS |
| P16 | PASS |
| P17 | PASS |
| P18 | PASS |
| P19 | PASS |
| P20 | PASS |

### Attack Gate table

| ID | Scope | Result | Required rejection/control |
|---|---|---|---|
| A01 | Component | PASS | unknown Evidence Unit rejected |
| A02 | Component | PASS | unknown Source rejected |
| A03 | Component | PASS | cross-category Evidence rejected |
| A04 | Component | PASS | cross-architecture Evidence rejected |
| A05 | Component | PASS | named-only feature selection rejected |
| A06 | Component | PASS | forbidden output slot rejected |
| A07 | Independent quality | PASS | omitted Alternative rejected |
| A08 | Gateway | PASS | fabricated Alternative rejected |
| A09 | Independent quality | PASS | omitted Unknown rejected |
| A10 | Independent quality | PASS | fabricated Unknown rejected |
| A11 | Gateway | PASS | aggregate Unknown mismatch rejected |
| A12 | Gateway | PASS | false Unknown extraction rejected |
| A13 | Independent quality | PASS | Unknown timing cannot become Immediate |
| A14 | Independent quality | PASS | blocking Unknown cannot permit final commitment |
| A15 | Independent quality | PASS | numeric aggregation rejected |
| A16 | Independent quality | PASS | numeric copy mutation rejected |
| A17 | Independent quality | PASS | statement copy mutation rejected |
| A18 | Independent quality | PASS | decorative Claim Source rejected |
| A19 | Independent quality | PASS | Evidence scope escalation rejected |
| A20 | Independent quality | PASS | technical-to-market domain escalation rejected |
| A21 | Independent quality | PASS | universal requirement invention rejected |
| A22 | Independent quality | PASS | tradeoff/risk invention rejected |
| A23 | Independent quality | PASS | market/deployment conclusion rejected |
| A24 | Independent quality | PASS | customer-fit escalation rejected |
| A25 | Component | PASS | Source authority drift rejected |
| A26 | Gateway | PASS | Template coverage gap rejected |
| A27 | Gateway | PASS | Template mutation rejected |
| A28 | Gateway | PASS | version/schema mismatches rejected |
| A29 | Gateway | PASS | Snapshot content/hash mutation rejected |
| A30 | Gateway | PASS | unsupported HVDC/BBU/CDU combinations rejected |
| A31 | Gateway | PASS | bare Decision State rejected |
| A32 | Gateway | PASS | consumer bare-state input rejected |
| A33 | Gateway | PASS | public skip flags ignored; normal Gate rejection retained |
| A34 | Gateway | PASS | cached/manual repair input rejected |
| A35 | Component | PASS | released binding omission rejected |
| A36 | Internal Schema + Gateway + static | PASS | synthetic Policy is structurally valid but uncertified for production; no hardcoded fixture/vendor branch |
| A37 | Gateway | PASS | same-version certified Policy mutations rejected |
| A38 | Gateway | PASS | coordinated Policy/Snapshot mutation rejected |
| A39 | Gateway | PASS | cross-domain Policy mapping mutation rejected as uncertified |
| A40 | Independent quality | PASS | policy-only Source injection rejected |
| A41 | Gateway | PASS | repeated identical runs deeply equal |
| A42 | Gateway | PASS | all supplied authority objects and hashes remain unchanged |

### Frozen and independent checks

- Frozen Decision State Validator: PASS
- Frozen Evidence Guard: PASS
- Evidence Guard violations: 0
- Independent Product Decision Quality Gate: PASS
- S1 Release Result: `RELEASED`
- S1 confirmed Alternatives: 2
- S1 confirmed Unknowns: 2
- Selected SOURCE_BACKED Claims: 14
- UNKNOWN Claims: 2

### All existing M1 regression

Command:

```text
node --test src/ask/m1/__tests__/*.test.js
```

Result: `165 passed / 0 failed / 0 skipped / 0 todo`

### Repository build

Command:

```text
npm run build
```

Result: PASS, `2299 modules transformed`, built in `1.69s`.

The pre-existing Vite chunk-size warning is non-failing. A temporary local
symbolic link to an existing sibling `node_modules` directory was used solely
to run regression and build without adding dependencies, then removed.

## E. Boundary evidence

- Dify calls: 0
- Provider calls: 0
- network calls: 0
- LLM calls: 0
- UI files changed: 0
- `App.jsx` changed: 0
- Renderer/Report/CSS files changed: 0
- production Evidence Snapshot changed: 0
- existing Guard files changed: 0
- existing Validator files changed: 0
- Contract/Policy/Template/Schema files changed: 0
- package dependencies added: 0
- API integration: 0
- Push/PR/Merge/Deploy: 0
- Temporary sibling `node_modules` link: removed after verification

## F. Hardcoding and bypass wording review

- Current S1 identity branches: 0
- `CUSTOMER_X` branches in Core: 0
- `REGION_ALPHA` branches in Core: 0
- `1MW` branches in Core: 0
- Vendor-name branches in Core: 0
- Runtime S1 fixture imports: 0
- Synthetic HVDC behavior: `UNSUPPORTED_COMBINATION`, no Decision State
- Synthetic BBU behavior: `UNSUPPORTED_COMBINATION`, no Decision State
- Synthetic CDU behavior: `UNSUPPORTED_COMBINATION`, no Decision State
- Public skip-flag test scope: flags are ignored and normal Gates still reject; this is not stated as proof that runtime code is physically unbypassable

## G. Gate result

All required corrective implementation, focused acceptance/attack, frozen
Validator, frozen Guard, independent Quality Gate, full M1 regression, build,
boundary, static, determinism, and immutability checks passed before the local
commit Gate.

The authorized local commit is this corrective implementation commit with
message `Harden deterministic M1 release integrity`.

`M1_A1_TARGETED_CORRECTION_PASS`
