const UNKNOWN = "Unknown";

const normalizeText = (value) => String(value || "").trim();
const lower = (value) => normalizeText(value).toLowerCase();
const valueOrUnknown = (value) => normalizeText(value) || UNKNOWN;

const firstMatch = (text, patterns) => {
  const normalized = lower(text);
  return patterns.find(({ terms }) => terms.some((term) => normalized.includes(lower(term)))) || null;
};

const extractPowerClass = (question) => {
  const match = String(question || "").match(/\b(\d+(?:\.\d+)?)\s*(kW|KW|kw|MW|mw)\b/);
  if (!match) return UNKNOWN;
  const unit = match[2].toLowerCase() === "mw" ? "MW" : "kW";
  return `${match[1]}${unit}`;
};

const extractInvestmentHorizon = (question) => {
  const normalized = lower(question);
  if (/(18\s*[-–]\s*24\s*(months?|个月)?)/i.test(question)) return "18-24 months";
  if (normalized.includes("未来5年") || normalized.includes("未来 5 年") || normalized.includes("5 years") || normalized.includes("five years")) return "5 years";
  return UNKNOWN;
};

const extractRegion = (question, filters) => {
  const match = firstMatch(question, [
    { value: "North America", terms: ["north america", "北美", "美国", "u.s.", "us market"] },
    { value: "China", terms: ["china", "中国", "国内"] },
    { value: "Europe", terms: ["europe", "欧洲"] },
    { value: "Global", terms: ["global", "全球"] },
  ]);
  return match?.value || valueOrUnknown(filters.region);
};

const extractCustomerType = (question, filters) => {
  const match = firstMatch(question, [
    { value: "High-density Colocation", terms: ["colo", "colocation", "托管", "digital realty"] },
    { value: "Hyperscale AI operator", terms: ["hyperscale", "超大规模"] },
    { value: "AI factory operator", terms: ["ai factory", "ai工厂", "ai 工厂"] },
  ]);
  return match?.value || valueOrUnknown(filters.customer);
};

const extractApplication = (question, filters) => {
  const match = firstMatch(question, [
    { value: "AI Data Center", terms: ["ai data center", "aidc", "ai数据中心", "ai 数据中心", "智算中心"] },
    { value: "AI Factory", terms: ["ai factory", "ai工厂", "ai 工厂"] },
    { value: "AI Colocation", terms: ["ai colocation", "ai colo"] },
    { value: "AI training data center", terms: ["ai training data center", "training cluster", "训练集群"] },
  ]);
  return match?.value || valueOrUnknown(filters.application);
};

const extractVendorProfile = (question) => {
  const match = firstMatch(question, [
    { value: "Kstar", terms: ["kstar", "科士达"] },
    { value: "Vertiv", terms: ["vertiv", "维谛"] },
    { value: "Schneider Electric", terms: ["schneider", "施耐德"] },
    { value: "Eaton", terms: ["eaton", "伊顿"] },
    { value: "Huawei Digital Power", terms: ["huawei", "华为"] },
  ]);
  return match?.value || UNKNOWN;
};

const vendorCapabilityBaselineFrom = (vendorProfile) => {
  if (vendorProfile === UNKNOWN) return UNKNOWN;
  return `${vendorProfile} mentioned; verified capability baseline remains Unknown unless supplied by M1 evidence or user-provided context.`;
};

export const resolveM1DecisionContext = ({ question, filters = {}, eligibility }) => {
  const productObject = eligibility?.askState?.primaryEntity?.displayName || "UPS";
  const vendorProfile = extractVendorProfile(question);
  return {
    productObject,
    application: extractApplication(question, filters),
    customerType: extractCustomerType(question, filters),
    region: extractRegion(question, filters),
    powerClass: extractPowerClass(question),
    investmentHorizon: extractInvestmentHorizon(question),
    vendorProfile,
    vendorCapabilityBaseline: vendorCapabilityBaselineFrom(vendorProfile),
  };
};

export const resolveM1PresentationPerspective = (filters = {}) => valueOrUnknown(filters.role);
