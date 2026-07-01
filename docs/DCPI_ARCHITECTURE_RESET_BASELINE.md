# DCPI Architecture Reset Baseline

## Why Architecture Reset Is Required

The architecture reset is required because local-rule expansion caused complexity growth, token cost, history regressions, Preview failures, and low expert quality.

## Target Architecture

Lightweight APP Workspace
+ Source / Claim / Evidence Registry
+ Local KB / RAG
+ Dify / DeepSeek / LLM Agent
+ Validator
+ Professional UI Renderer

## Responsibilities

### APP

The APP is responsible for UI, filters, context builder, schema presenter, evidence renderer, validation status, and report presentation.

### Dify / LLM

Dify / LLM is responsible for open-ended question understanding, long-form expert generation, roadmap, comparison, investment decision, GTM, PDC, and LCM.

### Backend / API

The Backend / API is responsible for source registry, claim registry, evidence registry, freshness check, cache, orchestration, validation, and logging.

### Validator

The Validator is responsible for:

- JSON schema
- object correctness
- evidenceTrace
- freshness
- no-source claim blocking
- hardcoding detection
- previous-track leakage detection
- generic filler detection

#### Generic Filler Detection

The Validator must include negative assertion rules for generic AI filler.

Generic filler phrases include, but are not limited to:

- 平台化和规模交付
- 加强可靠性
- 全面优化
- 持续提升
- 深化布局
- 打造生态
- 赋能客户
- 降本增效
- 推动高质量发展
- 端到端能力全面升级

These phrases are not banned in all contexts. They fail validation when they appear as core conclusions without field-level support.

A phrase must fail only when it is used as a core conclusion and lacks meaningful field-level support.

Meaningful field-level support should include:

- a specific product object
- at least one context dimension, such as customer segment, workload type, deployment mode, region, or architecture layer
- either `sourceId` / `claimId` / `evidenceTrace`, or an explicit `source_required`, `user_input_required`, `no_quantified_data`, or `realtime_verification_required` marker
- at least one decision structure element, such as phase gate, roadmap step, GTM implication, PDC/LCM status, validation gate, risk, or stop condition

Generic filler should fail when it replaces these elements rather than being supported by them.

#### source_required Output Protocol

If LLM / Dify / Local KB lacks L1-L6 evidence for a factual claim, the output field must not be empty and must not be replaced with narrative speculation.

It must explicitly return one of:

- `source_required`
- `user_input_required`
- `no_quantified_data`
- `realtime_verification_required`
- `not_applicable`

This applies especially to:

- TAM
- ROI
- named customer
- launch date
- certification
- technical parameter
- cooling capacity
- power range
- efficiency
- reliability metric
- market share
- revenue
- investment amount
- competitor capability

## Key Principles

- APP must not become a giant if-else expert rules engine.
- Dify / LLM must not be naked generation.
- Dify / LLM must consume structured context and return structured JSON with `evidenceTrace`.
- No source, no fact.

## AIDC Freshness

Current AIDC claims must carry:

- `publicationDate`
- `lastVerifiedDate`
- `freshnessStatus`
- `realtimeVerificationStatus`

For AIDC high-velocity claims, the Validator must block or downgrade claims without all four freshness fields.

If freshness cannot be verified, the output must use:

- `realtime_verification_required`
- `realtime_unverified`

The output must not claim `latest`, `current`, `recent`, or `mainstream` unless freshness is verified.

## Phase Split

- Phase 0 freeze and docs
- Phase 1 contract first
- Phase 2 thin vertical slice
- Phase 3 controlled expansion
- Phase 4 full portfolio
