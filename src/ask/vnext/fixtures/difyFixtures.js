// Deterministic fixture material for tests and DEV-only visual verification.
// Fixture identity stays in test metadata and never enters a user report.
import { DIFY_ANALYSIS_DRAFT_SCHEMA_VERSION } from "../contracts/difyAnalysisDraft.js";

const objectType = (name, companies) => {
  if (companies.includes(name)) return "COMPANY";
  if (/800VDC|HVDC/.test(name)) return "ARCHITECTURE";
  if (/液冷/.test(name)) return "SOLUTION";
  if (/GaN|SiC|SST/.test(name)) return "COMPONENT_TECHNOLOGY";
  return "PRODUCT";
};

export const createTestOnlyDraft = (analysisContext, requestId = "TEST_ONLY_REQUEST", overrides = {}) => {
  const objects = [...analysisContext.product_or_technology, ...analysisContext.companies]
    .map((name) => ({ name, object_type: objectType(name, analysisContext.companies) }));
  const task = analysisContext.task_type;
  const base = {
    schema_version: DIFY_ANALYSIS_DRAFT_SCHEMA_VERSION,
    request_id: requestId,
    original_question: analysisContext.original_question,
    task_type: task,
    understood_decision: "形成带证据边界的条件化决策建议",
    objects,
    assumed_context: analysisContext.assumptions,
    clarification_questions: [],
    candidate_conclusions: task === "INVESTMENT_COMPARISON"
      ? ["不做无条件单一排序；应按投资主体、周期、关键假设和主要风险进行条件比较。", "先补充市场、技术、客户与资本证据，再形成面向具体主体的配置判断。"]
      : task === "TECHNOLOGY_ROUTE"
        ? ["800VDC可作为分层架构验证方向，但产品发布不等同于客户验证或规模化运行成熟度。", "以设施、机架和服务器侧边界分别验证，并与AC UPS、现有HVDC和BBU路径比较。"]
        : ["现有证据不足以支持立即启动全新平台；建议先进行平台差距和客户需求验证，再在三种路径中决策。", "先补齐目标客户、应用场景、平台差距与组织能力的验证条件。"],
    scenario_conclusions: task === "INVESTMENT_COMPARISON" ? [
      { scenario: "近期产业投资", conclusion: "核实客户协同、产品工程能力、供应链能力与可退出的商业验证路径。" },
      { scenario: "长期产业投资", conclusion: "在技术周期、组织投入和产业链位置明确后，再评估能力期权。" },
      { scenario: "近期财务投资", conclusion: "核实收入质量、客户采用、资本需求与风险暴露。" },
      { scenario: "长期财务投资", conclusion: "比较扩张路径、退出流动性和技术周期对回报的影响。" },
    ] : [
      { scenario: "验证通过", conclusion: "进入下一阶段的客户与工程验证。" },
      { scenario: "验证失败", conclusion: "维持跟踪、调整路径或退出。" },
    ],
    key_facts: [],
    key_drivers: task === "TECHNOLOGY_ROUTE"
      ? ["从架构逻辑核实高压配电、转换级数、保护和维护边界。", "将客户验证、产品发布与运营规模部署分开评估。"]
      : task === "INVESTMENT_COMPARISON"
        ? ["比较对象层级、产业能力与商业证据，不把条件情景写成总体排序。", "同时保留产业投资与财务投资的尽调口径。"]
        : ["从目标客户、应用场景、平台复用和认证差距建立验证边界。", "用最小验证顺序确认客户承诺、研发与供应链能力。"],
    alternatives: task === "TECHNOLOGY_ROUTE"
      ? ["传统AC UPS路径", "现有HVDC路径", "BBU或机架级备电路径"]
      : ["保持现有成熟路线", "以最小范围开展验证"],
    risks: {
      market: ["客户采用条件与目标场景尚待验证"],
      technical: ["接口、安全、可靠性与工程边界尚待验证"],
      commercial: ["商业化周期、资本需求与交付模式尚待验证"],
      organizational: ["研发、供应链和工程能力尚待验证"],
    },
    recommended_actions: ["完成客户访谈、架构评审和证据边界核对", "建立可退出的最小验证计划"],
    validation_gates: ["目标客户、接口、标准、工程边界和商业条件通过验证"],
    exit_conditions: ["关键技术、客户或商业验证不成立时停止投入或切换路径"],
    uncertainties: ["缺少可作为直接事实发布的项目、客户和运行证据"],
    missing_information: ["区域客户与应用场景证据", "企业能力、投资主体和周期信息"],
    raw_report_markdown: "fixture",
  };
  return { ...base, ...overrides };
};

export const V2_MARKDOWN_TEST_ONLY = `# TEST_ONLY Dify V2 分析
## 决策结论
- 建议条件性进入验证
## 关键驱动与机会
- 客户场景需要先确认
## 替代路线
- 保持成熟UPS架构作为对照
## 技术风险
- 接口和安全边界待验证
## 商业风险
- 客户采用待验证
## 关键事实与证据
- [DIRECT] TEST_ONLY公开产品资料确认对象存在 | source_ref=TEST_ONLY_SOURCE
## 推荐行动
- 完成客户访谈与POC
## Validation Gate
- 对象、接口与客户场景通过验证
## 退出条件
- 关键Gate失败则退出`;

export const V22_MARKDOWN_TEST_ONLY = `<think>TEST_ONLY reasoning must be removed</think>
# TEST_ONLY Dify V2.2 分析
## 决策结论
- 不输出无条件单一排序
## 关键驱动与机会
- 按主体和周期比较
## 情景比较
- 近期产业投资：优先产品方案协同
- 长期产业投资：保留技术期权
- 近期财务投资：优先收入质量
- 长期财务投资：控制退出风险
## 替代路线
- 分阶段配置
## 商业风险
- 商业化周期不同
## 关键事实与证据
- [DIRECT] TEST_ONLY对象定义来自测试输入 | source_ref=TEST_ONLY_SOURCE
## 推荐行动
- 分情景尽调
## Validation Gate
- 核对投资主体与周期
## 退出条件
- 无法验证客户采用则退出`;

export const V21_FIXTURE_STATUS = "V2.1_FIXTURE_NOT_PROVIDED";
