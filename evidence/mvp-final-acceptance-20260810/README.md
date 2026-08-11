# DCPI APP MVP Final Acceptance Evidence

## Baseline

- Repository: `/Users/lanmengling/Documents/DCPI APP Engineering/r2-mvp`
- Branch: `codex/m1-b1-production-result-chain`
- Starting HEAD: `eb98470772d1aebc186d050a04ecf3fe1cc0376b`
- Pull request: `#37`, Draft throughout acceptance
- Runtime Core: `DCPI R2 Core R2-1.3 MVP FROZEN-V1`
- Canonical schema: `dcpi.canonical-analysis-input.v1`

No Dify Prompt, Workflow, model, temperature, KB, Retriever, Provider, Docker, or production deployment configuration was changed during acceptance. No API key is stored in this package.

## Provenance

Each `runs/Qn.json` record was captured from the normal browser-to-`/api/ask-power-insight` APP path. The local acceptance middleware allowed exactly one Provider call per fixed question, captured the same Service API response used by the production parser, and stored:

- frozen Canonical Input snapshot;
- raw R2 answer and SHA-256;
- APP parsed report;
- Core identity;
- request, conversation, and message identifiers;
- total and Dify latency;
- degraded/error state.

The screenshots in `browser/` were captured from the rendered React UI with `agent-browser`, not from source grep or server-side markup alone.

Q1 completed under the original 120-second local acceptance window. After the user changed the acceptance rule, Q2-Q10 used a local-only 300-second wait. Product, Vercel, and Dify timeout configuration remained 120 seconds. `legacy-120s/Q2.json` preserves the superseded Q2 attempt that ended at 120.056 seconds with `provider_timeout`; it is not presented as an accepted R2 result.

## Real R2 acceptance matrix

| Q | Total ms | Dify ms | RAW chars | HTTP | Degraded | Identity | Rendered UI |
|---|---:|---:|---:|---:|---|---|---|
| Q1 | 119927 | 119905 | 2603 | 200 | NO | FROZEN-V1 | YES |
| Q2 | 90415 | 90399 | 2751 | 200 | NO | FROZEN-V1 | YES |
| Q3 | 104609 | 104602 | 2047 | 200 | NO | FROZEN-V1 | YES |
| Q4 | 152240 | 152214 | 2499 | 200 | NO | FROZEN-V1 | YES |
| Q5 | 167651 | 167646 | 3033 | 200 | NO | FROZEN-V1 | YES |
| Q6 | 183658 | 183623 | 2635 | 200 | NO | FROZEN-V1 | YES |
| Q7 | 104542 | 104532 | 2543 | 200 | NO | FROZEN-V1 | YES |
| Q8 | 170402 | 170367 | 2526 | 200 | NO | FROZEN-V1 | YES |
| Q9 | 143676 | 143670 | 2517 | 200 | NO | FROZEN-V1 | YES |
| Q10 | 121576 | 121557 | 2584 | 200 | NO | FROZEN-V1 | YES |

ANALYZE and REVIEW node latency were not exposed by the APP blocking response and are recorded as `null`, not estimated.

## Preliminary professional quality review

These are Codex structural first-pass ratings only. Final professional acceptance belongs to GPT and Cyril.

| Q | Decision Value | Professional Depth | Subject / Entity Accuracy | Evidence Discipline | Market + Product + Technology Completeness | Readability | P0 | P1 / observation |
|---|---|---|---|---|---|---|---|---|
| Q1 | PASS | PASS | PASS | MINOR | PASS | PASS | NO | Exact market estimates remain evidence-boundary items, not the core decision basis |
| Q2 | PASS | PASS | PASS | PASS | PASS | PASS | NO | None |
| Q3 | PASS | MINOR | PASS | PASS | PASS | PASS | NO | Limited direct Gaming UPS evidence is explicitly disclosed |
| Q4 | PASS | MINOR | PASS | PASS | PASS | PASS | NO | Sodium UPS customer and system evidence remains validation work |
| Q5 | PASS | MINOR | PASS | PASS | PASS | PASS | NO | Huawei direct evidence is limited and explicitly separated from inference |
| Q6 | PASS | PASS | PASS | PASS | PASS | PASS | NO | None |
| Q7 | PASS | PASS | PASS | MINOR | PASS | PASS | NO | 2026 delivery-window language remains a directional planning statement |
| Q8 | PASS | PASS | PASS | PASS | PASS | PASS | NO | None |
| Q9 | PASS | PASS | PASS | MINOR | PASS | PASS | NO | R2 chose a 2026-based 2025-2028 view while Canonical time horizon stayed unspecified |
| Q10 | PASS | PASS | PASS | PASS | MINOR | PASS | NO | Conservative ontology leaves the product track editable/unspecified although the raw question is preserved |

## Browser evidence

- `00-home-annotated.png`: ordinary production navigation; no M1 Demo entry.
- `Q1-rendered.png`: status badge, real core conclusion, frozen context, Markdown table, long report.
- `Q1-snapshot-changed.png`: old report retained after filter change, warning shown, explicit re-analysis control.
- `context-linkage-before-run.png`: China / cloud provider / AI training / 800VDC filters enter Ask context; page year does not become `time_horizon`.
- `Q2-rendered.png` through `Q10-rendered.png`: real accepted APP report renderings.
- `legacy-120s/Q2-rendered.png`: truthful degraded UI for the superseded 120-second attempt.

Final browser inspection found no Vite error overlay and no visible schema, JSON, Provider, M1 Demo, RELEASED/REJECTED, or O1-O7 engineering labels. Related module entries for Market, Product, Technology, and Company/Intelligence were present.

## Known limitations

- Six accepted runs exceeded the unchanged production 120-second contract: Q4, Q5, Q6, Q8, Q9, and Q10. Per the user's revised rule, latency is an observation for this acceptance and not a professional-content failure.
- The frozen M1 exact-path allowlist test still models the pre-closeout file set and rejects the new identity, snapshot, scripts, and evidence files. The frozen M1 safety asset was not edited. All applicable vNext tests pass.
- Production build reports the pre-existing Vite chunk-size warning for the 648.92 kB main JS bundle.
