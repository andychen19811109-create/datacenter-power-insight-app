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

import {
  SOURCE_REGISTRY,
  FILTER_OPTIONS,
  KPI_DATA,
  CHART_DATA,
  MARKET_LAYERS,
  REGION_INSIGHTS,
} from "./data/marketData";
import {
  source,
  scoreProducts,
  getFilteredCustomerPainPoints,
  getFilteredCompanies,
  getFilteredIntelligence,
  getFilteredTechMatrix,
  getSegmentSummary,
  getRoleInsight,
} from "./utils/insightUtils";


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
