export const TAXONOMY_SCOPE = Object.freeze({
  phase: "V1.5 Phase 2.1 Clean R1",
  coverage: "representative_5_plus_1",
  fullPortfolioStatus: "deferred_to_R3",
});

export const TAXONOMY_OBJECTS = Object.freeze({
  modular_ups: {
    id: "modular_ups",
    label: "模块化 UPS",
    family: "UPS and Key Power Product Family",
    type: "product",
    maturity: "high",
    aliases: ["模块化 UPS", "模块化UPS", "modular UPS"],
  },
  liquid_cooling: {
    id: "liquid_cooling",
    label: "液冷",
    family: "Thermal Management Family",
    type: "solution_system",
    maturity: "medium_high",
    aliases: ["液冷", "冷板液冷", "liquid cooling"],
  },
  pdu_rpp_sts: {
    id: "pdu_rpp_sts",
    label: "PDU/RPP/STS",
    family: "Distribution and Power Path Family",
    type: "product_family",
    maturity: "high",
    aliases: ["PDU", "RPP", "STS", "PDU/RPP/STS", "静态切换", "列头配电"],
  },
  hvdc: {
    id: "hvdc",
    label: "HVDC",
    family: "DC Power, Backup and Storage Family",
    type: "architecture_solution",
    maturity: "medium_high",
    aliases: ["HVDC", "高压直流", "240VDC", "336VDC"],
  },
  sst: {
    id: "sst",
    label: "SST",
    family: "Frontier Technology and Horizontal Capability",
    type: "frontier_technology",
    maturity: "low",
    aliases: ["SST", "PET", "固态变压器", "电力电子变压器", "solid state transformer"],
  },
  portfolio: {
    id: "portfolio",
    label: "全部",
    family: "Portfolio View",
    type: "portfolio_view",
    maturity: "mixed",
    aliases: ["全部", "组合", "portfolio", "全赛道", "全部赛道"],
  },
});

export const FULL_PORTFOLIO_TAXONOMY_PLACEHOLDERS = Object.freeze([
  "Modular UPS",
  "Tower/Rack UPS",
  "Industrial/Power UPS",
  "Precision Cooling",
  "Liquid Cooling",
  "PDU/RPP/STS",
  "Integrated Power Module",
  "HVDC",
  "BBU",
  "Data Center Energy Storage",
  "Server PSU",
  "Rack Power Shelf",
  "Micro-module",
  "Prefabricated Data Center",
  "SST",
  "GaN/SiC technology factors",
  "AI Energy Management",
]);

export const normalizeTaxonomyText = (value = "") => String(value || "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[\s\-_]+/g, "")
  .replace(/[^\p{L}\p{N}/]+/gu, "");

export const TAXONOMY_ALIAS_INDEX = Object.freeze(
  Object.values(TAXONOMY_OBJECTS).flatMap((object) =>
    object.aliases.map((alias) => ({
      alias,
      normalizedAlias: normalizeTaxonomyText(alias),
      objectId: object.id,
    }))
  ).sort((left, right) => right.normalizedAlias.length - left.normalizedAlias.length)
);

export function findTaxonomyMentions(question = "") {
  const normalizedQuestion = normalizeTaxonomyText(question);
  const matches = [];
  TAXONOMY_ALIAS_INDEX.forEach((entry) => {
    if (!entry.normalizedAlias || !normalizedQuestion.includes(entry.normalizedAlias)) return;
    if (matches.some((item) => item.objectId === entry.objectId)) return;
    matches.push({
      objectId: entry.objectId,
      label: TAXONOMY_OBJECTS[entry.objectId].label,
      alias: entry.alias,
    });
  });
  return matches;
}

export function taxonomyObjectForTrack(track = "全部") {
  const normalizedTrack = normalizeTaxonomyText(track);
  const match = Object.values(TAXONOMY_OBJECTS).find((object) =>
    object.aliases.some((alias) => normalizeTaxonomyText(alias) === normalizedTrack)
    || normalizeTaxonomyText(object.label) === normalizedTrack
  );
  return match || null;
}
