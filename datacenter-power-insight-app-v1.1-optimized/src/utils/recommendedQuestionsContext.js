const roleQuestion = (contract) => ({
  高管: `${contract.selectedContext.timeHorizon}窗口内，当前筛选对象对资源投入优先级有什么影响？`,
  投资者: `${contract.selectedContext.region}视角下，当前对象的风险收益和退出风险如何比较？`,
  市场: `${contract.selectedContext.region}客户进入路径中，哪些痛点有足够证据支撑？`,
  产品: `${contract.selectedContext.timeHorizon}路线图里，MVP、差异化和退出条件应如何设置？`,
  研发: `当前对象需要哪些样机、认证、可靠性或系统级验证门槛？`,
}[contract.selectedContext.role] || "当前筛选条件下最关键的决策问题是什么？");

export function buildRoleBasedQuestions(contract) {
  return [
    roleQuestion(contract),
    `${contract.selectedContext.role}视角下，哪些证据边界会改变结论置信度？`,
  ];
}

export function buildRegionBasedQuestions(contract) {
  return [
    `${contract.selectedContext.region}口径下，哪些结论是区域证据，哪些只是全球背景？`,
    `${contract.selectedContext.region}是否存在并网、客户结构或进入风险导致的优先级变化？`,
  ];
}

export function buildTrackBasedQuestions(contract) {
  const selected = contract.selectedContext;
  const original = selected.track;
  if (selected.entityType === "architecture_route") {
    return [
      `${original}需要怎样的架构验证和分阶段迁移路径？`,
      `${original}与HVDC、SST和服务器电源链路的关系是什么？`,
    ];
  }
  if (selected.entityType === "technology_tag" || selected.entityType === "component_technology") {
    return [
      `${original}器件技术在服务器电源适配中的成熟度和风险是什么？`,
      `${original}应先验证哪些效率、可靠性、供应链和成本边界？`,
    ];
  }
  if (selected.entityType === "application_segment") {
    return [
      `${original}作为塔式 UPS 应用细分，客户场景和认证可靠性要求是什么？`,
      `${original}与通用塔式 UPS 的服务模型、负载对象和项目风险有何差异？`,
    ];
  }
  if (selected.entityType === "product_subsegment" || selected.entityType === "equipment_segment") {
    return [
      `${original}在液冷系统中的角色、控制边界、冗余和维护要求是什么？`,
      `${original}与冷板、Manifold、管路、换热器和冷却液的接口如何定义；更适合作为独立产品线还是液冷整体解决方案的一部分？`,
      `${original}供应链、交付周期、可靠性和维护能力如何影响产品化边界？`,
    ];
  }
  if (selected.normalizedTrack === "液冷") {
    return [
      "液冷市场进入窗口应如何判断，冷板式、浸没式和后门换热路线如何取舍？",
      "液冷与精密空调在AI高密机柜场景下如何替代、互补，并与服务器、机柜、一次/二次侧冷却架构协同交付？",
      "液冷解决方案生态、交付、运维和集成能力需要如何建设？",
    ];
  }
  if (selected.normalizedTrack === "精密空调") {
    return [
      "精密空调在热管理路线中如何与液冷替代或互补？",
      "精密空调的能效、改造场景和高密机房边界如何判断？",
    ];
  }
  if (selected.entityType === "primary_business_track") {
    return [
      `${selected.normalizedTrack}在当前筛选条件下的产品路线图和差异化边界是什么？`,
      `${selected.normalizedTrack}相邻赛道有哪些可参考但不能混同的机会？`,
    ];
  }
  return [
    "全部赛道视角下，哪些一级业务赛道最值得优先比较？",
    "当前筛选条件是否需要先缩小到具体一级业务赛道？",
  ];
}

export function buildTimeHorizonBasedQuestions(contract) {
  return [
    `${contract.selectedContext.timeHorizon}窗口内，哪些动作适合验证，哪些动作应推迟？`,
    `${contract.selectedContext.timeHorizon}之后需要观察哪些标准、客户或供应链信号？`,
  ];
}

export function buildRecommendedQuestions(contract) {
  const roleQuestions = buildRoleBasedQuestions(contract);
  const regionQuestions = buildRegionBasedQuestions(contract);
  const trackQuestions = buildTrackBasedQuestions(contract);
  const timeQuestions = buildTimeHorizonBasedQuestions(contract);
  const questions = [
    roleQuestions[0],
    regionQuestions[0],
    ...trackQuestions.slice(0, 2),
    timeQuestions[0],
    roleQuestions[1],
    regionQuestions[1],
    timeQuestions[1],
  ];
  return [...new Set(questions)].slice(0, 6);
}

export function validateRecommendedQuestions(questions = [], contract = {}) {
  const errors = [];
  if (!Array.isArray(questions) || questions.length < 4 || questions.length > 6) errors.push("question-count-out-of-range");
  const joined = questions.join("\n");
  ["role", "region", "timeHorizon"].forEach((field) => {
    if (!contract.selectedContext?.[field]) errors.push(`missing-context:${field}`);
  });
  if (!joined.includes(contract.selectedContext?.region)) errors.push("missing-region-signal");
  if (!joined.includes(String(contract.selectedContext?.timeHorizon))) errors.push("missing-time-signal");
  if (!["all", "primary_business_track"].includes(contract.selectedContext?.entityType) && /产品赛道机会/.test(joined)) {
    errors.push("non-primary-product-track-opportunity-language");
  }
  if (["product_subsegment", "equipment_segment"].includes(contract.selectedContext?.entityType) && /完整液冷市场机会|完整赛道机会/.test(joined)) {
    errors.push("subsegment-full-liquid-cooling-opportunity-language");
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}
