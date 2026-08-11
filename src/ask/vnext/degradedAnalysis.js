import { ASK_REPORT_SCHEMA_VERSION, validateAskReport } from "./contracts/askReport.js";

const objectLabel = (context) => [...context.product_or_technology, ...context.companies].join("、") || "当前问题对象";

const TASK_LABELS = Object.freeze({
  PRODUCT_INITIATIVE: "产品立项与更新评估",
  TECHNOLOGY_ROUTE: "技术路线机会与风险",
  INVESTMENT_COMPARISON: "投资与资源配置比较",
  COMPETITIVE_ANALYSIS: "竞争差异分析",
  PORTFOLIO_PLANNING: "产品组合规划",
  TREND_PRIORITIZATION: "趋势与赛道优先级",
  UNKNOWN: "受限问题分析",
});

const limitedConclusion = (context) => {
  const objects = objectLabel(context);
  if (context.task_type === "PRODUCT_INITIATIVE") {
    return `${objects}暂不应直接进入完整立项；可先验证目标客户、区域、功率段、产品差距与公司能力匹配。`;
  }
  if (context.task_type === "TECHNOLOGY_ROUTE") {
    return `${objects}需要按设施级、机架级和负载侧边界分别判断机会与风险，并与成熟替代路线并行验证。`;
  }
  if (context.task_type === "INVESTMENT_COMPARISON") {
    return `${objects}不能形成无条件单一排序；近期/长期以及产业投资/财务投资的风险收益口径必须分开。`;
  }
  if (context.task_type === "COMPETITIVE_ANALYSIS") {
    return `${objects}只能做公开边界下的有限比较，不能把产品发布、能力声明或行业常识外推为规模化部署事实。`;
  }
  return `${objects}已被识别，但当前证据不足以生成完整在线专业结论。`;
};

export function createDegradedAnalysis({ analysisContext, reason = "online_provider_unavailable" }) {
  const objects = objectLabel(analysisContext);
  const conclusion = limitedConclusion(analysisContext);
  const taskLabel = TASK_LABELS[analysisContext.task_type] || TASK_LABELS.UNKNOWN;
  const report = {
    schema_version: ASK_REPORT_SCHEMA_VERSION,
    status: "INSUFFICIENT_EVIDENCE",
    title: `受限分析｜${objects}`,
    one_line_conclusion: conclusion,
    recommended_decision: "保留问题，先完成对象边界、关键证据和验证路径核查，再重试在线分析。",
    analysis_scope: [taskLabel, ...analysisContext.product_or_technology, ...analysisContext.companies],
    key_assumptions: analysisContext.assumptions,
    context_summary: {
      context_id: analysisContext.context_id,
      task_type: analysisContext.task_type,
      objects: analysisContext.product_or_technology,
      companies: analysisContext.companies,
      regions: analysisContext.regions,
      customers: analysisContext.customer_types,
      scenarios: analysisContext.application_scenarios,
      time_horizon: analysisContext.time_horizon,
      decision_subject: analysisContext.decision_subject,
      risk_preference: analysisContext.risk_preference,
      field_sources: analysisContext.field_sources,
    },
    key_facts: [],
    core_analysis_sections: [
      { title: "已确认的对象边界", items: [objects, `任务类型：${taskLabel}`] },
      { title: "当前可支持的有限判断", items: [conclusion] },
      { title: "主要风险", items: ["在线草稿不可用时，不生成无来源数字、确定排名或完整市场判断。"] },
      { title: "验证路径", items: ["补充高影响条件", "核对公开证据来源", "完成客户/样机/架构级验证", "恢复在线分析后重新运行 Adapter"] },
    ],
    scenario_comparison: [],
    alternatives: ["保持现有成熟路线作为对照组", "以小范围POC替代直接规模投入"],
    risks: {
      market: ["缺少在线市场草稿，不能判断市场规模、份额或渗透率。"],
      technical: ["需核对对象所处系统层级、接口、安全和成熟度。"],
      commercial: ["客户采用、生态与商业化周期尚未验证。"],
      organizational: ["企业资源、团队和供应链能力未提供。"],
    },
    uncertainties: [
      "在线专业分析当前不可用或输出未通过结构校验。",
      reason === "provider_timeout" ? "在线分析在当前连接可用期间未完成。" : "本次无法取得通过结构与专业校验的在线草稿。",
    ],
    recommended_actions: ["补充关键条件后重试", "进入相关模块核对证据", "保留成熟替代路线"],
    validation_gates: ["对象定义与系统层级明确", "关键事实具备可追溯来源", "客户或场景假设得到验证"],
    exit_conditions: ["对象定义不成立", "关键安全/接口验证失败", "没有目标客户或可验证场景"],
    evidence_summary: [],
    information_to_add: [...analysisContext.missing_high_impact_fields, "公开来源", "客户与场景证据"],
    cannot_conclude: ["不能生成完整在线分析。", "不能给出无条件排名、精确市场数字或真实资金配置建议。"],
    related_modules: [
      { id: "technology", label: "进入技术", reason: "核对技术与架构边界" },
      { id: "companies", label: "进入公司与情报", reason: "核对公开证据" },
    ],
  };
  const validation = validateAskReport(report);
  if (!validation.valid) throw new Error(`degraded_report_invalid:${validation.errors.join(",")}`);
  return {
    mode: "degraded",
    report,
    provider: {
      available: false,
      user_message: "在线专业分析当前不可用，已切换为受限分析模式。",
    },
  };
}
