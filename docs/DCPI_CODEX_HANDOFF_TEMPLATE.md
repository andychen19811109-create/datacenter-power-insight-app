# DCPI Codex Handoff Template

Use this as the first-message template for future Codex conversations.

## First Message Template

Do not rely on chat history.

Read these docs first:

- `docs/DCPI_PROJECT_BRIEF.md`
- `docs/DCPI_ARCHITECTURE_RESET_BASELINE.md`
- `docs/DCPI_GATES_AND_BRANCH_STATUS.md`
- `docs/DCPI_HISTORICAL_FAILURES.md`
- `docs/DCPI_CODEX_HANDOFF_TEMPLATE.md`

Verify worktree:

- `pwd`
- `git branch`
- `git rev-parse HEAD`
- `git status`
- `git remote`

If in shell repo:

- `/Users/lanmengling/Documents/DCPI APP Engineering`
- and it has only `.git` / no commits / no remote, do not treat it as app worktree

Required initial output:

- `PROJECT_DOCS_LOADED`
- `REPO_CONTEXT_VERIFIED`
- `CURRENT_GATE_CONFIRMED`
- `NO_FORBIDDEN_ACTIONS`

Stop if docs missing or repo context invalid.

## Fail-Safe

Codex must stop immediately if any of the following occurs:

- required docs are missing
- current directory is only a shell repo
- real worktree cannot be verified
- current Gate is unclear
- branch status conflicts with docs
- forbidden actions are unclear
- task requests code implementation before Gate approval
- user or GPT asks to continue R1.1 / R1.2 without explicit updated Gate
- authentication, permission, token, Vercel, Dify, GitHub, browser, or secret access is required
- historical failures are not reviewed before a task touching Ask, evidence, Dify, Validator, or UI output

Every Codex task output must include:

- `anti_regression_checked: true`

Only if Codex has checked the current task against:

- `DCPI_HISTORICAL_FAILURES.md`
- `DCPI_GATES_AND_BRANCH_STATUS.md`
- `DCPI_ARCHITECTURE_RESET_BASELINE.md`

If it cannot perform this check, it must output:

- `anti_regression_checked: false`

and stop.

Forbidden actions:

- no code changes
- no push
- no PR
- no merge
- no deploy
- no env/Vercel/Dify changes
- no root-cause-solved claim
