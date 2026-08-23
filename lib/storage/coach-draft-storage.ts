import type { CoachDraft } from "../learning/coach";
import { normalizeCoachStep } from "../learning/coach";
import type { StorageLike } from "./legacy-migration";

export const COACH_DRAFTS_KEY = "ai-english-coach-drafts-v1";

export function readCoachDraft(storage: StorageLike, cardId: string): CoachDraft | undefined {
  const drafts = readDraftMap(storage);
  const value = drafts[cardId];
  return value && isCoachDraft(value, cardId) ? value : undefined;
}

export function writeCoachDraft(storage: StorageLike, draft: CoachDraft): void {
  const drafts = readDraftMap(storage);
  drafts[draft.cardId] = { ...draft, step: normalizeCoachStep(draft.step) };
  storage.setItem(COACH_DRAFTS_KEY, JSON.stringify(drafts));
}

export function removeCoachDraft(storage: StorageLike, cardId: string): void {
  const drafts = readDraftMap(storage);
  if (!(cardId in drafts)) return;
  delete drafts[cardId];
  storage.setItem(COACH_DRAFTS_KEY, JSON.stringify(drafts));
}

function readDraftMap(storage: StorageLike): Record<string, CoachDraft> {
  const raw = storage.getItem(COACH_DRAFTS_KEY);
  if (!raw) return {};
  try {
    const value = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, CoachDraft> : {};
  } catch {
    return {};
  }
}

function isCoachDraft(value: CoachDraft, cardId: string): boolean {
  return value.cardId === cardId
    && Number.isInteger(value.step) && value.step >= 1 && value.step <= 7
    && Number.isInteger(value.hintCount) && value.hintCount >= 0 && value.hintCount <= 3
    && typeof value.prediction === "string"
    && typeof value.predictionSkipped === "boolean"
    && typeof value.selectedChunk === "string"
    && typeof value.sentenceAnalysis === "string"
    && typeof value.sentence === "string"
    && typeof value.repeatConfirmed === "boolean"
    && typeof value.updatedAt === "string";
}
