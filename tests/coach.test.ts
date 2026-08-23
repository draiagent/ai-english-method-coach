import { describe, expect, it } from "vitest";
import {
  buildCoachEvidence,
  canAdvanceCoachStep,
  createCoachDraft,
  getCoachHints,
  normalizeCoachStep,
} from "../lib/learning/coach";
import type { WordCard } from "../lib/learning/types";

const CARD: WordCard = {
  id: "card-1",
  word: "inform",
  definitionZh: "通知；告知",
  category: "溝通互動",
  partOfSpeech: "verb",
  collocations: ["inform someone of something"],
  exampleEn: "Please inform the manager.",
  source: { type: "user-csv", datasetId: "dataset", importedAt: "2026-08-23T02:00:00.000Z" },
};

describe("seven-step coach", () => {
  it("creates a blank resumable draft", () => {
    expect(createCoachDraft("card-1", new Date("2026-08-23T02:00:00.000Z"))).toMatchObject({
      cardId: "card-1",
      step: 1,
      hintCount: 0,
      prediction: "",
      sentence: "",
    });
  });

  it("builds the three PRD hint levels only from known card fields", () => {
    expect(getCoachHints(CARD)).toEqual([
      "情境提示：常見於「溝通互動」。",
      "結構提示：verb，共 6 個字母。",
      "語意提示：通知；告知；英文首字母是 I。",
    ]);
  });

  it("requires recall, chunk selection, analysis and active output at their steps", () => {
    const base = createCoachDraft("card-1");
    expect(canAdvanceCoachStep({ ...base, step: 2 }, CARD)).toBe(false);
    expect(canAdvanceCoachStep({ ...base, step: 2, predictionSkipped: true }, CARD)).toBe(true);
    expect(canAdvanceCoachStep({ ...base, step: 4 }, CARD)).toBe(false);
    expect(canAdvanceCoachStep({ ...base, step: 4, selectedChunk: CARD.collocations![0] }, CARD)).toBe(true);
    expect(canAdvanceCoachStep({ ...base, step: 5 }, CARD)).toBe(false);
    expect(canAdvanceCoachStep({ ...base, step: 5, sentenceAnalysis: "主詞｜動作｜對象" }, CARD)).toBe(true);
    expect(canAdvanceCoachStep({ ...base, step: 6 }, CARD)).toBe(false);
    expect(canAdvanceCoachStep({ ...base, step: 6, sentence: "Please inform me." }, CARD)).toBe(true);
  });

  it("calculates recall-without-hint evidence honestly", () => {
    const base = createCoachDraft("card-1");
    expect(buildCoachEvidence({ ...base, prediction: "inform", sentence: "Please inform me." })).toMatchObject({
      hintCount: 0,
      recallWithoutHint: true,
      prediction: "inform",
    });
    expect(buildCoachEvidence({ ...base, prediction: "inform", hintCount: 1, sentence: "Please inform me." }).recallWithoutHint).toBe(false);
    expect(buildCoachEvidence({ ...base, predictionSkipped: true, sentence: "Please inform me." }).recallWithoutHint).toBe(false);
  });

  it("rejects a completed flow without active output", () => {
    expect(() => buildCoachEvidence(createCoachDraft("card-1"))).toThrow("主動輸出句子不可為空");
  });

  it("clamps navigation to the seven defined steps", () => {
    expect(normalizeCoachStep(-4)).toBe(1);
    expect(normalizeCoachStep(99)).toBe(7);
  });
});
