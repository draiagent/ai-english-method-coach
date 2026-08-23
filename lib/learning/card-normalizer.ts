import type { LearnerLevel, WordCard } from "./types";

export const BUNDLED_DATASET_ID = "bundled:business-english-v1";

export interface CardImportOptions {
  datasetId: string;
  sourceType: WordCard["source"]["type"];
  importedAt?: Date;
}

export interface SkippedRow {
  rowNumber: number;
  reason: string;
}

export interface CardImportResult {
  cards: WordCard[];
  skippedRows: SkippedRow[];
  duplicateRows: number[];
}

const REQUIRED_HEADERS = ["單字", "中文定義", "詞性", "例句"] as const;
const LEVELS = new Set<LearnerLevel>(["beginner", "elementary", "intermediate", "advanced"]);

export function createUserDatasetId(fileName: string): string {
  const normalizedName = fileName
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("en-US")
    .replace(/\.csv$/i, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u3400-\u9fff._-]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return `user:${normalizedName || "custom-vocabulary"}`;
}

export function createStableCardId(datasetId: string, word: string): string {
  const normalizedDataset = normalizeRequiredValue(datasetId, "datasetId");
  const normalizedWord = normalizeWord(word);
  if (!normalizedWord) throw new Error("word must not be empty");
  return `${encodeURIComponent(normalizedDataset)}::${encodeURIComponent(normalizedWord)}`;
}

export function normalizeCsvToCards(text: string, options: CardImportOptions): CardImportResult {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("CSV 中沒有可用的單字資料");

  const headers = rows[0].map((header) => header.normalize("NFKC").trim());
  const columnIndex = new Map(headers.map((header, index) => [header, index]));
  const missing = REQUIRED_HEADERS.filter((header) => !columnIndex.has(header));
  if (missing.length) throw new Error(`CSV 缺少必要欄位：${missing.join("、")}`);

  const importedAt = (options.importedAt ?? new Date()).toISOString();
  const seenIds = new Set<string>();
  const cards: WordCard[] = [];
  const skippedRows: SkippedRow[] = [];
  const duplicateRows: number[] = [];

  rows.slice(1).forEach((values, offset) => {
    const rowNumber = offset + 2;
    const get = (header: string) => values[columnIndex.get(header) ?? -1]?.trim() ?? "";
    const word = get("單字");
    const definitionZh = get("中文定義");

    if (!word || !definitionZh) {
      skippedRows.push({ rowNumber, reason: !word ? "單字為空" : "中文定義為空" });
      return;
    }

    const id = createStableCardId(options.datasetId, word);
    if (seenIds.has(id)) {
      duplicateRows.push(rowNumber);
      return;
    }
    seenIds.add(id);

    const example = splitBilingualExample(get("例句"));
    const rawLevel = get("學習程度").toLocaleLowerCase("en-US") as LearnerLevel;
    const rawStars = Number.parseInt(get("星級"), 10);

    cards.push({
      id,
      word,
      definitionZh,
      stars: Number.isFinite(rawStars) ? Math.min(5, Math.max(0, rawStars)) : undefined,
      scoreRange: optional(get("分數區間")),
      category: optional(get("分類")) ?? "一般專業",
      partOfSpeech: optional(get("詞性")),
      wordForms: splitList(get("【詞性變化】")),
      collocations: splitList(get("搭配詞")),
      exampleEn: example.english,
      exampleZh: example.chinese,
      coreImageZh: optional(get("核心意象")),
      sentencePattern: optional(get("句型模板")),
      taskPromptZh: optional(get("情境任務")),
      level: LEVELS.has(rawLevel) ? rawLevel : undefined,
      source: {
        type: options.sourceType,
        datasetId: normalizeRequiredValue(options.datasetId, "datasetId"),
        importedAt,
      },
    });
  });

  if (!cards.length) throw new Error("CSV 中沒有可用的單字資料");
  return { cards, skippedRows, duplicateRows };
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (character === '"') {
      if (quoted && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && text[index + 1] === "\n") index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) throw new Error("CSV 包含未關閉的引號");
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function normalizeWord(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");
}

function normalizeRequiredValue(value: string, name: string): string {
  const normalized = value.normalize("NFKC").trim();
  if (!normalized) throw new Error(`${name} must not be empty`);
  return normalized;
}

function splitList(value: string): string[] | undefined {
  const values = value.split(/(?:\r?\n|[;；|])/).map((item) => item.trim()).filter(Boolean);
  return values.length ? values : undefined;
}

function splitBilingualExample(value: string): { english?: string; chinese?: string } {
  const lines = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return {};
  return {
    english: lines[0],
    chinese: lines.length > 1 ? lines.slice(1).join(" ") : undefined,
  };
}

function optional(value: string): string | undefined {
  return value || undefined;
}
