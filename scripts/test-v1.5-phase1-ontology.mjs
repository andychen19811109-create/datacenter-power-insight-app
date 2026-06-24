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
assert.ok(businessTrackLabels.includes("塔式 UPS"), "塔式 UPS must exist");
assert.ok(businessTrackLabels.includes("模块化 UPS"), "模块化 UPS must exist");
assert.ok(businessTrackLabels.includes("服务器电源"), "服务器电源 must exist");
assert.ok(businessTrackLabels.includes("精密空调"), "精密空调 must exist");
assert.ok(businessTrackLabels.includes("PDU/RPP/STS"), "PDU/RPP/STS must exist");
assert.equal(businessTrackLabels.includes("UPS"), false, "UPS must not be a primary business track label");
assert.equal(businessTrackLabels.includes("工业 UPS"), false, "工业 UPS must not be a primary business track");
assert.equal(businessTrackLabels.includes("电力 UPS"), false, "电力 UPS must not be a primary business track");
assert.equal(businessTrackLabels.includes("800VDC"), false, "800VDC must not be a primary business track");
assert.equal(businessTrackLabels.includes("GaN/SiC"), false, "GaN/SiC must not be a primary business track");
assert.equal(timeLabels.includes("2025"), false, "2025 must not be a supported Phase 1 time horizon");
assert.ok(timeLabels.includes("2028"), "2028 must be a supported Phase 1 time horizon");

assert.equal(classifyEntity("塔式 UPS").entityType, "primary_business_track", "塔式 UPS must be primary_business_track");
assert.equal(classifyEntity("模块化 UPS").entityType, "primary_business_track", "模块化 UPS must be primary_business_track");
assert.equal(classifyEntity("精密空调").entityType, "primary_business_track", "精密空调 must be primary_business_track");
assert.equal(classifyEntity("工业 UPS").entityType, "application_segment", "工业 UPS must be an application segment");
assert.equal(classifyEntity("电力 UPS").entityType, "application_segment", "电力 UPS must be an application segment");
assert.equal(classifyEntity("工业 UPS").isPrimaryBusinessTrack, false, "工业 UPS must not be primary");
assert.equal(classifyEntity("电力 UPS").isPrimaryBusinessTrack, false, "电力 UPS must not be primary");

const legacyUps = classifyEntity("UPS");
assert.equal(legacyUps.label, "塔式 UPS", "legacy UPS input must normalize to 塔式 UPS");
assert.equal(legacyUps.legacyAlias, "UPS", "legacy UPS input must carry legacyAlias");
assert.ok(legacyUps.migrationNote.includes("塔式 UPS"), "legacy UPS input must carry migration note");

const architectureLayers = ["HVDC", "800VDC", "SST"].map(classifyEntity);
assert.equal(architectureLayers[0].isPrimaryBusinessTrack, true, "HVDC remains a primary business track");
assert.equal(architectureLayers[1].isPrimaryBusinessTrack, false, "800VDC must not be a primary business track");
assert.equal(architectureLayers[1].entityType, "architecture_route", "800VDC must be architecture_route or architecture_variant");
assert.equal(architectureLayers[2].isPrimaryBusinessTrack, true, "SST remains a primary business track");
assert.ok(getAdjacentReferences("800VDC").some((item) => item.label === "SST"), "800VDC must reference SST as adjacent");
assert.ok(getAdjacentReferences("SST").some((item) => item.label.includes("800V")), "SST must reference 800V architecture as adjacent");

assert.ok(getAdjacentReferences("BBU").some((item) => item.label === "塔式 UPS"), "BBU must express relationship to 塔式 UPS");
assert.ok(getAdjacentReferences("精密空调").some((item) => item.label === "液冷 CDU"), "精密空调 must reference 液冷 CDU as adjacent");
assert.ok(ONTOLOGY_RULES.boundaries.bbuStorageUps.includes("UPS"), "BBU / storage / UPS boundary must be documented");

console.log("V1.5 Phase 1 ontology tests passed");
