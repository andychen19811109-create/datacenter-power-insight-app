const scenario1UpsAiGpuLoadStepResponse = {
  scenarioId: "scenario_1_ups_ai_gpu_load_step_response",
  title: "UPS / AI GPU load step response boundary preview",
  userQuestion: "AI GPU 集群毫秒级跃变负载下，UPS 与上游柴油机协调边界如何判断？",
  previewType: "scenario_boundary_preview",
  status: "preview_ready",
  safeForUserDisplay: true,
  notProductionReady: true,
  sourceRefs: [
    {
      id: "src_s1_standard",
      title: "UPS transient performance guide",
      sourceType: "guide_specification",
      confidence: "high",
      evidenceConfidenceScore: 0.9,
    },
    {
      id: "src_s1_datasheet",
      title: "Vendor UPS dynamic response datasheet",
      sourceType: "official_vendor_datasheet",
      confidence: "high",
      evidenceConfidenceScore: 0.82,
    },
    {
      id: "src_s1_manual",
      title: "Battery cycling application manual",
      sourceType: "official_vendor_manual",
      confidence: "medium",
      evidenceConfidenceScore: 0.78,
    },
  ],
  claimRefs: [
    {
      id: "claim_s1_step_response",
      claim: "Transient ride-through judgment should be tied to measured step response windows and upstream coordination assumptions.",
      sourceRefs: ["src_s1_standard", "src_s1_datasheet"],
      confidence: "high",
      claimType: "source_backed",
    },
    {
      id: "claim_s1_microcycling",
      claim: "Battery duty should be reviewed for repetitive short-duration discharge and recharge stress during AI burst workloads.",
      sourceRefs: ["src_s1_manual"],
      confidence: "medium",
      claimType: "source_backed_inference",
    },
    {
      id: "claim_s1_vendor_boundary",
      claim: "Vendor step-load envelope needs project FAT evidence before it is treated as a deployable site boundary.",
      sourceRefs: ["src_s1_datasheet"],
      confidence: "medium",
      claimType: "vendor_claim_with_validation_required",
      validationRequired: true,
    },
  ],
  diagnostics: {
    assumptions: [
      "The preview stays at boundary analysis and still requires site validation.",
    ],
    forbiddenClaims: [],
  },
  sections: [
    {
      id: "s1_boundary",
      title: "Boundary envelope",
      summary: "Focus on dynamic response checks instead of deterministic deployment claims.",
      body: "This preview frames the control boundary and avoids replacing commissioning evidence.",
      metrics: [
        {
          id: "s1_metric_dynamic_response",
          label: "Dynamic response envelope",
          value: "Use sub-second disturbance records and commissioning windows.",
          description: "Step response evidence should stay traceable to tested disturbance envelopes.",
          details: {
            stepLoadEnvelope: "Reference 0-100 percent load-step envelope as a test boundary, not a guaranteed site result.",
            upstreamGeneratorCoordination: "Review generator AVR and governor recovery together with UPS ride-through settings.",
            inputSideDynamicPowerQuality: "Track voltage sag depth, harmonic distortion, and recovery slope under burst events.",
          },
        },
      ],
      items: [
        {
          id: "s1_item_battery",
          label: "Battery duty note",
          value: "Check battery stress exposure before converting burst behavior into deployment assumptions.",
          details: {
            batteryMicrocyclingRisk: "Short repeated discharge events may increase battery wear if control thresholds are too aggressive.",
          },
        },
      ],
      risks: [
        {
          id: "s1_risk_vendor_boundary",
          description: "Vendor transient windows can be narrower than site-level generator and feeder interactions.",
          mitigation: "Keep FAT and SAT acceptance criteria explicit before final design lock.",
        },
      ],
    },
  ],
};

export default scenario1UpsAiGpuLoadStepResponse;
