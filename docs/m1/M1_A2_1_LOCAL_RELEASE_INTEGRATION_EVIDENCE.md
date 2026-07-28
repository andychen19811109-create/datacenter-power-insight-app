# M1-A2-1 Local Release Integration Evidence

## 1. Preflight

- Repository: `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-m1-demo`
- Branch: `codex/m1-professional-demo-mvp`
- Starting HEAD: `f61fe6f1cec3f4595f5363df9dfdafd5b5b3223d`
- Starting worktree: clean
- Baseline match: PASS
- Starting commit: `f61fe6f Harden deterministic M1 release integrity`

## 2. Frozen Status Verification

- Frozen `m1.release-result.v1` Schema status values: `RELEASED`, `REJECTED`
- Production Gateway success status: `RELEASED`
- Production Gateway non-success status: `REJECTED`
- A1 tests assert both `RELEASED` and `REJECTED`
- Schema, Gateway, and A1 test status semantics: fully consistent
- A2 status translation or new status values: none

## 3. Architecture

- Public module: `src/ask/m1/releaseIntegration/index.js`
- Public function: `evaluateM1ReleaseIntegration(confirmedInput)`
- Accepted public business argument: one `m1.confirmed-input.v1` value
- Extra runtime argument behavior: fail-closed through the real Gateway
- Policy binding: bundled certified
  `m1.decision-policy.wave1.v0.2.json`
- Evidence binding: bundled certified
  `m1OfficialEvidenceWave1.v0.2.json` plus the production canonical hash
- Template binding: bundled static
  `m1.template-catalog.v1.v0.2.json`
- Gateway: the frozen production `runM1DecisionReleaseGateway`
- Output: the Gateway's `m1.release-result.v1` object returned without
  wrapping, mapping, or status conversion
- A1 Selector, Builder, Validator, Guard, Quality Gate, Policy, Snapshot,
  Templates, Schemas, hashes, and fingerprints: unchanged

## 4. Changed Files

| Path | Change | Necessity | A1 frozen logic |
|---|---|---|---|
| `src/ask/m1/releaseIntegration/evaluateM1ReleaseIntegration.js` | Added | Bind certified assets and call the real Gateway through one thin function. | Not modified |
| `src/ask/m1/releaseIntegration/index.js` | Added | Provide the one-value public runtime export boundary. | Not modified |
| `src/ask/m1/__tests__/m1ReleaseIntegration.test.js` | Added | Implement G01-G20 integration, isolation, determinism, and side-effect checks. | Existing tests unchanged |
| `docs/m1/M1_A2_1_LOCAL_RELEASE_INTEGRATION_EVIDENCE.md` | Added | Record the local implementation Gate evidence. | Not modified |

## 5. Public Export Evidence

Command:

```text
node --input-type=module -e 'const p = await import("./src/ask/m1/releaseIntegration/index.js"); console.log(JSON.stringify(Object.keys(p)))'
```

Runtime export keys:

```json
["evaluateM1ReleaseIntegration"]
```

There is no default export and no second runtime export.

## 6. G01-G20 Matrix

| Gate | Result | Test or command | Actual evidence |
|---|---|---|---|
| G01 | PASS | `[G01] required branch and A1 baseline ancestry remain exact` | Required branch and baseline commit/ancestry verified; Preflight was clean. |
| G02 | PASS | `[G02] frozen Schema, Gateway, and A1 tests agree on RELEASED and REJECTED` | Exact frozen status set is `RELEASED`, `REJECTED`; valid and rejected paths confirmed. |
| G03 | PASS | `[G03] public runtime export whitelist is exact` | Runtime keys equal `["evaluateM1ReleaseIntegration"]`. |
| G04 | PASS | `[G04] public integration imports and calls the real production Gateway` | Direct production Gateway import/call; no mock; validation flags all true. |
| G05 | PASS | `[G05] frozen valid input returns independently asserted RELEASED business values` | Static S1 fixture returns exact release ID/binding, two alternatives, two Unknowns, and conservative Sources. |
| G06 | PASS | `[G06] valid contract input with unsupported business combination is REJECTED` | HVDC unsupported combination returns frozen `REJECTED`. |
| G07 | PASS | `[G07] malformed inputs fail closed without RELEASED` | Missing field, schema, type, status, array, top-level key, and nested scope mutations all reject. |
| G08 | PASS | `[G08] extra arguments and all caller asset injections fail closed` | Second argument, options, Policy, Snapshot, and Template injection all reject. |
| G09 | PASS | `[G09] A1 same-version Policy certification attack remains present` plus A1 A37 | Same-version Policy mutations reject with certification violation. |
| G10 | PASS | `[G10] A1 coordinated Policy and Snapshot attack remains present` plus A1 A38 | Coordinated Policy/Snapshot mutation rejects. |
| G11 | PASS | `[G11] complete REJECTED result follows frozen recursive positive whitelist` | Complete result and nested error/binding use frozen Schema positive keys; recursive forbidden keys absent. |
| G12 | PASS | `[G12] deep-frozen caller input remains byte-for-byte unchanged` | Production call accepts test-side deep-frozen input and leaves it deeply equal. |
| G13 | PASS | `[G13] bound certified asset bytes remain unchanged and unexported` plus A1 A42 | Policy, Snapshot, and Template bytes unchanged; assets not publicly exported. |
| G14 | PASS | `[G14] RELEASED and REJECTED runs are separately deterministic` | Two valid results and two rejected results are independently deeply equal. |
| G15 | PASS | `[G15] fetch sentinel and source review prove no network or model path` | Fetch calls 0; new runtime source has no network, Dify, Provider, or LLM path. |
| G16 | PASS | `[G16] Integration contains asset binding and Gateway call but no business-rule copy` | No Selector, Builder, Quality Gate, Recommendation, Claim, Source-slot, Unknown, or numeric rule import/copy. |
| G17 | PASS | `[G17] tests use static fixtures and exact assertions without generated Golden` | Static frozen fixture and exact assertions; no Builder-generated Expected or snapshot assertion. |
| G18 | PASS | `[G18] no Core or Gateway mock implementation exists` | No `vi.mock`, `jest.mock`, mock Gateway, fixture import, or test-only runtime path. |
| G19 | PASS | `[G19] public result still passes frozen Validator and Evidence Guard`; all M1 command | Frozen Validator PASS; Guard PASS with 0 violations; Quality Gate true; all 185 tests pass. |
| G20 | PASS | `[G20] package, lockfile, UI, API, and frozen A1 files remain unchanged`; `npm run build` | Build PASS; package/lockfile changes 0; dependency additions 0; forbidden scope changes 0. |

Test file for G01-G20:
`src/ask/m1/__tests__/m1ReleaseIntegration.test.js`.

## 7. Negative Tests

- Extra argument: certified Policy passed as the second argument; `REJECTED`
- Options injection: caller `options.decisionPolicy`; `REJECTED`
- Policy injection: caller `decisionPolicy`; `REJECTED`
- Snapshot injection: caller `evidenceSnapshot`; `REJECTED`
- Template injection: caller `templateCatalog`; `REJECTED`
- Malformed inputs: seven missing/schema/type/status/array/key/scope cases;
  all `REJECTED`
- Non-success recursive leakage: frozen positive whitelist and recursive
  forbidden-key scan PASS
- Same-version Policy tampering: A1 A37 PASS
- Coordinated Policy/Snapshot tampering: A1 A38 PASS

No negative case returns `RELEASED`, echoes injected assets, or exposes a
Decision State.

## 8. Test Results

### A2 Focused

Command:

```text
node --test src/ask/m1/__tests__/m1ReleaseIntegration.test.js
```

Result: `20 passed / 0 failed / 0 skipped / 0 todo`

### A1 Focused

Command:

```text
node --test src/ask/m1/__tests__/m1DeterministicDecisionCore.test.js
```

Result: `62 passed / 0 failed / 0 skipped / 0 todo`

### All M1

Command:

```text
node --test src/ask/m1/__tests__/*.test.js
```

Result: `185 passed / 0 failed / 0 skipped / 0 todo`

### Frozen checks

- Frozen Decision State Validator: PASS
- Frozen Evidence Guard: PASS
- Evidence Guard violations: 0
- Independent Product Decision Quality Gate: PASS
- A1 P01-P20: PASS
- A1 A01-A42: PASS

### Build

Command:

```text
npm run build
```

Result: PASS; `2299 modules transformed`; built in `3.20s`.

The existing non-failing Vite chunk-size warning remains unchanged. A
temporary symlink to an existing sibling `node_modules` was used without
adding dependencies and removed after verification.

## 9. Independence Evidence

- Gateway mocked: NO
- Decision Core, Validator, Guard, or Quality Gate mocked: NO
- Production function used to generate Expected: NO
- First production result used as business Golden: NO
- Builder used to generate Expected: NO
- Snapshot assertion used as sole business proof: NO
- Existing tests deleted, skipped, or weakened: NO
- Decision Core business logic copied: NO
- Static frozen Fixture plus independent exact assertions: YES

Repeated-output equality is used only for determinism evidence, not as the
business-correctness Golden.

## 10. Side-effect Evidence

- Confirmed Input changed: NO
- Caller input frozen by production: NO
- Certified Policy changed: NO
- Certified Evidence Snapshot changed: NO
- Static Template Catalog changed: NO
- Network calls: 0
- Dify calls: 0
- Provider calls: 0
- LLM calls: 0
- External database calls: 0
- Added dependencies: 0

## 11. Git Evidence

- Starting HEAD: `f61fe6f1cec3f4595f5363df9dfdafd5b5b3223d`
- Authorized implementation paths: 4
- Frozen A1 file changes: 0
- Package/lockfile changes: 0
- Commit message: `Add deterministic M1 release integration boundary`
- Commit: this local A2-1 implementation commit
- Push: 0
- PR: 0
- Merge: 0
- Deploy: 0

## 12. Final Conclusion

All G01-G20, A1 focused, all M1 regression, frozen Validator, frozen Evidence
Guard, independent Product Decision Quality Gate, Build, dependency, scope,
side-effect, and Git boundaries passed before the local Commit Gate.

`M1_A2_1_LOCAL_IMPLEMENTATION_PASS`
