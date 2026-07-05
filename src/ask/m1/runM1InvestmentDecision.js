import { buildM1ProviderRequest } from "./buildM1ProviderRequest.js";
import { evaluateM1ProfileEligibility } from "./m1ProfileEligibility.js";
import { parseAndValidateM1ExpertResult, buildM1UnavailableResult } from "./parseAndValidateM1ExpertResult.js";
import { resolveM1DecisionContext, resolveM1PresentationPerspective } from "./resolveM1DecisionContext.js";

export const runM1InvestmentDecision = async ({ question, filters = {}, providerTransport }) => {
  const eligibility = evaluateM1ProfileEligibility({ question, filters });
  if (!eligibility.eligible) {
    return {
      mode: "legacy",
      providerCalled: false,
      eligibilityReason: eligibility.reasonCodes,
      route: eligibility.route,
      primaryEntityId: eligibility.primaryEntityId,
    };
  }

  const resolvedContext = resolveM1DecisionContext({ question, filters, eligibility });
  const presentationPerspective = resolveM1PresentationPerspective(filters);
  const providerRequest = buildM1ProviderRequest({
    question,
    filters,
    eligibility,
    resolvedContext,
    presentationPerspective,
  });

  if (typeof providerTransport !== "function") {
    return {
      ...buildM1UnavailableResult("provider_transport_missing"),
      providerCalled: false,
      eligibility,
      resolvedContext,
      providerRequest,
    };
  }

  try {
    const providerResponse = await providerTransport(providerRequest);
    if (!providerResponse || providerResponse.status === "provider_error") {
      return { ...buildM1UnavailableResult("provider_error"), providerCalled: true, eligibility, resolvedContext, providerRequest };
    }
    if (providerResponse.status === "provider_timeout") {
      return { ...buildM1UnavailableResult("provider_timeout"), providerCalled: true, eligibility, resolvedContext, providerRequest };
    }
    const validation = parseAndValidateM1ExpertResult(providerResponse.answer);
    if (!validation.ok) {
      return {
        ...validation.failure,
        providerCalled: true,
        eligibility,
        resolvedContext,
        providerRequest,
        validationErrors: validation.errors,
      };
    }
    return {
      mode: "m1_investment",
      providerCalled: true,
      eligibility,
      resolvedContext,
      providerRequest,
      result: validation.result,
    };
  } catch {
    return { ...buildM1UnavailableResult("provider_error"), providerCalled: true, eligibility, resolvedContext, providerRequest };
  }
};
