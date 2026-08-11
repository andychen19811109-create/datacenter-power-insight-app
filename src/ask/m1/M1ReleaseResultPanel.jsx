import React, { useMemo } from "react";

import { buildM1DemoViewModel } from "./demo/m1DemoViewModel.js";

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

const ReleasedResult = ({ model }) => (
  <div className="m1-demo-content">
    <section className="m1-demo-card m1-demo-primary">
      <h2>决策结论</h2>
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

    <details className="m1-release-binding">
      <summary>Policy / Snapshot / Schema 绑定</summary>
      <TextRows items={model.versions} />
    </details>
  </div>
);

const RejectedResult = ({ model }) => (
  <section className="m1-demo-card m1-demo-rejected">
    <h2>当前输入未通过冻结发布策略</h2>
    <p>
      系统已完成确定性评估，但当前组合不在已认证范围内，因此没有生成未经证据支持的投资结论。
    </p>
    <TextRows items={[{ label: "Error Code", value: model.error.errorCode }]} />
    {model.error.violations.length > 0 && (
      <><h3>阻断原因</h3><TextList items={model.error.violations} /></>
    )}
    <details className="m1-release-binding">
      <summary>Public Binding</summary>
      <TextRows items={model.error.binding} />
    </details>
  </section>
);

export default function M1ReleaseResultPanel({ result }) {
  const model = useMemo(() => buildM1DemoViewModel(result), [result]);
  const released = model.status === "RELEASED";

  return (
    <section
      className="m1-release-result"
      aria-label="M1 分析结果"
      data-m1-release-status={model.status}
    >
      <div className={`m1-demo-release-status ${released ? "released" : "rejected"}`}>
        <span>{model.status}</span>
        <small>{released ? "确定性结果已生成" : "冻结策略已阻断"}</small>
      </div>
      {released
        ? <ReleasedResult model={model.released} />
        : <RejectedResult model={model} />}
    </section>
  );
}
