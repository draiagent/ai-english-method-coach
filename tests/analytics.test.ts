import { describe, expect, it } from "vitest";
import { buildAnalyticsSnapshot } from "../lib/learning/analytics";
import { createInitialProgress } from "../lib/learning/scheduler";
import type { LearnerOutput, ReviewEvent, WordCard } from "../lib/learning/types";

const NOW = new Date(2026, 7, 23, 15, 0, 0);

describe("learning analytics", () => {
  it("combines current mastery, due load and mind-map progress", () => {
    const cards = [card("a"), card("b"), card("c"), card("d"), card("e")];
    const base = createInitialProgress("unused", NOW);
    const snapshot = buildAnalyticsSnapshot(cards, {
      cardProgress: [
        { ...base, cardId: "b", state: "learning", dueAt: localIso(2026, 7, 22, 10) },
        { ...base, cardId: "c", state: "review", dueAt: localIso(2026, 7, 23, 20) },
        { ...base, cardId: "d", state: "review", dueAt: localIso(2026, 7, 26, 10) },
        { ...base, cardId: "e", state: "mastered", dueAt: localIso(2026, 8, 30, 10) },
        { ...base, cardId: "old-dataset", state: "mastered" },
      ],
      reviewEvents: [],
      learnerOutputs: [],
      nodeProgress: [
        { nodeId: "context-switch", state: "completed", completionCount: 1, updatedAt: NOW.toISOString() },
        { nodeId: "core-image", state: "completed", completionCount: 1, updatedAt: NOW.toISOString() },
      ],
    }, NOW, 7);

    expect(snapshot.cards).toMatchObject({ total: 5, new: 1, learning: 1, review: 2, mastered: 1, masteryRate: 20 });
    expect(snapshot.due).toEqual({ overdue: 1, today: 1, next7Days: 1, dueNow: 1 });
    expect(snapshot.mindMap).toMatchObject({ completed: 2, total: 12, percent: 17 });
    expect(snapshot.mindMap.branches.map(({ completed }) => completed)).toEqual([1, 1, 0]);
  });

  it("calculates recall only from coach sessions and counts completed output evidence", () => {
    const events = [
      review("coach-1", "coach-session-1", true, localIso(2026, 7, 23, 11)),
      review("coach-2", "coach-session-2", false, localIso(2026, 7, 22, 11)),
      review("quick", "quick-session", false, localIso(2026, 7, 23, 12)),
    ];
    const outputs: LearnerOutput[] = [
      output("coach-output:prediction:1", "coach-session-1", "prediction", localIso(2026, 7, 23, 11)),
      output("coach-output:sentence:1", "coach-session-1", "sentence", localIso(2026, 7, 23, 11)),
      output("coach-output:sentence:2", "coach-session-2", "sentence", localIso(2026, 7, 22, 11)),
      output("node-output:reorder:1", "quick-session", "reorder", localIso(2026, 7, 23, 10)),
      { ...output("incomplete", "coach-session-1", "analysis", localIso(2026, 7, 23, 11)), completed: false },
    ];

    const snapshot = buildAnalyticsSnapshot([card("a")], {
      cardProgress: [], reviewEvents: events, learnerOutputs: outputs, nodeProgress: [],
    }, NOW, 7);

    expect(snapshot.recall).toEqual({ attempts: 2, withoutHint: 1, rate: 50 });
    expect(snapshot.outputs).toMatchObject({ prediction: 1, sentence: 2, reorder: 1, analysis: 0, total: 4 });
    expect(snapshot.activity.reduce((sum, day) => sum + day.reviews, 0)).toBe(3);
    expect(snapshot.activity.reduce((sum, day) => sum + day.outputs, 0)).toBe(4);
  });

  it("applies the selected period while keeping a 30-day all-time trend", () => {
    const oldTimestamp = localIso(2026, 7, 13, 11);
    const event = review("old", "coach-old", true, oldTimestamp);
    const evidence = output("coach-output:sentence:old", "coach-old", "sentence", oldTimestamp);
    const records = { cardProgress: [], reviewEvents: [event], learnerOutputs: [evidence], nodeProgress: [] };

    expect(buildAnalyticsSnapshot([card("a")], records, NOW, 7).recall.attempts).toBe(0);
    const all = buildAnalyticsSnapshot([card("a")], records, NOW, "all");
    expect(all.recall).toEqual({ attempts: 1, withoutHint: 1, rate: 100 });
    expect(all.activity).toHaveLength(30);
  });

  it("returns honest zero states when no evidence exists", () => {
    const snapshot = buildAnalyticsSnapshot([], {
      cardProgress: [], reviewEvents: [], learnerOutputs: [], nodeProgress: [],
    }, NOW, 30);
    expect(snapshot.cards.masteryRate).toBe(0);
    expect(snapshot.recall.rate).toBe(0);
    expect(snapshot.outputs.total).toBe(0);
    expect(snapshot.activity).toHaveLength(30);
  });
});

function card(id: string): WordCard {
  return { id, word: id, definitionZh: id, source: { type: "user-csv", datasetId: "active", importedAt: NOW.toISOString() } };
}

function review(id: string, sessionId: string, recallWithoutHint: boolean, reviewedAt: string): ReviewEvent {
  return {
    id, cardId: "a", sessionId, rating: "good", reviewedAt,
    previousIntervalDays: 0, nextIntervalDays: 3, nextDueAt: reviewedAt,
    hintCount: recallWithoutHint ? 0 : 1, recallWithoutHint,
  };
}

function output(id: string, sessionId: string, type: LearnerOutput["type"], createdAt: string): LearnerOutput {
  return { id, cardId: "a", sessionId, type, completed: true, createdAt };
}

function localIso(year: number, month: number, day: number, hour: number): string {
  return new Date(year, month, day, hour).toISOString();
}
