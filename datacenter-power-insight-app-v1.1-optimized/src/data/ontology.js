const normalize = (value = "") => String(value || "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[\s\-_]+/g, "")
  .replace(/[^\p{L}\p{N}/]+/gu, "");

const makeEntry = ({
  id,
  label,
  aliases = [],
  legacyAliases = [],
  layer,
  description,
  parentId = null,
  tags = [],
  adjacentReferences = [],
  boundary = "",
  relationNotes = [],
}) => Object.freeze({
  id,
  label,
  aliases: Object.freeze([label, ...aliases, ...legacyAliases]),
  legacyAliases: Object.freeze(legacyAliases),
  normalizedAliases: Object.freeze([...new Set([label, ...aliases, ...legacyAliases].map(normalize).filter(Boolean))]),
  normalizedLegacyAliases: Object.freeze([...new Set(legacyAliases.map(normalize).filter(Boolean))]),
  layer,
  description,
  parentId,
  tags: Object.freeze(tags),
  adjacentReferences: Object.freeze(adjacentReferences),
  boundary,
  relationNotes: Object.freeze(relationNotes),
});

export const BUSINESS_TRACKS = Object.freeze([
  makeEntry({ id: "tower_ups", label: "塔式 UPS", aliases: ["塔式UPS", "传统 UPS", "传统UPS", "单机 UPS", "数据中心 UPS"], legacyAliases: ["UPS", "不间断电源"], layer: "primary_business_track", description: "以单机、塔式或传统形态交付的 UPS 产品赛道。", adjacentReferences: ["modular_ups", "pdu_rpp_sts", "bbu"], boundary: "塔式 UPS 是 UPS 产品族中的一级产品赛道；工业 UPS 和电力 UPS 是其应用/客户细分，不作为一级业务赛道。" }),
  makeEntry({ id: "modular_ups", label: "模块化 UPS", aliases: ["模块化UPS", "modular UPS"], layer: "primary_business_track", description: "以功率模块并联、热插拔和弹性扩容为核心的 UPS 产品。", parentId: "ups_family", adjacentReferences: ["tower_ups", "micro_module", "integrated_power_module"], boundary: "模块化 UPS 是独立一级业务赛道，不等同于微模块系统方案。" }),
  makeEntry({ id: "hvdc", label: "HVDC", aliases: ["高压直流", "240VDC", "336VDC"], layer: "primary_business_track", description: "数据中心 HVDC 供配电产品/方案赛道。", adjacentReferences: ["tower_ups", "800v_hvdc_architecture", "bbu"], boundary: "HVDC 可作为产品/方案赛道；800VDC 是电压等级/架构变体，不作为一级业务赛道。" }),
  makeEntry({ id: "sst", label: "SST", aliases: ["PET", "solid-state transformer", "solid state transformer", "固态变压器", "电力电子变压器"], layer: "primary_business_track", description: "固态/电力电子变压器方向，可能成为未来中压到直流链路的变换节点。", adjacentReferences: ["800v_hvdc_architecture", "800v_sst_architecture", "hvdc", "transformer"], boundary: "SST 可作为前瞻方案赛道，但 800V SST 是架构变体，SST 不等同于 HVDC。" }),
  makeEntry({ id: "bbu", label: "BBU", aliases: ["battery backup unit", "电池备电单元", "备电单元"], layer: "primary_business_track", description: "靠近负载或机柜侧的短时高倍率备电资产。", adjacentReferences: ["tower_ups", "energy_storage", "integrated_power_module"], boundary: "BBU 与 UPS、电池柜、储能系统相关，但职责、位置、倍率和控制接口不同。" }),
  makeEntry({ id: "server_power", label: "服务器电源", aliases: ["服务器电源", "AI PSU", "PSU", "server PSU", "server power supply"], layer: "primary_business_track", description: "面向服务器和 GPU 节点的高功率密度电源。", adjacentReferences: ["800vdc_architecture", "gan", "sic", "rack_power_architecture"], boundary: "服务器电源是设备级产品，GaN/SiC 是其可能采用的器件技术。" }),
  makeEntry({ id: "precision_cooling", label: "精密空调", aliases: ["precision cooling", "精密制冷", "精密空调系统"], layer: "primary_business_track", description: "面向数据中心机房的精密温控产品赛道。", adjacentReferences: ["liquid_cooling_cdu", "micro_module"], boundary: "精密空调与液冷 CDU 都属于热管理方向，但精密空调偏传统/风冷温控，液冷 CDU 偏液路分配和控制，不得混为同一对象。" }),
  makeEntry({ id: "liquid_cooling_cdu", label: "液冷 CDU", aliases: ["CDU", "液冷 CDU", "coolant distribution unit", "冷却液分配单元"], layer: "primary_business_track", description: "液冷系统中的冷却液分配和控制设备。", adjacentReferences: ["precision_cooling", "micro_module", "integrated_power_module"], boundary: "液冷 CDU 是热管理设备，不是供电架构或 UPS 产品。" }),
  makeEntry({ id: "micro_module", label: "微模块", aliases: ["微模块数据中心", "micro module"], layer: "primary_business_track", description: "机柜、配电、制冷、监控等集成的微模块系统。", adjacentReferences: ["modular_ups", "precision_cooling", "liquid_cooling_cdu", "integrated_power_module"], boundary: "微模块是系统方案，模块化 UPS 是其中可能采用的供电子系统。" }),
  makeEntry({ id: "integrated_power_module", label: "一体化电力模块", aliases: ["预制电力模块", "电力模块", "integrated power module"], layer: "primary_business_track", description: "预制化、一体化的数据中心供配电模块。", adjacentReferences: ["micro_module", "tower_ups", "bbu"], boundary: "一体化电力模块是工程集成方案，不等于单一 UPS 或 PDU。" }),
  makeEntry({ id: "pdu_rpp_sts", label: "PDU/RPP/STS", aliases: ["PDU", "RPP", "STS", "静态转换开关", "列头柜", "电源分配单元"], layer: "primary_business_track", description: "数据中心从列头到负载侧的配电、远程配电和静态切换设备组合。", adjacentReferences: ["tower_ups", "busway", "switchgear"], boundary: "PDU/RPP/STS 是配电和切换层，不承担 UPS 的储能和不间断供电职责。" }),
]);

export const PRODUCT_CATEGORIES = Object.freeze([
  makeEntry({ id: "ups_family", label: "UPS 产品族", aliases: ["UPS", "不间断电源"], layer: "product_category", description: "包含塔式 UPS、模块化 UPS 及其应用细分的产品族。" }),
  makeEntry({ id: "power_continuity", label: "关键电源连续性", layer: "product_category", description: "塔式 UPS、模块化 UPS 等保障关键负载连续供电的产品。" }),
  makeEntry({ id: "power_distribution", label: "数据中心配电与切换", layer: "product_category", description: "PDU、RPP、STS、母线、中低压配电等产品。" }),
  makeEntry({ id: "backup_energy", label: "备电与储能", layer: "product_category", description: "BBU、电池柜、储能及直流操作电源。" }),
  makeEntry({ id: "server_power_chain", label: "服务器电源链", layer: "product_category", description: "服务器 PSU、机柜级电源和相关功率器件。" }),
  makeEntry({ id: "thermal_integration", label: "热管理与集成", layer: "product_category", description: "液冷 CDU、微模块和一体化电力模块。" }),
  makeEntry({ id: "new_power_architecture", label: "新型供电架构", layer: "product_category", description: "HVDC、800VDC、SST 和中压直流相关架构。" }),
]);

export const APPLICATION_SEGMENTS = Object.freeze([
  makeEntry({ id: "industrial_ups", label: "工业 UPS", aliases: ["工业UPS", "industrial UPS"], layer: "application_segment", description: "塔式 UPS 下的工业应用细分，面向石化、轨交、制造、矿山等工业负载。", parentId: "tower_ups", adjacentReferences: ["tower_ups"], boundary: "工业 UPS 是塔式 UPS 的应用/客户细分，不作为一级业务赛道。" }),
  makeEntry({ id: "power_utility_ups", label: "电力 UPS", aliases: ["电力UPS", "电力专用 UPS", "电力专用UPS", "变电站 UPS", "电厂 UPS"], layer: "application_segment", description: "塔式 UPS 下的电力应用细分，面向电厂、变电站、调度、继保和电力通信负载。", parentId: "tower_ups", adjacentReferences: ["tower_ups", "bbu"], boundary: "电力 UPS 是塔式 UPS 的应用/客户细分，不作为一级业务赛道。" }),
  makeEntry({ id: "rail_transit_ups", label: "轨交 UPS", aliases: ["轨交UPS", "轨道交通 UPS"], layer: "application_segment", description: "塔式 UPS 下的轨道交通应用细分。", parentId: "tower_ups", adjacentReferences: ["tower_ups"] }),
  makeEntry({ id: "commercial_edge_ups", label: "通用商用 / 边缘场景 UPS", aliases: ["商用 UPS", "边缘 UPS", "通用商用 UPS"], layer: "application_segment", description: "塔式 UPS 下的通用商用和边缘应用细分。", parentId: "tower_ups", adjacentReferences: ["tower_ups", "micro_module"] }),
  makeEntry({ id: "data_center_modular_ups", label: "数据中心模块化 UPS", aliases: ["数据中心模块化UPS"], layer: "application_segment", description: "模块化 UPS 下的数据中心应用细分。", parentId: "modular_ups", adjacentReferences: ["modular_ups"] }),
  makeEntry({ id: "ai_data_center_modular_ups", label: "AI 数据中心模块化 UPS", aliases: ["AI数据中心模块化UPS"], layer: "application_segment", description: "模块化 UPS 下的 AI 数据中心应用细分。", parentId: "modular_ups", adjacentReferences: ["modular_ups", "800vdc_architecture"] }),
  makeEntry({ id: "high_power_modular_ups", label: "高功率模块化 UPS", aliases: ["高功率模块化UPS"], layer: "application_segment", description: "模块化 UPS 下的高功率应用细分。", parentId: "modular_ups", adjacentReferences: ["modular_ups"] }),
]);

export const TECHNOLOGY_TAGS = Object.freeze([
  makeEntry({ id: "gan", label: "GaN", aliases: ["氮化镓", "GaN/SiC"], layer: "technology_tag", description: "宽禁带功率器件技术标签，不能作为一级业务赛道。", adjacentReferences: ["server_power", "800vdc"] }),
  makeEntry({ id: "sic", label: "SiC", aliases: ["碳化硅", "GaN/SiC"], layer: "technology_tag", description: "宽禁带功率器件技术标签，不能作为一级业务赛道。", adjacentReferences: ["server_power", "sst", "800vdc"] }),
  makeEntry({ id: "lithium_battery", label: "锂电", layer: "technology_tag", description: "BBU、储能和 UPS 电池相关技术标签。" }),
  makeEntry({ id: "sodium_battery", label: "钠电", layer: "technology_tag", description: "备电与储能候选电池技术标签。" }),
  makeEntry({ id: "high_frequency", label: "高频化", layer: "technology_tag", description: "功率变换高频化方向。" }),
  makeEntry({ id: "modularization", label: "模块化", layer: "technology_tag", description: "模块化设计和交付方式。" }),
  makeEntry({ id: "parallel_redundancy", label: "并机冗余", layer: "technology_tag", description: "UPS 与关键电源可靠性设计标签。" }),
  makeEntry({ id: "liquid_cooling", label: "液冷", layer: "technology_tag", description: "热管理技术标签；作为业务对象时应使用液冷 CDU。" }),
  makeEntry({ id: "high_voltage_dc", label: "高压直流", layer: "technology_tag", description: "HVDC/800VDC 相关电压平台标签。" }),
  makeEntry({ id: "ai_high_density", label: "AI 高密", layer: "technology_tag", description: "AI 高功率密度应用标签。" }),
]);

export const DEVICE_COMPONENTS = Object.freeze([
  makeEntry({ id: "gan_device", label: "GaN 器件", aliases: ["GaN device"], layer: "component_technology", description: "服务器电源和高频电源中的器件技术。" }),
  makeEntry({ id: "sic_module", label: "SiC 模块", aliases: ["SiC module"], layer: "component_technology", description: "SST、800VDC 和高功率变换中的器件/模块技术。" }),
  makeEntry({ id: "battery_cell", label: "电芯", layer: "component_technology", description: "BBU、储能和 UPS 电池的基础部件。" }),
  makeEntry({ id: "connector_busbar", label: "连接器/母排", layer: "component_technology", description: "800VDC、机柜级供电和预制化模块的关键部件。" }),
  makeEntry({ id: "power_module", label: "功率模块", layer: "component_technology", description: "UPS、服务器电源和变换器中的功率变换模块。" }),
]);

export const ARCHITECTURE_ROUTES = Object.freeze([
  makeEntry({ id: "traditional_ac_ups", label: "传统 AC UPS 架构", layer: "architecture_route", description: "以交流 UPS 和传统配电为核心的成熟架构。", adjacentReferences: ["tower_ups", "modular_ups"] }),
  makeEntry({ id: "hvdc_architecture", label: "HVDC 架构", layer: "architecture_route", description: "240/336V 等高压直流供配电架构。", adjacentReferences: ["hvdc", "tower_ups", "bbu"] }),
  makeEntry({ id: "800v_hvdc_architecture", label: "800V HVDC 架构", aliases: ["800VDC", "800 VDC", "800V 直流", "800VDC 架构"], layer: "architecture_route", description: "800V 电压等级下的 HVDC 架构变体。", adjacentReferences: ["hvdc", "server_power", "sst"] }),
  makeEntry({ id: "sst_architecture", label: "SST 架构", layer: "architecture_route", description: "以固态变压器/电力电子变换为关键节点的架构路线。", adjacentReferences: ["sst", "800vdc", "hvdc"] }),
  makeEntry({ id: "800v_sst_architecture", label: "800V SST 架构", aliases: ["800V SST", "800VSST"], layer: "architecture_route", description: "800V 电压等级与 SST 变换节点结合的架构变体。", adjacentReferences: ["sst", "800v_hvdc_architecture", "server_power"] }),
  makeEntry({ id: "bbu_distributed_backup", label: "BBU 分布式备电架构", layer: "architecture_route", description: "靠近负载侧的分布式短时备电架构。", adjacentReferences: ["bbu", "tower_ups", "energy_storage"] }),
  makeEntry({ id: "rack_power_architecture", label: "机柜级电源架构", layer: "architecture_route", description: "从机柜到服务器节点的电源链路架构。", adjacentReferences: ["server_power", "800v_hvdc_architecture", "gan", "sic"] }),
]);

export const CUSTOMER_SCENARIOS = Object.freeze([
  makeEntry({ id: "ai_training", label: "AI 训练集群", layer: "customer_scenario", description: "高功率密度训练集群。" }),
  makeEntry({ id: "ai_factory", label: "新建 AI Factory", layer: "customer_scenario", description: "新建高密 AI 数据中心。" }),
  makeEntry({ id: "hyperscale", label: "超大规模数据中心", layer: "customer_scenario", description: "云服务商和大型托管数据中心。" }),
  makeEntry({ id: "retrofit", label: "存量改造", layer: "customer_scenario", description: "传统机房改造和容量升级。" }),
  makeEntry({ id: "edge", label: "边缘数据中心", layer: "customer_scenario", description: "分散边缘节点。" }),
]);

export const REGIONS = Object.freeze([
  makeEntry({ id: "global", label: "全球", layer: "region", description: "全球口径。" }),
  makeEntry({ id: "china", label: "中国", layer: "region", description: "中国市场。" }),
  makeEntry({ id: "north_america", label: "北美", layer: "region", description: "北美市场。" }),
  makeEntry({ id: "europe", label: "欧洲", layer: "region", description: "欧洲市场。" }),
  makeEntry({ id: "asia_pacific", label: "亚太", layer: "region", description: "亚太市场。" }),
]);

export const TIME_HORIZONS = Object.freeze([
  makeEntry({ id: "2026", label: "2026", layer: "time_horizon", description: "近期产品化和客户验证窗口。" }),
  makeEntry({ id: "2027", label: "2027", layer: "time_horizon", description: "中期路线图和生态形成窗口。" }),
  makeEntry({ id: "2028", label: "2028", layer: "time_horizon", description: "V1.5 新增的中长期验证与放量观察窗口。" }),
  makeEntry({ id: "2030", label: "2030", layer: "time_horizon", description: "长期架构迁移和规模化窗口。" }),
]);

export const ONTOLOGY_RULES = Object.freeze({
  sourceOfTruth: "Ontology separates business tracks, product categories, technology tags, component technologies, architecture routes, scenarios, regions, and time horizons.",
  primaryBusinessTrackRule: "Primary business tracks must be product or solution tracks. Industrial UPS and power utility UPS are application segments under 塔式 UPS; 800VDC is an architecture route; GaN/SiC must be classified as technology_tag or component_technology.",
  boundaries: Object.freeze({
    upsFamily: "UPS, 模块化 UPS, 工业 UPS and 电力 UPS share continuity-power roots but differ by product form, scenario, load object, certification and service model.",
    hvdc800vdcSst: "HVDC and 800VDC are power architecture routes; SST is a solid-state transformer / power-electronics transformation node that may support future architectures.",
    bbuStorageUps: "BBU and storage provide backup/energy functions; UPS provides uninterrupted power with bypass, switching and availability responsibilities.",
    coolingIntegration: "液冷 CDU is thermal equipment; 微模块 and 一体化电力模块 are integrated system or engineering solutions.",
    distributionVsUps: "PDU/RPP/STS are distribution and transfer layers; UPS is continuity power with energy support.",
    serverPowerGanSic: "服务器电源 is a product track; GaN and SiC are enabling technology tags or device technologies.",
  }),
  matchStates: Object.freeze(["strong_match", "adjacent_reference", "unsupported_scope", "insufficient_evidence", "not_applicable"]),
});

const ALL_ENTITIES = Object.freeze([
  ...BUSINESS_TRACKS,
  ...PRODUCT_CATEGORIES,
  ...APPLICATION_SEGMENTS,
  ...TECHNOLOGY_TAGS,
  ...DEVICE_COMPONENTS,
  ...ARCHITECTURE_ROUTES,
  ...CUSTOMER_SCENARIOS,
  ...REGIONS,
  ...TIME_HORIZONS,
]);

const byId = new Map(ALL_ENTITIES.map((item) => [item.id, item]));
const aliasIndex = new Map();
ALL_ENTITIES.forEach((item) => {
  item.normalizedAliases.forEach((alias) => {
    if (!aliasIndex.has(alias)) aliasIndex.set(alias, item);
  });
});

export function normalizeTrackInput(input) {
  const normalized = normalize(input);
  if (!normalized || normalized === normalize("全部")) return { id: "all", label: "全部", normalizedInput: normalized };
  const direct = byId.get(String(input || "")) || aliasIndex.get(normalized);
  if (direct) {
    const legacyAlias = direct.normalizedLegacyAliases?.includes(normalized) ? String(input) : null;
    return {
      id: direct.id,
      label: direct.label,
      normalizedInput: normalized,
      entityType: direct.layer,
      legacyAlias,
      migrationNote: legacyAlias ? `${legacyAlias} 是 legacy alias，V1.5 归一到 ${direct.label}。` : null,
    };
  }
  return { id: "unknown", label: String(input || "未知对象"), normalizedInput: normalized };
}

export function classifyEntity(input) {
  const normalized = normalize(input);
  if (!normalized || normalized === normalize("全部")) {
    return {
      id: "all",
      label: "全部",
      entityType: "all",
      isPrimaryBusinessTrack: false,
      isTechnologyTag: false,
      isArchitectureRoute: false,
      legacyAlias: null,
      migrationNote: null,
      parentBusinessTrack: null,
      entry: null,
    };
  }

  const entry = byId.get(String(input || "")) || aliasIndex.get(normalized);
  if (!entry) {
    return {
      id: "unknown",
      label: String(input || "未知对象"),
      entityType: "unknown",
      isPrimaryBusinessTrack: false,
      isTechnologyTag: false,
      isArchitectureRoute: false,
      legacyAlias: null,
      migrationNote: null,
      parentBusinessTrack: null,
      entry: null,
    };
  }
  const legacyAlias = entry.normalizedLegacyAliases?.includes(normalized) ? String(input) : null;
  const parent = entry.parentId ? byId.get(entry.parentId) || null : null;

  return {
    id: entry.id,
    label: entry.label,
    entityType: entry.layer,
    isPrimaryBusinessTrack: entry.layer === "primary_business_track",
    isTechnologyTag: entry.layer === "technology_tag",
    isArchitectureRoute: entry.layer === "architecture_route",
    legacyAlias,
    migrationNote: legacyAlias ? `${legacyAlias} 是 legacy alias，V1.5 归一到 ${entry.label}。` : null,
    parentBusinessTrack: parent?.layer === "primary_business_track" ? { id: parent.id, label: parent.label } : null,
    entry,
  };
}

export function isPrimaryBusinessTrack(input) {
  return classifyEntity(input).isPrimaryBusinessTrack;
}

export function getAdjacentReferences(trackId) {
  const classified = classifyEntity(trackId);
  const references = classified.entry?.adjacentReferences || [];
  return references.map((id) => byId.get(id) || aliasIndex.get(normalize(id)) || { id, label: id });
}

export function getOntologyEntry(id) {
  return byId.get(id) || null;
}

export const ONTOLOGY_INDEX = Object.freeze({
  allEntities: ALL_ENTITIES,
  businessTrackIds: Object.freeze(BUSINESS_TRACKS.map((item) => item.id)),
  applicationSegmentIds: Object.freeze(APPLICATION_SEGMENTS.map((item) => item.id)),
  technologyTagIds: Object.freeze(TECHNOLOGY_TAGS.map((item) => item.id)),
  architectureRouteIds: Object.freeze(ARCHITECTURE_ROUTES.map((item) => item.id)),
});
