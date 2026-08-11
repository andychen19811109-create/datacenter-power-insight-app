# DCPI MVP vNext Dify V2.2 冻结复用与应用侧增强说明

> 文件名因本轮既有交付合同保留 `V23_SETUP`；实际运行基线已按 Cyril 2026-08-02 的明确决定改为已发布的 V2.2，不创建或配置 V2.3。

状态：`RELEASE_CANDIDATE`（应用侧 V2.2 输入兼容、Normalizer、Adapter、Composer、本地 Live、稳定性与安全降级已验证；性能作为后续非阻断优化项）

## 1. 决策与控制台边界

- 直接复用已发布的“Dify 市场情报智能体 V2.2”。
- 不复制 V2.2，不创建 V2.3，不修改或重新发布 Dify Workflow。
- 不修改 System Prompt、User Prompt、Response Format、Thinking、Provider 或模型。
- 不登录控制台替用户操作，不重置或读取 API Key，不排查 Provider 认证。
- vNext 的增强全部发生在 DCPI 应用侧：Context 映射、Markdown Normalizer、Analysis Adapter、Report Composer 和受限分析。

## 2. 已核验的 V2.2 工程基线

历史真实接入来自 PR #11：

```text
branch: v1.4-dify-provider-poc
head: c73b1d93c4ed52989d832b0e67d35af8ba7672bc
API: api/ask-dify.js
request builder: src/utils/difyRequestPayload.js
normalizer: src/utils/difyResponseNormalizer.js
```

可复用能力：Bearer 服务端认证、`/chat-messages`、blocking、原问题放入 `query`、Dify inputs、AbortController、`<think>` 清理、V2.2 Markdown 解析和本地降级。

不复用为最终用户合同：旧 `ask-contract-v1`、L0—L4、Dify 原始 Markdown、Provider Partial 文案、90 秒超时和“章节存在即内容合格”的判断。

## 3. vNext 请求路径

```text
Browser
  -> POST /api/ask-power-insight
  -> validate dcpi.analysis-context.v1
  -> map Context to published V2.2 input variables
  -> POST {DIFY_API_BASE_URL}/chat-messages
  -> normalize V2.2 Markdown/JSON to dcpi.dify-analysis-draft.v1
  -> DCPI Analysis Adapter
  -> Ask Standard Report Composer
  -> report / clarification / related degraded analysis
```

浏览器不直接访问 Dify，也不接触 Key。Dify 原始 Markdown 不进入普通用户页面。

## 4. V2.2 输入变量映射

原始问题必须放在 `query`，不得只放入 Prompt 或 `inputs`。

| V2.2 变量 | vNext 来源 |
| --- | --- |
| `track` | `product_or_technology`，多对象用 ` / ` 保留 |
| `application` | `application_scenarios` |
| `region` | `regions` |
| `customer_type` | `customer_types` |
| `analysis_goal` | 根据 `task_type` 生成任务专用目标 |
| `known_competitors` | `companies`，多厂商全部保留 |
| `time_horizon` | `time_horizon` |
| `local_route` | 产品、架构、比较或路线图映射 |
| `local_intent` | vNext `task_type` 小写值 |
| `guardrail_mode` | `investment` 或 `explanation` |
| `guardrail_note` | 强制应用侧二次校验声明 |
| `extra_context` | 完整 Context JSON、schema、request id、task 与安全规则 |

请求保持：

```json
{
  "inputs": {
    "track": "800VDC",
    "application": "AI数据中心",
    "region": "全球",
    "customer_type": "未提供",
    "analysis_goal": "技术路线机会、风险、架构边界和验证路径",
    "known_competitors": "未提供",
    "time_horizon": "未提供",
    "local_route": "architecture_impact",
    "local_intent": "technology_route",
    "guardrail_mode": "explanation",
    "guardrail_note": "V2.2内容必须由vNext Adapter复核……",
    "extra_context": "完整dcpi.analysis-context.v1与规则"
  },
  "query": "用户原始问题",
  "response_mode": "blocking",
  "user": "服务端用户标识"
}
```

## 5. System Prompt 与 User Prompt

已发布 V2.2 的 System Prompt 和 User Prompt 保持原样。本轮不检查、不复制、不重配控制台 Prompt，也不声称其已满足 vNext 全部专业约束。

vNext 通过 `analysis_goal`、`guardrail_note` 和 `extra_context` 注入以下应用侧要求：

- 问题和澄清高于页面筛选器；
- 多对象不得压缩；
- 不得输出无来源精确数字；
- 结论必须经过 Adapter；
- 不确定内容必须条件化；
- Dify 输出只是草稿，不能直接展示。

如果 V2.2 忽略这些要求，Adapter 必须删除、降级或拒绝相关内容；不得以修改控制台作为本轮隐含前提。

## 6. Response Format 与内部 Draft

V2.2 的实际输出基线是 Markdown 报告。本轮不要求控制台改为严格 JSON。服务端支持：

1. V2/V2.2 结构化 Markdown；
2. 去除 `<think>` 后的 Markdown；
3. 已符合 `dcpi.dify-analysis-draft.v1` 的 JSON。

Markdown 会在服务端转换为严格内部 Draft：

```text
dcpi.dify-analysis-draft.v1
```

转换规则：

- 原问题、request id 和 task 从已验证的请求边界绑定，而不是信任 Markdown 自报；
- objects 来自完整 Analysis Context，保证 Q9 多对象不丢失；
- 未标注来源的事实最多按 `INFERENCE` 处理；
- 只有显式 `[DIRECT] ... | source_ref=...` 才能进入 Direct 候选；
- 缺章节、冲突、无来源数字和证据不足由 Adapter fail-closed；
- 原始 Markdown 只保留在内部 Draft，不进入普通用户页面。

## 7. Thinking、Provider 与模型

- Thinking：沿用 V2.2 当前设置；服务端无条件清理可见 `<think>`。
- Provider/模型：沿用 V2.2 当前固定配置；本轮不切换、不重配、不自动 fallback 到另一模型。
- Provider 和模型的准确名称/版本只有在现有安全运行证据可获得时记录；未知时必须写 `UNKNOWN`，不得猜测。

## 8. 超时与降级

- 服务端默认超时：30 秒；
- 硬上限：120 秒；
- 客户端上限：121 秒，用于容纳服务端受限分析返回；
- 超时、4xx、5xx、网络异常、空输出、非 JSON/非结构化 Markdown、Adapter 拒绝均进入与原问题相关的受限分析；
- 不把旧 90 秒默认带入 vNext。

## 9. Live Smoke Test

仅在本地安全绑定 `DIFY_API_BASE_URL`、`DIFY_API_KEY` 后执行；Key 不得出现在命令输出、日志、文档或仓库。

至少运行：

1. `Kstar是否需要花资源开发全新模块化UPS？`
2. `800VDC在AI数据中心供电架构中的机会和风险是什么？`
3. `从投资者角度看，BBU、液冷、GaN/SiC哪些方向风险收益更优？`

验证：对象完整、任务正确、V2.2 Markdown 可转换、无来源数字被删除/降级、事实/推断/假设分离、行动/Gate/退出一致，且最终页面不显示原始 Markdown。

GC-03 使用相同 Context、同一已发布 V2.2 Workflow 和同一模型真实运行五次，记录延迟、方向、投入建议和 Adapter 状态。无解释反转必须降为 `CONDITIONAL` 或 `INSUFFICIENT_EVIDENCE`。

不得把 TEST_ONLY Fixture 当作 Live 成功证据，也不得在未获明确授权时把问题发送到历史外部 Preview。

## 10. 性能记录

记录全部 Live 请求的延迟、成功/超时/降级，并计算：P50、P90、最大值、超时率和降级率。

目标：

```text
P50 <= 15s
P90 <= 30s
hard timeout <= 120s
```

未达标时保持 PR Draft；120 秒是经授权的故障边界，不改变 P50/P90 性能目标。

## 11. 回滚

1. 不修改或覆盖已发布 V2.2。
2. 如应用侧 V2.2 兼容失败，回滚 `api/ask-power-insight.js` 的 V2.2 输入映射和对应 Adapter/Normalizer 变更。
3. 回滚或故障期间前端保持相关受限分析模式。
4. 不把旧 Dify Markdown、旧 Ask Contract 或其他历史超时策略重新接回普通用户路径。
5. 回滚后重新执行合同、Adapter、Golden、性能和 Preview Gate。

## 12. 当前状态

- Docker/Dify 容器与本地 HTTP 入口：`IMPLEMENTED`（已核验运行和可达）
- V2.2 应用侧输入兼容：`IMPLEMENTED`
- V2.2 Markdown/JSON Normalizer：`IMPLEMENTED`
- Adapter/Composer 强制边界：`IMPLEMENTED`
- Dify 控制台变更：`NOT_APPLICABLE`
- 本地安全环境绑定：`IMPLEMENTED`（Key 未读取/输出，`.env.local` 权限与 Git 排除已核验）
- Live Smoke Test：`IMPLEMENTED`（GC-01 受控复验、GC-02 与 GC-03 均完成完整链路）
- GC-03 五次稳定性：`IMPLEMENTED`（五份 Live 草稿经当前 Adapter/Composer 重放后最终状态 5/5 一致）
- Live P50/P90/最大值/超时率/降级率：`PERFORMANCE_GATE_DEFERRED`（已测量，不属于当前功能 Hard Fail）

当前可声明 `MVP_VNEXT_FUNCTIONAL_GOVERNANCE_GATE_PASS`：完整离线回归、生产构建、真实 Provider 成功路径和安全降级路径均已验证。根据 Cyril 2026-08-02 的明确决定，Provider 响应耗时与偶发超过 120 秒不作为本轮 MVP 提交阻断项；本轮允许提交与推送，Preview 与 Deploy 仍需单独授权。
