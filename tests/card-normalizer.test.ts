import { describe, expect, it } from "vitest";
import {
  createStableCardId,
  createUserDatasetId,
  normalizeCsvToCards,
  parseCsv,
} from "../lib/learning/card-normalizer";

const CSV = `單字,中文定義,星級,分數區間,分類,詞性,【詞性變化】,搭配詞,例句,核心意象,句型模板,情境任務,學習程度
Inform,通知；告知,4,600-780,溝通互動,verb,"inform; informed","inform someone of something; keep someone informed","Please inform the manager.\n請通知經理。",傳遞重要資訊,inform + person + of + thing,通知主管會遲到,intermediate
meeting,會議,3,450-600,辦公日常,noun,,,"The meeting starts at nine.\n會議九點開始。",,,,elementary`;

describe("stable card identity", () => {
  it("normalizes case, spacing and Unicode before creating the id", () => {
    expect(createStableCardId("dataset-1", "  INForm  ")).toBe(createStableCardId("dataset-1", "inform"));
    expect(createStableCardId("dataset-1", "ＡＢＣ")).toBe(createStableCardId("dataset-1", "abc"));
  });

  it("keeps identical words in different datasets separate", () => {
    expect(createStableCardId("dataset-a", "inform")).not.toBe(createStableCardId("dataset-b", "inform"));
  });

  it("creates a stable dataset id from an uploaded filename", () => {
    expect(createUserDatasetId("Business English Words.csv")).toBe("user:business-english-words");
    expect(createUserDatasetId("Business English Words.CSV")).toBe("user:business-english-words");
  });
});

describe("CSV normalization", () => {
  it("normalizes the old and optional V1 fields into WordCard records", () => {
    const result = normalizeCsvToCards(CSV, {
      datasetId: "dataset-1",
      sourceType: "user-csv",
      importedAt: new Date("2026-08-23T02:00:00.000Z"),
    });

    expect(result.cards).toHaveLength(2);
    expect(result.cards[0]).toMatchObject({
      word: "Inform",
      definitionZh: "通知；告知",
      stars: 4,
      scoreRange: "600-780",
      wordForms: ["inform", "informed"],
      collocations: ["inform someone of something", "keep someone informed"],
      exampleEn: "Please inform the manager.",
      exampleZh: "請通知經理。",
      coreImageZh: "傳遞重要資訊",
      level: "intermediate",
    });
  });

  it("reports invalid and duplicate rows without fabricating content", () => {
    const csv = `單字,中文定義,詞性,例句
inform,通知,verb,Please inform me.
INFORM,告知,verb,Please inform us.
,空白單字,noun,Example.
missing-definition,,noun,Example.`;
    const result = normalizeCsvToCards(csv, { datasetId: "dataset-1", sourceType: "user-csv" });

    expect(result.cards).toHaveLength(1);
    expect(result.duplicateRows).toEqual([3]);
    expect(result.skippedRows).toEqual([
      { rowNumber: 4, reason: "單字為空" },
      { rowNumber: 5, reason: "中文定義為空" },
    ]);
    expect(result.cards[0].exampleZh).toBeUndefined();
  });

  it("identifies the exact missing required fields", () => {
    expect(() => normalizeCsvToCards("單字,中文定義\ninform,通知", {
      datasetId: "dataset-1",
      sourceType: "user-csv",
    })).toThrow("CSV 缺少必要欄位：詞性、例句");
  });

  it("rejects unclosed quoted fields", () => {
    expect(() => parseCsv('單字,中文定義\n"inform,通知')).toThrow("CSV 包含未關閉的引號");
  });
});
