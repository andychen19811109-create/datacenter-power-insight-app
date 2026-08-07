import React, { useRef, useState } from "react";
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
  MessageSquare,
  Send,
  Sparkles,
} from "lucide-react";

import {
  SOURCE_REGISTRY,
  FILTER_OPTIONS,
  KPI_DATA,
  CHART_DATA,
} from "./data/marketData";
import {
  source,
} from "./utils/insightUtils";
import { buildInsightContext } from "./utils/insightContext";
import { generateStructuredAskPowerInsightAnswer } from "./utils/insightEngine";
import { runAskShadowAdapter } from "./ask/runtime/runAskShadowAdapter";
import { runAskPreviewAdapter } from "./ask/runtime/runAskPreviewAdapter";
import M1ConfirmedInputPanel from "./ask/m1/M1ConfirmedInputPanel";
import { submitM1ConfirmedInputToDecisionCore } from "./ask/m1/m1ConfirmedInputFlow";
import M1ProfessionalDemo from "./ask/m1/demo/M1ProfessionalDemo";
import AskPowerInsightExperience from "./ask/vnext/AskPowerInsightExperience";

const Card = ({ children, className = "", noPadding = false }) => (
  <div className={`card ${noPadding ? "no-padding" : ""} ${className}`}>
    {children}
  </div>
);

const Badge = ({ text, type = "cyan" }) => (
  <span className={`badge ${type}`}>{text}</span>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: 16, fontWeight: "bold" }}>{title}</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
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
      <p>
        <strong>来源：</strong>
        {s.name} [{s.sourceType}] {s.isOfficial && <Badge text="官方" type="green" />}
      </p>
      <p>
        <strong>可靠性：</strong>
        {s.reliability}
      </p>
      {item.confidence && (
        <p>
          <strong>本条置信度：</strong>
          {item.confidence}
        </p>
      )}
      <p>
        <strong>用途：</strong>
        {s.usedFor}
      </p>
      <p>
        <strong>局限性：</strong>
        {item.caveat || s.caveat}
      </p>
      {item.methodology && (
        <p>
          <strong>方法论：</strong>
          {item.methodology}
        </p>
      )}
      {s.url && (
        <p>
          <strong>URL：</strong>
          <a
            href={s.url}
            target="_blank"
            rel="noreferrer"
            style={{ color: "var(--accent-cyan)" }}
          >
            {s.url}
          </a>
        </p>
      )}
    </div>
  );
};

const SourceRegistryContent = () => (
  <div style={{ lineHeight: 1.8, fontSize: 12, color: "var(--text-secondary)" }}>
    <p className="mb-4">
      当前为专家整理的 prototype data，正式商用需接入可审计数据库/API。以下是本原型使用的公开来源与口径。
    </p>
    {Object.values(SOURCE_REGISTRY).map((s) => (
      <div
        key={s.id}
        className="mb-4"
        style={{
          padding: 12,
          background: "var(--bg-base)",
          border: "1px solid var(--border-color)",
          borderRadius: 4,
        }}
      >
        <div style={{ fontWeight: "bold", color: "var(--text-primary)" }}>
          {s.name}
        </div>
        <div>
          类型：{s.sourceType} {s.isOfficial && <Badge text="官方" type="green" />}
        </div>
        <div>用途：{s.usedFor}</div>
        <div>可靠性：{s.reliability}</div>
        <div>局限性：{s.caveat}</div>
        {s.url && (
          <div>
            URL：
            <a
              href={s.url}
              target="_blank"
              rel="noreferrer"
              style={{ color: "var(--accent-cyan)" }}
            >
              {s.url}
            </a>
          </div>
        )}
      </div>
    ))}
  </div>
);

const OverviewTab = ({ context, openModal, onAskQuestion }) => {
  const { normalizedFilters: filters, productContext, evidenceContext, opportunityRadar, riskRadar, recommendedAskQuestions } = context;
  const products = productContext.opportunities;
  const topOpps = [...new Set(products.slice(0, 4).map((p) => p.track))];
  const topRisks = [...new Set(products.map((p) => p.risk).filter(Boolean))].slice(0, 4);
  const recs = [...new Set(products.slice(0, 3).map((p) => p.diff))];

  return (
    <>
      <h2 className="section-title">当前细分市场摘要</h2>
      <Card>
        <div className="text-muted mb-2">{context.segmentLabel}</div>
        <div className="decision-callout">{context.executiveBrief}</div>
        <div className="grid-3">
          <div>
            <strong className="text-cyan">Top 机会赛道</strong>
            <ul style={{ paddingLeft: 16 }}>
              {topOpps.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong style={{ color: "var(--accent-amber)" }}>Top 核心风险</strong>
            <ul style={{ paddingLeft: 16 }}>
              {topRisks.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div>
            <strong style={{ color: "var(--accent-green)" }}>推荐产品方向</strong>
            <ul style={{ paddingLeft: 16 }}>
              {recs.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </Card>

      <h2 className="section-title">动态指标上下文</h2>
      <div className="grid-2">
        {evidenceContext.segmentKpis.map((item) => (
          <Card key={item.id}>
            <div className="card-header">
              <span className="card-title">{item.label}</span>
              <Badge text={`证据: ${item.evidenceLevel}`} type="gray" />
            </div>
            <div>{item.interpretation}</div>
            <div className="text-muted mt-2">置信度：{item.confidence}；{item.caveat}</div>
          </Card>
        ))}
      </div>

      <h2 className="section-title">Opportunity Radar</h2>
      <div className="grid-2">
        {opportunityRadar.slice(0, 4).map((item) => (
          <Card key={item.track}>
            <div className="flex-between">
              <strong>{item.track}</strong>
              <Badge text={`${item.level} · ${item.score}/100`} type={item.level === "L4" ? "red" : item.level === "L3" ? "cyan" : "gray"} />
            </div>
            <div className="text-muted mt-2">{item.priority}；{item.reasons.slice(0, 2).join("，")}</div>
            <div className="score-boundary">相对优先级评分，不代表市场规模</div>
          </Card>
        ))}
      </div>

      <h2 className="section-title">Risk Radar</h2>
      <Card>
        <div className="risk-grid">
          {riskRadar.map((item) => (
            <div key={`${item.category}-${item.track}`} className="risk-item">
              <Badge text={`${item.category} · ${item.severity}`} type={item.severity === "高" ? "red" : "amber"} />
              <strong>{item.track}</strong>
              <span className="text-muted">{item.risk}</span>
            </div>
          ))}
        </div>
      </Card>

      <h2 className="section-title">Recommended Ask Questions</h2>
      <div className="grid-2">
        {recommendedAskQuestions.map((question) => (
          <Card key={question}>
            <div>{question}</div>
            <button className="btn mt-2" onClick={() => onAskQuestion(question)}>进入 Ask PowerInsight</button>
          </Card>
        ))}
      </div>

      <div className="flex-between mb-2">
        <h2 className="section-title" style={{ marginBottom: 0 }}>
          宏观市场指标
        </h2>
        <button
          className="btn"
          onClick={() => openModal("数据源与口径总览", <SourceRegistryContent />)}
        >
          <Database size={12} /> 数据源说明
        </button>
      </div>

      <div className="grid-2">
        {KPI_DATA.map((kpi) => (
          <Card key={kpi.id}>
            <div className="card-header">
              <span className="card-title">{kpi.title}</span>
              <button
                className="btn-icon"
                onClick={() => openModal("数据口径与来源说明", <SourceDetail item={kpi} />)}
              >
                <Info size={16} />
              </button>
            </div>
            <div className="card-value">{kpi.value}</div>
            <div className="text-muted">{kpi.subValue}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="card-header">
          <span className="card-title">IEA Base Case: 全球数据中心用电需求 (TWh)</span>
        </div>
        <div style={{ height: 300, width: "100%", minHeight: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="year" stroke="var(--text-muted)" fontSize={12} />
              <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={12} />
              <YAxis yAxisId="right" orientation="right" stroke="var(--accent-cyan)" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-panel)",
                  borderColor: "var(--border-color)",
                  color: "#fff",
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="left" type="monotone" dataKey="power" name="用电需求 (TWh)" stroke="#9ca3af" strokeWidth={2} dot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="yoy" name="同比增速 (%)" stroke="var(--accent-cyan)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="text-muted" style={{ textAlign: "center", marginTop: 8 }}>
          数据来源：IEA Energy and AI / Expert interpolation
        </div>
      </Card>
    </>
  );
};

const MarketTab = ({ context, openModal }) => {
  const { normalizedFilters: filters, marketContext } = context;
  const pains = marketContext.painPoints;
  const region = marketContext.regionInsight;

  return (
    <>
      <h2 className="section-title">区域洞察 ({filters.region})</h2>
      <Card>
        <div className="grid-2" style={{ fontSize: 12, lineHeight: 1.8 }}>
          <div>
            <strong className="text-cyan">需求驱动：</strong>
            {region.demandDriver}
          </div>
          <div>
            <strong style={{ color: "var(--accent-amber)" }}>电网约束：</strong>
            {region.gridConstraint}
          </div>
          <div>
            <strong>关键客户：</strong>
            {region.keyCustomers}
          </div>
          <div>
            <strong style={{ color: "var(--accent-green)" }}>主要受益赛道：</strong>
            {region.opportunityTracks.join(", ")}
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <strong style={{ color: "var(--accent-red)" }}>进入风险：</strong>
            {region.entryRisk}
          </div>
        </div>
      </Card>

      <h2 className="section-title">客户痛点与需求矩阵</h2>
      <Card noPadding>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>客户类型</th>
                <th>当前痛点</th>
                <th>采购关注点</th>
                <th>场景匹配度 / 受益机会</th>
                <th>市场话术</th>
                <th>证据</th>
              </tr>
            </thead>
            <tbody>
              {pains.map((p) => (
                <tr key={p.customer}>
                  <td>
                    <strong>{p.customer}</strong>
                    <div className="text-muted">{p.isDirectMatch ? "精确匹配" : "相邻相关"}</div>
                  </td>
                  <td>{p.currentPain}</td>
                  <td className="text-cyan">{p.buyingCriteria}</td>
                  <td>
                    <Badge text={p.contextFit} type={p.contextFit === "高匹配" ? "cyan" : "gray"} />
                    <div>{p.relatedProductOpportunities.map((item) => `${item.track} ${item.level}`).join("、") || p.affectedTracks.join("、")}</div>
                  </td>
                  <td>{p.marketTalkTrack}</td>
                  <td>
                    <div className="text-muted">{p.evidenceLevel}</div>
                    <button className="btn-icon" onClick={() => openModal("口径说明", <SourceDetail item={p} />)}>
                      <Info size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <h2 className="section-title">市场分层视图</h2>
      <div className="grid-2">
        {marketContext.marketLayers.map((layer) => {
          const relevant = true;
          return (
            <Card key={layer.layer} className={relevant ? "" : "opacity-50"}>
              <div className="card-header">
                <div className="card-title">
                  {layer.layer} {!relevant && <span className="text-muted">(不相关)</span>}
                </div>
                <button className="btn-icon" onClick={() => openModal("口径说明", <SourceDetail item={layer} />)}>
                  <Info size={16} />
                </button>
              </div>
              <div>
                {layer.tracks.map((t) => (
                  <Badge key={t} text={t} type={filters.track === t ? "red" : "cyan"} />
                ))}
              </div>
              <div className="text-muted">{layer.desc}</div>
            </Card>
          );
        })}
      </div>
    </>
  );
};

const ProductTab = ({ context, openModal }) => {
  const { normalizedFilters: filters, productContext, marketContext } = context;
  const products = productContext.opportunities;

  return (
    <>
      <h2 className="section-title">产品路线图建议</h2>
      <Card noPadding>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>时间窗口</th>
                <th>机会类型</th>
                <th>建议动作</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 5).map((product) => (
                <tr key={product.track}>
                  <td>{filters.time} / {product.roadmapStage}</td>
                  <td>{product.track} · {product.level}</td>
                  <td>{product.actions0To30} 近期门槛：{product.technicalGate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <h2 className="section-title">产品机会卡</h2>
      <div className="grid-2">
        {products.map((p) => (
          <Card key={p.track}>
            <div className="card-header">
              <div>
                <div className="card-title">{p.track}</div>
                <div className="text-muted">{p.isRelevant ? "当前细分场景直接机会" : "相邻机会"}</div>
              </div>
              <Badge text={p.category} type={p.category === "战略盘" ? "cyan" : p.category === "增长盘" ? "green" : "gray"} />
            </div>
            <div className="investment-level-row">
              <Badge text={`${p.level} · ${p.priority}`} type={p.level === "L4" ? "red" : p.level === "L3" ? "cyan" : "gray"} />
              <span className="text-muted">相对评分 {p.score}/100 · 证据 {p.evidenceLevel}</span>
            </div>
            <div style={{ fontSize: 12 }}>
              <strong>差异化方向：</strong>
              {p.diff}
            </div>
            <div className="text-muted">
              <strong>驱动因素：</strong>
              {p.drive}
            </div>
            <div className="decision-details">
              <div><strong>MVP：</strong>{p.mvp}</div>
              <div><strong>0-30 天：</strong>{p.actions0To30}</div>
              <div><strong>30-90 天：</strong>{p.actions30To90}</div>
              <div><strong>对应痛点：</strong>{marketContext.painPoints.filter((pain) => pain.affectedTracks.includes(p.track)).map((pain) => pain.currentPain).slice(0, 1).join("") || "暂无直接痛点数据"}</div>
              <div><strong>技术门槛：</strong>{p.technicalGate}</div>
              <div><strong>退出条件：</strong>{p.exitConditions}</div>
            </div>
            <button className="btn mt-2" onClick={() => openModal(`赛道详情: ${p.track}`, <SourceDetail item={p} />)}>
              查看赛道详情 <ChevronRight size={12} />
            </button>
          </Card>
        ))}
      </div>

      <h2 className="section-title">产品立项优先级表</h2>
      <Card noPadding>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>赛道</th>
                <th>市场吸引力</th>
                <th>技术可行性</th>
                <th>竞争强度</th>
                <th>客户紧迫性</th>
                <th>推荐优先级</th>
                <th>来源</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.track}>
                  <td>{p.track}</td>
                  <td>{p.marketAttractiveness}</td>
                  <td>{p.technicalFeasibility}</td>
                  <td>{p.competitionIntensity}</td>
                  <td>{p.customerUrgency}</td>
                  <td>
                    <Badge text={`${p.level} · ${p.priority}`} type={p.level === "L4" ? "red" : p.level === "L3" ? "cyan" : "gray"} />
                  </td>
                  <td>
                    <button className="btn-icon" onClick={() => openModal("口径说明", <SourceDetail item={p} />)}>
                      <Info size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
};

const TechnologyTab = ({ context, openModal }) => {
  const { normalizedFilters: filters, technologyContext: matrix } = context;
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
      <Card>
        <div className="decision-callout mb-2">
          当前筛选：{filters.track} / {filters.application} / {filters.time}。技术项按产品机会与相邻路线排序。
        </div>
        {roadmap.map(([step, status, desc], i) => (
          <div key={step} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: "50%",
                border: `2px solid ${i >= 3 ? "var(--accent-cyan)" : "var(--border-light)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <div>
              <strong>{step}</strong>{" "}
              <Badge text={status} type={i === 3 ? "cyan" : i === 4 ? "amber" : "gray"} />
              <div className="text-muted">{desc}</div>
            </div>
          </div>
        ))}
      </Card>

      <h2 className="section-title">技术成熟度矩阵</h2>
      <Card noPadding>
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>技术</th>
                <th>成熟度</th>
                <th>标准化</th>
                <th>风险</th>
                <th>验证门槛 / 替代路线</th>
                <th>产品与客户场景</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((t) => (
                <tr key={t.tech}>
                  <td>
                    <strong>{t.tech}</strong>
                    <div className="text-muted">{t.matchType}</div>
                  </td>
                  <td>
                    <Badge text={t.maturity} type={t.maturity === "高" ? "green" : t.maturity === "低" ? "red" : "amber"} />
                  </td>
                  <td>{t.standard}</td>
                  <td>
                    {t.risk} / {t.costRisk}
                  </td>
                  <td>
                    <div className="text-cyan">{t.validationGate}</div>
                    <div className="text-muted">替代路线：{t.alternativeRoute}</div>
                  </td>
                  <td>
                    <div>{t.relatedProducts.join("、") || "暂无直接产品映射"}</div>
                    <div className="text-muted">{t.customerScenarios.join("、") || "暂无直接数据，仅按赛道和场景推断"}</div>
                  </td>
                  <td>
                    <button className="btn" onClick={() => openModal(`技术说明: ${t.tech}`, <SourceDetail item={t} />)}>
                      详情
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
};

const CompaniesTab = ({ context, openModal }) => {
  const { companyContext, intelligenceContext } = context;
  const companies = companyContext.companies;
  const signals = intelligenceContext.signals;

  return (
    <>
      <h2 className="section-title">核心产业链公司</h2>
      <div className="grid-2">
        {companies.map((c) => (
          <Card key={c.id}>
            <div className="card-header">
              <div>
                <strong>{c.name}</strong>
                <div className="text-muted">
                  {c.nameZh} | {c.region}
                </div>
                <div className="text-cyan" style={{ fontSize: 10 }}>
                  {c.matchType}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="text-cyan" style={{ fontWeight: "bold", fontSize: 16 }}>
                  {c.score}
                </div>
                <div className="text-muted">战略评分</div>
              </div>
            </div>
            <div>
              {c.track.map((t) => (
                <Badge key={t} text={t} />
              ))}
            </div>
            <div className="text-muted" style={{ minHeight: 40 }}>
              {c.desc}
            </div>
            <div className="flex-between mt-2">
              <span className="text-muted">风险: {c.limitation}</span>
              <button className="btn" onClick={() => openModal(c.name, <SourceDetail item={c} />)}>
                详情
              </button>
            </div>
          </Card>
        ))}
      </div>

      <h2 className="section-title" style={{ marginTop: 32 }}>
        市场情报信号
      </h2>
      <Card>
        <div className="flex-between">
          <strong>{intelligenceContext.sourceLabel}</strong>
          <Badge text={`最后更新 ${intelligenceContext.lastUpdated}`} type="gray" />
        </div>
        <div className="text-muted mt-2">后续可接 Firestore / Supabase / API；本轮未连接任何外部数据源。</div>
        {!intelligenceContext.hasDirectMatch && (
          <div className="empty-state">该筛选条件暂无直接情报匹配，以下仅显示相关参考。</div>
        )}
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {signals.map((s) => (
          <Card key={s.title}>
            <div className="flex-between mb-2">
              <span className="text-muted">
                {s.date} | {s.sourceName} [{s.sourceType}] · 证据：{s.evidenceLevel}
              </span>
              <div className="flex-center">
                <Badge text={`影响: ${s.impact}`} type={s.impact === "高" ? "red" : s.impact === "中高" ? "amber" : "cyan"} />
                <button className="btn-icon" onClick={() => openModal("口径说明", <SourceDetail item={{ ...s, confidence: s.conf }} />)}>
                  <Info size={14} />
                </button>
              </div>
            </div>
            <div className="card-title">
              {s.title} <span className="text-cyan" style={{ fontSize: 10 }}>({s.matchType})</span>
            </div>
            <div className="text-muted">
              <strong>专家解读：</strong>
              {s.expertInterpretation}
            </div>
            <div className="text-cyan" style={{ fontSize: 12 }}>
              <strong>建议动作：</strong>
              {s.trackingAction}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
};

const AskPowerInsightTab = ({ context, initialQuestion }) => {
  const filters = context.normalizedFilters;
  const [question, setQuestion] = useState(initialQuestion || "请分析 Vertiv 与华为在 AI 数据中心电源和液冷方向的竞争差异");
  const [answer, setAnswer] = useState(null);
  const [previewState, setPreviewState] = useState({
    status: "idle",
    renderState: null,
    userMessage: "",
    requestedQuestion: "",
    requestedAt: "",
  });
  const shadowDiagnosticsRef = useRef(null);
  const m1SubmissionByInputRef = useRef(new WeakMap());

  const sampleQuestions = [
    "为 CUSTOMER_X 在 REGION_ALPHA 比较 1MW UPS 与 800VDC 在 AI 数据中心受保护负载场景的架构选择，当前处于 concept evaluation，投产时间未知，关键约束未知。",
    "Kstar是否需要花资源开发全新模块化UPS？",
    "Kstar是否需要花资源开发全新一代工业UPS？",
    "Gaming UPS是否值得做？",
    "钠电UPS是否值得投入？",
    "请分析 Vertiv 与华为在 AI 数据中心电源和液冷方向的竞争差异",
    "800VDC 在 AI 数据中心供电架构中的机会和风险是什么？",
    "中国厂商在 MW 级 UPS 与液冷 CDU 领域应该如何做产品规划？",
    "未来 3 年数据中心电力电子最值得投入的赛道有哪些？",
    "从投资者角度看，BBU、液冷、GaN/SiC 哪些方向风险收益更优？",
  ];

  const generateAnswer = () => {
    const legacyAnswer = generateStructuredAskPowerInsightAnswer(question, filters);
    setAnswer(legacyAnswer);
    void runAskShadowAdapter({
      question,
      filters,
      context,
      insightContext: context,
      timestamp: new Date().toISOString(),
      currentPageRoute: "/ask",
      currentPageModule: "ask",
    }).then((result) => {
      shadowDiagnosticsRef.current = result;
    }).catch(() => {});
  };

  const handlePreview = async () => {
    const previewQuestion = String(question || "").trim();
    const previewTimestamp = new Date().toISOString();

    if (!previewQuestion) {
      setPreviewState({
        status: "blocked",
        renderState: null,
        userMessage: "请输入问题后再查看本地新管线预览。",
        requestedQuestion: "",
        requestedAt: previewTimestamp,
      });
      return;
    }

    setPreviewState({
      status: "loading",
      renderState: null,
      userMessage: "正在生成本地新管线预览。",
      requestedQuestion: previewQuestion,
      requestedAt: previewTimestamp,
    });

    try {
      const result = await runAskPreviewAdapter({
        question: previewQuestion,
        filters,
        context,
        insightContext: context,
        timestamp: previewTimestamp,
        currentPageRoute: "/ask",
        currentPageModule: "ask",
      });

      setPreviewState(result);
    } catch {
      setPreviewState({
        status: "error",
        renderState: null,
        userMessage: "当前仅支持本地实验性预览，本次预览暂不可用。",
        requestedQuestion: previewQuestion,
        requestedAt: previewTimestamp,
      });
    }
  };

  const handleM1Confirmed = (confirmedInput) => {
    const existing = confirmedInput && typeof confirmedInput === "object"
      ? m1SubmissionByInputRef.current.get(confirmedInput)
      : null;
    if (existing) return existing;

    const submission = submitM1ConfirmedInputToDecisionCore({
      confirmedInput,
    });
    if (confirmedInput && typeof confirmedInput === "object") {
      m1SubmissionByInputRef.current.set(confirmedInput, submission);
    }
    return submission;
  };

  return (
    <>
      <h2 className="section-title">Ask PowerInsight</h2>

      <Card>
        <div className="card-header">
          <div>
            <div className="card-title">
              <Sparkles size={16} style={{ marginRight: 6 }} />
              AI 数据中心电力电子洞察助手
            </div>
            <div className="text-muted">
              当前为 V1.3 本地结构化决策引擎版：基于当前筛选条件、市场/产品/技术/公司与情报数据，生成结构化决策摘要与完整分析。
            </div>
          </div>
          <Badge text="Prototype Agent" type="cyan" />
        </div>

        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{
            width: "100%",
            minHeight: 110,
            marginTop: 12,
            padding: 12,
            borderRadius: 6,
            border: "1px solid var(--border-color)",
            background: "var(--bg-base)",
            color: "var(--text-primary)",
            resize: "vertical",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        />

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={generateAnswer}>
            <Send size={14} /> 生成分析
          </button>
          <button className="btn" onClick={handlePreview} disabled={previewState.status === "loading"}>
            <Sparkles size={14} /> 生成新管线预览
          </button>
        </div>
        <div className="text-muted mt-2">
          实验性预览：新 Ask Pipeline · 本地新管线预览，不代表默认输出
        </div>
      </Card>

      <M1ConfirmedInputPanel
        question={question}
        onConfirmed={handleM1Confirmed}
      />

      <h2 className="section-title">示例问题</h2>
      <div className="grid-2">
        {sampleQuestions.map((q) => (
          <Card key={q}>
            <div className="text-muted">{q}</div>
            <button className="btn mt-2" onClick={() => setQuestion(q)}>
              使用此问题
            </button>
          </Card>
        ))}
      </div>

      {answer && (
        <>
          <h2 className="section-title">决策摘要卡</h2>
          <Card className="decision-summary-card">
            <div className="flex-between">
              <strong>{answer.oneLineConclusion}</strong>
              <Badge text={`${answer.investmentLevel} · ${answer.priority}`} type={answer.investmentLevel === "L4" ? "red" : answer.investmentLevel === "L3" ? "cyan" : "gray"} />
            </div>
            <div className="text-muted mt-2">置信度：{answer.confidence}</div>
          </Card>

          <h2 className="section-title">快速理解</h2>
          <div className="grid-2">
            <Card><strong>Why now</strong><ul>{answer.whyNow.map((item) => <li key={item}>{item}</li>)}</ul></Card>
            <Card><strong>What to build</strong><div className="mt-2">{answer.whatToBuild}</div></Card>
            <Card><strong>How to enter</strong><div className="mt-2">{answer.howToEnter}</div></Card>
            <Card><strong>Technical gate</strong><div className="mt-2">{answer.technicalGate}</div></Card>
            <Card><strong>Key risks</strong><ul>{answer.keyRisks.map((item) => <li key={item}>{item}</li>)}</ul></Card>
            <Card><strong>Next actions</strong><ul>{answer.nextActions.map((item) => <li key={item}>{item}</li>)}</ul></Card>
          </div>
          <Card>
            <strong>退出条件</strong>
            <div className="mt-2">{answer.exitConditions}</div>
            <div className="score-boundary mt-2">证据边界：{answer.evidenceBoundary.join("；")}</div>
          </Card>

          <h2 className="section-title">完整分析</h2>
          <Card>
            <details>
              <summary>展开完整本地分析文本</summary>
              <pre className="analysis-text">{answer.fullText}</pre>
            </details>
          </Card>
        </>
      )}

      {previewState.status !== "idle" && (
        <>
          <h2 className="section-title">新管线预览</h2>
          <Card>
            <div className="card-header">
              <div>
                <div className="card-title">
                  <Sparkles size={16} style={{ marginRight: 6 }} />
                  实验性预览：新 Ask Pipeline
                </div>
                <div className="text-muted">
                  本地新管线预览，不代表默认输出
                </div>
              </div>
              <Badge
                text={previewState.status === "loading"
                  ? "本地预览生成中"
                  : previewState.status === "ready"
                    ? "本地预览已生成"
                    : previewState.status === "warning"
                      ? "本地预览提示"
                      : previewState.status === "blocked"
                        ? "预览暂不可用"
                        : "预览错误"}
                type={previewState.status === "ready" ? "green" : previewState.status === "warning" ? "cyan" : previewState.status === "blocked" ? "gray" : "red"}
              />
            </div>

            <div className="text-muted mt-2">{previewState.userMessage}</div>

            {previewState.renderState && (
              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                {previewState.renderState.payload?.response && (
                  <Card>
                    <strong>预览内容</strong>
                    <pre className="analysis-text">{JSON.stringify(previewState.renderState.payload.response, null, 2)}</pre>
                  </Card>
                )}

                {Array.isArray(previewState.renderState.payload?.warnings) && previewState.renderState.payload.warnings.length > 0 && (
                  <Card>
                    <strong>预览提示</strong>
                    <ul className="mt-2">
                      {previewState.renderState.payload.warnings.map((warning) => (
                        <li key={JSON.stringify(warning)}>{typeof warning === "string" ? warning : JSON.stringify(warning)}</li>
                      ))}
                    </ul>
                  </Card>
                )}

                {Array.isArray(previewState.renderState.payload?.blockingReasons) && previewState.renderState.payload.blockingReasons.length > 0 && (
                  <Card>
                    <strong>暂不可展示原因</strong>
                    <pre className="analysis-text">{JSON.stringify(previewState.renderState.payload.blockingReasons, null, 2)}</pre>
                  </Card>
                )}

                {Array.isArray(previewState.renderState.payload?.missingEvidence) && previewState.renderState.payload.missingEvidence.length > 0 && (
                  <Card>
                    <strong>缺少的证据</strong>
                    <pre className="analysis-text">{JSON.stringify(previewState.renderState.payload.missingEvidence, null, 2)}</pre>
                  </Card>
                )}

                {Array.isArray(previewState.renderState.payload?.sourceRequiredItems) && previewState.renderState.payload.sourceRequiredItems.length > 0 && (
                  <Card>
                    <strong>需要补充的来源项</strong>
                    <pre className="analysis-text">{JSON.stringify(previewState.renderState.payload.sourceRequiredItems, null, 2)}</pre>
                  </Card>
                )}
              </div>
            )}
          </Card>
        </>
      )}
    </>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [askQuestion, setAskQuestion] = useState("");
  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: "", content: null });
  const [filters, setFilters] = useState({
    role: "高管",
    region: "全球",
    customer: "全部",
    application: "全部",
    track: "全部",
    time: "2026",
  });
  const insightContext = buildInsightContext(filters);
  const internalM1Diagnostic = import.meta.env.DEV
    && typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("internal_m1_diagnostic") === "1";

  const openModal = (title, content) => setModalConfig({ isOpen: true, title, content });
  const closeModal = () => setModalConfig({ isOpen: false, title: "", content: null });

  const resetFilters = () =>
    setFilters({
      role: "高管",
      region: "全球",
      customer: "全部",
      application: "全部",
      track: "全部",
      time: "2026",
    });

  const exportData = () => {
    const exportObj = {
      timestamp: new Date().toISOString(),
      ...insightContext,
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
    { id: "ask", icon: MessageSquare, label: "Ask PowerInsight" },
  ];

  const render = () => {
    if (activeTab === "market") return <MarketTab context={insightContext} openModal={openModal} />;
    if (activeTab === "product") return <ProductTab context={insightContext} openModal={openModal} />;
    if (activeTab === "technology") return <TechnologyTab context={insightContext} openModal={openModal} />;
    if (activeTab === "companies") return <CompaniesTab context={insightContext} openModal={openModal} />;
    if (activeTab === "ask") return internalM1Diagnostic
      ? <AskPowerInsightTab context={insightContext} initialQuestion={askQuestion} />
      : (
        <AskPowerInsightExperience
          context={insightContext}
          initialQuestion={askQuestion}
          onNavigate={setActiveTab}
        />
      );
    return <OverviewTab context={insightContext} openModal={openModal} onAskQuestion={(question) => { setAskQuestion(question); setActiveTab("ask"); }} />;
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div style={{ padding: 20, borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ fontSize: 16, fontWeight: "bold" }}>DataCenter PowerInsight</div>
          <div className="text-muted">AI 数据中心电力电子洞察</div>
        </div>

        <nav style={{ flex: 1, paddingTop: 16 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? "active" : ""}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="main-content">
        <header className="header">
          <div>
            <h1 className="header-title">DataCenter PowerInsight</h1>
            <div className="header-subtitle">AI 数据中心电力电子与基础设施市场洞察驾驶舱</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => openModal("数据源与口径总览", <SourceRegistryContent />)}>
              <Database size={14} />
              <span className="md-inline">数据源</span>
            </button>
            <button className="btn btn-primary" onClick={exportData}>
              <Download size={14} />
              <span className="md-inline">导出</span>
            </button>
          </div>
        </header>

        <div className="filter-bar">
          <div className="flex-between mb-2">
            <span className="text-muted">
              当前视角: <strong style={{ color: "var(--text-primary)" }}>{filters.role}</strong> | 更新时间: 2026-05-15
            </span>
            <div className="flex-center">
              <span style={{ color: "var(--accent-green)", display: "flex", alignItems: "center", fontSize: 11 }}>
                <CheckCircle2 size={12} style={{ marginRight: 4 }} />
                专家校核数据
              </span>
              <button onClick={resetFilters} className="btn-icon">
                <RotateCcw size={12} /> 重置
              </button>
            </div>
          </div>

          <div className="filter-grid">
            {Object.entries(FILTER_OPTIONS).map(([key, options]) => {
              const labels = {
                role: "用户角色",
                region: "区域",
                customer: "客户类型",
                application: "应用场景",
                track: "赛道",
                time: "时间窗口",
              };

              return (
                <div key={key} className="filter-group">
                  <label className="filter-label">{labels[key]}</label>
                  <select
                    className="filter-select"
                    value={filters[key]}
                    onChange={(e) => setFilters((prev) => ({ ...prev, [key]: e.target.value }))}
                  >
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        <div className="scroll-area">
          {activeTab !== "ask" && (
            <div className="role-insight-box">
              <div className="section-title">
                <BookOpen size={16} />
                动态执行摘要
              </div>
              <div>{insightContext.executiveBrief}</div>
            </div>
          )}

          {render()}

          <div
            style={{
              marginTop: 40,
              paddingTop: 20,
              borderTop: "1px solid var(--border-color)",
              fontSize: 11,
              color: "var(--text-muted)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Info size={12} style={{ marginRight: 6, flexShrink: 0 }} />
            当前为专家整理的原型演示数据。正式版本需接入经核实的市场数据库、Firestore 数据表或 API 情报源。
          </div>
        </div>

        <nav className="bottom-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? "active" : ""}`}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={20} />
                <span style={{ fontSize: 10 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </main>

      <Modal isOpen={modalConfig.isOpen} onClose={closeModal} title={modalConfig.title}>
        {modalConfig.content}
      </Modal>
    </div>
  );
}
