import type { WordCard } from "./types";

export const COACH_STEP_COUNT = 7;

export interface CoachDraft {
  cardId: string;
  step: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  hintCount: 0 | 1 | 2 | 3;
  prediction: string;
  predictionSkipped: boolean;
  selectedChunk: string;
  sentenceAnalysis: string;
  sentence: string;
  repeatConfirmed: boolean;
  updatedAt: string;
}

export interface CoachEvidence {
  hintCount: number;
  recallWithoutHint: boolean;
  prediction?: string;
  sentenceAnalysis?: string;
  sentence: string;
  repeatConfirmed: boolean;
}

export function createCoachDraft(cardId: string, now = new Date()): CoachDraft {
  if (Number.isNaN(now.getTime())) throw new RangeError("now must be a valid date");
  return {
    cardId,
    step: 1,
    hintCount: 0,
    prediction: "",
    predictionSkipped: false,
    selectedChunk: "",
    sentenceAnalysis: "",
    sentence: "",
    repeatConfirmed: false,
    updatedAt: now.toISOString(),
  };
}

export function getCoachHints(card: WordCard): [string, string, string] {
  const category = card.category || "一般學習情境";
  const partOfSpeech = card.partOfSpeech || "詞性尚未提供";
  const normalizedWord = card.word.trim();
  const firstLetter = normalizedWord.slice(0, 1).toLocaleUpperCase("en-US") || "—";
  return [
    `情境提示：常見於「${category}」。`,
    `結構提示：${partOfSpeech}，共 ${Array.from(normalizedWord).length} 個字母。`,
    `語意提示：${card.definitionZh}；英文首字母是 ${firstLetter}。`,
  ];
}

export function normalizeCoachStep(step: number): CoachDraft["step"] {
  return Math.min(COACH_STEP_COUNT, Math.max(1, Math.trunc(step))) as CoachDraft["step"];
}

export function canAdvanceCoachStep(draft: CoachDraft, card: WordCard): boolean {
  if (draft.step === 2) return Boolean(draft.prediction.trim()) || draft.predictionSkipped;
  if (draft.step === 4) return !card.collocations?.length || Boolean(draft.selectedChunk);
  if (draft.step === 5) return !card.exampleEn || Boolean(draft.sentenceAnalysis.trim());
  if (draft.step === 6) return Boolean(draft.sentence.trim());
  return draft.step < COACH_STEP_COUNT;
}

export function buildCoachEvidence(draft: CoachDraft): CoachEvidence {
  if (!draft.sentence.trim()) throw new Error("主動輸出句子不可為空");
  return {
    hintCount: draft.hintCount,
    recallWithoutHint: !draft.predictionSkipped && Boolean(draft.prediction.trim()) && draft.hintCount === 0,
    prediction: draft.prediction.trim() || undefined,
    sentenceAnalysis: draft.sentenceAnalysis.trim() || undefined,
    sentence: draft.sentence.trim(),
    repeatConfirmed: draft.repeatConfirmed,
  };
}
