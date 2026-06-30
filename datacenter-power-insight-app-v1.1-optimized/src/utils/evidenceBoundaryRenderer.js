const unique = (items = []) => [...new Set(items.filter(Boolean))];

export const FORBIDDEN_CLAIMS = Object.freeze([
  "TAM",
  "SAM",
  "SOM",
  "ROI",
  "收入",
  "命名客户",
  "上市日期",
  "认证状态",
  "技术参数",
  "内部能力",
]);

export function renderMissingInputs(missingInputs = [], limit = 14) {
  const visible = missingInputs.slice(0, limit);
  const suffix = missingInputs.length > limit ? `；另有 ${missingInputs.length - limit} 项缺失输入未展开` : "";
  return `${visible.join("；")}${suffix}`;
}

export function buildEvidenceBoundaryItems(synthesis) {
  const card = synthesis.card;
  return unique([
    synthesis.pageLinkageStatement,
    card?.evidence?.noQuantifiedData?.caveat,
    card?.evidence?.sourceRequired?.caveat,
    card?.evidence?.caveats?.value?.join("；"),
    `未提供来源时不得生成：${FORBIDDEN_CLAIMS.join(", ")}。`,
    `missingInputs=${renderMissingInputs(synthesis.missingInputs || [])}`,
  ]);
}

export function renderEvidenceBoundarySection(synthesis) {
  return [
    "证据边界",
    ...buildEvidenceBoundaryItems(synthesis).map((item) => `- ${item}`),
  ].join("\n");
}

export function hasNoFabricationLanguage(text = "") {
  const forbidden = [
    /TAM\s*[为是]\s*\d/i,
    /ROI\s*[为是]\s*\d/i,
    /上市时间\s*[为是]\s*20\d{2}/,
    /认证\s*(已|已经|通过)/,
  ];
  return !forbidden.some((pattern) => pattern.test(text));
}
