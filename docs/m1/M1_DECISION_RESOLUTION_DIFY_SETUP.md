# M1 Decision Resolution — Manual Dify Setup

## 1. Scope and frozen identity

Create a new, separate Dify **Workflow** app. Do not edit, clone over, or repurpose either the existing `DCPI M1 Professional Demo MVP` Input Understanding workflow or the generic `市场情报智能体 V2.2` app.

Use this exact app name:

`DCPI M1 Decision Resolution`

The workflow is Decision Resolution only:

`Start → Decision Resolution LLM → Structured Output (End)`

It accepts only request variables produced after local validation of `m1.confirmed-input.v1`. It proposes `m1.decision-state.v1` and Claim Candidates. It does not create a Claim Ledger, run a deterministic Claim Guard, compose a report, generate UI prose, or call another workflow.

Frozen method identity:

`D2.frozen.O1-O7.v1`

Frozen O1–O7:

1. `O1` — Product Object Boundary
2. `O2` — Architecture Kill Precedence
3. `O3` — Application Behavior to Product Gate
4. `O4` — Benchmark Classification
5. `O5` — System Boundary Test
6. `O6` — Market Entry Completeness
7. `O7` — Unknown-to-Decision Translation

Frozen external Evidence Boundary, in this exact order:

1. `NVIDIA_800VDC_AI_POWER` — NVIDIA, 800VDC ecosystem and AI workload power behavior
2. `OCP_MT_DIABLO` — Open Compute Project, Mt Diablo and high-density power architecture
3. `DIGITAL_REALTY_HIGH_DENSITY_COLOCATION` — Digital Realty, high-density colocation
4. `SCHNEIDER_GALAXY_VXL` — Schneider Electric, Galaxy VXL
5. `VERTIV_AI_POWER_SWING_UPS` — Vertiv, AI workload power-swing UPS controls
6. `UL_1778` — UL Solutions, UL 1778
7. `OSHA_NRTL` — OSHA, NRTL program

This list is an allow-list, not proof that a source supports a claim. If the configured workflow does not contain the source content needed for a claim, the output must keep that claim `UNKNOWN`; it must not use model memory as evidence.

## 2. Start node

Create five required input variables exactly as follows.

| Variable | Dify type | Required | Maximum length | Runtime rule |
|---|---|---:|---:|---|
| `confirmed_input_id` | text | yes | 128 | Must equal the validated input object's `confirmed_input_id`. |
| `confirmed_input_schema_version` | text | yes | 64 | Must be exactly `m1.confirmed-input.v1`. |
| `confirmed_input_hash` | text | yes | 64 | Lowercase, 64-character SHA-256 of canonical confirmed-input JSON. |
| `decision_state_schema_version` | text | yes | 64 | Must be exactly `m1.decision-state.v1`. |
| `confirmed_input_json` | paragraph | yes | 8192 | Canonical JSON emitted by the local request builder; do not edit it in Dify. |

Do not add a raw question variable, draft variable, evidence-upload variable, report variable, model selector, or fallback selector.

## 3. Decision Resolution LLM node

Name the node exactly:

`Decision Resolution LLM`

Provider configuration:

- Provider: `langgenius/siliconflow/siliconflow`
- Model: `Qwen/Qwen3.5-397B-A17B`
- Mode / response type: `CHAT`
- Temperature: leave unset; do not add it if the Provider does not expose it
- Output-token control: retain the Provider default if Dify does not expose it
- Tools / function calling: off
- Vision: off
- Memory: off
- Conversation history: off
- Automatic model fallback: off
- Retry in the Dify node: off

Use one Provider/model only. A later Provider or model change requires a separate explicit gate.

### 3.1 Exact SYSTEM message

Create one `SYSTEM` message and paste the following text exactly:

```text
You are the DCPI M1 Decision Resolution stage. You receive one locally validated m1.confirmed-input.v1 object and must return one JSON object matching m1.decision-state.v1.

HARD INPUT GATE
1. confirmed_input_schema_version must equal m1.confirmed-input.v1.
2. decision_state_schema_version must equal m1.decision-state.v1.
3. confirmed_input_id must exactly equal confirmed_input_json.confirmed_input_id.
4. confirmed_input_hash must be copied exactly into binding.confirmed_input_hash.
5. Copy the parsed confirmed_input_json object exactly into confirmed_input. Do not normalize, translate, summarize, correct, reorder array values, replace values, or change draft_status or confirmed_status.
6. Provider or model output is never authoritative over confirmed user facts.

FROZEN METHOD
Apply D2.frozen.O1-O7.v1 and return all seven outputs:
O1 Product Object Boundary
O2 Architecture Kill Precedence
O3 Application Behavior to Product Gate
O4 Benchmark Classification
O5 System Boundary Test
O6 Market Entry Completeness
O7 Unknown-to-Decision Translation

FROZEN EXTERNAL EVIDENCE ALLOW-LIST
NVIDIA_800VDC_AI_POWER
OCP_MT_DIABLO
DIGITAL_REALTY_HIGH_DENSITY_COLOCATION
SCHNEIDER_GALAXY_VXL
VERTIV_AI_POWER_SWING_UPS
UL_1778
OSHA_NRTL

The allow-list is not evidence by itself. Do not claim that a source supports a statement unless the available workflow context actually contains that support. Do not use model memory as evidence. Do not invent facts, evidence, numbers, benchmarks, customer requirements, product requirements, timing, region details, or source support. When support is missing, use UNKNOWN with no source IDs.

UNKNOWN RULE
Every confirmed value of "unknown", every USER_MARKED_UNKNOWN field, and every confirmed empty array whose draft_status is UNKNOWN must appear in unresolved_unknowns. Each such unknown must remain decision-active by constraining at least one of confidence, funding_boundary, decision_gate, recommendation, or validation_action. Never replace UNKNOWN with a fact.

CLAIM BASIS RULE
Decision Resolution proposes Claim Candidates only. Every Claim Candidate must include claim_id, statement or value, claim_type, proposed_class, source_ids, full product/application/customer/region/time scope, numeric_provenance when numeric, reasoning_bridge, uncertainty, and decision_impact. SOURCE_BACKED and INFERRED_BRIDGE candidates require at least one allowed source ID. UNKNOWN candidates must use an empty source_ids array. Numeric provenance must preserve value, unit, source_type, source_id, derivation, denominator, and exclusions.

BOUNDARIES
Return structured decision state, not a final Claim Ledger, deterministic Claim Guard result, final report, report section, executive prose, UI copy, or Markdown. Do not call tools, retrieval, agents, other models, or other workflows.

OUTPUT RULE
Return exactly one valid JSON object and nothing else. Do not wrap it in Markdown fences. Use every required key in the m1.decision-state.v1 contract. Do not add keys.
```

### 3.2 Exact USER message

Create one separate `USER` message after the SYSTEM message. Insert Dify variable chips; do not type look-alike braces manually. Its visible layout must be exactly:

```text
confirmed_input_id:
{{#start.confirmed_input_id#}}

confirmed_input_schema_version:
{{#start.confirmed_input_schema_version#}}

confirmed_input_hash:
{{#start.confirmed_input_hash#}}

decision_state_schema_version:
{{#start.decision_state_schema_version#}}

confirmed_input_json:
{{#start.confirmed_input_json#}}
```

The node must therefore contain exactly two messages: one SYSTEM message and one USER message.

## 4. Exact output JSON contract

The LLM output must be one object with exactly these top-level keys:

```json
{
  "schema_version": "m1.decision-state.v1",
  "decision_id": "<non-empty string>",
  "binding": {
    "confirmed_input_id": "<exact Start value>",
    "confirmed_input_schema_version": "m1.confirmed-input.v1",
    "confirmed_input_hash": "<exact lowercase 64-character Start value>"
  },
  "confirmed_input": {},
  "method": {
    "method_version": "D2.frozen.O1-O7.v1",
    "outputs": ["O1", "O2", "O3", "O4", "O5", "O6", "O7"]
  },
  "evidence_boundary": {
    "mode": "FROZEN_SEVEN_SOURCE",
    "source_ids": [
      "NVIDIA_800VDC_AI_POWER",
      "OCP_MT_DIABLO",
      "DIGITAL_REALTY_HIGH_DENSITY_COLOCATION",
      "SCHNEIDER_GALAXY_VXL",
      "VERTIV_AI_POWER_SWING_UPS",
      "UL_1778",
      "OSHA_NRTL"
    ]
  },
  "product_boundary": {},
  "protected_load_boundary": {},
  "system_boundary": {},
  "architecture_alternatives": [],
  "application_fit": {},
  "no_fit_boundary": {},
  "decision_outputs": {},
  "customer_requirements": [],
  "product_requirements": [],
  "differentiators": [],
  "critical_metrics": [],
  "tradeoffs": [],
  "risks": [],
  "decision_gates": [],
  "validation_actions": [],
  "recommendation": {},
  "required_action": {},
  "funding_boundary": {},
  "confidence": {},
  "unresolved_unknowns": [],
  "claim_candidates": []
}
```

`confirmed_input` is not an open object: it must be the exact parsed `confirmed_input_json` object, including all values, arrays, IDs, timestamps, groups, `draft_status`, and `confirmed_status`.

Use these exact nested record shapes and enums:

| Record | Exact keys and constraints |
|---|---|
| `product_boundary`, `protected_load_boundary`, `system_boundary`, `application_fit`, `no_fit_boundary` | `status`, `statement`, `source_ids`, `unknown_ids`, `decision_impact`; status is `SUPPORTED`, `QUALIFIED`, `UNKNOWN`, or `BLOCKED`; source or unknown basis is required. |
| One `architecture_alternatives[]` item | `alternative_id`, `label`, `fit_status`, `rationale`, `source_ids`, `unknown_ids`, `decision_impact`; fit status is `FIT`, `CONDITIONAL_FIT`, `NO_FIT`, or `UNKNOWN`. At least one item is required. |
| `decision_outputs` | Exact keys `O1` through `O7`. Each value has `output_id`, `title`, `status`, `decision`, `source_ids`, `unknown_ids`, `decision_impact`. `output_id` and title must match the frozen list. |
| One customer/product requirement | `requirement_id`, `statement`, `priority`, `status`, `source_ids`, `unknown_ids`, `decision_impact`; priority is `CRITICAL`, `HIGH`, `MEDIUM`, or `LOW`. |
| One differentiator | `differentiator_id`, `statement`, `benchmark_class`, `status`, `source_ids`, `unknown_ids`, `decision_impact`. |
| One critical metric | `metric_id`, `name`, `value`, `unit`, `status`, `source_ids`, `unknown_ids`, `decision_impact`; value is number, non-empty string, or `null` for unknown. |
| One tradeoff | `tradeoff_id`, `benefit`, `cost`, `decision_impact`, `source_ids`, `unknown_ids`. |
| One risk | `risk_id`, `risk`, `likelihood`, `impact`, `mitigation`, `source_ids`, `unknown_ids`. |
| One decision gate | `gate_id`, `condition`, `status`, `blocking_unknown_ids`, `validation_action`, `funding_effect`; status is `OPEN`, `PASS`, `FAIL`, or `BLOCKED`. At least one gate is required. |
| One validation action | `action_id`, `action`, `owner`, `trigger`, `evidence_required`, `resolves_unknown_ids`. At least one action is required. |
| `recommendation` | `status`, `decision`, `rationale`, `conditions`, `source_ids`, `unknown_ids`. |
| `required_action` | `action`, `owner`, `timing`, `blocking`; blocking is boolean. |
| `funding_boundary` | `status`, `allowed_commitment`, `prohibited_commitment`, `release_conditions`, `unknown_ids`. |
| `confidence` | `level`, `score`, `rationale`, `constrained_by_unknown_ids`; level is `LOW`, `MEDIUM`, or `HIGH`; score is `null` or 0–1. |
| One unresolved unknown | `unknown_id`, `field`, `status`, `description`, `constrains`, `decision_impact`, `required_validation_action`; status is exactly `UNKNOWN`; `constrains` contains one or more of `confidence`, `funding_boundary`, `decision_gate`, `recommendation`, `validation_action`. |
| One Claim Candidate | At least one is required. Exact keys: `claim_id`, `statement`, `value`, `claim_type`, `proposed_class`, `source_ids`, `scope`, `numeric_provenance`, `reasoning_bridge`, `uncertainty`, `decision_impact`. |
| Claim Candidate `scope` | Exact keys `product`, `application`, `customer`, `region`, `time`; use `unknown` where a confirmed scope is unknown. |
| Claim Candidate `numeric_provenance` | `null` for nonnumeric claims; otherwise exact keys `value`, `unit`, `source_type`, `source_id`, `derivation`, `denominator`, `exclusions`. |

Claim type is one of:

`FACT`, `BENCHMARK`, `REQUIREMENT`, `METRIC`, `RECOMMENDATION`, `RISK`, `UNKNOWN`

Proposed class is one of:

`SOURCE_BACKED`, `INFERRED_BRIDGE`, `UNKNOWN`

The executable local validator is `src/ask/m1/contracts/m1DecisionState.js`. A Dify response is not accepted until that deterministic local validator also verifies exact confirmed-input equality and the locally recomputed hash.

## 5. Structured Output node

Add an **End** node and name it exactly:

`Structured Output`

Create one output only:

| Output variable | Source |
|---|---|
| `decision_state_json` | `Decision Resolution LLM` node text output |

Do not add a template, code, JSON-repair, second LLM, report, or claim-validation node between the LLM and End. Local response parsing accepts the End output as a JSON string or object and then applies the deterministic contract and binding checks.

## 6. Publish and credential boundary

1. Save the new workflow.
2. Confirm the canvas contains exactly three nodes: Start, `Decision Resolution LLM`, and `Structured Output`.
3. Confirm the Provider/model and two-message layout above.
4. Publish the new workflow once.
5. Record the published workflow-version UUID. Do not use the App ID or workflow-run ID in its place.
6. In the new app only, open **API Access → API Keys** and create a dedicated Service API key.
7. Store the API key only in the local ignored `.env.local`. Do not paste it into this document, source code, tests, evidence, Git, chat, screenshots, or the existing Input Understanding app.
8. Configure these exact environment-variable names:

```dotenv
DIFY_M1_DECISION_RESOLUTION_API_URL=<Dify base URL>/v1/workflows/run
DIFY_M1_DECISION_RESOLUTION_API_KEY=<dedicated new app Service API key>
DIFY_M1_DECISION_RESOLUTION_PUBLISHED_WORKFLOW_ID=<published workflow-version UUID>
```

The new key must not replace or reuse the Input Understanding key. The local transport uses blocking mode, performs no live call until a later integration gate, and rejects a response whose published workflow identity differs.

## 7. Three manual Smoke inputs

For all three smokes set:

- `confirmed_input_schema_version`: `m1.confirmed-input.v1`
- `decision_state_schema_version`: `m1.decision-state.v1`

### S1 — architecture choice with decision-active unknowns

- `confirmed_input_id`: `confirmed_m1_core_fixture`
- `confirmed_input_hash`: `c2e347971ff3c81fcdf09ac7ec7c6c5d621c76b11c046b0770e32f299de87395`
- `confirmed_input_json`:

```json
{"confirmation_status":"USER_CORRECTED","confirmed_at":"2026-07-24T12:00:00.000Z","confirmed_input_id":"confirmed_m1_core_fixture","groups":{"application_scenario":{"fields":{"application_scenario":{"confirmed_status":"USER_CORRECTED","draft_status":"INFERRED","value":"AI 数据中心受保护负载"}}},"constraints_unknowns":{"fields":{"contradictions":{"confirmed_status":"USER_CONFIRMED","draft_status":"EXPLICIT","value":[]},"critical_constraints":{"confirmed_status":"USER_MARKED_UNKNOWN","draft_status":"UNKNOWN","value":[]},"investment_or_product_stage":{"confirmed_status":"USER_CONFIRMED","draft_status":"INFERRED","value":"concept evaluation"},"target_timing":{"confirmed_status":"USER_MARKED_UNKNOWN","draft_status":"UNKNOWN","value":"unknown"},"unknowns":{"confirmed_status":"USER_CONFIRMED","draft_status":"UNKNOWN","value":["target_timing","critical_constraints"]}}},"customer_region":{"fields":{"region":{"confirmed_status":"USER_CONFIRMED","draft_status":"EXPLICIT","value":"REGION_ALPHA"},"target_customer":{"confirmed_status":"USER_CONFIRMED","draft_status":"EXPLICIT","value":"CUSTOMER_X"}}},"decision_type":{"fields":{"decision_intent":{"confirmed_status":"USER_CONFIRMED","draft_status":"INFERRED","value":"ARCHITECTURE_CHOICE"}}},"power_system_scope":{"fields":{"power_or_system_scope":{"confirmed_status":"USER_CONFIRMED","draft_status":"EXPLICIT","value":"1MW"}}},"product_architecture":{"fields":{"architecture_alternatives":{"confirmed_status":"USER_CONFIRMED","draft_status":"EXPLICIT","value":["UPS","800VDC"]},"primary_product_object":{"confirmed_status":"USER_CONFIRMED","draft_status":"INFERRED","value":"POWER_ARCHITECTURE_DECISION"}}}},"original_question":"为 CUSTOMER_X 在 REGION_ALPHA 评估 1MW UPS 与 800VDC，投产时间未知。","schema_version":"m1.confirmed-input.v1","source_draft_id":"draft_m1_core_fixture"}
```

Expected checks:

- one JSON object, no Markdown;
- binding ID, schema, and hash exactly match S1;
- the confirmed snapshot is byte-for-value equivalent after JSON parsing;
- all O1–O7 exist;
- `target_timing` and `critical_constraints` appear in `unresolved_unknowns`;
- both unknowns constrain confidence, funding, a gate, recommendation, or validation;
- no unsupported fact replaces either unknown.

### S2 — UPS product-investment boundary

- `confirmed_input_id`: `confirmed_smoke_2`
- `confirmed_input_hash`: `0cea0516e6104e4217ecb9e001c40c72133412f0f987698cbc15a9ee38489c5e`
- `confirmed_input_json`:

```json
{"confirmation_status":"USER_CORRECTED","confirmed_at":"2026-07-24T12:00:00.000Z","confirmed_input_id":"confirmed_smoke_2","groups":{"application_scenario":{"fields":{"application_scenario":{"confirmed_status":"USER_CORRECTED","draft_status":"INFERRED","value":"AI 数据中心受保护负载"}}},"constraints_unknowns":{"fields":{"contradictions":{"confirmed_status":"USER_CONFIRMED","draft_status":"EXPLICIT","value":[]},"critical_constraints":{"confirmed_status":"USER_MARKED_UNKNOWN","draft_status":"UNKNOWN","value":[]},"investment_or_product_stage":{"confirmed_status":"USER_CONFIRMED","draft_status":"INFERRED","value":"concept evaluation"},"target_timing":{"confirmed_status":"USER_MARKED_UNKNOWN","draft_status":"UNKNOWN","value":"unknown"},"unknowns":{"confirmed_status":"USER_CONFIRMED","draft_status":"UNKNOWN","value":["target_timing","critical_constraints"]}}},"customer_region":{"fields":{"region":{"confirmed_status":"USER_CONFIRMED","draft_status":"EXPLICIT","value":"北美"},"target_customer":{"confirmed_status":"USER_CONFIRMED","draft_status":"EXPLICIT","value":"CUSTOMER_Y"}}},"decision_type":{"fields":{"decision_intent":{"confirmed_status":"USER_CONFIRMED","draft_status":"INFERRED","value":"PRODUCT_INVESTMENT"}}},"power_system_scope":{"fields":{"power_or_system_scope":{"confirmed_status":"USER_CONFIRMED","draft_status":"EXPLICIT","value":"800kW"}}},"product_architecture":{"fields":{"architecture_alternatives":{"confirmed_status":"USER_CONFIRMED","draft_status":"EXPLICIT","value":["UPS"]},"primary_product_object":{"confirmed_status":"USER_CONFIRMED","draft_status":"INFERRED","value":"UPS"}}}},"original_question":"为 CUSTOMER_Y 在北美评估 800kW UPS 产品投资，关键约束未知。","schema_version":"m1.confirmed-input.v1","source_draft_id":"draft_smoke_2"}
```

Expected checks:

- the workflow keeps `PRODUCT_INVESTMENT`, `UPS`, `800kW`, `CUSTOMER_Y`, and `北美` unchanged;
- product, protected-load, system, application-fit, and no-fit boundaries are present;
- recommendation and funding boundary remain qualified by the confirmed unknowns;
- Claim Candidates contain full five-part scope and reasoning bridge;
- source IDs are empty for UNKNOWN candidates and otherwise belong only to the seven-source allow-list.

### S3 — material context change from 1MW to 2MW

- `confirmed_input_id`: `confirmed_smoke_3`
- `confirmed_input_hash`: `bc85d108d60ec7ecbfe021f274c4ed500392a6b1773d0d6ad865d0f6de491f04`
- `confirmed_input_json`:

```json
{"confirmation_status":"USER_CORRECTED","confirmed_at":"2026-07-24T12:00:00.000Z","confirmed_input_id":"confirmed_smoke_3","groups":{"application_scenario":{"fields":{"application_scenario":{"confirmed_status":"USER_CORRECTED","draft_status":"INFERRED","value":"AI 数据中心受保护负载"}}},"constraints_unknowns":{"fields":{"contradictions":{"confirmed_status":"USER_CONFIRMED","draft_status":"EXPLICIT","value":[]},"critical_constraints":{"confirmed_status":"USER_MARKED_UNKNOWN","draft_status":"UNKNOWN","value":[]},"investment_or_product_stage":{"confirmed_status":"USER_CONFIRMED","draft_status":"INFERRED","value":"concept evaluation"},"target_timing":{"confirmed_status":"USER_MARKED_UNKNOWN","draft_status":"UNKNOWN","value":"unknown"},"unknowns":{"confirmed_status":"USER_CONFIRMED","draft_status":"UNKNOWN","value":["target_timing","critical_constraints"]}}},"customer_region":{"fields":{"region":{"confirmed_status":"USER_CONFIRMED","draft_status":"EXPLICIT","value":"REGION_ALPHA"},"target_customer":{"confirmed_status":"USER_CONFIRMED","draft_status":"EXPLICIT","value":"CUSTOMER_X"}}},"decision_type":{"fields":{"decision_intent":{"confirmed_status":"USER_CONFIRMED","draft_status":"INFERRED","value":"ARCHITECTURE_CHOICE"}}},"power_system_scope":{"fields":{"power_or_system_scope":{"confirmed_status":"USER_CORRECTED","draft_status":"EXPLICIT","value":"2MW"}}},"product_architecture":{"fields":{"architecture_alternatives":{"confirmed_status":"USER_CONFIRMED","draft_status":"EXPLICIT","value":["UPS","800VDC"]},"primary_product_object":{"confirmed_status":"USER_CONFIRMED","draft_status":"INFERRED","value":"POWER_ARCHITECTURE_DECISION"}}}},"original_question":"为 CUSTOMER_X 在 REGION_ALPHA 评估 2MW UPS 与 800VDC，投产时间未知。","schema_version":"m1.confirmed-input.v1","source_draft_id":"draft_smoke_3"}
```

Expected checks:

- the binding uses the S3 ID and hash, never the S1 ID or hash;
- the confirmed snapshot preserves `2MW` with `USER_CORRECTED`;
- system-boundary reasoning reflects 2MW and does not reuse a 1MW conclusion;
- all O1–O7 and decision-active unknowns remain present;
- local parsing of an S1 response against S3 must fail with `binding_confirmed_input_hash_mismatch`.

## 8. Prohibited settings and changes

Do not:

- edit the existing Input Understanding workflow;
- edit Generic V2.2;
- reuse either existing app's API key;
- add a second LLM node, agent, critic, voting loop, planner, fallback model, or automatic model switch;
- add retrieval, web search, tools, Golden Reference content, source text not authorized by the frozen Evidence Boundary, or hidden model-memory evidence;
- add Prompt examples that supply facts, numbers, benchmarks, requirements, or a desired final recommendation;
- add retries, JSON-repair LLMs, report nodes, UI-copy nodes, Claim Ledger creation, or deterministic Claim Guard logic;
- change confirmed values or statuses;
- treat the source allow-list as proof;
- replace `UNKNOWN` with unsupported facts;
- put secrets in Dify node text, source code, documentation, test fixtures, evidence, Git, or chat;
- connect the confirmation button or existing API/UI path to this workflow in this task;
- push, merge, deploy the local repository, or publish any change outside this new dedicated Dify workflow.
