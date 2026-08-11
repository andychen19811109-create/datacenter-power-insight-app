export const R2_STATUS_LABELS = Object.freeze({
  REPORT: "正式分析",
  LIMITED: "有限分析",
  CLARIFY: "需要澄清",
  UNSUPPORTED: "当前不支持",
});

const LOCALIZED_STATUS_LABELS = new Set(Object.values(R2_STATUS_LABELS));
const STATUS_INLINE_LINE = /^\s*(?:>\s*)?(?:#{1,6}\s*)?(?:\*{1,2}\s*)?(?:analysis[_\s-]?status|status|分析状态|状态)\s*[:：=]\s*([^*\n]+?)\s*(?:\*{1,2})?\s*$/i;
const STATUS_HEADING_LINE = /^\s*(?:#{1,6}\s*)?(?:analysis[_\s-]?status|status|分析状态|状态)\s*$/i;
const MARKDOWN_HEADING = /^\s*(#{1,6})\s+(.+?)\s*$/;
const MARKDOWN_CITATION = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

const INTERNAL_LEAK_PATTERNS = Object.freeze([
  /```(?:json)?\s*[\[{]/i,
  /(?:^|[\s,{;])(?:task_profile|stage_a_version|domain_status|support_level|request_id|conversation_id|message_id)\s*[:=]/im,
  /(?:^|[\s,{;])(?:audit|corrective)\s*[:=]/im,
  /(?:^|[^A-Z0-9])TP-\d{2,}\b/i,
  /\brisk\s*=\s*(?:high|medium|low|critical)\b/i,
  /(?:^|[\s,{;])(?:dify_)?(?:node_id|node_name|workflow_id|workflow_run_id|workflow_node|execution_id|run_id)\s*[:=]/im,
  /^\s*(?:TypeError|ReferenceError|SyntaxError|RangeError|Error):/m,
  /^\s*at\s+.+\(.+:\d+:\d+\)/m,
  /Traceback \(most recent call last\):/,
  /^\s*File ".+", line \d+/m,
  /(?:^|[\s,{;])(?:provider_error|error_code|error_type|status_code)\s*[:=]\s*(?:["']?[A-Z_]{3,}["']?|\d{3})/im,
]);

const normalizeStatusToken = (value) => String(value || "")
  .trim()
  .replace(/^[-*+>]\s*/, "")
  .replace(/^\*{1,2}|\*{1,2}$/g, "")
  .replace(/[。；;，,].*$/, "")
  .trim();

const mapStatusToken = (value) => {
  const token = normalizeStatusToken(value);
  if (LOCALIZED_STATUS_LABELS.has(token)) return token;
  return R2_STATUS_LABELS[token.toUpperCase()] || null;
};

export function assertNoR2InternalLeak(answer) {
  const value = String(answer || "");
  if (INTERNAL_LEAK_PATTERNS.some((pattern) => pattern.test(value))) {
    throw new Error("r2_final_answer_internal_leak");
  }
}

const inspectR2FinalAnswer = (answer) => {
  const lines = String(answer || "").replace(/\r/g, "").split("\n");
  const visibleLines = [];
  let contractStatus = null;

  for (let index = 0; index < lines.length; index += 1) {
    const inline = lines[index].match(STATUS_INLINE_LINE);
    if (inline) {
      contractStatus = mapStatusToken(inline[1]) || "分析状态待确认";
      continue;
    }
    if (STATUS_HEADING_LINE.test(lines[index])) {
      const nextIndex = lines.findIndex((line, candidate) => candidate > index && line.trim());
      const nextStatus = nextIndex > index ? mapStatusToken(lines[nextIndex]) : null;
      contractStatus = nextStatus || "分析状态待确认";
      if (nextStatus) index = nextIndex;
      continue;
    }
    visibleLines.push(lines[index]);
  }

  return {
    status: contractStatus
      || (LOCALIZED_STATUS_LABELS.has(String(answer || "").trim()) ? String(answer || "").trim() : R2_STATUS_LABELS.REPORT),
    visibleAnswer: visibleLines.join("\n"),
  };
};

export function resolveR2FinalStatus(answer) {
  return inspectR2FinalAnswer(answer).status;
}

const cleanHeading = (value) => String(value || "")
  .replace(/^\*{1,2}|\*{1,2}$/g, "")
  .trim();

const splitTableRow = (line) => String(line || "")
  .trim()
  .replace(/^\||\|$/g, "")
  .split("|")
  .map((cell) => cell.trim());

const isTableSeparator = (line) => {
  const cells = splitTableRow(line);
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
};

const isUnordered = (line) => /^\s*[-*+]\s+\S/.test(line);
const isOrdered = (line) => /^\s*\d+[.)、]\s+\S/.test(line);

const parseBlocks = (lines) => {
  const blocks = [];
  let index = 0;
  while (index < lines.length) {
    if (!lines[index].trim()) {
      index += 1;
      continue;
    }
    if (lines[index].includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const headers = splitTableRow(lines[index]);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].includes("|") && lines[index].trim()) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }
    if (isUnordered(lines[index])) {
      const items = [];
      while (index < lines.length && (isUnordered(lines[index]) || !lines[index].trim())) {
        if (isUnordered(lines[index])) items.push(lines[index].replace(/^\s*[-*+]\s+/, "").trim());
        index += 1;
      }
      blocks.push({ type: "unordered_list", items });
      continue;
    }
    if (isOrdered(lines[index])) {
      const items = [];
      while (index < lines.length && (isOrdered(lines[index]) || !lines[index].trim())) {
        if (isOrdered(lines[index])) items.push(lines[index].replace(/^\s*\d+[.)、]\s+/, "").trim());
        index += 1;
      }
      blocks.push({ type: "ordered_list", items });
      continue;
    }
    const paragraph = [];
    while (index < lines.length
      && lines[index].trim()
      && !isUnordered(lines[index])
      && !isOrdered(lines[index])
      && !(lines[index].includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1]))) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join("\n") });
  }
  return blocks;
};

const blockText = (block) => {
  if (block.type === "paragraph") return [block.text];
  if (block.type === "table") return [block.headers.join(" | "), ...block.rows.map((row) => row.join(" | "))];
  return block.items;
};

const sectionItems = (section) => section.blocks.flatMap(blockText).filter(Boolean);
const extractCitations = (blocks) => blocks.flatMap(blockText).flatMap((text) => (
  [...String(text || "").matchAll(MARKDOWN_CITATION)].map((match) => ({ label: match[1], url: match[2] }))
));

export function parseR2FinalAnswer(answer) {
  assertNoR2InternalLeak(answer);
  const visible = inspectR2FinalAnswer(answer).visibleAnswer;
  const lines = visible.split("\n");
  const sections = [];
  let current = null;

  const pushCurrent = () => {
    if (!current) return;
    const rawMarkdown = current.lines.join("\n").trim();
    const blocks = parseBlocks(current.lines);
    if (!rawMarkdown && !blocks.length) return;
    const section = {
      title: current.title,
      level: current.level,
      blocks,
      raw_markdown: rawMarkdown,
      items: blocks.flatMap(blockText).filter(Boolean),
      citations: extractCitations(blocks),
    };
    sections.push(section);
  };

  for (const line of lines) {
    const heading = line.match(MARKDOWN_HEADING);
    if (heading) {
      pushCurrent();
      current = { title: cleanHeading(heading[2]), level: heading[1].length, lines: [] };
      continue;
    }
    if (!current) {
      if (!line.trim()) continue;
      current = { title: "正文", level: 1, lines: [] };
    }
    current.lines.push(line);
  }
  pushCurrent();
  if (!sections.length) throw new Error("r2_final_answer_empty");
  return sections;
}

export function createR2FinalReport({ answer, analysisContext }) {
  const sections = parseR2FinalAnswer(answer);
  const status = resolveR2FinalStatus(answer);
  const coreConclusion = sections.find((section) => /^核心结论(?:\s|$|[：:])/.test(section.title)) || null;
  const remainingSections = coreConclusion ? sections.filter((section) => section !== coreConclusion) : sections;
  const canonicalInput = analysisContext.canonical_input;
  const titleObjects = canonicalInput.track.value.length
    ? canonicalInput.track.value
    : canonicalInput.known_competitors.value;

  return {
    status,
    title: `${titleObjects.join("、") || "当前问题"}｜专业分析报告`,
    snapshot_id: canonicalInput.snapshot_id,
    canonical_input_snapshot: canonicalInput,
    core_conclusion: coreConclusion,
    sections,
    remaining_sections: remainingSections,
    summary: coreConclusion ? sectionItems(coreConclusion) : [],
  };
}
