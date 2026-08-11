# M1-B1 Vercel Runtime Asset Packaging Fix Evidence

Date: 2026-07-30
Worktree: `/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-m1-b1-result-chain-fix`
Branch: `codex/m1-b1-production-result-chain`
Authorized base: `080fa5ef9aee235ed35bc5227ee448ad0916fdc1`
Original PR head: `86e328ecc2814383d738e7fc07dba5c5dd0ce57b`

## Local gate verdict

`M1_B1_VERCEL_ASSET_PACKAGING_LOCAL_GATE_PASS_PREVIEW_PENDING`

The P1 change is limited to Vercel Function asset packaging. It does not
modify the M1 production result chain, frozen decision logic, runtime assets,
API implementation, package manifests, or React behavior.

## Confirmed Preview failure

- Original Preview deployment ID:
  `dpl_GXLtrWu1HMQU762GPbugC6a5LuLn`
- Original Preview commit:
  `86e328ecc2814383d738e7fc07dba5c5dd0ce57b`
- Request: `POST /api/m1-input-understanding`
- Response: `HTTP 500`
- Runtime error:

```text
Error: ENOENT: no such file or directory, open '/var/task/src/ask/m1/deterministic/contracts/m1.decision-policy.v1.schema.v0.2.json'
```

The failure occurs while
`src/ask/m1/deterministic/internal/artifacts.js` initializes its frozen
artifacts through `fs.readFileSync(new URL(relativePath, import.meta.url),
"utf8")`. The original Vercel Function bundle did not contain the runtime JSON
file at the path resolved by the production module.

## Packaging correction

The root `vercel.json` targets only the production confirmation function and
includes the existing M1 JSON tree:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "functions": {
    "api/m1-input-understanding.js": {
      "includeFiles": "src/ask/m1/**/*.json"
    }
  }
}
```

This follows the current Vercel project configuration contract: the
`functions` key targets the Function source entrypoint and `includeFiles`
accepts a glob string for additional Function files.

No JSON was converted to JavaScript, copied, generated, or modified.

## Required runtime assets

The include glob covers all seven required runtime assets:

1. `src/ask/m1/deterministic/contracts/m1.decision-policy.v1.schema.v0.2.json`
   - SHA-256:
     `4a137df6e6f3393e6af54690e78c8085844551ca69ada391c1cb3ee63e844a1a`
2. `src/ask/m1/deterministic/contracts/m1.template-catalog.v1.schema.v0.2.json`
   - SHA-256:
     `df7c1b52ac43ff347944b84485ce7a24dc50a34ba682c5d338e1f75d55b175f7`
3. `src/ask/m1/deterministic/contracts/m1.fail-closed-error.v1.schema.v0.2.json`
   - SHA-256:
     `ee8369b5fdeeaa5e4aa2b14a22ea84aced92cf117dc85b72df18eaed02b227e4`
4. `src/ask/m1/deterministic/contracts/m1.release-result.v1.schema.v0.2.json`
   - SHA-256:
     `c0e134d9b4b96f4ee7932288333681c0f8803d102e25cee4779269e0ca6b09f0`
5. `src/ask/m1/deterministic/policy/m1.decision-policy.wave1.v0.2.json`
   - SHA-256:
     `48e14a08bbbf1cbd19365c72f7443dcb15a21254215cba8f295bdcfe19e803f5`
6. `src/ask/m1/deterministic/policy/m1.template-catalog.v1.v0.2.json`
   - SHA-256:
     `35996835b16bd1b35f3cc4132edf3c9044f8ff3199b6b323d46f8ae950015903`
7. `src/ask/m1/evidence/m1OfficialEvidenceWave1.v0.2.json`
   - SHA-256:
     `67e112d4bf936ebd76924c632e3267b9ef0a92bdb903a6d6a64854d2fedaa970`

Asset modification status: zero difference from the original PR head and the
authorized clean-release baseline.

## Frozen and excluded scope

Zero P1 difference from `86e328ecc2814383d738e7fc07dba5c5dd0ce57b`:

- `package.json`
- `package-lock.json`
- `api/m1-input-understanding.js`
- `src/ask/m1/contracts/**`
- `src/ask/m1/deterministic/**`
- `src/ask/m1/evidence/**`
- `src/ask/m1/m1DecisionCore.js`
- `src/ask/m1/m1DecisionEvidenceContext.js`
- `src/ask/m1/releaseIntegration/**`
- frozen Policy, Template, Schema, Evidence, Gateway, Snapshot, Hash, and
  Golden RELEASED/REJECTED assets

Changed tests contain no `.only`, `.skip`, `skip:`, or `todo:`.

## Regression and build evidence

- B1 focused input/Core: `42/42 PASS`
- Production App browser interaction: `10/10 PASS`
- Frozen deterministic Core: `62/62 PASS`
- Applicable Release Integration G02-G20: `19/19 PASS`
- Applicable Demo Snapshot/ViewModel: `9/9 PASS`
- Total applicable tests: `142/142 PASS`
- Production build: `PASS`
- Modules transformed: `2306`, unchanged from the original evidence
- `git diff --check`: pending final two-file diff gate

The first sandboxed UI invocation could not create Vite's transient config
cache and returned `EPERM`; the exact test was rerun with authorized worktree
write access and passed `10/10`. An initial Demo filter invocation reached the
historical A3-G13 branch-identity sentinel; the nine applicable tests were
rerun with an explicit positive filter and passed `9/9`. No test or production
file was changed in response.

## Function bundle verification

Local Vercel CLI status: `NOT_AVAILABLE`.

`vercel build` was not run because the CLI is not installed. No CLI,
dependency, package, or lockfile installation was attempted. Local
configuration evidence proves the Function include glob covers all seven
assets. Final bundle acceptance must come from the new Git-integrated Preview:
both controlled runtime paths must execute on the new deployment without
`ENOENT`, missing Schema/Policy/Template/Evidence errors, or HTTP 500.

## Post-push Preview reconciliation

These fields are necessarily pending until the single authorized commit is
pushed and Git integration creates its deployment. They must be recorded in
the PR #37 `Preview Runtime Asset Packaging Correction` section and in the
final execution result without creating a second commit:

- New Preview URL: `PENDING`
- New Preview deployment ID: `PENDING`
- New Preview commit SHA: `PENDING`
- Vercel Check: `PENDING`
- RELEASED online acceptance: `PENDING`
- REJECTED online acceptance: `PENDING`
- New deployment Runtime Logs: `PENDING`

## Release boundary

- Dify automatic extraction remains `BLOCKED`.
- PR #37 must remain Draft.
- Independent audit remains `PENDING`.
- Merge is not authorized.
- Production Deploy is not authorized.
- PR #35 must not be modified.
