import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { validateReleaseResult } from "../src/ask/m1/deterministic/internal/artifacts.js";
import { evaluateM1ReleaseIntegration } from "../src/ask/m1/releaseIntegration/index.js";

const CONFIRMED_INPUT_URL = new URL(
  "../src/ask/m1/deterministic/test-fixtures/M1_DIFY_S1_CONFIRMED_INPUT_CANONICAL.json",
  import.meta.url,
);
const OUTPUT_DIRECTORY = new URL("../src/ask/m1/demo/data/", import.meta.url);

const readJson = (url) => JSON.parse(fs.readFileSync(url, "utf8"));
const clone = (value) => JSON.parse(JSON.stringify(value));

export function createM1DemoInputs() {
  const releasedInput = readJson(CONFIRMED_INPUT_URL);
  const rejectedInput = clone(releasedInput);
  rejectedInput.groups.product_architecture.fields.architecture_alternatives.value = [
    "HVDC",
  ];
  return { releasedInput, rejectedInput };
}

const assertRelease = (result, expectedStatus) => {
  const errors = validateReleaseResult(result);
  if (errors.length > 0) {
    throw new Error(`demo_snapshot_schema_invalid:${errors.join("|")}`);
  }
  if (result.status !== expectedStatus) {
    throw new Error(`demo_snapshot_status_invalid:${result.status}`);
  }
};

export function generateM1DemoSnapshots() {
  const { releasedInput, rejectedInput } = createM1DemoInputs();
  const released = evaluateM1ReleaseIntegration(releasedInput);
  const rejected = evaluateM1ReleaseIntegration(rejectedInput);
  assertRelease(released, "RELEASED");
  assertRelease(rejected, "REJECTED");
  return { released, rejected };
}

export function writeM1DemoSnapshots() {
  const snapshots = generateM1DemoSnapshots();
  fs.mkdirSync(OUTPUT_DIRECTORY, { recursive: true });
  Object.entries(snapshots).forEach(([name, result]) => {
    fs.writeFileSync(
      new URL(`${name}.json`, OUTPUT_DIRECTORY),
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8",
    );
  });
  return snapshots;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  const { released, rejected } = writeM1DemoSnapshots();
  console.log(`M1_DEMO_SNAPSHOTS_GENERATED ${released.status} ${rejected.status}`);
}
