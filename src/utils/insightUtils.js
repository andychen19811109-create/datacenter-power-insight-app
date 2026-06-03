import {
  SOURCE_REGISTRY,
  CUSTOMER_PAIN_POINTS,
  PRODUCT_OPPORTUNITIES,
  COMPANIES,
  INTELLIGENCE_SIGNALS,
  TECH_MATRIX,
} from "../data/marketData";

export const source = (ref) => SOURCE_REGISTRY[ref] || SOURCE_REGISTRY.expert;

export const scoreProducts = (filters) =>
  PRODUCT_OPPORTUNITIES.map((p) => {
    let matchScore = 0;
    let matchType = "间接机会";
    if (filters.track !== "全部" && p.track === filters.track) { matchScore += 10; matchType = "赛道直接机会"; }
    if (filters.customer !== "全部" && p.targetCustomers.includes(filters.customer)) { matchScore += 5; matchType = matchType === "间接机会" ? "客户直接机会" : matchType; }
    if (filters.application !== "全部" && p.applications.includes(filters.application)) matchScore += 5;
    if (filters.region !== "全球" && p.regionRelevance.includes(filters.region)) matchScore += 2;
    if (Number(filters.time) >= Number(p.roadmapStage.split("-")[0])) matchScore += 1;
    if (filters.track === "全部" && filters.customer === "全部" && filters.application === "全部") { matchScore += 1; matchType = "全局展示"; }
    return { ...p, matchScore, matchType };
  }).sort((a, b) => b.matchScore - a.matchScore)
    .filter((p) => p.matchScore > 0 || (filters.track === "全部" && filters.customer === "全部"));

export const getFilteredCustomerPainPoints = (filters) => {
  const scored = CUSTOMER_PAIN_POINTS.map((p) => {
    let score = 0;
    let exact = true;
    if (filters.customer !== "全部") p.customer === filters.customer ? score += 10 : exact = false;
    if (filters.application !== "全部") p.applications.includes(filters.application) ? score += 5 : exact = false;
    if (filters.track !== "全部") p.affectedTracks.includes(filters.track) ? score += 5 : exact = false;
    if (filters.customer === "全部" && filters.application === "全部" && filters.track === "全部") { score = 10; exact = true; }
    return { ...p, score, matchType: exact ? "精确匹配" : score > 0 ? "相邻相关" : "全局参考" };
  });
  const exact = scored.filter((p) => p.matchType === "精确匹配");
  const related = scored.filter((p) => p.matchType === "相邻相关").sort((a, b) => b.score - a.score);
  return exact.length ? exact : related.length ? related : scored;
};

export const getFilteredCompanies = (filters) =>
  COMPANIES.map((c) => {
    let matchScore = 0;
    let matchType = "间接相关";
    if (filters.track !== "全部" && c.track.includes(filters.track)) { matchScore += 10; matchType = "赛道直接相关"; }
    if (filters.region !== "全球" && c.region === filters.region) matchScore += 5;
    if (filters.region === "全球") matchScore += 1;
    if (c.roleFit.includes(filters.role)) { matchScore += 5; if (matchType === "间接相关") matchType = "角色直接相关"; }
    if (filters.track === "全部") { matchScore += 1; matchType = "全局展示"; }
    return { ...c, matchScore, matchType };
  }).sort((a, b) => b.matchScore - a.matchScore);

export const getFilteredIntelligence = (filters) =>
  INTELLIGENCE_SIGNALS.map((s) => {
    let matchScore = 0;
    let matchType = "间接相关";
    if (filters.track !== "全部" && s.affectedTracks.includes(filters.track)) { matchScore += 10; matchType = "赛道直接相关"; }
    if (s.targetRoles.includes(filters.role)) matchScore += 5;
    if (filters.region !== "全球" && s.regionRelevance.includes(filters.region)) matchScore += 2;
    if (filters.track === "全部") { matchScore += 1; matchType = "全局展示"; }
    return { ...s, matchScore, matchType };
  }).sort((a, b) => b.matchScore - a.matchScore);

export const getFilteredTechMatrix = (filters) =>
  TECH_MATRIX.map((t) => {
    let isMatch = filters.track === "全部";
    let matchType = filters.track === "全部" ? "全局展示" : "不相关";
    if (!isMatch && (t.tech.includes(filters.track) || filters.track.includes(t.tech))) { isMatch = true; matchType = "直接相关"; }
    const adjacent = {
      "800VDC": ["GaN/SiC", "BBU", "液冷", "SST"],
      "液冷": ["800VDC", "一体化电力模块", "微模块"],
      "一体化电力模块": ["微模块", "BBU", "模块化 UPS"],
      "微模块": ["一体化电力模块", "UPS", "模块化 UPS"],
    };
    if (!isMatch && adjacent[filters.track]?.includes(t.tech)) { isMatch = true; matchType = "相邻相关技术"; }
    return { ...t, isMatch, matchType };
  }).filter((t) => t.isMatch);

export const getSegmentSummary = (filters) => `${filters.role} | ${filters.region} | ${filters.customer} | ${filters.application} | ${filters.track} | ${filters.time}`;

export const getRoleInsight = (filters) => {
  const { role, region, customer, track, time } = filters;
  let insight = `【${role}视角】基于 ${time} 年 ${region} 市场${customer !== "全部" ? ` / ${customer}` : ""}：`;
  if (role === "高管") {
    insight += track === "800VDC" || track === "液冷" ? "资源配置需向高密架构倾斜，防范标准化滞后、生态绑定和交付风险。" : "需要平衡 UPS 存量基本盘与高密 AI 新建机会，重点关注电网接入和供应链瓶颈。";
  } else if (role === "投资者") {
    insight += track === "800VDC" || track === "液冷" || track === "GaN/SiC" ? "赛道弹性高，但估值和技术路线切换风险也高。" : "传统电力设备确定性较强，但增长弹性弱于高密 AI 相关赛道。";
  } else if (role === "市场") {
    insight += customer === "金融" || customer === "政府" || customer === "制造业" ? "话术应聚焦高可靠、国产化、服务交付和低风险改造。" : "客户痛点正在从备电可靠性转向散热瓶颈、电网容量和低 PUE。";
  } else if (role === "产品") {
    insight += track === "800VDC" || track === "GaN/SiC" ? "路线图需紧跟 OCP / NVIDIA 参考架构，提前布局高压保护和高功率密度 PSU。" : "产品差异化应围绕预制化交付、智能运维、BBU 调度和低占地展开。";
  } else {
    insight += track === "800VDC" ? "研发重点是绝缘、电弧保护、连接器、DC 保护器件和标准化。" : "研发需关注系统互操作性、长期可靠性和新老架构平滑演进。";
  }
  return `${insight}（置信度：中高）`;
};
