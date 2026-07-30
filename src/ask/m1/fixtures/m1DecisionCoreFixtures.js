import {
  M1_DECISION_METHOD_VERSION,
  M1_DECISION_OUTPUTS,
  M1_DECISION_STATE_SCHEMA_VERSION,
  M1_EVIDENCE_SOURCE_IDS,
} from "../contracts/m1DecisionState.js";
import { hashM1ConfirmedInput } from "../m1DecisionCore.js";

export const createConfirmedInputFixture = () => ({
  schema_version: "m1.confirmed-input.v1",
  confirmed_input_id: "confirmed_m1_core_fixture",
  source_draft_id: "draft_m1_core_fixture",
  original_question: "为 CUSTOMER_X 在 REGION_ALPHA 评估 1MW UPS 与 800VDC，投产时间未知。",
  confirmed_at: "2026-07-24T12:00:00.000Z",
  confirmation_status: "USER_CORRECTED",
  groups: {
    decision_type: {
      fields: {
        decision_intent: {
          value: "ARCHITECTURE_CHOICE",
          draft_status: "INFERRED",
          confirmed_status: "USER_CONFIRMED",
        },
      },
    },
    product_architecture: {
      fields: {
        primary_product_object: {
          value: "POWER_ARCHITECTURE_DECISION",
          draft_status: "INFERRED",
          confirmed_status: "USER_CONFIRMED",
        },
        architecture_alternatives: {
          value: ["UPS", "800VDC"],
          draft_status: "EXPLICIT",
          confirmed_status: "USER_CONFIRMED",
        },
      },
    },
    application_scenario: {
      fields: {
        application_scenario: {
          value: "AI 数据中心受保护负载",
          draft_status: "INFERRED",
          confirmed_status: "USER_CORRECTED",
        },
      },
    },
    customer_region: {
      fields: {
        target_customer: {
          value: "CUSTOMER_X",
          draft_status: "EXPLICIT",
          confirmed_status: "USER_CONFIRMED",
        },
        region: {
          value: "REGION_ALPHA",
          draft_status: "EXPLICIT",
          confirmed_status: "USER_CONFIRMED",
        },
      },
    },
    power_system_scope: {
      fields: {
        power_or_system_scope: {
          value: "1MW",
          draft_status: "EXPLICIT",
          confirmed_status: "USER_CONFIRMED",
        },
      },
    },
    constraints_unknowns: {
      fields: {
        investment_or_product_stage: {
          value: "concept evaluation",
          draft_status: "INFERRED",
          confirmed_status: "USER_CONFIRMED",
        },
        target_timing: {
          value: "unknown",
          draft_status: "UNKNOWN",
          confirmed_status: "USER_MARKED_UNKNOWN",
        },
        critical_constraints: {
          value: [],
          draft_status: "UNKNOWN",
          confirmed_status: "USER_MARKED_UNKNOWN",
        },
        unknowns: {
          value: ["target_timing", "critical_constraints"],
          draft_status: "UNKNOWN",
          confirmed_status: "USER_CONFIRMED",
        },
        contradictions: {
          value: [],
          draft_status: "EXPLICIT",
          confirmed_status: "USER_CONFIRMED",
        },
      },
    },
  },
});

const decisionBlock = ({
  statement,
  sourceIds = [],
  unknownIds = [],
  status = "QUALIFIED",
  impact,
}) => ({
  status,
  statement,
  source_ids: sourceIds,
  unknown_ids: unknownIds,
  decision_impact: impact,
});

const output = (outputId, {
  decision,
  sourceIds = [],
  unknownIds = [],
  status = "QUALIFIED",
}) => ({
  output_id: outputId,
  title: M1_DECISION_OUTPUTS[outputId],
  status,
  decision,
  source_ids: sourceIds,
  unknown_ids: unknownIds,
  decision_impact: `Controls the ${outputId} investment decision boundary.`,
});

export const createDecisionStateFixture = ({
  confirmedInput = createConfirmedInputFixture(),
  confirmedInputHash = hashM1ConfirmedInput(confirmedInput),
} = {}) => ({
  schema_version: M1_DECISION_STATE_SCHEMA_VERSION,
  decision_id: `decision_${confirmedInputHash.slice(0, 16)}`,
  binding: {
    confirmed_input_id: confirmedInput.confirmed_input_id,
    confirmed_input_schema_version: confirmedInput.schema_version,
    confirmed_input_hash: confirmedInputHash,
  },
  confirmed_input: JSON.parse(JSON.stringify(confirmedInput)),
  method: {
    method_version: M1_DECISION_METHOD_VERSION,
    outputs: Object.keys(M1_DECISION_OUTPUTS),
  },
  evidence_boundary: {
    mode: "FROZEN_SEVEN_SOURCE",
    source_ids: [...M1_EVIDENCE_SOURCE_IDS],
  },
  product_boundary: decisionBlock({
    statement: "Evaluate a protected-load power architecture decision; do not generalize it to all facility power.",
    sourceIds: ["NVIDIA_800VDC_AI_POWER"],
    impact: "Keeps product investment scoped to the confirmed power-architecture object.",
  }),
  protected_load_boundary: decisionBlock({
    statement: "The protected-load definition requires confirmation before final topology selection.",
    unknownIds: ["U_CRITICAL_CONSTRAINTS"],
    status: "UNKNOWN",
    impact: "Blocks a final topology commitment.",
  }),
  system_boundary: decisionBlock({
    statement: "Compare alternatives at the confirmed 1MW system scope.",
    sourceIds: ["OCP_MT_DIABLO"],
    impact: "Prevents component benchmarks from being treated as system conclusions.",
  }),
  architecture_alternatives: [
    {
      alternative_id: "ALT_UPS",
      label: "UPS",
      fit_status: "CONDITIONAL_FIT",
      rationale: "Retain as an evaluated protected-load option pending validation.",
      source_ids: ["SCHNEIDER_GALAXY_VXL", "VERTIV_AI_POWER_SWING_UPS"],
      unknown_ids: ["U_CRITICAL_CONSTRAINTS"],
      decision_impact: "Keeps UPS in the funded validation set without declaring a winner.",
    },
    {
      alternative_id: "ALT_800VDC",
      label: "800VDC",
      fit_status: "CONDITIONAL_FIT",
      rationale: "Retain as an architecture alternative pending ecosystem and safety validation.",
      source_ids: ["NVIDIA_800VDC_AI_POWER", "OCP_MT_DIABLO"],
      unknown_ids: ["U_TARGET_TIMING"],
      decision_impact: "Requires staged validation rather than immediate product commitment.",
    },
  ],
  application_fit: decisionBlock({
    statement: "Both alternatives remain conditional for the confirmed AI data-center application.",
    sourceIds: ["VERTIV_AI_POWER_SWING_UPS"],
    unknownIds: ["U_CRITICAL_CONSTRAINTS"],
    impact: "Limits the recommendation to validation funding.",
  }),
  no_fit_boundary: decisionBlock({
    statement: "No-fit applies where protected-load behavior or certification gates cannot be met.",
    sourceIds: ["UL_1778", "OSHA_NRTL"],
    impact: "Defines an explicit exit boundary for product investment.",
  }),
  decision_outputs: {
    O1: output("O1", {
      decision: "Bound the product object to the confirmed power-architecture decision.",
      sourceIds: ["NVIDIA_800VDC_AI_POWER"],
    }),
    O2: output("O2", {
      decision: "Safety and system-boundary failures kill an alternative before feature scoring.",
      sourceIds: ["UL_1778", "OSHA_NRTL"],
    }),
    O3: output("O3", {
      decision: "Translate AI load behavior into protected-load product validation gates.",
      sourceIds: ["VERTIV_AI_POWER_SWING_UPS"],
    }),
    O4: output("O4", {
      decision: "Classify competitor metrics only inside equivalent system and application scope.",
      sourceIds: ["SCHNEIDER_GALAXY_VXL"],
    }),
    O5: output("O5", {
      decision: "Require a 1MW system-boundary comparison before architecture selection.",
      sourceIds: ["OCP_MT_DIABLO"],
    }),
    O6: output("O6", {
      decision: "Keep market entry conditional on customer, certification, and ecosystem completeness.",
      sourceIds: ["DIGITAL_REALTY_HIGH_DENSITY_COLOCATION", "UL_1778", "OSHA_NRTL"],
    }),
    O7: output("O7", {
      decision: "Unknown timing and constraints reduce confidence and restrict funding.",
      unknownIds: ["U_TARGET_TIMING", "U_CRITICAL_CONSTRAINTS"],
      status: "UNKNOWN",
    }),
  },
  customer_requirements: [
    {
      requirement_id: "CR_001",
      statement: "Validate protected-load continuity for the confirmed application.",
      priority: "CRITICAL",
      status: "QUALIFIED",
      source_ids: ["VERTIV_AI_POWER_SWING_UPS"],
      unknown_ids: ["U_CRITICAL_CONSTRAINTS"],
      decision_impact: "Determines whether either architecture remains viable.",
    },
  ],
  product_requirements: [
    {
      requirement_id: "PR_001",
      statement: "Demonstrate compliance readiness within the defined product boundary.",
      priority: "CRITICAL",
      status: "QUALIFIED",
      source_ids: ["UL_1778", "OSHA_NRTL"],
      unknown_ids: [],
      decision_impact: "Creates a non-negotiable product release gate.",
    },
  ],
  differentiators: [
    {
      differentiator_id: "DIF_001",
      statement: "Differentiate on validated system behavior, not isolated component efficiency.",
      benchmark_class: "SYSTEM_EQUIVALENT",
      status: "QUALIFIED",
      source_ids: ["OCP_MT_DIABLO", "SCHNEIDER_GALAXY_VXL"],
      unknown_ids: ["U_CRITICAL_CONSTRAINTS"],
      decision_impact: "Prevents unsupported competitive positioning.",
    },
  ],
  critical_metrics: [
    {
      metric_id: "METRIC_001",
      name: "Confirmed comparison power scope",
      value: 1,
      unit: "MW",
      status: "SUPPORTED",
      source_ids: ["OCP_MT_DIABLO"],
      unknown_ids: [],
      decision_impact: "Fixes the comparison denominator at the confirmed material context.",
    },
  ],
  tradeoffs: [
    {
      tradeoff_id: "TRADE_001",
      benefit: "Architecture validation preserves optionality.",
      cost: "Final product commitment is delayed until gates close.",
      decision_impact: "Supports bounded validation funding.",
      source_ids: ["NVIDIA_800VDC_AI_POWER", "VERTIV_AI_POWER_SWING_UPS"],
      unknown_ids: ["U_TARGET_TIMING"],
    },
  ],
  risks: [
    {
      risk_id: "RISK_001",
      risk: "Unknown critical constraints may invalidate the selected architecture.",
      likelihood: "UNKNOWN",
      impact: "HIGH",
      mitigation: "Resolve protected-load and site constraints before architecture lock.",
      source_ids: [],
      unknown_ids: ["U_CRITICAL_CONSTRAINTS"],
    },
  ],
  decision_gates: [
    {
      gate_id: "GATE_001",
      condition: "Protected-load requirements and critical constraints are validated.",
      status: "BLOCKED",
      blocking_unknown_ids: ["U_CRITICAL_CONSTRAINTS"],
      validation_action: "Complete a customer and application requirements review.",
      funding_effect: "Blocks productization funding; permits validation funding only.",
    },
  ],
  validation_actions: [
    {
      action_id: "ACTION_001",
      action: "Confirm target timing and protected-load constraints with the customer.",
      owner: "Product and solution engineering",
      trigger: "Before architecture selection",
      evidence_required: "Customer-confirmed timing and protected-load requirement record",
      resolves_unknown_ids: ["U_TARGET_TIMING", "U_CRITICAL_CONSTRAINTS"],
    },
  ],
  recommendation: {
    status: "QUALIFIED",
    decision: "Fund a bounded dual-architecture validation; do not select a final architecture yet.",
    rationale: "The frozen evidence boundary supports evaluation but confirmed unknowns remain material.",
    conditions: [
      "Close GATE_001 before productization funding.",
      "Retain both architecture alternatives until system testing is complete.",
    ],
    source_ids: ["NVIDIA_800VDC_AI_POWER", "OCP_MT_DIABLO", "VERTIV_AI_POWER_SWING_UPS"],
    unknown_ids: ["U_TARGET_TIMING", "U_CRITICAL_CONSTRAINTS"],
  },
  required_action: {
    action: "Execute ACTION_001 and record evidence before architecture lock.",
    owner: "Product lead",
    timing: "Next decision gate",
    blocking: true,
  },
  funding_boundary: {
    status: "QUALIFIED",
    allowed_commitment: "Requirements discovery and architecture validation funding.",
    prohibited_commitment: "Final productization, launch, or architecture-lock funding.",
    release_conditions: ["GATE_001 passes with traceable evidence."],
    unknown_ids: ["U_TARGET_TIMING", "U_CRITICAL_CONSTRAINTS"],
  },
  confidence: {
    level: "LOW",
    score: null,
    rationale: "Material confirmed unknowns remain open.",
    constrained_by_unknown_ids: ["U_TARGET_TIMING", "U_CRITICAL_CONSTRAINTS"],
  },
  unresolved_unknowns: [
    {
      unknown_id: "U_TARGET_TIMING",
      field: "target_timing",
      status: "UNKNOWN",
      description: "The customer has not confirmed target timing.",
      constrains: ["confidence", "funding_boundary", "recommendation", "validation_action"],
      decision_impact: "Prevents a committed launch and investment schedule.",
      required_validation_action: "Obtain customer-confirmed target timing.",
    },
    {
      unknown_id: "U_CRITICAL_CONSTRAINTS",
      field: "critical_constraints",
      status: "UNKNOWN",
      description: "Critical application and protected-load constraints are not confirmed.",
      constrains: ["confidence", "funding_boundary", "decision_gate", "recommendation"],
      decision_impact: "May eliminate one or both architecture alternatives.",
      required_validation_action: "Complete the protected-load requirements review.",
    },
  ],
  claim_candidates: [
    {
      claim_id: "CC_001",
      statement: "The evaluated comparison scope is 1MW.",
      value: 1,
      claim_type: "METRIC",
      proposed_class: "SOURCE_BACKED",
      source_ids: ["OCP_MT_DIABLO"],
      scope: {
        product: "POWER_ARCHITECTURE_DECISION",
        application: "AI 数据中心受保护负载",
        customer: "CUSTOMER_X",
        region: "REGION_ALPHA",
        time: "current evaluation",
      },
      numeric_provenance: {
        value: 1,
        unit: "MW",
        source_type: "confirmed_input_plus_boundary_source",
        source_id: "OCP_MT_DIABLO",
        derivation: "Direct confirmed input; source used only for system-boundary reasoning.",
        denominator: "one confirmed system comparison",
        exclusions: ["No facility-wide extrapolation"],
      },
      reasoning_bridge: "The user-confirmed 1MW scope defines the denominator for the system comparison.",
      uncertainty: "Architecture performance at this scope is not yet validated.",
      decision_impact: "Prevents comparisons at a different material scale.",
    },
    {
      claim_id: "CC_002",
      statement: "Target timing remains unknown.",
      value: "unknown",
      claim_type: "UNKNOWN",
      proposed_class: "UNKNOWN",
      source_ids: [],
      scope: {
        product: "POWER_ARCHITECTURE_DECISION",
        application: "AI 数据中心受保护负载",
        customer: "CUSTOMER_X",
        region: "REGION_ALPHA",
        time: "unknown",
      },
      numeric_provenance: null,
      reasoning_bridge: "The confirmed input explicitly marks target timing UNKNOWN.",
      uncertainty: "No supported timing fact exists.",
      decision_impact: "Restricts funding and recommendation timing.",
    },
  ],
});
