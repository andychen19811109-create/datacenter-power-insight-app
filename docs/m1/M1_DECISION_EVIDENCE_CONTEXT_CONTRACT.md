# M1 Decision Evidence Context Contract

## 1. Boundary

This package adds a local, deterministic evidence context between validated
`m1.confirmed-input.v1` and proposed `m1.decision-state.v1`.

The frozen seven-source allow-list is an identity boundary only. It is not evidence.
A source can support a Decision State reference only when that source and the
relevant, manually confirmed evidence unit are present in the exact Evidence
Snapshot bound to the request.

No real NVIDIA, OCP, Digital Realty, Schneider Electric, Vertiv, UL, or OSHA
evidence was retrieved or populated in this package. Production code contains no
industry evidence statements. Test fixtures are in-memory only and visibly marked
`TEST_ONLY_NOT_REAL_EVIDENCE`.

## 2. `m1.evidence-snapshot.v1`

The top-level object has exactly:

- `schema_version`: exactly `m1.evidence-snapshot.v1`
- `evidence_snapshot_id`: non-empty string
- `created_at`: ISO-8601 timestamp
- `as_of_date`: `YYYY-MM-DD`
- `source_policy`: exactly `mode` plus `allowed_source_ids`
- `sources`: zero or more source records

`source_policy.mode` is exactly `FROZEN_SEVEN_SOURCE`.
`allowed_source_ids` contains all seven frozen IDs in their frozen order:

1. `NVIDIA_800VDC_AI_POWER`
2. `OCP_MT_DIABLO`
3. `DIGITAL_REALTY_HIGH_DENSITY_COLOCATION`
4. `SCHNEIDER_GALAXY_VXL`
5. `VERTIV_AI_POWER_SWING_UPS`
6. `UL_1778`
7. `OSHA_NRTL`

The `sources` array may contain a subset. Every source ID must be in the
allow-list and unique. Every source record has exactly:

- `source_id`
- `source_title`
- `publisher`
- `document_date`
- `retrieved_at`
- `source_type`
- `applicable_scope`
- `evidence_units`
- `limitations`

`source_type` is one of `OFFICIAL_WEBSITE`, `OFFICIAL_WHITEPAPER`,
`OFFICIAL_STANDARD`, `OFFICIAL_PRODUCT_DOCUMENTATION`, or
`OFFICIAL_REGULATORY_MATERIAL`. `retrieved_at` is an ISO-8601 timestamp.
`limitations` is a non-empty-string array.

Both source `applicable_scope` and evidence-unit `scope` have exactly
`product`, `application`, `customer`, `region`, and `time`. Every value is a
non-empty-string array. Unknown or unbounded scope is represented explicitly,
for example as `["unknown"]`; omission is invalid.

Every evidence unit has exactly:

- `evidence_unit_id`
- `statement`
- `evidence_type`
- `scope`
- `numeric_provenance`
- `limitations`

Evidence unit IDs are globally unique within the snapshot. `evidence_type` is
one of `FACT`, `BENCHMARK`, `REQUIREMENT`, `METRIC`, or `RISK`.
`statement` is a manually confirmed, independently citable minimum unit. The
contract never generates or rewrites it.

`numeric_provenance` is `null` for nonnumeric evidence. Otherwise it has
exactly `value`, `unit`, `source_type`, `source_id`, `derivation`,
`denominator`, and `exclusions`; `value` is finite numeric, `source_id` equals
the containing source, and `exclusions` is a non-empty-string array.

## 3. Canonical JSON and SHA-256

`canonicalStringifyM1EvidenceSnapshot` sorts object keys recursively while
preserving every business-array order. `hashM1EvidenceSnapshot` hashes the
canonical UTF-8 JSON with SHA-256 and returns 64 lowercase hexadecimal
characters.

The snapshot never contains its own hash. The ID, schema version, hash, and
canonical JSON travel as separate request inputs. Key insertion order does not
change the hash; evidence-unit order or any content mutation does.

## 4. Decision Evidence request envelope

`buildM1DecisionEvidenceRequest` first invokes the existing Confirmed Input
request builder. Its five existing inputs remain byte-for-value unchanged:

- `confirmed_input_id`
- `confirmed_input_schema_version`
- `confirmed_input_hash`
- `decision_state_schema_version`
- `confirmed_input_json`

It then appends:

- `evidence_snapshot_id`
- `evidence_snapshot_schema_version`
- `evidence_snapshot_hash`
- `evidence_snapshot_json`

The builder accepts only a valid `m1.evidence-snapshot.v1`, emits canonical
Evidence JSON, takes the ID and schema from that JSON, and locally recomputes
the hash. Dify must not edit Evidence JSON.

## 5. `m1.evidence-binding.v1`

The Guard returns an independent binding object and never modifies the original
Decision State. Its top level has exactly:

- `schema_version`
- `decision_id`
- `evidence_snapshot_id`
- `evidence_snapshot_hash`
- `claim_bindings`
- `violations`

Every claim binding has exactly `claim_id`, `proposed_class`, `source_ids`,
`evidence_unit_ids`, and `binding_status`. Binding status is `BOUND`,
`UNKNOWN_NO_EVIDENCE_REQUIRED`, or `REJECTED`.

A successful Guard result has no violations. A failed result retains explicit
violations and marks affected claims `REJECTED`; it does not repair, rewrite,
downgrade, or delete Decision State output.

## 6. Deterministic Guard

The Guard applies these layers in order:

1. Validate exact Snapshot structure, ID, schema, hash, allow-list, uniqueness,
   scope, and numeric provenance.
2. Reuse `validateM1DecisionState` with the original Confirmed Input and the
   existing Confirmed Input hash. This preserves exact equality and overwrite
   protection without a second Confirmed Input implementation.
3. Require every Decision State source reference to exist in this snapshot,
   not merely in the allow-list; reject empty and duplicate IDs.
4. Require all referenced unknown IDs to exist in `unresolved_unknowns`.
5. Enforce `SUPPORTED`, `QUALIFIED`, `UNKNOWN`, `BLOCKED`, and architecture-fit
   basis rules across boundaries, alternatives, O1-O7, requirements,
   differentiators, metrics, and recommendation.
6. Require every non-empty technical trade-off and risk to have a source that
   exists in this snapshot. Unknown IDs alone cannot retain a technical claim.
7. Accept an unconfirmed owner only as `TBD` or `USER_TO_ASSIGN`; otherwise emit
   `unconfirmed_owner_assignment`.
8. Bind `SOURCE_BACKED` only by exact statement equality after trim, CRLF/LF
   normalization, and Unicode NFC normalization. Semantic or paraphrase matching
   is forbidden.
9. Require numeric claim value and full numeric provenance to match; require
   every concrete claim-scope value to be present in the Evidence Unit scope.
10. Bind a correctly shaped source-free `UNKNOWN` as
    `UNKNOWN_NO_EVIDENCE_REQUIRED`.

## 7. Frozen v1 limitation

`m1.decision-state.v1` Claim Candidates do not contain independent
`evidence_unit_ids`. Therefore `INFERRED_BRIDGE` cannot be machine-bound
reliably and always fails with:

`inferred_bridge_not_deterministically_bindable_v1`

Opening `INFERRED_BRIDGE` requires a separate schema and Gate decision. This
package does not change `m1.decision-state.v1`, `m1.confirmed-input.v1`,
`D2.frozen.O1-O7.v1`, O1-O7, the seven-source order, UI, Provider, or model.
