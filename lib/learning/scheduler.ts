import type { CardProgress, CardState, Rating } from "./types";

export const INITIAL_EASE_FACTOR = 2;
export const MIN_EASE_FACTOR = 1.3;
export const MAX_EASE_FACTOR = 3;
export const AGAIN_DELAY_MINUTES = 10;
export const MASTERED_MINIMUM_INTERVAL_DAYS = 21;
export const MASTERED_MINIMUM_STREAK = 3;

const DAY_IN_MS = 24 * 60 * 60 * 1_000;
const MINUTE_IN_MS = 60 * 1_000;

export interface ReviewDecision {
  progress: CardProgress;
  previousIntervalDays: number;
  nextIntervalDays: number;
  nextDueAt: string;
}

export function createInitialProgress(cardId: string, now = new Date()): CardProgress {
  const timestamp = assertValidDate(now).toISOString();

  return {
    cardId,
    state: "new",
    intervalDays: 0,
    easeFactor: INITIAL_EASE_FACTOR,
    streak: 0,
    lapseCount: 0,
    totalReviews: 0,
    hintCount: 0,
    wasEverMastered: false,
    updatedAt: timestamp,
  };
}

export function scheduleReview(
  current: CardProgress,
  rating: Rating,
  reviewedAt = new Date(),
): ReviewDecision {
  const reviewDate = assertValidDate(reviewedAt);
  const previousIntervalDays = Math.max(0, current.intervalDays);
  const isFirstReview = current.totalReviews === 0 || current.state === "new";

  const nextIntervalDays = calculateInterval(previousIntervalDays, rating, isFirstReview);
  const nextDueAt = new Date(
    reviewDate.getTime()
      + (rating === "again" ? AGAIN_DELAY_MINUTES * MINUTE_IN_MS : nextIntervalDays * DAY_IN_MS),
  ).toISOString();
  const streak = rating === "again"
    ? 0
    : rating === "good" || rating === "easy"
      ? current.streak + 1
      : current.streak;
  const easeFactor = clampEaseFactor(
    current.easeFactor + (rating === "hard" ? -0.15 : rating === "easy" ? 0.1 : rating === "again" ? -0.2 : 0),
  );
  const state = calculateState(rating, streak, nextIntervalDays);
  const timestamp = reviewDate.toISOString();

  return {
    previousIntervalDays,
    nextIntervalDays,
    nextDueAt,
    progress: {
      ...current,
      state,
      dueAt: nextDueAt,
      intervalDays: nextIntervalDays,
      easeFactor,
      streak,
      lapseCount: current.lapseCount + (rating === "again" ? 1 : 0),
      totalReviews: current.totalReviews + 1,
      lastRating: rating,
      lastReviewedAt: timestamp,
      wasEverMastered: current.wasEverMastered || current.state === "mastered" || state === "mastered",
      updatedAt: timestamp,
    },
  };
}

function calculateInterval(previous: number, rating: Rating, isFirstReview: boolean): number {
  if (rating === "again") return 0;
  if (isFirstReview) return rating === "hard" ? 1 : rating === "good" ? 3 : 7;

  const multiplier = rating === "hard" ? 1.2 : rating === "good" ? 2.2 : 3.2;
  const minimum = rating === "hard" ? 1 : rating === "good" ? 3 : 7;
  return Math.max(minimum, Math.ceil(previous * multiplier));
}

function calculateState(rating: Rating, streak: number, intervalDays: number): CardState {
  if (rating === "again") return "learning";
  return streak >= MASTERED_MINIMUM_STREAK && intervalDays >= MASTERED_MINIMUM_INTERVAL_DAYS
    ? "mastered"
    : "review";
}

function clampEaseFactor(value: number): number {
  return Number(Math.min(MAX_EASE_FACTOR, Math.max(MIN_EASE_FACTOR, value)).toFixed(2));
}

function assertValidDate(value: Date): Date {
  if (Number.isNaN(value.getTime())) throw new RangeError("reviewedAt must be a valid date");
  return value;
}
