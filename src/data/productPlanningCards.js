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
  facts: fact([`${label} is included in the Clean R1 representative 5+1 slice.`], "Clean R1 fact scope is limited to local taxonomy and seed cards.", ["taxonomyRegistry"]),
  expertJudgment: expert(extra, "Expert judgment is allowed only as labeled planning judgment, not as market-size fact."),
  noQuantifiedData: noQuantifiedData("Local Clean R1 contains no TAM/SAM/SOM/CAGR/ROI/revenue/budget values."),
  sourceRequired: sourceRequired("Named customers, launch dates, certifications, technical parameters, and internal capability require source or user input."),
  caveats: expert([
    "Clean R1 is a local planning runtime, not Preview acceptance or production release.",
    "5+1 is representative validation scope; Full Portfolio Taxonomy is deferred to R3.",
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
  doNotInventInternalFacts: fact(true, "Do not infer internal capability from public or seed data.", ["Clean R1 policy"]),
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
      tamSamSomOrNoData: noQuantifiedData("TAM/SAM/SOM are not available in Clean R1."),
      regionalBoundary: sourceRequired("Regional adoption and standards require source-backed validation."),
    },
    competition: {
      benchmarkCompetitors: sourceRequired("Competitor capability map requires sourced product/deployment evidence."),
      capabilityMap: sourceRequired("Need product range, technology, delivery, service, ecosystem evidence by vendor."),
      entryBarriers: expert(["液路可靠性", "快接头可靠性", "系统控制联动", "现场 O&M", "责任边界"], "Qualitative barrier map."),
    },
    selfFit: selfFit(),
    product: {
      family: expert("Liquid Cooling system family", "System family spans equipment, loop, controls, and O&M."),
      boundary: fact("液冷不是泛化热管理；Clean R1 must distinguish CDU / cold plate / manifold / secondary loop and O&M boundary.", "Prevents generic thermal-management output."),
      components: expert(["CDU", "cold plate", "manifold", "secondary loop", "quick connector", "leakage prevention", "control linkage", "O&M boundary"], "Required Clean R1 liquid cooling boundary."),
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
      architecturePosition: expert("Thermal management layer between server cold plates/rack manifolds and facility heat rejection loop.", "Architecture position is qualitative."),
      interfaces: expert(["facility water loop", "CDU", "rack manifold", "server cold plate", "monitoring/control system"], "Interface list requires sourced design before parameterization."),
      validationGates: expert(["快接头可靠性", "防漏液", "压力控制", "供液温度", "控制联动", "维护可达性", "可靠性测试"], "Validation gates are required before scale."),
      maturity: expert("medium_high", "Maturity is a planning classification."),
    },
    roadmap: {
      year2026: expert("MVP: lock component boundary, quick connector/leakage/control/O&M gates, and source-required spec list.", "No launch commitment."),
      year2027: expert("Pilot: customer/project validation only after source-backed scenario, reliability and O&M evidence.", "Pilot requires evidence."),
      year2028: expert("Scale decision: only if validation data, service model, standardization and PDC evidence pass.", "Scale is conditional, not launch date."),
      launch: sourceRequired("Launch date must not be invented."),
    },
    gtm: {
      targetIndustries: expert(["cloud", "colo"], "Representative segments; no named customer claim."),
      lighthouseCustomers: sourceRequired("Named customers require source or user input."),
      salesTools: expert(["component boundary map", "validation gate checklist", "evidence gap list"], "Sales tools are planning artifacts."),
    },
    pdc: pdc("P1 candidate", "High-density thermal pressure makes this a candidate for customer POC once evidence gates are passed."),
    lcm: lcm("mvp", "No replacement or migration plan until installed-base, service and portfolio data are provided."),
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
      definition: expert("SST is a frontier solid-state / power-electronic transformer direction, not HVDC and not a near-term revenue product.", "Boundary prevents HVDC conflation."),
      trend: expert("Interest comes from future medium-voltage conversion and space/power-chain simplification, but commercialization is uncertain.", "Trend is qualitative."),
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
      family: expert("SST / PET research platform", "Research platform, not commercial SKU family."),
      boundary: fact("SST must be framed as research / prototype / validation / watch / exit, and must stay separate from HVDC.", "Prevents short-term commercialization framing."),
      components: expert(["power-electronic transformer topology", "medium-voltage interface", "protection and bypass", "wide-bandgap reliability"], "Concept validation scope."),
      skuOrRange: sourceRequired("Voltage, power range, efficiency and topology parameters require sourced prototype data."),
    },
    specs: {
      efficiency: sourceRequired("Efficiency requires sourced prototype/test data."),
      powerDensity: sourceRequired("Power density requires sourced prototype/test data."),
      certification: sourceRequired("Certification status must not be invented."),
      reliability: sourceRequired("Reliability metrics require sourced test data."),
    },
    technology: {
      architecturePosition: expert("Potential future conversion node between medium-voltage input and downstream DC/AC distribution; distinct from HVDC distribution architecture.", "Architecture position is qualitative."),
      interfaces: sourceRequired("Upstream/downstream interface definitions require architecture source."),
      validationGates: expert(["高压拓扑验证", "保护与旁路", "故障隔离", "宽禁带器件可靠性", "标准成熟度", "样机验证"], "Validation-first framing."),
      maturity: expert("low", "SST remains low maturity in Clean R1."),
    },
    roadmap: {
      year2026: expert("Research/watch: define topology hypotheses, standards gaps, protection/bypass questions and exit criteria.", "No launch commitment."),
      year2027: expert("Prototype validation only if lab evidence and partner architecture requirements exist.", "No revenue commitment."),
      year2028: expert("Pilot decision gate only after prototype reliability, standards path and customer co-validation; otherwise remain watch/exit.", "No launch commitment."),
      launch: sourceRequired("Launch timing must not be invented."),
    },
    gtm: {
      targetIndustries: sourceRequired("Target customers require source-backed market validation."),
      lighthouseCustomers: sourceRequired("Named customers require source or user input."),
      salesTools: expert(["technology boundary note", "maturity risk checklist", "exit criteria"], "Research-stage artifacts."),
    },
    pdc: pdc("watch", "Research watch item; not a near-term commercial PDC candidate."),
    lcm: lcm("concept", "No replacement or migration strategy before technology and market validation."),
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
      year2026: expert("MVP: define product family, service boundary and certification checklist.", "No launch commitment."),
      year2027: expert("Pilot: customer and certification evidence required.", "Pilot requires evidence."),
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
      year2026: expert("MVP: separate PDU/RPP/STS scope and interface gates.", "No launch commitment."),
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
      boundary: fact("HVDC is not SST; 800VDC is an adjacent voltage/architecture variant, not the same Clean R1 object.", "Prevents HVDC/SST conflation."),
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
      year2026: expert("MVP: validate commercial boundary, protection architecture and interface constraints.", "No launch commitment."),
      year2027: expert("Pilot: requires customer/project evidence.", "Pilot requires evidence."),
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
      buyingLogic: expert(["maturity", "evidence strength", "risk-return", "validation gate readiness", "resource allocation"], "Allocation logic, not one-track selling."),
    },
    market: {
      definition: expert("Portfolio View compares representative product/technology cards as allocation candidates.", "Not a single market-size claim."),
      trend: expert("Portfolio allocation must balance AI density, grid constraints, thermal constraints, delivery readiness and maturity.", "Qualitative portfolio trend."),
      tamSamSomOrNoData: noQuantifiedData("No portfolio TAM/SAM/SOM is available."),
      regionalBoundary: sourceRequired("Regional allocation requires source-backed evidence."),
    },
    competition: {
      benchmarkCompetitors: sourceRequired("Portfolio competitor map requires cross-track source evidence."),
      capabilityMap: sourceRequired("Need product range, technology, delivery, service and ecosystem by track."),
      entryBarriers: expert(["different maturity curves", "resource tradeoff", "evidence gaps", "GTM constraints"], "Portfolio barriers."),
    },
    selfFit: selfFit(),
    product: {
      family: expert(["模块化 UPS", "液冷", "PDU/RPP/STS", "HVDC", "SST"], "Clean R1 representative 5+1 only."),
      boundary: fact("全部 must be Portfolio View; it cannot output one winning track.", "Portfolio rule."),
      components: expert(["maturity matrix", "risk-return boundary", "evidence gap matrix", "exit conditions"], "Portfolio allocation tools."),
      skuOrRange: notApplicable("Portfolio View has no single SKU or range."),
    },
    specs: {
      certification: sourceRequired("Portfolio certification map must be track-specific."),
      reliability: sourceRequired("Portfolio reliability map must be track-specific."),
    },
    technology: {
      architecturePosition: expert("Portfolio spans continuity power, thermal management, distribution, DC architecture and frontier conversion.", "Multi-track architecture."),
      interfaces: notApplicable("Portfolio has no single interface."),
      validationGates: expert(["compare maturity", "compare evidence gaps", "compare technical gates", "compare exit criteria"], "Allocation gates."),
      maturity: expert("mixed", "Portfolio maturity is mixed by track."),
    },
    roadmap: {
      year2026: expert("Allocation baseline: separate invest / validate / watch lanes and evidence gaps.", "Allocation milestone only."),
      year2027: expert("Rebalance after customer validation, PDC evidence and technical gates.", "Portfolio rebalance milestone."),
      year2028: sourceRequired("Scale/resource decisions require governance and evidence."),
      launch: notApplicable("Portfolio View does not launch as one product."),
    },
    gtm: {
      targetIndustries: expert(["cloud", "colo", "telco", "government/enterprise edge"], "Representative portfolio segments."),
      lighthouseCustomers: sourceRequired("Named customers require source or user input."),
      salesTools: expert(["portfolio allocation matrix", "maturity map", "evidence gap list"], "Portfolio planning artifacts."),
    },
    pdc: pdc("portfolio", "Allocation frame only; not one product PDC."),
    lcm: lcm("mixed", "Portfolio LCM is per-track and cannot use one lifecycle state."),
    evidence: commonEvidence("Portfolio View", ["Portfolio must not pick a single winner and Full Portfolio Taxonomy expansion is deferred to R3."]),
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
