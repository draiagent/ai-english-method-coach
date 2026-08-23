import { describe, expect, it } from "vitest";
import {
  AGAIN_DELAY_MINUTES,
  MAX_EASE_FACTOR,
  MIN_EASE_FACTOR,
  createInitialProgress,
  scheduleReview,
} from "../lib/learning/scheduler";
import type { CardProgress, Rating } from "../lib/learning/types";

const NOW = new Date("2026-08-23T02:00:00.000Z");

describe("createInitialProgress", () => {
  it("creates a stable new-card baseline", () => {
    expect(createInitialProgress("card-1", NOW)).toEqual({
      cardId: "card-1",
      state: "new",
      intervalDays: 0,
      easeFactor: 2,
      streak: 0,
      lapseCount: 0,
      totalReviews: 0,
      hintCount: 0,
      wasEverMastered: false,
      updatedAt: NOW.toISOString(),
    });
  });
});

describe("scheduleReview", () => {
  it.each([
    ["hard", 1],
    ["good", 3],
    ["easy", 7],
  ] satisfies [Rating, number][])("sets a new card rated %s to %i days", (rating, days) => {
    const decision = scheduleReview(createInitialProgress("card-1", NOW), rating, NOW);
    expect(decision.nextIntervalDays).toBe(days);
    expect(decision.progress.state).toBe("review");
    expect(decision.nextDueAt).toBe(new Date(NOW.getTime() + days * 86_400_000).toISOString());
  });

  it("returns Again cards in ten minutes and records a lapse", () => {
    const current = makeProgress({ state: "review", intervalDays: 12, streak: 2, totalReviews: 4 });
    const decision = scheduleReview(current, "again", NOW);

    expect(decision.nextIntervalDays).toBe(0);
    expect(decision.nextDueAt).toBe(new Date(NOW.getTime() + AGAIN_DELAY_MINUTES * 60_000).toISOString());
    expect(decision.progress).toMatchObject({ state: "learning", streak: 0, lapseCount: 1 });
  });

  it.each([
    ["hard", 10, 12],
    ["good", 10, 22],
    ["easy", 10, 32],
  ] satisfies [Rating, number, number][])("applies the %s multiplier deterministically", (rating, prior, expected) => {
    const current = makeProgress({ intervalDays: prior, totalReviews: 2 });
    expect(scheduleReview(current, rating, NOW).nextIntervalDays).toBe(expected);
  });

  it("marks a card mastered after the third successful review and a 21-day interval", () => {
    const current = makeProgress({ intervalDays: 10, streak: 2, totalReviews: 3 });
    const decision = scheduleReview(current, "good", NOW);

    expect(decision.nextIntervalDays).toBe(22);
    expect(decision.progress.state).toBe("mastered");
    expect(decision.progress.wasEverMastered).toBe(true);
  });

  it("remembers historical mastery after an Again rating", () => {
    const current = makeProgress({ state: "mastered", intervalDays: 30, streak: 4, totalReviews: 5 });
    const decision = scheduleReview(current, "again", NOW);

    expect(decision.progress.state).toBe("learning");
    expect(decision.progress.wasEverMastered).toBe(true);
  });

  it("clamps the ease factor", () => {
    let lower = makeProgress({ easeFactor: MIN_EASE_FACTOR, totalReviews: 5 });
    let upper = makeProgress({ easeFactor: MAX_EASE_FACTOR, totalReviews: 5 });

    lower = scheduleReview(lower, "again", NOW).progress;
    upper = scheduleReview(upper, "easy", NOW).progress;

    expect(lower.easeFactor).toBe(MIN_EASE_FACTOR);
    expect(upper.easeFactor).toBe(MAX_EASE_FACTOR);
  });

  it("does not mutate the input progress", () => {
    const current = makeProgress({ intervalDays: 3, totalReviews: 1 });
    const snapshot = structuredClone(current);

    scheduleReview(current, "good", NOW);

    expect(current).toEqual(snapshot);
  });

  it("rejects invalid timestamps", () => {
    expect(() => scheduleReview(makeProgress(), "good", new Date("invalid"))).toThrow(RangeError);
  });
});

function makeProgress(overrides: Partial<CardProgress> = {}): CardProgress {
  return {
    ...createInitialProgress("card-1", NOW),
    state: "review",
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}
