import fs from "node:fs";

import { validateM1EvidenceSnapshot } from "../../contracts/m1EvidenceSnapshot.js";
import { BUILDER_VERSION, M1ReleaseError, assert, sameValue } from "./errors.js";
import {
  validateJsonSchemaInstance,
  validateSchemaArtifact,
} from "./schemaValidation.js";

const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"),
);

const SCHEMAS = Object.freeze({
  policy: readJson("../contracts/m1.decision-policy.v1.schema.v0.2.json"),
  templates: readJson("../contracts/m1.template-catalog.v1.schema.v0.2.json"),
  error: readJson("../contracts/m1.fail-closed-error.v1.schema.v0.2.json"),
  release: readJson("../contracts/m1.release-result.v1.schema.v0.2.json"),
});

const CERTIFIED_POLICY = readJson("../policy/m1.decision-policy.wave1.v0.2.json");
const CERTIFIED_TEMPLATES = readJson("../policy/m1.template-catalog.v1.v0.2.json");

const schemaIds = Object.freeze({
  policy: "m1.decision-policy.v1.schema.v0.2.json",
  templates: "m1.template-catalog.v1.schema.v0.2.json",
  error: "m1.fail-closed-error.v1.schema.v0.2.json",
  release: "m1.release-result.v1.schema.v0.2.json",
});

export const validateContractSchemaArtifacts = () => Object.entries(SCHEMAS)
  .flatMap(([name, schema]) => validateSchemaArtifact(schema, schemaIds[name])
    .map((error) => `${name}:${error}`));

const templateIndex = (catalog) => new Map(
  (catalog?.templates || []).map((template) => [template.binding_key, template]),
);

export const validatePolicyAndTemplates = ({ decisionPolicy, templateCatalog }) => {
  const requiredBindings = SCHEMAS.policy.properties.template_bindings.required;
  const actualBindingKeys = Object.keys(decisionPolicy?.template_bindings || {});
  const missing = requiredBindings.filter((key) => !actualBindingKeys.includes(key));
  if (missing.length > 0 || actualBindingKeys.length !== requiredBindings.length) {
    throw new M1ReleaseError("TEMPLATE_COVERAGE_INCOMPLETE", {
      stage: "POLICY_LOAD",
      offendingIds: missing,
    });
  }
  assert(
    decisionPolicy?.policy_version === CERTIFIED_POLICY.policy_version,
    "POLICY_VERSION_MISMATCH",
    { stage: "POLICY_LOAD", offendingIds: [decisionPolicy?.policy_version] },
  );
  assert(
    decisionPolicy?.compatible_builder_version === BUILDER_VERSION,
    "BUILDER_VERSION_MISMATCH",
    { stage: "POLICY_LOAD", offendingIds: [decisionPolicy?.compatible_builder_version] },
  );
  assert(
    decisionPolicy?.template_catalog_version === CERTIFIED_TEMPLATES.template_catalog_version,
    "TEMPLATE_VERSION_MISMATCH",
    { stage: "POLICY_LOAD", offendingIds: [decisionPolicy?.template_catalog_version] },
  );
  assert(
    decisionPolicy?.certified_snapshot?.schema_version === "m1.evidence-snapshot.v1",
    "SNAPSHOT_VERSION_MISMATCH",
    {
      stage: "POLICY_LOAD",
      offendingIds: [decisionPolicy?.certified_snapshot?.schema_version],
    },
  );

  const policyErrors = validateJsonSchemaInstance(SCHEMAS.policy, decisionPolicy);
  if (policyErrors.length > 0) {
    throw new M1ReleaseError("POLICY_SCHEMA_INVALID", {
      stage: "POLICY_LOAD",
      violationCodes: policyErrors,
    });
  }
  const templateErrors = validateJsonSchemaInstance(SCHEMAS.templates, templateCatalog);
  if (templateErrors.length > 0) {
    throw new M1ReleaseError("TEMPLATE_POLICY_MISMATCH", {
      stage: "POLICY_LOAD",
      violationCodes: templateErrors,
    });
  }
  assert(
    templateCatalog.template_catalog_version === decisionPolicy.template_catalog_version,
    "TEMPLATE_VERSION_MISMATCH",
    { stage: "POLICY_LOAD", offendingIds: [templateCatalog.template_catalog_version] },
  );

  const runtimeTemplates = templateIndex(templateCatalog);
  const certifiedTemplates = templateIndex(CERTIFIED_TEMPLATES);
  assert(runtimeTemplates.size === 65, "TEMPLATE_COVERAGE_INCOMPLETE", {
    stage: "POLICY_LOAD",
  });
  requiredBindings.forEach((bindingKey) => {
    const templateId = decisionPolicy.template_bindings[bindingKey];
    const runtime = runtimeTemplates.get(bindingKey);
    const certified = certifiedTemplates.get(bindingKey);
    assert(runtime && runtime.template_id === templateId, "TEMPLATE_NOT_FOUND", {
      stage: "POLICY_LOAD",
      offendingIds: [bindingKey, templateId],
    });
    assert(sameValue(runtime, certified), "TEMPLATE_POLICY_MISMATCH", {
      stage: "POLICY_LOAD",
      offendingIds: [bindingKey],
    });
  });
  return { templates: runtimeTemplates, requiredBindingCount: requiredBindings.length };
};

const snapshotIndexes = (snapshot) => {
  const sources = new Map();
  const units = new Map();
  (snapshot?.sources || []).forEach((source) => {
    sources.set(source.source_id, source);
    source.evidence_units.forEach((unit) => units.set(unit.evidence_unit_id, {
      source,
      unit,
    }));
  });
  return { sources, units };
};

export const validateSnapshotAndPolicyAuthority = ({
  evidenceSnapshot,
  evidenceSnapshotHash,
  recomputedSnapshotHash,
  decisionPolicy,
}) => {
  const snapshotValidation = validateM1EvidenceSnapshot(evidenceSnapshot);
  if (!snapshotValidation.ok) {
    throw new M1ReleaseError("SNAPSHOT_VERSION_MISMATCH", {
      stage: "SNAPSHOT_LOAD",
      violationCodes: snapshotValidation.errors,
    });
  }
  assert(
    evidenceSnapshotHash === recomputedSnapshotHash,
    "SNAPSHOT_HASH_MISMATCH",
    { stage: "SNAPSHOT_LOAD" },
  );
  assert(
    decisionPolicy.certified_snapshot.schema_version === evidenceSnapshot.schema_version,
    "SNAPSHOT_VERSION_MISMATCH",
    { stage: "SNAPSHOT_LOAD" },
  );
  assert(
    decisionPolicy.certified_snapshot.snapshot_id === evidenceSnapshot.evidence_snapshot_id,
    "SNAPSHOT_VERSION_MISMATCH",
    { stage: "SNAPSHOT_LOAD", offendingIds: [evidenceSnapshot.evidence_snapshot_id] },
  );
  assert(
    decisionPolicy.certified_snapshot.sha256 === recomputedSnapshotHash,
    "SNAPSHOT_HASH_MISMATCH",
    { stage: "SNAPSHOT_LOAD" },
  );

  const { sources, units } = snapshotIndexes(evidenceSnapshot);
  decisionPolicy.source_authority_assertions.forEach((authority) => {
    const source = sources.get(authority.source_id);
    assert(source, "EVIDENCE_SOURCE_NOT_FOUND", {
      stage: "SNAPSHOT_LOAD",
      offendingIds: [authority.source_id],
    });
    assert(
      source.publisher === authority.publisher_exact
        && source.source_type === authority.source_type_exact,
      "SOURCE_AUTHORITY_MISMATCH",
      { stage: "SNAPSHOT_LOAD", offendingIds: [authority.source_id] },
    );
  });
  const seenAnnotationIds = new Set();
  decisionPolicy.evidence_annotations.forEach((annotation) => {
    assert(!seenAnnotationIds.has(annotation.evidence_unit_id), "POLICY_SCHEMA_INVALID", {
      stage: "POLICY_LOAD",
      offendingIds: [annotation.evidence_unit_id],
    });
    seenAnnotationIds.add(annotation.evidence_unit_id);
    const indexed = units.get(annotation.evidence_unit_id);
    assert(indexed, "EVIDENCE_UNIT_NOT_FOUND", {
      stage: "SNAPSHOT_LOAD",
      offendingIds: [annotation.evidence_unit_id],
    });
    assert(indexed.source.source_id === annotation.source_id, "EVIDENCE_SOURCE_NOT_FOUND", {
      stage: "SNAPSHOT_LOAD",
      offendingIds: [annotation.evidence_unit_id, annotation.source_id],
    });
  });
  return { sources, units };
};

export const validateReleaseResult = (result) => validateJsonSchemaInstance(
  SCHEMAS.release,
  result,
  { externalSchemas: { [schemaIds.error]: SCHEMAS.error } },
);

export const validateFailClosedError = (error) => validateJsonSchemaInstance(
  SCHEMAS.error,
  error,
);

export const certifiedArtifactSummary = Object.freeze({
  schemaCount: Object.keys(SCHEMAS).length,
  templateBindingCount: 65,
  evidenceAnnotationCount: CERTIFIED_POLICY.evidence_annotations.length,
  sourceAuthorityCount: CERTIFIED_POLICY.source_authority_assertions.length,
});
