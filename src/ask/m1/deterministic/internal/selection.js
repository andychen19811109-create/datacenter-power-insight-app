import { M1ReleaseError, assert } from "./errors.js";

const supportedSelectionMode = (annotation, alternativeValue) => {
  if (annotation.selection_mode === "NAMED_PRODUCT_ONLY") {
    return Array.isArray(annotation.named_products)
      && annotation.named_products.includes(alternativeValue);
  }
  return ["ARCHITECTURE_EXACT", "CATEGORY_REFERENCE"].includes(annotation.selection_mode);
};

export const assertEvidenceAnnotationApplicable = ({
  annotation,
  mapping,
  alternativeValue,
  outputSlot = "CLAIM_CANDIDATE",
}) => {
  assert(
    annotation.product_category === mapping.product_category,
    "EVIDENCE_CATEGORY_MISMATCH",
    {
      stage: "EVIDENCE_SELECT",
      offendingIds: [annotation.evidence_unit_id],
    },
  );
  assert(
    annotation.architecture_family === mapping.architecture_family,
    "EVIDENCE_ARCHITECTURE_MISMATCH",
    {
      stage: "EVIDENCE_SELECT",
      offendingIds: [annotation.evidence_unit_id],
    },
  );
  assert(supportedSelectionMode(annotation, alternativeValue), "EVIDENCE_ARCHITECTURE_MISMATCH", {
    stage: "EVIDENCE_SELECT",
    offendingIds: [annotation.evidence_unit_id],
  });
  assert(annotation.allowed_output_slots.includes(outputSlot), "EVIDENCE_OUTPUT_SLOT_FORBIDDEN", {
    stage: "EVIDENCE_SELECT",
    offendingIds: [annotation.evidence_unit_id, outputSlot],
  });
  assert(
    annotation.allowed_claim_scope_levels.includes(annotation.technical_scope_level),
    "EVIDENCE_SCOPE_ESCALATION",
    {
      stage: "EVIDENCE_SELECT",
      offendingIds: [annotation.evidence_unit_id],
    },
  );
  return true;
};

export const selectDeterministicEvidence = ({
  confirmedAlternatives,
  decisionPolicy,
  snapshotIndexes,
}) => {
  const mappings = new Map(
    decisionPolicy.product_mappings.map((mapping) => [mapping.input_value, mapping]),
  );
  const selections = confirmedAlternatives.map((alternativeValue) => {
    const mapping = mappings.get(alternativeValue);
    if (!mapping) {
      throw new M1ReleaseError("UNSUPPORTED_ALTERNATIVE", {
        stage: "EVIDENCE_SELECT",
        offendingIds: [alternativeValue],
        recoverability: "REQUIRES_CONTRACT_UPDATE",
      });
    }
    const annotations = decisionPolicy.evidence_annotations.filter((annotation) => (
      annotation.product_category === mapping.product_category
      && annotation.architecture_family === mapping.architecture_family
      && supportedSelectionMode(annotation, alternativeValue)
    ));
    if (annotations.length === 0) {
      throw new M1ReleaseError("UNSUPPORTED_COMBINATION", {
        stage: "EVIDENCE_SELECT",
        offendingIds: [alternativeValue, mapping.normalized_alternative_id],
        recoverability: "REQUIRES_CONTRACT_UPDATE",
      });
    }
    const evidence = annotations.map((annotation) => {
      assertEvidenceAnnotationApplicable({
        annotation,
        mapping,
        alternativeValue,
      });
      const indexed = snapshotIndexes.units.get(annotation.evidence_unit_id);
      assert(indexed, "EVIDENCE_UNIT_NOT_FOUND", {
        stage: "EVIDENCE_SELECT",
        offendingIds: [annotation.evidence_unit_id],
      });
      assert(indexed.source.source_id === annotation.source_id, "EVIDENCE_SOURCE_NOT_FOUND", {
        stage: "EVIDENCE_SELECT",
        offendingIds: [annotation.source_id],
      });
      return {
        annotation,
        source: indexed.source,
        unit: indexed.unit,
      };
    });
    return { alternativeValue, mapping, evidence };
  });

  const evidenceUnitIds = selections.flatMap(({ evidence }) => (
    evidence.map(({ unit }) => unit.evidence_unit_id)
  ));
  assert(
    new Set(evidenceUnitIds).size === evidenceUnitIds.length,
    "EVIDENCE_ANNOTATION_MISSING",
    { stage: "EVIDENCE_SELECT", offendingIds: evidenceUnitIds },
  );
  return {
    selections,
    selectedEvidence: selections.flatMap(({ evidence }) => evidence),
  };
};
