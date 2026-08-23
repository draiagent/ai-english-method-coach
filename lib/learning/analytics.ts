import { MIND_MAP_BRANCHES, MIND_MAP_NODES } from "./mind-map";
import type {
  CardProgress,
  CardState,
  LearnerOutput,
  NodeProgress,
  ReviewEvent,
  WordCard,
} from "./types";

export type AnalyticsWindow = 7 | 30 | "all";

export interface AnalyticsSnapshot {
  generatedAt: string;
  window: AnalyticsWindow;
  cards: Record<CardState, number> & { total: number; masteryRate: number };
  due: { overdue: number; today: number; next7Days: number; dueNow: number };
  recall: { attempts: number; withoutHint: number; rate: number };
  outputs: Record<LearnerOutput["type"], number> & { total: number };
  mindMap: {
    completed: number;
    total: number;
    percent: number;
    branches: Array<{ id: string; title: string; completed: number; total: number; percent: number }>;
  };
  activity: Array<{ date: string; label: string; reviews: number; outputs: number }>;
}

export interface AnalyticsRecords {
  cardProgress: CardProgress[];
  reviewEvents: ReviewEvent[];
  learnerOutputs: LearnerOutput[];
  nodeProgress: NodeProgress[];
}

const OUTPUT_TYPES: readonly LearnerOutput["type"][] = [
  "prediction",
  "analysis",
  "sentence",
  "reorder",
  "repeat-confirmation",
];

export function buildAnalyticsSnapshot(
  cards: WordCard[],
  records: AnalyticsRecords,
  now = new Date(),
  window: AnalyticsWindow = 7,
): AnalyticsSnapshot {
  if (Number.isNaN(now.getTime())) throw new RangeError("now must be a valid date");

  const activeCardIds = new Set(cards.map(({ id }) => id));
  const progressByCard = new Map(
    records.cardProgress
      .filter(({ cardId }) => activeCardIds.has(cardId))
      .map((progress) => [progress.cardId, progress]),
  );
  const cardCounts = { new: 0, learning: 0, review: 0, mastered: 0 };
  for (const card of cards) cardCounts[progressByCard.get(card.id)?.state ?? "new"] += 1;

  const todayStart = startOfLocalDay(now);
  const tomorrowStart = addLocalDays(todayStart, 1);
  const nextWeekStart = addLocalDays(todayStart, 8);
  const due = { overdue: 0, today: 0, next7Days: 0, dueNow: 0 };
  for (const progress of progressByCard.values()) {
    if (progress.state === "mastered" || !progress.dueAt) continue;
    const dueAt = new Date(progress.dueAt);
    if (Number.isNaN(dueAt.getTime())) continue;
    if (dueAt < todayStart) due.overdue += 1;
    else if (dueAt < tomorrowStart) due.today += 1;
    else if (dueAt < nextWeekStart) due.next7Days += 1;
    if (dueAt <= now) due.dueNow += 1;
  }

  const periodStart = getWindowStart(now, window);
  const reviewEvents = records.reviewEvents.filter((event) =>
    activeCardIds.has(event.cardId) && isInPeriod(event.reviewedAt, periodStart, now));
  const learnerOutputs = records.learnerOutputs.filter((output) =>
    activeCardIds.has(output.cardId) && output.completed && isInPeriod(output.createdAt, periodStart, now));

  const coachSessionIds = new Set(
    learnerOutputs
      .filter(({ id }) => id.startsWith("coach-output:"))
      .map(({ sessionId }) => sessionId),
  );
  const coachReviews = reviewEvents.filter(({ sessionId }) => coachSessionIds.has(sessionId));
  const recallWithoutHint = coachReviews.filter(({ recallWithoutHint }) => recallWithoutHint).length;

  const outputCounts = {
    prediction: 0,
    analysis: 0,
    sentence: 0,
    reorder: 0,
    "repeat-confirmation": 0,
  };
  for (const output of learnerOutputs) {
    if (OUTPUT_TYPES.includes(output.type)) outputCounts[output.type] += 1;
  }

  const completedNodeIds = new Set(
    records.nodeProgress.filter(({ state }) => state === "completed").map(({ nodeId }) => nodeId),
  );
  const branches = MIND_MAP_BRANCHES.map((branch) => {
    const nodes = MIND_MAP_NODES.filter(({ branchId }) => branchId === branch.id);
    const completed = nodes.filter(({ id }) => completedNodeIds.has(id)).length;
    return {
      id: branch.id,
      title: branch.shortTitle,
      completed,
      total: nodes.length,
      percent: percentage(completed, nodes.length),
    };
  });
  const completedNodes = MIND_MAP_NODES.filter(({ id }) => completedNodeIds.has(id)).length;

  return {
    generatedAt: now.toISOString(),
    window,
    cards: {
      ...cardCounts,
      total: cards.length,
      masteryRate: percentage(cardCounts.mastered, cards.length),
    },
    due,
    recall: {
      attempts: coachReviews.length,
      withoutHint: recallWithoutHint,
      rate: percentage(recallWithoutHint, coachReviews.length),
    },
    outputs: {
      ...outputCounts,
      total: Object.values(outputCounts).reduce((sum, count) => sum + count, 0),
    },
    mindMap: {
      completed: completedNodes,
      total: MIND_MAP_NODES.length,
      percent: percentage(completedNodes, MIND_MAP_NODES.length),
      branches,
    },
    activity: buildActivity(now, window, reviewEvents, learnerOutputs),
  };
}

function buildActivity(
  now: Date,
  window: AnalyticsWindow,
  reviews: ReviewEvent[],
  outputs: LearnerOutput[],
): AnalyticsSnapshot["activity"] {
  const days = window === "all" ? 30 : window;
  const firstDay = addLocalDays(startOfLocalDay(now), -(days - 1));
  const points = Array.from({ length: days }, (_, offset) => {
    const date = addLocalDays(firstDay, offset);
    return {
      date: localDateKey(date),
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      reviews: 0,
      outputs: 0,
    };
  });
  const byDate = new Map(points.map((point) => [point.date, point]));
  for (const event of reviews) {
    const point = byDate.get(localDateKey(new Date(event.reviewedAt)));
    if (point) point.reviews += 1;
  }
  for (const output of outputs) {
    const point = byDate.get(localDateKey(new Date(output.createdAt)));
    if (point) point.outputs += 1;
  }
  return points;
}

function getWindowStart(now: Date, window: AnalyticsWindow): Date | undefined {
  if (window === "all") return undefined;
  return addLocalDays(startOfLocalDay(now), -(window - 1));
}

function isInPeriod(timestamp: string, start: Date | undefined, now: Date): boolean {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime()) || date > now) return false;
  return !start || date >= start;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addLocalDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function percentage(numerator: number, denominator: number): number {
  return denominator ? Math.round((numerator / denominator) * 100) : 0;
}
