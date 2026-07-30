# M1-B1 Clean Release Rebuild Evidence

## Verdict

`M1_B1_CLEAN_RELEASE_REBUILD_PASS`

This branch rebuilds the accepted M1-B1 confirmation fallback and production
confirmation chain directly on the authorized current `origin/main`. It does
not carry the historical 18-commit stack and does not change the frozen
Decision Core, Validator, Evidence Guard, Release Gateway, certified assets,
package manifests, Dify workflow, Prompt, Provider, model, or Thinking mode.

Dify automatic input extraction remains `BLOCKED`. The MVP still requires one
user confirmation before a valid `m1.confirmed-input.v1` may enter Decision
Core. Dify/LLM output is never a final decision.

## Identity and baseline

- Source checkpoint (read-only):
  `436bfd5ee27f9fcc95720cabf6650f5b8cd01661`
- Authorized remote main:
  `6556fbeb6b383fb1df7e268ee128ecbb7220bccc`
- Remote check:
  `git ls-remote --heads origin refs/heads/main`
- Clean worktree:
  `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-m1-b1-clean-release`
- Branch:
  `codex/m1-b1-clean-release`
- Branch creation:
  `git worktree add -b codex/m1-b1-clean-release <path> origin/main`
- Merge/rebase/cherry-pick of historical stack: none
- PR #35 mutation: none
- Push/PR/Merge/Deploy: none

## Exact changed file ledger

### Production closure — 9 files

1. `api/m1-input-understanding.js`
2. `src/App.jsx`
3. `src/App.css`
4. `src/ask/m1/M1ConfirmedInputPanel.jsx`
5. `src/ask/m1/contracts/m1InputContext.js`
6. `src/ask/m1/m1ConfirmedInputFlow.js`
7. `src/ask/m1/m1InputResolution.js`
8. `src/ask/m1/m1WorkflowTransport.js`
9. `src/ask/m1/runM1InputUnderstanding.js`

All nine production files are byte-equivalent to the accepted source
checkpoint. No additional production dependency was required because their
imports resolve to either this nine-file closure or frozen assets already
present on the new main baseline.

### Direct tests and fixtures — 8 files

10. `src/ask/m1/__tests__/m1ConfirmedInput.test.js`
11. `src/ask/m1/__tests__/m1ConfirmedInputUi.test.js`
12. `src/ask/m1/__tests__/m1DecisionCore.test.js`
13. `src/ask/m1/__tests__/m1InputResolution.test.js`
14. `src/ask/m1/__tests__/m1InputUnderstanding.test.js`
15. `src/ask/m1/fixtures/m1DecisionCoreFixtures.js`
16. `src/ask/m1/fixtures/m1InputResolutionFixtures.js`
17. `src/ask/m1/__tests__/m1ReleaseIntegration.test.js`

The two historical test dependencies on `m1ProfessionalEligibility.js` and
`m1DecisionResolutionTransport.js` were not restored. Their cases were
re-expressed as strict Input Contract and production confirmed-input API gate
assertions, retaining the 40-case focused gate without importing either
excluded production module.

### Demo scope sentinel and evidence — 2 files

18. `src/ask/m1/demo/__tests__/m1DemoSnapshot.test.js`
19. `docs/m1/M1_B1_CLEAN_RELEASE_REBUILD_EVIDENCE_20260730.md`

Total: 19 files.

## Production chain

```text
src/App.jsx
  -> M1ConfirmedInputPanel
  -> requestM1InputResolution
  -> /api/m1-input-understanding
  -> READY_FOR_CONFIRMATION | FALLBACK_CONFIRMATION_REQUIRED
  -> createM1ConfirmedInput
  -> submitM1ConfirmedInputToDecisionCore
  -> handleM1ConfirmedInputSubmission
  -> frozen buildM1DecisionResolutionRequest
```

The production `onConfirmed` callback is explicit. There is no `useEffect`
submission path. The UI uses a synchronous submission ref and the App uses
same-object promise deduplication, so Strict Mode, re-render, and double-click
cannot duplicate the Core call.

## Historical chain exclusion

The following paths are absent from the new branch diff and absent from the
worktree:

1. `api/ask-dify.js`
2. `scripts/dev-with-api.mjs`
3. `scripts/runM1D3RawGate.mjs`
4. `scripts/runM1InputGate.mjs`
5. `src/ask/m1/buildM1ProviderRequest.js`
6. `src/ask/m1/m1DecisionResolutionTransport.js`
7. `src/ask/m1/m1EvidencePack.js`
8. `src/ask/m1/m1ProfessionalEligibility.js`
9. `src/ask/m1/m1ProfileEligibility.js`
10. `src/ask/m1/parseAndValidateM1ExpertResult.js`
11. `src/ask/m1/resolveM1DecisionContext.js`
12. `src/ask/m1/runM1InvestmentDecision.js`

The exact-path G01, G20, and A3-G13 sentinels check the authorized 19-file
allowlist and separately fail on any change to these excluded paths. No
directory wildcard grants permission to an excluded runtime.

## Frozen asset verification

Relative to `6556fbeb6b383fb1df7e268ee128ecbb7220bccc`, the diff is empty for:

- `package.json`
- `package-lock.json`
- `src/ask/m1/contracts/m1ConfirmedInput.js`
- `src/ask/m1/contracts/m1DecisionState.js`
- `src/ask/m1/contracts/m1EvidenceSnapshot.js`
- `src/ask/m1/deterministic/**`
- `src/ask/m1/evidence/**`
- `src/ask/m1/m1DecisionCore.js`
- `src/ask/m1/m1DecisionEvidenceContext.js`
- `src/ask/m1/releaseIntegration/**`
- committed demo Golden JSON

No Provider, Docker, Dify, or LLM call was made.

## Gate commands and results

### B1F focused gate

```text
node --test \
  src/ask/m1/__tests__/m1InputResolution.test.js \
  src/ask/m1/__tests__/m1ConfirmedInput.test.js \
  src/ask/m1/__tests__/m1InputUnderstanding.test.js \
  src/ask/m1/__tests__/m1DecisionCore.test.js
```

Result: `40/40 PASS`.

### Real production App interaction and exactly-once gate

```text
node --test src/ask/m1/__tests__/m1ConfirmedInputUi.test.js
```

Result: `9/9 PASS`.

- pre-confirmation Core calls: `0`
- post-confirmation Core calls: `1`
- Strict Mode: `true`
- double-click submission calls: `1`
- production Core spy entry: `buildM1DecisionResolutionRequest`
- timeout automatic retries: `0`
- stale-hash Core calls: `0`
- invalid Provider cases entering Core: `0`

### SHA, stale-binding, Evidence Context and frozen deterministic gate

```text
node --test src/ask/m1/__tests__/m1DeterministicDecisionCore.test.js
```

Preliminary frozen baseline result: `62/62 PASS`.

Final combined targeted result: `86/86 PASS`.

### Release, Demo, and exact-path scope sentinels

```text
node --test \
  src/ask/m1/__tests__/m1ReleaseIntegration.test.js \
  src/ask/m1/demo/__tests__/m1DemoSnapshot.test.js
```

Result: `30/30 PASS`.

### Applicable M1 complete regression

```text
node --test \
  src/ask/m1/__tests__/m1ConfirmedInput.test.js \
  src/ask/m1/__tests__/m1ConfirmedInputUi.test.js \
  src/ask/m1/__tests__/m1DecisionCore.test.js \
  src/ask/m1/__tests__/m1DeterministicDecisionCore.test.js \
  src/ask/m1/__tests__/m1InputResolution.test.js \
  src/ask/m1/__tests__/m1InputUnderstanding.test.js \
  src/ask/m1/__tests__/m1ReleaseIntegration.test.js \
  src/ask/m1/demo/__tests__/m1DemoSnapshot.test.js
```

Result: `141/141 PASS`.

### Build

```text
npm run build
```

Result: `PASS`.

```text
vite v5.4.21
2305 modules transformed
dist/assets/index-BMCyLxId.css
dist/assets/index-D197-CnL.js
```

The existing chunk-size advisory remains non-blocking. `npm ci --ignore-scripts`
installed only the lockfile-declared dependencies in the new worktree;
`package.json` and `package-lock.json` remained byte-unchanged.

### Diff and range audit

- `git diff --check`: `PASS`
- commits relative to new main after checkpoint: `1`
- diff stat: `19 files changed, 4150 insertions(+), 54 deletions(-)`
- worktree after commit: `clean`
- local checkpoint subject: `Rebuild M1 B1 on clean release baseline`
- local checkpoint SHA: reported in the final handoff because a commit cannot
  embed its own SHA in its committed content

## Remaining risk

The clean release rebuild removes historical scope contamination but does not
claim that Dify automatic extraction is stable. That capability remains
`BLOCKED`; the accepted MVP safety boundary is still one user confirmation,
confirmed-input SHA binding, and fail-closed Decision Core entry.

`PUSH_PR_MERGE_DEPLOY: BLOCKED`
