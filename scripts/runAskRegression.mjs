import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mirrorRoot = resolve(root, "datacenter-power-insight-app-v1.1-optimized");
const synchronizedFiles = [
  "src/utils/insightEngine.js",
  "src/data/domainRegistry.js",
  "src/utils/askParser.js",
  "src/utils/askRouter.js",
  "src/utils/answerBuilders.js",
  "src/data/askRegressionCases.js",
];

const hashFile = async (path) => createHash("sha256").update(await readFile(path)).digest("hex");

const syncFailures = [];
for (const relativePath of synchronizedFiles) {
  const mainHash = await hashFile(resolve(root, relativePath));
  const mirrorHash = await hashFile(resolve(mirrorRoot, relativePath));
  if (mainHash !== mirrorHash) syncFailures.push(`${relativePath}: ${mainHash} != ${mirrorHash}`);
}

if (syncFailures.length) {
  syncFailures.forEach((failure) => console.error(`FAIL SYNC ${failure}`));
  process.exit(1);
}

const mainEngine = await import(pathToFileURL(resolve(root, "src/utils/insightEngine.js")));
const mirrorEngine = await import(pathToFileURL(resolve(mirrorRoot, "src/utils/insightEngine.js")));
const { ASK_REGRESSION_CASES, ASK_REGRESSION_SUITE_COUNTS } = await import(
  pathToFileURL(resolve(root, "src/data/askRegressionCases.js"))
);

const filters = { region: "全球", time: "2026", role: "高管", customer: "全部", application: "全部", track: "全部" };
const UPS_FAMILY = new Set(["ups", "data_center_ups", "modular_ups", "monolithic_ups", "industrial_ups"]);

const resultSnapshot = (result) => ({
  primaryEntity: result.state.primaryEntity.entityId,
  category: result.state.primaryEntity.category,
  secondaryEntities: result.state.secondaryEntities.map((item) => item.entityId),
  relationType: result.routeDecision.relationType,
  route: result.routeDecision.route,
  methodology: result.routeDecision.methodology,
  answer: result.answer,
});

let passCount = 0;
let warningCount = 0;
let failCount = 0;

for (const testCase of ASK_REGRESSION_CASES) {
  const mainResult = mainEngine.analyzeAskQuestion(testCase.question, filters);
  const mirrorResult = mirrorEngine.analyzeAskQuestion(testCase.question, filters);
  const mainSnapshot = resultSnapshot(mainResult);
  const mirrorSnapshot = resultSnapshot(mirrorResult);
  const failures = [];
  const warnings = [];

  if (mainSnapshot.primaryEntity !== testCase.expectedPrimaryEntity) failures.push(`primary=${mainSnapshot.primaryEntity}`);
  if (mainSnapshot.category !== testCase.expectedCategory) failures.push(`category=${mainSnapshot.category}`);
  if (mainSnapshot.route !== testCase.expectedRoute) failures.push(`route=${mainSnapshot.route}`);
  if (testCase.expectedMethodology && mainSnapshot.methodology !== testCase.expectedMethodology) failures.push(`methodology=${mainSnapshot.methodology}`);
  if (testCase.passCriteria.requireAnswer && !mainSnapshot.answer.trim()) failures.push("empty answer");
  if (testCase.passCriteria.requireNegativeRoutingEnforced && !mainResult.routeDecision.enforcedNegativeRouting) failures.push("negative routing not enforced");
  if (mainResult.routeDecision.routeViolations.length) failures.push(`route violations=${mainResult.routeDecision.routeViolations.join("|")}`);
  if (testCase.mustNotRouteTo.some((target) => !mainResult.state.primaryEntity.mustNotRouteTo.includes(target))) {
    failures.push("registry mustNotRouteTo mismatch");
  }
  if (mainResult.state.primaryEntity.category !== "ups") {
    if (String(mainSnapshot.route).startsWith("ups_")) failures.push("non-UPS entity entered UPS route");
    if (UPS_FAMILY.has(mainResult.routeDecision.fallbackType)) failures.push("non-UPS entity entered UPS fallback");
  }
  testCase.shouldNotContain.forEach((term) => {
    if (mainSnapshot.answer.includes(term)) failures.push(`answer contains ${term}`);
  });
  if (testCase.passCriteria.requireMirrorMatch && JSON.stringify(mainSnapshot) !== JSON.stringify(mirrorSnapshot)) failures.push("mirror result mismatch");
  if (mainResult.state.primaryEntity.entityId !== "unknown" && mainResult.state.confidence < 0.5) warnings.push(`low confidence=${mainResult.state.confidence}`);

  if (failures.length) {
    failCount += 1;
    console.log(`FAIL ${testCase.id} ${testCase.question} :: ${failures.join("; ")}`);
  } else if (warnings.length) {
    warningCount += 1;
    console.log(`WARNING ${testCase.id} ${testCase.question} :: ${warnings.join("; ")}`);
  } else {
    passCount += 1;
    console.log(`PASS ${testCase.id} ${testCase.question}`);
  }
}

console.log(`\nSuites: ${JSON.stringify(ASK_REGRESSION_SUITE_COUNTS)}`);
console.log(`RESULT pass=${passCount} warning=${warningCount} fail=${failCount} total=${ASK_REGRESSION_CASES.length}`);
console.log(`SYNC ${synchronizedFiles.length}/${synchronizedFiles.length} file pairs matched`);

if (failCount > 0) process.exit(1);
