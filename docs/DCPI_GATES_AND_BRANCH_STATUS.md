# DCPI Gates And Branch Status

## Verified Worktree States

### PR13

- path: `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app`
- branch: `codex/v1.5-phase2-filter-contract-consumption`
- head: `4da063dc862cbbed8fb3179a7e4c9a8113a73f10`
- state: frozen reference branch
- status: dirty
- do not touch except read-only verification

### PR14

- path: `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-clean-r1`
- branch: `codex/v1.5-phase2.1-clean-r1`
- head: `bff84037a4867bea8a7be3ec2b657ea828801f36`
- state: frozen clean R1 checkpoint
- status: clean
- do not mark ready, merge, or deploy

### R1.1

- path: `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-r1.1`
- branch: `codex/v1.5-phase2.1-r1.1-intent-role-case-recovery`
- head: `db196fd69effc5170ec2c13c3f38aa4c3ccab6b6`
- state: paused local candidate
- status: clean
- do not push or create PR

## Current Gates

- `DCPI_ARCHITECTURE_RESET_REQUIRED`
- `PROJECT_FACT_DOCS_BOOTSTRAP_PR15_PENDING_REVIEW`
- `PROJECT_FACT_DOCS_BECOMES_PERSISTENT_FACT_SOURCE_AFTER_MERGE_TO_MAIN`
- `PR15_PHASE0_DOCS_ONLY_DOES_NOT_FIX_ASK_RUNTIME`
- `NEXT_ALLOWED_GATE_AFTER_PR15_MERGE_ARCHITECTURE_RESET_CONTRACT_FIRST`

If these docs are already present on `main`, do not recreate the docs bootstrap worktree or branch unless explicitly instructed by GPT/user. Treat docs bootstrap as completed and move to the next GPT-approved gate.

PR15 is not a runtime fix. It does not change Ask behavior, answer quality, Dify behavior, Validator runtime, or UI rendering. After PR15 is merged, Codex must remain idle until GPT/user explicitly authorizes `ARCHITECTURE_RESET_CONTRACT_FIRST`. Do not start R1.1, R1.2, local-rule expansion, or implementation work.

## Allowed

- read-only review
- docs bootstrap under dedicated docs branch/worktree
- architecture baseline finalization

## Forbidden

- source code modification
- R1.1 continuation
- R1.2 implementation
- PR creation
- push
- merge
- deploy
- Vercel/Dify/env changes
- claim root cause solved
