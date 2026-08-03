const QUESTION_LIBRARY = Object.freeze({
  decision_subject: {
    field: "decision_subject",
    question: "你更关注哪类投资视角？",
    options: ["产业投资", "财务投资", "企业战略与资源配置", "暂不确定，按多情景比较"],
    impact: "HIGH",
    defaultOption: "暂不确定，按多情景比较",
  },
  gaming_definition: {
    field: "gaming_definition",
    question: "这里的 Gaming UPS 具体指哪类产品？",
    options: ["电竞终端与工作站UPS", "电竞场馆关键负载UPS", "数据中心游戏云负载UPS"],
    impact: "HIGH",
    defaultOption: "电竞终端与工作站UPS",
  },
  sodium_scope: {
    field: "sodium_scope",
    question: "钠电UPS评估的是整机产品，还是钠离子电池在UPS中的应用？",
    options: ["钠离子电池在UPS中的应用", "钠电UPS整机", "两者都比较"],
    impact: "HIGH",
    defaultOption: "钠离子电池在UPS中的应用",
  },
});

export function getClarificationQuestions(analysisContext) {
  const fields = Array.isArray(analysisContext?.missing_high_impact_fields)
    ? analysisContext.missing_high_impact_fields
    : [];
  return fields.map((field) => QUESTION_LIBRARY[field]).filter(Boolean).slice(0, 3);
}

export function clarificationSelectionsToContext(selections = {}, questions = []) {
  const clarification = {};
  const assumptions = [];
  for (const question of questions.slice(0, 3)) {
    const selected = selections[question.field] || question.defaultOption;
    if (!selections[question.field]) assumptions.push(`未手动选择“${question.question}”，采用默认假设：${selected}`);
    if (question.field === "decision_subject") {
      clarification.decision_subject = selected === "财务投资"
        ? "FINANCIAL_INVESTOR"
        : selected === "企业战略与资源配置"
          ? "CORPORATE_STRATEGY"
          : selected === "暂不确定，按多情景比较" ? "UNKNOWN" : "INDUSTRIAL_INVESTOR";
    } else {
      clarification[question.field] = selected;
      if (!["gaming_definition", "sodium_scope", "risk_preference"].includes(question.field)) {
        assumptions.push(`用户澄清“${question.question}”：${selected}`);
      }
    }
  }
  if (assumptions.length) clarification.assumption = assumptions.join("；");
  return clarification;
}

export { QUESTION_LIBRARY };
