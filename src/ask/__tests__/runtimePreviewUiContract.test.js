import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appFile = new URL("../../App.jsx", import.meta.url);
const appContent = readFileSync(appFile, "utf8");

const getFunctionBody = (source, marker) => {
  const startIndex = source.indexOf(marker);
  assert.notEqual(startIndex, -1, `missing marker: ${marker}`);

  const braceStart = source.indexOf("{", startIndex);
  assert.notEqual(braceStart, -1, `missing opening brace for: ${marker}`);

  let depth = 0;

  for (let index = braceStart; index < source.length; index += 1) {
    const char = source[index];

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return source.slice(braceStart + 1, index);
      }
    }
  }

  throw new Error(`unterminated function body for: ${marker}`);
};

test("preview UI copy and button contract exist while forbidden wording stays absent", () => {
  assert.equal(appContent.includes("生成新管线预览"), true);
  assert.equal(appContent.includes("实验性预览：新 Ask Pipeline"), true);
  assert.equal(appContent.includes("本地新管线预览，不代表默认输出"), true);
  assert.equal(appContent.includes("使用新 Pipeline"), false);
  assert.equal(
    appContent.indexOf("生成新管线预览") < appContent.indexOf("实验性预览：新 Ask Pipeline · 本地新管线预览，不代表默认输出"),
    true,
  );
  assert.equal(
    appContent.indexOf("实验性预览：新 Ask Pipeline · 本地新管线预览，不代表默认输出") < appContent.indexOf('{previewState.status !== "idle" && ('),
    true,
  );

  const forbiddenCopy = [
    "升级版答案",
    "更专业答案",
    "新版已替换",
    "AI增强正式结果",
    "已接入 Dify",
    "已接入 DeepSeek",
    "实时数据已更新",
    "生产环境已验证",
  ];

  for (const item of forbiddenCopy) {
    assert.equal(appContent.includes(item), false);
  }
});

test("preview handler stays separate from legacy answer state writes", () => {
  const previewBody = getFunctionBody(appContent, "const handlePreview = async () =>");

  assert.equal(previewBody.includes("await runAskPreviewAdapter("), true);
  assert.equal(previewBody.includes("setPreviewState("), true);
  assert.equal(previewBody.includes("setAnswer("), false);
  assert.equal(previewBody.includes("generateStructuredAskPowerInsightAnswer("), false);
});

test("generateAnswer remains legacy-only and preview rendering stays separate", () => {
  const generateBody = getFunctionBody(appContent, "const generateAnswer = () =>");

  assert.equal(generateBody.includes("generateStructuredAskPowerInsightAnswer(question, filters)"), true);
  assert.equal(generateBody.includes("setAnswer(legacyAnswer)"), true);
  assert.equal(generateBody.includes("runAskShadowAdapter"), true);
  assert.equal(generateBody.includes("runAskPreviewAdapter"), false);

  assert.equal(appContent.includes("const [previewState, setPreviewState] = useState({"), true);
  assert.equal(appContent.includes('{previewState.status !== "idle" && ('), true);
  assert.equal(appContent.includes("{answer && ("), true);
  assert.equal(appContent.indexOf("{answer && (") < appContent.indexOf('{previewState.status !== "idle" && ('), true);
});
