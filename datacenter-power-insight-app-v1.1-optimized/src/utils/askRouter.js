import { CATEGORY_POLICIES, ENTITY_BY_ID, NEGATIVE_ROUTING_RULES } from "../data/domainRegistry.js";

const UPS_FAMILY = new Set(["ups", "data_center_ups", "modular_ups", "monolithic_ups", "industrial_ups"]);

const ROUTE_BUILDERS = Object.freeze({
  unknown_entity_clarification: "buildClarificationAnswer",
  route_violation_guard: "buildScopeGuardAnswer",
  scope_guard: "buildScopeGuardAnswer",
  entity_comparison: "buildEntityComparisonAnswer",
  entity_relationship: "buildEntityRelationshipAnswer",
  entity_substitution: "buildEntityRelationshipAnswer",
  architecture_impact: "buildArchitectureImpactAnswer",
  entity_roadmap_impact: "buildArchitectureImpactAnswer",
  entity_investment: "buildInvestmentAnswer",
  product_roadmap: "buildProductRoadmapAnswer",
  company_comparison: "buildCompanyComparisonAnswer",
  generic_domain_entity: "buildGenericDomainEntityAnswer",
});

const relationshipRoute = (relationType) => {
  if (relationType === "comparison") return { route: "entity_comparison", methodology: "entity_comparison", answerMode: "comparison" };
  if (relationType === "substitution") return { route: "entity_substitution", methodology: "substitution_analysis", answerMode: "relationship" };
  if (relationType === "impact") return { route: "architecture_impact", methodology: "architecture_impact", answerMode: "impact" };
  if (relationType === "roadmap_impact") return { route: "entity_roadmap_impact", methodology: "roadmap_impact", answerMode: "impact" };
  return { route: "entity_relationship", methodology: "entity_relationship", answerMode: "relationship" };
};

const normalizeCandidateValue = (value) => String(value || "")
  .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
  .toLowerCase();

const candidateTargets = (value) => {
  const normalized = normalizeCandidateValue(value);
  const matches = Object.keys(ENTITY_BY_ID).filter((entityId) => normalized.includes(entityId));
  return matches.filter((entityId) => !matches.some((other) =>
    other.length > entityId.length && other.includes(entityId)
  ));
};

const safeDecisionAfterViolation = (state, draftDecision, primary, violations) => {
  const hasRelationship = Boolean(state.relationships?.length && state.secondaryEntities?.length);
  const route = primary.entityId === "unknown"
    ? "unknown_entity_clarification"
    : hasRelationship
      ? "entity_relationship"
      : "generic_domain_entity";
  return {
    ...draftDecision,
    route,
    methodology: route === "unknown_entity_clarification" ? "clarification_required" : "domain_entity_analysis",
    answerMode: route === "unknown_entity_clarification" ? "clarification" : hasRelationship ? "relationship" : "entity",
    answerBuilder: ROUTE_BUILDERS[route],
    clarificationRequired: route === "unknown_entity_clarification",
    routeViolations: violations,
    fallbackType: "none",
    targetEntityId: primary.entityId,
    targetCategory: primary.category,
    blockedRoute: draftDecision.route,
    reroutedFrom: draftDecision.route,
    enforcedNegativeRouting: true,
  };
};

const enforceNegativeRouting = (state, draftDecision) => {
  const primary = state.primaryEntity || ENTITY_BY_ID.unknown;
  const forbiddenTargets = new Set(NEGATIVE_ROUTING_RULES[primary.entityId] || []);
  const candidateDecision = {
    ...draftDecision,
    targetCategory: draftDecision.targetCategory || primary.category,
    answerBuilder: draftDecision.answerBuilder || ROUTE_BUILDERS[draftDecision.route],
  };
  const dimensions = [
    ["route", candidateDecision.route],
    ["category", candidateDecision.targetCategory],
    ["builder", candidateDecision.answerBuilder],
    ["target", candidateDecision.targetEntityId],
    ["fallback", candidateDecision.fallbackType],
    ["methodology", candidateDecision.methodology],
    ...(candidateDecision.candidateTargets || []).map((target) => ["candidate", target]),
  ];
  const violations = dimensions.flatMap(([dimension, value]) =>
    candidateTargets(value)
      .filter((target) => target !== primary.entityId)
      .filter((target) => forbiddenTargets.has(target) || (primary.category !== "ups" && UPS_FAMILY.has(target)))
      .map((target) => `${dimension}:${value} targets forbidden ${target}`)
  );

  if (violations.length > 0) {
    return safeDecisionAfterViolation(state, candidateDecision, primary, violations);
  }

  return {
    ...candidateDecision,
    routeViolations: [],
    blockedRoute: null,
    reroutedFrom: null,
    enforcedNegativeRouting: true,
  };
};

export const routeAskQuestion = (state) => {
  const primary = state.primaryEntity || ENTITY_BY_ID.unknown;
  const secondaryEntities = state.secondaryEntities || [];
  const relationType = state.relationships?.[0]?.type || null;
  const correctionRequired = state.corrections?.some((item) => item.requiresClarification);

  if (["non_analytical", "out_of_domain"].includes(state.intent?.type)) {
    return enforceNegativeRouting(state, {
      route: "scope_guard",
      methodology: state.intent.type,
      answerMode: "scope_guard",
      clarificationRequired: false,
      primaryEntity: primary,
      secondaryEntities,
      relationType: null,
      fallbackType: "none",
      targetEntityId: primary.entityId,
    });
  }

  if (correctionRequired || primary.entityId === "unknown") {
    return enforceNegativeRouting(state, {
      route: "unknown_entity_clarification",
      methodology: "clarification_required",
      answerMode: "clarification",
      clarificationRequired: true,
      primaryEntity: primary,
      secondaryEntities,
      relationType,
      fallbackType: "none",
      targetEntityId: "unknown",
    });
  }

  if (relationType) {
    const relationDecision = relationshipRoute(relationType);
    return enforceNegativeRouting(state, {
      ...relationDecision,
      clarificationRequired: false,
      primaryEntity: primary,
      secondaryEntities,
      relationType,
      fallbackType: "none",
      targetEntityId: primary.entityId,
    });
  }

  if (state.companies?.length >= 2) {
    return enforceNegativeRouting(state, {
      route: "company_comparison",
      methodology: "company_comparison",
      answerMode: "comparison",
      clarificationRequired: false,
      primaryEntity: primary,
      secondaryEntities,
      relationType: "comparison",
      fallbackType: "none",
      targetEntityId: primary.entityId,
    });
  }

  const categoryPolicy = CATEGORY_POLICIES[primary.category] || CATEGORY_POLICIES.unknown;
  if (state.intent?.type === "product_investment") {
    return enforceNegativeRouting(state, {
      route: "entity_investment",
      methodology: primary.preferredMethodology || categoryPolicy.defaultMethodology,
      answerMode: "investment",
      clarificationRequired: false,
      primaryEntity: primary,
      secondaryEntities,
      relationType: null,
      fallbackType: "none",
      targetEntityId: primary.entityId,
    });
  }

  if (state.intent?.type === "product_roadmap") {
    return enforceNegativeRouting(state, {
      route: "product_roadmap",
      methodology: "product_roadmap",
      answerMode: "roadmap",
      clarificationRequired: false,
      primaryEntity: primary,
      secondaryEntities,
      relationType: null,
      fallbackType: "none",
      targetEntityId: primary.entityId,
    });
  }

  return enforceNegativeRouting(state, {
    route: "generic_domain_entity",
    methodology: primary.preferredMethodology || categoryPolicy.defaultMethodology,
    answerMode: "entity",
    clarificationRequired: false,
    primaryEntity: primary,
    secondaryEntities,
    relationType: null,
    fallbackType: "category_default",
    targetEntityId: primary.entityId,
  });
};
