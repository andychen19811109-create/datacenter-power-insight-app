const field = (value, draftStatus) => ({
  value,
  draft_status: draftStatus,
});

export const M1_B1_S1_QUESTION = (
  "我们计划评估是否在未来18个月面向北美大型AIDC运营商投资开发1.25MW级模块化UPS平台，"
  + "并同时比较800VDC与BBU方案。应用为GPU训练集群，供电范围覆盖设施级配电到机架侧，"
  + "当前处于产品立项阶段；关键约束包括0%到100%快速负载阶跃、北美认证、65/100kAIC"
  + "以及18至24个月上市窗口。"
);

export const M1_B1_S2_QUESTION = "请评估液冷CDU在AI数据中心的产品投资机会。";

export const M1_B1_S3_QUESTION = (
  "请比较UPS与800VDC在AIDC中的投资机会。目标区域限定为中国大陆，"
  + "但该产品又明确不进入中国市场、只面向北美，计划半年内完成立项。"
);

// Fixtures are transcribed from the final 2026-07-29 M1-B1 runtime evidence.
// They are offline-only and intentionally contain no Provider credentials.
export const M1_B1_S1_VALID_DRAFT = {
  schema_version: "m1.input-draft.v1",
  draft_id: "runtime_4e71b241_36e7_4f1e_a8ff_12f046944add",
  original_question: M1_B1_S1_QUESTION,
  source: {
    mode: "provider",
    reason_code: null,
  },
  groups: {
    decision_type: {
      fields: {
        decision_intent: field("产品投资与开发评估", "EXPLICIT"),
      },
    },
    product_architecture: {
      fields: {
        primary_product_object: field("UPS", "EXPLICIT"),
        architecture_alternatives: field(["UPS", "800VDC", "BBU"], "EXPLICIT"),
      },
    },
    application_scenario: {
      fields: {
        application_scenario: field("GPU训练集群", "EXPLICIT"),
      },
    },
    customer_region: {
      fields: {
        target_customer: field("北美大型AIDC运营商", "EXPLICIT"),
        region: field("北美", "EXPLICIT"),
      },
    },
    power_system_scope: {
      fields: {
        power_or_system_scope: field("设施级配电到机架侧", "EXPLICIT"),
      },
    },
    constraints_unknowns: {
      fields: {
        investment_or_product_stage: field("产品立项阶段", "EXPLICIT"),
        target_timing: field("未来18个月投资开发；18至24个月上市", "EXPLICIT"),
        critical_constraints: field([
          "1.25MW级",
          "模块化架构",
          "0%到100%快速负载阶跃",
          "北美认证",
          "65/100kAIC",
          "18至24个月上市窗口",
        ], "EXPLICIT"),
        unknowns: field([], "EXPLICIT"),
        contradictions: field([], "EXPLICIT"),
      },
    },
  },
};

export const M1_B1_S2_VALID_DRAFT = {
  schema_version: "m1.input-draft.v1",
  draft_id: "runtime_f2de5b84_3d52_4429_bce6_f3369e229da3",
  original_question: M1_B1_S2_QUESTION,
  source: {
    mode: "provider",
    reason_code: null,
  },
  groups: {
    decision_type: {
      fields: {
        decision_intent: field("产品投资机会", "EXPLICIT"),
      },
    },
    product_architecture: {
      fields: {
        primary_product_object: field("CDU", "EXPLICIT"),
        architecture_alternatives: field(["CDU"], "EXPLICIT"),
      },
    },
    application_scenario: {
      fields: {
        application_scenario: field("AI数据中心", "EXPLICIT"),
      },
    },
    customer_region: {
      fields: {
        target_customer: field("unknown", "UNKNOWN"),
        region: field("unknown", "UNKNOWN"),
      },
    },
    power_system_scope: {
      fields: {
        power_or_system_scope: field("unknown", "UNKNOWN"),
      },
    },
    constraints_unknowns: {
      fields: {
        investment_or_product_stage: field("unknown", "UNKNOWN"),
        target_timing: field("unknown", "UNKNOWN"),
        critical_constraints: field(["液冷"], "EXPLICIT"),
        unknowns: field([
          "target_customer",
          "region",
          "power_or_system_scope",
          "investment_or_product_stage",
          "target_timing",
        ], "UNKNOWN"),
        contradictions: field([], "EXPLICIT"),
      },
    },
  },
};

export const M1_B1_S3_INVALID_DRAFT = {
  schema_version: "m1.input-draft.v1",
  draft_id: "runtime_efbbf22b_93af_41d7_b713_2242dd6c6b92",
  original_question: M1_B1_S3_QUESTION,
  source: {
    mode: "provider",
    reason_code: null,
  },
  groups: {
    decision_type: {
      fields: {
        decision_intent: field("投资机会比较", "EXPLICIT"),
      },
    },
    product_architecture: {
      fields: {
        primary_product_object: field("unknown", "CONFLICTING"),
        architecture_alternatives: field(["UPS", "800VDC"], "EXPLICIT"),
      },
    },
    application_scenario: {
      fields: {
        application_scenario: field("AIDC", "EXPLICIT"),
      },
    },
    customer_region: {
      fields: {
        target_customer: field("unknown", "UNKNOWN"),
        region: field("conflicting", "CONFLICTING"),
      },
    },
    power_system_scope: {
      fields: {
        power_or_system_scope: field("unknown", "UNKNOWN"),
      },
    },
    constraints_unknowns: {
      fields: {
        investment_or_product_stage: field("立项", "EXPLICIT"),
        target_timing: field("半年内", "EXPLICIT"),
        critical_constraints: field(["半年内完成立项"], "EXPLICIT"),
        unknowns: field(["target_customer", "power_or_system_scope"], "UNKNOWN"),
        contradictions: field([
          "region: 中国大陆 / 北美: 目标区域互相排斥",
          "primary_product_object: UPS / 800VDC: 模型错误地将比较对象标为字段冲突",
        ], "CONFLICTING"),
      },
    },
  },
};

const contextFromDraft = ({
  draft,
  contextId,
  decisionIntent,
  contradictions = [],
}) => {
  const records = {};
  Object.values(draft.groups).forEach((group) => {
    Object.entries(group.fields).forEach(([fieldName, record]) => {
      records[fieldName] = record;
    });
  });
  const materialValues = {
    decision_intent: decisionIntent,
    primary_product_object: records.primary_product_object.value,
    architecture_alternatives: records.architecture_alternatives.value,
    application_scenario: records.application_scenario.value,
    target_customer: records.target_customer.value,
    region: records.region.value,
    power_or_system_scope: records.power_or_system_scope.value,
    investment_or_product_stage: records.investment_or_product_stage.value,
    target_timing: records.target_timing.value,
    critical_constraints: records.critical_constraints.value,
  };
  return {
    schema_version: "m1.input.v1",
    context_id: contextId,
    raw_user_question: draft.original_question,
    ...materialValues,
    stated_evidence: [],
    assumptions: [],
    unknowns: records.unknowns.value,
    contradictions,
    clarification_required: false,
    clarification_question: null,
    clarification_reason: null,
    recognition_confidence: 0.91,
    field_provenance: Object.fromEntries(
      Object.entries(materialValues).map(([fieldName, value]) => [
        fieldName,
        {
          value,
          status: fieldName === "decision_intent"
            ? "EXPLICIT"
            : records[fieldName].draft_status,
          source_span: records[fieldName]?.draft_status === "UNKNOWN"
            ? []
            : [draft.original_question],
          confidence: records[fieldName]?.draft_status === "UNKNOWN" ? 0 : 0.91,
        },
      ]),
    ),
  };
};

export const M1_B1_S1_VALID_CONTEXT = contextFromDraft({
  draft: M1_B1_S1_VALID_DRAFT,
  contextId: "runtime_context_s1",
  decisionIntent: "PRODUCT_INVESTMENT",
});

export const M1_B1_S2_VALID_CONTEXT = contextFromDraft({
  draft: M1_B1_S2_VALID_DRAFT,
  contextId: "runtime_context_s2",
  decisionIntent: "PRODUCT_INVESTMENT",
});

export const M1_B1_S3_INVALID_CONTEXT = {
  ...contextFromDraft({
    draft: M1_B1_S3_INVALID_DRAFT,
    contextId: "runtime_context_s3_invalid",
    decisionIntent: "ARCHITECTURE_CHOICE",
    contradictions: [{
      field: "region",
      values: ["中国大陆", "北美"],
      explanation: "目标区域互相排斥",
    }],
  }),
  provider_internal_detail: "模型错误地将比较对象标为字段冲突",
};
