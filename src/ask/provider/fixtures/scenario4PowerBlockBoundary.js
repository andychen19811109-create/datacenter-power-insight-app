const scenario4PowerBlockBoundary = {
  scenarioId: "scenario_4_1mw_power_block",
  title: "1MW power block delivery boundary preview",
  userQuestion: "1MW Power Block 方案在交付和验收层面应如何界定边界与风险？",
  previewType: "scenario_boundary_preview",
  status: "preview_ready",
  safeForUserDisplay: true,
  notProductionReady: true,
  sourceRefs: [
    {
      id: "src_s4_standard",
      title: "Power block compliance and test guide",
      sourceType: "guide_specification",
      confidence: "high",
      evidenceConfidenceScore: 0.86,
    },
    {
      id: "src_s4_datasheet",
      title: "Official vendor modular power block datasheet",
      sourceType: "official_vendor_datasheet",
      confidence: "high",
      evidenceConfidenceScore: 0.83,
    },
    {
      id: "src_s4_case",
      title: "Official customer case on modular power deployment",
      sourceType: "official_customer_case",
      confidence: "medium",
      evidenceConfidenceScore: 0.68,
    },
  ],
  claimRefs: [
    {
      id: "claim_s4_delivery_scope",
      claim: "Delivery reviews should separate packaged scope, transport limits, FAT or SAT boundaries, and customer-side acceptance work.",
      sourceRefs: ["src_s4_standard", "src_s4_datasheet"],
      confidence: "high",
      claimType: "source_backed",
    },
    {
      id: "claim_s4_schedule_risk",
      claim: "Time-to-revenue assumptions need dependencies and site readiness checks before executive planning uses them.",
      sourceRefs: ["src_s4_case", "src_s4_standard"],
      confidence: "medium",
      claimType: "source_backed_inference",
    },
    {
      id: "claim_s4_vendor_boundary",
      claim: "Packaged power block delivery claims require project-specific FAT, SAT, and logistics confirmation.",
      sourceRefs: ["src_s4_datasheet"],
      confidence: "medium",
      claimType: "vendor_claim_with_validation_required",
      validationRequired: true,
    },
  ],
  diagnostics: {
    assumptions: [
      "The preview remains a planning boundary artifact and does not replace project execution review.",
    ],
    forbiddenClaims: [],
  },
  sections: [
    {
      id: "s4_delivery_boundary",
      title: "Delivery and acceptance boundary",
      summary: "Keep delivery scope, logistics, compliance, and acceptance gates separated.",
      body: "This preview preserves boundary reasoning and avoids schedule certainty claims.",
      metrics: [
        {
          id: "s4_metric_packaged_scope",
          label: "Packaged scope boundary",
          value: "Review packaged delivery scope together with site readiness gates.",
          description: "Delivery planning should remain conditional on logistics, testing, and site interface evidence.",
          details: {
            deliveryModel: "Separate packaged equipment scope from site-built and integrator-managed work.",
            timeToRevenue: "Tie schedule narratives to site readiness, utility milestones, and acceptance dependencies.",
            physicalFormBoundary: "Check module dimensions, crane paths, and white-space ingress constraints.",
          },
        },
      ],
      items: [
        {
          id: "s4_item_acceptance",
          label: "Acceptance structure",
          value: "Testing and warranty scope should stay explicit before commercial commitment.",
          details: {
            fatSatBoundary: "Keep FAT and SAT obligations separated by deliverable, witness role, and sign-off owner.",
            complianceMatrix: "Track electrical, safety, and local code obligations as an explicit checklist.",
            transportEnvelope: "Confirm route, lifting, shock, and packaging constraints before shipment release.",
            integratedWarrantyBoundary: "State which failures remain within packaged scope and which stay with site integration.",
            assumptionBaseline: "Record the planning assumptions that still require customer-side confirmation.",
          },
        },
      ],
      risks: [
        {
          id: "s4_risk_schedule",
          description: "Compressed delivery narratives can hide acceptance, logistics, or local code dependencies.",
          mitigation: "Review milestone assumptions with logistics, commissioning, and customer teams before lock.",
        },
      ],
    },
  ],
};

export default scenario4PowerBlockBoundary;
