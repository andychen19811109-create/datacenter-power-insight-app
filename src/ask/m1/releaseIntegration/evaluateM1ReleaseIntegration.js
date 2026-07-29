import fs from "node:fs";

import { hashM1EvidenceSnapshot } from "../contracts/m1EvidenceSnapshot.js";
import { runM1DecisionReleaseGateway } from "../deterministic/runM1DecisionReleaseGateway.js";
import { hashM1ConfirmedInput } from "../m1DecisionCore.js";

const readJson = (relativePath) => JSON.parse(
  fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"),
);

const CERTIFIED_DECISION_POLICY = readJson(
  "../deterministic/policy/m1.decision-policy.wave1.v0.2.json",
);
const CERTIFIED_EVIDENCE_SNAPSHOT = readJson(
  "../evidence/m1OfficialEvidenceWave1.v0.2.json",
);
const STATIC_TEMPLATE_CATALOG = readJson(
  "../deterministic/policy/m1.template-catalog.v1.v0.2.json",
);
const CERTIFIED_EVIDENCE_SNAPSHOT_HASH = hashM1EvidenceSnapshot(
  CERTIFIED_EVIDENCE_SNAPSHOT,
);

const isRecord = (value) => Boolean(value)
  && typeof value === "object"
  && !Array.isArray(value);

const gatewayInput = (confirmedInput) => ({
  confirmedInput,
  confirmedInputHash: hashM1ConfirmedInput(confirmedInput),
  evidenceSnapshot: CERTIFIED_EVIDENCE_SNAPSHOT,
  evidenceSnapshotHash: CERTIFIED_EVIDENCE_SNAPSHOT_HASH,
  decisionPolicy: CERTIFIED_DECISION_POLICY,
  templateCatalog: STATIC_TEMPLATE_CATALOG,
});

export function evaluateM1ReleaseIntegration(confirmedInput) {
  const acceptedCallShape = arguments.length === 1 && isRecord(confirmedInput);
  return runM1DecisionReleaseGateway(
    gatewayInput(acceptedCallShape ? confirmedInput : null),
  );
}
