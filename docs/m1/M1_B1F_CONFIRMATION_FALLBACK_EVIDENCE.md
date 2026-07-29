# M1-B1F Confirmation Fallback Closure Evidence

## 1. Verdict

`M1_B1F_CONFIRMATION_FALLBACK_PASS`

The existing M1 confirmation flow now closes both paths:

```text
normal:
natural question
→ valid m1.input-draft.v1
→ READY_FOR_CONFIRMATION
→ existing one-screen confirmation
→ m1.confirmed-input.v1

failure:
natural question
→ Provider / JSON / structural contract failure
→ invalid model output discarded
→ FALLBACK_CONFIRMATION_REQUIRED
→ existing one-screen confirmation
→ m1.confirmed-input.v1
```

No unconfirmed draft or resolution can enter Decision Core.

## 2. Repository identity and starting state

- Worktree:
  `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-m1-demo`
- Branch:
  `codex/m1-professional-demo-mvp`
- Starting HEAD:
  `2342a3c66db67226eb43df0743ae3cbe9d98e229`
- Starting tree:
  clean

Required sources read before implementation:

1. Previous 423-line runtime/time-scope evidence:
   `/Users/lanmengling/.codex/visualizations/2026/07/29/019fad48-e659-77b3-a687-072149af9e10/M1_B1_EVIDENCE_20260729/M1_B1_TIME_SCOPE_RESOLVER_EVIDENCE_REPORT_20260729.md`
2. `docs/m1/M1_PRODUCT_BASELINE.md`
3. `docs/m1/M1_ARCHITECTURE_DECISIONS.md`
4. `docs/m1/M1_CURRENT_HANDOFF.md`
5. `docs/m1/M1_CONFIRMED_INPUT_MVP_EVIDENCE.md`
6. Existing confirmed-input contract, flow, panel, Input Understanding adapter,
   API route, Decision Core gate, and related tests.

No unrelated personal files were read.

## 3. Reused boundaries

The implementation reuses without replacement:

- `m1.input-draft.v1`
- `m1.confirmed-input.v1`
- `M1ConfirmedInputPanel`
- the exact six confirmation groups
- the exact original-question preservation rule
- `USER_CONFIRMED`
- `USER_CORRECTED`
- `USER_MARKED_UNKNOWN`
- the existing canonical confirmed-input JSON
- the existing SHA-256 confirmed-input binding
- the existing Decision Core gate

The existing confirmed-input contract file is byte-identical to HEAD:

```text
src/ask/m1/contracts/m1ConfirmedInput.js
SHA-256 e5518bb0de397f1c0fd08129c27127ed626d12cd145cd8254eaee8c8145f62bb
```

No second confirmation page, confirmed-input schema, Decision Core route, or
parallel downstream flow was created.

## 4. Internal resolution envelope

Schema:

```text
m1.input-resolution.v1
```

It permits exactly two states:

```text
READY_FOR_CONFIRMATION
FALLBACK_CONFIRMATION_REQUIRED
```

Exact top-level members:

```text
schema_version
resolution_id
state
original_question
confirmation_draft
error
```

### 4.1 READY_FOR_CONFIRMATION

This state requires:

- exact `m1.input-draft.v1`;
- exact six existing confirmation groups;
- exact original question;
- complete expected fields;
- no unexpected fields;
- draft statuses limited to `EXPLICIT`, `INFERRED`, `UNKNOWN`, and
  `CONFLICTING`;
- canonical scalar sentinels for `UNKNOWN` and `CONFLICTING`;
- Provider source mode; and
- no error object.

`ASSUMED` is rejected by the resolution boundary and therefore enters fallback
confirmation.

### 4.2 FALLBACK_CONFIRMATION_REQUIRED

This state is produced for:

- Code Guard / draft contract rejection;
- Provider timeout or unavailability;
- JSON parsing failure;
- missing fields;
- unexpected fields;
- invalid status;
- invalid sentinel/value combinations;
- invalid input context; and
- any other structural contract failure.

The invalid model payload is not attached to the resolution and is not copied
into the confirmation draft. The fallback draft is rebuilt only from the exact
preserved question with the pre-existing bounded local extraction:

- recognizable decision type;
- recognizable product/architecture tokens;
- known power scale;
- known region;
- known customer;
- missing context remains `UNKNOWN`;
- concrete suggestions remain `INFERRED`;
- no silent default fact is added.

## 5. Stable safe error codes

The public resolution exposes only these bounded codes:

```text
M1_INPUT_PROVIDER_TIMEOUT
M1_INPUT_PROVIDER_UNAVAILABLE
M1_INPUT_JSON_INVALID
M1_INPUT_DRAFT_MISSING_FIELDS
M1_INPUT_DRAFT_UNEXPECTED_FIELDS
M1_INPUT_DRAFT_INVALID_STATUS
M1_INPUT_DRAFT_CONTRACT_INVALID
```

The user-visible fallback message is exactly:

```text
自动提取未通过结构校验，请确认或补充以下信息。原始问题已保留，无需重新输入。
```

The API response sanitizer removes:

- raw Provider response bodies;
- workflow IDs and diagnostics;
- validation error arrays;
- internal exception messages; and
- stack information.

An automated test injects synthetic internal details and proves the public
failure response contains only `mode` and the stable error code.

## 6. No automatic retry

`runM1InputUnderstanding` now performs exactly one transport call. A response
may retain an internal `retryable` classification for diagnosis, but no second
call is made.

Offline timeout evidence:

```text
transport reported retryable=true
providerCalls=1
attemptCount=1
resolution.state=FALLBACK_CONFIRMATION_REQUIRED
resolution.error.code=M1_INPUT_PROVIDER_TIMEOUT
```

The browser does not ask the user to submit the same question again. It opens
the existing confirmation screen with the original question already present.

## 7. Previous runtime fixtures

No new Dify or Provider call was performed.

The fixtures are transcribed from the previous runtime evidence:

- S1 source run:
  `4e71b241-36e7-4f1e-a8ff-12f046944add`
- S2 source run:
  `f2de5b84-3d52-4429-bce6-f3369e229da3`
- S3 structural-failure source run:
  `efbbf22b-93af-41d7-b713-2242dd6c6b92`

Fixture behavior:

| Fixture | Result |
|---|---|
| Valid S1 draft | `READY_FOR_CONFIRMATION` |
| Valid S2 draft | `READY_FOR_CONFIRMATION` |
| S3 `unknown + CONFLICTING` primary-product error | `FALLBACK_CONFIRMATION_REQUIRED` |

The S3 invalid draft ID and invalid model contradiction text are absent from
the rendered fallback confirmation screen.

## 8. Required acceptance cases

| # | Required case | Evidence | Result |
|---:|---|---|---|
| 1 | Legal S1 draft | runtime fixture → READY | PASS |
| 2 | Legal S2 draft | runtime fixture → READY | PASS |
| 3 | S3 structural error | invalid runtime fixture discarded → FALLBACK | PASS |
| 4 | Single leaf object | stable missing-fields fallback | PASS |
| 5 | Missing field | stable missing-fields fallback | PASS |
| 6 | Illegal `ASSUMED` | stable invalid-status fallback | PASS |
| 7 | Provider timeout | FALLBACK; one call only | PASS |
| 8 | Confirm legal draft | `m1.confirmed-input.v1 / USER_CONFIRMED` | PASS |
| 9 | Correct conflicting field | `USER_CORRECTED` | PASS |
| 10 | Mark unconfirmable field | `USER_MARKED_UNKNOWN` | PASS |
| 11 | Unconfirmed input to Decision Core | resolution and draft both rejected | PASS |
| 12 | Facts/status SHA binding | original hash valid; changed fact/status changes hash | PASS |
| 13 | Existing related regression | 180/180 | PASS |

Additional covered case:

- invalid JSON response → `FALLBACK_CONFIRMATION_REQUIRED`;
- exactly one fetch;
- no parser detail in the user message.

## 9. Test evidence

### 9.1 Focused contract and downstream gate

Command:

```text
node --test \
  src/ask/m1/__tests__/m1InputResolution.test.js \
  src/ask/m1/__tests__/m1ConfirmedInput.test.js \
  src/ask/m1/__tests__/m1InputUnderstanding.test.js \
  src/ask/m1/__tests__/m1DecisionCore.test.js
```

Result:

```text
tests 40
pass 40
fail 0
```

### 9.2 Existing confirmation UI

Command:

```text
node --test src/ask/m1/__tests__/m1ConfirmedInputUi.test.js
```

Result:

```text
tests 3
pass 3
fail 0
```

The UI assertions cover:

- the same six groups;
- normal READY state;
- fallback state;
- exact safe message;
- exact stable error code;
- original question present;
- one confirmation action; and
- S3 invalid model details absent.

### 9.3 Applicable M1 regression

The final applicable regression ran:

- confirmed-input contract/UI;
- M1 core;
- Decision Core;
- Decision Evidence Context;
- deterministic Decision Core;
- Input Understanding;
- B1F resolution;
- official Evidence Wave 1.

Result:

```text
tests 180
pass 180
fail 0
```

This includes the unchanged Decision Core, Decision State Validator, Evidence
Guard, Quality Gate, certified Policy/Snapshot checks, unknown handling, and
confirmed-input overwrite/hash defenses.

### 9.4 Historical exact-scope sentinels

The frozen Release Integration suite was also run:

```text
19 pass
1 historical scope sentinel rejected
```

All behavioral and frozen-asset checks, including `G20`, passed. `G01` compares
every changed path against the earlier A2-1-only allow-list, so it correctly
rejects any newly authorized B1F input-adapter path.

The Demo suite's eight behavioral checks also passed. Its historical
`A3-G13` exact-scope sentinel correctly rejects `api/m1-input-understanding.js`
because that file was outside the earlier demo-only package.

These two tests are package-scope sentinels, not runtime regressions. They were
not modified, bypassed, or counted as B1F functional tests.

### 9.5 Production build and hygiene

```text
npm run build
Vite 5.4.21
2305 modules transformed
PASS
```

Only the existing large-chunk advisory remains.

```text
git diff --check
PASS
```

## 10. Frozen-boundary proof

`git diff --name-only` is empty for:

```text
src/ask/m1/contracts
src/ask/m1/m1DecisionCore.js
src/ask/m1/m1DecisionEvidenceContext.js
src/ask/m1/deterministic
src/ask/m1/evidence
package.json
package-lock.json
```

Selected unchanged SHA-256 values:

| Frozen file | SHA-256 |
|---|---|
| `contracts/m1ConfirmedInput.js` | `e5518bb0de397f1c0fd08129c27127ed626d12cd145cd8254eaee8c8145f62bb` |
| `m1DecisionCore.js` | `4fd6522540df93dfd891c2b21e176e5a95896ccdcac10cb4e4175541047ece84` |
| `contracts/m1DecisionState.js` | `6b9a2394480bfa272e7357cb1e640b13b63ab62e90eb0f9756c26355a661b2e1` |
| `m1DecisionEvidenceContext.js` | `a0dae9fff6a3242b1c09ace463143d6c2b9010df9694622674dbaafb68c66e99` |
| `deterministic/runM1DecisionReleaseGateway.js` | `88871ca3ca08761b4f79657be8290af779da8e16d5e3884bd1655e376fe9bd1d` |

Previous frozen Dify artifact hashes remain:

| Artifact | Previous and current local SHA-256 |
|---|---|
| Final M1-B1 DSL | `20fc4bd37b118e26f3496ae13e27929d86e4702958310a5d9f17b9353b092a21` |
| Time-scope Code Guard source | `cf21e5d2bc0410d54b5ffbea610e820f480ea0fd2e3155aa6ab283e2bb436398` |

No Docker, Dify, Workflow import, Provider, model, Prompt, Code Guard, or live
runtime command was executed in this package.

## 11. Changed implementation files

Production:

- `api/m1-input-understanding.js`
- `src/ask/m1/M1ConfirmedInputPanel.jsx`
- `src/ask/m1/m1ConfirmedInputFlow.js`
- `src/ask/m1/m1InputResolution.js`
- `src/ask/m1/runM1InputUnderstanding.js`

Offline fixtures and tests:

- `src/ask/m1/fixtures/m1InputResolutionFixtures.js`
- `src/ask/m1/__tests__/m1InputResolution.test.js`
- `src/ask/m1/__tests__/m1ConfirmedInput.test.js`
- `src/ask/m1/__tests__/m1ConfirmedInputUi.test.js`
- `src/ask/m1/__tests__/m1InputUnderstanding.test.js`

Documentation:

- `docs/m1/M1_B1F_CONFIRMATION_FALLBACK_EVIDENCE.md`
- `docs/m1/M1_CURRENT_HANDOFF.md`

No commit, Push, PR, Merge, Deploy, or Dify publish was performed.

## 12. Final acceptance

- Normal extraction still enters the existing one-time confirmation: PASS.
- S3 structural failure no longer terminates the MVP input flow: PASS.
- Invalid model output cannot automatically enter Decision Core: PASS.
- The user completes one confirmation screen only: PASS.
- The original question is retained without re-entry: PASS.
- Confirmed-input contract and SHA binding are unchanged: PASS.
- Applicable automated tests pass: PASS.
- Dify and time-scope resolver remain frozen: PASS.

`M1_B1F_CONFIRMATION_FALLBACK_PASS`
