# DCPI MVP vNext Publication Guardrail Evidence

`HISTORICAL_EVIDENCE` — current output consolidation is recorded in `DCPI_MVP_VNEXT_FINAL_OUTPUT_CONSOLIDATION.md` and `DCPI_MVP_VNEXT_FINAL_USER_REPORTS.md`.

## 规则边界

### 数字声明

| 类型 | 发布处理 |
| --- | --- |
| SOURCE_BOUND | 仅在存在`source_ref`时保留，并在证据状态展示可追溯来源 |
| USER_PROVIDED | 来自问题、澄清或Context的数字保留，并标注“用户输入/分析条件” |
| TECHNICAL_IDENTIFIER | 保留技术标识，例如800VDC；不能作为其他效率、市场或性能数字的绕过通道 |
| PLANNING_ASSUMPTION | 仅在推荐行动、验证Gate、退出条件内保留，并标注“规划假设（非市场事实，待企业确认）” |
| UNSUPPORTED_QUANTITATIVE_CLAIM | 在所有用户可见字段中泛化或删除；若影响发布状态则降级 |

### 投资排序

- `INSUFFICIENT_EVIDENCE`：禁止整体排序、总体优先级、`A > B > C`、最优、风险收益最高及无条件优先投入。
- `CONDITIONAL`：仅允许同时带投资主体、时间窗口、关键假设和主要风险的场景判断。
- `PUBLISHABLE`：仍要求对象层级可比、主体和周期明确、关键结论有来源、无冲突且无未支持关键数字。

### 时间来源

- QUESTION、CLARIFICATION、FILTER均原样显示来源。
- DEFAULT/既有Live未知时间显示为“未指定（默认分析时间范围）”，不倒写页面2026为同一请求事实。

## 实现位置

- 数字分类：`src/ask/vnext/numericClaimPolicy.js`
- 排序政策：`src/ask/vnext/investmentRankingPolicy.js`
- 最终统一边界：`src/ask/vnext/publicationGuardrail.js`
- Composer接入：`src/ask/vnext/reportComposer.js`
- 时间来源与UI显示：`src/ask/vnext/buildAnalysisContext.js`、`src/ask/vnext/AnalysisContextSummary.jsx`

## 存量草稿回放摘要

| Case | 状态 | 时间来源 | 无支持数字 | 整体排序 | 内部术语 |
| --- | --- | --- | --- | --- | --- |
| GC-01 | 条件性结论 | 未指定 / 默认分析时间范围 | 无 | 未发现 | 未发现 |
| GC-02 | 条件性结论 | 未指定 / 默认分析时间范围 | 无 | 未发现 | 未发现 |
| GC-03-1 | 证据不足 | 未指定 / 默认分析时间范围 | 无 | 未发现 | 未发现 |
| GC-03-2 | 证据不足 | 未指定 / 默认分析时间范围 | 无 | 未发现 | 未发现 |
| GC-03-3 | 证据不足 | 未指定 / 默认分析时间范围 | 无 | 未发现 | 未发现 |
| GC-03-4 | 证据不足 | 未指定 / 默认分析时间范围 | 无 | 未发现 | 未发现 |
| GC-03-5 | 证据不足 | 未指定 / 默认分析时间范围 | 无 | 未发现 | 未发现 |

完整Before/After和三份完整用户报告见`DCPI_MVP_VNEXT_PROFESSIONAL_OUTPUT_ACCEPTANCE.md`。

## 测试与残余问题

- Focused tests：`54/54 PASS`（`src/ask/vnext/__tests__/*.test.js`）
- Full applicable tests：`440/440 PASS`（`node --test`，在可写本地测试环境执行）
- Production build：`PASS`（保留既有JS Chunk P2警告）
- `git diff --check`：`PASS`；禁用测试标记检查：`PASS`；M1冻结资产检查：`PASS`；Secret与`.env.local`：`PASS`（600、忽略、未跟踪）。
- P0：无（基于存量草稿回放）。
- P1：事实性定性断言的证据升级仍须GPT产品/证据政策裁决。
- P2：JS Chunk警告按本轮边界未处理。

## Qualitative Evidence Guardrail amendment

The final outlet now also applies the centralized qualitative policy in `qualitativeClaimPolicy.js`, after numeric and investment-ranking controls.

- Unbound qualitative market, maturity, adoption, standard, ecosystem, named-company and current-project assertions cannot remain facts or direct evidence.
- Conditional architecture or scenario analysis is retained only as `ANALYTICAL_INFERENCE`, with a verification boundary, and is moved out of key facts/evidence summary.
- The complete policy, special 800VDC ruling, named-company treatment, GC-01/02/03 Before/After, corrected user reports and focused-test evidence are in `DCPI_MVP_VNEXT_QUALITATIVE_EVIDENCE_GUARDRAIL.md`.

Current engineering status: `MVP_VNEXT_QUALITATIVE_EVIDENCE_GUARDRAIL_READY_FOR_GPT_REVIEW`; it does not replace GPT professional review.
