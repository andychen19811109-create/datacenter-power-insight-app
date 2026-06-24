import { strict as assert } from "node:assert";
import {
  BUSINESS_TRACKS,
  ONTOLOGY_RULES,
  TIME_HORIZONS,
  classifyEntity,
  getAdjacentReferences,
  isPrimaryBusinessTrack,
} from "../src/data/ontology.js";

const labels = (items) => items.map((item) => item.label);
const businessTrackLabels = labels(BUSINESS_TRACKS);
const timeLabels = labels(TIME_HORIZONS);

assert.equal(isPrimaryBusinessTrack("GaN/SiC"), false, "GaN/SiC must not be a primary business track");
assert.ok(["technology_tag", "component_technology"].includes(classifyEntity("GaN/SiC").entityType), "GaN/SiC must be a technology or component classification");
assert.ok(businessTrackLabels.includes("服务器电源"), "服务器电源 must exist");
assert.ok(businessTrackLabels.includes("工业 UPS"), "工业 UPS must exist");
assert.ok(businessTrackLabels.includes("电力 UPS"), "电力 UPS must exist");
assert.ok(businessTrackLabels.includes("PDU/RPP/STS"), "PDU/RPP/STS must exist");
assert.equal(timeLabels.includes("2025"), false, "2025 must not be a supported Phase 1 time horizon");
assert.ok(timeLabels.includes("2028"), "2028 must be a supported Phase 1 time horizon");

const upsFamily = ["UPS", "模块化 UPS", "工业 UPS", "电力 UPS"].map(classifyEntity);
assert.equal(new Set(upsFamily.map((item) => item.id)).size, 4, "UPS family entries must be distinguishable");
assert.ok(upsFamily.every((item) => item.isPrimaryBusinessTrack), "UPS family entries must be primary business tracks");

const architectureLayers = ["HVDC", "800VDC", "SST"].map(classifyEntity);
assert.ok(architectureLayers.every((item) => item.isPrimaryBusinessTrack), "HVDC / 800VDC / SST must be business tracks for Phase 1 filter compatibility");
assert.ok(getAdjacentReferences("800VDC").some((item) => item.label === "SST"), "800VDC must reference SST as adjacent");
assert.ok(getAdjacentReferences("SST").some((item) => item.label === "800VDC"), "SST must reference 800VDC as adjacent");

assert.ok(getAdjacentReferences("BBU").some((item) => item.label === "UPS"), "BBU must express relationship to UPS");
assert.ok(ONTOLOGY_RULES.boundaries.bbuStorageUps.includes("UPS"), "BBU / storage / UPS boundary must be documented");

console.log("V1.5 Phase 1 ontology tests passed");
