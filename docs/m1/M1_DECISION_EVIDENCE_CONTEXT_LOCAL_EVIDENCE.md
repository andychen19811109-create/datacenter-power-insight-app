# M1 Decision Evidence Context — Local Evidence

## Scope and repository identity

- Worktree: `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-m1-demo`
- Branch: `codex/m1-professional-demo-mvp`
- Starting HEAD: `95a5fe98a44c0966669947dfe2c6fae985f8877f`
- Final HEAD: the single local commit containing this document, with subject
  `Build M1 decision evidence context gate`; the exact resulting SHA is reported
  in the post-commit handoff because a commit cannot contain its own SHA.
- Allowed implementation roots: `src/ask/m1` and `docs/m1`

## Implemented files

- `src/ask/m1/contracts/m1EvidenceSnapshot.js`
- `src/ask/m1/m1DecisionEvidenceContext.js`
- `src/ask/m1/fixtures/m1DecisionEvidenceFixtures.js`
- `src/ask/m1/__tests__/m1DecisionEvidenceContext.test.js`
- `docs/m1/M1_DECISION_EVIDENCE_CONTEXT_CONTRACT.md`
- `docs/m1/M1_DECISION_EVIDENCE_CONTEXT_DIFY_DELTA.md`
- `docs/m1/M1_DECISION_EVIDENCE_CONTEXT_LOCAL_EVIDENCE.md`
- `docs/m1/M1_CURRENT_HANDOFF.md`

No UI, `m1.confirmed-input.v1`, `m1.decision-state.v1`, transport, Provider,
model, Dify workflow, Claim Ledger, final report, or knowledge-base file changed.

## Deterministic verification

Focused command:

```text
node --test src/ask/m1/__tests__/m1DecisionEvidenceContext.test.js
```

Focused result:

- PASS: `26`
- FAIL: `0`

Full M1 regression command:

```text
node --test src/ask/m1/__tests__/*.test.js
```

Full M1 regression result:

- PASS: `66`
- FAIL: `0`

Production build command:

```text
npm run build
```

Build result: `PASS`.

Vite transformed `2299` modules and emitted the production bundle. It reported
the existing advisory that one minified chunk is larger than 500 kB; this is
non-blocking and no UI or bundling change was made.

Repository hygiene command:

```text
git diff --check
```

Result: `PASS`

The dedicated worktree did not contain `node_modules`. The first all-M1
invocation completed `63 PASS / 1 environment-load failure` because React was
unavailable, and the first build did not start because Vite was unavailable.
No package failed semantically. No dependency was downloaded or installed.
The package lock was byte-identical to the existing Phase 2B worktree package
lock (SHA-1 `f5f887d7ce323e1acfbc8ebc7a4933d414de5e4e`), so a temporary ignored
`node_modules` link to that existing local dependency tree was used for the
final commands and then removed. The final results are the `65 / 0` regression
and PASS build above.

## Required positive and negative evidence

- Valid empty structural snapshot: PASS.
- Canonical key-order stability and Unicode retention: PASS.
- One-character, evidence-order, and source-content mutations change hash: PASS.
- Source outside allow-list, duplicate source, duplicate evidence-unit ID, and
  allowed-but-absent source: rejected.
- Exact `SOURCE_BACKED` statement, numeric provenance, and scope: `BOUND`.
- Paraphrase, numeric mismatch, and scope expansion: rejected.
- Source-free `UNKNOWN`: `UNKNOWN_NO_EVIDENCE_REQUIRED`.
- `UNKNOWN` carrying a source: rejected.
- `INFERRED_BRIDGE`: rejected with
  `inferred_bridge_not_deterministically_bindable_v1`.
- Source-free `SUPPORTED`, baseless `QUALIFIED`, technical trade-off, and
  technical risk: rejected.
- Unconfirmed `Product Management` owner: rejected.
- `TBD` owner: accepted.
- Existing Confirmed Input equality, overwrite, and SHA-256 checks: retained.

The explicitly named `createCurrentS1PollutionFixture` is marked
`TEST_ONLY_NOT_REAL_EVIDENCE` and simulates:

- `SUPPORTED` with empty `source_ids`;
- source-free UPS/800VDC technical trade-off;
- source-free technical risk;
- `Product Management` owner;
- complete allow-list with no actual snapshot sources.

The Guard deterministically rejects that fixture. It does not repair or
downgrade it.

## External activity and evidence content

- Network calls: `0`
- Dify calls: `0`
- Provider calls: `0`
- Dify changes/publications: `0`
- Real source retrievals/downloads: `0`
- Real industry Evidence Units added: `0`

The source allow-list is not Evidence. This package fetched and populated no
real Evidence. Dify remains unchanged and unpublished by this package. The
current Provider/model remain unchanged. Thinking stays `false`, and the JSON
Object setting stays frozen.

## Verdict

`M1_DECISION_EVIDENCE_CONTEXT_PASS`

The next authorized action after a PASS is GPT-led preparation and review of the
first official Evidence Pack. Dify must not be modified without the next Gate.
