# DCPI Historical Failures

## Failure Taxonomy

### Local Product Planning Runtime Exposed In UI

- symptom: Internal product-planning runtime behavior surfaced directly in the user-facing UI instead of remaining behind a controlled expert presentation layer.
- root cause: The app mixed runtime logic, presentation logic, and expert logic in the same local track, which blurred product boundaries and encouraged rule sprawl.
- prevention under architecture reset: Keep the APP focused on structured context presentation and render only validated outputs from the controlled agentic stack.

### 2026/2027/2028 Roadmap Showed 2030 Window

- symptom: Near-term roadmap output leaked an out-of-scope 2030 planning horizon.
- root cause: Generation and local synthesis were not constrained tightly enough by explicit roadmap schema and scope validation.
- prevention under architecture reset: Enforce phase and time-horizon validation in the Validator before any roadmap is rendered.

### SST Roadmap Mixed Commercial Short-Term Logic

- symptom: SST recommendations mixed exploratory long-cycle bets with short-term commercial planning.
- root cause: The system lacked a clean separation between strategy horizon, commercialization horizon, and evidence-backed readiness.
- prevention under architecture reset: Require structured roadmap objects with stage, horizon, readiness, and evidenceTrace fields.

### 中压 UPS Vs 低压超大功率模块化 UPS Collapsed Into Generic Modular UPS

- symptom: Distinct product tracks were collapsed into a generic modular UPS category.
- root cause: Local rules and synthesis layers did not preserve enough product taxonomy precision.
- prevention under architecture reset: Use a source-backed product taxonomy in the context layer and block category collapse without evidence.

### 8亿元 Company Liquid CDU Investment Case Misparsed As Liquid/HVDC

- symptom: A company investment case on liquid CDU was misrouted into a liquid/HVDC combined interpretation.
- root cause: Entity, product, and scenario parsing were not grounded strongly enough in structured context and claim validation.
- prevention under architecture reset: Split entity extraction, planning object detection, and evidence validation into separate controlled stages.

### 400V HVDC + Air Cooling Promoted From Alternative/Background To Planning Object

- symptom: Alternative or background options were promoted into the main planning object.
- root cause: The system lacked explicit distinction between primary recommendation, alternative path, and contextual background.
- prevention under architecture reset: Require output schemas that label recommendation role and prevent promotion without evidence support.

### Company Facts Ignored

- symptom: Company-specific facts were omitted from the final planning output.
- root cause: The synthesis layer did not reliably carry company context through to final generation.
- prevention under architecture reset: Make company context a required structured input and validate its presence in evidenceTrace.

### Generic AI Template Output

- symptom: Output read like generic AI boilerplate instead of expert-grade product planning.
- root cause: Prompting and local scaffolding lacked domain-specific structure, evidence discipline, and role constraints.
- prevention under architecture reset: Use structured context, domain-specific schemas, and expert-quality validation before rendering.

### Dify Unavailable Fallback Too Low Quality

- symptom: When Dify was unavailable, fallback output quality dropped below acceptable expert standards.
- root cause: The fallback path depended on thin local heuristics rather than a controlled expert generation pipeline.
- prevention under architecture reset: Treat degraded fallback as constrained status output, not full expert substitution, unless evidence-backed quality checks pass.

### Ask Not Linked To Overview / Market / Product / Technology / Companies

- symptom: Ask responses did not stay connected to the major planning pages and their context.
- root cause: Cross-page context binding was incomplete and inconsistently enforced.
- prevention under architecture reset: Build the APP context layer around page-linked structured context with explicit source identity.

### Local KB Found But Not Linked

- symptom: Relevant KB material existed but was not connected to the final answer path.
- root cause: Retrieval output was not carried forward into claims and rendering with stable identifiers.
- prevention under architecture reset: Make retrieved source references first-class claim inputs with required evidenceTrace propagation.

### Source Identity Lost In Page Synthesis

- symptom: Source identity disappeared during multi-page synthesis.
- root cause: Intermediate synthesis steps did not preserve source and claim lineage.
- prevention under architecture reset: Use source, claim, and evidence registries with stable IDs through every transformation.

### Dify Payload Missing Source Chain

- symptom: Downstream LLM payloads did not include a reliable source chain.
- root cause: Payload construction emphasized answer generation over traceable evidence transport.
- prevention under architecture reset: Backend orchestration must assemble structured payloads that include source chain and claim lineage by default.

### Local Tests Passed But Preview Failed

- symptom: Local verification reported success while Preview behavior still failed.
- root cause: Test coverage was too shallow and did not validate the real integrated rendering and orchestration path.
- prevention under architecture reset: Add contract and integration validation that checks the same structured output path used in Preview.

### Codex Self-Score Replaced Evidence

- symptom: Agent confidence or self-scoring displaced evidence-backed justification.
- root cause: The system tolerated summary claims without mandatory traceable support.
- prevention under architecture reset: Enforce no-source claim blocking and require evidence-linked structured outputs.

### Shallow Tests

- symptom: Tests passed without proving expert-quality behavior.
- root cause: Tests focused on local mechanics rather than claim correctness, evidence quality, and planning integrity.
- prevention under architecture reset: Shallow matchers such as `.toContain()` on short generic keywords are not sufficient as acceptance tests. Tests must include direct negative assertions. Tests must verify object correctness, entity role correctness, JSON schema compliance, evidenceTrace presence, freshness status, and `source_required` behavior. Tests must mock missing evidence states and verify that the app returns `[source_required]`, `source_required`, `user_input_required`, or `no_quantified_data` rather than invented content. Tests must fail when outputs contain generic filler as core conclusions without source, field, or decision structure. Tests must fail when outputs leak previous product content after product switching. Tests must fail when SST produces short-term commercial revenue claims without official evidence. Tests must fail when alternative solutions are promoted to primary product objects.

### Hardcoding Risk

- symptom: Output behavior risked drifting toward hand-coded expert answers.
- root cause: Local rule accumulation tried to replace structured reasoning and source-backed generation.
- prevention under architecture reset: Keep business knowledge in sources, claims, evidence, and controlled prompts instead of scattered rule branches.

### Previous-Track Leakage Risk

- symptom: Legacy tracks and earlier solution paths leaked into current answers.
- root cause: Context isolation and validation were insufficient.
- prevention under architecture reset: Add previous-track leakage detection in the Validator and keep branch/gate context explicit.

### Local Rule Expansion / Token Explosion

- symptom: The local solution accumulated too many rules and rising token cost.
- root cause: The APP tried to absorb expert reasoning responsibilities that belong in a structured agentic system.
- prevention under architecture reset: Keep the APP thin, move expert reasoning into controlled LLM workflows, and validate every claim against evidence.
