const overallRankingPattern = /(?:综合排序|总体优先级|整体排序|第一(?:投资)?方向|第二(?:投资)?方向|第三(?:投资)?方向|风险收益最高|最优|最高优先|优先投入|优先配置|优先选择|[A-Za-z0-9/一-龥]+\s*[>＞]\s*[A-Za-z0-9/一-龥]+)/i;

const scenarioFrame = (value) => {
  const text = String(value || "");
  return /(?:若|如果|面向|适用主体|产业投资|财务投资|企业战略)/.test(text)
    && /(?:近期|长期|时间窗口|周期)/.test(text)
    && /(?:假设|前提)/.test(text)
    && /风险/.test(text);
};

export const containsOverallInvestmentRanking = (value) => overallRankingPattern.test(String(value || ""));

export function applyInvestmentRankingPolicy({ value, status, allowOverallRanking = false }) {
  const text = String(value || "");
  if (!containsOverallInvestmentRanking(text)) return { value: text, filtered: false };
  if (status === "INSUFFICIENT_EVIDENCE") {
    return {
      value: "不输出无条件单一排序；当前证据不足以形成整体排序，请按投资主体、时间窗口、关键假设和主要风险分别比较。",
      filtered: true,
    };
  }
  if (status === "CONDITIONAL" && !scenarioFrame(text)) {
    return {
      value: "请在明确投资主体、时间窗口、关键假设和主要风险后形成条件化场景判断。",
      filtered: true,
    };
  }
  if (status === "PUBLISHABLE" && !allowOverallRanking) {
    return {
      value: "当前未满足整体排序的发布前提；请按投资主体、时间窗口、关键假设和主要风险分别比较。",
      filtered: true,
      downgrade_to: "INSUFFICIENT_EVIDENCE",
    };
  }
  return { value: text, filtered: false };
}
