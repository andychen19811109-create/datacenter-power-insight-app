# DCPI Phase 1A Contract First Plan

## 5.1 Purpose

- Phase 1A defines contracts before implementation.
- Phase 1A is docs-only.
- Phase 1A does not change Ask runtime.
- Phase 1A does not improve Ask answer quality by itself.
- Phase 1A does not solve Ask PowerInsight root cause.
- Phase 1A does not authorize R1.1, R1.2, local-rule expansion, or implementation.

## 5.2 Current State

- PR15 has merged Phase 0 docs fact source into `main`.
- Next allowed gate after PR15 is `ARCHITECTURE_RESET_CONTRACT_FIRST`.
- Codex must remain idle unless explicitly authorized by GPT/user.

## 5.3 Architecture Reset Target

Controlled Agentic Pipeline:

APP Lightweight Workspace
-> Backend / API Orchestrator
-> Source / Claim / Evidence Registry
-> Local KB / RAG
-> Dify / DeepSeek / LLM Agent
-> Validator
-> Professional UI Renderer

## 5.4 Phase 1A Allowed Scope

Allowed:

- contract docs only
- define boundaries
- define JSON request/response/validator contracts
- define evidence/source contract
- define page-context linkage contract
- define Dify / DeepSeek provider boundary
- define Local KB / RAG boundary
- define Validator blocking rules
- define thin vertical slice selection

Forbidden:

- source code modification
- runtime modification
- test modification
- package modification
- Vercel change
- Dify change
- env/secrets change
- R1.1 continuation
- R1.2 implementation
- Ask runtime fix claim
- Architecture Reset implementation claim

## 5.5 Thin Vertical Slice Decision

Use this first Phase 2 vertical slice candidate:

液冷 CDU 技术路线演进与准入门槛规划
Liquid Cooling CDU Technology Roadmap & Doorstep Gate

It must focus on:

- 看技术
- 定产品
- 定节奏
- source_required
- evidenceTrace
- Validator negative blocking
- CDU technical roadmap
- product entry gate
- readiness gate
- technical boundary

It must explicitly exclude:

- Colo financial ROI
- broad investment decision
- market size projection
- overseas GTM
- full commercial strategy
- customer revenue forecast
- named customer claims without evidence

## 5.6 Why This Slice

This slice is intentionally thinner than "CDU + Colo/AIDC Retrofit + Investment Decision". It is selected to avoid over-complexity in Phase 2, keep object resolution narrow, make evidenceTrace enforceable, and reduce the risk of repeating broad local-rule or speculative expert generation. The CDU technical roadmap and doorstep gate scope is narrow enough to be testable while still exercising source_required, freshness blocking, page-context linkage, and validator negative assertions.

## 5.7 Future Gates

- `PHASE1A_CONTRACT_DOCS_LOCAL_COMMIT_REVIEW`
- `PHASE1A_CONTRACT_DOCS_GEMINI_REVIEW`
- `PHASE1A_CONTRACT_DOCS_PR_GATE`
- `PHASE2_THIN_VERTICAL_SLICE_IMPLEMENTATION_DESIGN`
- `PHASE2_CODE_IMPLEMENTATION_ONLY_AFTER_GPT_GEMINI_USER_APPROVAL`

## 5.8 Acceptance Criteria

Phase 1A passes only if:

- exactly three docs are created
- no source code is modified
- no tests are modified
- no package/runtime/Vercel/Dify/env files are modified
- contracts are specific enough for Phase 2 implementation
- no local-rule expansion is introduced
- thin vertical slice is narrow and testable
- no runtime fix claim is made
