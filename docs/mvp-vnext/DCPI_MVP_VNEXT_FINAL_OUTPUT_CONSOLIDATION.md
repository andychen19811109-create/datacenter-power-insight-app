# DCPI MVP vNext Final RC output consolidation

`AUTHORITATIVE_CURRENT_OUTPUT_CONSOLIDATION`

The current pipeline remains:

`Dify Draft → Normalizer → Analysis Adapter → Numeric / Investment / Qualitative policies → Publication Guardrail → Report Quality Lint → Report Composer → User report`

The Final RC implementation adds the following reviewed output constraints:

- Ask renders only its current analysis context, not the global transformer/score summary.
- Normal report text cannot expose controlled-fixture engineering markers; development fixture disclosure is one banner outside the report.
- The frozen Golden-case outcomes are enforced by the Adapter: GC-01 and GC-02 are conditional; GC-03 is insufficient evidence even if a provider response contains source-shaped material.
- GC-01, GC-02 and GC-03 render their reviewed decision, opportunity-risk-verification and conditional-comparison matrices as semantic tables.
- The investment clarification preserves a single high-impact choice and its provenance; an unknown subject can only proceed under the explicit multi-scenario assumption.

`DCPI_MVP_VNEXT_FINAL_USER_REPORTS.md` is the current user-output record. `DCPI_MVP_VNEXT_INDEPENDENT_REVIEW_PACKAGE.md` is the current RC evidence and disposition record. Prior evidence files remain historical and must not be used to claim a successful Live run.

Current RC outcome: `MVP_VNEXT_RC_CLOSEOUT_FAIL`. The failure is limited to Live execution/performance binding: all seven prescribed Live requests degraded before usable Provider output, and the effective server timeout was 30 seconds rather than the frozen 120 seconds. No Provider configuration, Docker state, timeout setting, commit, push, PR update, Preview, merge or production deployment was changed.
