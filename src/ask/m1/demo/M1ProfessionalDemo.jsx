import React, { useMemo, useState } from "react";

import releasedResult from "./data/released.json";
import rejectedResult from "./data/rejected.json";
import { buildM1DemoViewModel } from "./m1DemoViewModel.js";

const SCENARIOS = Object.freeze([
  Object.freeze({
    id: "released",
    label: "Certified RELEASED Scenario",
    result: releasedResult,
  }),
  Object.freeze({
    id: "rejected",
    label: "Certified REJECTED Scenario",
    result: rejectedResult,
  }),
]);

const TextRows = ({ items }) => (
  <dl className="m1-demo-rows">
    {items.map(({ label, value }) => (
      <div key={label}>
        <dt>{label}</dt>
        <dd>{value}</dd>
      </div>
    ))}
  </dl>
);

const TextList = ({ items, className = "" }) => (
  items.length > 0 && (
    <ul className={`m1-demo-list ${className}`}>
      {items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
    </ul>
  )
);

const Detail = ({ label, value }) => (
  value !== "—" && (
    <p><strong>{label}</strong><span>{value}</span></p>
  )
);

const ReleasedView = ({ model }) => (
  <div className="m1-demo-content">
    <section className="m1-demo-card m1-demo-primary">
      <h2>推荐结论</h2>
      <span className="m1-demo-chip">{model.recommendation.status}</span>
      <p className="m1-demo-decision">{model.recommendation.decision}</p>
      <Detail label="理由" value={model.recommendation.rationale} />
      <TextList items={model.recommendation.conditions} />
      <TextList items={model.recommendation.unknowns} className="m1-demo-ids" />
    </section>

    <section className="m1-demo-card">
      <h2>决策范围</h2>
      <TextRows items={model.scope} />
    </section>

    {model.boundaries.length > 0 && (
      <section className="m1-demo-section">
        <h2>关键边界</h2>
        <div className="m1-demo-grid">
          {model.boundaries.map((boundary) => (
            <article className="m1-demo-card" key={boundary.title}>
              <div className="m1-demo-card-head">
                <h3>{boundary.title}</h3>
                <span className="m1-demo-chip">{boundary.status}</span>
              </div>
              <Detail label="边界" value={boundary.statement} />
              <Detail label="影响" value={boundary.impact} />
              <Detail label="允许" value={boundary.allowed} />
              <Detail label="禁止" value={boundary.prohibited} />
              <TextList items={boundary.conditions} />
              <TextList items={boundary.sources} className="m1-demo-ids" />
              <TextList items={boundary.unknowns} className="m1-demo-ids" />
            </article>
          ))}
        </div>
      </section>
    )}

    {model.alternatives.length > 0 && (
      <section className="m1-demo-section">
        <h2>备选方向</h2>
        <div className="m1-demo-grid">
          {model.alternatives.map((item) => (
            <article className="m1-demo-card" key={item.id}>
              <div className="m1-demo-card-head">
                <h3>{item.label}</h3>
                <span className="m1-demo-chip">{item.status}</span>
              </div>
              <Detail label="理由" value={item.rationale} />
              <Detail label="影响" value={item.impact} />
              <TextList items={item.sources} className="m1-demo-ids" />
              <TextList items={item.unknowns} className="m1-demo-ids" />
            </article>
          ))}
        </div>
      </section>
    )}

    {model.unknowns.length > 0 && (
      <section className="m1-demo-section">
        <h2>Unknown / 待补充项</h2>
        <div className="m1-demo-grid">
          {model.unknowns.map((item) => (
            <article className="m1-demo-card" key={item.id}>
              <div className="m1-demo-card-head">
                <h3>{item.field}</h3>
                <span className="m1-demo-chip m1-demo-chip-warn">{item.status}</span>
              </div>
              <Detail label="说明" value={item.description} />
              <Detail label="决策影响" value={item.impact} />
              <Detail label="待办" value={item.action} />
            </article>
          ))}
        </div>
      </section>
    )}

    <section className="m1-demo-card">
      <h2>Evidence / Source</h2>
      <Detail label="证据边界模式" value={model.evidence.mode} />
      <TextList items={model.evidence.sources} className="m1-demo-ids" />
    </section>

    <section className="m1-demo-card">
      <h2>Policy / Snapshot / Schema 绑定</h2>
      <TextRows items={model.versions} />
    </section>
  </div>
);

const RejectedView = ({ model }) => (
  <section className="m1-demo-card m1-demo-rejected">
    <h2>Release Rejected</h2>
    <TextRows items={[{ label: "Error Code", value: model.error.errorCode }]} />
    {model.error.violations.length > 0 && (
      <><h3>Violations</h3><TextList items={model.error.violations} /></>
    )}
    <h3>Public Binding</h3>
    <TextRows items={model.error.binding} />
  </section>
);

export default function M1ProfessionalDemo() {
  const [scenarioId, setScenarioId] = useState(SCENARIOS[0].id);
  const scenario = SCENARIOS.find(({ id }) => id === scenarioId) || SCENARIOS[0];
  const model = useMemo(
    () => buildM1DemoViewModel(scenario.result),
    [scenario],
  );

  return (
    <div className="m1-demo-page">
      <header className="m1-demo-hero">
        <div>
          <p className="m1-demo-kicker">DataCenter PowerInsight</p>
          <h1>M1 Professional Decision Demo</h1>
          <p className="m1-demo-mode">Mode: Certified Local Snapshot</p>
          <p>Result generated by the frozen deterministic M1 release gateway.</p>
        </div>
        <label className="m1-demo-select">
          <span>演示场景</span>
          <select
            value={scenarioId}
            onChange={(event) => setScenarioId(event.target.value)}
            aria-label="演示场景"
          >
            {SCENARIOS.map(({ id, label }) => (
              <option key={id} value={id}>{label}</option>
            ))}
          </select>
        </label>
      </header>

      <div className={`m1-demo-release-status ${model.status.toLowerCase()}`}>
        <span>{model.status}</span>
        <small>{model.status === "RELEASED" ? "已发布决策" : "已拒绝"}</small>
      </div>

      {model.status === "RELEASED"
        ? <ReleasedView model={model.released} />
        : <RejectedView model={model} />}
    </div>
  );
}
