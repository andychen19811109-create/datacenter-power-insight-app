import { ASK_REPORT_SCHEMA_VERSION, validateAskReport } from "./contracts/askReport.js";
import { applyPublicationGuardrail } from "./publicationGuardrail.js";
import { lintUserReport } from "./reportQualityLint.js";

const TASK_LABELS = Object.freeze({
  PRODUCT_INITIATIVE: "产品立项与更新评估",
  TECHNOLOGY_ROUTE: "技术路线机会与风险",
  INVESTMENT_COMPARISON: "投资与资源配置比较",
  COMPETITIVE_ANALYSIS: "竞争差异分析",
  PORTFOLIO_PLANNING: "产品组合规划",
  TREND_PRIORITIZATION: "趋势与赛道优先级",
  UNKNOWN: "受限问题分析",
});

const VIOLATION_USER_MESSAGES = Object.freeze({
  core_object_omitted: "核心对象未被完整覆盖",
  task_type_mismatch: "在线草稿与用户任务不一致",
  ranking_or_investment_conflict: "排序或投入建议前后不一致",
  investor_subject_unknown: "投资主体尚未确认",
  task_coverage_incomplete: "任务所需分析维度不完整",
  investment_scenarios_incomplete: "投资主体与时间情景覆盖不足",
  unsupported_precise_number: "存在缺少来源支持的精确数字",
  direct_source_missing: "直接事实缺少可追溯来源",
  internal_plan_presented_as_fact: "内部规划假设被误作外部事实",
  evidence_type_mismatch: "事实与证据类型不匹配",
  vendor_evidence_scope_escalation: "供应商材料被过度外推为规模化事实",
  dify_confidence_ignored: "模型自报置信度不能作为结论依据",
  conclusion_action_conflict: "结论与推荐行动不一致",
  evidence_insufficient_for_publishable: "当前证据不足以支持无条件结论",
  high_impact_context_missing: "仍缺少会显著改变结论的关键条件",
});

const OBJECT_TYPE_USER_LABELS = Object.freeze({
  COMPANY: "厂商",
  ARCHITECTURE: "架构",
  SOLUTION: "解决方案",
  COMPONENT_TECHNOLOGY: "器件技术",
  PRODUCT: "产品",
  UNKNOWN: "待确认对象",
});

const violationUserMessage = (code) => VIOLATION_USER_MESSAGES[code]
  || "存在未通过专业校验的内容";
const objectTypeUserLabel = (type) => OBJECT_TYPE_USER_LABELS[type] || "待确认对象";

const decisionFallback = (taskType) => {
  if (taskType === "PRODUCT_INITIATIVE") return "现有证据不足以支持立即启动全新平台；建议先进行平台差距和客户需求验证，再在“现有平台升级、全新平台、暂缓投入”三种路径中决策。";
  if (taskType === "TECHNOLOGY_ROUTE") return "采用分层架构与替代路线并行验证，不把产品发布等同于规模化运行成熟度。";
  if (taskType === "INVESTMENT_COMPARISON") return "不输出无条件单一排序；按投资主体、周期和风险偏好形成情景化配置建议。";
  return "当前结论需保持条件化，并通过证据和验证 Gate 后再升级。";
};

const cleanRoleLabel = (value) => String(value || "")
  .replace(
    /^\s*(?:一句话结论|决策结论|最终结论|定方向|推荐建议|推荐决策|最终建议|投入等级|判断|建议)\s*[：:]\s*/i,
    ""
  )
  .trim();

const roleKey = (value) => cleanRoleLabel(value)
  .replace(/[，。；、：:（）()\s]/g, "")
  .toLocaleLowerCase();

const chooseRole = ({
  values,
  positive,
  negative,
  excludedKey = null,
  minimumScore = Number.NEGATIVE_INFINITY,
}) => {
  const ranked = values
    .map((value, index) => {
      const cleaned = cleanRoleLabel(value);
      const positiveScore = positive.reduce(
        (score, pattern) => score + (pattern.test(cleaned) ? 2 : 0),
        0
      );
      const negativeScore = negative.reduce(
        (score, pattern) => score + (pattern.test(cleaned) ? 3 : 0),
        0
      );
      return {
        value: cleaned,
        index,
        score: positiveScore - negativeScore,
      };
    })
    .filter((item) => item.value)
    .filter((item) => !excludedKey || roleKey(item.value) !== excludedKey)
    .filter((item) => item.score >= minimumScore)
    .sort((left, right) =>
      right.score - left.score || left.index - right.index);

  return ranked[0]?.value || "";
};

const recommendationFallback = (taskType) => {
  if (taskType === "PRODUCT_INITIATIVE") {
    return "先完成目标客户、平台差距、研发供应链和商业条件验证，再决定现有平台升级、全新平台或暂缓投入。";
  }
  if (taskType === "TECHNOLOGY_ROUTE") {
    return "先按设施级、机架级和服务器侧完成接口、安全、保护、维护和客户验证，再决定是否进入产品化阶段。";
  }
  if (taskType === "INVESTMENT_COMPARISON") {
    return "在证据补齐前不输出无条件单一排序；先确认投资主体、时间窗口和各对象的关键风险。";
  }
  return "先补充关键条件和可追溯证据，再确定下一阶段行动。";
};

const selectReportRoles = ({
  draft,
  taskType,
  candidateConclusionAllowed,
}) => {
  const fallback = decisionFallback(taskType);

  if (!candidateConclusionAllowed) {
    return {
      oneLine: fallback,
      recommendedDecision: recommendationFallback(taskType),
    };
  }

  const values = draft.candidate_conclusions
    .map(cleanRoleLabel)
    .filter(Boolean);

  const oneLine = chooseRole({
    values,
    positive: [
      /结论|方向/,
      /机会/,
      /风险/,
      /进入|不进入|暂缓/,
      /排序/,
      /成熟度/,
      /证据不足/,
    ],
    negative: [
      /gate/i,
      /门槛/,
      /验证条件|验证边界/,
      /投入等级/,
      /下一步|行动/,
      /规划假设|项目目标|不作为市场事实/,
      /(?:\d|≥|≤).{0,24}(?:样机|POC|RFP|客户访谈|效率|负载区间|开发周期|TCO)|(?:样机|POC|RFP|客户访谈|效率|负载区间|开发周期|TCO).{0,24}(?:\d|≥|≤)/i,
    ],
    minimumScore: 1,
  }) || fallback;

  const recommendedDecision = chooseRole({
    values,
    excludedKey: roleKey(oneLine),
    positive: [
      /建议|推荐/,
      /投入/,
      /验证/,
      /下一步|行动/,
      /补充/,
      /路径|阶段/,
      /进入|暂缓/,
    ],
    negative: [
      /一句话结论|决策结论|定方向/,
    ],
  }) || draft.recommended_actions[0]
    || recommendationFallback(taskType);

  return {
    oneLine,
    recommendedDecision:
      roleKey(recommendedDecision) === roleKey(oneLine)
        ? recommendationFallback(taskType)
        : recommendedDecision,
  };
};

const buildScenarioComparison = (draft, analysisContext) => {
  if (draft.scenario_conclusions.length) {
    return draft.scenario_conclusions.map((item) => ({
      scenario: item.scenario,
      conclusion: item.conclusion,
    }));
  }

  if (analysisContext.task_type !== "INVESTMENT_COMPARISON") {
    return [];
  }

  return analysisContext.product_or_technology.map((object) => ({
    scenario: `对象比较｜${object}`,
    conclusion:
      `分别核实${object}的客户与场景协同性、技术或工程成熟度、资本需求、商业验证和退出路径；当前不形成整体排序。`,
  }));
};

const buildTaskSections = (draft, taskType) => {
  if (taskType === "PRODUCT_INITIATIVE") {
    return [
      { title: "平台与客户验证边界", items: [...draft.key_drivers, ...draft.candidate_conclusions] },
      { title: "三种决策路径比较", items: [
        "现有平台升级｜目标客户和场景可由现有平台覆盖｜模块、拓扑或认证升级；平台复用程度待验证｜差距评估与定向认证投入｜形成代际不足或需求不匹配｜客户需求、功率/拓扑/认证差距、平台复用｜验证通过后进入升级；否则转向全新或暂缓。",
        "全新平台｜现有平台无法满足目标客户和系统要求｜重新定义产品边界、功率/拓扑/模块与认证范围｜研发、认证、供应链与工程投入｜投入、周期和组织风险｜客户承诺、技术差距、研发与供应链能力｜条件成立后立项；关键条件不成立则暂缓。",
        "暂缓投入｜客户需求、市场窗口或企业能力不足｜不承诺新产品边界，保留需求跟踪｜最低限度的市场与竞争验证投入｜错失窗口或判断滞后｜市场、竞争、客户与能力证据｜维持跟踪；证据充分后重新比较三条路径。",
      ] },
      { title: "验证与退出边界", items: [...draft.validation_gates, ...draft.exit_conditions] },
    ];
  }
  if (taskType === "TECHNOLOGY_ROUTE") {
    return [
      { title: "机会—风险—验证矩阵", items: [
        "设施级｜较高电压可能降低同等功率配电电流并减少导体损耗；是否形成系统价值需按项目核算｜电弧、绝缘、开断、故障隔离、维护与认证边界｜传统AC UPS、现有HVDC架构｜核实上游供电、整流、储能、配电、保护和认证兼容性。",
        "母线/机架级｜可能减少中间转换环节并简化部分配电接口；需验证系统级收益｜连接器、开关、故障隔离、维护安全和机架备电接口风险｜现有HVDC、BBU或机架级备电｜核实母线到机架的配电、隔离、开关维护和备电/电源转换接口。",
        "GPU或服务器侧｜末端转换方案可能影响热设计、效率与系统集成；不得将设施电压等同于芯片或板级电压｜末端转换、热边界、故障传播和服务可维护性风险｜服务器电源转换、现有低压配电与备电路径｜核实末端转换、热、故障边界和客户运行验证；产品发布不等同于规模运行成熟度。",
      ] },
      { title: "替代路线与验证", items: [...draft.alternatives, "传统AC UPS路径、现有HVDC路径、BBU或机架级备电均需按适用场景比较，不能在无来源时判断主流路线。", ...draft.validation_gates] },
    ];
  }
  if (taskType === "INVESTMENT_COMPARISON") {
    return [
      { title: "条件比较矩阵", items: [
        "BBU｜备电/供配电对象｜若企业具备电源、备电及高功率机架客户入口，可验证场景协同性｜客户入口、运行场景、付费与替代路线证据｜系统接口、安全、认证和交付边界｜资本与周期需按方案和客户验证｜场景适配、认证、替代架构与客户采用风险。",
        "液冷｜热管理/解决方案对象｜若企业已有数据中心客户和热管理工程能力，可验证液冷协同性｜项目需求、交付闭环、客户采用与服务证据｜系统集成、液路可靠性、工程交付与运维边界｜资本与周期需按交付模式验证｜交付、集成、运维和商业化风险。",
        "GaN/SiC｜功率器件技术对象｜若主体具备半导体产业能力、较长周期和更高风险承受能力，可评估产业链机会｜应用导入、供应链、客户验证与商业化证据｜器件到系统的可迁移性、可靠性和供应链壁垒｜资本与周期受产业链位置和技术周期影响｜技术周期、供应链、资本暴露与退出路径风险。",
      ] },
      { title: "产业投资情景", items: ["分别核实与现有客户和产品的协同性、工程交付能力、技术与供应链能力、商业验证路径和组织投入。"] },
      { title: "财务投资情景", items: ["分别核实商业化证据、资本需求、退出路径、周期和风险暴露。"] },
      { title: "情景比较结论", items: draft.scenario_conclusions.map((item) => `${item.scenario}：${item.conclusion}`) },
    ];
  }
  if (taskType === "COMPETITIVE_ANALYSIS") {
    return [
      { title: "公司与业务边界", items: draft.objects.map((item) => `${item.name}：${objectTypeUserLabel(item.object_type)}`) },
      { title: "产品、方案与AI场景差异", items: draft.key_drivers },
      { title: "竞争证据与不能外推的结论", items: draft.key_facts.map((item) => item.statement) },
    ];
  }
  return [
    { title: "对象与范围", items: draft.objects.map((item) => `${item.name}：${objectTypeUserLabel(item.object_type)}`) },
    { title: "核心驱动与边界", items: draft.key_drivers },
    { title: "条件化判断", items: draft.candidate_conclusions },
  ];
};

const nonEmptySections = (sections) => sections.map((section) => ({ ...section, items: section.items.filter(Boolean) }))
  .filter((section) => section.items.length);

export function buildAskStandardReport({ adapterResult, analysisContext }) {
  if (!adapterResult?.draft) throw new Error("adapter_draft_required");
  const draft = adapterResult.draft;
  const taskLabel = TASK_LABELS[analysisContext.task_type] || TASK_LABELS.UNKNOWN;
  const candidateConclusionAllowed = ["PUBLISHABLE", "CONDITIONAL"].includes(adapterResult.status);
  const { oneLine, recommendedDecision } = selectReportRoles({
    draft,
    taskType: analysisContext.task_type,
    candidateConclusionAllowed,
  });
  const evidenceSummary = draft.key_facts.map((fact) => ({
    statement: fact.statement,
    status: fact.source_ref ? fact.evidence_type : `${fact.evidence_type}_UNSOURCED`,
    source_ref: fact.source_ref,
  }));
  const cannotConclude = [
    "不能将当前分析直接用于真实资金配置、采购承诺或规模化量产决策。",
    ...new Set(adapterResult.violations.map((item) =>
      `由于${violationUserMessage(item.code)}，相关结论不能升级为无条件确定判断。`)),
  ];

  const report = {
    schema_version: ASK_REPORT_SCHEMA_VERSION,
    status: adapterResult.status,
    title: `${taskLabel}｜${analysisContext.product_or_technology.join("、") || analysisContext.companies.join("、") || "当前问题"}`,
    one_line_conclusion: oneLine,
    recommended_decision: recommendedDecision,
    analysis_scope: [
      taskLabel,
      ...analysisContext.product_or_technology,
      ...analysisContext.companies,
      ...analysisContext.application_scenarios,
    ],
    key_assumptions: [...new Set([...analysisContext.assumptions, ...draft.assumed_context])],
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
    key_facts: draft.key_facts.map((fact) => ({
      statement: fact.statement,
      evidence_type: fact.evidence_type,
      source_ref: fact.source_ref,
    })),
    core_analysis_sections: nonEmptySections(buildTaskSections(draft, analysisContext.task_type)),
    scenario_comparison: buildScenarioComparison(draft, analysisContext),
    alternatives: draft.alternatives,
    risks: draft.risks,
    uncertainties: draft.uncertainties,
    recommended_actions: draft.recommended_actions,
    validation_gates: draft.validation_gates,
    exit_conditions: draft.exit_conditions,
    evidence_summary: evidenceSummary,
    information_to_add: draft.missing_information,
    cannot_conclude: cannotConclude,
    related_modules: [
      { id: "overview", label: "进入总览", reason: "查看当前筛选口径和综合信号" },
      { id: "technology", label: "进入技术", reason: "核对技术边界、替代路线和验证门槛" },
      { id: "companies", label: "进入公司与情报", reason: "核对厂商与公开情报证据" },
    ],
  };
  const validation = validateAskReport(report);
  if (!validation.valid) throw new Error(`ask_report_invalid:${validation.errors.join(",")}`);
  return report;
}

export function composeAskStandardReport({ adapterResult, analysisContext }) {
  const report = buildAskStandardReport({ adapterResult, analysisContext });
  const draft = adapterResult.draft;
  const guarded = applyPublicationGuardrail({
    report,
    analysisContext,
    publicationContext: {
      comparable_object_levels: new Set(draft.objects.map((item) => item.object_type)).size === 1,
      has_traceable_key_conclusion: draft.key_facts.some((item) => Boolean(item.source_ref)),
      has_ranking_conflict: adapterResult.violations.some((item) => item.code === "ranking_or_investment_conflict"),
      has_unsupported_key_number: adapterResult.violations.some((item) => item.code === "unsupported_precise_number"),
    },
  });
  const linted = lintUserReport(guarded.report, analysisContext);
  if (!linted.valid) throw new Error(`user_report_quality_invalid:${linted.issues.join(",")}`);
  const validation = validateAskReport(linted.report);
  if (!validation.valid) throw new Error(`ask_report_invalid:${validation.errors.join(",")}`);
  return linted.report;
}

export function composeAskStandardReportWithAudit({ adapterResult, analysisContext }) {
  const report = buildAskStandardReport({ adapterResult, analysisContext });
  const draft = adapterResult.draft;
  const guardrailStartedAt = Date.now();
  const guarded = applyPublicationGuardrail({
    report,
    analysisContext,
    publicationContext: {
      comparable_object_levels: new Set(draft.objects.map((item) => item.object_type)).size === 1,
      has_traceable_key_conclusion: draft.key_facts.some((item) => Boolean(item.source_ref)),
      has_ranking_conflict: adapterResult.violations.some((item) => item.code === "ranking_or_investment_conflict"),
      has_unsupported_key_number: adapterResult.violations.some((item) => item.code === "unsupported_precise_number"),
    },
  });
  const linted = lintUserReport(guarded.report, analysisContext);
  if (!linted.valid) throw new Error(`user_report_quality_invalid:${linted.issues.join(",")}`);
  return { report: linted.report, audit: guarded.audit, quality: linted, publication_guardrail_ms: Date.now() - guardrailStartedAt };
}
