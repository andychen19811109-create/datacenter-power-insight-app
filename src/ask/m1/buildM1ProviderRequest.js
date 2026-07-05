import { getM1EvidenceSnapshot } from "./m1EvidencePack.js";

const jsonInstruction = `Return only pure JSON, or one outer json code fence containing one JSON object.
Do not write a markdown report, markdown headings, bullet-only narrative, prose before the JSON, or prose after the JSON.
The first non-whitespace character must be "{" unless you use one outer json code fence.
Use profileVersion "m1-investment-report-v1" and mode "m1_investment".
Use exactly the frozen M1 modules: executiveDecision, whyNow, marketSignals, customerPains, applicationBoundary, powerArchitecture, criticalTechnicalMetrics, competitivePosition, commercialDecision, riskRegister, evidenceAndUncertainty, decisionGates, actions30_60_90.
Use decision enum INVEST, CONDITIONAL_INVEST, WATCH, or NO_GO.
Use requiredAction enum VALIDATE, PROCEED, SCOPE_DOWN, ARCHITECTURE_RESET, or KILL.
Use evidenceClass enum VERIFIED_FACT, EXPERT_INFERENCE, or MUST_VALIDATE.
The JSON object must contain these top-level keys and no other top-level keys: profileVersion, mode, evidenceSnapshotDate, resolvedContext, executiveDecision, whyNow, marketSignals, customerPains, applicationBoundary, powerArchitecture, criticalTechnicalMetrics, competitivePosition, commercialDecision, riskRegister, evidenceAndUncertainty, decisionGates, actions30_60_90.
resolvedContext must contain exactly: productObject, application, customerType, region, powerClass, investmentHorizon, vendorProfile, vendorCapabilityBaseline.
executiveDecision must contain: decision, requiredAction, fundingBoundary, decisionConfidence, investmentThesis, criticalUnknowns.
applicationBoundary must contain noFit plus fit descriptions.
Each evidence-bearing item with VERIFIED_FACT or EXPERT_INFERENCE must include non-empty sourceIds from the curated evidence ids. Use MUST_VALIDATE with sourceIds [] only for validation gaps.
Array items in whyNow, marketSignals, customerPains, criticalTechnicalMetrics, riskRegister, evidenceAndUncertainty, decisionGates, and actions30_60_90 must use object fields, not markdown strings.
Architecture-level invalidity cannot be averaged away by market opportunity.
Do not invent market size, CAGR, customer demand percentage, vendor cost advantage, named deployments, or certification status.
Every customer pain must connect to productImplication or decisionImpact.
Every critical metric must state thresholdOrValidationGate and decisionImpact.
Every decision-critical risk must state earlyWarning, killTrigger, and requiredResponse.
Every decision gate must state observablePassCondition and missingEvidence.`;

const schemaInstruction = `Required JSON field shape:
executiveDecision = { "decision": enum, "requiredAction": enum, "fundingBoundary": string, "decisionConfidence": string, "investmentThesis": string, "criticalUnknowns": string[] }.
applicationBoundary = { "bestFit": string, "secondaryFit": string, "noFit": string }.
whyNow[] and marketSignals[] include { "evidenceClass": enum, "sourceIds": string[], "point" or "signal": string }.
customerPains[] include { "evidenceClass": enum, "sourceIds": string[], "pain": string, "productImplication": string, "decisionImpact": string }.
powerArchitecture, competitivePosition, and commercialDecision may be plain objects without evidenceClass; if they include evidenceClass they must also include sourceIds, and VERIFIED_FACT or EXPERT_INFERENCE must use non-empty sourceIds.
criticalTechnicalMetrics[] include { "evidenceClass": enum, "sourceIds": string[], "metric": string, "thresholdOrValidationGate": string, "decisionImpact": string }.
riskRegister[] include { "evidenceClass": enum, "sourceIds": string[], "risk": string, "decisionImpact": string, "earlyWarning": string, "killTrigger": string, "requiredResponse": string }; use non-empty sourceIds for VERIFIED_FACT or EXPERT_INFERENCE, and use MUST_VALIDATE with sourceIds [] for unsourced risk gaps.
evidenceAndUncertainty[] include { "evidenceClass": enum, "sourceIds": string[], "point": string, "uncertainty": string }; use non-empty sourceIds for VERIFIED_FACT or EXPERT_INFERENCE, and use MUST_VALIDATE with sourceIds [] only for unsourced validation gaps.
decisionGates[] include { "gate": string, "observablePassCondition": string, "missingEvidence": string[] }.
actions30_60_90[] include { "window": string, "objective": string, "actions": string[], "requiredEvidence": string[], "endDecision": enum }.`;

export const buildM1ProviderRequest = ({
  question,
  filters = {},
  eligibility,
  resolvedContext,
  presentationPerspective,
}) => {
  const evidenceSnapshot = getM1EvidenceSnapshot();
  const sourceIds = evidenceSnapshot.sources.map((source) => source.sourceId);
  const localRoute = eligibility.routeDecision.route;
  const localIntent = eligibility.askState.intent?.type || "unknown";
  const knownCompetitors = ["Schneider Electric Galaxy VXL", "Vertiv AI UPS controls"];
  const machineQuery = `${question}

M1 machine-output contract:
${jsonInstruction}

Required schema details:
${schemaInstruction}

Valid sourceIds:
${sourceIds.join(", ")}

Return the M1 investment decision as the JSON object only.`;

  return {
    query: machineQuery,
    response_mode: "blocking",
    inputs: {
      track: "UPS investment decision",
      application: resolvedContext.application,
      region: resolvedContext.region,
      customer_type: resolvedContext.customerType,
      analysis_goal: "M1 UPS investment decision for high-density AI data-center use",
      known_competitors: knownCompetitors.join("; "),
      time_horizon: resolvedContext.investmentHorizon,
      extra_context: JSON.stringify({
        profile: "M1 UPS investment decision core",
        presentationPerspective,
        localRoute,
        localIntent,
        guardrailMode: "m1_investment_fail_closed",
        guardrailNote: "Use only the M1 method, resolved context, and curated evidence snapshot. Do not use prior scoring artifacts, old level labels, broad summary text, or fallback report templates.",
        resolvedContext,
        evidenceSnapshot,
        method: jsonInstruction,
        schema: schemaInstruction,
        validSourceIds: sourceIds,
        forbiddenContent: [
          "prior scoring artifact",
          "old level label",
          "broad summary text",
          "golden-reference leakage",
          "preselected conclusion",
          "question-to-answer lookup",
        ],
      }),
    },
  };
};

export const M1_PROVIDER_JSON_INSTRUCTION = jsonInstruction;
