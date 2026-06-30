import { describeResolvedObject } from "./planningObjectResolver.js";
import { renderEvidenceBoundarySection, renderMissingInputs } from "./evidenceBoundaryRenderer.js";

const line = (title, value) => `${title}：${value}`;

const text = (field) => field?.text || "source_required";

const renderRoadmap = (synthesis) => {
  const roadmap = synthesis.productInput;
  return [
    "2026 / 2027 / 2028 Roadmap",
    `- 2026：${text(synthesis.overviewInput.roadmap2026)}`,
    `- 2027：${text(synthesis.overviewInput.roadmap2027)}`,
    `- 2028：${text(synthesis.overviewInput.roadmap2028)}`,
    `- Launch boundary：${text(roadmap.pdc.launchDate)}；不得把 Roadmap 里程碑改写为上市日期。`,
  ].join("\n");
};

const renderFiveLook = (synthesis) => [
  "五看",
  `1. 看趋势：${text(synthesis.marketInput.trend)}；市场规模字段保持 ${synthesis.marketInput.marketSize.evidenceStatus}。`,
  `2. 看客户：${text(synthesis.marketInput.customerSegments)}；采购逻辑为 ${text(synthesis.marketInput.buyingLogic)}；命名客户仍需 source_required。`,
  `3. 看竞争：${text(synthesis.companiesInput.entryBarriers)}；能力地图为 ${synthesis.companiesInput.capabilityMap.evidenceStatus}，不得用泛化厂商列表替代。`,
  `4. 看自身：Self Fit 依赖 user_input_required；PDC 仅为 ${text(synthesis.productInput.pdc.projectValue)}，ROI 为 ${synthesis.productInput.pdc.roi.evidenceStatus}。`,
  `5. 看技术：${text(synthesis.technologyInput.architecturePosition)}；验证门槛为 ${text(synthesis.technologyInput.validationGates)}。`,
].join("\n");

const renderThreeDefine = (synthesis) => [
  "三定",
  `1. 定方向：${text(synthesis.productInput.boundary)}；成熟度为 ${text(synthesis.overviewInput.maturity)}。`,
  `2. 定产品：${text(synthesis.productInput.family)}；关键边界/组件为 ${text(synthesis.productInput.components)}；SKU/参数保持 ${synthesis.productInput.skuOrRange.evidenceStatus}。`,
  `3. 定节奏：${text(synthesis.overviewInput.roadmap2026)} -> ${text(synthesis.overviewInput.roadmap2027)} -> ${text(synthesis.overviewInput.roadmap2028)}；LCM 为 ${text(synthesis.productInput.lcm.lifecycleStage)}，迁移策略为 ${text(synthesis.productInput.lcm.migrationStrategy)}。`,
].join("\n");

const renderLiquidCoolingFocus = (synthesis) => [
  "液冷专项边界",
  "- Product boundary: Liquid Cooling must include CDU / cold plate / manifold / secondary loop.",
  "- Validation gates: quick connector, leakage prevention, pressure/control linkage, O&M boundary, reliability test.",
  `- Missing technical parameters: ${renderMissingInputs(synthesis.missingInputs.filter((item) => /specs|skuOrRange|coolingCapacity|rackPower|supplyTemperature/.test(item)), 8)}.`,
].join("\n");

const renderSstFocus = () => [
  "SST专项边界",
  "- Framing: pre-commercial research / prototype / validation / watch / exit.",
  "- 2026/2027/2028 are validation horizons, not launch commitments or short-term revenue milestones.",
  "- SST remains low maturity and must not be conflated with HVDC.",
].join("\n");

const renderPortfolioFocus = (synthesis) => [
  "Portfolio View 投资取舍",
  "- 不输出单一赢家；按 invest / validate / watch / exit 分配资源。",
  "- Invest/validate candidates: Liquid Cooling and Modular UPS can enter evidence-gated POC/PDC discussion only where customer and validation evidence exists.",
  "- Watch/validate candidates: HVDC and PDU/RPP/STS require architecture, protection, delivery and service evidence by scenario.",
  "- Watch/exit candidate: SST remains pre-commercial research unless prototype, standards and customer co-validation evidence changes.",
  `- Portfolio missingInputs: ${renderMissingInputs(synthesis.missingInputs, 10)}.`,
].join("\n");

const renderNoDataAnswer = (synthesis) => [
  "定量/客户/上市请求处理",
  `- TAM / SAM / SOM：${synthesis.marketInput.marketSize.evidenceStatus}，不填数。`,
  `- ROI / revenue / budget：${synthesis.productInput.pdc.roi.evidenceStatus} / ${synthesis.productInput.pdc.revenue.evidenceStatus} / ${synthesis.productInput.pdc.budget.evidenceStatus}，不以专家判断替代事实。`,
  `- 目标客户：${text(synthesis.marketInput.customerSegments)}；命名客户或灯塔客户必须 source_required。`,
  `- 上市时间：${synthesis.productInput.pdc.launchDate.evidenceStatus}，只保留决策门槛，不生成日期。`,
  `- Evidence-needed list：${renderMissingInputs(synthesis.missingInputs, 12)}。`,
].join("\n");

const intentFlags = (question = "") => ({
  roadmap: /roadmap|路线图|规划/i.test(question),
  quantitative: /TAM|SAM|SOM|ROI|目标客户|上市时间|收入|预算|市场规模/i.test(question),
  portfolio: /全部|组合|投资取舍|资源分配|portfolio/i.test(question),
});

export function buildFiveLookThreeDefineAnswer({ question, filters, resolution, synthesis }) {
  const flags = intentFlags(question);
  const resolvedLabel = describeResolvedObject(resolution);
  const contextLine = [
    filters.role ? `${filters.role}视角` : null,
    filters.region,
    filters.customer && filters.customer !== "全部" ? filters.customer : null,
    filters.application && filters.application !== "全部" ? filters.application : null,
    filters.time ? `${filters.time}窗口` : null,
  ].filter(Boolean).join(" / ");

  const sections = [
    `Question: ${question}`,
    `Resolved planning object: ${resolvedLabel}`,
    `Analysis Context: ${contextLine || "当前筛选条件"}`,
    resolution.conflictNotice ? `Conflict notice: ${resolution.conflictNotice}` : "",
    synthesis.pageLinkageStatement,
    "",
    renderFiveLook(synthesis),
    "",
    renderThreeDefine(synthesis),
    "",
    flags.roadmap || synthesis.card.objectId === "liquid_cooling" || synthesis.card.objectId === "sst" ? renderRoadmap(synthesis) : "",
    synthesis.card.objectId === "liquid_cooling" ? renderLiquidCoolingFocus(synthesis) : "",
    synthesis.card.objectId === "sst" ? renderSstFocus() : "",
    resolution.mode === "portfolio" || flags.portfolio ? renderPortfolioFocus(synthesis) : "",
    flags.quantitative ? renderNoDataAnswer(synthesis) : "",
    "",
    line("PDC boundary", `${text(synthesis.productInput.pdc.projectValue)}；ROI=${synthesis.productInput.pdc.roi.evidenceStatus}；launch=${synthesis.productInput.pdc.launchDate.evidenceStatus}`),
    line("LCM / exit condition", `${text(synthesis.productInput.lcm.lifecycleStage)}；${text(synthesis.productInput.lcm.migrationStrategy)}；若 evidence gates、客户场景、验证门槛或 source_required 项无法补齐，则降级、watch 或 exit。`),
    "",
    renderEvidenceBoundarySection(synthesis),
  ].filter(Boolean);

  return sections.join("\n\n");
}
