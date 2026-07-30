# M1-B1 User Data Boundary Copy Fix Evidence

Date: 2026-07-30
Branch: `codex/m1-b1-production-result-chain`
Base: `080fa5ef9aee235ed35bc5227ee448ad0916fdc1`

## Independent Audit Finding

`LOCAL-AUDIT-001 / P1`

The confirmation screen displayed:

> 原始问题（本地保留）

That copy was materially misleading because the production flow sends the
original question to `/api/m1-input-understanding`, and later sends a Confirmed
Input that includes `original_question` to the server for deterministic
analysis.

If a controlled Provider is enabled, its output is used only to form an input
understanding draft for user confirmation. It does not directly generate the
final decision. Dify automatic extraction remains `BLOCKED`.

## Exact Correction

Field title:

> 原始问题

Adjacent disclosure:

> 该问题及确认后的输入会发送至服务端，用于输入理解和确定性分析。如启用受控 Provider，其输出仅作为待确认草稿，不直接生成最终决策。

All user-facing `本地保留` copy was removed. No privacy policy, legal promise,
consent control, or new interaction was added.

## Exact Change Scope

- `src/ask/m1/M1ConfirmedInputPanel.jsx`
- `src/ask/m1/__tests__/m1ConfirmedInputUi.test.js`
- `docs/m1/M1_B1_DATA_BOUNDARY_COPY_FIX_EVIDENCE_20260730.md`

No CSS change was required because the existing original-question styles were
reused.

## Integrity Boundary

Zero change to:

- production API requests and data flow
- `api/m1-input-understanding.js`
- Confirmed Input contract and `original_question`
- Decision Core, Release Integration, Release Gateway, Validator, and Evidence
  Guard
- Certified Decision Policy, Unknown Mapping, Template Catalog, Evidence
  Snapshot, fixed Hash, and Golden RELEASED/REJECTED assets
- Request ID, SHA-256 binding, confirmed statuses, fallback recognition, and
  RELEASED/REJECTED behavior
- `vercel.json`
- `package.json` and `package-lock.json`
- Dify, Provider, Prompt, model, and environment configuration

## Validation

- B1 focused input/Core: `42/42 PASS`
- Production App browser interaction: `10/10 PASS`
  - rendered the exact disclosure
  - preserved the complete original question
  - rendered no user-facing `本地保留`
  - preserved Provider draft-only and no-direct-decision boundaries
  - preserved RELEASED, REJECTED, Request ID, 64-character Hash, binding, and
    exactly-once assertions
- Frozen deterministic Core: `62/62 PASS`
- Applicable Release Integration G02-G20: `19/19 PASS`
- Applicable Demo Snapshot/ViewModel: `9/9 PASS`
- Total applicable tests: `142/142 PASS`
- Production build: `PASS`
- Modules transformed: `2306`
- `git diff --check`: `PASS`

## Preview and Release Boundary

- New Preview before Push: `PENDING`
- Dify automatic extraction: `BLOCKED`
- Independent delta re-audit: `PENDING`
- PR #37 must remain Draft
- Merge is not authorized
- Production Deploy is not authorized
- PR #35 must remain untouched
