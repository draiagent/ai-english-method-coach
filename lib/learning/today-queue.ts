import type { CardProgress, WordCard } from "./types";

export type StudyMode = "today" | "all" | "mistakes" | "mind-map" | "analytics";

export interface TodayQueueSummary {
  due: number;
  dueMistakes: number;
  newCards: number;
  total: number;
  suggestedLimit: number;
}

export interface TodayQueue {
  cards: WordCard[];
  summary: TodayQueueSummary;
}

const DAILY_CARD_LIMITS = new Map<number, number>([
  [5, 5],
  [10, 10],
  [15, 15],
  [20, 20],
]);

export function buildTodayQueue(
  cards: WordCard[],
  progressRecords: CardProgress[],
  now: Date,
  dailyMinutes: 5 | 10 | 15 | 20,
): TodayQueue {
  if (Number.isNaN(now.getTime())) throw new RangeError("now must be a valid date");

  const progressByCard = new Map(progressRecords.map((progress) => [progress.cardId, progress]));
  const dueMistakes: Array<{ card: WordCard; progress: CardProgress }> = [];
  const dueOthers: Array<{ card: WordCard; progress: CardProgress }> = [];
  const newCards: WordCard[] = [];

  for (const card of cards) {
    const progress = progressByCard.get(card.id);
    if (!progress || progress.state === "new") {
      newCards.push(card);
      continue;
    }
    if (progress.state === "mastered" || !isDue(progress, now)) continue;
    const entry = { card, progress };
    if (progress.lapseCount > 0 || progress.lastRating === "again") dueMistakes.push(entry);
    else dueOthers.push(entry);
  }

  const byDueDate = (left: { progress: CardProgress }, right: { progress: CardProgress }) =>
    (left.progress.dueAt ?? "").localeCompare(right.progress.dueAt ?? "");
  dueMistakes.sort(byDueDate);
  dueOthers.sort(byDueDate);

  const dueCards = [...dueMistakes, ...dueOthers].map(({ card }) => card);
  const suggestedLimit = DAILY_CARD_LIMITS.get(dailyMinutes) ?? 10;
  const newCardSlots = Math.max(0, suggestedLimit - dueCards.length);
  const selectedNewCards = newCards.slice(0, newCardSlots);
  const queue = [...dueCards, ...selectedNewCards];

  return {
    cards: queue,
    summary: {
      due: dueCards.length,
      dueMistakes: dueMistakes.length,
      newCards: selectedNewCards.length,
      total: queue.length,
      suggestedLimit,
    },
  };
}

export function buildMistakeQueue(cards: WordCard[], progressRecords: CardProgress[]): WordCard[] {
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  return progressRecords
    .filter((progress) => progress.state !== "mastered" && progress.lapseCount > 0)
    .sort((left, right) => (right.lastReviewedAt ?? "").localeCompare(left.lastReviewedAt ?? ""))
    .map((progress) => cardsById.get(progress.cardId))
    .filter((card): card is WordCard => Boolean(card));
}

function isDue(progress: CardProgress, now: Date): boolean {
  if (!progress.dueAt) return false;
  const dueAt = new Date(progress.dueAt);
  return !Number.isNaN(dueAt.getTime()) && dueAt.getTime() <= now.getTime();
}
