const scenario2LiquidCoolingCduBoundary = {
  scenarioId: "scenario_2_liquid_cooling_cdu_120kw_rack_boundary",
  title: "Liquid cooling CDU / 120kW rack boundary preview",
  userQuestion: "120kW 级液冷机柜接入 CDU 时，热交换与运维边界应如何定义？",
  previewType: "scenario_boundary_preview",
  status: "preview_ready",
  safeForUserDisplay: true,
  notProductionReady: true,
  sourceRefs: [
    {
      id: "src_s2_spec",
      title: "CDU thermal guide specification",
      sourceType: "guide_specification",
      confidence: "high",
      evidenceConfidenceScore: 0.88,
    },
    {
      id: "src_s2_whitepaper",
      title: "Official vendor liquid cooling whitepaper",
      sourceType: "official_vendor_whitepaper",
      confidence: "medium",
      evidenceConfidenceScore: 0.72,
    },
    {
      id: "src_s2_manual",
      title: "Official vendor CDU service manual",
      sourceType: "official_vendor_manual",
      confidence: "high",
      evidenceConfidenceScore: 0.8,
    },
  ],
  claimRefs: [
    {
      id: "claim_s2_thermal_mapping",
      claim: "Thermal boundary reviews should connect rack delta-T, facility water temperature, and leak response ownership in one trace.",
      sourceRefs: ["src_s2_spec", "src_s2_manual"],
      confidence: "high",
      claimType: "source_backed",
    },
    {
      id: "claim_s2_interface_risk",
      claim: "Mixed-material loops require a compatibility review before facility and IT teams freeze the fluid interface scope.",
      sourceRefs: ["src_s2_whitepaper", "src_s2_manual"],
      confidence: "medium",
      claimType: "source_backed_inference",
    },
    {
      id: "claim_s2_vendor_boundary",
      claim: "Vendor thermal operating windows still need on-site hydraulic validation and leak drills.",
      sourceRefs: ["src_s2_whitepaper"],
      confidence: "medium",
      claimType: "vendor_claim_with_validation_required",
      validationRequired: true,
    },
  ],
  diagnostics: {
    assumptions: [
      "Facility water quality and rack-side coolant composition remain project-specific inputs.",
    ],
    forbiddenClaims: [],
  },
  sections: [
    {
      id: "s2_thermal_boundary",
      title: "Thermal and interface boundary",
      summary: "Boundary coverage stays focused on measurable thermal interfaces and service ownership.",
      body: "This preview does not replace site hydraulic commissioning or leak response rehearsal.",
      metrics: [
        {
          id: "s2_metric_thermal",
          label: "Thermal interface map",
          value: "Tie thermal review to measurable water-side and rack-side control points.",
          description: "Boundary metrics should remain attached to traceable thermal measurements.",
          details: {
            flowRateByDeltaT: "Map required flow rate bands against target rack delta-T windows.",
            fwsTcsTemperatureMapping: "Keep facility water supply and technology cooling system setpoints explicitly paired.",
            dewPointTrackingControl: "Track condensation margin and control escalation logic around dew-point drift.",
          },
        },
      ],
      items: [
        {
          id: "s2_item_service",
          label: "Service interface",
          value: "Assign service ownership before the hydraulic interface is accepted.",
          details: {
            fluidInterfaceSLA: "Define response times and accountability at the CDU-to-facility handoff.",
            leakResponseHierarchy: "Clarify rack, row, and facility escalation order for leak alarms.",
            materialCompatibility: "Check hoses, manifolds, seals, and inhibitors against the selected coolant stack.",
          },
        },
      ],
      risks: [
        {
          id: "s2_risk_condensation",
          description: "Condensation margin can narrow during part-load and mixed-season operation.",
          mitigation: "Review controls, sensors, and operating envelopes before field sign-off.",
        },
      ],
    },
  ],
};

export default scenario2LiquidCoolingCduBoundary;
