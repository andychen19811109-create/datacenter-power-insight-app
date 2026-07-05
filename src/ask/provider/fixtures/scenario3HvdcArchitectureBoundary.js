const scenario3HvdcArchitectureBoundary = {
  scenarioId: "scenario_3_800vdc_hvdc_architecture_boundary",
  title: "800VDC / HVDC architecture boundary preview",
  userQuestion: "800VDC 或 HVDC 方案在 AI 数据中心里应如何界定架构边界与成熟度风险？",
  previewType: "scenario_boundary_preview",
  status: "preview_ready",
  safeForUserDisplay: true,
  notProductionReady: true,
  sourceRefs: [
    {
      id: "src_s3_standard",
      title: "International DC power distribution standard",
      sourceType: "international_standard",
      confidence: "high",
      evidenceConfidenceScore: 0.94,
    },
    {
      id: "src_s3_whitepaper",
      title: "Official vendor HVDC architecture whitepaper",
      sourceType: "official_vendor_whitepaper",
      confidence: "medium",
      evidenceConfidenceScore: 0.74,
    },
    {
      id: "src_s3_report",
      title: "Investor material on commercial deployment cadence",
      sourceType: "investor_material",
      confidence: "medium",
      evidenceConfidenceScore: 0.71,
    },
  ],
  claimRefs: [
    {
      id: "claim_s3_architecture_scope",
      claim: "Architecture comparisons should separate electrical layer fit, protection stack, and deployment maturity evidence.",
      sourceRefs: ["src_s3_standard", "src_s3_report"],
      confidence: "high",
      claimType: "source_backed",
    },
    {
      id: "claim_s3_legacy_boundary",
      claim: "Legacy compatibility constraints can remain material even when a new DC topology looks attractive on paper.",
      sourceRefs: ["src_s3_standard", "src_s3_whitepaper"],
      confidence: "medium",
      claimType: "source_backed_inference",
    },
    {
      id: "claim_s3_vendor_boundary",
      claim: "Vendor reference architecture boundaries require project-specific protection and operations validation.",
      sourceRefs: ["src_s3_whitepaper"],
      confidence: "medium",
      claimType: "vendor_claim_with_validation_required",
      validationRequired: true,
    },
  ],
  diagnostics: {
    assumptions: [
      "Commercial maturity should be reviewed by deployment evidence, not by marketing language.",
    ],
    forbiddenClaims: [],
  },
  sections: [
    {
      id: "s3_architecture",
      title: "Architecture and maturity boundary",
      summary: "Keep architecture fit, legacy boundary, and protection evidence separated.",
      body: "This preview avoids declaring one topology universally deployable across every site condition.",
      metrics: [
        {
          id: "s3_metric_architecture",
          label: "Architecture fit matrix",
          value: "Evaluate electrical layer fit and protection requirements as separate checks.",
          description: "Boundary assessment should show where architecture fit is conditional rather than universal.",
          details: {
            architectureLayerFitMatrix: "Compare source, distribution, rack conversion, and protection domains explicitly.",
            legacyHVDCCompatibility: "Check retrofit friction for existing upstream switchgear, batteries, and maintenance practice.",
            vendorEntryLayer: "Identify where vendor scope starts and where integrator scope still remains.",
          },
        },
      ],
      items: [
        {
          id: "s3_item_maturity",
          label: "Maturity review",
          value: "Use deployment evidence and operational readiness reviews before architecture freeze.",
          details: {
            commercialMaturity: "Separate prototype, limited field deployment, and scaled commercial readiness.",
            safetyProtectionChecklist: "Review insulation monitoring, fault isolation, arc mitigation, and maintenance procedures.",
            architectureAlert: "Escalate sites where retrofit assumptions or protection gaps remain unresolved.",
          },
        },
      ],
      risks: [
        {
          id: "s3_risk_retrofit",
          description: "Retrofit assumptions can hide protection or operations gaps when legacy assets remain in scope.",
          mitigation: "Keep architecture decisions coupled to operations and maintenance reviews.",
        },
      ],
    },
  ],
};

export default scenario3HvdcArchitectureBoundary;
