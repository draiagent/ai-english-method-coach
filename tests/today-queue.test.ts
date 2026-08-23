import { describe, expect, it } from "vitest";
import { createInitialProgress } from "../lib/learning/scheduler";
import { buildMistakeQueue, buildTodayQueue } from "../lib/learning/today-queue";
import type { CardProgress, WordCard } from "../lib/learning/types";

const NOW = new Date("2026-08-23T10:00:00.000Z");

describe("today queue", () => {
  it("orders due mistakes, other due cards, then fills with new cards", () => {
    const cards = ["new-1", "due", "mistake", "future", "new-2"].map(makeCard);
    const progress = [
      makeProgress("due", { dueAt: "2026-08-23T09:00:00.000Z", state: "review" }),
      makeProgress("mistake", { dueAt: "2026-08-23T08:00:00.000Z", state: "learning", lapseCount: 1 }),
      makeProgress("future", { dueAt: "2026-08-24T08:00:00.000Z", state: "review" }),
    ];

    const queue = buildTodayQueue(cards, progress, NOW, 5);

    expect(queue.cards.map(({ id }) => id)).toEqual(["mistake", "due", "new-1", "new-2"]);
    expect(queue.summary).toEqual({ due: 2, dueMistakes: 1, newCards: 2, total: 4, suggestedLimit: 5 });
  });

  it("includes every due card even when the daily suggestion is exceeded", () => {
    const cards = Array.from({ length: 8 }, (_, index) => makeCard(`due-${index}`));
    const progress = cards.map((card) => makeProgress(card.id, { dueAt: "2026-08-23T08:00:00.000Z" }));

    const queue = buildTodayQueue(cards, progress, NOW, 5);

    expect(queue.cards).toHaveLength(8);
    expect(queue.summary.newCards).toBe(0);
  });

  it("does not surface an Again card before its ten-minute due time", () => {
    const cards = [makeCard("again")];
    const progress = [makeProgress("again", {
      dueAt: "2026-08-23T10:10:00.000Z",
      lastRating: "again",
      lapseCount: 1,
      state: "learning",
    })];

    expect(buildTodayQueue(cards, progress, NOW, 5).cards).toEqual([]);
  });
});

describe("mistake queue", () => {
  it("contains unresolved lapse cards newest first and excludes mastered cards", () => {
    const cards = [makeCard("old"), makeCard("new"), makeCard("mastered")];
    const progress = [
      makeProgress("old", { lapseCount: 1, lastReviewedAt: "2026-08-20T00:00:00.000Z" }),
      makeProgress("new", { lapseCount: 2, lastReviewedAt: "2026-08-22T00:00:00.000Z" }),
      makeProgress("mastered", { lapseCount: 3, state: "mastered", lastReviewedAt: "2026-08-23T00:00:00.000Z" }),
    ];

    expect(buildMistakeQueue(cards, progress).map(({ id }) => id)).toEqual(["new", "old"]);
  });
});

function makeCard(id: string): WordCard {
  return {
    id,
    word: id,
    definitionZh: id,
    source: { type: "user-csv", datasetId: "dataset", importedAt: NOW.toISOString() },
  };
}

function makeProgress(cardId: string, overrides: Partial<CardProgress> = {}): CardProgress {
  return {
    ...createInitialProgress(cardId, NOW),
    state: "review",
    totalReviews: 1,
    ...overrides,
  };
}
