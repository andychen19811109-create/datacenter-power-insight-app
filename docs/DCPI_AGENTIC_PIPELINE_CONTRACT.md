# DCPI Agentic Pipeline Contract

## 6.1 Purpose

Define how APP, Backend/API, Local KB/RAG, Dify/DeepSeek/LLM, Validator, and Professional UI Renderer interact.

## 6.2 Component Responsibilities

### APP Lightweight Workspace

APP may do:

- page route capture
- selected filter capture
- product planning card selection
- context packaging
- schema presenter
- evidence trace renderer
- validator status renderer
- professional report layout

APP must not do:

- expert long-form generation
- local if-else product strategy
- hidden fallback expert answer library
- market/ROI/customer claims without evidence
- local-rule expansion to cover product tracks

### Backend / API Orchestrator

Responsible for:

- request assembly
- source pack selection
- claim pack selection
- evidence registry lookup
- Local KB/RAG retrieval boundary
- provider selection
- validator invocation
- response normalization
- caching and logging

Must not:

- fabricate sources
- invent claims
- silently downgrade missing evidence to prose
- hide validator warnings

### Dify / DeepSeek / LLM Agent

Responsible for:

- open-ended reasoning
- structured JSON generation
- five-look-three-define synthesis
- roadmap reasoning
- technical gate reasoning
- missing input identification

Must return structured JSON only.

Must not:

- return naked free text
- invent TAM / ROI / named customers / launch dates / certifications / technical parameters
- bypass evidenceTrace
- fill business defaults without sources

### Local KB / RAG

Responsible for:

- retrieving local knowledge references
- returning source snippets with IDs
- returning publicationDate / lastVerifiedDate when available
- marking unknown freshness as realtime_verification_required

Must not:

- override official sources
- treat local notes as higher tier than official evidence
- return untraceable prose

### Validator

Responsible for:

- schema validation
- object correctness validation
- evidenceTrace validation
- freshness validation
- no-source claim blocking
- generic filler blocking
- alternative-to-primary promotion blocking
- SST short-term commercialization blocking
- previous-track leakage blocking
- time-window validation

### Professional UI Renderer

Responsible for:

- presenting validated output
- showing warning states
- showing source_required / user_input_required / no_quantified_data
- showing evidence trace
- showing五看三定 sections
- showing roadmap / gate / stop condition

Must not:

- hide validator warnings
- rewrite blocked claims into confident prose
- invent missing sections
- turn source_required into normal answer text

## 6.3 Page-Context Linkage Contract

This is mandatory.

Every Ask request must include:

- currentPageRoute
- currentPageModule
- selectedFilters
- selectedProductFamily
- selectedCustomerSegment
- selectedRegion
- selectedArchitectureLayer
- ProductPlanningCard id
- ProductPlanningCard version
- ProductPlanningCard state hash
- pageContextHash
- userQuestion
- taskIntent
- timestamp

Rules:

- If Ask is invoked from Market page, Market page context must be included.
- If Ask is invoked from Product page, Product page context must be included.
- If Ask is invoked from Technology page, Technology page context must be included.
- If no page context exists, request must include `page_context_required`.
- The response must echo `pageTrace` showing which page contexts were used.
- Cross-page conclusion drift must be blocked unless `evidenceTrace` supports the transition.

## 6.4 Provider Boundary

Define Dify / DeepSeek / future provider boundary:

- Provider receives structured request.
- Provider returns structured JSON only.
- Provider error returns `provider_error` state, not full expert fallback.
- Timeout returns `provider_timeout` state.
- No provider response may bypass Validator.
- Provider output is not displayed until Validator completes.

## 6.5 Local KB / RAG Boundary

Define:

- Local KB results are `L5` unless explicitly promoted by source metadata.
- Official source tiers outrank local notes.
- Local KB must return source IDs.
- RAG snippets must not be used as factual claims unless `evidenceTrace` is preserved.
- Missing source metadata must trigger `source_required` or `realtime_verification_required`.

## 6.6 Anti-Local-Rule Boundary

Explicitly state:

- Do not recreate the old local rules engine.
- Do not add product-specific if-else answer paths in APP.
- Do not use local fallback to generate expert prose.
- Do not hardcode the CDU slice answer.
- Do not hardcode五看三定 content as the final answer.
