import { TAXONOMY_OBJECTS } from "./taxonomyRegistry.js";

export const EVIDENCE_STATUSES = Object.freeze([
  "fact",
  "expert_judgment",
  "assumption",
  "source_required",
  "no_quantified_data",
  "user_input_required",
]);

export const APPLICABILITY_STATUSES = Object.freeze([
  "applicable",
  "not_applicable",
  "source_required",
  "user_input_required",
]);

export const PRODUCT_PLANNING_SECTIONS = Object.freeze([
  "customer",
  "market",
  "competition",
  "selfFit",
  "product",
  "specs",
  "technology",
  "roadmap",
  "gtm",
  "pdc",
  "lcm",
  "evidence",
]);

const field = (value, evidenceStatus, caveat, evidenceRefs = [], applicability = "applicable") => Object.freeze({
  value,
  evidenceStatus,
  evidenceRefs: Object.freeze(evidenceRefs),
  caveat,
  applicability,
});

const expert = (value, caveat, evidenceRefs = ["expert_judgment"]) => field(value, "expert_judgment", caveat, evidenceRefs);
const fact = (value, caveat, evidenceRefs = ["taxonomy"]) => field(value, "fact", caveat, evidenceRefs);
const sourceRequired = (caveat, applicability = "source_required") => field(null, "source_required", caveat, [], applicability);
const noQuantifiedData = (caveat) => field(null, "no_quantified_data", caveat);
const userInputRequired = (caveat) => field(null, "user_input_required", caveat, [], "user_input_required");
const notApplicable = (caveat) => field(null, "source_required", caveat, [], "not_applicable");

const commonEvidence = (label, extra = []) => ({
  facts: fact([`${label} 已纳入本阶段代表性 5+1 验证范围。`], "事实范围限于当前产品分类与种子规划合同。", ["taxonomyRegistry"]),
  expertJudgment: expert(extra, "expert_judgment 仅作为标注后的规划判断，不能替代市场规模或财务事实。"),
  noQuantifiedData: noQuantifiedData("当前产品规划合同不包含 TAM/SAM/SOM/CAGR/ROI/revenue/budget 等量化事实。"),
  sourceRequired: sourceRequired("命名客户、上市日期、认证状态、技术参数和内部能力均需要来源或用户输入。"),
  caveats: expert([
    "当前结果是本地产品规划合同生成的规划草案，不等同于外部客户验证或发布结论。",
    "5+1 是代表性验证范围，不等同于完整产品组合分类。",
  ], "Applies to all generated Ask answers."),
});

const pdc = (priority, projectValue) => ({
  projectValue: expert(projectValue, "Qualitative PDC value only; not a financial claim."),
  targetMarket: sourceRequired("Target market needs validated segmentation before quantified capacity planning."),
  marketCapacityOrNoData: noQuantifiedData("No market capacity value is available."),
  threeYearRevenueImpactOrNoData: noQuantifiedData("No three-year revenue value is available."),
  budgetOrNoData: noQuantifiedData("No budget value is available."),
  ROIOrNoData: noQuantifiedData("No ROI value is available."),
  priority: expert(priority, "Priority is a planning placeholder, not project approval."),
  charterDate: sourceRequired("PDC charter date requires governance input."),
  launchDate: sourceRequired("Launch date requires roadmap authorization and evidence."),
});

const lcm = (stage, migrationStrategy, replacement = null) => ({
  lifecycleStage: expert(stage, "Lifecycle stage is a planning classification."),
  replacementProduct: replacement ? expert(replacement, "Replacement is a planning candidate only.") : sourceRequired("Replacement product requires portfolio decision input."),
  replacementType: sourceRequired("Replacement type requires lifecycle governance input."),
  limitedDate: sourceRequired("Limited date requires lifecycle governance input."),
  stopSellDate: sourceRequired("Stop-sell date requires lifecycle governance input."),
  serviceEndDate: sourceRequired("Service-end date requires lifecycle governance input."),
  migrationStrategy: expert(migrationStrategy, "Migration strategy is qualitative and carries no official date."),
});

const selfFit = () => ({
  selfCapabilityAssumption: userInputRequired("Internal company capability data is unavailable."),
  knownGaps: userInputRequired("Known internal gaps require user input."),
  improvementActions: userInputRequired("Improvement actions require internal baseline capability."),
  doNotInventInternalFacts: fact(true, "不得从公开信息或种子数据反推内部能力。", ["planning_policy"]),
});

export const PRODUCT_PLANNING_CARDS = Object.freeze({
  liquid_cooling: {
    cardId: "planning-card-liquid-cooling",
    objectId: "liquid_cooling",
    label: TAXONOMY_OBJECTS.liquid_cooling.label,
    mode: "single_object",
    customer: {
      targetSegments: expert(["云服务商", "第三方数据中心"], "Representative target segments only; no named customer evidence."),
      scenarios: expert(["AI 训练集群", "新建 AI Factory", "存量改造"], "Scenario logic follows thermal pressure and deployment boundary."),
      buyingLogic: expert(["高密散热", "防漏液可靠性", "控制联动", "运维责任边界", "系统交付"], "Buying logic is qualitative."),
    },
    market: {
      definition: expert("液冷是覆盖 cold plate、CDU、manifold、secondary loop、冷却液与设施侧接口的热管理系统赛道。", "Definition is planning boundary, not market size."),
      trend: expert("AI 高密机柜把风冷推近边界，液冷价值来自热负载承接、可靠性验证和运维边界清晰化。", "Trend is qualitative."),
      tamSamSomOrNoData: noQuantifiedData("当前合同没有可引用的 TAM/SAM/SOM 数据。"),
      regionalBoundary: sourceRequired("Regional adoption and standards require source-backed validation."),
    },
    competition: {
      benchmarkCompetitors: sourceRequired("Competitor capability map requires sourced product/deployment evidence."),
      capabilityMap: sourceRequired("Need product range, technology, delivery, service, ecosystem evidence by vendor."),
      entryBarriers: expert(["液路可靠性", "快接头可靠性", "系统控制联动", "现场 O&M", "责任边界"], "Qualitative barrier map."),
    },
    selfFit: selfFit(),
    product: {
      family: expert("液冷系统产品族", "产品族覆盖设备、液路、控制与运维责任边界。"),
      boundary: fact("液冷不是泛化热管理；必须区分 CDU、cold plate、manifold、secondary loop 和 O&M boundary。", "防止输出泛化热管理结论。"),
      components: expert(["CDU", "cold plate", "manifold", "secondary loop", "quick connector", "leakage prevention", "control linkage", "O&M boundary"], "液冷产品边界必须覆盖这些部件和责任接口。"),
      skuOrRange: sourceRequired("Cooling capacity, rack power, supply temperature and SKU range require source data."),
    },
    specs: {
      coolingCapacity: sourceRequired("Cooling capacity must not be invented."),
      rackPower: sourceRequired("Rack power must not be invented."),
      supplyTemperature: sourceRequired("Supply temperature requires design/source data."),
      certification: sourceRequired("Certification status must not be invented."),
      reliability: sourceRequired("Reliability metrics require test/source data."),
    },
    technology: {
      architecturePosition: expert("位于服务器 cold plate / 机柜 manifold 与设施侧散热回路之间的热管理与液路控制层。", "架构位置为定性判断。"),
      interfaces: expert(["facility water loop", "CDU", "rack manifold", "server cold plate", "monitoring/control system"], "Interface list requires sourced design before parameterization."),
      validationGates: expert(["快接头可靠性", "防漏液", "压力控制", "供液温度", "控制联动", "维护可达性", "可靠性测试"], "Validation gates are required before scale."),
      maturity: expert("medium_high", "Maturity is a planning classification."),
    },
    roadmap: {
      year2026: expert("锁定 CDU、cold plate、manifold、secondary loop、quick connector、leakage prevention、control linkage 和 O&M boundary，形成待补证据的规格清单与验证门槛。", "不是上市承诺。"),
      year2027: expert("仅在具备来源支撑的客户场景下开展样板验证，重点验证可靠性、维护性、接口责任、服务边界和交付可复制性。", "样板验证必须以证据为前提。"),
      year2028: expert("基于样板验证结果、服务模型、标准化程度和 PDC 证据，决定平台化、规模化、继续观察或降级退出。", "规模化是条件判断，不是上市日期。"),
      launch: sourceRequired("Launch date must not be invented."),
    },
    gtm: {
      targetIndustries: expert(["cloud", "colo"], "Representative segments; no named customer claim."),
      lighthouseCustomers: sourceRequired("Named customers require source or user input."),
      salesTools: expert(["component boundary map", "validation gate checklist", "evidence gap list"], "Sales tools are planning artifacts."),
    },
    pdc: pdc("P1 候选", "高密散热压力使液冷具备进入客户样板验证的候选价值，但必须先通过可靠性、运维和证据门槛。"),
    lcm: lcm("验证期", "在缺少装机基数、服务模型和产品组合数据前，不制定替代或迁移计划。"),
    evidence: commonEvidence("Liquid Cooling", ["No cooling capacity, TAM, ROI, named customer, certification or launch date is available locally."]),
  },

  sst: {
    cardId: "planning-card-sst",
    objectId: "sst",
    label: TAXONOMY_OBJECTS.sst.label,
    mode: "single_object",
    customer: {
      targetSegments: sourceRequired("Target customer evidence is not available for SST commercial planning."),
      scenarios: expert(["future architecture research", "new AI Factory concept validation"], "Research scenario only."),
      buyingLogic: expert(["架构价值验证", "标准成熟度", "保护与旁路体系", "长期技术路线"], "Pre-commercial buying logic."),
    },
    market: {
      definition: expert("SST 是前沿固态 / 电力电子变压器方向，不是 HVDC，也不是近期收入型产品。", "边界用于防止与 HVDC 混同。"),
      trend: expert("关注价值来自未来中压变换、空间节省和供电链路简化，但商业化成熟度仍不确定。", "趋势为定性判断。"),
      tamSamSomOrNoData: noQuantifiedData("SST TAM/SAM/SOM are not available and must not be invented."),
      regionalBoundary: sourceRequired("Regional standards and adoption require source-backed evidence."),
    },
    competition: {
      benchmarkCompetitors: sourceRequired("SST competitor/prototype evidence requires sourced technical intelligence."),
      capabilityMap: sourceRequired("Need topology, prototype, standards, reliability and deployment evidence."),
      entryBarriers: expert(["技术不成熟", "标准不足", "高压器件可靠性", "保护与旁路复杂", "验证周期长"], "Pre-commercial barrier map."),
    },
    selfFit: selfFit(),
    product: {
      family: expert("SST / PET 预研平台", "属于预研平台，不是商业 SKU 产品族。"),
      boundary: fact("SST 必须按 research / prototype / validation / watch / exit 管理，并与 HVDC 保持边界分离。", "防止近期商业化误判。"),
      components: expert(["电力电子变压拓扑", "中压接口", "保护与旁路", "宽禁带器件可靠性"], "概念验证范围。"),
      skuOrRange: sourceRequired("Voltage, power range, efficiency and topology parameters require sourced prototype data."),
    },
    specs: {
      efficiency: sourceRequired("Efficiency requires sourced prototype/test data."),
      powerDensity: sourceRequired("Power density requires sourced prototype/test data."),
      certification: sourceRequired("Certification status must not be invented."),
      reliability: sourceRequired("Reliability metrics require sourced test data."),
    },
    technology: {
      architecturePosition: expert("可能成为中压输入与下游 DC/AC 配电之间的未来变换节点；它不同于 HVDC 直流配电架构。", "架构位置为定性判断。"),
      interfaces: sourceRequired("Upstream/downstream interface definitions require architecture source."),
      validationGates: expert(["高压拓扑验证", "保护与旁路", "故障隔离", "宽禁带器件可靠性", "标准成熟度", "样机验证"], "Validation-first framing."),
      maturity: expert("低成熟度", "SST 当前仍处低成熟度预研阶段。"),
    },
    roadmap: {
      year2026: expert("按 research / watch 管理：明确拓扑假设、标准缺口、保护与旁路问题以及退出条件。", "不是上市承诺。"),
      year2027: expert("仅在具备实验室证据和合作方架构需求时进入 prototype validation；否则继续观察。", "不是收入承诺。"),
      year2028: expert("只有在样机可靠性、标准路径和客户共创验证同时成立后，才进入 pilot decision gate；否则保持 watch / exit。", "不是上市承诺。"),
      launch: sourceRequired("Launch timing must not be invented."),
    },
    gtm: {
      targetIndustries: sourceRequired("Target customers require source-backed market validation."),
      lighthouseCustomers: sourceRequired("Named customers require source or user input."),
      salesTools: expert(["technology boundary note", "maturity risk checklist", "exit criteria"], "Research-stage artifacts."),
    },
    pdc: pdc("观察", "SST 属于预研观察项，不是近期商业 PDC 候选。"),
    lcm: lcm("概念期", "在技术和市场验证成立前，不制定替代、迁移或收入化策略。"),
    evidence: commonEvidence("SST", ["Low maturity, no TAM/ROI/launch/customer evidence, and no short-term revenue-product framing."]),
  },

  modular_ups: {
    cardId: "planning-card-modular-ups",
    objectId: "modular_ups",
    label: TAXONOMY_OBJECTS.modular_ups.label,
    mode: "single_object",
    customer: {
      targetSegments: expert(["第三方数据中心", "政府", "边缘计算"], "Representative context only."),
      scenarios: expert(["弹性扩容", "快速维护", "高可用供电"], "Scenario logic is qualitative."),
      buyingLogic: expert(["功率模块粒度", "热插拔维护", "冗余", "认证", "服务网络"], "Buying logic is qualitative."),
    },
    market: {
      definition: expert("模块化 UPS is a UPS product family centered on modular expansion and serviceability.", "Definition is qualitative."),
      trend: expert("Demand depends on reliable modularity, service model and certification evidence.", "Trend is qualitative."),
      tamSamSomOrNoData: noQuantifiedData("Market size is not available."),
      regionalBoundary: sourceRequired("Regional certification/service evidence required."),
    },
    competition: {
      benchmarkCompetitors: sourceRequired("Competitor capability map requires source-backed evidence."),
      capabilityMap: sourceRequired("Need product range, module size, delivery and service evidence."),
      entryBarriers: expert(["认证周期", "并机可靠性", "服务网络", "价格竞争"], "Qualitative barriers."),
    },
    selfFit: selfFit(),
    product: {
      family: expert("UPS product family / Modular UPS", "Representative product family."),
      boundary: fact("模块化 UPS must not drift to 800VDC, GaN/SiC or transformer topics.", "Prevents taxonomy drift."),
      components: expert(["power module", "bypass", "battery interface", "monitoring", "service model"], "Qualitative components."),
      skuOrRange: sourceRequired("Power range and module granularity require product catalog evidence."),
    },
    specs: {
      moduleGranularity: sourceRequired("Module granularity requires source data."),
      certification: sourceRequired("Certification status must not be invented."),
      reliability: sourceRequired("Reliability metrics require test/source data."),
    },
    technology: {
      architecturePosition: expert("Critical power continuity layer between utility/feeders and IT/facility loads.", "Architecture position is qualitative."),
      interfaces: sourceRequired("Upstream/downstream electrical interfaces require architecture/spec input."),
      validationGates: expert(["并机可靠性", "热插拔维护", "认证", "服务验证"], "Validation gates are qualitative."),
      maturity: expert("high", "Planning maturity classification."),
    },
    roadmap: {
      year2026: expert("定义产品族、服务责任边界和认证核查清单。", "不是上市承诺。"),
      year2027: expert("仅在客户证据和认证证据具备时开展样板验证。", "样板验证必须以证据为前提。"),
      year2028: sourceRequired("Scale/launch timing requires governance input."),
      launch: sourceRequired("Launch date must not be invented."),
    },
    gtm: {
      targetIndustries: expert(["colo", "government", "edge"], "Representative target segments."),
      lighthouseCustomers: sourceRequired("Named customers require source or user input."),
      salesTools: expert(["reliability checklist", "serviceability proof points"], "Planning artifacts."),
    },
    pdc: pdc("P1 candidate", "Candidate only after module, certification and service evidence are available."),
    lcm: lcm("mvp", "Migration from older UPS requires installed-base and replacement evidence."),
    evidence: commonEvidence("Modular UPS", ["Power range, certification, reliability and PDC financials remain source-required."]),
  },

  pdu_rpp_sts: {
    cardId: "planning-card-pdu-rpp-sts",
    objectId: "pdu_rpp_sts",
    label: TAXONOMY_OBJECTS.pdu_rpp_sts.label,
    mode: "single_object",
    customer: {
      targetSegments: sourceRequired("Target segments require validated customer evidence."),
      scenarios: expert(["末端配电", "远程配电", "静态切换", "双路供电"], "Keeps PDU/RPP/STS separated."),
      buyingLogic: expert(["短路耐受", "保护配合", "切换可靠性", "运维安全"], "Qualitative buying logic."),
    },
    market: {
      definition: expert("PDU/RPP/STS is a distribution and transfer product family, not generic power distribution.", "Boundary is qualitative."),
      trend: expert("High availability and observability drive distribution-layer validation.", "Trend is qualitative."),
      tamSamSomOrNoData: noQuantifiedData("Market size is not available."),
      regionalBoundary: sourceRequired("Regional certification/project evidence required."),
    },
    competition: {
      benchmarkCompetitors: sourceRequired("Competitor capability map requires source-backed evidence."),
      capabilityMap: sourceRequired("Must separate PDU, RPP, STS range, technology, delivery and service."),
      entryBarriers: expert(["短路耐受", "切换可靠性", "保护配合", "认证", "现场集成"], "Qualitative barriers."),
    },
    selfFit: selfFit(),
    product: {
      family: expert(["PDU", "RPP", "STS"], "Sub-products must remain distinct."),
      boundary: fact("PDU/RPP/STS are distribution and transfer layers; they do not provide UPS energy storage continuity.", "Prevents flattening."),
      components: expert(["PDU", "RPP", "STS", "protection coordination", "monitoring"], "Qualitative components."),
      skuOrRange: sourceRequired("Rating and SKU range require catalog evidence."),
    },
    specs: {
      certification: sourceRequired("Certification status must not be invented."),
      reliability: sourceRequired("Switching/reliability metrics require source data."),
    },
    technology: {
      architecturePosition: expert("Distribution and transfer layer between upstream critical power and downstream racks/loads.", "Architecture position is qualitative."),
      interfaces: sourceRequired("Upstream/downstream interfaces require architecture source."),
      validationGates: expert(["STS 切换可靠性", "短路耐受", "保护配合", "运维安全", "客户认证"], "Validation gates are qualitative."),
      maturity: expert("high", "Planning maturity classification."),
    },
    roadmap: {
      year2026: expert("拆分 PDU、RPP、STS 的产品范围、接口边界和验证门槛。", "不是上市承诺。"),
      year2027: sourceRequired("Pilot timing requires customer/project evidence."),
      year2028: sourceRequired("Launch timing requires governance input."),
      launch: sourceRequired("Launch date must not be invented."),
    },
    gtm: {
      targetIndustries: sourceRequired("Target industries require validated segmentation."),
      lighthouseCustomers: sourceRequired("Named customers require source or user input."),
      salesTools: expert(["capability boundary map", "switching reliability checklist"], "Planning artifacts."),
    },
    pdc: pdc("P2 candidate", "Candidate after sub-product scope and validation evidence are separated."),
    lcm: lcm("mvp", "Replacement plan requires installed-base and product-family data."),
    evidence: commonEvidence("PDU/RPP/STS", ["Do not flatten PDU, RPP and STS into generic distribution."]),
  },

  hvdc: {
    cardId: "planning-card-hvdc",
    objectId: "hvdc",
    label: TAXONOMY_OBJECTS.hvdc.label,
    mode: "single_object",
    customer: {
      targetSegments: expert(["电信运营商", "云服务商"], "Representative context only."),
      scenarios: expert(["超大规模数据中心", "算电协同场景"], "Qualitative scenario logic."),
      buyingLogic: expert(["效率链路", "直流保护", "生态接受度", "区域商业化边界"], "Qualitative buying logic."),
    },
    market: {
      definition: expert("HVDC is a DC power distribution architecture/product-solution family and must stay separate from SST.", "Boundary prevents conflation."),
      trend: expert("Interest depends on conversion-chain simplification, protection and ecosystem acceptance.", "Trend is qualitative."),
      tamSamSomOrNoData: noQuantifiedData("Market size is not available."),
      regionalBoundary: sourceRequired("Regional acceptance and standards require source evidence."),
    },
    competition: {
      benchmarkCompetitors: sourceRequired("Competitor capability map requires sourced evidence."),
      capabilityMap: sourceRequired("Need product/deployment evidence."),
      entryBarriers: expert(["直流保护", "生态接受度", "标准", "架构迁移成本"], "Qualitative barriers."),
    },
    selfFit: selfFit(),
    product: {
      family: expert("HVDC power distribution solution family", "Qualitative family."),
      boundary: fact("HVDC 不是 SST；800VDC 是相邻电压 / 架构变体，不等同于 SST。", "防止 HVDC/SST 混同。"),
      components: expert(["AC/DC conversion", "DC distribution", "protection", "load interface"], "Qualitative components."),
      skuOrRange: sourceRequired("Voltage/current/rating requires sourced architecture/product data."),
    },
    specs: {
      efficiency: sourceRequired("Efficiency requires source data."),
      certification: sourceRequired("Certification status must not be invented."),
      reliability: sourceRequired("Reliability metrics require test/source data."),
    },
    technology: {
      architecturePosition: expert("DC distribution architecture between upstream conversion/protection and downstream DC loads.", "Architecture position is qualitative."),
      interfaces: sourceRequired("Architecture interfaces require source data."),
      validationGates: expert(["直流保护", "故障隔离", "客户架构接受度", "运维安全", "标准生态"], "Qualitative gates."),
      maturity: expert("medium_high", "Planning maturity classification."),
    },
    roadmap: {
      year2026: expert("验证商业边界、保护架构和接口约束。", "不是上市承诺。"),
      year2027: expert("仅在客户场景和项目证据具备时开展样板验证。", "样板验证必须以证据为前提。"),
      year2028: sourceRequired("Scale timing requires governance input."),
      launch: sourceRequired("Launch date must not be invented."),
    },
    gtm: {
      targetIndustries: expert(["telco", "cloud"], "Representative target segments."),
      lighthouseCustomers: sourceRequired("Named customers require source or user input."),
      salesTools: expert(["commercial boundary map", "protection validation checklist"], "Planning artifacts."),
    },
    pdc: pdc("P2 candidate", "Candidate after protection/ecosystem and commercial-boundary evidence."),
    lcm: lcm("mvp", "No replacement decision without portfolio and customer architecture data."),
    evidence: commonEvidence("HVDC", ["HVDC must not be conflated with SST."]),
  },

  portfolio: {
    cardId: "planning-card-portfolio",
    objectId: "portfolio",
    label: TAXONOMY_OBJECTS.portfolio.label,
    mode: "portfolio_view",
    customer: {
      targetSegments: expert(["云服务商", "第三方数据中心", "电信运营商", "金融", "政府", "边缘计算"], "Representative portfolio segments only."),
      scenarios: expert(["AI 训练集群", "新建 AI Factory", "超大规模数据中心", "存量改造", "边缘数据中心"], "Portfolio scenario set."),
      buyingLogic: expert(["成熟度", "证据强度", "风险收益", "验证门槛就绪度", "资源配置"], "组合配置逻辑，不是单一赛道销售逻辑。"),
    },
    market: {
      definition: expert("产品组合视角用于比较代表性产品 / 技术对象的资源配置价值。", "不是单一市场规模结论。"),
      trend: expert("产品组合配置必须同时权衡 AI 高密度、供电约束、散热约束、交付就绪度和成熟度。", "组合趋势为定性判断。"),
      tamSamSomOrNoData: noQuantifiedData("No portfolio TAM/SAM/SOM is available."),
      regionalBoundary: sourceRequired("Regional allocation requires source-backed evidence."),
    },
    competition: {
      benchmarkCompetitors: sourceRequired("Portfolio competitor map requires cross-track source evidence."),
      capabilityMap: sourceRequired("Need product range, technology, delivery, service and ecosystem by track."),
      entryBarriers: expert(["成熟度曲线不同", "资源取舍", "证据缺口", "GTM 约束"], "产品组合层面的进入障碍。"),
    },
    selfFit: selfFit(),
    product: {
      family: expert(["模块化 UPS", "液冷", "PDU/RPP/STS", "HVDC", "SST"], "代表性 5+1 范围。"),
      boundary: fact("全部必须进入产品组合视角，不输出单一最优赛道。", "产品组合规则。"),
      components: expert(["成熟度矩阵", "风险收益边界", "证据缺口矩阵", "退出条件"], "产品组合配置工具。"),
      skuOrRange: notApplicable("产品组合视角没有单一 SKU 或功率范围。"),
    },
    specs: {
      certification: sourceRequired("Portfolio certification map must be track-specific."),
      reliability: sourceRequired("Portfolio reliability map must be track-specific."),
    },
    technology: {
      architecturePosition: expert("产品组合覆盖连续供电、热管理、配电、直流架构和前沿变换技术。", "多赛道架构判断。"),
      interfaces: notApplicable("Portfolio has no single interface."),
      validationGates: expert(["比较成熟度", "比较证据缺口", "比较技术门槛", "比较退出条件"], "资源配置门槛。"),
      maturity: expert("分赛道差异化", "产品组合成熟度必须按赛道分别判断。"),
    },
    roadmap: {
      year2026: expert("建立投入、验证、观察、退出四类资源分层，并列出每类对象的证据缺口。", "仅为资源配置里程碑。"),
      year2027: expert("基于客户验证、PDC 证据和技术门槛结果重新分配资源。", "产品组合再平衡里程碑。"),
      year2028: sourceRequired("Scale/resource decisions require governance and evidence."),
      launch: notApplicable("产品组合视角不是单一产品上市。"),
    },
    gtm: {
      targetIndustries: expert(["cloud", "colo", "telco", "government/enterprise edge"], "Representative portfolio segments."),
      lighthouseCustomers: sourceRequired("Named customers require source or user input."),
      salesTools: expert(["portfolio allocation matrix", "maturity map", "evidence gap list"], "Portfolio planning artifacts."),
    },
    pdc: pdc("组合配置", "仅作为资源配置框架，不是单一产品 PDC。"),
    lcm: lcm("分赛道管理", "产品组合 LCM 必须按赛道分别判断，不能套用单一生命周期状态。"),
    evidence: commonEvidence("产品组合视角", ["组合判断不得输出单一最优赛道；完整产品组合分类需在后续独立扩展。"]),
  },
});

export const getProductPlanningCard = (objectId) => PRODUCT_PLANNING_CARDS[objectId] || null;

export function listMissingInputs(card) {
  if (!card) return ["planningCard:source_required"];
  const missing = [];
  const visit = (path, value) => {
    if (!value || typeof value !== "object") return;
    if ("evidenceStatus" in value) {
      if (["source_required", "no_quantified_data", "user_input_required"].includes(value.evidenceStatus) || value.applicability === "not_applicable") {
        missing.push(`${path}:${value.applicability === "not_applicable" ? "not_applicable" : value.evidenceStatus}`);
      }
      return;
    }
    Object.entries(value).forEach(([key, child]) => visit(`${path}.${key}`, child));
  };
  PRODUCT_PLANNING_SECTIONS.forEach((section) => visit(section, card[section]));
  return missing;
}

export function summarizeField(fieldValue) {
  if (!fieldValue || typeof fieldValue !== "object") return "source_required";
  if (Array.isArray(fieldValue.value)) return fieldValue.value.join(" / ");
  if (fieldValue.value === null || fieldValue.value === undefined) return fieldValue.evidenceStatus || fieldValue.applicability || "source_required";
  return String(fieldValue.value);
}
