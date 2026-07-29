import {
  hashM1EvidenceSnapshot,
} from "../contracts/m1EvidenceSnapshot.js";
import { validateM1DecisionState } from "../contracts/m1DecisionState.js";
import {
  hashM1ConfirmedInput,
} from "../m1DecisionCore.js";
import { runM1DecisionEvidenceGuard } from "../m1DecisionEvidenceContext.js";
import {
  certifiedArtifactSummary,
  validateContractSchemaArtifacts,
  validateFailClosedError,
  validatePolicyAndTemplates,
  validateReleaseResult,
  validateSnapshotAndPolicyAuthority,
} from "./internal/artifacts.js";
import { buildDeterministicDecisionState } from "./internal/builder.js";
import {
  BUILDER_VERSION,
  M1ReleaseError,
  RELEASE_SCHEMA_VERSION,
  reject,
} from "./internal/errors.js";
import { validateAndExtractConfirmedInput } from "./internal/input.js";
import {
  assertReleasedBinding,
  runProductDecisionQualityGate,
} from "./internal/qualityGate.js";
import { selectDeterministicEvidence } from "./internal/selection.js";

const safeBinding = ({
  decisionPolicy,
  templateCatalog,
  evidenceSnapshotHash,
  confirmedInput,
} = {}) => {
  const binding = {
    policy_version: /^[a-z0-9][a-z0-9._-]{0,63}$/.test(decisionPolicy?.policy_version || "")
      ? decisionPolicy.policy_version
      : "m1-decision-policy.v0.2",
    builder_version: BUILDER_VERSION,
    template_catalog_version: /^[a-z0-9][a-z0-9._-]{0,63}$/.test(
      templateCatalog?.template_catalog_version || "",
    )
      ? templateCatalog.template_catalog_version
      : "m1-template-catalog.v0.2",
    snapshot_hash: /^[a-f0-9]{64}$/.test(evidenceSnapshotHash || "")
      ? evidenceSnapshotHash
      : "0".repeat(64),
  };
  if (typeof confirmedInput?.confirmed_input_id === "string"
    && confirmedInput.confirmed_input_id.length > 0
    && confirmedInput.confirmed_input_id.length <= 128) {
    binding.confirmed_input_id = confirmedInput.confirmed_input_id;
  }
  return binding;
};

const bareStateAttempt = (input) => (
  input?.schema_version === "m1.decision-state.v1"
  || input?.decisionState?.schema_version === "m1.decision-state.v1"
  || input?.decision_state?.schema_version === "m1.decision-state.v1"
);

export const runM1DecisionReleaseGateway = (input) => {
  const args = input && typeof input === "object" ? input : {};
  let rejectionBinding = safeBinding(args);
  try {
    if (bareStateAttempt(args)) {
      throw new M1ReleaseError("BARE_DECISION_STATE_FORBIDDEN", {
        stage: "RELEASE_GATEWAY",
      });
    }
    if (Object.hasOwn(args, "cachedResult")
      || Object.hasOwn(args, "manualRepair")
      || Object.hasOwn(args, "repairedResult")) {
      throw new M1ReleaseError("RELEASE_GATEWAY_INTERNAL_ERROR", {
        stage: "RELEASE_GATEWAY",
      });
    }

    const schemaErrors = validateContractSchemaArtifacts();
    if (schemaErrors.length > 0) {
      throw new M1ReleaseError("POLICY_SCHEMA_INVALID", {
        stage: "POLICY_LOAD",
        violationCodes: schemaErrors,
      });
    }
    const artifactValidation = validatePolicyAndTemplates({
      decisionPolicy: args.decisionPolicy,
      templateCatalog: args.templateCatalog,
    });
    rejectionBinding = safeBinding(args);

    const recomputedConfirmedInputHash = hashM1ConfirmedInput(args.confirmedInput);
    const extractedInput = validateAndExtractConfirmedInput({
      confirmedInput: args.confirmedInput,
      confirmedInputHash: args.confirmedInputHash,
      recomputedConfirmedInputHash,
      decisionPolicy: args.decisionPolicy,
    });
    const recomputedSnapshotHash = hashM1EvidenceSnapshot(args.evidenceSnapshot);
    const snapshotIndexes = validateSnapshotAndPolicyAuthority({
      evidenceSnapshot: args.evidenceSnapshot,
      evidenceSnapshotHash: args.evidenceSnapshotHash,
      recomputedSnapshotHash,
      decisionPolicy: args.decisionPolicy,
    });
    const selection = selectDeterministicEvidence({
      confirmedAlternatives: extractedInput.confirmedAlternatives,
      decisionPolicy: args.decisionPolicy,
      snapshotIndexes,
    });
    const decisionState = buildDeterministicDecisionState({
      confirmedInput: args.confirmedInput,
      confirmedInputHash: recomputedConfirmedInputHash,
      decisionPolicy: args.decisionPolicy,
      templates: artifactValidation.templates,
      extractedInput,
      selection,
    });

    const stateValidation = validateM1DecisionState(decisionState, {
      confirmedInput: args.confirmedInput,
      inputHash: recomputedConfirmedInputHash,
    });
    if (!stateValidation.ok) {
      throw new M1ReleaseError("BUILDER_OUTPUT_INVALID", {
        stage: "STATE_VALIDATE",
        violationCodes: stateValidation.errors,
      });
    }

    const evidenceGuard = runM1DecisionEvidenceGuard({
      confirmedInput: args.confirmedInput,
      decisionState,
      evidenceSnapshot: args.evidenceSnapshot,
      evidenceSnapshotId: args.evidenceSnapshot.evidence_snapshot_id,
      evidenceSnapshotSchemaVersion: args.evidenceSnapshot.schema_version,
      evidenceSnapshotHash: recomputedSnapshotHash,
    });
    if (!evidenceGuard.ok) {
      throw new M1ReleaseError("EVIDENCE_GUARD_REJECTED", {
        stage: "EVIDENCE_GUARD",
        violationCodes: evidenceGuard.binding.violations,
      });
    }

    const quality = runProductDecisionQualityGate({
      decisionState,
      confirmedInput: args.confirmedInput,
      decisionPolicy: args.decisionPolicy,
      templates: artifactValidation.templates,
      selection,
      extractedInput,
    });
    const binding = {
      confirmed_input_id: args.confirmedInput.confirmed_input_id,
      confirmed_input_schema_version: args.confirmedInput.schema_version,
      confirmed_input_hash: recomputedConfirmedInputHash,
      policy_version: args.decisionPolicy.policy_version,
      builder_version: BUILDER_VERSION,
      template_catalog_version: args.templateCatalog.template_catalog_version,
      snapshot_hash: recomputedSnapshotHash,
    };
    const result = {
      schema_version: RELEASE_SCHEMA_VERSION,
      status: "RELEASED",
      release_id: `RELEASE_${recomputedConfirmedInputHash.slice(0, 24).toUpperCase()}`,
      binding,
      validation: {
        decision_state_valid: true,
        evidence_guard_pass: true,
        quality_gate_pass: quality.ok,
      },
      decision_state: decisionState,
    };
    assertReleasedBinding(result, binding);
    const releaseErrors = validateReleaseResult(result);
    if (releaseErrors.length > 0) {
      throw new M1ReleaseError("RELEASE_GATEWAY_INTERNAL_ERROR", {
        stage: "RELEASE_GATEWAY",
        violationCodes: releaseErrors,
      });
    }
    return result;
  } catch (error) {
    const failure = error instanceof M1ReleaseError
      ? error
      : new M1ReleaseError("RELEASE_GATEWAY_INTERNAL_ERROR", {
        stage: "RELEASE_GATEWAY",
      });
    const result = reject(failure.code, failure, rejectionBinding);
    if (validateFailClosedError(result.error).length === 0
      && validateReleaseResult(result).length === 0) {
      return result;
    }
    return reject("RELEASE_GATEWAY_INTERNAL_ERROR", {
      stage: "RELEASE_GATEWAY",
    });
  }
};

export const deterministicCoreCertification = Object.freeze({
  builderVersion: BUILDER_VERSION,
  ...certifiedArtifactSummary,
});
