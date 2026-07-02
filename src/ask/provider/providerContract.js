// Static Provider contract only. Provider is not Dify; Dify may become one
// future implementation only after a separate Gate. This file activates no
// provider, performs no network call, renders no UI, and changes no legacy Ask
// behavior.

export const PROVIDER_CONTRACT_SCHEMA_VERSION = "provider-contract-v1";

export const PROVIDER_REQUEST_REQUIRED_FIELDS = Object.freeze([
  "requestId",
  "question",
  "taskContext",
  "intent",
  "constraints",
  "policies",
  "locale",
]);

export const NORMALIZED_PROVIDER_RESPONSE_REQUIRED_FIELDS = Object.freeze([
  "schemaVersion",
  "responseId",
  "provider",
  "status",
  "generatedAt",
  "freshness",
  "sourceRefs",
  "claimRefs",
  "limitations",
]);

export const PROVIDER_INTENTS = Object.freeze({
  TECHNICAL_ROADMAP_AND_ENTRY_GATE: "technical_roadmap_and_entry_gate",
  COMPANY_FACT_CHECK: "company_fact_check",
  MARKET_ANALYSIS: "market_analysis",
  PRODUCT_PLANNING: "product_planning",
  UNSUPPORTED: "unsupported",
});

export const OBJECT_TYPES = Object.freeze({
  PRODUCT: "product",
  COMPANY: "company",
  TECHNOLOGY: "technology",
  MARKET: "market",
  UNKNOWN: "unknown",
});

export const OBJECT_ROLES = Object.freeze({
  PRIMARY: "primary",
  COMPARISON: "comparison",
  CONTEXT: "context",
});

export const PROVIDER_MODES = Object.freeze({
  MOCK: "mock",
  DISABLED: "disabled",
  PREVIEW_PROVIDER: "preview_provider",
  UNKNOWN: "unknown",
});

export const NORMALIZED_PROVIDER_STATUSES = Object.freeze({
  SCHEMA_INVALID: "schema_invalid",
  PROVIDER_ERROR: "provider_error",
  PROVIDER_TIMEOUT: "provider_timeout",
  BLOCKED: "blocked",
  EVIDENCE_REQUIRED: "evidence_required",
  SOURCE_STALE: "source_stale",
  UNSUPPORTED: "unsupported",
  WARNING: "warning",
  READY: "ready",
});

export const VALIDATION_STATUS_PRECEDENCE = Object.freeze([
  NORMALIZED_PROVIDER_STATUSES.SCHEMA_INVALID,
  NORMALIZED_PROVIDER_STATUSES.PROVIDER_ERROR,
  NORMALIZED_PROVIDER_STATUSES.PROVIDER_TIMEOUT,
  NORMALIZED_PROVIDER_STATUSES.BLOCKED,
  NORMALIZED_PROVIDER_STATUSES.EVIDENCE_REQUIRED,
  NORMALIZED_PROVIDER_STATUSES.SOURCE_STALE,
  NORMALIZED_PROVIDER_STATUSES.UNSUPPORTED,
  NORMALIZED_PROVIDER_STATUSES.WARNING,
  NORMALIZED_PROVIDER_STATUSES.READY,
]);

export const SOURCE_TYPES = Object.freeze({
  GOVERNMENT: "government",
  STANDARD_BODY: "standard_body",
  CUSTOMER_OFFICIAL: "customer_official",
  VENDOR_OFFICIAL: "vendor_official",
  INDUSTRY_REPORT: "industry_report",
  LOCAL_KB: "local_kb",
  UNCORROBORATED: "uncorroborated",
  QUOTE_DOCUMENT: "quote_document",
});

export const RELIABILITY_TIERS = Object.freeze({
  L1: "L1",
  L2: "L2",
  L3: "L3",
  L4: "L4",
  L5: "L5",
  L6: "L6",
});

export const CONFIDENCE_LEVELS = Object.freeze({
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
});

export const FRESHNESS_CATEGORIES = Object.freeze({
  PRICING_REFERENCE_TREND: "pricing.reference_trend",
  PRICING_LIVE_EXACT_QUOTE: "pricing.live_exact_quote",
  MARKET_SIZE: "market_size",
  COMPANY_STATUS: "company_status",
  PRODUCT_SPECS: "product_specs",
  REGULATIONS_STANDARDS: "regulations_standards",
  COMPETITIVE_CLAIMS: "competitive_claims",
  TECHNOLOGY_ROADMAP: "technology_roadmap",
  AVAILABILITY_LAUNCH_DEPLOYMENT: "availability_launch_deployment",
  STABLE_BACKGROUND: "stable_background",
});

export const PRICING_CATEGORIES = Object.freeze({
  REFERENCE_TREND: FRESHNESS_CATEGORIES.PRICING_REFERENCE_TREND,
  LIVE_EXACT_QUOTE: FRESHNESS_CATEGORIES.PRICING_LIVE_EXACT_QUOTE,
  UNKNOWN: "pricing.unknown",
});

export const ALLOWED_MAX_AGE_WINDOWS = Object.freeze({
  [FRESHNESS_CATEGORIES.PRICING_REFERENCE_TREND]: Object.freeze({
    maxAgeHours: 720,
    precision: "day",
  }),
  [FRESHNESS_CATEGORIES.PRICING_LIVE_EXACT_QUOTE]: Object.freeze({
    maxAgeHours: 24,
    precision: "hour",
  }),
  [FRESHNESS_CATEGORIES.MARKET_SIZE]: Object.freeze({
    maxAgeHours: 4320,
    precision: "day",
  }),
  [FRESHNESS_CATEGORIES.COMPANY_STATUS]: Object.freeze({
    maxAgeHours: 720,
    precision: "day",
  }),
  [FRESHNESS_CATEGORIES.PRODUCT_SPECS]: Object.freeze({
    maxAgeHours: 2160,
    precision: "day",
  }),
  [FRESHNESS_CATEGORIES.REGULATIONS_STANDARDS]: Object.freeze({
    maxAgeHours: 8760,
    precision: "day",
  }),
  [FRESHNESS_CATEGORIES.COMPETITIVE_CLAIMS]: Object.freeze({
    maxAgeHours: 2160,
    precision: "day",
  }),
  [FRESHNESS_CATEGORIES.TECHNOLOGY_ROADMAP]: Object.freeze({
    maxAgeHours: 4320,
    precision: "day",
  }),
  [FRESHNESS_CATEGORIES.AVAILABILITY_LAUNCH_DEPLOYMENT]: Object.freeze({
    maxAgeHours: 720,
    precision: "day",
  }),
  [FRESHNESS_CATEGORIES.STABLE_BACKGROUND]: Object.freeze({
    maxAgeHours: 17520,
    precision: "day",
  }),
});

export const LIVE_EXACT_QUOTE_INDICATORS = Object.freeze([
  "今日价格",
  "当前价格",
  "实时报价",
  "可成交价",
  "含税实价",
  "专场报价",
  "today's price",
  "todays price",
  "live quote",
  "current price",
  "exact quote",
  "valid until",
  "final offer",
  "transaction price",
]);

export const REFERENCE_TREND_PRICING_INDICATORS = Object.freeze([
  "参考价格",
  "价格区间",
  "趋势",
  "历史价格",
  "行业均价",
  "benchmark",
  "reference range",
  "historical trend",
  "indicative pricing",
]);

export const FORBIDDEN_REQUEST_FIELDS = Object.freeze([
  "difyWorkflowId",
  "difyAppId",
  "difyToken",
  "apiKey",
  "authorization",
  "bearer",
  "env",
  "stack",
  "rawTrace",
  "promptInternals",
  "workflowNodeNames",
]);

export const FORBIDDEN_DIAGNOSTIC_FIELDS = Object.freeze([
  "rawProviderPayload",
  "difyWorkflowId",
  "workflowId",
  "nodeName",
  "apiToken",
  "userId",
  "appId",
  "promptInternals",
  "rawWorkflowOutput",
  "stack",
  "env",
  "secret",
]);

export const FORBIDDEN_UI_CLAIMS = Object.freeze([
  "better",
  "upgraded",
  "replacement",
  "production-ready",
  "Provider active",
  "Dify active",
  "realtime Web active",
  "Production verified",
  "当前价格",
  "实时报价",
  "今日报价",
  "可成交价",
]);

export const PROVIDER_CONTRACT_NON_CLAIMS = Object.freeze([
  "Provider contract constants do not activate a Provider.",
  "Provider contract constants do not activate Dify.",
  "Provider contract constants do not call DeepSeek, RAG, or realtime Web.",
  "Provider contract constants do not replace default Ask output.",
  "Provider contract constants do not prove Ask output quality improvement.",
  "Provider contract constants do not verify Production or Vercel behavior.",
]);
