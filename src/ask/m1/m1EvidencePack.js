export const M1_EVIDENCE_SNAPSHOT_DATE = "2026-07-05";

export const M1_EVIDENCE_SOURCES = Object.freeze([
  {
    sourceId: "m1_nvidia_800vdc",
    organization: "NVIDIA",
    title: "Building the 800 VDC Ecosystem for Efficient, Scalable AI Factories",
    sourceType: "vendor_official",
    locator: "https://developer.nvidia.com/blog/building-the-800-vdc-ecosystem-for-efficient-scalable-ai-factories/",
    lastVerifiedDate: M1_EVIDENCE_SNAPSHOT_DATE,
    allowedEvidence: [
      "NVIDIA describes rapid power swings from synchronous AI workloads.",
      "NVIDIA describes rack utilization moving from approximately 30% to 100% and back in milliseconds.",
      "NVIDIA describes rack power moving from tens of kW to well above 100kW, with 1MW/rack on the horizon.",
      "NVIDIA describes physical/economic limitations of traditional 54VDC distribution at these power levels.",
      "NVIDIA presents movement from 415/480VAC distribution toward 800VDC.",
      "NVIDIA describes a phased transition to fully realized 800VDC.",
    ],
    forbiddenExtrapolation: [
      "all current AI data centers use 800VDC",
      "AC UPS is obsolete",
      "all Colo customers share one transition date",
    ],
  },
  {
    sourceId: "m1_ocp_diablo",
    organization: "Open Compute Project",
    title: "Realizing the Open Data Center Ecosystem Vision",
    sourceType: "standard_industry_body",
    locator: "https://www.opencompute.org/blog/realizing-the-open-data-center-ecosystem-vision",
    lastVerifiedDate: M1_EVIDENCE_SNAPSHOT_DATE,
    allowedEvidence: [
      "OCP identifies the Mt Diablo power-rack sidecar.",
      "Diablo moves power delivery from today's 48VDC toward +/-400VDC or 800VDC.",
      "OCP describes power solutions for high-density AI racks from 100kW up to 1MW.",
    ],
    forbiddenExtrapolation: [
      "OCP roadmap equals universal current deployment",
      "all customer SLDs use Diablo",
    ],
  },
  {
    sourceId: "m1_digital_realty_hd_colo",
    organization: "Digital Realty",
    title: "High-Density Colocation",
    sourceType: "customer_operator_official",
    locator: "https://www.digitalrealty.com/platform-digital/colocation/high-density-colocation",
    lastVerifiedDate: M1_EVIDENCE_SNAPSHOT_DATE,
    allowedEvidence: [
      "Digital Realty markets High-Density Colocation for AI/HPC.",
      "Its published offer starts at 30kW per cabinet.",
      "The published offer scales to multi-MW deployments.",
      "The published offer states support up to 150kW per cabinet.",
      "Fast deployment is presented as a customer requirement.",
    ],
    forbiddenExtrapolation: [
      "Digital Realty represents the whole North American Colo market",
      "150kW is a universal rack-density ceiling",
    ],
  },
  {
    sourceId: "m1_schneider_galaxy_vxl",
    organization: "Schneider Electric",
    title: "Galaxy VXL UPS",
    sourceType: "vendor_official",
    locator: "https://www.se.com/ww/en/about-us/newsroom/news/press-releases/schneider-electric-announces-galaxy-vxl-ups-the-industry%27s-most-compact-high-density-power-protection-system-for-ai-data-center-and-large-scale-electrical-workloads-674d295fa5833dcbf5002c43/",
    lastVerifiedDate: M1_EVIDENCE_SNAPSHOT_DATE,
    allowedEvidence: [
      "Galaxy VXL supports up to 1.25MW critical load in one frame.",
      "Schneider states 125kW / 3U power modules.",
      "Schneider states up to 97.5% double-conversion efficiency.",
      "Schneider states up to 99% eConversion efficiency.",
      "Schneider states a 100kA short-circuit rating.",
      "Schneider positions the product for prefabricated data centers.",
    ],
    forbiddenExtrapolation: [
      "1.25MW is the mandatory M1 platform size",
      "125kW is a mandatory module size",
      "100kA is a regulatory minimum",
      "competitor specification automatically equals customer requirement",
    ],
  },
  {
    sourceId: "m1_vertiv_ai_ups_controls",
    organization: "Vertiv",
    title: "Advanced UPS controls mitigate risks of infrastructure stress from AI workloads' power swings",
    sourceType: "vendor_official",
    locator: "https://www.vertiv.com/en-us/insights/articles/blog-posts/advanced-ups-controls--mitigate-risks-of-infrastructure-stress-from-ai-workloads-power-swings/",
    lastVerifiedDate: M1_EVIDENCE_SNAPSHOT_DATE,
    allowedEvidence: [
      "Vertiv describes AI GPU clusters moving from idle to full load in milliseconds.",
      "Vertiv identifies battery micro-discharge during fast load transitions as a UPS concern.",
      "Vertiv describes laboratory testing of 0-100% power steps without unnecessary battery cycling for its Battery Shield implementation.",
      "Vertiv describes Input Power Smoothing for upstream power variation.",
      "Vertiv describes testing across different load steps, duty cycles, battery configurations and fluctuation ranges.",
    ],
    forbiddenExtrapolation: [
      "0-100% is an UL or IEC mandatory test",
      "Battery Shield is an industry-standard required feature",
      "every UPS must copy Vertiv's control implementation",
    ],
  },
  {
    sourceId: "m1_ul_1778",
    organization: "UL Solutions",
    title: "Uninterruptible Power Supply Safety and Compliance with UL 1778",
    sourceType: "standard_certification_official",
    locator: "https://www.ul.com/services/uninterruptible-power-supply-ups-safety-and-compliance-ul-1778",
    lastVerifiedDate: M1_EVIDENCE_SNAPSHOT_DATE,
    allowedEvidence: [
      "UL Solutions provides UPS testing and certification in accordance with UL 1778 and other applicable safety standards.",
      "UL 1778 is the Standard for Uninterruptible Power Systems.",
    ],
    forbiddenExtrapolation: [
      "saying supports UL proves certification",
      "an existing certification automatically covers a new platform or configuration",
    ],
  },
  {
    sourceId: "m1_osha_nrtl",
    organization: "OSHA",
    title: "Nationally Recognized Testing Laboratory Program",
    sourceType: "government_regulation",
    locator: "https://www.osha.gov/nationally-recognized-testing-laboratory-program",
    lastVerifiedDate: M1_EVIDENCE_SNAPSHOT_DATE,
    allowedEvidence: [
      "OSHA recognizes NRTLs for product certification within applicable OSHA electrical-standard requirements.",
      "NRTLs have recognized scopes of test standards.",
      "An NRTL certification mark represents testing and certification against appropriate product-safety standards within scope.",
    ],
    forbiddenExtrapolation: [
      "every product/configuration/customer has identical NRTL requirements",
      "NRTL replaces application-specific compliance review",
    ],
  },
]);

export const M1_SOURCE_IDS = Object.freeze(new Set(M1_EVIDENCE_SOURCES.map((source) => source.sourceId)));

export const getM1EvidenceSnapshot = () => ({
  verifiedAsOf: M1_EVIDENCE_SNAPSHOT_DATE,
  sources: M1_EVIDENCE_SOURCES,
});
