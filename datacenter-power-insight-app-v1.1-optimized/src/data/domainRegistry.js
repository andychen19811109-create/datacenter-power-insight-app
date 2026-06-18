export const DOMAIN_TAXONOMY = Object.freeze({
  ups: { label: "UPS", domain: "power_continuity" },
  power_utility_ups: { label: "电力专用 UPS", domain: "utility_control_power" },
  power_distribution: { label: "配电", domain: "power_distribution" },
  energy_storage_backup: { label: "储能与备电", domain: "energy_storage_backup" },
  power_conversion: { label: "功率变换", domain: "power_conversion" },
  new_power_architecture: { label: "新型供电架构", domain: "new_power_architecture" },
  cooling_integration: { label: "制冷与集成", domain: "cooling_integration" },
  unknown: { label: "待确认对象", domain: "unknown" },
});

export const CATEGORY_POLICIES = Object.freeze({
  ups: { defaultMethodology: "ups_domain_analysis", allowedAnswerModes: ["entity", "investment", "relationship", "comparison", "impact", "roadmap"] },
  power_utility_ups: { defaultMethodology: "power_utility_ups_analysis", allowedAnswerModes: ["entity", "investment", "relationship", "comparison"] },
  power_distribution: { defaultMethodology: "power_distribution_analysis", allowedAnswerModes: ["entity", "investment", "relationship", "comparison", "impact"] },
  energy_storage_backup: { defaultMethodology: "energy_storage_backup_analysis", allowedAnswerModes: ["entity", "investment", "relationship", "comparison", "impact"] },
  power_conversion: { defaultMethodology: "power_conversion_analysis", allowedAnswerModes: ["entity", "investment", "relationship", "comparison", "impact", "roadmap"] },
  new_power_architecture: { defaultMethodology: "new_power_architecture_analysis", allowedAnswerModes: ["entity", "investment", "relationship", "comparison", "impact", "roadmap"] },
  cooling_integration: { defaultMethodology: "cooling_integration_analysis", allowedAnswerModes: ["entity", "investment", "relationship", "comparison", "impact", "roadmap"] },
  unknown: { defaultMethodology: "clarification_required", allowedAnswerModes: ["clarification"] },
});

export const normalizeAlias = (value) =>
  String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s\-_]+/g, "")
    .replace(/[^\p{L}\p{N}/]+/gu, "");

const COMMON_RELATIONS = ["relationship", "comparison", "substitution", "impact", "roadmap_impact"];
const BLOCK_UPS_FALLBACK = ["ups", "modular_ups", "industrial_ups"];

const entity = ({
  entityId,
  displayName,
  category,
  aliases,
  mustNotRouteTo = [],
  preferredMethodology,
  supportedRelations = COMMON_RELATIONS,
  ambiguityPolicy = "accept_exact_alias",
  relatedEntities = [],
}) => Object.freeze({
  entityId,
  displayName,
  category,
  aliases: Object.freeze(aliases),
  normalizedAliases: Object.freeze([...new Set(aliases.map(normalizeAlias).filter(Boolean))]),
  mustNotRouteTo: Object.freeze(mustNotRouteTo),
  preferredMethodology: preferredMethodology || CATEGORY_POLICIES[category].defaultMethodology,
  supportedRelations: Object.freeze(supportedRelations),
  ambiguityPolicy,
  relatedEntities: Object.freeze(relatedEntities),
});

export const ENTITY_REGISTRY = Object.freeze([
  entity({ entityId: "data_center_ups", displayName: "数据中心 UPS", category: "ups", aliases: ["data center UPS", "data center uninterruptible power supply", "数据中心 UPS", "数据中心UPS", "AI data center UPS", "AIDC UPS"], relatedEntities: ["modular_ups", "monolithic_ups", "ups"] }),
  entity({ entityId: "modular_ups", displayName: "模块化 UPS", category: "ups", aliases: ["modular UPS", "模块化 UPS", "模块化UPS"], relatedEntities: ["data_center_ups", "monolithic_ups", "ups_module"] }),
  entity({ entityId: "monolithic_ups", displayName: "一体式 UPS", category: "ups", aliases: ["monolithic UPS", "一体式 UPS", "一体式UPS", "传统 UPS", "传统UPS"], relatedEntities: ["modular_ups", "data_center_ups"] }),
  entity({ entityId: "industrial_ups", displayName: "工业 UPS", category: "ups", aliases: ["industrial UPS", "工业 UPS", "工业UPS", "工业级 UPS", "工业级UPS"], relatedEntities: ["power_utility_ups", "ups"] }),
  entity({ entityId: "power_utility_ups", displayName: "电力专用 UPS", category: "power_utility_ups", aliases: ["power utility UPS", "utility UPS", "电力专用 UPS", "电力专用UPS", "电力 UPS", "电力UPS", "substation UPS", "变电站 UPS", "变电站UPS", "调度中心 UPS", "调度中心UPS", "power plant UPS", "电厂 UPS", "电厂UPS", "电力通信 UPS", "电力通信UPS", "继保 UPS", "继保UPS"], mustNotRouteTo: ["industrial_ups", "modular_ups"], relatedEntities: ["dc_battery_system", "ups", "industrial_ups"] }),
  entity({ entityId: "ups", displayName: "UPS", category: "ups", aliases: ["UPS", "uninterruptible power supply", "不间断电源"], relatedEntities: ["data_center_ups", "modular_ups", "industrial_ups", "power_utility_ups"] }),

  entity({ entityId: "dc_battery_system", displayName: "直流屏 / DC operation power supply", category: "energy_storage_backup", aliases: ["变电站直流屏", "直流屏", "DC battery system", "DC operation power supply", "substation DC system", "站用直流系统"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["power_utility_ups", "ups_battery"] }),
  entity({ entityId: "bess", displayName: "BESS", category: "energy_storage_backup", aliases: ["BESS", "battery energy storage system", "电池储能系统", "储能系统"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["pcs", "bbu", "ups"] }),
  entity({ entityId: "bbu", displayName: "BBU", category: "energy_storage_backup", aliases: ["BBU", "battery backup unit", "电池备电单元", "备电单元"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["ups", "battery_cabinet"] }),
  entity({ entityId: "battery_cabinet", displayName: "电池柜", category: "energy_storage_backup", aliases: ["battery cabinet", "lithium battery cabinet", "integrated lithium battery cabinet", "电池柜", "锂电柜"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["bbu", "battery_rack", "ups_battery"] }),
  entity({ entityId: "battery_rack", displayName: "电池架", category: "energy_storage_backup", aliases: ["battery rack", "电池架"], mustNotRouteTo: BLOCK_UPS_FALLBACK }),
  entity({ entityId: "ups_battery", displayName: "UPS 电池", category: "energy_storage_backup", aliases: ["UPS battery", "UPS 电池", "UPS电池"], mustNotRouteTo: ["modular_ups", "industrial_ups"], relatedEntities: ["ups", "battery_cabinet"] }),
  entity({ entityId: "sodium_ion_battery", displayName: "钠离子电池", category: "energy_storage_backup", aliases: ["sodium-ion battery", "sodium ion battery", "钠离子电池", "钠电池", "钠电"], mustNotRouteTo: BLOCK_UPS_FALLBACK }),

  entity({ entityId: "sts", displayName: "STS", category: "power_distribution", aliases: ["STS", "STS开关", "static transfer switch", "静态转换开关", "静态切换开关"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["ats", "ups"] }),
  entity({ entityId: "ats", displayName: "ATS", category: "power_distribution", aliases: ["ATS", "ATS开关", "automatic transfer switch", "自动转换开关", "自动切换开关"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["sts"] }),
  entity({ entityId: "pdu", displayName: "PDU", category: "power_distribution", aliases: ["PDU", "PDU配电", "power distribution unit", "电源分配单元"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["rpp", "busway"] }),
  entity({ entityId: "rpp", displayName: "RPP", category: "power_distribution", aliases: ["RPP", "RPP配电", "remote power panel", "远程配电盘", "列头配电柜"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["pdu"] }),
  entity({ entityId: "busway", displayName: "母线槽", category: "power_distribution", aliases: ["busway", "busbar trunking", "母线槽", "智能母线"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["pdu", "switchgear"] }),
  entity({ entityId: "switchgear", displayName: "开关柜", category: "power_distribution", aliases: ["switchgear", "开关柜", "中压开关柜", "配电柜"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["transformer", "busway"] }),
  entity({ entityId: "transformer", displayName: "变压器", category: "power_distribution", aliases: ["transformer", "变压器", "干式变压器"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["switchgear", "solid_state_transformer"] }),

  entity({ entityId: "ups_module", displayName: "UPS module", category: "power_conversion", aliases: ["UPS module", "UPS 模块", "UPS模块"], mustNotRouteTo: ["modular_ups"], relatedEntities: ["power_module", "modular_ups"] }),
  entity({ entityId: "power_module", displayName: "power module", category: "power_conversion", aliases: ["power module", "功率模块", "电源模块"], mustNotRouteTo: ["ups", "ups_module", "modular_ups"], relatedEntities: ["ups_module", "sic_module", "gan_device"] }),
  entity({ entityId: "pcs", displayName: "PCS", category: "power_conversion", aliases: ["PCS", "PCS变流器", "power conversion system", "储能变流器"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["bess", "inverter", "converter"] }),
  entity({ entityId: "rectifier", displayName: "整流器", category: "power_conversion", aliases: ["rectifier", "整流器", "整流模块"], mustNotRouteTo: BLOCK_UPS_FALLBACK }),
  entity({ entityId: "inverter", displayName: "逆变器", category: "power_conversion", aliases: ["inverter", "逆变器", "逆变模块"], mustNotRouteTo: BLOCK_UPS_FALLBACK }),
  entity({ entityId: "converter", displayName: "变换器", category: "power_conversion", aliases: ["converter", "变换器", "转换器", "AC/DC", "DC/DC", "DC/AC"], mustNotRouteTo: BLOCK_UPS_FALLBACK }),
  entity({ entityId: "sic_module", displayName: "SiC module", category: "power_conversion", aliases: ["SiC module", "SiC模块", "SiC 功率模块", "碳化硅模块"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["power_module", "ups"] }),
  entity({ entityId: "gan_device", displayName: "GaN device", category: "power_conversion", aliases: ["GaN device", "GaN器件", "GaN 器件", "氮化镓器件"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["power_module"] }),
  entity({ entityId: "dab", displayName: "DAB", category: "power_conversion", aliases: ["DAB", "dual active bridge", "双有源桥"], mustNotRouteTo: BLOCK_UPS_FALLBACK }),

  entity({ entityId: "solid_state_transformer", displayName: "SST / PET", category: "new_power_architecture", aliases: ["SST", "PET", "solid-state transformer", "solid state transformer", "固态变压器", "power electronic transformer", "电力电子变压器"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["transformer", "800vdc", "mvdc", "ups"], ambiguityPolicy: "clarify_when_corrected" }),
  entity({ entityId: "medium_voltage_data_center_power", displayName: "中压数据中心供电", category: "new_power_architecture", aliases: ["medium-voltage data center power", "medium voltage data center power", "中压数据中心供电", "中压直供"], mustNotRouteTo: BLOCK_UPS_FALLBACK }),
  entity({ entityId: "hvdc", displayName: "HVDC", category: "new_power_architecture", aliases: ["HVDC", "高压直流", "240VDC", "336VDC"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["ups", "800vdc"] }),
  entity({ entityId: "mvdc", displayName: "MVDC", category: "new_power_architecture", aliases: ["MVDC", "中压直流"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["800vdc", "solid_state_transformer"] }),
  entity({ entityId: "800vdc", displayName: "800VDC", category: "new_power_architecture", aliases: ["800VDC", "800 VDC", "800V 直流"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["mvdc", "solid_state_transformer"] }),
  entity({ entityId: "48vdc", displayName: "48VDC", category: "new_power_architecture", aliases: ["48VDC", "48 VDC", "48V 直流"], mustNotRouteTo: BLOCK_UPS_FALLBACK }),

  entity({ entityId: "integrated_power_module", displayName: "一体化电力模块", category: "cooling_integration", aliases: ["integrated power module", "一体化电力模块", "预制电力模块", "电力模块"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["micro_module_data_center", "ups", "cdu"] }),
  entity({ entityId: "micro_module_data_center", displayName: "微模块数据中心", category: "cooling_integration", aliases: ["micro-module data center", "micro module data center", "微模块数据中心", "微模块"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["integrated_power_module", "modular_ups"] }),
  entity({ entityId: "precision_cooling", displayName: "精密制冷", category: "cooling_integration", aliases: ["precision cooling", "精密制冷", "精密空调"], mustNotRouteTo: BLOCK_UPS_FALLBACK }),
  entity({ entityId: "immersion_cooling", displayName: "浸没式液冷", category: "cooling_integration", aliases: ["immersion cooling", "浸没式液冷", "浸没式冷却"], mustNotRouteTo: BLOCK_UPS_FALLBACK }),
  entity({ entityId: "liquid_cooling", displayName: "液冷", category: "cooling_integration", aliases: ["liquid cooling", "液冷", "冷板液冷"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["cdu", "ups"] }),
  entity({ entityId: "cdu", displayName: "CDU", category: "cooling_integration", aliases: ["CDU", "coolant distribution unit", "冷却液分配单元"], mustNotRouteTo: BLOCK_UPS_FALLBACK, relatedEntities: ["liquid_cooling", "ups"] }),

  entity({ entityId: "unknown", displayName: "待确认对象", category: "unknown", aliases: [], mustNotRouteTo: BLOCK_UPS_FALLBACK, preferredMethodology: "clarification_required", supportedRelations: [], ambiguityPolicy: "always_clarify" }),
]);

export const ENTITY_BY_ID = Object.freeze(Object.fromEntries(ENTITY_REGISTRY.map((item) => [item.entityId, item])));

export const ENTITY_SYNONYMS = Object.freeze(
  Object.fromEntries(ENTITY_REGISTRY.flatMap((item) => item.normalizedAliases.map((alias) => [alias, item.entityId])))
);

export const NEGATIVE_ROUTING_RULES = Object.freeze(
  Object.fromEntries(ENTITY_REGISTRY.map((item) => [item.entityId, item.mustNotRouteTo]))
);
