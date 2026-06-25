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
  return `${contract.selectedContext.track}属于${entityType}，不能作为一级业务赛道生成 track-specific KPI。`;
}

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
  return {
    selectedContext: contract.selectedContext,
    macroMarketIndicators: {
      scope: contract.selectedContext.region === "全球" ? "global" : "global_with_regional_boundary",
      boundary: getGlobalOnlyChartBoundary(contract),
      expertInterpolation: true,
    },
    marketSizeVsPriority: "市场规模、用电需求和产品优先级评分是不同口径；相对评分不能解释为收入预测。",
    trackSpecificKpi: {
      supported: trackSpecificSupported,
      unsupportedReason: trackSpecificSupported ? null : getUnsupportedTrackReason(contract),
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
  return {
    valid: errors.length === 0,
    errors,
    kpiScopeContext: kpi,
  };
}
