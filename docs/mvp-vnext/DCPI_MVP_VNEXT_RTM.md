# DCPI MVP vNext 需求追踪矩阵

Current authoritative report-output evidence is `DCPI_MVP_VNEXT_FINAL_OUTPUT_CONSOLIDATION.md` and `DCPI_MVP_VNEXT_FINAL_USER_REPORTS.md`.

基线：PR #37，`codex/m1-b1-production-result-chain`，起始 HEAD `8b61ae650fe08fc493fc05eb959b9c1aff7e963c`。

状态仅使用：`IMPLEMENTED`、`PARTIAL`、`NOT_IMPLEMENTED`、`NOT_APPLICABLE`。

## A. 产品与用户旅程

| ID | 要求 | 实现/证据 | 状态 |
| --- | --- | --- | --- |
| UX-01 | 唯一 Ask PowerInsight 主入口 | `AskPowerInsightExperience.jsx`；浏览器输入页核验 | IMPLEMENTED |
| UX-02 | 自由文本、推荐问题、Context、支持范围、单一开始按钮 | 输入页组件与 UI contract tests | IMPLEMENTED |
| UX-03 | 无 Legacy/Preview/M1 Demo 普通用户并列入口 | App 导航与 vNext 路由；浏览器核验 | IMPLEMENTED |
| UX-04 | 一次最多 3 项轻量澄清，优先 1 项 | `clarificationPolicy.js`、`ClarificationPanel.jsx` | IMPLEMENTED |
| UX-05 | Chips/单选并允许默认假设 | `ClarificationPanel.jsx`；浏览器澄清页核验 | IMPLEMENTED |
| UX-06 | 标准报告首屏直接回答 | `AskStandardReport.jsx` | IMPLEMENTED |
| UX-07 | Context、假设、事实/证据、风险、行动、Gate、退出和不能下的结论 | `AskStandardReport.jsx` | IMPLEMENTED |
| UX-08 | 完整报告展开与 Dashboard/证据联动 | `AskStandardReport.jsx`、App `onNavigate` | IMPLEMENTED |
| UX-09 | 受限分析仍回答相关部分并支持重试/修改 | `degradedAnalysis.js`、`DegradedAnalysisPanel.jsx`；浏览器核验 | IMPLEMENTED |
| UX-10 | 普通用户不见 JSON、Schema、O1-O7、RELEASED/REJECTED | vNext UI 静态与浏览器核验 | IMPLEMENTED |

## B. Analysis Context

| ID | 要求 | 实现/证据 | 状态 |
| --- | --- | --- | --- |
| CTX-01 | `dcpi.analysis-context.v1` 严格 Validator | `contracts/analysisContext.js` | IMPLEMENTED |
| CTX-02 | 多产品、多技术、多厂商 | `buildAnalysisContext.js`、Golden/九题测试 | IMPLEMENTED |
| CTX-03 | 字段来源 QUESTION/CLARIFICATION/FILTER/DEFAULT | Context builder 与 tests | IMPLEMENTED |
| CTX-04 | 问题和澄清优先于筛选器 | Context tests | IMPLEMENTED |
| CTX-05 | 无关筛选器不进入相关问题 | Q9/800VDC Context tests | IMPLEMENTED |
| CTX-06 | Context 修改使旧结果失效 | fingerprint Validator、UI filter invalidation | IMPLEMENTED |
| CTX-07 | 结果页显示实际使用 Context | `AnalysisContextSummary.jsx` | IMPLEMENTED |
| CTX-08 | 关键/无关筛选器的真实结论变化验证 | 结构级 tests 已覆盖；Live Dify 结论变化未执行 | PARTIAL |

## C. Dify 接入与草稿

| ID | 要求 | 实现/证据 | 状态 |
| --- | --- | --- | --- |
| DFY-01 | 新 `/api/ask-power-insight`，浏览器不接触 Key | API 与 client | IMPLEMENTED |
| DFY-02 | Bearer、`/chat-messages`、blocking | `callDifyAnalysis` | IMPLEMENTED |
| DFY-03 | 原问题在 query，Context 映射到已发布 V2.2 inputs | API tests；顶层 inputs 精确为八项已发布变量，安全语义合并到 `extra_context` | IMPLEMENTED |
| DFY-04 | 默认 30 秒、最大 120 秒；客户端 121 秒 | `resolveDifyTimeoutMs`、client 与 tests | IMPLEMENTED |
| DFY-05 | `dcpi.dify-analysis-draft.v1` 严格 Validator | `contracts/difyAnalysisDraft.js` | IMPLEMENTED |
| DFY-06 | JSON、V2/V2.2 Markdown、think、空/非法输出 | normalizer 与 TEST_ONLY fixtures/tests | IMPLEMENTED |
| DFY-07 | V2.1 缺失状态真实 | `V2.1_FIXTURE_NOT_PROVIDED` | IMPLEMENTED |
| DFY-08 | 复用已发布 V2.2，不修改 Dify 控制台 | V2.2 输入映射、兼容说明与聚焦测试 | IMPLEMENTED |
| DFY-09 | Live Dify 调用 | 最小绑定 HTTP 200；GC-01 复验、GC-02 与 GC-03 五次均形成完整链路 | IMPLEMENTED |

## D. DCPI Analysis Adapter

| ID | 要求 | 实现/证据 | 状态 |
| --- | --- | --- | --- |
| ADP-01 | 回答原问题、核心对象、任务与主体检查 | `analysisAdapter.js`、adversarial tests | IMPLEMENTED |
| ADP-02 | 产业/财务投资与对象层级情景化 | Context、Adapter、Composer | IMPLEMENTED |
| ADP-03 | 排序/投入等级/结论行动矛盾检查 | Adapter adversarial tests | IMPLEMENTED |
| ADP-04 | 无来源精确数字删除/降级 | `hasUnsupportedPreciseNumber` 与 tests | IMPLEMENTED |
| ADP-05 | 事实、间接证据、共识、推断、假设分离 | Draft contract、Adapter、报告 UI | IMPLEMENTED |
| ADP-06 | 证据充分性和来源绑定 | Adapter tests | IMPLEMENTED |
| ADP-07 | 只输出五种用户状态 | report contract | IMPLEMENTED |
| ADP-08 | 不使用 Dify 自报 confidence | Adapter tests/boundary | IMPLEMENTED |
| ADP-09 | GC-03 同 Workflow/模型真实五次稳定性 | 五份 Live 草稿重放后 Adapter/最终报告均 5/5 `INSUFFICIENT_EVIDENCE`；谨慎核心结论一致 | IMPLEMENTED |

## E. Composer 与报告

| ID | 要求 | 实现/证据 | 状态 |
| --- | --- | --- | --- |
| RPT-01 | `dcpi.ask-report.v1` 严格 Validator | `contracts/askReport.js` | IMPLEMENTED |
| RPT-02 | 15 段标准报告外壳 | `reportComposer.js`、UI tests | IMPLEMENTED |
| RPT-03 | 产品立项专用分析结构 | Composer + GC-01 tests | IMPLEMENTED |
| RPT-04 | 技术路线专用分析结构 | Composer + GC-02 tests | IMPLEMENTED |
| RPT-05 | 投资比较专用分析结构 | Composer + GC-03 tests | IMPLEMENTED |
| RPT-06 | 原始 Dify Markdown 不进入普通用户页面 | API 只返回 report/degraded；UI 不引用 raw field | IMPLEMENTED |

## F. 测试、性能与发布

| ID | 要求 | 实现/证据 | 状态 |
| --- | --- | --- | --- |
| TST-01 | 合同/Context/非法字段 fail-closed | vNext focused tests | IMPLEMENTED |
| TST-02 | Dify Fixture/Provider 错误矩阵 | vNext focused tests | IMPLEMENTED |
| TST-03 | Adapter 对抗测试 | vNext focused tests | IMPLEMENTED |
| TST-04 | 四状态 UI 合同 | source tests + 本地真实浏览器 | IMPLEMENTED |
| TST-05 | Golden Case 每题 5 种表达 | 15 条 TEST_ONLY tests | IMPLEMENTED |
| TST-06 | 九题每题 3 种表达/Context | 27 条能力边界 tests | IMPLEMENTED |
| TST-07 | Ask 回归 | 242/242 PASS | IMPLEMENTED |
| TST-08 | M1 核心/合同/Gateway 回归 | 104/104 PASS；原 10 项真实 UI/Core/Provider/哈希异常门禁通过 DEV-only 诊断 URL 继续 PASS | IMPLEMENTED |
| TST-09 | 全量适用测试 | 432/432 PASS，0 fail、0 skipped、0 todo | IMPLEMENTED |
| TST-10 | Build | 最终 Vite build PASS；`git diff --check` PASS | IMPLEMENTED |
| TST-11 | P50/P90/最大值/超时率/降级率 | 当前功能样本 P50 87.339 秒、P90/最大 104.172 秒、超时/降级 0%；`PERFORMANCE_GATE_DEFERRED` | PARTIAL |
| TST-12 | Vercel Preview 真实验证 | 尚未 commit/push/deploy | NOT_IMPLEMENTED |
| REL-01 | PR 保持 Draft | 当前 PR #37 为 Draft | IMPLEMENTED |
| REL-02 | 不 Merge、不 Production Deploy | 尚未执行 | IMPLEMENTED |

## G. P-01 至 P-18 闭环矩阵

| 问题 | 关闭依据 | 状态 |
| --- | --- | --- |
| P-01 Ask/筛选器/Dashboard 无闭环 | Context 继承、来源、失效与 related modules | IMPLEMENTED |
| P-02 多个 Ask 入口 | App 普通用户路由只挂载 vNext | IMPLEMENTED |
| P-03 M1 Demo 并列 | 普通导航已移除 | IMPLEMENTED |
| P-04 Provider Preview 误导 | vNext 路径无 Preview/JSON | IMPLEMENTED |
| P-05 六组工程表单负担 | 不再挂载普通用户路径；底层合同保留 | IMPLEMENTED |
| P-06 Schema/Gate 结果不可读 | 正常 UI 已用户化；内部原因码转换为受控用户语言并通过回归 | IMPLEMENTED |
| P-07 最新 M1 Dify 内容不专业 | 三题均形成 Live 草稿并通过应用侧 Adapter/Composer；证据不足内容以谨慎用户报告呈现 | IMPLEMENTED |
| P-08 Dify 原始内容直接展示 | API/Composer/UI 隔离 | IMPLEMENTED |
| P-09 Q9 排序反转 | 五份 Live 草稿三对象完整；证据/情景边界确定性降级，最终状态 5/5 一致且不输出无条件排序 | IMPLEMENTED |
| P-10 无依据精确数字 | Adapter 删除/降级规则与 tests | IMPLEMENTED |
| P-11 事实/证据/推断/假设混用 | evidence_type + source_ref + UI | IMPLEMENTED |
| P-12 多对象压缩 | Context/Draft 多对象与 tests | IMPLEMENTED |
| P-13 复合问题漏答 | 对象覆盖与任务覆盖检查 | IMPLEMENTED |
| P-14 降级仅返回输入 | 任务专用有限结论、风险与验证路径 | IMPLEMENTED |
| P-15 单一认证代替产品能力 | 三类任务、Golden、九题矩阵 | IMPLEMENTED |
| P-16 工程 PASS 等同产品 PASS | RTM 明确 Live/性能/Preview 未完成 | IMPLEMENTED |
| P-17 分钟级延迟/超时 | 120 秒仅 `FUNCTIONAL_VALIDATION_ONLY`；性能数据保留并转入独立后续 Gate | PARTIAL |
| P-18 微版本过度拆分 | 单一 vNext 实施包与证据包 | IMPLEMENTED |

## H. 当前门禁结论

认证、八变量输入合同、三个 Golden 的真实处理链、多对象/证据/数字/用户层隔离和 GC-03 确定性均已成立。当前功能结论为 `MVP_VNEXT_FUNCTIONAL_EXISTENCE_PASS`；性能标记 `PERFORMANCE_GATE_DEFERRED`，Preview 未执行。本轮仍不能 Mark Ready、Merge 或 Production Deploy。

## I. Publication Guardrail整改

| ID | 要求 | 实现/证据 | 状态 |
| --- | --- | --- |
| PG-01 | 全用户字段数字分类与最终防线 | `numericClaimPolicy.js`、`publicationGuardrail.js`、Focused tests | IMPLEMENTED |
| PG-02 | 证据不足禁止整体投资排序 | `investmentRankingPolicy.js`；GC-03五份存量回放 | IMPLEMENTED |
| PG-03 | 规划假设与市场事实隔离 | 最终门禁与Before/After证据 | IMPLEMENTED |
| PG-04 | Context时间来源可见且一致 | Context builder、Summary UI与Focused tests | IMPLEMENTED |
| PG-05 | 不重跑Dify的三题报告重物化 | Publication Guardrail Evidence与Professional Output Acceptance | IMPLEMENTED |

## J. Qualitative Evidence Guardrail

| ID | Requirement | Implementation/evidence | Status |
| --- | --- | --- | --- |
| QG-01 | Centralized qualitative claim policy | `qualitativeClaimPolicy.js` with five frozen classifications | IMPLEMENTED |
| QG-02 | All public fields cannot bypass qualitative policy | `publicationGuardrail.js`; focused all-field contamination test | IMPLEMENTED |
| QG-03 | Unbound facts/evidence and named-company claims are controlled | key-fact/evidence routing, named-company fallback, `DCPI_MVP_VNEXT_QUALITATIVE_EVIDENCE_GUARDRAIL.md` | IMPLEMENTED |
| QG-04 | GC-01/02/03 correction evidence and GC-03 consistency | qualitative evidence amendment, existing five-record replay basis | IMPLEMENTED |
