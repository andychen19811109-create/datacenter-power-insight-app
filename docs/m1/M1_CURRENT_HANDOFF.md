# M1 Current Handoff

## Repository checkpoint

- Worktree: `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-m1-demo`
- Branch: `codex/m1-professional-demo-mvp`
- Current pre-checkpoint HEAD: `c9bcb7ebb2dd373a5e3a4052746e1a376b33a852`
- Source baseline commit: `c9bcb7ebb2dd373a5e3a4052746e1a376b33a852`
- Original dirty worktree: `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-phase2b`
- Original dirty state is preserved: three modified M1 files plus one untracked D3 acceptance script, with the tracked diff unchanged at 98 insertions and 5 deletions.

## Tested system identity

- Dedicated Dify app: `DCPI M1 Professional Demo MVP`
- Dify App ID: `ff285777-08a1-4ca5-a4ea-d91c298c1dd9`
- Published workflow ID: `f3a0e837-9399-46ce-a999-73f483ec6ab3`
- Provider/model: `langgenius/deepseek/deepseek` / `deepseek-v4-flash`
- Endpoint: `POST /v1/workflows/run`
- Input schema: `m1.input.v1`
- `.env.local` is ignored, contains local runtime configuration, and must never be committed.

## Current D1 files

1. `scripts/runM1InputGate.mjs`
2. `src/ask/m1/__tests__/m1InputUnderstanding.test.js`
3. `src/ask/m1/contracts/m1InputContext.js`
4. `src/ask/m1/m1ProfessionalEligibility.js`
5. `src/ask/m1/m1WorkflowTransport.js`
6. `src/ask/m1/runM1InputUnderstanding.js`

## Gate state

- D1 exit verdict: `D1_FAIL_INPUT_RECOGNITION`
- A–J result: `8 PASS / 12 FAIL`
- Nine of ten semantic categories contain at least one material failure.
- Decision Resolution: not started.
- Claim Boundary and deterministic Claim Guard: not started.
- Final seven-section report: not started.
- Current authorized next task: one bounded Input Understanding remediation gate only.

## Root-cause clusters

1. Clarification/eligibility coupling — an allowed essential clarification can incorrectly make otherwise valid M1 input ineligible.
2. Architecture-comparison primary-object semantics — multi-alternative inputs can preserve alternatives while losing the primary product object.
3. Decision-intent taxonomy — upgrade, new-platform, architecture-choice, and investment intent are not consistently separated.
4. Explicit-unknown provenance alignment — user-explicit unknown wording and validator expectations for `UNKNOWN` provenance are misaligned.
5. Same-model transient-provider retry policy — the gate needs a bounded same-model rule for a transient provider failure without introducing model roulette or prompt-tuning loops.

## Next gate

The next gate must:

- use the same Provider/model;
- use the same dedicated Dify workflow identity;
- avoid legacy parser, Router, or alias-table expansion;
- exclude Decision Resolution;
- permit one bounded remediation implementation;
- run one complete A–J matrix;
- add unseen holdout variants;
- require zero material semantic failures;
- stop on failure rather than begin a second prompt-tuning loop.
