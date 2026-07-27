# M1 Official Evidence Wave 1 v0.2 — Local Evidence

## Repository and Gate identity

- Worktree: `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-m1-demo`
- Branch: `codex/m1-professional-demo-mvp`
- Starting HEAD: `a8d595a612cd466002b3c173cb1af6a6a9c8384a`
- Final HEAD: the single local commit containing this document, with subject
  `Add M1 Wave 1 official evidence snapshot`; the exact resulting SHA is
  reported in the post-commit Gate handoff because a commit cannot contain its
  own SHA.
- Commit: one local commit with subject
  `Add M1 Wave 1 official evidence snapshot`
- Push / PR / merge / deploy: not authorized and not performed.

## Authorized inputs and stored artifact

- Authorized JSON:
  `M1_OFFICIAL_EVIDENCE_PACK_WAVE1_AUTHORIZED_v0.2.json`
- Authorized JSON file SHA-256:
  `67e112d4bf936ebd76924c632e3267b9ef0a92bdb903a6d6a64854d2fedaa970`
- Authorized HANDOFF:
  `M1_OFFICIAL_EVIDENCE_PACK_WAVE1_CODEX_HANDOFF_v0.2.md`
- Authorized HANDOFF file SHA-256:
  `69193f7ee1c3646688bf7403c9a74f7eede9b4028f22b46aec5233a7061d5f09`
- Production Snapshot path:
  `src/ask/m1/evidence/m1OfficialEvidenceWave1.v0.2.json`
- Implementation baseline path:
  `docs/m1/M1_OFFICIAL_EVIDENCE_WAVE1_IMPLEMENTATION_BASELINE.md`
- Snapshot ID:
  `m1_wave1_official_evidence_authorized_20260726_v02`
- Snapshot schema: `m1.evidence-snapshot.v1`
- Production Snapshot is JSON-semantically identical to the authorized
  attachment.

## Production Artifact identity

- Source count: `3`
- Evidence Unit count: `16`
- Authorized Source IDs, in production order:
  1. `NVIDIA_800VDC_AI_POWER`
  2. `SCHNEIDER_GALAXY_VXL`
  3. `VERTIV_AI_POWER_SWING_UPS`
- Retired Evidence Unit: `SCHNEIDER_EU_001` is absent.
- Added Evidence Units:
  - `SCHNEIDER_EU_001A`
  - `SCHNEIDER_EU_001B`
- OCP Source `OCP_MT_DIABLO`: absent and held for page-level PDF verification.
- OCP Evidence Units `OCP_EU_001` and `OCP_EU_002`: absent.
- Frozen seven-source allow-list: complete and in exact production order.

## Validator, canonicalization, and hash

- `validateM1EvidenceSnapshot`: `PASS`, `{ ok: true, errors: [] }`
- All non-null `numeric_provenance.value` values are finite JSON numbers.
- All non-null Numeric Provenance denominators are non-empty strings.
- Canonical Snapshot SHA-256:
  `e0add5fedb9ef17752f823e8bfe2757add156fcef98a20ea741b73c818d30e9b`
- Hash run 1 equals hash run 2: `PASS`.
- Object-key reordering leaves the hash unchanged: `PASS`.
- A one-character statement mutation changes the hash: `PASS`.
- Evidence Unit array reordering changes the hash: `PASS`.
- Source array reordering changes the hash: `PASS`.
- All mutations used in-memory clones; the production JSON was not modified.

## Request Envelope

`buildM1DecisionEvidenceRequest` result: `PASS`.

- `evidence_snapshot_id`: matches the Snapshot.
- `evidence_snapshot_schema_version`: `m1.evidence-snapshot.v1`.
- `evidence_snapshot_hash`: matches the production recomputation.
- `evidence_snapshot_json`: exact production canonical JSON.
- The existing five Confirmed Input variables remain byte-for-byte equal to
  the existing Decision Resolution request:
  - `confirmed_input_id`
  - `confirmed_input_schema_version`
  - `confirmed_input_hash`
  - `decision_state_schema_version`
  - `confirmed_input_json`

No Dify or Provider request was made.

## Wave 1 v0.2 Guard verification

Focused command:

```text
node --test src/ask/m1/__tests__/m1OfficialEvidenceWave1.test.js
```

Focused result:

- PASS: `27`
- FAIL: `0`

Positive bindings:

- `NVIDIA_EU_001`: exact statement and Numeric Provenance produce `BOUND`.
- `SCHNEIDER_EU_001A`: exact 500 kW claim produces `BOUND`.
- `SCHNEIDER_EU_001B`: exact 1250 kW claim produces `BOUND`.
- `SCHNEIDER_EU_004`: exact 97.2% normal-operation claim and complete
  operating point produce `BOUND`.
- `VERTIV_EU_003`: exact Battery Shield 0%-to-100% rated-load-step claim,
  value, unit, denominator, and scope produce `BOUND`.
- Source-free `UNKNOWN`: `UNKNOWN_NO_EVIDENCE_REQUIRED`.

Negative and identity checks fail closed:

1. OCP is allow-listed but absent from the Snapshot:
   `source_id_absent_from_snapshot`.
2. Retired `SCHNEIDER_EU_001` is absent and cannot bind.
3. NVIDIA statement paraphrase:
   `evidence_statement_exact_match_missing`.
4. NVIDIA denominator restored to `null`: Snapshot Validator rejection.
5. Schneider 500 changed to 501: numeric binding rejection.
6. Schneider 1250 changed to 1200: numeric binding rejection.
7. Schneider endpoints merged into `"500-1250"`: Snapshot Validator rejection.
8. Schneider normal-operation 97.2% changed to 99.4%: numeric binding rejection.
9. Schneider normal operation relabeled as eConversion: exact-match rejection.
10. Schneider denominator stripped of the full operating point: numeric
    binding rejection.
11. Vertiv value restored to `"0-100"`: Snapshot Validator rejection.
12. Vertiv value changed to 120: numeric binding rejection.
13. Vertiv Battery Shield generalized to all UPS: exact-match/scope rejection.
14. `UNKNOWN` carrying a source: `unknown_sources_forbidden`.
15. `INFERRED_BRIDGE`:
    `inferred_bridge_not_deterministically_bindable_v1`.
16. Adding OCP: Wave 1 v0.2 Artifact identity rejection.
17. Adding a fourth non-production Source: Wave 1 v0.2 identity rejection.
18. Reducing Units to 15 or increasing them to 17: Wave 1 v0.2 identity
    rejection while the general Snapshot schema remains unchanged.

## Regression and production build

Final full M1 command:

```text
node --test src/ask/m1/__tests__/*.test.js
```

Final full M1 result:

- PASS: `93`
- FAIL: `0`
- skipped / cancelled / todo: `0 / 0 / 0`

The first invocation produced `91 PASS / 1 environment-load failure` because
this dedicated worktree had no `node_modules` and React could not load. No
semantic test failed. The already-existing adjacent local dependency tree was
temporarily linked, with no download or installation; the final result above
passed, and the ignored link was removed.

Production build command:

```text
npm run build
```

Build result: `PASS`.

Vite transformed `2299` modules and emitted the production bundle. The existing
large-chunk advisory remained non-blocking; no UI or bundling file changed.

## External activity and state

- Network calls: `0`
- Dify calls: `0`
- Dify modifications/publications: `0`
- Provider calls: `0`
- S1 / S2 / S3 runs: `0 / 0 / 0`
- Evidence variables applied to Dify: `0`
- Worktree state after the required local commit: clean.

## Verdict

`M1_WAVE1_EVIDENCE_REPOSITORY_INTEGRATION_PASS`

The next and only authorized action is GPT local implementation Gate review of
the committed Snapshot, canonical hash, Validator, Envelope, Guard, test
evidence, and file boundary. Dify remains frozen.
