import { validateM1ConfirmedInput } from "../../contracts/m1ConfirmedInput.js";
import { M1ReleaseError, assert, sameValue } from "./errors.js";

export const getConfirmedField = (confirmedInput, fieldName) => {
  for (const group of Object.values(confirmedInput.groups)) {
    if (Object.hasOwn(group.fields, fieldName)) return group.fields[fieldName];
  }
  return undefined;
};

const sorted = (values) => [...values].sort();

export const validateAndExtractConfirmedInput = ({
  confirmedInput,
  confirmedInputHash,
  recomputedConfirmedInputHash,
  decisionPolicy,
}) => {
  const validation = validateM1ConfirmedInput(confirmedInput);
  if (!validation.ok) {
    throw new M1ReleaseError("UNSUPPORTED_COMBINATION", {
      stage: "INPUT_VALIDATE",
      violationCodes: validation.errors,
      recoverability: "REQUIRES_INPUT_CORRECTION",
    });
  }
  assert(
    confirmedInputHash === recomputedConfirmedInputHash,
    "CONFIRMED_INPUT_BINDING_MISMATCH",
    { stage: "INPUT_VALIDATE" },
  );

  const unknownFields = [];
  Object.values(confirmedInput.groups).forEach((group) => {
    Object.entries(group.fields).forEach(([fieldName, record]) => {
      if (!decisionPolicy.unknown_extraction.exclude_field_names.includes(fieldName)
        && record.confirmed_status === "USER_MARKED_UNKNOWN") {
        unknownFields.push(fieldName);
      }
    });
  });
  const indexRecord = getConfirmedField(
    confirmedInput,
    decisionPolicy.unknown_extraction.unknown_index_field,
  );
  const aggregateIndex = Array.isArray(indexRecord?.value) ? indexRecord.value : [];
  assert(
    sameValue(sorted(unknownFields), sorted(aggregateIndex)),
    "UNKNOWN_INDEX_MISMATCH",
    {
      stage: "INPUT_VALIDATE",
      offendingIds: [...unknownFields, ...aggregateIndex],
      recoverability: "REQUIRES_INPUT_CORRECTION",
    },
  );

  const unknownMappings = new Map(
    decisionPolicy.unknown_mappings.map((mapping) => [
      mapping.confirmed_field_name,
      mapping,
    ]),
  );
  unknownFields.forEach((fieldName) => {
    assert(unknownMappings.has(fieldName), "UNKNOWN_FIELD_MISSING", {
      stage: "INPUT_VALIDATE",
      offendingIds: [fieldName],
      recoverability: "REQUIRES_CONTRACT_UPDATE",
    });
  });
  const confirmedAlternatives = getConfirmedField(
    confirmedInput,
    "architecture_alternatives",
  )?.value;
  assert(Array.isArray(confirmedAlternatives) && confirmedAlternatives.length > 0, "UNSUPPORTED_COMBINATION", {
    stage: "INPUT_VALIDATE",
    recoverability: "REQUIRES_INPUT_CORRECTION",
  });
  return {
    unknownFields,
    unknownMappings,
    confirmedAlternatives,
  };
};
