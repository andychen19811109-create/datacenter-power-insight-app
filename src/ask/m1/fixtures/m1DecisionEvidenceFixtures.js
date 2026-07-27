import { M1_EVIDENCE_SOURCE_IDS } from "../contracts/m1DecisionState.js";
import { hashM1EvidenceSnapshot } from "../contracts/m1EvidenceSnapshot.js";
import {
  createConfirmedInputFixture,
  createDecisionStateFixture,
} from "./m1DecisionCoreFixtures.js";

export const TEST_ONLY_EVIDENCE_MARKER = "TEST_ONLY_NOT_REAL_EVIDENCE";

const clone = (value) => JSON.parse(JSON.stringify(value));

const scope = () => ({
  product: ["POWER_ARCHITECTURE_DECISION"],
  application: ["AI 数据中心受保护负载"],
  customer: ["CUSTOMER_X"],
  region: ["REGION_ALPHA"],
  time: ["current evaluation"],
});

const sourceFixture = (sourceId) => ({
  source_id: sourceId,
  source_title: `${TEST_ONLY_EVIDENCE_MARKER}:${sourceId}`,
  publisher: TEST_ONLY_EVIDENCE_MARKER,
  document_date: "2026-07-25",
  retrieved_at: "2026-07-25T12:00:00.000Z",
  source_type: "OFFICIAL_WEBSITE",
  applicable_scope: scope(),
  evidence_units: [],
  limitations: [TEST_ONLY_EVIDENCE_MARKER],
});

export const createEmptyEvidenceSnapshotFixture = () => ({
  schema_version: "m1.evidence-snapshot.v1",
  evidence_snapshot_id: "TEST_ONLY_EMPTY_EVIDENCE_SNAPSHOT",
  created_at: "2026-07-25T12:00:00.000Z",
  as_of_date: "2026-07-25",
  source_policy: {
    mode: "FROZEN_SEVEN_SOURCE",
    allowed_source_ids: [...M1_EVIDENCE_SOURCE_IDS],
  },
  sources: [],
});

export const createEvidenceSnapshotFixture = () => {
  const snapshot = createEmptyEvidenceSnapshotFixture();
  snapshot.evidence_snapshot_id = "TEST_ONLY_BOUND_EVIDENCE_SNAPSHOT";
  snapshot.sources = M1_EVIDENCE_SOURCE_IDS.map(sourceFixture);
  const source = snapshot.sources.find(({ source_id: sourceId }) => (
    sourceId === "OCP_MT_DIABLO"
  ));
  source.evidence_units.push({
    evidence_unit_id: "TEST_ONLY_EU_001",
    statement: `${TEST_ONLY_EVIDENCE_MARKER}: The evaluated comparison scope is 1MW.`,
    evidence_type: "METRIC",
    scope: scope(),
    numeric_provenance: {
      value: 1,
      unit: "MW",
      source_type: "confirmed_input_plus_boundary_source",
      source_id: "OCP_MT_DIABLO",
      derivation: "Direct confirmed input; source used only for system-boundary reasoning.",
      denominator: "one confirmed system comparison",
      exclusions: ["No facility-wide extrapolation"],
    },
    limitations: [TEST_ONLY_EVIDENCE_MARKER],
  });
  return snapshot;
};

export const createEvidenceGuardPassFixture = () => {
  const confirmedInput = createConfirmedInputFixture();
  const decisionState = createDecisionStateFixture({ confirmedInput });
  decisionState.claim_candidates[0].statement = (
    `${TEST_ONLY_EVIDENCE_MARKER}: The evaluated comparison scope is 1MW.`
  );
  decisionState.risks[0].source_ids = ["OCP_MT_DIABLO"];
  decisionState.validation_actions[0].owner = "TBD";
  decisionState.required_action.owner = "TBD";
  const evidenceSnapshot = createEvidenceSnapshotFixture();
  return {
    confirmedInput,
    decisionState,
    evidenceSnapshot,
    evidenceSnapshotId: evidenceSnapshot.evidence_snapshot_id,
    evidenceSnapshotSchemaVersion: evidenceSnapshot.schema_version,
    evidenceSnapshotHash: hashM1EvidenceSnapshot(evidenceSnapshot),
  };
};

export const createCurrentS1PollutionFixture = () => {
  const fixture = createEvidenceGuardPassFixture();
  fixture.evidenceSnapshot = createEmptyEvidenceSnapshotFixture();
  fixture.evidenceSnapshotId = fixture.evidenceSnapshot.evidence_snapshot_id;
  fixture.evidenceSnapshotHash = hashM1EvidenceSnapshot(fixture.evidenceSnapshot);
  fixture.decisionState.product_boundary.status = "SUPPORTED";
  fixture.decisionState.product_boundary.source_ids = [];
  fixture.decisionState.product_boundary.unknown_ids = [];
  fixture.decisionState.tradeoffs[0].benefit = (
    `${TEST_ONLY_EVIDENCE_MARKER}: UPS ecosystem and 800VDC efficiency assertion`
  );
  fixture.decisionState.tradeoffs[0].source_ids = [];
  fixture.decisionState.risks[0].risk = (
    `${TEST_ONLY_EVIDENCE_MARKER}: unverified compatibility and safety risk`
  );
  fixture.decisionState.risks[0].source_ids = [];
  fixture.decisionState.validation_actions[0].owner = "Product Management";
  fixture.decisionState.required_action.owner = "Product Management";
  return clone(fixture);
};
