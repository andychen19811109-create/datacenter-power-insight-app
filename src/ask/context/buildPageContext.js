const ROUTE_MODULE_MAP = Object.freeze({
  "/": "overview",
  "/overview": "overview",
  "/market": "market",
  "/product": "product",
  "/technology": "technology",
  "/companies": "companies",
  "/company-intelligence": "companies",
  "/dashboard": "overview",
  "/ask": "ask",
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

export const stableStringify = (value) => JSON.stringify(normalizeObject(value));

export const createDeterministicHash = (value) => {
  const input = stableStringify(value);
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `ctx_${(hash >>> 0).toString(16).padStart(8, "0")}`;
};

export const deriveModuleFromRoute = (route) => ROUTE_MODULE_MAP[normalizeScalar(route)] || null;

export const isRouteModuleConsistent = (route, module) => {
  const normalizedRoute = normalizeScalar(route);
  const normalizedModule = normalizeScalar(module);
  const derivedModule = deriveModuleFromRoute(normalizedRoute);
  return Boolean(normalizedRoute && normalizedModule && derivedModule && derivedModule === normalizedModule);
};

export const buildPageContext = (input = {}) => {
  const currentPageRoute = normalizeScalar(input.currentPageRoute || input.route);
  const currentPageModule = normalizeScalar(input.currentPageModule || input.module || deriveModuleFromRoute(currentPageRoute));
  const selectedFilters = normalizeObject(input.selectedFilters || {});
  const pageSummaries = normalizeObject(input.pageSummaries || input.pageContext || {});
  const selectedProductFamily = normalizeScalar(selectedFilters.productFamily || input.selectedProductFamily);
  const selectedCustomerSegment = normalizeScalar(selectedFilters.customerSegment || input.selectedCustomerSegment);
  const selectedRegion = normalizeScalar(selectedFilters.region || input.selectedRegion);
  const selectedArchitectureLayer = normalizeScalar(selectedFilters.architectureLayer || input.selectedArchitectureLayer);
  const workloadType = normalizeScalar(selectedFilters.workloadType || input.workloadType);
  const deploymentMode = normalizeScalar(selectedFilters.deploymentMode || input.deploymentMode);

  const hashPayload = {
    currentPageRoute,
    currentPageModule,
    selectedFilters,
    selectedProductFamily,
    selectedCustomerSegment,
    selectedRegion,
    selectedArchitectureLayer,
    workloadType,
    deploymentMode,
    pageSummaries,
    productPlanningCard: normalizeObject(input.productPlanningCard || {}),
  };

  return {
    currentPageRoute,
    currentPageModule,
    selectedFilters,
    selectedProductFamily,
    selectedCustomerSegment,
    selectedRegion,
    selectedArchitectureLayer,
    workloadType,
    deploymentMode,
    pageSummaries,
    pageContextHash: createDeterministicHash(hashPayload),
  };
};

