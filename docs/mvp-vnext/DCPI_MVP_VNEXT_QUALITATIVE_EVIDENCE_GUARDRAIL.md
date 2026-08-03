# DCPI MVP vNext Qualitative Evidence Guardrail

`HISTORICAL_EVIDENCE` — the policy remains applicable, but the authoritative current user reports are in `DCPI_MVP_VNEXT_FINAL_USER_REPORTS.md`.

- Gate: `MVP_VNEXT_QUALITATIVE_EVIDENCE_GUARDRAIL`
- Scope: the final application-side publication exit only; Dify V2.2, Live calls, timeout settings and performance are out of scope.
- Evidence basis: the existing GC-01, GC-02 and five GC-03 Live-replay records already referenced by the candidate evidence package, plus deterministic focused replay tests. No new Provider call was made.

## Policy

| Classification | Publication treatment |
| --- | --- |
| `SOURCE_BOUND_FACT` | A statement with `source_ref` remains traceable and may appear in key facts and the evidence summary. |
| `USER_PROVIDED_CONTEXT` | Retained only as a user input or analysis condition; never presented as an external fact. |
| `ANALYTICAL_INFERENCE` | Retained only with conditional language and a validation boundary. It is removed from key facts and evidence summary, and cannot independently justify `PUBLISHABLE`. |
| `PLANNING_ASSUMPTION` | Limited to recommended actions, validation gates and exit conditions, with an explicit non-market-fact label. |
| `UNSUPPORTED_QUALITATIVE_CLAIM` | Removed as a fact. Market/current-state claims become a need for evidence; named-company capability or position claims become a company-verification requirement. |

The centralized policy is `src/ask/vnext/qualitativeClaimPolicy.js`. `publicationGuardrail.js` applies it after the numeric and investment-ranking policies to every user-visible report field; `reportComposer.js` continues to be the only composition path to that exit.

## Special rulings

- 800VDC: without a bound source, “800VDC is real but not yet widely adopted” is not a fact. The permitted form is: “从供电架构演进逻辑看，800VDC可作为值得持续验证的结构性机会；当前未绑定足够的具名项目、标准进展和供应链证据，不能视为已完成市场验证或规模化部署。”
- Named companies: without a source, statements about a company’s platform, resources, competitive position, customer status or deployment are converted to the specific information that must be verified first.
- Evidence summary: content without `source_ref` is never retained as direct evidence, even if it is a useful inference elsewhere in the report.

## GC-01: Kstar and modular UPS

| Field | Before | Classification | After | Reason |
| --- | --- | --- | --- | --- |
| One-line conclusion | Kstar has a customer window and should build a new platform. | `UNSUPPORTED_QUALITATIVE_CLAIM` | Current report lacks bound Kstar platform, customer, resource and project evidence; verify these before deciding between a new platform and an upgrade. | Named-company and current-status claim lacked `source_ref`. |
| Key fact | Kstar has leading modular UPS capability. | `UNSUPPORTED_QUALITATIVE_CLAIM` | Removed from key facts; add platform coverage, R&D-resource and customer evidence to the information required. | It cannot be a key fact without a source. |
| Core analysis | Existing architecture can be upgraded before a new platform is committed. | `ANALYTICAL_INFERENCE` | Based on current analysis conditions, this is a conditional upgrade-versus-new-platform hypothesis requiring a platform-gap assessment. | Useful architecture reasoning remains conditional. |
| Validation gate | Verify product coverage, customer demand and engineering resources before productization. | `PLANNING_ASSUMPTION` | Retained as a labelled planning gate. | A validation path is not an external fact. |
| Evidence summary | Kstar is the fastest-moving supplier. | `UNSUPPORTED_QUALITATIVE_CLAIM` | Removed; require a traceable competitive source. | Unsourced supplier position cannot be direct evidence. |

### Final user report

**Conclusion:** Do not commit to a full new modular-UPS platform yet. First verify Kstar’s existing platform coverage, customer requirements, regional priorities and development capacity; then decide whether a targeted upgrade or a new platform is justified.

**Analysis boundary:** The question establishes Kstar and modular UPS as the analysis objects. It does not establish Kstar’s current products, resources, customers or competitive position.

**Key facts:** No unbound Kstar statement is presented as a key fact. Any source-bound product, project or market record may remain traceable in this section.

**Conditional analysis:** From the current architecture logic, a targeted platform-gap assessment is the appropriate way to compare an upgrade with a new platform. This does not establish an existing market window or Kstar capability.

**Action and gates:** Define the target customer and region; map power, topology and certification gaps; obtain customer demand and platform-cost evidence; stop or defer if the gap cannot be shown to require a new platform.

**Cannot conclude:** The report cannot conclude that Kstar lacks capability, holds a leading position, has a customer commitment or should make a full-platform investment without bound evidence.

## GC-02: 800VDC for AI data-center power

| Field | Before | Classification | After | Reason |
| --- | --- | --- | --- | --- |
| One-line conclusion | 800VDC is real but not yet widely adopted. | `UNSUPPORTED_QUALITATIVE_CLAIM` | 800VDC is a structural opportunity worth validating; without project, standard and supply-chain evidence it cannot be treated as market-validated or broadly deployed. | Adoption status was unbound. |
| Core analysis | 800VDC is the certain architecture direction. | `UNSUPPORTED_QUALITATIVE_CLAIM` | Compare facility, rack and GPU-side trade-offs as a conditional architecture analysis. | Certainty claim was unbound. |
| Risk | The ecosystem is immature. | `UNSUPPORTED_QUALITATIVE_CLAIM` | Require evidence on standards, protection components, suppliers and deployed projects. | Current ecosystem status needs sources. |
| Recommended action | Run staged safety and interoperability validation. | `PLANNING_ASSUMPTION` | Retained as a labelled plan. | A recommended validation path is not a market fact. |
| Evidence summary | The market has confirmed 800VDC. | `UNSUPPORTED_QUALITATIVE_CLAIM` | Removed from evidence summary and moved to required evidence. | No direct evidence may be implied. |

### Final user report

**Conclusion:** From the current power-architecture logic, 800VDC is worth continued validation for AI data-center power, but it is not presented as a confirmed market state or a completed scale-deployment route.

**Analysis boundary:** Evaluate value and risk separately at facility, rack and GPU-side interfaces. Do not equate a product announcement with operational-scale deployment.

**Conditional analysis:** Potential value must be tested against protection, distribution, heat, interoperability and alternative-route constraints. Standard progress, named projects and supply-chain readiness require traceable sources.

**Action and gates:** Validate safety protection, interoperability, customer deployment requirements and certification paths in a bounded pilot; compare the result with applicable AC, HVDC, BBU and other alternative architectures.

**Cannot conclude:** The report cannot conclude broad adoption, unified standards, ecosystem maturity, named project status or a superior route without bound evidence.

## GC-03: BBU, liquid cooling and GaN/SiC

| Field | Before | Classification | After | Reason |
| --- | --- | --- | --- | --- |
| One-line conclusion | Liquid cooling has the best risk-return profile. | `UNSUPPORTED_QUALITATIVE_CLAIM` | Do not publish an unconditional overall ranking; compare by investment subject, time horizon, assumptions and risks. | Overall ranking and market certainty lacked sufficient evidence. |
| Core analysis | BBU is commercially mature. | `UNSUPPORTED_QUALITATIVE_CLAIM` | Move to information required: source customer, deployment and commercial evidence for BBU. | Commercial state was unbound. |
| Core analysis | GaN/SiC is a mature technology. | `UNSUPPORTED_QUALITATIVE_CLAIM` | Keep only a conditional technology-route analysis and require application-specific validation. | Maturity claim was unbound. |
| Scenario comparison | A strategic investor may test a route when customer and integration assumptions hold. | `ANALYTICAL_INFERENCE` | Retained with subject, time, assumptions, risk and validation boundary. | This is a conditional comparison, not direct evidence. |
| Validation gate | Complete diligence on customer adoption, technical barriers and capital intensity. | `PLANNING_ASSUMPTION` | Retained as a labelled gate. | This is a planning action. |

### Final user report

**Conclusion:** Do not issue an unconditional BBU-versus-liquid-cooling-versus-GaN/SiC ranking. Compare the three at their different object levels and by strategic or financial investor, time horizon, key assumptions and principal risks.

**Analysis boundary:** Liquid cooling is a solution domain, BBU is a power/backup domain and GaN/SiC is a component-technology domain. These differences prevent a source-free single ranking.

**Conditional analysis:** A strategic investor can assess product and solution synergy; a financial investor can assess commercial timing and exit assumptions. Each assessment still requires traceable market, customer, technology and capital evidence.

**Action and gates:** Build separate diligence records for market certainty, technical barriers, capital intensity and commercialization cycle; validate customer demand, deployment path, supply-chain exposure and investor-specific return assumptions before selecting an allocation.

**Cannot conclude:** The report cannot state that any one direction has the highest certainty, best risk-return or maturity without bound evidence. The five existing GC-03 replay records remain consistent: no unconditional overall ranking is published.

## Deterministic verification

- Focused qualitative/publication and Golden tests: `15/15 PASS` in the targeted run.
- Full applicable suite: `444/444 PASS` (`434` deterministic tests in the original worktree plus `10` M1 browser tests in a disposable writable copy; the original worktree is not writable for Vite temporary config generation).
- Production build: PASS in that disposable copy; no source or tracked asset was changed by the verification environment. The existing `633.90 kB` JS chunk warning remains P2.
- The policy test covers source-bound facts, six representative unsupported market/technology assertions, conditional inference routing, named-company downgrade, planning fields and every public report field.
- Existing numeric and ranking policies run before the qualitative policy. Qualitative downgrade may lower a previously `PUBLISHABLE` report to `CONDITIONAL`; investment reports retain the stricter `INSUFFICIENT_EVIDENCE` ranking boundary.

## Open boundary

- P0: none found by the deterministic qualitative-policy tests.
- P1: no policy implementation item remains. GPT retains the professional authority to decide whether the source corpus supports any particular industry conclusion.
- P2: the existing Vite JS chunk warning and `PERFORMANCE_GATE_DEFERRED` remain out of scope.
- This document is engineering evidence, not a professional-output PASS or release approval.
