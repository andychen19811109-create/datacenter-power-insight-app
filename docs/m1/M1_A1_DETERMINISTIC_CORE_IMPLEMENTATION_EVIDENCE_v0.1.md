# M1-A1 Deterministic Decision Core Implementation Evidence v0.1

## A. Preflight

- Repository: `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-m1-demo`
- Branch: `codex/m1-professional-demo-mvp`
- Starting HEAD: `446dc31884ed359cf0bb623b1d7473cf9ab7ce6d`
- Initial worktree: clean
- Package ZIP SHA-256: `d28ae692a830bbea43870809404992caeaa18d62dccaca70c440f2da7b1e4ec9`
- Package manifest verification: 14/14 controlled files `OK`
- Production authority: one unambiguous implementation each for Decision State Validator, Evidence Snapshot Validator, Evidence Guard, Confirmed Input hash, and Evidence Snapshot hash

## B. Contract coverage

- 27 top-level Decision State fields covered: YES
- All nested required fields covered: YES
- Uncovered field paths: `[]`
- Free-text fields: exact certified Template text, exact Evidence statement, or exact Confirmed Input copy only
- Required Template bindings: 65
- Resolved Template bindings: 65
- Unique Template records: 65
- Template parameters: 0
- Evidence annotations resolved: 16/16
- Source authority assertions matched: 3/3
- Unknown extraction trigger: `confirmed_status == USER_MARKED_UNKNOWN` only
- S1 extracted Unknown fields: `critical_constraints`, `target_timing`
- Aggregate Unknown index equivalence: PASS
- Exact empty policy-generated arrays: 6/6

## C. Changed files

All files are new.

| Path | Purpose |
|---|---|
| `src/ask/m1/deterministic/contracts/m1.decision-policy.v1.schema.v0.2.json` | Immutable Decision Policy contract Schema from the package. |
| `src/ask/m1/deterministic/contracts/m1.template-catalog.v1.schema.v0.2.json` | Immutable Template Catalog contract Schema from the package. |
| `src/ask/m1/deterministic/contracts/m1.fail-closed-error.v1.schema.v0.2.json` | Immutable fail-closed error Schema from the package. |
| `src/ask/m1/deterministic/contracts/m1.release-result.v1.schema.v0.2.json` | Immutable Release Result Schema from the package. |
| `src/ask/m1/deterministic/policy/m1.decision-policy.wave1.v0.2.json` | Immutable certified Wave 1 Decision Policy instance. |
| `src/ask/m1/deterministic/policy/m1.template-catalog.v1.v0.2.json` | Immutable certified Template Catalog instance. |
| `src/ask/m1/deterministic/test-fixtures/M1_DIFY_S1_CONFIRMED_INPUT_CANONICAL.json` | Exact package S1 Confirmed Input test fixture; not imported at runtime. |
| `src/ask/m1/deterministic/test-fixtures/M1_DIFY_S1_RAW_DECISION_STATE_v0.1.json` | Exact historical failed Decision State fixture for bare-state rejection; not imported at runtime. |
| `src/ask/m1/deterministic/internal/schemaValidation.js` | Dependency-free local validation of the package JSON Schema subset and contract artifacts. |
| `src/ask/m1/deterministic/internal/errors.js` | Validated deterministic fail-closed error and rejection envelope construction. |
| `src/ask/m1/deterministic/internal/artifacts.js` | Policy, Template, Snapshot identity, annotation, and Source-authority validation. |
| `src/ask/m1/deterministic/internal/input.js` | Exact confirmed-input validation, status-only Unknown extraction, and aggregate-index equivalence. |
| `src/ask/m1/deterministic/internal/selection.js` | Exact policy-metadata Evidence selection and scope/output-slot enforcement. |
| `src/ask/m1/deterministic/internal/builder.js` | Internal deterministic 27-field Decision State construction. |
| `src/ask/m1/deterministic/internal/qualityGate.js` | Product Decision Quality Gate and exact-copy/conservative-boundary enforcement. |
| `src/ask/m1/deterministic/runM1DecisionReleaseGateway.js` | Sole Release Gateway orchestration; no thrown exception escapes. |
| `src/ask/m1/deterministic/index.js` | Public package boundary exporting the Release Gateway only. |
| `src/ask/m1/__tests__/m1DeterministicDecisionCore.test.js` | Explicit P01-P20 and A01-A36 acceptance and attack suite. |
| `docs/m1/M1_A1_DETERMINISTIC_CORE_IMPLEMENTATION_EVIDENCE_v0.1.md` | This implementation evidence record. |

## D. Test evidence

### Focused deterministic-core Gate

Command:

```text
node --test src/ask/m1/__tests__/m1DeterministicDecisionCore.test.js
```

Result: `56 passed / 0 failed / 0 skipped / 0 todo`

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

| ID | Result | Required rejection/control |
|---|---|---|
| A01 | PASS | `EVIDENCE_UNIT_NOT_FOUND` |
| A02 | PASS | `EVIDENCE_SOURCE_NOT_FOUND` |
| A03 | PASS | `EVIDENCE_CATEGORY_MISMATCH` |
| A04 | PASS | `EVIDENCE_ARCHITECTURE_MISMATCH` |
| A05 | PASS | `EVIDENCE_ARCHITECTURE_MISMATCH` |
| A06 | PASS | `EVIDENCE_OUTPUT_SLOT_FORBIDDEN` |
| A07 | PASS | `BUILDER_OUTPUT_INVALID` |
| A08 | PASS | `UNSUPPORTED_ALTERNATIVE` |
| A09 | PASS | `UNKNOWN_FIELD_MISSING` |
| A10 | PASS | `UNKNOWN_FIELD_FABRICATED` |
| A11 | PASS | `UNKNOWN_INDEX_MISMATCH` |
| A12 | PASS | exact Unknown-set rejection |
| A13 | PASS | `BLOCKING_UNKNOWN_CONFLICT` |
| A14 | PASS | `COMMITMENT_LEVEL_CONFLICT` |
| A15 | PASS | `NUMERIC_AGGREGATION_FORBIDDEN` |
| A16 | PASS | `NUMERIC_COPY_VIOLATION` |
| A17 | PASS | `STATEMENT_COPY_VIOLATION` |
| A18 | PASS | Evidence Source rejection |
| A19 | PASS | `EVIDENCE_SCOPE_ESCALATION` |
| A20 | PASS | `EVIDENCE_SCOPE_ESCALATION` |
| A21 | PASS | `QUALITY_GATE_REJECTED` |
| A22 | PASS | `QUALITY_GATE_REJECTED` |
| A23 | PASS | `QUALITY_GATE_REJECTED` |
| A24 | PASS | `EVIDENCE_SCOPE_ESCALATION` |
| A25 | PASS | `SOURCE_AUTHORITY_MISMATCH` |
| A26 | PASS | `TEMPLATE_COVERAGE_INCOMPLETE` |
| A27 | PASS | `TEMPLATE_POLICY_MISMATCH` |
| A28 | PASS | policy/builder/template/snapshot version errors |
| A29 | PASS | `SNAPSHOT_HASH_MISMATCH` |
| A30 | PASS | `UNSUPPORTED_COMBINATION`, no state for HVDC/BBU/CDU |
| A31 | PASS | `BARE_DECISION_STATE_FORBIDDEN` |
| A32 | PASS | `BARE_DECISION_STATE_FORBIDDEN` |
| A33 | PASS | bypass flags do not bypass a failing Gate |
| A34 | PASS | `RELEASE_GATEWAY_INTERNAL_ERROR` |
| A35 | PASS | `CONFIRMED_INPUT_BINDING_MISMATCH` |
| A36 | PASS | no S1-specific or vendor branch in Core |

### Frozen and quality checks

- Frozen Decision State Validator: PASS
- Frozen Evidence Guard: PASS
- Evidence Guard violations: 0
- Product Decision Quality Gate: PASS
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

Result: `159 passed / 0 failed / 0 skipped / 0 todo`

The first sandboxed run encountered Vite temporary-config `EPERM`; the exact command was rerun in the authorized local environment and passed. No implementation or test was changed to address that environment-only error.

### Repository build

Command:

```text
npm run build
```

Result: PASS, `2299 modules transformed`, built in `1.83s`.

The pre-existing Vite chunk-size warning is non-failing.

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
- package dependencies added: 0
- API integration: 0
- Push/PR/Merge/Deploy: 0
- Temporary sibling `node_modules` link: removed after verification

## F. Hardcoding review

- Current S1 identity branches: 0
- `CUSTOMER_X` branches in Core: 0
- `REGION_ALPHA` branches in Core: 0
- `1MW` branches in Core: 0
- Vendor-name branches in Core: 0
- Runtime S1 fixture imports: 0
- Synthetic HVDC behavior: `UNSUPPORTED_COMBINATION`, no Decision State
- Synthetic BBU behavior: `UNSUPPORTED_COMBINATION`, no Decision State
- Synthetic CDU behavior: `UNSUPPORTED_COMBINATION`, no Decision State
- Synthetic policy IDs: validated through the generic Policy Schema path

## G. Gate result

All required implementation, validation, attack, regression, build, boundary, and hardcoding checks passed before the local commit Gate.

`M1_A1_DETERMINISTIC_CORE_IMPLEMENTATION_PASS`
