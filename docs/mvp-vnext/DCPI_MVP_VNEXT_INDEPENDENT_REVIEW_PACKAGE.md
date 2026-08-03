# DCPI MVP vNext Final RC independent review package

`MVP_VNEXT_FINAL_RC_CLOSEOUT`
Review target: PR #37 on `codex/m1-b1-production-result-chain`.

This package is evidence for independent GPT, GIMINI and engineering review. It is not an independent-review result, release approval, merge authorization or production-deployment authorization.

## 1. Current hard-gate position

| Gate | Current RC result | Evidence |
| --- | --- | --- |
| Functional existence | PASS from the incoming reviewed baseline | Existing functional gate evidence remains historical context only |
| Engineering guardrail | PASS from the incoming reviewed baseline | Current scoped tests and frozen M1 boundary remain green |
| Professional output | PASS for controlled UI/replay structure | Current reports, matrices, status copy and screenshots below |
| UI acceptance | PASS for the controlled current-page check | Ask input, clarification and three first/full-report captures |
| Live content | FAIL | Seven prescribed Live calls all returned related degraded analysis |
| Performance | FAIL | Service timeout resolved to 30,000 ms, not the frozen 120,000 ms; no successful provider latency sample exists |

The prior deferred-performance language is superseded by this RC run. The only hard verdict for this package is recorded in section 7.

## 2. Scope and invariants

- The only normal user entry remains Ask PowerInsight.
- Ask hides the unrelated transformer/score summary and renders Current Analysis Context instead.
- Standard report statuses are a single report value: GC-01 `CONDITIONAL`, GC-02 `CONDITIONAL`, GC-03 `INSUFFICIENT_EVIDENCE`; the user copy for `PUBLISHABLE` is “证据充分，可用于下一步评审”.
- The one high-impact investment clarification is “你更关注哪类投资视角？”, with the four reviewed choices. Selecting “暂不确定，按多情景比较” remains visible as clarification provenance and keeps a multi-scenario boundary.
- Controlled development fixture presentation has one external banner only. Its report body does not expose engineering markers.
- No Provider, Docker, timeout or environment change was made in this RC run.

## 3. Current professional-output evidence

The authoritative current report text is `DCPI_MVP_VNEXT_FINAL_USER_REPORTS.md`.

| Golden case | Required structure verified |
| --- | --- |
| GC-01 Kstar / modular UPS | Three-path, seven-column decision matrix; validation Gate; exit condition; cannot-conclude boundary |
| GC-02 800VDC / AI data center | Facility, busbar/rack, GPU/server opportunity-risk-verification matrix with alternative routes |
| GC-03 BBU / liquid cooling / GaN-SiC | Seven-column conditional comparison; industrial and financial-investment scenario discussions; no unconditional ranking |

## 4. UI evidence

The following images are stored outside the repository at the RC evidence path:

- `mvp-vnext-rc-ask-input.png` — Ask input and Current Analysis Context.
- `mvp-vnext-rc-gc03-clarification.png` — exact one-question clarification and four choices.
- `mvp-vnext-rc-gc01-first.png`, `mvp-vnext-rc-gc01-matrix.png` — GC-01 first view and full matrix.
- `mvp-vnext-rc-gc02-first.png`, `mvp-vnext-rc-gc02-matrix.png` — GC-02 first view and full matrix.
- `mvp-vnext-rc-gc03-first.png`, `mvp-vnext-rc-gc03-matrix.png` — GC-03 first view and full matrix.

Each full-report capture includes the validation Gate and “当前不能下的结论”. The Ask captures contain no unrelated transformer, L4, or 92/100 summary content.

## 5. Local engineering evidence

| Check | Result |
| --- | --- |
| vNext suite | 63/63 PASS |
| Frozen M1 release boundary (G01–G20) | 20/20 PASS |
| Vite-backed M1 UI suite in disposable writable copy | 10/10 PASS |
| Production build in disposable writable copy | PASS; existing >500 kB chunk warning remains |
| Original-worktree aggregate test invocation | 439 PASS plus 10 Vite tests blocked only by sandbox write permission; those 10 passed in the disposable copy |

The frozen G01 path allowlist includes all current RC files. No clean/reset operation was performed on the existing dirty worktree.

## 6. Live execution and performance observation

Live execution used the existing local application binding once per prescribed run: GC-01 once, GC-02 once, GC-03 five times with the same explicit multi-scenario clarification context. No retries were made.

| Request ID | Task | Input / assumption summary | Result | Dify RTT | Total | Raw chars | Normalized / published / filtered | Degraded | Timeout |
| --- | --- | --- | --- | ---: | ---: | ---: | --- | --- | --- |
| rc_live_GC01_1_1785671964737 | Product initiative | Global default; customer boundary unconfirmed | degraded | — | 42 ms | 0 | 0 / 0 / 0 | yes | no |
| rc_live_GC02_1_1785671964779 | Technology route | Global default | degraded | — | 0 ms | 0 | 0 / 0 / 0 | yes | no |
| rc_live_GC03_1_1785671964780 | Investment comparison | Global default; “暂不确定，按多情景比较” | degraded | — | 1 ms | 0 | 0 / 0 / 0 | yes | no |
| rc_live_GC03_2_1785671964781 | Investment comparison | Same context as GC03-1 | degraded | — | 1 ms | 0 | 0 / 0 / 0 | yes | no |
| rc_live_GC03_3_1785671964782 | Investment comparison | Same context as GC03-1 | degraded | — | 0 ms | 0 | 0 / 0 / 0 | yes | no |
| rc_live_GC03_4_1785671964783 | Investment comparison | Same context as GC03-1 | degraded | — | 0 ms | 0 | 0 / 0 / 0 | yes | no |
| rc_live_GC03_5_1785671964783 | Investment comparison | Same context as GC03-1 | degraded | — | 1 ms | 0 | 0 / 0 / 0 | yes | no |

- Config-presence check: base URL and key variables were present; values were not read or printed.
- Effective server timeout: 30,000 ms. Required frozen server timeout: 120,000 ms. Client timeout remained 121,000 ms.
- Across all seven calls: P50 total 1 ms; P90/max total 42 ms; degraded share 100%; observed timeout share 0%. There is no valid provider RTT distribution because no provider call completed into normalization.
- Dominant root class: Provider execution/response-chain failure before usable output (7/7). Its exact subcause was not expanded, because this RC prohibits Provider/Docker exploration, repair and retries.

## 7. RC disposition and next action

`MVP_VNEXT_RC_CLOSEOUT_FAIL`

This result is caused by the Live and timeout contracts, not by an authorization to repair them. The next authorized action is an owner-led Provider/Docker and timeout-binding investigation, followed by a new, explicitly authorized Live run. Do not infer that controlled fixtures establish Live content quality.

PR #37 must remain Draft. Ready-for-review must not be enabled, no merge is authorized, and no production deployment is authorized.
