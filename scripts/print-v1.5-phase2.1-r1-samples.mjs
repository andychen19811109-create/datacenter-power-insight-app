import { analyzeAskQuestion } from "../src/utils/insightEngine.js";

const samples = [
  ["S1 液冷 Roadmap", { track: "液冷", role: "产品", region: "全球", customer: "全部", application: "全部", time: "2026" }, "请输出液冷产品2026/2027/2028 Roadmap。"],
  ["S2 SST Roadmap", { track: "SST", role: "产品", region: "全球", customer: "全部", application: "全部", time: "2026" }, "请输出SST产品2026/2027/2028 Roadmap。"],
  ["S3 SST selected / 液冷 Roadmap", { track: "SST", role: "产品", region: "全球", customer: "全部", application: "全部", time: "2026" }, "请输出液冷产品2026/2027/2028 Roadmap。"],
  ["S4 Portfolio allocation", { track: "全部", role: "高管", region: "全球", customer: "全部", application: "全部", time: "2026" }, "全部赛道下，应该如何做产品组合投资取舍？"],
  ["S5 液冷 TAM ROI", { track: "液冷", role: "投资者", region: "全球", customer: "全部", application: "全部", time: "2026" }, "请给出液冷产品的TAM、ROI、目标客户和上市时间。"],
  ["S6 SST TAM ROI", { track: "SST", role: "投资者", region: "全球", customer: "全部", application: "全部", time: "2026" }, "请给出SST的ROI、TAM、上市时间和目标客户。"],
];

for (const [label, filters, question] of samples) {
  const result = analyzeAskQuestion(question, filters);
  console.log(`\n===== ${label} =====`);
  console.log(result.outputContract.fullText);
}
