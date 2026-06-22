const CATEGORY_GUIDANCE = {
  ups: {
    scope: "不间断供电、可靠性、拓扑、功率段、维护和服务体系",
    investment: "只有目标客户、功率规格、可靠性验证和服务能力形成闭环时，才适合扩大投入",
    risk: "低价同质化、认证周期、并机可靠性和服务网络不足",
  },
  power_utility_ups: {
    scope: "变电站、调度中心、电厂、继保与电力通信负载的专用不间断供电",
    investment: "应按电力行业标准、站用直流协同、抗扰动和长生命周期服务做条件性投入，不套工业 UPS 或数据中心 UPS 模板",
    risk: "项目定制、行业认证、长周期验证和分散站点服务成本",
  },
  power_distribution: {
    scope: "从中低压配电、切换到列头和机柜级电能分配",
    investment: "先锁定设备所在配电层级、切换职责、保护配合和可观测性，再判断投入优先级",
    risk: "短路耐受、选择性保护、认证、现场集成和故障责任边界",
  },
  energy_storage_backup: {
    scope: "数据中心及关键基础设施的储能、直流操作电源与短时备电",
    investment: "先确定功率/能量比、备电时长、倍率、消防和 BMS/EMS 接口，再决定产品化",
    risk: "热失控、消防、寿命、故障隔离和控制责任边界",
  },
  power_conversion: {
    scope: "整流、逆变、双向变流和模块级功率变换",
    investment: "必须绑定明确的输入输出、电压等级、拓扑、效率、功率密度和客户架构后再投入",
    risk: "器件可靠性、磁性元件、控制稳定性、热设计和客户导入周期",
  },
  new_power_architecture: {
    scope: "中压、直流及固态功率电子数据中心供电架构",
    investment: "建议先做架构验证、样机和头部客户共创，标准、保护与旁路体系闭环后再规模化",
    risk: "标准不统一、保护生态不足、旁路与故障隔离复杂、验证周期长",
  },
  cooling_integration: {
    scope: "制冷、液冷及预制化机电集成",
    investment: "按热负载、系统边界、控制联动、现场交付和维护能力判断，不使用 UPS-only 模板",
    risk: "液路可靠性、跨系统接口、现场服务和责任边界",
  },
};

const entityName = (entity) => entity?.displayName || "待确认对象";
const secondaryNames = (state) => (state.secondaryEntities || []).map(entityName);
const contextLine = (rankedContext) => {
  const filters = rankedContext?.filters || {};
  return [
    filters.role ? `${filters.role}视角` : null,
    filters.region,
    filters.customer !== "全部" ? filters.customer : null,
    filters.application !== "全部" ? filters.application : null,
    filters.track !== "全部" ? filters.track : null,
    filters.time ? `${filters.time}年窗口` : null,
  ].filter(Boolean).join("、") || "当前筛选条件";
};

const pairKey = (state) => {
  const source = state.relationships?.[0]?.sourceEntityId || state.primaryEntity?.entityId;
  const target = state.relationships?.[0]?.targetEntityId || state.secondaryEntities?.[0]?.entityId;
  return `${source || "unknown"}:${target || "unknown"}`;
};

const relationshipDetail = (state, decision) => {
  const key = pairKey(state);
  const details = {
    "dc_battery_system:ups": "直流屏主要为继保、控制、通信和自动化等直流负载供电，UPS 主要为关键交流负载提供不间断电源。二者可能共享电池、监控或上级电源，但保护、输出制式和负载责任不同，不能互相默认替代。",
    "power_utility_ups:industrial_ups": "电力专用 UPS 面向变电站、调度、电厂和继保通信体系，强调站用直流协同与电力行业标准；工业 UPS 面向制造、石化、轨交等复杂工业负载，强调环境适应、抗扰动和行业定制。",
    "power_utility_ups:data_center_ups": "电力专用 UPS 重在控制保护负载、行业标准和长生命周期；数据中心 UPS 重在容量扩展、冗余、并机、维护效率和服务 SLA。",
    "solid_state_transformer:ups": "SST/PET 是面向变压、隔离和功率电子变换的新型架构节点，UPS 负责关键负载不间断供电。SST 可改变供电链路，但在储能、旁路和故障保障没有闭环前不等于 UPS。",
    "mvdc:800vdc": "MVDC 描述中压直流配电层级，800VDC 通常描述更靠近 IT 电源链路的直流电压平台；二者可能上下游协同，不是同一层级的互斥方案。",
    "pcs:ups": "PCS 面向储能双向变流和能量调度，UPS 面向关键负载不间断供电。PCS 可以参与组合架构，但不能仅凭双向能力替代 UPS 的旁路、切换和可用性职责。",
    "sts:ups": "STS 负责两路交流电源之间的快速静态切换，UPS 负责储能支撑和不间断供电；两者是配电切换与备电保障的不同层级。",
    "ats:sts": "ATS 通常采用机械切换、适合较长允许切换时间；STS 使用电力电子静态切换、适合更敏感负载。选型取决于切换时间、短路能力、损耗和维护要求。",
    "power_module:ups_module": "power module 是宽泛的功率变换模块概念；UPS module 是服务于 UPS 并机、旁路、控制和热插拔体系的专用模块，不能仅按功率等级等同。",
    "bbu:battery_cabinet": "BBU 更强调靠近负载的短时高倍率备电单元；电池柜更强调集中电池成组、容量与安全管理。两者在位置、倍率、控制接口和维护责任上不同。",
    "micro_module_data_center:modular_ups": "微模块数据中心是机柜、配电、制冷、监控等集成方案；模块化 UPS 只是其中的供电设备层，两者是系统方案与子系统关系。",
  };
  if (details[key]) return details[key];
  if (key === "solid_state_transformer:solid_state_transformer") {
    return "SST 与 PET 在行业语境中经常都指固态/电力电子变压器，但不同资料可能强调不同拓扑或电压等级。正式比较前应确认用户采用的术语定义和系统边界。";
  }
  const names = [entityName(state.primaryEntity), ...secondaryNames(state)].join("、");
  return `已识别 ${names}。应按它们在供电链路中的层级、输入输出、储能职责、切换职责、控制接口和故障边界逐项比较，不能因为属于同一基础设施领域就套用同一产品模板。`;
};

export const buildClarificationAnswer = (state) => {
  const corrected = state.corrections?.find((item) => item.requiresClarification);
  const token = state.unknownTokens?.[0] || corrected?.sourceAlias || "该缩写或对象";
  return `
Question: ${state.rawQuestion}

需要澄清对象
当前不能可靠确认“${token}”在本问题中的具体含义，因此不会把它默认归入 UPS、模块化 UPS、工业 UPS 或其他既有产品模板。

请补充
请提供英文全称、中文名称、所属环节（供电、配电、储能、功率变换或制冷）以及目标应用。用户已否定的含义不会继续作为回答依据。
`.trim();
};

export const buildEntityRelationshipAnswer = (state, decision, rankedContext) => `
Question: ${state.rawQuestion}
Analysis Context: ${contextLine(rankedContext)}

Relationship Conclusion
${relationshipDetail(state, decision)}

Analysis Boundary
本回答只围绕用户明确提到的实体及其接口关系，不把任何非 UPS 对象回落到 UPS-only 模板。
`.trim();

export const buildEntityComparisonAnswer = (state, decision, rankedContext) => `
Question: ${state.rawQuestion}
Analysis Context: ${contextLine(rankedContext)}

Comparison Conclusion
${relationshipDetail(state, decision)}

Comparison Dimensions
1. 系统层级与主要负载。
2. 输入输出、电压、切换或储能职责。
3. 可靠性、保护、维护与认证。
4. 客户价值、交付边界和规模化风险。
`.trim();

export const buildInvestmentAnswer = (state, decision, rankedContext) => {
  const primary = state.primaryEntity;
  const guidance = CATEGORY_GUIDANCE[primary.category];
  return `
Question: ${state.rawQuestion}
Analysis Context: ${contextLine(rankedContext)}

Investment Conclusion
${entityName(primary)}：条件性投入。${guidance.investment}。

Validation Gate
投入前必须确认目标客户、规格、认证、样机验证、供应链和可复制订单，不能仅凭赛道名称立项。

Key Risk
${guidance.risk}。
`.trim();
};

export const buildArchitectureImpactAnswer = (state, decision, rankedContext) => {
  const primary = entityName(state.primaryEntity);
  const targets = secondaryNames(state).join("、") || "相关供电架构";
  const specific = state.primaryEntity.entityId === "sic_module"
    ? "SiC 模块主要通过提高开关频率、效率和功率密度影响 UPS 路线图，但同时提高栅极驱动、EMI、绝缘、热设计和器件可靠性验证要求。它是器件/模块路线，不是 UPS 产品替代路线。"
    : relationshipDetail(state, decision);
  return `
Question: ${state.rawQuestion}
Analysis Context: ${contextLine(rankedContext)}

Architecture Impact
${specific}

Roadmap Implication
${primary} 对 ${targets} 的影响应通过接口样机、效率链路、保护与故障测试验证，再进入正式产品路线图。
`.trim();
};

export const buildProductRoadmapAnswer = (state, decision, rankedContext) => `
Question: ${state.rawQuestion}
Analysis Context: ${contextLine(rankedContext)}

Product Roadmap
${entityName(state.primaryEntity)} 应分为客户需求确认、样机与认证验证、平台化和规模交付四个阶段。每一阶段都必须设置可靠性、成本、接口和服务门禁。

Boundary
路线图仅针对已识别对象，不借用其他产品类别的数据或模板。
`.trim();

export const buildScopeGuardAnswer = (state, decision) => `
Question: ${state.rawQuestion}

Scope Guard
${decision.methodology === "non_analytical"
    ? "该请求属于非分析型内容，不进入数据中心电力产品、投资或路线图回答。"
    : decision.methodology === "out_of_domain"
      ? "该问题不属于当前 data center power / cooling / energy infrastructure 专业范围。"
      : `当前路由触发了边界保护：${decision.routeViolations.join("；") || "对象与目标模板不兼容"}。系统不会生成跨类别投资判断，请补充对象定义。`}
`.trim();

export const buildGenericDomainEntityAnswer = (state, decision, rankedContext) => {
  const primary = state.primaryEntity;
  const guidance = CATEGORY_GUIDANCE[primary.category];
  return `
Question: ${state.rawQuestion}
Analysis Context: ${contextLine(rankedContext)}

Direct Conclusion
${entityName(primary)} 属于${guidance.scope}。当前应先确认应用、规格、系统接口、认证和交付边界，再形成市场或产品结论。

Key Evaluation
${guidance.investment}。

Key Risk
${guidance.risk}。
`.trim();
};

const buildCompanyComparisonAnswer = (state, rankedContext) => `
Question: ${state.rawQuestion}
Analysis Context: ${contextLine(rankedContext)}

Company Comparison
本次只比较用户明确点名的公司：${state.companies.map((item) => item.displayName).join("、")}。比较维度包括目标客户、产品覆盖、区域交付、服务网络和相关实体的工程能力。
`.trim();

export const buildAnswer = (state, decision, rankedContext) => {
  if (decision.route === "unknown_entity_clarification") return buildClarificationAnswer(state, decision, rankedContext);
  if (["route_violation_guard", "scope_guard"].includes(decision.route)) return buildScopeGuardAnswer(state, decision, rankedContext);
  if (decision.route === "entity_comparison") return buildEntityComparisonAnswer(state, decision, rankedContext);
  if (["entity_relationship", "entity_substitution"].includes(decision.route)) return buildEntityRelationshipAnswer(state, decision, rankedContext);
  if (["architecture_impact", "entity_roadmap_impact"].includes(decision.route)) return buildArchitectureImpactAnswer(state, decision, rankedContext);
  if (decision.route === "entity_investment") return buildInvestmentAnswer(state, decision, rankedContext);
  if (decision.route === "product_roadmap") return buildProductRoadmapAnswer(state, decision, rankedContext);
  if (decision.route === "company_comparison") return buildCompanyComparisonAnswer(state, rankedContext);
  return buildGenericDomainEntityAnswer(state, decision, rankedContext);
};
