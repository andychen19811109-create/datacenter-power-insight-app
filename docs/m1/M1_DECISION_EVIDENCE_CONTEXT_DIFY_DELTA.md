# M1 Decision Evidence Context — Future Dify Delta

> **NOT AUTHORIZED FOR DIFY APPLICATION UNTIL LOCAL GATE AND GPT REVIEW PASS**

This document describes a future manual change only. This package did not open,
edit, test, publish, or call Dify.

## Frozen configuration

Keep the current three-node topology, Provider/model, and output contract
unchanged:

- `Start → Decision Resolution LLM → Structured Output`
- Provider: `langgenius/siliconflow/siliconflow`
- Model: `Qwen/Qwen3.5-397B-A17B`
- Thinking: `false`
- response format: `JSON Object`
- tools, memory, conversation history, automatic fallback, and node retry: off
- current five Confirmed Input Start variables: unchanged
- existing SYSTEM message semantics: unchanged until a later authorized Gate

Do not add an LLM node, retrieval, RAG, Knowledge Base, code repair, template,
report, agent, Provider, model, retry, or UI integration.

## Future Start variables

After the local Gate and GPT review pass, add exactly these four required
variables:

| Variable | Dify type | Required | Maximum length | Runtime rule |
|---|---|---:|---:|---|
| `evidence_snapshot_id` | text | yes | 128 | Must equal `evidence_snapshot_json.evidence_snapshot_id`. |
| `evidence_snapshot_schema_version` | text | yes | 64 | Must equal `m1.evidence-snapshot.v1`. |
| `evidence_snapshot_hash` | text | yes | 64 | Must equal the local SHA-256 recomputation over canonical Evidence JSON. |
| `evidence_snapshot_json` | paragraph | yes | Set only after the first Evidence Pack is approved | Canonical JSON from the local builder; Dify must not edit it. |

The existing five Confirmed Input variables remain unchanged and in place.

## Future USER message variable chips

After the existing `confirmed_input_json` block, insert four Dify-native
variable chips. Do not type look-alike braces manually:

```text
evidence_snapshot_id:
{{#start.evidence_snapshot_id#}}

evidence_snapshot_schema_version:
{{#start.evidence_snapshot_schema_version#}}

evidence_snapshot_hash:
{{#start.evidence_snapshot_hash#}}

evidence_snapshot_json:
{{#start.evidence_snapshot_json#}}
```

No Evidence JSON may be copied into the SYSTEM message or manually rewritten in
the LLM node.

## Acceptance conditions for a later authorized Gate

1. The local builder emits the unchanged five Confirmed Input inputs plus the
   exact four Evidence inputs.
2. Evidence schema, ID, canonical JSON, and locally recomputed hash agree.
3. The workflow receives an approved Evidence Snapshot, not only the seven
   allowed source names.
4. A source ID absent from `sources` cannot support a Decision State record.
5. `SOURCE_BACKED` output is accepted locally only after exact Evidence Unit
   binding.
6. Source-free `UNKNOWN` remains acceptable.
7. `INFERRED_BRIDGE` remains rejected by local v1 Guard.
8. The current S1 pollution case fails locally.
9. Thinking remains `false`; output remains one JSON Object.
10. Provider/model and three-node topology remain unchanged.
11. No publication occurs until a separate explicit Dify application Gate.

The next action is not a Dify edit. GPT must first lead creation and review of
the initial official Evidence Pack under a separate Gate.
