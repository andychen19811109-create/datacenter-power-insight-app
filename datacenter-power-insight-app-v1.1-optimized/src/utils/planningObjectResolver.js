import { findTaxonomyMentions, taxonomyObjectForTrack, TAXONOMY_OBJECTS } from "../data/taxonomyRegistry.js";

const CARD_ENTITY_MAP = Object.freeze({
  modular_ups: "modular_ups",
  liquid_cooling: "liquid_cooling",
  cdu: "liquid_cooling",
  solid_state_transformer: "sst",
  hvdc: "hvdc",
  pdu: "pdu_rpp_sts",
  rpp: "pdu_rpp_sts",
  sts: "pdu_rpp_sts",
});

const normalize = (value = "") => String(value || "")
  .normalize("NFKC")
  .toLowerCase()
  .replace(/[\s\-_]+/g, "")
  .replace(/[^\p{L}\p{N}/]+/gu, "");

const isPortfolioQuestion = (question = "") => ["全部", "全赛道", "组合", "portfolio", "投资取舍", "资源分配"]
  .some((token) => normalize(question).includes(normalize(token)));

const cardIdFromParsedEntity = (entity) => CARD_ENTITY_MAP[entity?.entityId] || null;

const cardIdFromTrack = (track) => {
  const taxonomyObject = taxonomyObjectForTrack(track || "全部");
  if (!taxonomyObject) return null;
  return taxonomyObject.id === "portfolio" ? "portfolio" : taxonomyObject.id;
};

const unique = (items = []) => [...new Set(items.filter(Boolean))];

export function resolvePlanningObject({ question, filters = {}, analysisState = {} }) {
  const selectedTrack = filters.track || "全部";
  const selectedObjectId = cardIdFromTrack(selectedTrack) || "portfolio";
  const parsedEntities = analysisState.entities?.length
    ? analysisState.entities
    : (analysisState.primaryEntity?.entityId && analysisState.primaryEntity.entityId !== "unknown" ? [analysisState.primaryEntity] : []);
  const parsedObjectIds = unique(parsedEntities.map(cardIdFromParsedEntity));
  const taxonomyMentionIds = unique(findTaxonomyMentions(question).map((mention) => mention.objectId));
  const explicitObjectIds = unique([...parsedObjectIds, ...taxonomyMentionIds].filter((id) => id && id !== "portfolio"));

  if (explicitObjectIds.length > 1) {
    return {
      mode: "comparison",
      resolvedObjectId: explicitObjectIds[0],
      comparisonObjectIds: explicitObjectIds,
      selectedObjectId,
      selectedTrack,
      questionObjectId: explicitObjectIds[0],
      conflictNotice: selectedObjectId !== "portfolio" && !explicitObjectIds.includes(selectedObjectId)
        ? `当前筛选赛道为${selectedTrack}，但问题显式比较${explicitObjectIds.map((id) => TAXONOMY_OBJECTS[id]?.label || id).join(" / ")}；本回答进入多对象比较模式。`
        : "",
      portfolio: false,
      unsupported: false,
    };
  }

  if (isPortfolioQuestion(question) && selectedObjectId === "portfolio" && explicitObjectIds.length === 0) {
    return {
      mode: "portfolio",
      resolvedObjectId: "portfolio",
      comparisonObjectIds: [],
      selectedObjectId,
      selectedTrack,
      questionObjectId: "portfolio",
      conflictNotice: "",
      portfolio: true,
      unsupported: false,
    };
  }

  const explicitObjectId = explicitObjectIds[0] || null;
  const resolvedObjectId = explicitObjectId || selectedObjectId;
  const conflictNotice = explicitObjectId && selectedObjectId !== "portfolio" && explicitObjectId !== selectedObjectId
    ? `当前筛选赛道为${selectedTrack}，但问题显式对象为${TAXONOMY_OBJECTS[explicitObjectId]?.label || explicitObjectId}；本回答按问题对象覆盖筛选赛道，并保留该冲突提示。`
    : "";

  return {
    mode: resolvedObjectId === "portfolio" ? "portfolio" : "single",
    resolvedObjectId,
    comparisonObjectIds: [],
    selectedObjectId,
    selectedTrack,
    questionObjectId: explicitObjectId || resolvedObjectId,
    conflictNotice,
    portfolio: resolvedObjectId === "portfolio",
    unsupported: !TAXONOMY_OBJECTS[resolvedObjectId],
  };
}

export function describeResolvedObject(resolution) {
  if (resolution.mode === "comparison") {
    return resolution.comparisonObjectIds.map((id) => TAXONOMY_OBJECTS[id]?.label || id).join(" / ");
  }
  return TAXONOMY_OBJECTS[resolution.resolvedObjectId]?.label || "待确认对象";
}
