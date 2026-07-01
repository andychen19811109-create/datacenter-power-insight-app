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
- `PROJECT_FACT_DOCS_BOOTSTRAP_REQUIRED`

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
