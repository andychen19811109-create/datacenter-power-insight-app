import { describeResolvedObject } from "./planningObjectResolver.js";
import { renderEvidenceBoundarySection, renderMissingInputs } from "./evidenceBoundaryRenderer.js";

const line = (title, value) => `${title}：${value}`;

const text = (field) => field?.text || "source_required";

const renderRoadmap = (synthesis) => {
  const roadmap = synthesis.productInput;
  return [
    "2026 / 2027 / 2028 产品路线图",
    `- 2026：${text(synthesis.overviewInput.roadmap2026)}`,
    `- 2027：${text(synthesis.overviewInput.roadmap2027)}`,
    `- 2028：${text(synthesis.overviewInput.roadmap2028)}`,
    `- 上市边界：${text(roadmap.pdc.launchDate)}；不得把路线图里程碑改写为上市日期。`,
  ].join("\n");
};

const renderFiveLook = (synthesis) => [
  "五看",
  `1. 看趋势：${text(synthesis.marketInput.trend)}；市场规模字段保持 ${synthesis.marketInput.marketSize.evidenceStatus}。`,
  `2. 看客户：${text(synthesis.marketInput.customerSegments)}；采购逻辑为 ${text(synthesis.marketInput.buyingLogic)}；命名客户仍需 source_required。`,
  `3. 看竞争：${text(synthesis.companiesInput.entryBarriers)}；能力地图为 ${synthesis.companiesInput.capabilityMap.evidenceStatus}，不得用泛化厂商列表替代。`,
  `4. 看自身：内部能力、差距和改进动作仍为 user_input_required；PDC 判断仅为 ${text(synthesis.productInput.pdc.projectValue)}，ROI 为 ${synthesis.productInput.pdc.roi.evidenceStatus}。`,
  `5. 看技术：${text(synthesis.technologyInput.architecturePosition)}；验证门槛为 ${text(synthesis.technologyInput.validationGates)}。`,
].join("\n");

const renderThreeDefine = (synthesis) => [
  "三定",
  `1. 定方向：${text(synthesis.productInput.boundary)}；成熟度为 ${text(synthesis.overviewInput.maturity)}。`,
  `2. 定产品：${text(synthesis.productInput.family)}；关键边界/组件为 ${text(synthesis.productInput.components)}；SKU/参数保持 ${synthesis.productInput.skuOrRange.evidenceStatus}。`,
  `3. 定节奏：2026 年先完成 ${text(synthesis.overviewInput.roadmap2026)}；2027 年再判断 ${text(synthesis.overviewInput.roadmap2027)}；2028 年依据 ${text(synthesis.overviewInput.roadmap2028)} 做投入、观察或退出决策；LCM 为 ${text(synthesis.productInput.lcm.lifecycleStage)}，迁移策略为 ${text(synthesis.productInput.lcm.migrationStrategy)}。`,
].join("\n");

const renderLiquidCoolingFocus = (synthesis) => [
  "液冷专项边界",
  "- 产品边界：液冷必须覆盖 CDU / cold plate / manifold / secondary loop，并明确设施侧接口和服务器侧责任边界。",
  "- 验证门槛：quick connector 可靠性、leakage prevention、压力与流量控制、control linkage、O&M boundary、可靠性测试和维护可达性必须先验证。",
  `- 待补技术证据：${renderMissingInputs(synthesis.missingInputs.filter((item) => /specs|skuOrRange|coolingCapacity|rackPower|supplyTemperature/.test(item)), 8)}。`,
].join("\n");

const renderSstFocus = () => [
  "SST专项边界",
  "- 定位：SST 按 pre-commercial research / prototype / validation / watch / exit 管理，当前不作为近期收入型产品。",
  "- 2026/2027/2028 是验证周期，不是上市承诺，也不是短期收入里程碑。",
  "- SST 仍处低成熟度阶段，必须与 HVDC 直流配电架构分开判断。",
].join("\n");

const renderPortfolioFocus = (synthesis) => [
  "产品组合投资取舍",
  "- 不输出单一最优赛道，而是按投入、验证、观察、退出分层配置资源。",
  "- 投入 / 验证候选：液冷和模块化 UPS 只有在客户场景、验证数据、PDC 边界和服务模型具备证据时，才进入资源倾斜讨论。",
  "- 观察 / 验证候选：HVDC 与 PDU/RPP/STS 需要按场景补齐架构、保护、交付、认证和服务证据。",
  "- 观察 / 退出候选：SST 维持预研观察，除非样机、标准路径和客户共创验证出现证据变化。",
  "- 范围说明：5+1 只是代表性切片，不等同于完整产品组合分类。",
  `- 组合缺失输入：${renderMissingInputs(synthesis.missingInputs, 10)}。`,
].join("\n");

const renderNoDataAnswer = (synthesis) => [
  "定量/客户/上市请求处理",
  `- TAM / SAM / SOM：${synthesis.marketInput.marketSize.evidenceStatus}，不填数。`,
  `- ROI / revenue / budget：${synthesis.productInput.pdc.roi.evidenceStatus} / ${synthesis.productInput.pdc.revenue.evidenceStatus} / ${synthesis.productInput.pdc.budget.evidenceStatus}，不以专家判断替代事实。`,
  `- 目标客户：${text(synthesis.marketInput.customerSegments)}；命名客户或灯塔客户必须 source_required。`,
  `- 上市时间：${synthesis.productInput.pdc.launchDate.evidenceStatus}，只保留决策门槛，不生成日期。`,
  `- 待补证据清单：${renderMissingInputs(synthesis.missingInputs, 12)}。`,
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
    `问题：${question}`,
    `解析规划对象：${resolvedLabel}`,
    `分析口径：${contextLine || "当前筛选条件"}`,
    resolution.conflictNotice ? `冲突提示：${resolution.conflictNotice}` : "",
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
    line("PDC 边界", `${text(synthesis.productInput.pdc.projectValue)}；ROI=${synthesis.productInput.pdc.roi.evidenceStatus}；上市时间=${synthesis.productInput.pdc.launchDate.evidenceStatus}`),
    line("LCM / 退出条件", `${text(synthesis.productInput.lcm.lifecycleStage)}；${text(synthesis.productInput.lcm.migrationStrategy)}；若证据门槛、客户场景、验证门槛或 source_required 项无法补齐，则降级、观察或退出。`),
    "",
    renderEvidenceBoundarySection(synthesis),
  ].filter(Boolean);

  return sections.join("\n\n");
}
