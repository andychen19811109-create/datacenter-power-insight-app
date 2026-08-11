const FILTER_KEYS = Object.freeze(["role", "region", "customer", "application", "track", "time"]);

const deepFreeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
};

const clone = (value) => JSON.parse(JSON.stringify(value));

export const freezeCanonicalRunSnapshot = (canonicalInput) => deepFreeze(clone(canonicalInput));

export const pageFilterSignature = (pageContext = {}) => {
  const filters = pageContext?.normalizedFilters || pageContext?.filters || pageContext || {};
  return FILTER_KEYS.map((key) => `${key}:${String(filters[key] || "")}`).join("|");
};

export const runSnapshotFilterSignature = (canonicalInput) => pageFilterSignature(
  canonicalInput?.page_ctx?.value?.raw_selections || {},
);

export const hasRunPageContextChanged = (canonicalInput, pageContext) => (
  runSnapshotFilterSignature(canonicalInput) !== pageFilterSignature(pageContext)
);

export const inheritRunFilters = ({ runSelections = {}, currentFilters = {}, filterOptions = {} }) => (
  Object.fromEntries(FILTER_KEYS.map((key) => {
    const candidate = String(runSelections?.[key] || "");
    return [key, filterOptions[key]?.includes(candidate) ? candidate : currentFilters[key]];
  }))
);
