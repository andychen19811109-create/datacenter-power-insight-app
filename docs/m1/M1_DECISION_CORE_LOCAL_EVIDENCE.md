# M1 Decision Core Local Evidence

## Gate identity

- Date: 2026-07-24
- Worktree: `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-m1-demo`
- Branch: `codex/m1-professional-demo-mvp`
- Expected and verified starting HEAD: `59b89c9`
- Starting worktree: clean
- Read boundary: the three authorized M1 documents and the nine files returned by `git show --name-only --format="" 59b89c9`
- Dify calls or mutations: none
- Push, merge, deploy, report, PDF, Claim Ledger, deterministic Claim Guard, and UI integration: none

## Authorized baseline

The implemented boundary follows:

`m1.input-draft.v1 → rejected`

`invalid or unconfirmed input → rejected`

`validated m1.confirmed-input.v1 → local Decision Resolution request → dedicated transport boundary → parsed and validated m1.decision-state.v1`

The existing M1 confirmation UI remains stopped at `Decision Resolution 尚未启动`; the confirmation button is not connected to the new transport.

Frozen baseline retained:

- eight-slot Decision Context remains represented by the confirmed-input snapshot;
- D2 method identity is `D2.frozen.O1-O7.v1`;
- all O1–O7 are exact required Decision State keys;
- the seven-source external Evidence Boundary is an exact ordered allow-list;
- unknowns constrain confidence, funding, gates, recommendation, or validation;
- Decision Resolution proposes Claim Candidates only.

## Implemented files

1. `src/ask/m1/contracts/m1DecisionState.js`
   - exact versioned `m1.decision-state.v1` validation;
   - exact top-level contract;
   - exact O1–O7 identity and titles;
   - frozen evidence-source allow-list;
   - structured decision boundaries, alternatives, fit/no-fit, requirements, differentiators, metrics, tradeoffs, risks, gates, actions, recommendation, funding, confidence, unknowns, and Claim Candidates;
   - confirmed snapshot, identity, and hash matching;
   - fail-closed malformed-record validation.
2. `src/ask/m1/m1DecisionCore.js`
   - deterministic draft/schema/confirmed-input gate;
   - canonical JSON serialization;
   - SHA-256 input binding;
   - exact Decision Resolution request construction;
   - Dify output extraction and JSON parsing;
   - local Decision State validation before acceptance;
   - future server API orchestration boundary with injected transport.
3. `src/ask/m1/m1DecisionResolutionTransport.js`
   - dedicated blocking Workflow Service API adapter;
   - dedicated environment-variable names;
   - no retry and no model fallback;
   - bounded transport diagnostics;
   - published workflow-version identity enforcement.
4. `src/ask/m1/fixtures/m1DecisionCoreFixtures.js`
   - one validated confirmed-input fixture;
   - one complete Decision State fixture.
5. `src/ask/m1/__tests__/m1DecisionCore.test.js`
   - focused local Decision Core gate and contract coverage.
6. `docs/m1/M1_DECISION_RESOLUTION_DIFY_SETUP.md`
   - copy-exact manual setup for one new separate Dify Workflow;
   - exact nodes, variables, SYSTEM and USER message layout, output contract, provider boundary, publish/key steps, environment variables, three canonical smokes, checks, and prohibitions.

## Confirmed-input gate evidence

`assertM1ConfirmedInputGate`:

- rejects `m1.input-draft.v1` with `m1_decision_core_draft_rejected`;
- rejects any other schema with `m1_decision_core_confirmed_schema_required`;
- invokes the existing exact `validateM1ConfirmedInput`;
- rejects invalid values, groups, statuses, or structure with `m1_decision_core_confirmed_input_invalid`;
- accepts only `m1.confirmed-input.v1` after validation.

Request construction preserves the complete confirmed-input object. Canonicalization sorts object keys only; it does not normalize values, translate text, reorder arrays, or change any status.

The request contains exactly:

- `confirmed_input_id`
- `confirmed_input_schema_version`
- `confirmed_input_hash`
- `decision_state_schema_version`
- `confirmed_input_json`

## Input-hash and confirmed-fact binding

The deterministic binding is:

`SHA-256(canonical JSON of the complete validated m1.confirmed-input.v1 object)`

An accepted Decision State must contain:

- the same `confirmed_input_id`;
- `m1.confirmed-input.v1`;
- the locally recomputed 64-character lowercase SHA-256;
- an exact parsed-value copy of the complete confirmed input.

The response parser rejects a Provider attempt to change a confirmed value or status with `confirmed_input_overwrite_attempt`. A material change from `1MW` to `2MW` produces a different hash and causes the stale state to fail with `binding_confirmed_input_hash_mismatch`.

## Decision State contract evidence

Required exact top-level structures include:

- decision identity and confirmed-input binding;
- confirmed-input snapshot;
- frozen method and Evidence Boundary;
- product, protected-load, and system boundaries;
- architecture alternatives;
- application fit and no-fit boundary;
- exact O1–O7 decision outputs;
- customer and product requirements;
- differentiators and critical metrics;
- tradeoffs and risks;
- decision gates and validation actions;
- recommendation and required action;
- funding boundary and confidence;
- unresolved unknowns;
- Claim Candidates.

Each O1–O7 record has exact output ID/title, status, decision, source IDs, unknown IDs, and decision impact. Missing, extra, renamed, or incorrectly titled O1–O7 output records fail validation.

## Claim Candidate evidence

Every Claim Candidate requires:

- claim ID;
- statement or value;
- claim type;
- proposed class;
- source IDs;
- exact product/application/customer/region/time scope;
- numeric provenance or explicit `null`;
- reasoning bridge;
- uncertainty;
- decision impact.

`SOURCE_BACKED` and `INFERRED_BRIDGE` require at least one allowed source ID. `UNKNOWN` requires an empty source list. Numeric provenance requires value, unit, source type, source ID, derivation, denominator, and exclusions, and its source must occur in the Claim Candidate source list.

The local stage produces Claim Candidates only. There is no Claim Ledger, deterministic Claim Guard, final report, report sectioning, or UI prose generator.

## UNKNOWN evidence

Every confirmed:

- scalar value `unknown`;
- `USER_MARKED_UNKNOWN` field; or
- empty array with `draft_status=UNKNOWN`

must be represented in `unresolved_unknowns`.

Each unresolved unknown has an explicit decision impact, required validation action, and one or more constraints on:

- confidence;
- funding boundary;
- decision gate;
- recommendation;
- validation action.

The focused test removes `target_timing` from `unresolved_unknowns` and verifies deterministic rejection with `confirmed_unknown_target_timing_not_decision_active`.

## Manual Dify setup evidence

Artifact:

`docs/m1/M1_DECISION_RESOLUTION_DIFY_SETUP.md`

The artifact specifies:

- a new app named `DCPI M1 Decision Resolution`;
- exactly `Start → Decision Resolution LLM → Structured Output (End)`;
- five exact Start variables matching local request construction;
- one fixed Provider/model configuration;
- one exact SYSTEM message and one separate USER message with Dify variable chips;
- the full `m1.decision-state.v1` top-level and nested record contract;
- exact frozen O1–O7 and seven-source Evidence Boundary;
- one End output named `decision_state_json`;
- dedicated publish, workflow-version, API-key, and environment-variable steps;
- three canonical confirmed-input smoke payloads and SHA-256 hashes;
- expected structural, binding, unknown-preservation, and material-context checks;
- explicit prohibited settings and changes.

No secret value appears in the artifact.

## Focused tests and regression

Final command:

`node --test src/ask/m1/__tests__/m1DecisionCore.test.js src/ask/m1/__tests__/m1ConfirmedInput.test.js src/ask/m1/__tests__/m1ConfirmedInputUi.test.js src/ask/m1/__tests__/m1InputUnderstanding.test.js`

Final result:

- 28 passed
- 0 failed
- Decision Core: 10 passed
- existing confirmed-input contract: 4 passed
- existing confirmed-input UI: 2 passed
- existing Input Understanding regression: 12 passed

Covered Decision Core cases:

1. confirmed-only input gate and deterministic draft/unconfirmed rejection;
2. confirmed values/statuses and exact request preservation;
3. complete Decision State contract;
4. fail-closed malformed binding and claim-source structures;
5. exact O1–O7 presence;
6. response parsing and confirmed snapshot preservation;
7. Provider overwrite rejection;
8. Claim Candidate source/scope/reasoning/numeric-provenance checks;
9. UNKNOWN decision-active preservation;
10. material-context hash change and stale-state rejection;
11. dedicated transport request and workflow-identity enforcement.

The first combined regression attempt found no `react` package because this clean worktree intentionally has no local `node_modules`. As in the prior confirmed-input gate, verification temporarily used a symlink to the already-installed dependency directory in the known Phase 2B sibling. The final full test run and build passed, and the symlink was removed. No dependency, package manifest, lockfile, or source file was changed by that setup.

## Build

Command:

`npm run build`

Result:

- PASS
- Vite `5.4.21`
- 2299 modules transformed
- output generated successfully
- existing chunk-size warning only

## Scope audit

The final source boundary leaves unchanged:

- `api/m1-input-understanding.js`
- `src/ask/m1/contracts/m1ConfirmedInput.js`
- `src/ask/m1/m1ConfirmedInputFlow.js`
- `src/ask/m1/M1ConfirmedInputPanel.jsx`
- `src/ask/m1/__tests__/m1ConfirmedInput.test.js`
- `src/ask/m1/__tests__/m1ConfirmedInputUi.test.js`
- `src/App.jsx`
- `src/App.css`
- existing Dify Input Understanding workflow
- Generic V2.2

There was no live Dify call, Prompt mutation, Provider mutation, API key creation, workflow publication, confirmation-button integration, report generation, push, merge, or deploy.

## Gate result

All local PASS conditions are satisfied.

`M1_DECISION_CORE_LOCAL_PASS`
