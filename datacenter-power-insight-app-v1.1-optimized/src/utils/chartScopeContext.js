const GLOBAL_ONLY_CHARTS = Object.freeze([
  {
    chartId: "global-data-center-power-demand",
    label: "IEA global data center power demand",
    scope: "global",
    sourceBoundary: "IEA global macro forecast with expert interpolation for local prototype display.",
  },
]);

export function getGlobalOnlyChartBoundary(contract) {
  if (contract.selectedContext.region === "全球") {
    return "当前图表为全球宏观口径，可作为背景趋势使用。";
  }
  return `${contract.selectedContext.region}筛选下仍只能显示全球宏观图表，不提供区域化数值。`;
}

export function getUnsupportedRegionReason(contract) {
  if (contract.selectedContext.region === "全球") return null;
  return `${contract.selectedContext.region}缺少可核验 region-specific chart/KPI 数据，不能伪造区域数值。`;
}

export function getUnsupportedTrackReason(contract) {
  const entityType = contract.selectedContext.entityType;
  if (entityType === "all") return "全部赛道下图表仅为宏观背景，不拆分到单一赛道。";
  if (entityType === "primary_business_track") return "当前宏观市场指标不提供 track-specific KPI，只能作为背景参考。";
  if (entityType === "product_subsegment" || entityType === "equipment_segment") return `${contract.selectedContext.normalizedTrack}是${contract.selectedContext.parentBusinessTrack?.label || "一级赛道"}下的设备/子产品；如果只有液冷整体口径，必须标注 liquid_cooling_global_or_category_level，不能伪造 CDU-specific KPI。`;
  return `${contract.selectedContext.track}属于${entityType}，不能作为一级业务赛道生成 track-specific KPI。`;
}

const liquidCoolingScopeFor = (contract) => {
  if (contract.selectedContext.normalizedTrack === "液冷") {
    return {
      scope: "liquid_cooling_category_level",
      supportedAsPrimaryTrack: true,
      cduSpecificKpiSupported: false,
      boundary: "液冷可作为一级赛道呈现 category-level unsupported/context need；本地数据仍不生成液冷市场规模或机柜功率密度数值。",
    };
  }
  if (contract.selectedContext.entityId === "liquid_cooling_cdu") {
    return {
      scope: "liquid_cooling_global_or_category_level",
      supportedAsPrimaryTrack: false,
      cduSpecificKpiSupported: false,
      boundary: "液冷 CDU/CDU 是液冷下的设备/子产品；没有 CDU-specific KPI 时只能引用液冷整体或类别级边界，不能套用完整液冷市场规模。",
    };
  }
  return null;
};

export function buildChartScopeContext(contract) {
  const unsupportedRegionReason = getUnsupportedRegionReason(contract);
  const unsupportedTrackReason = getUnsupportedTrackReason(contract);
  return {
    selectedContext: contract.selectedContext,
    charts: GLOBAL_ONLY_CHARTS.map((chart) => ({
      ...chart,
      globalOnly: true,
      supportsCurrentRegion: contract.selectedContext.region === "全球",
      supportsCurrentTrack: contract.selectedContext.entityType === "all",
      boundary: getGlobalOnlyChartBoundary(contract),
      unsupportedRegionReason,
      unsupportedTrackReason,
      evidenceBoundary: chart.sourceBoundary,
      expertInterpolation: true,
      liquidCoolingScope: liquidCoolingScopeFor(contract),
    })),
    unsupportedScopes: [
      unsupportedRegionReason && {
        scopeId: "region_chart_unsupported",
        dimension: "region",
        reason: unsupportedRegionReason,
      },
      unsupportedTrackReason && {
        scopeId: "track_chart_unsupported",
        dimension: "track",
        reason: unsupportedTrackReason,
      },
    ].filter(Boolean),
  };
}

export function buildKpiScopeContext(contract) {
  const trackSpecificSupported = contract.selectedContext.entityType === "all";
  const liquidCoolingScope = liquidCoolingScopeFor(contract);
  return {
    selectedContext: contract.selectedContext,
    liquidCoolingScope,
    macroMarketIndicators: {
      scope: contract.selectedContext.region === "全球" ? "global" : "global_with_regional_boundary",
      boundary: getGlobalOnlyChartBoundary(contract),
      expertInterpolation: true,
    },
    marketSizeVsPriority: "市场规模、用电需求和产品优先级评分是不同口径；相对评分不能解释为收入预测。",
    trackSpecificKpi: {
      supported: trackSpecificSupported,
      unsupportedReason: trackSpecificSupported ? null : getUnsupportedTrackReason(contract),
      boundaryCode: liquidCoolingScope?.scope || null,
    },
    rackPowerDensity: {
      supported: false,
      status: "context_need",
      unsupportedReason: "当前本地数据没有可靠机柜功率密度序列，只能作为需求背景或待补证据，不生成数值。",
    },
  };
}

export function validateChartScopeContext(chartContext = {}, contract = {}) {
  const errors = [];
  if (!Array.isArray(chartContext.charts) || chartContext.charts.length === 0) errors.push("missing-charts");
  chartContext.charts?.forEach((chart) => {
    if (!chart.globalOnly) errors.push(`chart-not-globalOnly:${chart.chartId}`);
    if (contract.selectedContext?.region !== "全球" && !chart.unsupportedRegionReason) errors.push(`missing-region-boundary:${chart.chartId}`);
    if (!chart.expertInterpolation) errors.push(`missing-expert-interpolation:${chart.chartId}`);
  });
  const kpi = buildKpiScopeContext(contract);
  if (kpi.rackPowerDensity.supported) errors.push("rack-density-must-not-be-supported");
  if (!kpi.marketSizeVsPriority) errors.push("missing-market-size-priority-boundary");
  if (contract.selectedContext?.entityId === "liquid_cooling_cdu" && kpi.trackSpecificKpi.supported) errors.push("cdu-specific-kpi-must-not-be-supported");
  if (contract.selectedContext?.entityId === "liquid_cooling_cdu" && kpi.trackSpecificKpi.boundaryCode !== "liquid_cooling_global_or_category_level") errors.push("missing-cdu-category-boundary");
  return {
    valid: errors.length === 0,
    errors,
    kpiScopeContext: kpi,
  };
}
