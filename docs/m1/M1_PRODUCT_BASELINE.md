# M1 Product Baseline

## Objective and vertical slice

DCPI M1 Professional Demo MVP is an AI data-center UPS investment-decision vertical slice. It must turn one normal natural-language question into a traceable professional product-investment decision without requiring the user to know DCPI taxonomy, intent labels, exact aliases, or internal schemas.

The entry experience is deliberately low friction. Missing noncritical context remains `UNKNOWN`, `ASSUMED`, or requires later validation. The system may ask at most one essential clarification, and only when ambiguity could materially change the primary product object, decision intent, application scenario, or architecture alternative.

## Frozen product contracts

D1 and D2 are frozen product contracts. Implementation may not weaken them to accommodate a model, prompt, provider, or delivery shortcut.

The eight-slot Decision Context is:

1. Product Object
2. Application
3. Customer Type
4. Region
5. Power Class
6. Investment Horizon
7. Vendor Profile
8. Vendor Capability Baseline

O1–O7 are the frozen expert-decision method:

1. O1 — Product Object Boundary
2. O2 — Architecture Kill Precedence
3. O3 — Application Behavior to Product Gate
4. O4 — Benchmark Classification
5. O5 — System Boundary Test
6. O6 — Market Entry Completeness
7. O7 — Unknown-to-Decision Translation

Claim Basis must exist before deterministic claim validation. Every material claim must carry a source or explicit unknown status, scope, reasoning bridge, uncertainty, and decision impact. Numeric Provenance must preserve value, unit, source type and ID, derivation, denominator, and exclusions where applicable. Unknowns must constrain confidence, funding, gates, validation actions, or recommendation qualification; they must not be converted into facts.

## Evidence and semantic boundaries

The frozen seven-source Evidence Boundary is limited to:

1. NVIDIA — 800VDC ecosystem and AI workload power behavior
2. Open Compute Project — Mt Diablo and high-density power architecture
3. Digital Realty — high-density colocation
4. Schneider Electric — Galaxy VXL
5. Vertiv — AI workload power-swing UPS controls
6. UL Solutions — UL 1778
7. OSHA — NRTL program

The 13 required semantic modules are:

1. Executive Decision
2. Why Now
3. Market Signals
4. Customer Pains
5. Application Boundary
6. Power Architecture
7. Critical Technical Metrics
8. Competitive Position
9. Commercial Decision
10. Risk Register
11. Evidence and Uncertainty
12. Decision Gates
13. Actions 30/60/90

The user-facing report may group them into seven sections:

1. Executive Decision
2. Opportunity and Scenario Definition
3. Customer Requirements and Value Proposition
4. Product and Technical Architecture
5. Competition and Differentiation
6. Investment Gates and Product Roadmap
7. Risks, Unknowns and Evidence

Golden Reference content is acceptance-oracle material only. It must remain separate from runtime prompts, routing, provider inputs, decision generation, and delivered answers.

## Prohibited scope reductions

Do not reduce the eight-slot context, O1–O7, Claim Basis, Numeric Provenance, unknown handling, seven-source boundary, 13-module semantics, or seven-section report coverage. Do not replace semantic completion with generic prose, hard-coded reference answers, rigid wording, mandatory completion of all context fields, unsupported facts, or model-specific shortcuts.
