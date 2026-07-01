import { createDeterministicHash, stableStringify } from "./buildPageContext.js";

const normalizeScalar = (value) => (value == null ? "" : String(value).trim());

const normalizeCard = (card = {}) => ({
  id: normalizeScalar(card.id),
  version: normalizeScalar(card.version),
  productFamily: normalizeScalar(card.productFamily),
  architectureLayer: normalizeScalar(card.architectureLayer),
  customerSegment: normalizeScalar(card.customerSegment),
  region: normalizeScalar(card.region),
  workloadType: normalizeScalar(card.workloadType),
  deploymentMode: normalizeScalar(card.deploymentMode),
  selectedState: card.selectedState && typeof card.selectedState === "object"
    ? JSON.parse(stableStringify(card.selectedState))
    : {},
});

export const buildProductPlanningCardContext = (card = {}) => {
  const normalizedCard = normalizeCard(card);
  const stateHash = normalizeScalar(card.stateHash) || createDeterministicHash(normalizedCard).replace(/^ctx_/, "ppc_");

  return {
    ...normalizedCard,
    stateHash,
  };
};

