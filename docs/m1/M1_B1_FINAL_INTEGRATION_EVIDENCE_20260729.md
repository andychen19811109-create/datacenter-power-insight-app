# M1-B1 Final Integration Gate Evidence

Date: 2026-07-29

## 1. Verdict

`M1_B1_FINAL_INTEGRATION_PASS`

The approved M1-B1F implementation passed the final local page, contract,
scope, regression, and build gates. No new product feature or contract was
added. This gate changed only the exact-path scope-sentinel baselines,
phase handoff, and final evidence artifacts.

## 2. Repository identity

- Worktree:
  `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-m1-demo`
- Branch:
  `codex/m1-professional-demo-mvp`
- Starting HEAD:
  `2342a3c66db67226eb43df0743ae3cbe9d98e229`
- Starting dirty state:
  approved, uncommitted M1-B1F implementation and evidence
- Checkpoint subject:
  `Close M1 B1 confirmation fallback`

The final checkpoint SHA is reported in the gate handoff response. It is not
embedded in this committed file because a commit cannot contain its own final
SHA.

## 3. Required sources read

1. `docs/m1/M1_B1F_CONFIRMATION_FALLBACK_EVIDENCE.md`
2. Complete prior 423-line time-scope report:
   `/Users/lanmengling/.codex/visualizations/2026/07/29/019fad48-e659-77b3-a687-072149af9e10/M1_B1_EVIDENCE_20260729/M1_B1_TIME_SCOPE_RESOLVER_EVIDENCE_REPORT_20260729.md`
3. Current branch, HEAD, status, tracked diff, and untracked paths
4. `docs/m1/M1_PRODUCT_BASELINE.md`
5. `docs/m1/M1_ARCHITECTURE_DECISIONS.md`
6. `docs/m1/M1_CURRENT_HANDOFF.md`
7. `docs/m1/M1_CONFIRMED_INPUT_MVP_EVIDENCE.md`
8. Existing confirmation component, confirmed-input contract and generator,
   SHA-256 binding, Decision Core entry, fixtures, and tests

No unrelated personal file was opened.

## 4. Real-page verification method

The browser gate reused:

- `M1ConfirmedInputPanel`;
- `createM1ConfirmedInput`;
- `validateM1ConfirmedInput`;
- `assertM1ConfirmedInputGate`;
- `buildM1DecisionResolutionRequest`; and
- the existing S1, S2, and invalid S3 runtime fixtures.

A temporary localhost-only Vite harness outside the repository connected the
existing panel's `onConfirmed` callback to the real local Decision Core input
gate. The harness set `envFile: false`, did not call the product API, and did
not read credentials or call Dify, Docker, a Provider, or a model. It counted
Decision Core entries and returned only bounded audit state to the local page.

The page was inspected and operated in a real browser DOM; this evidence is not
limited to SSR or unit assertions.

## 5. Page path results

### A. Normal path

The previous real S1 valid draft resolved to `READY_FOR_CONFIRMATION`.

Before confirmation:

```text
Decision Core calls = 0
Gate status = BLOCKED_PENDING_CONFIRMATION
Confirmed Schema = none
Confirmed Input SHA-256 = none
```

After one confirmation:

```text
Decision Core calls = 1
Gate status = ALLOWED_AFTER_CONFIRMED_INPUT
Confirmed Schema = m1.confirmed-input.v1
Confirmation Status = USER_CONFIRMED
Confirmed Input SHA-256 =
8cbb89eeec442c4230f2d77e770d8b3abedd2b0189364e098a76dd428581ac12
Request ID = m1_dr_8cbb89eeec442c4230f2
Original question preserved = true
```

Result: PASS.

### B. Correction path

A valid S1 draft with `region=CONFLICTING` entered the same screen. The user
changed the region from `conflicting` to `北美`.

```text
Before confirmation:
Decision Core calls = 0
Gate status = BLOCKED_PENDING_CONFIRMATION

After correction and confirmation:
Decision Core calls = 1
Gate status = ALLOWED_AFTER_CONFIRMED_INPUT
Confirmation Status = USER_CORRECTED
Confirmed Input SHA-256 =
1780c2880fe45d127e044e8286a4fbb82bc836a5554b93a1e4172ef649157438
```

Result: PASS.

### C. S3 structural-failure fallback

The exact prior S3 question and invalid S3 fixture produced:

```text
Resolution = FALLBACK_CONFIRMATION_REQUIRED
Error code = M1_INPUT_DRAFT_CONTRACT_INVALID
Decision Core calls = 0
Gate status = BLOCKED_PENDING_CONFIRMATION
Original question visible and complete = true
Invalid S3 draft ID visible = false
Invalid model contradiction detail visible = false
Provider response / stack / credential content visible = false
```

After one confirmation:

```text
Decision Core calls = 1
Gate status = ALLOWED_AFTER_CONFIRMED_INPUT
Confirmed Schema = m1.confirmed-input.v1
Confirmation Status = USER_CONFIRMED
Original question preserved = true
Invalid S3 payload present in confirmed facts = false
Confirmed Input SHA-256 =
85812e4b0a923952897c94697a13e2bf07c1c4441bffd68559418a02c11ba195
```

Result: PASS.

### D. Provider-timeout fallback fixture

The page used a local function returning the existing timeout fallback; no
Provider request occurred.

```text
Resolution = FALLBACK_CONFIRMATION_REQUIRED
Error code = M1_INPUT_PROVIDER_TIMEOUT
Input Resolution calls = 1
Decision Core calls = 0
Gate status = BLOCKED_PENDING_CONFIRMATION
Original question retained without re-entry = true
Same existing confirmation screen = true
```

No automatic retry was observed.

Result: PASS.

### E. USER_MARKED_UNKNOWN path

The previous real S2 valid draft entered the same edit state. Target customer
was marked UNKNOWN.

```text
Before confirmation:
Decision Core calls = 0
Gate status = BLOCKED_PENDING_CONFIRMATION

After confirmation:
Decision Core calls = 1
Gate status = ALLOWED_AFTER_CONFIRMED_INPUT
Confirmation Status = USER_MARKED_UNKNOWN
target_customer.confirmed_status = USER_MARKED_UNKNOWN
target_customer.value = unknown
Confirmed Input SHA-256 =
619f8de3e45b9acf8d8e25c07a35c0f339f913c28f2410fa11d31bdac5081240
```

Result: PASS.

## 6. Decision Core boundary

Every page scenario started with:

```text
Decision Core calls = 0
Gate status = BLOCKED_PENDING_CONFIRMATION
```

Only the existing `onConfirmed` callback invoked the real
`assertM1ConfirmedInputGate` and `buildM1DecisionResolutionRequest`. No draft,
resolution envelope, rejected S3 payload, or unconfirmed edit entered Decision
Core. A legal confirmed input changed the counter to one and produced the
canonical SHA-256 request binding.

## 7. Screenshot evidence

Directory:

`docs/m1/M1_B1_FINAL_INTEGRATION_SCREENSHOTS_20260729`

| Evidence | File | SHA-256 |
|---|---|---|
| Normal draft confirmation; Core calls zero | `01-normal-confirmation.png` | `7dfe9d9f3f23e3b4c8b108b780211c4e5e52abc2fd1c1a935562b25629421aae` |
| S3 fallback; safe error and retained question | `02-s3-fallback-confirmation.png` | `a934a7e912245f6221589a46b7181c585b59abc31453f04b3f7e83de98a5f9f1` |
| Timeout fallback; one resolution call, zero Core calls | `03-timeout-fallback-confirmation.png` | `1a365015bebd2d4efed14ac25b71989c4747379f1c8cb69afb5f87278042e5a4` |
| Confirmed result; Core call, schema, status, and hash | `04-confirmed-audit.png` | `6e57399bd739c6650071fa364bdeccdf933fe057b62d39b29359047465df3661` |

The images contain no API key, token, secret, raw Provider response, stack, or
authentication value.

## 8. Scope-sentinel closure

Updated exact-path sentinels:

1. `src/ask/m1/__tests__/m1ReleaseIntegration.test.js` — `G01`
2. `src/ask/m1/demo/__tests__/m1DemoSnapshot.test.js` — `A3-G13`

Both now combine tracked differences and untracked files and compare every
path to a literal exact-file allow-list. They use no directory wildcard and
retain branch, ancestry, package, contract, deterministic Core, Evidence,
Gateway, and release-integration checks. Neither sentinel was skipped,
deleted, disabled, or converted to a directory-level allowance.

```text
node --test \
  src/ask/m1/__tests__/m1ReleaseIntegration.test.js \
  src/ask/m1/demo/__tests__/m1DemoSnapshot.test.js

tests 30
pass 30
fail 0
G01 PASS
G20 PASS
A3-G13 PASS
```

## 9. Test evidence

### B1F focused contract and gate

```text
node --test \
  src/ask/m1/__tests__/m1InputResolution.test.js \
  src/ask/m1/__tests__/m1ConfirmedInput.test.js \
  src/ask/m1/__tests__/m1InputUnderstanding.test.js \
  src/ask/m1/__tests__/m1DecisionCore.test.js

tests 40
pass 40
fail 0
```

### Existing page/component integration

```text
node --test src/ask/m1/__tests__/m1ConfirmedInputUi.test.js

tests 3
pass 3
fail 0
```

### Applicable M1 regression

The regression covered confirmed input/UI, M1 Core, Decision Core, Decision
Evidence Context, deterministic Decision Core, Input Understanding, B1F Input
Resolution, and official Evidence Wave 1.

```text
tests 180
pass 180
fail 0
```

The unchanged confirmed facts/status SHA-256 binding and all overwrite/stale
hash fail-closed checks passed.

## 10. Build and hygiene

```text
npm run build
Vite 5.4.21
2305 modules transformed
PASS
```

Output:

```text
dist/assets/index-BMCyLxId.css
dist/assets/index-Dv_5ISwX.js
```

Only the existing large-chunk advisory remains.

```text
git diff --check
PASS
```

## 11. Frozen assets

| Frozen asset | Modified | SHA-256 |
|---|---:|---|
| `src/ask/m1/contracts/m1ConfirmedInput.js` | No | `e5518bb0de397f1c0fd08129c27127ed626d12cd145cd8254eaee8c8145f62bb` |
| `src/ask/m1/m1DecisionCore.js` | No | `4fd6522540df93dfd891c2b21e176e5a95896ccdcac10cb4e4175541047ece84` |
| `src/ask/m1/contracts/m1DecisionState.js` | No | `6b9a2394480bfa272e7357cb1e640b13b63ab62e90eb0f9756c26355a661b2e1` |
| `src/ask/m1/m1DecisionEvidenceContext.js` | No | `a0dae9fff6a3242b1c09ace463143d6c2b9010df9694622674dbaafb68c66e99` |
| `src/ask/m1/deterministic/runM1DecisionReleaseGateway.js` | No | `88871ca3ca08761b4f79657be8290af779da8e16d5e3884bd1655e376fe9bd1d` |
| `package.json` | No | `e76d03a82d7617c6c55537e8443e42fb4ab0a804ebcae865d4010e47d8680ff3` |
| `package-lock.json` | No | `61b7c6b76f10999b0ae9111965547e0b98b2e4070f65da761350bf25c5139eb2` |
| Dify Workflow / Prompt / Provider / model / Thinking | No | Not accessed |
| Time-scope resolver | No | Not accessed or executed |
| 11-field contract and `m1.input-draft.v1` | No | Contract files unchanged |
| Validator / Evidence Guard / RAG / knowledge base | No | Unchanged |
| Published versions | No | Not accessed |

## 12. Final file scope

Approved B1F production implementation:

- `api/m1-input-understanding.js`
- `src/ask/m1/M1ConfirmedInputPanel.jsx`
- `src/ask/m1/m1ConfirmedInputFlow.js`
- `src/ask/m1/m1InputResolution.js`
- `src/ask/m1/runM1InputUnderstanding.js`

Approved B1F fixtures and tests:

- `src/ask/m1/fixtures/m1InputResolutionFixtures.js`
- `src/ask/m1/__tests__/m1InputResolution.test.js`
- `src/ask/m1/__tests__/m1ConfirmedInput.test.js`
- `src/ask/m1/__tests__/m1ConfirmedInputUi.test.js`
- `src/ask/m1/__tests__/m1InputUnderstanding.test.js`

Final-integration closure:

- `src/ask/m1/__tests__/m1ReleaseIntegration.test.js`
- `src/ask/m1/demo/__tests__/m1DemoSnapshot.test.js`
- `docs/m1/M1_B1F_CONFIRMATION_FALLBACK_EVIDENCE.md`
- `docs/m1/M1_B1_FINAL_INTEGRATION_EVIDENCE_20260729.md`
- four exact screenshot files listed above
- `docs/m1/M1_CURRENT_HANDOFF.md`

No Push, PR, Merge, Deploy, Dify publish, Docker command, or Provider call was
performed.

`M1_B1_FINAL_INTEGRATION_PASS`
