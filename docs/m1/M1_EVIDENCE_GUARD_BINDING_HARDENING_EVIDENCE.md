# M1 Evidence Guard Claim Binding Hardening Evidence

## Gate identity

- Package: `M1 EVIDENCE GUARD CLAIM BINDING HARDENING`
- Worktree:
  `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-m1-demo`
- Branch: `codex/m1-professional-demo-mvp`
- Starting HEAD:
  `46d651aecae23eb9b6da4aceca3319422738a943`
- Final local commit subject: `Harden M1 evidence claim binding`
- Final HEAD / commit SHA: authoritative value is emitted by the post-commit
  `git rev-parse HEAD` Gate and final handoff. A Git commit cannot embed its own
  SHA without changing that SHA.

## Implemented hardening

1. Claim Type binding is fail-closed.
   - A `SOURCE_BACKED` Claim binds only when `claim_type` exactly equals the
     matching Evidence Unit `evidence_type`.
   - Mismatch produces
     `claim_type_evidence_type_mismatch`.
   - The Guard does not rewrite Claim Type.
2. Nonnumeric Evidence binding is fail-closed.
   - When Evidence Unit `numeric_provenance` is `null`, the Claim must have both
     `numeric_provenance: null` and `value: null`.
   - A non-null Claim value produces
     `nonnumeric_claim_value_forbidden`.
   - The Guard does not clear or rewrite Claim values.
3. Every Claim source must independently bind.
   - Every `source_id` must have at least one Evidence Unit that matches the
     normalized exact Statement, Evidence Type, five-part Scope, numeric
     provenance, and value.
   - An extra or unsupported source produces
     `unbound_claim_source_id`.
   - The Claim is `REJECTED`; the binding output does not retain unsupported
     sources, and the Violation makes the rejection explicit.

The input `m1.decision-state.v1` object is never mutated.

## Test evidence

- New production-Guard tests: `10`.
  - Nonnumeric `NVIDIA_EU_003` REQUIREMENT positive binding.
  - Nonnumeric `VERTIV_EU_002` RISK positive binding.
  - RISK-to-FACT, REQUIREMENT-to-FACT, and numeric METRIC-to-FACT rejection.
  - String and numeric values rejected for nonnumeric Evidence.
  - NVIDIA-plus-Schneider and Schneider-plus-Vertiv extra-source rejection.
  - Explicit `TEST_ONLY` in-memory multi-source positive binding where every
    source has an exact Evidence Unit.
- Focused Guard/Wave 1 tests:
  `63 PASS / 0 FAIL / 0 skipped`.
- Full M1 regression:
  `103 PASS / 0 FAIL / 0 skipped`.
- Existing NVIDIA, Schneider, and Vertiv positive bindings remain PASS.
- Existing source-free `UNKNOWN` behavior remains PASS.
- Existing `INFERRED_BRIDGE` rejection remains fail-closed.
- Production build: PASS.
  - Vite transformed `2299` modules.
  - Existing large-chunk advisory only.
- `git diff --check`: PASS.

The first full-M1 attempt could not resolve React because this dedicated
worktree has no `node_modules`. A temporary untracked symlink to the existing
sibling dependency tree was used. The sandboxed rerun then hit Vite temporary
config `EPERM`; the same test command was rerun with local worktree write
permission and passed. The temporary symlink was removed before final scope
verification.

## Frozen artifact and external-action proof

- Production Snapshot:
  `src/ask/m1/evidence/m1OfficialEvidenceWave1.v0.2.json`
- Snapshot file diff: none.
- Snapshot ID remains:
  `m1_wave1_official_evidence_authorized_20260726_v02`.
- Canonical Snapshot Hash remains exactly:
  `e0add5fedb9ef17752f823e8bfe2757add156fcef98a20ea741b73c818d30e9b`.
- A production-artifact test now asserts that exact fixed Hash.
- Wave 1 v0.2 remains exactly 3 production Sources and 16 Evidence Units.
- Dify calls: `0`.
- Dify modifications/publications: `0`.
- Provider/model calls: `0`.
- Network calls: `0`.
- S1/S2/S3 runs: `0`.
- Push/PR/merge/deploy actions: `0`.

## Worktree and verdict

- Pre-commit intended change boundary:
  - `src/ask/m1/m1DecisionEvidenceContext.js`
  - `src/ask/m1/__tests__/m1OfficialEvidenceWave1.test.js`
  - `docs/m1/M1_EVIDENCE_GUARD_BINDING_HARDENING_EVIDENCE.md`
  - `docs/m1/M1_CURRENT_HANDOFF.md`
- Production Snapshot, contracts, fixtures, schemas, Dify, Provider/model,
  Prompt, UI, and `INFERRED_BRIDGE` rule remain unchanged.
- Required post-commit state: clean worktree. The authoritative clean-state and
  final SHA evidence are emitted only after the local commit completes.
- Verdict:
  `M1_EVIDENCE_GUARD_BINDING_HARDENING_PASS`.
