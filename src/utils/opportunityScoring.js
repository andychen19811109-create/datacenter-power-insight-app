const QUALITATIVE_SCORE = {
  "低": 1,
  "中低": 2,
  "中": 3,
  "中高": 4,
  "高": 5,
};

const LEVEL_LABELS = {
  L0: "不投入",
  L1: "观察",
  L2: "预研 / 小规模验证",
  L3: "选择性投入 / 客户 POC",
  L4: "战略投入",
};

const TRACK_GATES = {
  "800VDC": "完成绝缘、电弧、DC 保护、连接器和端到端效率验证",
  "液冷": "完成 CDU、快接头、防漏液、控制联动和运维边界验证",
  "BBU": "完成高倍率电芯、BMS/EMS、消防、故障隔离和调度接口验证",
  "SST": "完成中压样机、旁路保护、故障隔离、可靠性和标准兼容验证",
  "GaN/SiC": "完成功率循环、热设计、EMI、良率和客户导入验证",
  "UPS": "完成目标行业可靠性、并机、认证和服务能力验证",
  "模块化 UPS": "完成高功率密度、热插拔、并机可靠性和维护效率验证",
  "微模块": "完成标准化 SKU、现场拼装、动环集成和远程运维验证",
  "一体化电力模块": "完成运输吊装、铜排连接、系统联调和工程交付验证",
};

const valueOf = (value) => QUALITATIVE_SCORE[value] || 3;
const includesOrGlobal = (values = [], selected, globalValue) => selected === globalValue || values.includes(selected) || values.includes("全球");

const timeMatches = (roadmapStage = "", selectedTime) => {
  const years = roadmapStage.match(/\d{4}/g)?.map(Number) || [];
  if (!years.length) return false;
  const year = Number(selectedTime);
  return year >= Math.min(...years) && year <= Math.max(...years);
};

const evidenceScore = (confidence) => valueOf(confidence);

const capLevelByEvidence = (level, evidence) => {
  if (evidence <= 2 && ["L3", "L4"].includes(level)) return "L2";
  if (evidence === 3 && level === "L4") return "L3";
  return level;
};

const capLevelByReadiness = (level, product) => {
  const technical = valueOf(product.technicalFeasibility);
  const supplyChain = valueOf(product.supplyChainMaturity);
  if ((technical <= 2 || supplyChain <= 2) && ["L3", "L4"].includes(level)) return "L2";
  if ((technical === 3 || supplyChain === 3) && level === "L4") return "L3";
  return level;
};

const scoreToLevel = (score) => {
  if (score >= 80) return "L4";
  if (score >= 65) return "L3";
  if (score >= 50) return "L2";
  if (score >= 35) return "L1";
  return "L0";
};

export const scoreProductOpportunity = (product, filters) => {
  const regionMatch = includesOrGlobal(product.regionRelevance, filters.region, "全球");
  const customerMatch = includesOrGlobal(product.targetCustomers, filters.customer, "全部");
  const applicationMatch = includesOrGlobal(product.applications, filters.application, "全部");
  const trackMatch = filters.track === "全部" || product.track === filters.track;
  const windowMatch = timeMatches(product.roadmapStage, filters.time);
  const evidence = evidenceScore(product.confidence);
  const competitionGap = 6 - valueOf(product.competitionIntensity);

  let score = valueOf(product.marketAttractiveness) * 4
    + valueOf(product.customerUrgency) * 4
    + valueOf(product.technicalFeasibility) * 3
    + competitionGap * 3
    + (regionMatch ? 10 : 2)
    + (windowMatch ? 10 : 4)
    + evidence * 2;

  if (!trackMatch) score -= 25;
  if (!customerMatch) score -= 15;
  if (!applicationMatch) score -= 15;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const evidenceCappedLevel = capLevelByEvidence(scoreToLevel(score), evidence);
  const level = capLevelByReadiness(evidenceCappedLevel, product);
  const reasons = [
    `${filters.region}区域${regionMatch ? "匹配" : "缺少直接匹配"}`,
    `${filters.customer}客户${customerMatch ? "匹配" : "缺少直接匹配"}`,
    `${filters.application}场景${applicationMatch ? "匹配" : "缺少直接匹配"}`,
    `${filters.time}时间窗口${windowMatch ? "匹配" : "需要跨期验证"}`,
    `证据置信度${product.confidence || "中"}`,
  ];
  const gate = TRACK_GATES[product.track] || `完成${product.track}的客户需求、规格、样机、认证和服务能力验证`;

  return {
    ...product,
    score,
    level,
    priority: LEVEL_LABELS[level],
    reasons,
    evidenceLevel: product.confidence || "中",
    risks: [product.risk, product.caveat].filter(Boolean),
    mvp: `围绕${product.targetCustomers.slice(0, 2).join(" / ")}定义最小可验证方案，聚焦${product.diff}`,
    actions0To30: `确认目标客户、关键规格、竞品边界与验证资源；${product.action}`,
    actions30To90: `${gate}，并取得至少一个客户验证反馈。`,
    nextActions: [product.action, gate],
    technicalGate: gate,
    exitConditions: `若关键客户无明确需求、${filters.time}窗口无法完成验证，或${product.risk}不可控，则降级或退出投入。`,
    match: { regionMatch, customerMatch, applicationMatch, trackMatch, windowMatch },
    isRelevant: trackMatch && customerMatch && applicationMatch,
    scoreBoundary: "相对优先级评分 / 专家判断，不代表市场规模或财务回报",
  };
};

export const scoreProductOpportunities = (products, filters) =>
  products.map((product) => scoreProductOpportunity(product, filters))
    .sort((a, b) => b.score - a.score);

export const INVESTMENT_LEVEL_LABELS = Object.freeze(LEVEL_LABELS);
