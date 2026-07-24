# M1 Architecture Decisions

These decisions are binding for the M1 Professional Demo MVP until an explicitly authorized architecture gate changes them.

| Decision | Status | Formal rule |
|---|---|---|
| Single-pass M1 architecture | Rejected | One provider pass must not perform input interpretation, expert decision resolution, claim validation, and final report composition as one opaque operation. |
| Tested System equals Delivered System | Accepted | Acceptance tests must exercise the same workflow identity, provider/model, API path, schemas, evidence boundary, and runtime path intended for the product. |
| Dedicated Dify M1 workflow | Required | M1 uses a dedicated workflow and credential boundary. The generic `市场情报智能体 V2.2` must remain unchanged. |
| LLM-node limit | Accepted | The workflow may contain at most two LLM nodes: Input Understanding and Decision Resolution. |
| Stage order | Accepted | `M1InputContext` must be produced and validated before `M1DecisionState`. |
| Input Gate precedence | Accepted | Decision Resolution may not begin until the full Input Gate passes with zero material semantic failures. |
| Deterministic Claim Guard | Accepted boundary | It may validate, downgrade, or block a proposed semantic Claim Basis. It may not invent a missing Claim Basis. |
| Local Report Composer | Accepted boundary | It may organize approved semantic state into the seven report sections. It may not create new facts, numbers, metrics, claims, decision gates, or recommendations. |
| Provider strategy | Accepted | No model roulette. Verification and remediation stay on one chosen provider/model unless a later explicit gate changes the baseline. |
| Orchestration strategy | Accepted | No agents, voting, critic loops, fallback model panels, or automatic planning. |
| Repository isolation | Accepted | M1 work proceeds in a clean dedicated worktree and branch. The original dirty worktree remains untouched. |

Current D1 exit verdict:

`D1_FAIL_INPUT_RECOGNITION`

Decision Resolution, Claim Boundary, report composition, PDF, deployment, and release work remain outside the completed D1 checkpoint.
