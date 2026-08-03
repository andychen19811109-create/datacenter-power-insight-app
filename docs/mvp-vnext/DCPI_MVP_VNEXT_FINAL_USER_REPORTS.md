# DCPI MVP vNext final user reports

`AUTHORITATIVE_CURRENT_OUTPUT`

This document records the current application-side professional report output for the three Final RC golden cases. It is a controlled replay record, not a claim of a new provider execution or release acceptance.

## GC-01 — Kstar and modular UPS

**Final status:** 条件性结论
**One-line conclusion:** 建议先完成现有平台、客户需求和资源边界验证，再在“升级、全新平台、暂缓投入”之间决策。
**Recommended decision:** 不将“全新模块化UPS”直接视为既定立项；先完成客户、平台差距、成本与资源验证。

**Analysis Context:** 对象为模块化UPS；公司为Kstar；区域为全球（系统默认）；时间按当前页面筛选器显示；决策主体为产品公司（来自问题）。Kstar的平台、资源、客户、订单和竞争位置均不是已确认事实。

| 决策路径 | 适用条件 | 产品边界 | 投资与资源 | 主要风险 | 需验证证据 | 决策结果 |
| --- | --- | --- | --- | --- | --- | --- |
| 升级现有平台 | 差距可由模块、拓扑或认证升级解决 | 保留现有平台边界 | 按升级范围确认资源 | 代际不足或差异化不够 | 平台覆盖、成本、客户需求与周期 | 验证通过后进入升级方案 |
| 开发全新平台 | 现有平台无法满足目标客户和系统要求 | 新平台需定义目标客户与系统边界 | 按研发、供应链和交付能力配置 | 投入、周期、组织和商业化风险 | 客户承诺、技术差距、资源与商业验证 | 未验证前不得承诺立项 |
| 暂缓投入 | 需求、窗口或企业能力不足 | 维持跟踪和既有产品边界 | 控制投入并保留选择权 | 错失窗口或跟随不足 | 市场、竞争与客户需求证据 | 条件不成立时暂缓或退出 |

**验证 Gate:** 客户承诺、平台覆盖与资源可用性通过验证。
**Cannot conclude:** 不能断言Kstar已有或缺乏某平台能力、已送样、拥有客户窗口、领先地位、订单、资源或竞争进度。

## GC-02 — 800VDC in AI data-center power

**Final status:** 条件性结论
**One-line conclusion:** 800VDC可作为分层架构验证方向，但产品发布不等同于客户验证或规模化运行成熟度。
**Recommended decision:** 以设施、机架和服务器侧边界分别验证，并与AC UPS、现有HVDC和BBU路径比较。

**Analysis Context:** 对象为800VDC；场景为AI数据中心；区域为全球（系统默认）；时间按当前页面筛选器显示；决策主体未指定（待澄清）。

| 架构层级 | 潜在机会 | 主要风险 | 替代路线 | 必要验证 |
| --- | --- | --- | --- | --- |
| 设施级 | 较高电压可能降低同等功率配电电流并减少导体损耗；需按项目核算系统价值 | 电弧、绝缘、开断、故障隔离、维护与认证边界 | 传统AC UPS、现有HVDC架构 | 核实上游供电、整流、储能、配电、保护和认证兼容性 |
| 母线/机架级 | 可能减少中间转换环节并简化部分配电接口；需验证系统级收益 | 连接器、开关、故障隔离、维护安全和机架备电接口风险 | 现有HVDC、BBU或机架级备电 | 核实母线到机架的配电、隔离、开关维护和备电/电源转换接口 |
| GPU或服务器侧 | 末端转换方案可能影响热设计、效率与系统集成 | 末端转换、热边界、故障传播和服务可维护性风险 | 服务器电源转换、现有低压配电与备电路径 | 核实末端转换、热、故障边界和客户运行验证 |

**验证 Gate:** 目标客户、接口、标准、工程边界和商业条件通过验证。
**Cannot conclude:** 不能断言广泛采用、统一标准、生态成熟、具名项目状态或某路线更优。

## GC-03 — BBU, liquid cooling and GaN/SiC

**Final status:** 证据不足
**One-line conclusion:** 不输出无条件单一排序；当前证据不足以形成整体排序，请按投资主体、时间窗口、关键假设和主要风险分别比较。
**Recommended decision:** 保留产业投资与财务投资情景，先补充可追溯市场、技术、客户和资本证据。

**Analysis Context:** 对象为BBU、液冷、GaN/SiC；区域为全球（系统默认）；时间按当前页面筛选器显示；投资主体未指定（来自澄清的“暂不确定，按多情景比较”），不得标记为来自问题或产业投资。

| 对象 | 对象层级 | 更适合的产业能力 | 核心商业证据 | 技术/交付壁垒 | 资本与周期 | 主要风险 |
| --- | --- | --- | --- | --- | --- | --- |
| BBU | 备电/供配电对象 | 电源、备电及高功率机架客户入口 | 客户入口、运行场景、付费与替代路线证据 | 系统接口、安全、认证和交付边界 | 按方案和客户验证 | 场景适配、认证、替代架构与客户采用 |
| 液冷 | 热管理/解决方案对象 | 数据中心客户和热管理工程能力 | 项目需求、交付闭环、客户采用与服务证据 | 系统集成、液路可靠性、工程交付与运维边界 | 按交付模式验证 | 交付、集成、运维和商业化 |
| GaN/SiC | 功率器件技术对象 | 半导体产业能力、较长周期和较高风险承受能力 | 应用导入、供应链、客户验证与商业化证据 | 器件到系统的可迁移性、可靠性和供应链壁垒 | 受产业链位置和技术周期影响 | 技术周期、供应链、资本暴露与退出路径 |

**产业投资情景:** 核实现有客户和产品协同性、工程交付、技术与供应链能力、商业验证路径和组织投入。
**财务投资情景:** 核实商业化证据、资本需求、退出路径、周期和风险暴露。
**Cannot conclude:** 不得输出任何无条件总体排序，也不得以高/中高/中低、最优或风险收益最高替代证据。

## GC-03 remaining replay consistency

The other four controlled GC-03 replay records retain the same status and boundary: investment subject and time horizon are not confirmed; both scenarios are shown; no overall ranking, numeric pseudo-evidence, or direct-evidence label without `source_ref` is published.
