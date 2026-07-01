import { buildPageContext, createDeterministicHash } from "../context/buildPageContext.js";
import { buildProductPlanningCardContext } from "../context/buildProductPlanningCardContext.js";

const DEFAULT_ROUTE = "/ask";
const DEFAULT_MODULE = "ask";
const DEFAULT_TIMESTAMP = "1970-01-01T00:00:00.000Z";
const DEFAULT_TASK_INTENT = "technical_roadmap_and_entry_gate";
const UNKNOWN = "unknown";

const REGION_MAP = Object.freeze({
  "全球": "global",
  "中国": "CN",
  "北美": "NA",
  "欧洲": "EU",
  "亚太": "APAC",
});

const CUSTOMER_SEGMENT_MAP = Object.freeze({
  "云服务商": "AIDC_cloud",
});

const normalizeScalar = (value) => (value == null ? "" : String(value).trim());

const normalizeObject = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeObject(item));
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = normalizeObject(value[key]);
        return accumulator;
      }, {});
  }

  return value;
};

const dedupe = (items = []) => [...new Set(items.filter(Boolean))];

const buildShadowIdentity = (input = {}) => createDeterministicHash({
  currentPageRoute: input.currentPageRoute,
  currentPageModule: input.currentPageModule,
  normalizedFilters: input.normalizedFilters,
  selectedFilters: input.selectedFilters,
});

const deriveTaskIntent = ({ question, currentPageModule }) => {
  const text = normalizeScalar(question).toLowerCase();

  if (
    currentPageModule === "companies"
    || /company|vendor|competitor|厂商|公司|客户/.test(text)
  ) {
    return {
      taskIntent: "company_fact_check",
      reasonCodes: [],
    };
  }

  if (
    currentPageModule === "technology"
    || /roadmap|gate|milestone|技术|路线|门槛|验证/.test(text)
  ) {
    return {
      taskIntent: DEFAULT_TASK_INTENT,
      reasonCodes: [],
    };
  }

  return {
    taskIntent: DEFAULT_TASK_INTENT,
    reasonCodes: ["shadow_task_intent_defaulted"],
  };
};

const mapSelectedFilters = (normalizedFilters = {}) => {
  const filters = normalizeObject(normalizedFilters);
  const selectedFilters = {};
  const reasonCodes = [];

  if (normalizeScalar(filters.role)) {
    reasonCodes.push("shadow_mapping_unresolved_role");
  }

  const mappedRegion = REGION_MAP[normalizeScalar(filters.region)];
  if (mappedRegion) {
    selectedFilters.region = mappedRegion;
  } else if (normalizeScalar(filters.region)) {
    selectedFilters.region = UNKNOWN;
    reasonCodes.push("shadow_mapping_unresolved_region");
  }

  const customerLabel = normalizeScalar(filters.customer);
  if (customerLabel && customerLabel !== "全部") {
    const mappedCustomerSegment = CUSTOMER_SEGMENT_MAP[customerLabel];
    if (mappedCustomerSegment) {
      selectedFilters.customerSegment = mappedCustomerSegment;
    } else {
      selectedFilters.customerSegment = UNKNOWN;
      reasonCodes.push("shadow_mapping_unresolved_customer");
    }
  } else {
    selectedFilters.customerSegment = UNKNOWN;
  }

  if (normalizeScalar(filters.application) && normalizeScalar(filters.application) !== "全部") {
    reasonCodes.push("shadow_mapping_unresolved_application");
  }
  selectedFilters.architectureLayer = UNKNOWN;

  if (normalizeScalar(filters.track) && normalizeScalar(filters.track) !== "全部") {
    reasonCodes.push("shadow_mapping_unresolved_track");
  }
  selectedFilters.productFamily = UNKNOWN;

  if (normalizeScalar(filters.time)) {
    reasonCodes.push("shadow_mapping_unresolved_time");
  }

  return {
    selectedFilters,
    reasonCodes,
  };
};

export const buildAskShadowRuntimeInput = (snapshot = {}) => {
  const currentPageRoute = normalizeScalar(snapshot.currentPageRoute) || DEFAULT_ROUTE;
  const currentPageModule = normalizeScalar(snapshot.currentPageModule) || DEFAULT_MODULE;
  const question = normalizeScalar(snapshot.question);
  const timestamp = normalizeScalar(snapshot.timestamp) || DEFAULT_TIMESTAMP;
  const normalizedFilters = normalizeObject(
    snapshot.context?.normalizedFilters
    || snapshot.normalizedFilters
    || snapshot.insightContext?.normalizedFilters
    || snapshot.filters
    || {},
  );

  const { selectedFilters, reasonCodes: mappingReasonCodes } = mapSelectedFilters(normalizedFilters);
  const { taskIntent, reasonCodes: taskIntentReasonCodes } = deriveTaskIntent({
    question,
    currentPageModule,
  });

  const shadowIdentity = buildShadowIdentity({
    currentPageRoute,
    currentPageModule,
    normalizedFilters,
    selectedFilters,
  });

  const productPlanningCard = buildProductPlanningCardContext({
    id: `shadow_ppc_${shadowIdentity.replace(/^ctx_/, "")}`,
    version: "shadow_bridge_v1",
    productFamily: selectedFilters.productFamily || UNKNOWN,
    customerSegment: selectedFilters.customerSegment || UNKNOWN,
    region: selectedFilters.region || UNKNOWN,
    architectureLayer: selectedFilters.architectureLayer || UNKNOWN,
  });

  const pageContext = buildPageContext({
    currentPageRoute,
    currentPageModule,
    selectedFilters,
    pageContext: {
      normalizedFilters,
    },
    productPlanningCard,
  });

  const reasonCodes = dedupe([
    ...mappingReasonCodes,
    ...taskIntentReasonCodes,
  ]);

  return {
    mode: "shadow",
    consumerModule: "ask_power_insight",
    question,
    userQuestion: question,
    taskIntent,
    currentPageRoute,
    currentPageModule,
    pageContextHash: pageContext.pageContextHash,
    requestId: `req_shadow_${pageContext.pageContextHash.replace(/^ctx_/, "")}`,
    timestamp,
    selectedFilters,
    pageContext: {
      normalizedFilters,
      pageContextHash: pageContext.pageContextHash,
    },
    productPlanningCard,
    sourceRefs: [],
    claimRefs: [],
    providerOutcome: {
      enabled: false,
      status: "not_used",
    },
    providerResponse: {},
    shadowDiagnostics: {
      safe: true,
      noSecrets: true,
      reasonCodes,
    },
  };
};

