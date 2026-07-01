import {
  CLAIM_TYPES,
  CLAIM_TYPE_SOURCE_PRIORITY,
  CONSUMER_MODULES,
  mapStatusToRenderMode,
  SOURCE_TIERS,
  VALIDATOR_STATUS,
} from "../contracts/validatorStatus.js";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const SUPPORTED_CONSUMER_MODULES = new Set(Object.values(CONSUMER_MODULES));
const OFFICIAL_SOURCE_TIERS = new Set([
  SOURCE_TIERS.L1_GOVERNMENT_REGULATION,
  SOURCE_TIERS.L2_STANDARD_INDUSTRY_BODY,
  SOURCE_TIERS.L3_CUSTOMER_CLOUD_OPERATOR_OFFICIAL,
  SOURCE_TIERS.L4_VENDOR_OFFICIAL,
]);
const COMPANY_INTELLIGENCE_HARD_TYPES = new Set([
  CLAIM_TYPES.COMPANY_REVENUE,
  CLAIM_TYPES.ANNUAL_REPORT_METRIC,
  CLAIM_TYPES.QUARTERLY_REPORT_METRIC,
  CLAIM_TYPES.PARTNERSHIP_CUSTOMER,
  CLAIM_TYPES.PRODUCT_LAUNCH,
  CLAIM_TYPES.EXECUTIVE_CHANGE,
  CLAIM_TYPES.SUPPLIER_UPDATE,
  CLAIM_TYPES.ROADMAP_STATEMENT,
  CLAIM_TYPES.WHITE_PAPER,
  CLAIM_TYPES.PRODUCT_MANUAL,
  CLAIM_TYPES.PRESS_RELEASE,
  CLAIM_TYPES.INDUSTRY_REPORT,
  CLAIM_TYPES.NAMED_CUSTOMER,
]);
const HARD_FACT_CLAIM_TYPES = new Set([
  CLAIM_TYPES.TAM,
  CLAIM_TYPES.ROI,
  CLAIM_TYPES.MARKET_SHARE,
  CLAIM_TYPES.CERTIFICATION,
  CLAIM_TYPES.LAUNCH_DATE,
  CLAIM_TYPES.TECHNICAL_PARAMETER,
  CLAIM_TYPES.NAMED_CUSTOMER,
  CLAIM_TYPES.COMPANY_REVENUE,
  CLAIM_TYPES.ANNUAL_REPORT_METRIC,
  CLAIM_TYPES.QUARTERLY_REPORT_METRIC,
  CLAIM_TYPES.PARTNERSHIP_CUSTOMER,
  CLAIM_TYPES.PRODUCT_LAUNCH,
  CLAIM_TYPES.EXECUTIVE_CHANGE,
  CLAIM_TYPES.SUPPLIER_UPDATE,
  CLAIM_TYPES.ROADMAP_STATEMENT,
]);

const normalizeScalar = (value) => (value == null ? "" : String(value).trim());
const toArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);

const buildResult = (status, blockingReasons, extras = {}) => ({
  validatorStatus: status,
  renderMode: mapStatusToRenderMode(status),
  allowedToRender: status === VALIDATOR_STATUS.PASS,
  blockingReasons,
  warnings: extras.warnings || [],
  missingEvidence: extras.missingEvidence || [],
  expandedSourcePack: extras.expandedSourcePack || [],
  expandedClaimPack: extras.expandedClaimPack || [],
  hydrationFailures: extras.hydrationFailures || [],
  freshnessStatus: extras.freshnessStatus || "current",
});

const resolveRegistryRecord = (registry, kind, id) => {
  if (!registry) return null;
  const mapKey = kind === "source" ? "sources" : "claims";
  const getterKey = kind === "source" ? "getSourceById" : "getClaimById";

  if (typeof registry[getterKey] === "function") {
    return registry[getterKey](id) || null;
  }

  if (Array.isArray(registry[mapKey])) {
    return registry[mapKey].find((entry) => entry?.[`${kind}Id`] === id || entry?.id === id) || null;
  }

  if (registry[mapKey] && typeof registry[mapKey] === "object") {
    return registry[mapKey][id] || null;
  }

  return null;
};

const defaultFreshnessWindowDays = (sourceTier) => {
  switch (sourceTier) {
    case SOURCE_TIERS.L2_STANDARD_INDUSTRY_BODY:
      return 180;
    case SOURCE_TIERS.L3_CUSTOMER_CLOUD_OPERATOR_OFFICIAL:
    case SOURCE_TIERS.L4_VENDOR_OFFICIAL:
      return 90;
    case SOURCE_TIERS.L5_LOCAL_KB:
      return 0;
    default:
      return 365;
  }
};

const deriveFreshnessStatus = (record, nowDate) => {
  if (record.freshnessStatus) {
    return normalizeScalar(record.freshnessStatus);
  }

  const referenceDate = record.lastVerifiedDate || record.publicationDate;
  if (!referenceDate) {
    return "unknown";
  }

  const freshnessWindowDays = Number(record.freshnessWindowDays || defaultFreshnessWindowDays(record.sourceTier));
  const ageInDays = Math.floor((nowDate - new Date(referenceDate)) / DAY_IN_MS);
  return ageInDays <= freshnessWindowDays ? "current" : "stale";
};

const normalizeSource = (sourceRef, record, nowDate) => {
  const sourceTier = normalizeScalar(record.sourceTier || sourceRef.sourceTier);
  const freshnessWindowDays = Number(record.freshnessWindowDays || defaultFreshnessWindowDays(sourceTier));
  const appliesToModules = toArray(record.appliesToModules || sourceRef.appliesToModules || record.consumerModule || sourceRef.consumerModule)
    .map((value) => normalizeScalar(value))
    .filter(Boolean);
  const consumerModule = normalizeScalar(record.consumerModule || sourceRef.consumerModule || CONSUMER_MODULES.ASK_POWER_INSIGHT);

  return {
    sourceId: normalizeScalar(record.sourceId || sourceRef.sourceId),
    title: normalizeScalar(record.title),
    organization: normalizeScalar(record.organization),
    sourceTier,
    url: normalizeScalar(record.url),
    localPath: normalizeScalar(record.localPath),
    publicationDate: normalizeScalar(record.publicationDate),
    lastVerifiedDate: normalizeScalar(record.lastVerifiedDate),
    freshnessStatus: deriveFreshnessStatus({ ...record, sourceTier, freshnessWindowDays }, nowDate),
    freshnessWindowDays,
    allowedUse: toArray(record.allowedUse),
    forbiddenUse: toArray(record.forbiddenUse),
    sourceScope: normalizeScalar(record.sourceScope || sourceRef.sourceScope),
    appliesToModules,
    consumerModule,
    dataDomain: normalizeScalar(record.dataDomain),
    refreshRequired: Boolean(record.refreshRequired),
    realtimeVerificationRequired: Boolean(record.realtimeVerificationRequired),
    registryKey: normalizeScalar(sourceRef.registryKey),
    pageContextHash: normalizeScalar(sourceRef.pageContextHash),
    allowedUseHint: normalizeScalar(sourceRef.allowedUseHint),
  };
};

const normalizeClaim = (claimRef, record, nowDate) => {
  const sourceIds = toArray(record.sourceIds).map((value) => normalizeScalar(value)).filter(Boolean);
  const consumerModule = normalizeScalar(record.consumerModule || claimRef.consumerModule || CONSUMER_MODULES.ASK_POWER_INSIGHT);
  const claimType = normalizeScalar(record.claimType || claimRef.claimType);

  return {
    claimId: normalizeScalar(record.claimId || claimRef.claimId),
    claimText: normalizeScalar(record.claimText),
    objectId: normalizeScalar(record.objectId || claimRef.objectId),
    claimType,
    sourceIds,
    confidence: record.confidence ?? null,
    allowedUse: toArray(record.allowedUse),
    forbiddenUse: toArray(record.forbiddenUse),
    freshnessStatus: deriveFreshnessStatus({
      ...record,
      sourceTier: record.sourceTier || null,
      freshnessWindowDays: record.freshnessWindowDays,
    }, nowDate),
    publicationDate: normalizeScalar(record.publicationDate),
    lastVerifiedDate: normalizeScalar(record.lastVerifiedDate),
    freshnessWindowDays: Number(record.freshnessWindowDays || 90),
    sourceScope: normalizeScalar(record.sourceScope || claimRef.sourceScope),
    appliesToModules: toArray(record.appliesToModules || claimRef.appliesToModules || consumerModule)
      .map((value) => normalizeScalar(value))
      .filter(Boolean),
    consumerModule,
    dataDomain: normalizeScalar(record.dataDomain),
    refreshRequired: Boolean(record.refreshRequired),
    realtimeVerificationRequired: Boolean(record.realtimeVerificationRequired),
    currentness: normalizeScalar(record.currentness),
    sourceTier: normalizeScalar(record.sourceTier),
  };
};

const hasOfficialSupport = (sources, acceptedTiers) => sources.some((source) => acceptedTiers.includes(source.sourceTier));

const requiresFreshnessProof = (claim) => {
  if (claim.realtimeVerificationRequired || claim.refreshRequired) return true;
  if (["current", "latest", "recent"].includes(normalizeScalar(claim.currentness))) return true;
  return COMPANY_INTELLIGENCE_HARD_TYPES.has(claim.claimType);
};

export const hydrateEvidencePacks = ({ sourceRefs = [], claimRefs = [], registry = {}, now = new Date() } = {}) => {
  const nowDate = now instanceof Date ? now : new Date(now);
  const expandedSourcePack = [];
  const expandedClaimPack = [];
  const warnings = [];
  const missingEvidence = [];
  const hydrationFailures = [];
  const blockingReasons = [];

  for (const sourceRef of sourceRefs) {
    const sourceId = normalizeScalar(sourceRef?.sourceId);
    const sourceRecord = resolveRegistryRecord(registry, "source", sourceId);
    if (!sourceRecord) {
      missingEvidence.push({ sourceId, requiredField: "sourceRecord" });
      hydrationFailures.push({ type: "sourceRef", sourceId });
      blockingReasons.push(`sourceRef ${sourceId} could not be hydrated`);
      continue;
    }

    const expandedSource = normalizeSource(sourceRef, sourceRecord, nowDate);
    expandedSourcePack.push(expandedSource);

    if (!SUPPORTED_CONSUMER_MODULES.has(expandedSource.consumerModule)) {
      warnings.push(`unsupported consumerModule ${expandedSource.consumerModule} on ${expandedSource.sourceId}`);
    }
  }

  const sourceById = Object.fromEntries(expandedSourcePack.map((source) => [source.sourceId, source]));

  for (const claimRef of claimRefs) {
    const claimId = normalizeScalar(claimRef?.claimId);
    const claimRecord = resolveRegistryRecord(registry, "claim", claimId);
    if (!claimRecord) {
      missingEvidence.push({ claimId, requiredField: "claimRecord" });
      hydrationFailures.push({ type: "claimRef", claimId });
      blockingReasons.push(`claimRef ${claimId} could not be hydrated`);
      continue;
    }

    const expandedClaim = normalizeClaim(claimRef, claimRecord, nowDate);
    expandedClaimPack.push(expandedClaim);

    if (!SUPPORTED_CONSUMER_MODULES.has(expandedClaim.consumerModule)) {
      warnings.push(`unsupported consumerModule ${expandedClaim.consumerModule} on ${expandedClaim.claimId}`);
    }
  }

  if (hydrationFailures.length > 0) {
    return buildResult(VALIDATOR_STATUS.BLOCKED_SOURCE_REQUIRED, blockingReasons, {
      warnings,
      missingEvidence,
      hydrationFailures,
      expandedSourcePack,
      expandedClaimPack,
      freshnessStatus: "unknown",
    });
  }

  for (const claim of expandedClaimPack) {
    const supportingSources = claim.sourceIds.map((sourceId) => sourceById[sourceId]).filter(Boolean);
    const preferredTiers = CLAIM_TYPE_SOURCE_PRIORITY[claim.claimType] || [];
    const isHardFact = HARD_FACT_CLAIM_TYPES.has(claim.claimType) || claim.consumerModule === CONSUMER_MODULES.COMPANY_INTELLIGENCE;

    if (claim.sourceIds.length === 0) {
      missingEvidence.push({ claimId: claim.claimId, requiredField: "sourceIds" });
      blockingReasons.push(`claim ${claim.claimId} is missing sourceIds`);
      continue;
    }

    if (supportingSources.length !== claim.sourceIds.length) {
      missingEvidence.push({ claimId: claim.claimId, requiredField: "hydratedSources" });
      blockingReasons.push(`claim ${claim.claimId} has unresolved sourceIds`);
      continue;
    }

    if (isHardFact && supportingSources.every((source) => source.sourceTier === SOURCE_TIERS.L5_LOCAL_KB)) {
      blockingReasons.push(`claim ${claim.claimId} cannot rely on L5_local_kb alone`);
      continue;
    }

    if (isHardFact && supportingSources.some((source) => source.sourceTier === SOURCE_TIERS.L6_UNCORROBORATED_REFERENCE)) {
      blockingReasons.push(`claim ${claim.claimId} cannot rely on L6_uncorroborated_reference`);
      continue;
    }

    if (
      claim.claimType === CLAIM_TYPES.PARTNERSHIP_CUSTOMER
      && !hasOfficialSupport(supportingSources, [
        SOURCE_TIERS.L3_CUSTOMER_CLOUD_OPERATOR_OFFICIAL,
        SOURCE_TIERS.L4_VENDOR_OFFICIAL,
      ])
    ) {
      blockingReasons.push(`claim ${claim.claimId} requires L3 or L4 official source support`);
      continue;
    }

    if (
      claim.claimType === CLAIM_TYPES.ANNUAL_REPORT_METRIC
      && !hasOfficialSupport(supportingSources, [
        SOURCE_TIERS.L4_VENDOR_OFFICIAL,
        SOURCE_TIERS.L3_CUSTOMER_CLOUD_OPERATOR_OFFICIAL,
      ])
    ) {
      blockingReasons.push(`claim ${claim.claimId} requires official annual report support`);
      continue;
    }

    if (
      preferredTiers.length > 0
      && !supportingSources.some((source) => preferredTiers.includes(source.sourceTier))
      && isHardFact
    ) {
      blockingReasons.push(`claim ${claim.claimId} is missing preferred source tier support`);
      continue;
    }

    if (!claim.freshnessStatus || claim.freshnessStatus === "unknown") {
      blockingReasons.push(`claim ${claim.claimId} is missing freshnessStatus`);
      continue;
    }

    const freshnessRelevantSources = supportingSources.filter((source) => OFFICIAL_SOURCE_TIERS.has(source.sourceTier));
    const freshnessMissing = freshnessRelevantSources.some((source) =>
      requiresFreshnessProof(claim)
      && (!source.publicationDate || !source.lastVerifiedDate || !source.freshnessStatus || source.freshnessStatus === "unknown")
    );
    if (freshnessMissing) {
      blockingReasons.push(`claim ${claim.claimId} is missing freshness metadata`);
      continue;
    }

    const freshnessExpired = freshnessRelevantSources.some((source) => source.freshnessStatus === "stale");
    if (freshnessExpired) {
      blockingReasons.push(`claim ${claim.claimId} is outside freshness window`);
      continue;
    }
  }

  if (blockingReasons.some((reason) => reason.includes("freshness"))) {
    return buildResult(VALIDATOR_STATUS.BLOCKED_FRESHNESS_UNVERIFIED, blockingReasons, {
      warnings,
      missingEvidence,
      expandedSourcePack,
      expandedClaimPack,
      freshnessStatus: "realtime_unverified",
    });
  }

  if (blockingReasons.length > 0) {
    return buildResult(VALIDATOR_STATUS.BLOCKED_SOURCE_REQUIRED, blockingReasons, {
      warnings,
      missingEvidence,
      expandedSourcePack,
      expandedClaimPack,
      freshnessStatus: "unknown",
    });
  }

  return buildResult(VALIDATOR_STATUS.PASS, [], {
    warnings,
    missingEvidence,
    expandedSourcePack,
    expandedClaimPack,
    freshnessStatus: warnings.length ? "realtime_unverified" : "current",
  });
};

