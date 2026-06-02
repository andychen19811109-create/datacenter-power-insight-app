import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  LayoutDashboard,
  BarChart2,
  Box,
  Cpu,
  Building2,
  Download,
  Info,
  X,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  BookOpen,
  Database,
} from "lucide-react";

const SOURCE_REGISTRY = {
  iea: {
    id: "iea",
    name: "IEA Energy and AI",
    title: "Energy Demand from AI",
    sourceType: "公开报告",
    url: "https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai",
    publishedAt: "2025",
    accessedAt: "2026-05-15",
    reliability: "高",
    usedFor: "全球数据中心用电需求",
    caveat: "Base Case 预测值受政策、芯片效率、并网能力与 AI 采用速度影响。",
    isOfficial: true,
  },
  nvidia: {
    id: "nvidia",
    name: "NVIDIA 官方资料",
    title: "Building the 800 VDC Ecosystem",
    sourceType: "公司公开资料",
    url: "https://developer.nvidia.com/blog/building-the-800-vdc-ecosystem-for-efficient-scalable-ai-factories/",
    publishedAt: "2025",
    accessedAt: "2026-05-15",
    reliability: "高",
    usedFor: "800VDC / AI Factory 架构演进",
    caveat: "代表头部 GPU 生态的前沿架构方向，不代表全行业平均成熟度。",
    isOfficial: true,
  },
  grandview: {
    id: "grandview",
    name: "Grand View Research",
    title: "Data Center Power Market Size & Trends",
    sourceType: "公开市场报告",
    url: "https://www.grandviewresearch.com/industry-analysis/data-center-power-market",
    publishedAt: "2024",
    accessedAt: "2026-05-15",
    reliability: "中高",
    usedFor: "狭义数据中心电力设备市场",
    caveat: "市场报告口径以 data center power equipment 为主，不覆盖全部电网与液冷投资。",
    isOfficial: true,
  },
  ocp: {
    id: "ocp",
    name: "Open Compute Project",
    title: "Rack & Power Project",
    sourceType: "行业组织",
    url: "https://www.opencompute.org/projects/rack-and-power",
    publishedAt: "2025",
    accessedAt: "2026-05-15",
    reliability: "高",
    usedFor: "开放机架、供电架构与标准化趋势",
    caveat: "行业标准落地通常滞后于头部厂商私有部署。",
    isOfficial: true,
  },
  uptime: {
    id: "uptime",
    name: "Uptime Institute",
    title: "Global Data Center Survey",
    sourceType: "行业组织 / 公开报告",
    url: "https://uptimeinstitute.com",
    publishedAt: "2025",
    accessedAt: "2026-05-15",
    reliability: "高",
    usedFor: "电力约束、数据中心运营与液冷采用判断",
    caveat: "样本偏向大型及专业化数据中心。",
    isOfficial: true,
  },
  ashrae: {
    id: "ashrae",
    name: "ASHRAE TC 9.9",
    title: "Data Center Thermal Guidelines",
    sourceType: "行业组织",
    url: "https://tc0909.ashraetcs.org",
    publishedAt: "2024",
    accessedAt: "2026-05-15",
    reliability: "高",
    usedFor: "热管理、液冷、数据中心温控约束",
    caveat: "标准和指南更新通常滞后于最前沿 AI 集群部署。",
    isOfficial: true,
  },
  vertiv: {
    id: "vertiv",
    name: "Vertiv 官方资料",
    title: "AI Data Center Solutions",
    sourceType: "公司公开资料",
    url: "https://www.vertiv.com/en-us/solutions/ai-data-center/",
    publishedAt: "2025",
    accessedAt: "2026-05-15",
    reliability: "高",
    usedFor: "液冷、电源系统、AI 数据中心基础设施公司评价",
    caveat: "存在厂商立场，应与第三方报告交叉验证。",
    isOfficial: true,
  },
  schneider: {
    id: "schneider",
    name: "Schneider Electric 官方资料",
    title: "Data Center Science Center / Galaxy / AI-ready",
    sourceType: "公司公开资料",
    url: "https://www.se.com",
    publishedAt: "2025",
    accessedAt: "2026-05-15",
    reliability: "高",
    usedFor: "UPS、中低压配电、AI-ready 数据中心",
    caveat: "存在厂商立场。",
    isOfficial: true,
  },
  eaton: {
    id: "eaton",
    name: "Eaton 官方资料",
    title: "Data Center Power",
    sourceType: "公司公开资料",
    url: "https://www.eaton.com/us/en-us/markets/data-centers.html",
    publishedAt: "2025",
    accessedAt: "2026-05-15",
    reliability: "高",
    usedFor: "UPS、配电、中压设备与北美电力基础设施",
    caveat: "存在厂商立场。",
    isOfficial: true,
  },
  huawei: {
    id: "huawei",
    name: "Huawei Digital Power",
    title: "Data Center Facility Solutions",
    sourceType: "公司公开资料",
    url: "https://digitalpower.huawei.com/en/data-center-facility/",
    publishedAt: "2025",
    accessedAt: "2026-05-15",
    reliability: "高",
    usedFor: "模块化 UPS、一体化电力模块、微模块",
    caveat: "存在厂商立场，且海外市场受地缘因素影响。",
    isOfficial: true,
  },
  delta: {
    id: "delta",
    name: "Delta Electronics 官方资料",
    title: "Data Center Power Solutions",
    sourceType: "公司公开资料",
    url: "https://www.deltaww.com",
    publishedAt: "2025",
    accessedAt: "2026-05-15",
    reliability: "高",
    usedFor: "PSU、UPS、HVDC 与 800VDC 供应链评价",
    caveat: "存在厂商立场。",
    isOfficial: true,
  },
  infineon: {
    id: "infineon",
    name: "Infineon 官方资料",
    title: "Power Semiconductors for AI Data Centers",
    sourceType: "公司公开资料",
    url: "https://www.infineon.com",
    publishedAt: "2025",
    accessedAt: "2026-05-15",
    reliability: "高",
    usedFor: "GaN / SiC / eFuse / 电源控制",
    caveat: "存在厂商立场。",
    isOfficial: true,
  },
  renesas: {
    id: "renesas",
    name: "Renesas 官方资料",
    title: "Data Center Power Solutions",
    sourceType: "公司公开资料",
    url: "https://www.renesas.com",
    publishedAt: "2025",
    accessedAt: "2026-05-15",
    reliability: "高",
    usedFor: "电源控制、800VDC 参考架构",
    caveat: "存在厂商立场。",
    isOfficial: true,
  },
  navitas: {
    id: "navitas",
    name: "Navitas 官方资料",
    title: "GaNFast Power ICs",
    sourceType: "公司公开资料",
    url: "https://navitassemi.com",
    publishedAt: "2025",
    accessedAt: "2026-05-15",
    reliability: "高",
    usedFor: "GaN / SiC 电源器件",
    caveat: "公司体量较小，技术路线需持续验证。",
    isOfficial: true,
  },
  expert: {
    id: "expert",
    name: "Expert-curated Prototype Data",
    title: "DataCenterPowerInsight 专家整理",
    sourceType: "专家整理",
    url: "",
    publishedAt: "2026",
    accessedAt: "2026-05-15",
    reliability: "中",
    usedFor: "综合判断、评分、客户痛点与产品建议",
    caveat: "原型演示数据，正式商用需接入经核实的数据库/API。",
    isOfficial: false,
  },
};

const FILTER_OPTIONS = {
  role: ["高管", "投资者", "市场", "产品", "研发"],
  region: ["全球", "中国", "北美", "欧洲", "亚太"],
  customer: ["全部", "云服务商", "第三方数据中心", "电信运营商", "金融", "制造业", "能源与电力", "政府", "边缘计算"],
  application: ["全部", "AI 训练集群", "AI 推理集群", "超大规模数据中心", "第三方托管数据中心", "存量改造", "新建 AI Factory", "边缘数据中心"],
  track: ["全部", "UPS", "模块化 UPS", "HVDC", "800VDC", "液冷", "BBU", "变压器", "开关柜", "GaN/SiC", "SST", "一体化电力模块", "微模块"],
  time: ["2025", "2026", "2027", "2030"],
};

const KPI_DATA = [
  { id: "kpi1", title: "全球数据中心用电需求", value: "945 TWh", subValue: "IEA 2030 Base Case，2024 约 415 TWh", sourceRef: "iea", confidence: "高", methodology: "反映数据中心作为电力系统负荷的扩张趋势，不等同于设备市场规模。", caveat: "预测基准包含传统 IT，AI 增量占比仍在动态变化。" },
  { id: "kpi2", title: "狭义数据中心电力设备市场", value: "717.6 亿美元", subValue: "2033 年预测，CAGR 15.7%", sourceRef: "grandview", confidence: "中高", methodology: "偏向 UPS、PDU、母线、服务等 data center power market，不包含全部电网投资、液冷和上游能源基础设施。", caveat: "不同咨询机构统计边界不同。" },
  { id: "kpi3", title: "头部云厂商 AI Capex", value: ">3000 亿美元", subValue: "2025 年 Top 3 合计代理变量", sourceRef: "expert", confidence: "中高", methodology: "AI 基础设施投资强度的代理变量，包含 GPU、服务器、网络、土建与机电。", caveat: "不应直接等同于电力设备收入。" },
  { id: "kpi4", title: "高密 AI 机架功率演进", value: "500kW - 1MW", subValue: "下一代集群前沿目标", sourceRef: "nvidia", confidence: "中高", methodology: "驱动 800VDC、液冷、BBU 和高功率密度 PSU 需求的底层物理约束。", caveat: "当前主流落地仍低于 1MW，需避免过度外推。" },
];

const CHART_DATA = [
  { year: "2024", power: 415, yoy: 15.0 },
  { year: "2025", power: 480, yoy: 15.7 },
  { year: "2026", power: 560, yoy: 16.7 },
  { year: "2027", power: 650, yoy: 16.1 },
  { year: "2028", power: 740, yoy: 13.8 },
  { year: "2029", power: 840, yoy: 13.5 },
  { year: "2030", power: 945, yoy: 12.5 },
];

const MARKET_LAYERS = [
  { layer: "狭义电力设备市场", tracks: ["UPS", "模块化 UPS", "HVDC"], desc: "低密、存量、金融、工业等场景仍有需求，但新建高密 AI 数据中心增长弹性下降。", sourceRef: "grandview" },
  { layer: "AI 数据中心电力基础设施", tracks: ["800VDC", "GaN/SiC", "SST"], desc: "围绕高功率密度、减少转换级数、降低铜耗和提升端到端效率的架构迁移机会。", sourceRef: "nvidia" },
  { layer: "热管理与液冷市场", tracks: ["液冷"], desc: "100kW+ 机架驱动的基础设施刚需，冷板式优先放量，浸没式仍需验证。", sourceRef: "ashrae" },
  { layer: "电网接入与中压设备", tracks: ["变压器", "开关柜"], desc: "并网排期、中压设备交期和园区配电能力成为 AIDC 建设瓶颈。", sourceRef: "expert" },
  { layer: "电网友好型资产", tracks: ["BBU"], desc: "BBU 从被动备电向削峰填谷、需求侧响应和电网互动资产演进。", sourceRef: "expert" },
  { layer: "快速交付与边缘设施", tracks: ["一体化电力模块", "微模块"], desc: "预制化交付，缩短建设周期，适用于存量改造与边缘节点。", sourceRef: "huawei" },
];

const REGION_INSIGHTS = {
  全球: { demandDriver: "AI 军备竞赛与大模型训练", gridConstraint: "并网、变压器和中压设备供应链约束", keyCustomers: "超大规模云厂商、Colo", opportunityTracks: ["800VDC", "液冷", "变压器"], entryRisk: "供应链产能与地缘政治" },
  中国: { demandDriver: "算电协同政策与国产算力集群", gridConstraint: "东部绿电稀缺，西部源网荷储协同要求上升", keyCustomers: "互联网巨头、运营商、政务云", opportunityTracks: ["液冷", "一体化电力模块", "微模块", "HVDC"], entryRisk: "政策合规、价格战与项目回款" },
  北美: { demandDriver: "头部云厂商新建 AI Factory", gridConstraint: "并网排期和中压设备交期", keyCustomers: "Microsoft, Meta, Google, AWS", opportunityTracks: ["800VDC", "变压器", "GaN/SiC"], entryRisk: "本地制造要求与供应链安全" },
  欧洲: { demandDriver: "数据主权与绿色数据中心", gridConstraint: "PUE/CUE、碳排放与园区电力容量约束", keyCustomers: "Colo、政府、金融", opportunityTracks: ["液冷", "BBU", "SST"], entryRisk: "环保合规门槛高" },
  亚太: { demandDriver: "云服务外溢与区域智算中心下沉", gridConstraint: "部分市场电网基础薄弱", keyCustomers: "区域云、Colo、边缘节点", opportunityTracks: ["模块化 UPS", "微模块", "一体化电力模块"], entryRisk: "市场碎片化" },
};

const CUSTOMER_PAIN_POINTS = [
  { customer: "云服务商", applications: ["AI 训练集群", "超大规模数据中心", "新建 AI Factory"], currentPain: "单机柜功率激增导致散热和配电同时承压；新建园区并网容量受限。", buyingCriteria: "PUE、交付速度、TCO、生态兼容", affectedTracks: ["800VDC", "液冷", "变压器", "开关柜", "GaN/SiC"], marketTalkTrack: "主打端到端高密架构、低 PUE、快速交付和头部生态兼容。", sourceRef: "uptime", confidence: "高" },
  { customer: "第三方数据中心", applications: ["第三方托管数据中心", "存量改造"], currentPain: "存量机房承接 AI 算力客户困难，改造 CAPEX 与停机窗口敏感。", buyingCriteria: "改造成本、空间利用率、租户兼容性", affectedTracks: ["液冷", "模块化 UPS", "微模块", "一体化电力模块"], marketTalkTrack: "提供风液混合、柔性扩容、分阶段升级方案。", sourceRef: "expert", confidence: "中高" },
  { customer: "电信运营商", applications: ["超大规模数据中心", "边缘数据中心"], currentPain: "绿电消纳、PUE 考核和源网荷储协同压力上升。", buyingCriteria: "合规性、调度接口、生命周期成本", affectedTracks: ["HVDC", "BBU", "一体化电力模块", "微模块"], marketTalkTrack: "强调算电协同、电网友好、预制化交付和运维可管。", sourceRef: "expert", confidence: "中高" },
  { customer: "金融", applications: ["存量改造", "边缘数据中心"], currentPain: "可靠性和安全性优先，向高密 AI 演进较慢但稳定性要求极高。", buyingCriteria: "2N 冗余、可维护性、国产化、服务能力", affectedTracks: ["UPS", "模块化 UPS", "微模块"], marketTalkTrack: "主打成熟高可靠、信创适配、低风险改造。", sourceRef: "expert", confidence: "中高" },
  { customer: "制造业", applications: ["边缘数据中心", "存量改造"], currentPain: "厂区环境复杂，对电能质量、抗干扰和无人值守要求高。", buyingCriteria: "工业级防护、抗扰动、免维护", affectedTracks: ["UPS", "变压器", "微模块"], marketTalkTrack: "强调工业级电能质量和边缘节点快速交付。", sourceRef: "expert", confidence: "中高" },
  { customer: "能源与电力", applications: ["边缘数据中心"], currentPain: "调度中心/变电站空间受限，需要与主网和储能系统协同。", buyingCriteria: "电网兼容、长寿命、调度接口", affectedTracks: ["UPS", "BBU", "一体化电力模块", "SST"], marketTalkTrack: "主打电网友好和长生命周期。", sourceRef: "expert", confidence: "中" },
  { customer: "政府", applications: ["存量改造", "第三方托管数据中心"], currentPain: "预算受限且合规要求高，对 PUE、信创和数据安全敏感。", buyingCriteria: "政策合规、信创、低 PUE、可审计", affectedTracks: ["微模块", "液冷", "模块化 UPS"], marketTalkTrack: "强调信创合规、节能改造和可审计运维。", sourceRef: "expert", confidence: "中高" },
  { customer: "边缘计算", applications: ["边缘数据中心", "AI 推理集群"], currentPain: "空间受限、部署分散、无人值守和维护成本高。", buyingCriteria: "占地、预制化、远程运维", affectedTracks: ["微模块", "一体化电力模块", "BBU", "模块化 UPS"], marketTalkTrack: "主打预制化、极简交付和智能无人运维。", sourceRef: "expert", confidence: "中高" },
];

const PRODUCT_OPPORTUNITIES = [
  { track: "UPS", category: "基础盘", targetCustomers: ["金融", "制造业", "能源与电力", "政府"], applications: ["存量改造", "边缘数据中心"], regionRelevance: ["全球", "中国", "亚太"], drive: "传统高可靠备电", diff: "工频高可靠、国产化、服务网络", specs: "2N 架构，高防护等级", roadmapStage: "2025-2026", risk: "高密新建场景被架构替代", action: "维持利润率，向模块化和服务化演进", marketAttractiveness: "中", technicalFeasibility: "高", competitionIntensity: "高", supplyChainMaturity: "高", customerUrgency: "中", recommendedPriority: "维持", sourceRef: "expert", confidence: "中高", caveat: "新建 AI 项目弹性下降" },
  { track: "模块化 UPS", category: "基础盘", targetCustomers: ["第三方数据中心", "政府", "边缘计算"], applications: ["第三方托管数据中心", "边缘数据中心"], regionRelevance: ["全球", "中国", "欧洲", "亚太"], drive: "柔性扩容与极简交付", diff: "高功率密度模块、热插拔、快速维护", specs: "单模块 100kW+", roadmapStage: "2025-2026", risk: "价格战和 HVDC 替代压力", action: "提升单模块功率并强化维护效率", marketAttractiveness: "中高", technicalFeasibility: "高", competitionIntensity: "高", supplyChainMaturity: "高", customerUrgency: "高", recommendedPriority: "重点投入", sourceRef: "huawei", confidence: "高", caveat: "高密 AI 新建项目需观察架构迁移" },
  { track: "HVDC", category: "增长盘", targetCustomers: ["电信运营商", "云服务商"], applications: ["超大规模数据中心"], regionRelevance: ["中国", "亚太"], drive: "减少逆变环节并提升效率", diff: "240/336V 稳定运行和国内生态经验", specs: "240/336V DC", roadmapStage: "2025-2026", risk: "海外接受度低", action: "深耕国内基本盘，拓展算电协同场景", marketAttractiveness: "中", technicalFeasibility: "高", competitionIntensity: "中", supplyChainMaturity: "高", customerUrgency: "中", recommendedPriority: "选择性投入", sourceRef: "expert", confidence: "中高", caveat: "国际生态不统一" },
  { track: "800VDC", category: "战略盘", targetCustomers: ["云服务商"], applications: ["AI 训练集群", "新建 AI Factory"], regionRelevance: ["全球", "北美"], drive: "降低电流、减少铜材、支持高密机架", diff: "高压直流保护、连接器生态、端到端系统集成", specs: "800V DC，高压直流保护", roadmapStage: "2027-2030", risk: "生态封闭、标准未定", action: "紧跟 NVIDIA / OCP 参考架构，预研保护器件与母线系统", marketAttractiveness: "高", technicalFeasibility: "中", competitionIntensity: "低", supplyChainMaturity: "低", customerUrgency: "中高", recommendedPriority: "必争", sourceRef: "nvidia", confidence: "高", caveat: "高度依赖头部 GPU 生态技术路线" },
  { track: "液冷", category: "增长盘", targetCustomers: ["云服务商", "第三方数据中心"], applications: ["AI 训练集群", "新建 AI Factory"], regionRelevance: ["全球", "北美", "中国", "欧洲"], drive: "100kW+ 机架物理散热刚需", diff: "防漏液快接头、高可靠 CDU、运维体系", specs: "冷板式、浸没式、CDU", roadmapStage: "2026-2027", risk: "运维复杂、标准化不足", action: "锁定核心部件产能并参与标准化", marketAttractiveness: "高", technicalFeasibility: "中高", competitionIntensity: "中高", supplyChainMaturity: "中", customerUrgency: "高", recommendedPriority: "必争", sourceRef: "ashrae", confidence: "高", caveat: "浸没式商业化仍需验证" },
  { track: "BBU", category: "增长盘", targetCustomers: ["云服务商", "电信运营商", "能源与电力"], applications: ["AI 训练集群", "超大规模数据中心"], regionRelevance: ["全球", "中国", "欧洲", "北美"], drive: "削峰填谷与电网互动", diff: "高倍率电芯、BMS、调度软件接口", specs: "高倍率 LFP，需求侧响应接口", roadmapStage: "2026-2027", risk: "消防和商业模式约束", action: "开发源网荷储协同软件", marketAttractiveness: "高", technicalFeasibility: "中高", competitionIntensity: "中", supplyChainMaturity: "中高", customerUrgency: "中高", recommendedPriority: "重点投入", sourceRef: "expert", confidence: "中", caveat: "收益模式受地区电力市场约束" },
  { track: "变压器", category: "基础盘", targetCustomers: ["云服务商", "能源与电力"], applications: ["新建 AI Factory", "超大规模数据中心"], regionRelevance: ["全球", "北美", "欧洲", "中国"], drive: "AIDC 并网容量激增", diff: "干式高能效、抗谐波、短交期", specs: "高能效等级，大容量", roadmapStage: "2025-2026", risk: "原材料和交期", action: "锁定上游产能，缩短交付周期", marketAttractiveness: "高", technicalFeasibility: "高", competitionIntensity: "中", supplyChainMaturity: "中高", customerUrgency: "高", recommendedPriority: "必争", sourceRef: "expert", confidence: "中高", caveat: "受铜和硅钢片周期影响" },
  { track: "开关柜", category: "基础盘", targetCustomers: ["云服务商"], applications: ["新建 AI Factory", "超大规模数据中心"], regionRelevance: ["全球", "北美", "中国"], drive: "中压配电需求上升", diff: "智能化、小型化、电弧防护", specs: "中压智能配电", roadmapStage: "2025-2026", risk: "同质化竞争", action: "与变压器打包形成预制化方案", marketAttractiveness: "中高", technicalFeasibility: "高", competitionIntensity: "高", supplyChainMaturity: "高", customerUrgency: "中高", recommendedPriority: "重点投入", sourceRef: "expert", confidence: "中高", caveat: "需具备成套系统集成能力" },
  { track: "GaN/SiC", category: "战略盘", targetCustomers: ["云服务商", "制造业"], applications: ["AI 训练集群"], regionRelevance: ["全球", "北美", "欧洲", "中国"], drive: "高频高效，缩小电源体积", diff: "宽禁带器件可靠性与热设计", specs: "8.5kW+ AI PSU", roadmapStage: "2026-2027", risk: "晶圆成本和良率", action: "加速 AI PSU 导入验证", marketAttractiveness: "高", technicalFeasibility: "中高", competitionIntensity: "中", supplyChainMaturity: "中", customerUrgency: "高", recommendedPriority: "重点投入", sourceRef: "infineon", confidence: "高", caveat: "受上游晶圆产能与良率影响" },
  { track: "SST", category: "战略盘", targetCustomers: ["云服务商", "能源与电力"], applications: ["新建 AI Factory"], regionRelevance: ["全球", "北美", "欧洲"], drive: "中压直转直流与空间优化", diff: "高压高频拓扑控制", specs: "MV AC to DC", roadmapStage: "2027-2030", risk: "技术极度不成熟", action: "保持预研和原型验证", marketAttractiveness: "中", technicalFeasibility: "低", competitionIntensity: "低", supplyChainMaturity: "低", customerUrgency: "低", recommendedPriority: "预研", sourceRef: "expert", confidence: "低", caveat: "不可作为短期业绩支撑" },
  { track: "一体化电力模块", category: "增长盘", targetCustomers: ["云服务商", "电信运营商", "边缘计算"], applications: ["新建 AI Factory", "超大规模数据中心", "边缘数据中心"], regionRelevance: ["全球", "中国", "亚太"], drive: "缩短交付周期，节省占地", diff: "预制化、铜排直连、集成监控", specs: "1.2MW-2.4MW 预制舱", roadmapStage: "2026-2027", risk: "吊装运输和工程交付", action: "推广标准化 SKU 并强化交付能力", marketAttractiveness: "中高", technicalFeasibility: "高", competitionIntensity: "中", supplyChainMaturity: "中高", customerUrgency: "高", recommendedPriority: "重点投入", sourceRef: "huawei", confidence: "高", caveat: "需要强工程整合能力" },
  { track: "微模块", category: "基础盘", targetCustomers: ["边缘计算", "金融", "政府", "制造业"], applications: ["边缘数据中心", "存量改造"], regionRelevance: ["全球", "中国", "亚太"], drive: "一站式快速部署", diff: "动环集成、冷电一体、无人运维", specs: "PUE < 1.3，快速拼装", roadmapStage: "2025-2026", risk: "定制化成本高", action: "推行标准化 SKU", marketAttractiveness: "中", technicalFeasibility: "高", competitionIntensity: "高", supplyChainMaturity: "高", customerUrgency: "中", recommendedPriority: "维持", sourceRef: "huawei", confidence: "高", caveat: "单项目体量较小" },
];

const TECH_MATRIX = [
  { tech: "UPS", maturity: "高", standard: "高", risk: "低", costRisk: "低", rnd: "降本增效、工频可靠性", action: "维持存量市场", caveat: "高密新建项目弹性下降", sourceRef: "expert" },
  { tech: "模块化 UPS", maturity: "高", standard: "高", risk: "低", costRisk: "低", rnd: "单模块功率密度、热插拔可靠性", action: "迭代高密模块", caveat: "面临 HVDC 竞争压力", sourceRef: "expert" },
  { tech: "HVDC", maturity: "高", standard: "中高", risk: "低", costRisk: "低", rnd: "系统可靠性与配电保护", action: "深耕国内大厂", caveat: "国际生态不统一", sourceRef: "expert" },
  { tech: "800VDC", maturity: "中", standard: "低", risk: "高", costRisk: "中", rnd: "绝缘、电弧、连接器、DC 保护、标准化", action: "紧跟头部芯片生态验证", caveat: "仍处于标准和生态形成期", sourceRef: "nvidia" },
  { tech: "液冷", maturity: "中高", standard: "中", risk: "中", costRisk: "中", rnd: "冷板、CDU、快接头、防漏液、冷却液管理", action: "扩充能力并参与标准化", caveat: "浸没式仍偏早期", sourceRef: "ashrae" },
  { tech: "BBU", maturity: "中", standard: "低", risk: "高", costRisk: "中", rnd: "热失控、消防、BMS、调度策略", action: "开发源网荷储协同软件", caveat: "商业模式待验证", sourceRef: "expert" },
  { tech: "GaN/SiC", maturity: "中高", standard: "中", risk: "中", costRisk: "高", rnd: "高频热设计、良率、可靠性", action: "导入 AI PSU 验证", caveat: "成本和良率仍是约束", sourceRef: "navitas" },
  { tech: "SST", maturity: "低", standard: "低", risk: "高", costRisk: "高", rnd: "高压宽禁带器件与拓扑控制", action: "概念验证", caveat: "不可夸大成熟度", sourceRef: "expert" },
  { tech: "一体化电力模块", maturity: "高", standard: "中", risk: "低", costRisk: "低", rnd: "预制化、铜排连接、集成监控", action: "推出标准化大功率 SKU", caveat: "定制化工程成本较高", sourceRef: "huawei" },
  { tech: "微模块", maturity: "高", standard: "高", risk: "低", costRisk: "低", rnd: "快速部署、动环集成、无人运维", action: "标准化交付", caveat: "单项目价值量较小", sourceRef: "huawei" },
  { tech: "变压器", maturity: "高", standard: "高", risk: "低", costRisk: "中", rnd: "高能效、干式散热、抗谐波", action: "扩充产能和交付能力", caveat: "交期成为核心瓶颈", sourceRef: "expert" },
  { tech: "开关柜", maturity: "高", standard: "高", risk: "低", costRisk: "低", rnd: "智能化、小型化、电弧防护", action: "与中压系统集成化交付", caveat: "同质化竞争严重", sourceRef: "expert" },
];

const COMPANIES = [
  { id: 1, name: "Vertiv", nameZh: "维谛技术", region: "北美", track: ["UPS", "液冷", "800VDC", "微模块"], desc: "端到端数据中心供电与热管理基础设施供应商。", score: 9.5, opportunity: "全栈液冷与 800VDC 解决方案", limitation: "产能扩张速度与估值", roleFit: ["投资者", "高管", "产品", "市场", "研发"], scoreExplanation: "赛道匹配度、AI 暴露度和系统集成能力强。", sourceRef: "vertiv", confidence: "高", caveat: "估值处于历史高位" },
  { id: 2, name: "Schneider Electric", nameZh: "施耐德电气", region: "欧洲", track: ["UPS", "模块化 UPS", "变压器", "开关柜"], desc: "全球 UPS 与数据中心基础设施领导者。", score: 8.5, opportunity: "中压设备与 UPS 打包能力", limitation: "800VDC 节奏偏保守", roleFit: ["市场", "高管", "投资者"], scoreExplanation: "全球渠道强，AI 专属架构需持续观察。", sourceRef: "schneider", confidence: "高", caveat: "大企业转型节奏较稳" },
  { id: 3, name: "Eaton", nameZh: "伊顿", region: "北美", track: ["UPS", "变压器", "开关柜"], desc: "全球关键电源与配电巨头。", score: 8.0, opportunity: "北美电网约束下的配电基础设施", limitation: "液冷布局较弱", roleFit: ["市场", "高管", "产品"], scoreExplanation: "北美中压配电机会明确。", sourceRef: "eaton", confidence: "高", caveat: "依赖北美基础设施周期" },
  { id: 4, name: "Huawei Digital Power", nameZh: "华为数字能源", region: "中国", track: ["模块化 UPS", "一体化电力模块", "微模块", "液冷"], desc: "中国及全球数据中心电源解决方案重要供应商。", score: 8.5, opportunity: "预制化与算电协同", limitation: "地缘政治影响北美扩张", roleFit: ["产品", "市场", "高管", "研发"], scoreExplanation: "中国市场强势，一体化模块能力突出。", sourceRef: "huawei", confidence: "高", caveat: "海外市场受限" },
  { id: 5, name: "Delta Electronics", nameZh: "台达电子", region: "亚太", track: ["UPS", "HVDC", "800VDC", "GaN/SiC"], desc: "从部件到系统的全栈电力电子供应商。", score: 9.0, opportunity: "AI PSU 与 800VDC 系统", limitation: "系统级热管理整合度", roleFit: ["投资者", "产品", "研发"], scoreExplanation: "深入电力电子和头部生态供应链。", sourceRef: "delta", confidence: "高", caveat: "竞争来自多类代工和系统商" },
  { id: 6, name: "Infineon", nameZh: "英飞凌", region: "欧洲", track: ["GaN/SiC"], desc: "全球功率半导体领导者。", score: 9.0, opportunity: "AI PSU 高频高密化", limitation: "晶圆成本和半导体周期", roleFit: ["研发", "投资者", "产品"], scoreExplanation: "底层功率器件核心受益者。", sourceRef: "infineon", confidence: "高", caveat: "受半导体周期影响" },
  { id: 7, name: "Navitas", nameZh: "纳微", region: "北美", track: ["GaN/SiC"], desc: "GaN / SiC 器件垂直玩家。", score: 8.5, opportunity: "GaN 在 AI PSU 的渗透", limitation: "公司体量相对较小", roleFit: ["研发", "投资者"], scoreExplanation: "高频高压细分技术弹性高。", sourceRef: "navitas", confidence: "高", caveat: "单一技术路线风险" },
  { id: 8, name: "Renesas", nameZh: "瑞萨", region: "亚太", track: ["GaN/SiC", "800VDC"], desc: "电源控制与参考架构影响者。", score: 8.0, opportunity: "电源控制 IC 标准化", limitation: "非系统集成商", roleFit: ["研发", "产品"], scoreExplanation: "对电源控制方案有参考价值。", sourceRef: "renesas", confidence: "高", caveat: "生态话语权受限" },
  { id: 9, name: "EVE Energy", nameZh: "亿纬锂能", region: "中国", track: ["BBU"], desc: "数据中心备电与负载平滑的电池基础供应商。", score: 7.5, opportunity: "BBU 削峰填谷", limitation: "价格战激烈", roleFit: ["产品", "市场", "投资者"], scoreExplanation: "受益于数据中心储能化趋势。", sourceRef: "expert", confidence: "中", caveat: "电池行业竞争红海" },
  { id: 10, name: "Zhongheng Electric", nameZh: "中恒电气", region: "中国", track: ["HVDC"], desc: "中国 HVDC 商业化代表厂商。", score: 7.0, opportunity: "国内互联网大厂 HVDC 扩容", limitation: "客户集中度", roleFit: ["市场", "投资者"], scoreExplanation: "国内 HVDC 基本盘较稳。", sourceRef: "expert", confidence: "中", caveat: "800VDC 布局需观察" },
  { id: 11, name: "JSTI", nameZh: "金盘科技", region: "中国", track: ["变压器"], desc: "数据中心上游电力基础设施关键供应商。", score: 7.5, opportunity: "电网扩容与算力中心新建", limitation: "原材料影响毛利", roleFit: ["高管", "投资者", "市场"], scoreExplanation: "高确定性基础设施供给侧机会。", sourceRef: "expert", confidence: "中高", caveat: "产能扩张和交付节奏重要" },
  { id: 12, name: "Mingyang Electric", nameZh: "明阳电气", region: "中国", track: ["开关柜", "变压器"], desc: "支撑电网侧与设施侧电力基础设施。", score: 7.0, opportunity: "源网荷储协同", limitation: "竞争格局分散", roleFit: ["高管", "投资者"], scoreExplanation: "受益于算电协同和电网扩容。", sourceRef: "expert", confidence: "中", caveat: "品牌溢价较低" },
  { id: 13, name: "Kehua", nameZh: "科华数据", region: "中国", track: ["UPS", "微模块"], desc: "国内 UPS 与微模块供应商。", score: 7.0, opportunity: "金融政企信创与微模块", limitation: "高密 AI 声量较小", roleFit: ["市场", "产品"], scoreExplanation: "稳健国内市场参与者。", sourceRef: "expert", confidence: "中", caveat: "高端 AI 市场渗透率需验证" },
  { id: 14, name: "Kstar", nameZh: "科士达", region: "中国", track: ["UPS", "一体化电力模块"], desc: "数据中心及新能源双轮驱动供应商。", score: 6.5, opportunity: "高性价比模块化供电", limitation: "品牌溢价较低", roleFit: ["市场", "产品"], scoreExplanation: "主打性价比和渠道。", sourceRef: "expert", confidence: "中", caveat: "主要面向中低端市场" },
  { id: 15, name: "Envic", nameZh: "英维克", region: "中国", track: ["液冷"], desc: "国内数据中心精密温控及液冷系统龙头。", score: 8.5, opportunity: "冷板式液冷 CDU 及管路", limitation: "缺乏配电能力", roleFit: ["投资者", "产品", "市场"], scoreExplanation: "国内液冷赛道核心受益者。", sourceRef: "expert", confidence: "中高", caveat: "服务器厂商自研液冷可能带来竞争" },
];

const INTELLIGENCE_SIGNALS = [
  { title: "NVIDIA 推动 800VDC 架构生态", date: "2026-05-10", sourceRef: "nvidia", targetRoles: ["产品", "研发", "高管"], affectedTracks: ["800VDC", "GaN/SiC"], regionRelevance: ["全球", "北美"], impact: "高", conf: "高", expertInterpretation: "800VDC 指向下一代 AI Factory 的供电架构迁移，要求 PSU、母线、保护器件和连接器生态升级。", trackingAction: "跟踪 OCP 标准化、PSU 量产和头部云厂商导入节奏。", caveat: "标准和商用落地仍有延期可能" },
  { title: "液冷从可选方案转向高密 AI 集群刚需", date: "2026-05-05", sourceRef: "uptime", targetRoles: ["高管", "市场", "产品"], affectedTracks: ["液冷"], regionRelevance: ["全球", "北美", "中国", "欧洲"], impact: "高", conf: "高", expertInterpretation: "100kW+ 机架使风冷边界被快速突破，冷板式液冷成为高密集群主流路径。", trackingAction: "布局 CDU、快接头、防漏液和运维服务能力。", caveat: "浸没式液冷 TCO 仍需验证" },
  { title: "电网接入与中压设备成为扩张瓶颈", date: "2026-04-28", sourceRef: "expert", targetRoles: ["投资者", "高管", "市场"], affectedTracks: ["变压器", "开关柜"], regionRelevance: ["全球", "北美", "欧洲"], impact: "中高", conf: "中高", expertInterpretation: "并网排期和中压设备交期约束正在抬升变压器、开关柜和预制化配电方案的确定性。", trackingAction: "锁定上游产能，推广预制化变电站和成套方案。", caveat: "交期数据需要项目级数据库校验" },
  { title: "BBU 从备电走向削峰填谷和电网互动资产", date: "2026-04-20", sourceRef: "expert", targetRoles: ["产品", "市场", "研发"], affectedTracks: ["BBU", "一体化电力模块"], regionRelevance: ["全球", "中国", "欧洲"], impact: "中", conf: "中", expertInterpretation: "BBU 容量不再只是停电兜底，而可能参与削峰填谷和需求响应。", trackingAction: "研发 BMS、EMS 和电网友好型调度接口。", caveat: "收益模式受地区电力市场约束" },
  { title: "算电协同政策推动供配电基础设施升级", date: "2026-04-15", sourceRef: "expert", targetRoles: ["高管", "市场"], affectedTracks: ["一体化电力模块", "HVDC", "BBU"], regionRelevance: ["中国"], impact: "中高", conf: "中高", expertInterpretation: "国内算力基础设施需要更强的绿电消纳、负荷调节和源网荷储协同能力。", trackingAction: "强化算电协同、低碳合规和调度接口卖点。", caveat: "政策执行力度需持续观察" },
  { title: "传统 UPS 在低密和存量场景仍有需求", date: "2026-04-10", sourceRef: "expert", targetRoles: ["市场", "产品"], affectedTracks: ["UPS", "模块化 UPS"], regionRelevance: ["全球", "中国", "亚太"], impact: "低", conf: "中高", expertInterpretation: "传统 AC UPS 不应被简单判死刑，金融、工业、政企和边缘场景仍有稳定需求。", trackingAction: "维持基本盘利润率，推动模块化和服务化升级。", caveat: "价格战压力持续" },
  { title: "一体化电力模块和微模块在快速交付中展现优势", date: "2026-04-05", sourceRef: "huawei", targetRoles: ["市场", "产品"], affectedTracks: ["一体化电力模块", "微模块"], regionRelevance: ["全球", "中国", "亚太"], impact: "中", conf: "高", expertInterpretation: "预制化方案可缩短部署周期，适合存量改造、边缘节点和部分超大规模项目。", trackingAction: "推行标准化 SKU，降低定制化工程比例。", caveat: "现场工程交付能力是关键" },
];

const source = (ref) => SOURCE_REGISTRY[ref] || SOURCE_REGISTRY.expert;

const scoreProducts = (filters) =>
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

const getFilteredCustomerPainPoints = (filters) => {
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

const getFilteredCompanies = (filters) =>
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

const getFilteredIntelligence = (filters) =>
  INTELLIGENCE_SIGNALS.map((s) => {
    let matchScore = 0;
    let matchType = "间接相关";
    if (filters.track !== "全部" && s.affectedTracks.includes(filters.track)) { matchScore += 10; matchType = "赛道直接相关"; }
    if (s.targetRoles.includes(filters.role)) matchScore += 5;
    if (filters.region !== "全球" && s.regionRelevance.includes(filters.region)) matchScore += 2;
    if (filters.track === "全部") { matchScore += 1; matchType = "全局展示"; }
    return { ...s, matchScore, matchType };
  }).sort((a, b) => b.matchScore - a.matchScore);

const getFilteredTechMatrix = (filters) =>
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

const getSegmentSummary = (filters) => `${filters.role} | ${filters.region} | ${filters.customer} | ${filters.application} | ${filters.track} | ${filters.time}`;

const getRoleInsight = (filters) => {
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

const Card = ({ children, className = "", noPadding = false }) => <div className={`card ${noPadding ? "no-padding" : ""} ${className}`}>{children}</div>;
const Badge = ({ text, type = "cyan" }) => <span className={`badge ${type}`}>{text}</span>;

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16, fontWeight: "bold" }}>{title}</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
};

const SourceDetail = ({ item }) => {
  const s = source(item.sourceRef);
  return (
    <div style={{ lineHeight: 1.8, fontSize: 13 }}>
      <p><strong>来源：</strong>{s.name} [{s.sourceType}] {s.isOfficial && <Badge text="官方" type="green" />}</p>
      <p><strong>可靠性：</strong>{s.reliability}</p>
      {item.confidence && <p><strong>本条置信度：</strong>{item.confidence}</p>}
      <p><strong>用途：</strong>{s.usedFor}</p>
      <p><strong>局限性：</strong>{item.caveat || s.caveat}</p>
      {item.methodology && <p><strong>方法论：</strong>{item.methodology}</p>}
      {s.url && <p><strong>URL：</strong><a href={s.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-cyan)" }}>{s.url}</a></p>}
    </div>
  );
};

const SourceRegistryContent = () => (
  <div style={{ lineHeight: 1.8, fontSize: 12, color: "var(--text-secondary)" }}>
    <p className="mb-4">当前为专家整理的 prototype data，正式商用需接入可审计数据库/API。以下是本原型使用的公开来源与口径。</p>
    {Object.values(SOURCE_REGISTRY).map((s) => (
      <div key={s.id} className="mb-4" style={{ padding: 12, background: "var(--bg-base)", border: "1px solid var(--border-color)", borderRadius: 4 }}>
        <div style={{ fontWeight: "bold", color: "var(--text-primary)" }}>{s.name}</div>
        <div>类型：{s.sourceType} {s.isOfficial && <Badge text="官方" type="green" />}</div>
        <div>用途：{s.usedFor}</div>
        <div>可靠性：{s.reliability}</div>
        <div>局限性：{s.caveat}</div>
        {s.url && <div>URL：<a href={s.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent-cyan)" }}>{s.url}</a></div>}
      </div>
    ))}
  </div>
);

const OverviewTab = ({ filters, openModal }) => {
  const products = scoreProducts(filters);
  const topOpps = [...new Set(products.slice(0, 4).map((p) => p.track))];
  const topRisks = [...new Set(products.map((p) => p.risk).filter(Boolean))].slice(0, 4);
  const recs = [...new Set(products.slice(0, 3).map((p) => p.diff))];
  return (
    <>
      <h2 className="section-title">当前细分市场摘要</h2>
      <Card>
        <div className="text-muted mb-2">{getSegmentSummary(filters)}</div>
        <div className="grid-3">
          <div><strong className="text-cyan">Top 机会赛道</strong><ul style={{ paddingLeft: 16 }}>{topOpps.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div><strong style={{ color: "var(--accent-amber)" }}>Top 核心风险</strong><ul style={{ paddingLeft: 16 }}>{topRisks.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div><strong style={{ color: "var(--accent-green)" }}>推荐产品方向</strong><ul style={{ paddingLeft: 16 }}>{recs.map((x) => <li key={x}>{x}</li>)}</ul></div>
        </div>
      </Card>
      <div className="flex-between mb-2">
        <h2 className="section-title" style={{ marginBottom: 0 }}>宏观市场指标</h2>
        <button className="btn" onClick={() => openModal("数据源与口径总览", <SourceRegistryContent />)}><Database size={12} /> 数据源说明</button>
      </div>
      <div className="grid-2">
        {KPI_DATA.map((kpi) => (
          <Card key={kpi.id}>
            <div className="card-header">
              <span className="card-title">{kpi.title}</span>
              <button className="btn-icon" onClick={() => openModal("数据口径与来源说明", <SourceDetail item={kpi} />)}><Info size={16} /></button>
            </div>
            <div className="card-value">{kpi.value}</div>
            <div className="text-muted">{kpi.subValue}</div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="card-header"><span className="card-title">IEA Base Case: 全球数据中心用电需求 (TWh)</span></div>
        <div style={{ height: 300, width: "100%", minHeight: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="year" stroke="var(--text-muted)" fontSize={12} />
              <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--accent-cyan)" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: "var(--bg-panel)", borderColor: "var(--border-color)", color: "#fff" }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left" type="monotone" dataKey="power" name="用电需求 (TWh)" stroke="#9ca3af" strokeWidth={2} dot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="yoy" name="同比增速 (%)" stroke="var(--accent-cyan)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-muted" style={{ textAlign: "center", marginTop: 8 }}>数据来源：IEA Energy and AI / Expert interpolation</div>
      </Card>
    </>
  );
};

const MarketTab = ({ filters, openModal }) => {
  const pains = getFilteredCustomerPainPoints(filters);
  const region = REGION_INSIGHTS[filters.region];
  return (
    <>
      <h2 className="section-title">区域洞察 ({filters.region})</h2>
      <Card>
        <div className="grid-2" style={{ fontSize: 12, lineHeight: 1.8 }}>
          <div><strong className="text-cyan">需求驱动：</strong>{region.demandDriver}</div>
          <div><strong style={{ color: "var(--accent-amber)" }}>电网约束：</strong>{region.gridConstraint}</div>
          <div><strong>关键客户：</strong>{region.keyCustomers}</div>
          <div><strong style={{ color: "var(--accent-green)" }}>主要受益赛道：</strong>{region.opportunityTracks.join(", ")}</div>
          <div style={{ gridColumn: "1 / -1" }}><strong style={{ color: "var(--accent-red)" }}>进入风险：</strong>{region.entryRisk}</div>
        </div>
      </Card>
      <h2 className="section-title">客户痛点与需求矩阵</h2>
      <Card noPadding>
        <div className="table-wrapper"><table><thead><tr><th>客户类型</th><th>当前痛点</th><th>采购关注点</th><th>影响赛道</th><th>市场话术</th><th>来源</th></tr></thead><tbody>
          {pains.map((p) => <tr key={p.customer}><td><strong>{p.customer}</strong><div className="text-muted">{p.matchType}</div></td><td>{p.currentPain}</td><td className="text-cyan">{p.buyingCriteria}</td><td>{p.affectedTracks.join(", ")}</td><td>{p.marketTalkTrack}</td><td><button className="btn-icon" onClick={() => openModal("口径说明", <SourceDetail item={p} />)}><Info size={16} /></button></td></tr>)}
        </tbody></table></div>
      </Card>
      <h2 className="section-title">市场分层视图</h2>
      <div className="grid-2">
        {MARKET_LAYERS.map((layer) => {
          const relevant = filters.track === "全部" || layer.tracks.includes(filters.track);
          return <Card key={layer.layer} className={relevant ? "" : "opacity-50"}><div className="card-header"><div className="card-title">{layer.layer} {!relevant && <span className="text-muted">(不相关)</span>}</div><button className="btn-icon" onClick={() => openModal("口径说明", <SourceDetail item={layer} />)}><Info size={16} /></button></div><div>{layer.tracks.map((t) => <Badge key={t} text={t} type={filters.track === t ? "red" : "cyan"} />)}</div><div className="text-muted">{layer.desc}</div></Card>;
        })}
      </div>
    </>
  );
};

const ProductTab = ({ filters, openModal }) => {
  const products = scoreProducts(filters);
  return (
    <>
      <h2 className="section-title">产品路线图建议</h2>
      <Card noPadding><div className="table-wrapper"><table><thead><tr><th>时间窗口</th><th>机会类型</th><th>建议动作</th></tr></thead><tbody>
        <tr style={{ backgroundColor: filters.time === "2025" || filters.time === "2026" ? "var(--bg-card-hover)" : "transparent" }}><td>2025-2026</td><td>短期订单机会</td><td>主推模块化 UPS、微模块、一体化电力模块，抢占存量改造与快速交付。</td></tr>
        <tr style={{ backgroundColor: filters.time === "2026" || filters.time === "2027" ? "var(--bg-card-hover)" : "transparent" }}><td>2026-2027</td><td>架构迁移机会</td><td>完善冷板液冷、BBU、GaN/SiC PSU，并准备 800VDC 兼容方案。</td></tr>
        <tr style={{ backgroundColor: filters.time === "2030" ? "var(--bg-card-hover)" : "transparent" }}><td>2027-2030</td><td>平台/生态机会</td><td>探索 800VDC、SST、源网荷储调度和端到端系统集成。</td></tr>
      </tbody></table></div></Card>
      <h2 className="section-title">产品机会卡</h2>
      <div className="grid-2">
        {products.map((p) => <Card key={p.track}><div className="card-header"><div><div className="card-title">{p.track}</div><div className="text-muted">{p.matchType}</div></div><Badge text={p.category} type={p.category === "战略盘" ? "cyan" : p.category === "增长盘" ? "green" : "gray"} /></div><div style={{ fontSize: 12 }}><strong>差异化方向：</strong>{p.diff}</div><div className="text-muted"><strong>驱动因素：</strong>{p.drive}</div><button className="btn mt-2" onClick={() => openModal(`赛道详情: ${p.track}`, <SourceDetail item={p} />)}>查看赛道详情 <ChevronRight size={12} /></button></Card>)}
      </div>
      <h2 className="section-title">产品立项优先级表</h2>
      <Card noPadding><div className="table-wrapper"><table><thead><tr><th>赛道</th><th>市场吸引力</th><th>技术可行性</th><th>竞争强度</th><th>客户紧迫性</th><th>推荐优先级</th><th>来源</th></tr></thead><tbody>
        {PRODUCT_OPPORTUNITIES.map((p) => <tr key={p.track} style={{ opacity: filters.track === "全部" || p.track === filters.track ? 1 : 0.45 }}><td>{p.track}</td><td>{p.marketAttractiveness}</td><td>{p.technicalFeasibility}</td><td>{p.competitionIntensity}</td><td>{p.customerUrgency}</td><td><Badge text={p.recommendedPriority} type={p.recommendedPriority === "必争" ? "red" : p.recommendedPriority === "重点投入" ? "cyan" : "gray"} /></td><td><button className="btn-icon" onClick={() => openModal("口径说明", <SourceDetail item={p} />)}><Info size={16} /></button></td></tr>)}
      </tbody></table></div></Card>
    </>
  );
};

const TechnologyTab = ({ filters, openModal }) => {
  const matrix = getFilteredTechMatrix(filters);
  const roadmap = [
    ["传统 AC UPS", "存量主导", "低密、存量、金融、工业等场景仍有需求。"],
    ["48V DC 配电", "广泛商用", "当前主流机架内配电方案，但高密场景电流瓶颈明显。"],
    ["240/336V HVDC", "中国主导", "国内互联网和运营商具备较多应用经验。"],
    ["800VDC", "高潜力方向", "减少转换级数、降低电流、减少铜材，仍处标准形成期。"],
    ["SST / Grid-to-Chip", "早期探索", "长期潜力存在，但可靠性、成本和标准化风险高。"],
  ];
  return (
    <>
      <h2 className="section-title">供电架构演进路线图</h2>
      <Card>{roadmap.map(([step, status, desc], i) => <div key={step} style={{ display: "flex", gap: 12, marginBottom: 14 }}><div style={{ width: 24, height: 24, borderRadius: "50%", border: `2px solid ${i >= 3 ? "var(--accent-cyan)" : "var(--border-light)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div><div><strong>{step}</strong> <Badge text={status} type={i === 3 ? "cyan" : i === 4 ? "amber" : "gray"} /><div className="text-muted">{desc}</div></div></div>)}</Card>
      <h2 className="section-title">技术成熟度矩阵</h2>
      <Card noPadding><div className="table-wrapper"><table><thead><tr><th>技术</th><th>成熟度</th><th>标准化</th><th>风险</th><th>研发关注点</th><th>操作</th></tr></thead><tbody>
        {matrix.map((t) => <tr key={t.tech}><td><strong>{t.tech}</strong><div className="text-muted">{t.matchType}</div></td><td><Badge text={t.maturity} type={t.maturity === "高" ? "green" : t.maturity === "低" ? "red" : "amber"} /></td><td>{t.standard}</td><td>{t.risk} / {t.costRisk}</td><td className="text-cyan">{t.rnd}</td><td><button className="btn" onClick={() => openModal(`技术说明: ${t.tech}`, <SourceDetail item={t} />)}>详情</button></td></tr>)}
      </tbody></table></div></Card>
    </>
  );
};

const CompaniesTab = ({ filters, openModal }) => {
  const companies = getFilteredCompanies(filters);
  const signals = getFilteredIntelligence(filters);
  return (
    <>
      <h2 className="section-title">核心产业链公司</h2>
      <div className="grid-2">
        {companies.map((c) => <Card key={c.id}><div className="card-header"><div><strong>{c.name}</strong><div className="text-muted">{c.nameZh} | {c.region}</div><div className="text-cyan" style={{ fontSize: 10 }}>{c.matchType}</div></div><div style={{ textAlign: "right" }}><div className="text-cyan" style={{ fontWeight: "bold", fontSize: 16 }}>{c.score}</div><div className="text-muted">战略评分</div></div></div><div>{c.track.map((t) => <Badge key={t} text={t} />)}</div><div className="text-muted" style={{ minHeight: 40 }}>{c.desc}</div><div className="flex-between mt-2"><span className="text-muted">风险: {c.limitation}</span><button className="btn" onClick={() => openModal(c.name, <SourceDetail item={c} />)}>详情</button></div></Card>)}
      </div>
      <h2 className="section-title" style={{ marginTop: 32 }}>市场情报信号</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {signals.map((s) => <Card key={s.title}><div className="flex-between mb-2"><span className="text-muted">{s.date} | {source(s.sourceRef).name} [{source(s.sourceRef).sourceType}]</span><div className="flex-center"><Badge text={`影响: ${s.impact}`} type={s.impact === "高" ? "red" : s.impact === "中高" ? "amber" : "cyan"} /><button className="btn-icon" onClick={() => openModal("口径说明", <SourceDetail item={{ ...s, confidence: s.conf }} />)}><Info size={14} /></button></div></div><div className="card-title">{s.title} <span className="text-cyan" style={{ fontSize: 10 }}>({s.matchType})</span></div><div className="text-muted"><strong>专家解读：</strong>{s.expertInterpretation}</div><div className="text-cyan" style={{ fontSize: 12 }}><strong>建议动作：</strong>{s.trackingAction}</div></Card>)}
      </div>
    </>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: "", content: null });
  const [filters, setFilters] = useState({ role: "高管", region: "全球", customer: "全部", application: "全部", track: "全部", time: "2026" });
  const openModal = (title, content) => setModalConfig({ isOpen: true, title, content });
  const closeModal = () => setModalConfig({ isOpen: false, title: "", content: null });
  const resetFilters = () => setFilters({ role: "高管", region: "全球", customer: "全部", application: "全部", track: "全部", time: "2026" });
  const exportData = () => {
    const exportObj = {
      timestamp: new Date().toISOString(),
      filters,
      roleInsight: getRoleInsight(filters),
      currentSegmentSummary: getSegmentSummary(filters),
      regionInsight: REGION_INSIGHTS[filters.region],
      filteredMarketLayers: MARKET_LAYERS.filter((l) => filters.track === "全部" || l.tracks.includes(filters.track)),
      filteredTrackMarketData: scoreProducts(filters),
      filteredCustomerPainPoints: getFilteredCustomerPainPoints(filters),
      filteredProductOpportunities: scoreProducts(filters),
      filteredTechMatrix: getFilteredTechMatrix(filters),
      filteredCompanies: getFilteredCompanies(filters),
      filteredIntelligence: getFilteredIntelligence(filters),
      sourceRegistry: SOURCE_REGISTRY,
    };
    const dataStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportObj, null, 2))}`;
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", "datacenter_insight_export.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const navItems = [
    { id: "overview", icon: LayoutDashboard, label: "总览" },
    { id: "market", icon: BarChart2, label: "市场" },
    { id: "product", icon: Box, label: "产品" },
    { id: "technology", icon: Cpu, label: "技术" },
    { id: "companies", icon: Building2, label: "公司与情报" },
  ];
  const render = () => {
    if (activeTab === "market") return <MarketTab filters={filters} openModal={openModal} />;
    if (activeTab === "product") return <ProductTab filters={filters} openModal={openModal} />;
    if (activeTab === "technology") return <TechnologyTab filters={filters} openModal={openModal} />;
    if (activeTab === "companies") return <CompaniesTab filters={filters} openModal={openModal} />;
    return <OverviewTab filters={filters} openModal={openModal} />;
  };
  return (
    <div className="app-container">
      <aside className="sidebar">
        <div style={{ padding: 20, borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: 16, fontWeight: "bold" }}>DataCenter PowerInsight</div>
          <div className="text-muted">AI 数据中心电力电子洞察</div>
        </div>
        <nav style={{ flex: 1, paddingTop: 16 }}>{navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${activeTab === item.id ? "active" : ""}`} onClick={() => setActiveTab(item.id)}><Icon size={18} />{item.label}</button>; })}</nav>
      </aside>
      <main className="main-content">
        <header className="header">
          <div><h1 className="header-title">DataCenter PowerInsight</h1><div className="header-subtitle">AI 数据中心电力电子与基础设施市场洞察驾驶舱</div></div>
          <div style={{ display: "flex", gap: 8 }}><button className="btn" onClick={() => openModal("数据源与口径总览", <SourceRegistryContent />)}><Database size={14} /><span className="md-inline">数据源</span></button><button className="btn btn-primary" onClick={exportData}><Download size={14} /><span className="md-inline">导出</span></button></div>
        </header>
        <div className="filter-bar">
          <div className="flex-between mb-2"><span className="text-muted">当前视角: <strong style={{ color: "var(--text-primary)" }}>{filters.role}</strong> | 更新时间: 2026-05-15</span><div className="flex-center"><span style={{ color: "var(--accent-green)", display: "flex", alignItems: "center", fontSize: 11 }}><CheckCircle2 size={12} style={{ marginRight: 4 }} />Expert-curated data</span><button onClick={resetFilters} className="btn-icon"><RotateCcw size={12} /> 重置</button></div></div>
          <div className="filter-grid">{Object.entries(FILTER_OPTIONS).map(([key, options]) => { const labels = { role: "用户角色", region: "区域", customer: "客户类型", application: "应用场景", track: "赛道", time: "时间窗口" }; return <div key={key} className="filter-group"><label className="filter-label">{labels[key]}</label><select className="filter-select" value={filters[key]} onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}>{options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}</select></div>; })}</div>
        </div>
        <div className="scroll-area">
          <div className="role-insight-box"><div className="section-title"><BookOpen size={16} />动态执行摘要</div><div>{getRoleInsight(filters)}</div></div>
          {render()}
          <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--border-color)", fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center" }}><Info size={12} style={{ marginRight: 6, flexShrink: 0 }} />当前为专家整理的原型演示数据。正式版本需接入经核实的市场数据库、Firestore 数据表或 API 情报源。</div>
        </div>
        <nav className="bottom-nav">{navItems.map((item) => { const Icon = item.icon; return <button key={item.id} className={`nav-item ${activeTab === item.id ? "active" : ""}`} onClick={() => setActiveTab(item.id)}><Icon size={20} /><span style={{ fontSize: 10 }}>{item.label}</span></button>; })}</nav>
      </main>
      <Modal isOpen={modalConfig.isOpen} onClose={closeModal} title={modalConfig.title}>{modalConfig.content}</Modal>
    </div>
  );
}
