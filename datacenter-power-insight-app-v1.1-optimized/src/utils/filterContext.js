import {
  BUSINESS_TRACKS,
  REGIONS,
  TIME_HORIZONS,
  classifyEntity,
} from "../data/ontology.js";
import { buildInsightContext } from "./insightContext.js";
import {
  buildInsightDecisionContract as buildBaseInsightDecisionContract,
  validateInsightDecisionContract,
} from "./insightDecisionContract.js";

const DEFAULT_FILTERS = Object.freeze({
  role: "高管",
  region: "全球",
  customer: "全部",
  application: "全部",
  track: "全部",
  time: "2026",
});

const ROLE_OPTIONS = Object.freeze(["高管", "投资者", "市场", "产品", "研发"]);
const CUSTOMER_OPTIONS = Object.freeze(["全部", "云服务商", "第三方数据中心", "电信运营商", "金融", "制造业", "能源与电力", "政府", "边缘计算"]);
const APPLICATION_OPTIONS = Object.freeze(["全部", "AI 训练集群", "AI 推理集群", "超大规模数据中心", "第三方托管数据中心", "存量改造", "新建 AI Factory", "边缘数据中心"]);

const optionLabels = (items) => items.map((item) => item.label);
const firstKnown = (value, options, fallback) => options.includes(value) ? value : fallback;

export function buildRoleOptions() {
  return [...ROLE_OPTIONS];
}

export function buildRegionOptions() {
  return optionLabels(REGIONS);
}

export function buildTrackOptions() {
  return ["全部", ...optionLabels(BUSINESS_TRACKS)];
}

export function buildTimeHorizonOptions() {
  return optionLabels(TIME_HORIZONS);
}

export function buildFilterOptionsFromOntology() {
  return {
    role: buildRoleOptions(),
    region: buildRegionOptions(),
    customer: [...CUSTOMER_OPTIONS],
    application: [...APPLICATION_OPTIONS],
    track: buildTrackOptions(),
    time: buildTimeHorizonOptions(),
  };
}

export function normalizeFilterSelection(filters = {}) {
  const time = filters.timeHorizon || filters.time || DEFAULT_FILTERS.time;
  const roleOptions = buildRoleOptions();
  const regionOptions = buildRegionOptions();
  const timeOptions = buildTimeHorizonOptions();
  return {
    role: firstKnown(filters.role || DEFAULT_FILTERS.role, roleOptions, DEFAULT_FILTERS.role),
    region: firstKnown(filters.region || DEFAULT_FILTERS.region, regionOptions, DEFAULT_FILTERS.region),
    customer: filters.customer || DEFAULT_FILTERS.customer,
    application: filters.application || DEFAULT_FILTERS.application,
    track: filters.track || DEFAULT_FILTERS.track,
    time: firstKnown(String(time), timeOptions, DEFAULT_FILTERS.time),
  };
}

export function buildSelectedContextFromFilters(filters = {}) {
  return buildPhase2InsightContract(filters).selectedContext;
}

export function buildPhase2InsightContract(filters = {}) {
  const normalizedFilters = normalizeFilterSelection(filters);
  const insightContext = buildInsightContext(normalizedFilters);
  const contract = buildBaseInsightDecisionContract(normalizedFilters, { insightContext });
  return {
    ...contract,
    phase2: {
      filterOptions: buildFilterOptionsFromOntology(),
      normalizedFilters,
      selectedEntity: classifyEntity(normalizedFilters.track),
    },
    insightContext,
  };
}

export function validatePhase2FilterContext(context = {}) {
  const contract = context.selectedContext ? context : buildPhase2InsightContract(context);
  const errors = [];
  const options = buildFilterOptionsFromOntology();
  const forbiddenPrimaryTracks = ["UPS", "工业 UPS", "电力 UPS", "800VDC", "GaN/SiC", "GaN", "SiC"];

  forbiddenPrimaryTracks.forEach((track) => {
    if (options.track.includes(track)) errors.push(`forbidden-track-option:${track}`);
  });
  ["塔式 UPS", "模块化 UPS", "精密空调", "服务器电源"].forEach((track) => {
    if (!options.track.includes(track)) errors.push(`missing-track-option:${track}`);
  });
  if (options.time.includes("2025")) errors.push("forbidden-time-option:2025");
  if (!options.time.includes("2028")) errors.push("missing-time-option:2028");

  const baseValidation = validateInsightDecisionContract(contract);
  if (!baseValidation.valid) errors.push(...baseValidation.errors);
  ["role", "region", "track", "timeHorizon", "normalizedTrack", "entityType", "matchState"].forEach((field) => {
    if (!(field in (contract.selectedContext || {}))) errors.push(`missing-selectedContext:${field}`);
  });
  if (contract.selectedContext?.entityType !== "primary_business_track" && contract.selectedContext?.entityType !== "all") {
    const hasReason = contract.unsupportedScopes?.some((item) => item.dimension === "track" && item.reason);
    if (!hasReason) errors.push("missing-non-primary-track-unsupported-reason");
  }

  return {
    valid: errors.length === 0,
    errors,
    options,
    selectedContext: contract.selectedContext,
  };
}

export const PHASE2_DEFAULT_FILTERS = DEFAULT_FILTERS;
