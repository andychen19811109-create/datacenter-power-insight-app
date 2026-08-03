# DCPI MVP vNext Integrated Candidate Evidence

`HISTORICAL_EVIDENCE` — this is the controlled Live-replay basis, not the current authoritative user report.

当前功能状态：`MVP_VNEXT_FUNCTIONAL_EXISTENCE_PASS`

当前门禁：`MVP_VNEXT_FUNCTIONAL_EXISTENCE_GATE`

超时配置标记：`FUNCTIONAL_VALIDATION_ONLY`

性能状态：`PERFORMANCE_GATE_DEFERRED`

本文档严格区分本地实现/Fixture 与 Live Dify、性能、Vercel Preview。`TEST_ONLY` Fixture 不是 Live Dify 成功证据，工程测试 PASS 也不是产品发布 PASS。

## 1. 起始分支和 HEAD

状态：`IMPLEMENTED`

- Repo：`andychen19811109-create/datacenter-power-insight-app`
- Worktree：`/Users/lanmengling/Documents/Cyril/codex/datacenter-power-insight-app-m1-b1-result-chain-fix`
- Branch：`codex/m1-b1-production-result-chain`
- Starting HEAD：`8b61ae650fe08fc493fc05eb959b9c1aff7e963c`
- Preflight worktree：clean
- PR #37：Open、Draft、base `main`、head/HEAD 匹配

## 2. 结束 HEAD

状态：`IMPLEMENTED`

- 当前 Ending HEAD：`8b61ae650fe08fc493fc05eb959b9c1aff7e963c`
- 原因：当前变更尚未提交；功能存在性 Gate 已通过，但性能与 Preview 属于后续门禁，且本轮明确禁止 commit。

## 3. 变更文件

状态：`IMPLEMENTED`

计划变更边界：

- `api/ask-power-insight.js`
- `src/App.jsx`
- `src/App.css`
- `src/ask/m1/__tests__/m1ConfirmedInputUi.test.js`（仅为 DEV-only 诊断 URL 保留原 10 项真实门禁）
- `src/ask/vnext/**`
- `docs/dify/DCPI_MVP_VNEXT_DIFY_V23_SETUP.md`
- `docs/mvp-vnext/**`
- `vercel.json`

最终文件列表以 `git status --short --untracked-files=all` 与 `git diff --name-only` 为准。

## 4. 未修改冻结文件

状态：`IMPLEMENTED`

本轮未修改：

- `package.json`
- `package-lock.json`
- `.env*`
- `src/ask/m1/contracts/m1ConfirmedInput.js`
- `src/ask/m1/contracts/m1DecisionState.js`
- `src/ask/m1/contracts/m1EvidenceSnapshot.js`
- `src/ask/m1/m1DecisionCore.js`
- `src/ask/m1/m1DecisionEvidenceContext.js`
- `src/ask/m1/deterministic/**`
- `src/ask/m1/evidence/**`
- `src/ask/m1/releaseIntegration/**`
- M1 冻结 Demo JSON 资产

## 5. 需求追踪矩阵

状态：`IMPLEMENTED`

见 `docs/mvp-vnext/DCPI_MVP_VNEXT_RTM.md`。该矩阵对 Live Dify、性能与 Preview 使用 `NOT_IMPLEMENTED`/`PARTIAL`，没有使用模糊完成表述。

## 6. 架构数据流

状态：`IMPLEMENTED`

```mermaid
flowchart LR
  Q[用户原始问题] --> C[Analysis Context Builder]
  F[页面筛选器] --> C
  C --> P{高影响条件缺失?}
  P -->|是| CL[最多3项轻量澄清]
  CL --> C
  P -->|否| API[/api/ask-power-insight]
  C --> API
  API --> D[已发布 Dify V2.2 blocking Markdown/JSON]
  D --> N[Draft Normalizer + Validator]
  N --> A[DCPI Analysis Adapter]
  A --> R[Ask Standard Report Composer]
  R --> UI[标准报告]
  API -->|失败/超时/非法输出| DEG[相关受限分析]
  UI --> MOD[Dashboard/技术/公司与证据模块]
  DEG --> MOD
```

浏览器只接触新 API；Dify Key 只在服务端读取。Dify 原始草稿和 `raw_report_markdown` 不进入普通用户 UI。

## 7. UI 四状态

状态：`IMPLEMENTED`

1. 输入页：唯一入口、自由文本、3 个推荐问题、实际 Context、支持范围、单一开始按钮。
2. 澄清页：Q9 真实显示 1 个高影响问题和 3 个 Chips，支持默认假设，不出现六组 M1 表单或 UNKNOWN。
3. 标准结果页：组件和合同覆盖一句话结论、推荐决策、Context、假设、事实证据、任务专用分析、情景、风险、行动、Gate、退出和不能下的结论；Live Provider 页面待 Preview Gate。
4. 受限页：本地真实浏览器已验证原对象、有限结论、风险、验证路径、重试、修改问题与模块联动。

浏览器核验结果：页面有内容、无 Vite overlay、无 console error；普通导航无 M1 Demo；输入页无 Preview/JSON；所有内部枚举与错误码已从用户层移除。

## 8. Analysis Context

状态：`IMPLEMENTED`

- 合同：`dcpi.analysis-context.v1`
- 严格字段与枚举 Validator
- 多对象、多公司
- 字段来源 QUESTION/CLARIFICATION/FILTER/DEFAULT
- 问题/澄清优先于筛选器
- 任务相关筛选器白名单
- Context fingerprint 与 UI 旧结果失效
- 报告显示实际采用条件和来源

## 9. Dify Fixture

状态：`IMPLEMENTED`

- 全部 Fixture 明确标记 `TEST_ONLY`。
- 覆盖 V2 Markdown、V2.2 Markdown、JSON、`<think>`、空、随机非 JSON、非法 JSON、缺章节和绑定不一致。
- V2.1 状态固定为 `V2.1_FIXTURE_NOT_PROVIDED`。
- Provider 4xx、5xx、超时、网络错误和非法输出进入相关受限分析。

## 10. 真实 Dify 状态

状态：`IMPLEMENTED`

- Docker：容器运行已核验；API/DB/Redis/Sandbox 为 healthy
- 本地 Dify：`http://127.0.0.1/` 可达（HTTP 307）
- Workflow：按 Cyril 决定直接复用已发布 V2.2；不创建、不修改 V2.3
- V2.2 应用类型：`advanced-chat`；调用端点为 `/v1/chat-messages`
- V2.2 应用侧输入映射：已修复为仅发送八项已发布变量：`track`、`application`、`region`、`customer_type`、`analysis_goal`、`known_competitors`、`time_horizon`、`extra_context`
- 原 `local_route`、`local_intent`、`guardrail_mode`、`guardrail_note` 不再作为 `inputs` 顶层变量；必要语义受控合并到 `extra_context`
- V2.2 Markdown/JSON → Draft → Adapter → Composer：已实现并通过聚焦测试
- Provider：沿用已发布 V2.2 当前配置；名称未取得，记为 `UNKNOWN`
- Model：沿用已发布 V2.2 当前固定模型；名称/版本未取得，记为 `UNKNOWN`
- 本地安全环境绑定：`.env.local` 权限 `600`，由 Git 本地 exclude 排除；未读取或输出 Key
- 认证绑定：Cyril 已独立验证 HTTP 200、应用名“市场情报智能体 V2.2”、应用模式 `advanced-chat`、API Key 有效；Codex 未读取或输出 Key
- 超时策略：服务端默认 30 秒、经授权硬上限 120 秒；当前 Live 验证配置 120 秒；客户端上限 121 秒。标记为 `FUNCTIONAL_VALIDATION_ONLY`，不是正式发布 SLA
- TEST_ONLY 最小绑定复验：120 秒配置下仅执行 1 次，75.507 秒返回 HTTP 200
- Live Golden：GC-01 首次在 120 秒边界超时；按授权审计后仅复验 1 次并在 81.844 秒完成。GC-02 完成 1 次，GC-03 同一 Context 连续 5 次均完成真实 Draft → Normalizer → Adapter → Composer 报告

本轮未修改 Dify 控制台、Workflow、Prompt、模型或 Provider，也未读取、输出、修改或重新生成 API Key。认证恢复证据来自 Cyril 的独立验证；Live 验证只记录耗时和受控结构结果，未记录 Dify 原文。Fixture、故障注入和历史外部 Preview 均未被当成 Live 成功。

## 11. Adapter 规则

状态：`IMPLEMENTED`

Adapter 独立检查：原问题/任务、多对象、用户视角、投资主体、对象层级、任务覆盖、情景覆盖、排序与投入冲突、结论行动冲突、无来源精确数字、Direct 来源绑定、内部规划外推、证据充分性和 Dify confidence 误用。

用户状态仅为：`PUBLISHABLE`、`CONDITIONAL`、`NEEDS_CLARIFICATION`、`INSUFFICIENT_EVIDENCE`、`UNSUPPORTED`。原 M1 `RELEASED/REJECTED/O1-O7` 只保留在内部诊断/合同边界。

## 12. 三个 Golden Case

状态：`IMPLEMENTED`

Fixture/结构 Gate：

- GC-01：5 种表达，Kstar + 模块化 UPS + 产品立项任务稳定，Fixture Adapter `PUBLISHABLE`。
- GC-02：5 种表达，800VDC + AI 数据中心 + 技术路线任务稳定，Fixture Adapter `PUBLISHABLE`。
- GC-03：5 种表达，BBU/液冷/GaN-SiC 三对象完整，产业投资情景 Fixture Adapter `PUBLISHABLE`。

Live 结果：

- GC-01：请求八字段正确；字段字符长度为 6/3/2/3/33/5/3/1447，query 23 字符、完整请求 1867 字符；13 行 `extra_context` 无重复行，Context 仅序列化一次；单 Live 调用、无 retry。受控复验 Dify 处理 81.829 秒、Wall 81.844 秒，完整链路成立，报告 `CONDITIONAL`，PASS。此前 120.121 秒超时保留为历史性能样本。
- GC-02：84.101 秒完成，Provider 84.069 秒；真实经过 Normalizer → Adapter → Composer，报告状态 `CONDITIONAL`；对象、用户视角、数字与来源边界、不能下的结论、隔离检查 PASS。
- GC-03：同一 Context 连续 5 次，耗时依次 104.172、87.339、89.670、93.307、82.250 秒；5/5 完成完整链路，多对象、产业投资视角、对象层级、无来源数字、Direct 来源绑定和用户层隔离均 PASS。
- GC-03 原始状态漂移根因：5/5 草稿都是 Markdown、三对象完整、任务一致、仅含 `INFERENCE`、支持来源数为 0、解析出的投资情景数为 0；三次命中旧排序冲突词，另外两次因“暂缓”等措辞未进入同一严重级别。它同时包含 Dify 草稿结构/语义变化与 Adapter 措辞敏感问题。
- GC-03 修复：投资比较缺少任务覆盖、投资情景或可发布来源证据时统一为 `INSUFFICIENT_EVIDENCE`；扩展“暂缓/观察”冲突语义；证据不足报告首屏使用谨慎结论，不发布 Dify 候选排序；对象类型转换为中文用户标签。
- 对同一五份 Live 草稿的无网络重放结果：Adapter 状态 5/5 `INSUFFICIENT_EVIDENCE`，最终报告状态 5/5 `INSUFFICIENT_EVIDENCE`，谨慎核心结论 5/5 一致，不确定性以用户语言说明，原始内容和 snake_case 0 泄漏，稳定性 PASS。

三个 Golden Case 均已形成可审计的真实完整链路；GC-03 最终状态已确定化。功能存在性 Gate PASS。

## 13. 九题能力矩阵

状态：`IMPLEMENTED`

每题 3 种表达/Context，共 27 条测试：

| 题号 | 实际本地能力标签 |
| --- | --- |
| 1 模块化 UPS | `FULL_REPORT`（Live 内容待验证） |
| 2 800VDC | `FULL_REPORT`（Live 内容待验证） |
| 3 BBU/液冷/GaN-SiC | `CLARIFICATION_REQUIRED`（确认主体后进入完整报告） |
| 4 工业 UPS | `LIMITED_ANALYSIS` |
| 5 钠电 UPS | `CLARIFICATION_REQUIRED` |
| 6 Vertiv/华为 | `LIMITED_ANALYSIS` |
| 7 MW UPS/液冷 CDU | `LIMITED_ANALYSIS` |
| 8 Gaming UPS | `CLARIFICATION_REQUIRED` |
| 9 未来三年赛道 | `LIMITED_ANALYSIS` |

未声明“九题全部支持”。

## 14. 性能

状态：`PERFORMANCE_GATE_DEFERRED`

已实现：默认 30 秒、经授权硬上限 120 秒、客户端 121 秒、立即 loading 状态、8 秒阶段提示、失败后受限模式。P50/P90 目标仍为 15/30 秒，没有因硬边界扩展而放宽。

当前成功功能样本 7 次耗时：81.844、84.101、104.172、87.339、89.670、93.307、82.250 秒。

- 当前功能样本 P50：87.339 秒
- 当前功能样本 P90：104.172 秒（nearest-rank）
- 当前功能样本最大值：104.172 秒
- 当前功能样本超时率：0/7 = 0%
- 当前功能样本降级率：0/7 = 0%
- 累计保留历史最小绑定与首次 GC-01 超时的全部 9 次：P50 87.339 秒、P90/最大值 120.121 秒、超时率/降级率 1/9 = 11.11%

性能数据如实记录，但本阶段不作为功能 Hard Fail；后续以独立发布性能 Gate 处理。

## 15. 测试

状态：`IMPLEMENTED`

- 本轮八变量合同与用户层原因码修复 focused：24/24 PASS
- 最终功能确定性与用户层隔离 focused：24/24 PASS
- Ask 回归：242/242 PASS
- M1 核心/合同/确定性 Gateway：104/104 PASS
- 原 M1 真实 App/UI/Core/Provider/哈希异常路径：10/10 PASS（仅 DEV-only 显式诊断 URL）
- 最终全量适用测试：432/432 PASS，0 fail、0 skipped、0 todo
- TEST_ONLY 故障注入：timeout、HTTP 429、Provider 5xx、非法 JSON、空响应 5/5 进入相关 `degraded / INSUFFICIENT_EVIDENCE`；无 Provider 详情或内部状态泄漏
- TEST_ONLY 结构矛盾：Adapter 正确识别排序冲突并降为 `INSUFFICIENT_EVIDENCE`；内部原因码仅保留在诊断边界，Composer 转换为受控中文且用户报告不含 snake_case，PASS
- 禁用测试标记：未发现 `.only`、`.skip`、`skip:` 或 `todo:`
- 冻结 M1 运行资产：无差异
- Secret 边界：`.env.local` 权限 `600`、被 Git 本地 exclude、未跟踪；非文档 diff 未发现长 Token 模式

## 16. Build

状态：`IMPLEMENTED`

- 最终 Vite build：PASS，2317 modules transformed
- 已知非阻断警告：单个 JS chunk 超过 500 kB
- `git diff --check`：PASS

## 17. Preview

状态：`NOT_IMPLEMENTED`

- URL：未生成
- Deployment ID：未生成
- Commit：未提交
- State：未验证
- 实际 API 请求与日志：未验证

## 18. 已知问题

状态：`PARTIAL`

- 功能存在性没有未关闭 P0/P1。
- Live 性能较慢，转入 `PERFORMANCE_GATE_DEFERRED`；不得把 120 秒配置当作正式 SLA。
- Vercel Preview 不属于当前功能存在性 Gate，仍未生成。
- 内部原因码与对象类型枚举的用户层泄漏已修复并通过 focused/全量测试。

## 19. P0 / P1 / P2

状态：`IMPLEMENTED`

- P0：当前功能存在性 Gate 无未关闭项。
- P1：当前功能存在性 Gate 无未关闭项；原因码与对象类型内部枚举泄漏已修复。
- P2：`PERFORMANCE_GATE_DEFERRED`；需要后续分析 Dify 输出体积、Workflow 节点耗时、Provider 首 token/生成耗时与应用端到端开销。Vite bundle chunk 警告另行评估。

当前功能存在性 Gate 已通过；本轮仍受“不 commit/push/Ready/Preview”硬限制约束。

## 20. 发布边界

状态：`IMPLEMENTED`

```text
PR #37 remains Draft.
Ready for Review was not enabled.
Merge was not executed.
Production Deploy was not executed.
```

当前 Hard Verdict：`MVP_VNEXT_FUNCTIONAL_EXISTENCE_PASS`。

性能状态：`PERFORMANCE_GATE_DEFERRED`。

## Publication Guardrail整改（2026-08-02）

- 状态：`MVP_VNEXT_PUBLICATION_GUARDRAIL_READY_FOR_GPT_REVIEW`。
- 新增统一最终发布边界，覆盖数字分类、排序政策、内部术语与时间来源。
- 仅只读回放既有GC-01、GC-02和GC-03五份Live草稿；未发起新Live。
- 详细证据：`docs/mvp-vnext/DCPI_MVP_VNEXT_PUBLICATION_GUARDRAIL_EVIDENCE.md`。
- P0：回放未检出无来源用户可见数字或无条件整体排序；专业事实性断言的最终证据政策仍由GPT裁决。

## Qualitative Evidence Guardrail amendment

No Dify V2.2 change or new Live call was made. The existing GC-01, GC-02 and five GC-03 replay evidence remains the source basis; its final report publication treatment is now governed by `DCPI_MVP_VNEXT_QUALITATIVE_EVIDENCE_GUARDRAIL.md`.

The amendment adds a final all-field qualitative boundary: source-bound facts remain traceable; user context, conditional inference and planning assumptions are segregated; unsupported market/current-state and named-company assertions are converted to verification requirements or removed. GC-03 remains five-of-five without an unconditional overall ranking.
