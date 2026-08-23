import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createInitialProgress } from "../lib/learning/scheduler";
import {
  ACTIVE_DATASET_META_KEY,
  LEARNING_DATABASE_NAME,
  LEARNING_DATABASE_VERSION,
  LearningRepository,
  SCHEMA_V1,
  SCHEMA_V2_INDEXES,
  STORE_NAMES,
  applySchemaV1,
  deleteLearningDatabase,
  openLearningDatabase,
} from "../lib/storage/database";
import type { ReviewEvent, WordCard } from "../lib/learning/types";
import { completeNodeProgress } from "../lib/learning/mind-map";

let factory: IDBFactory;
let repository: LearningRepository | undefined;

beforeEach(() => {
  factory = new IDBFactory();
});

afterEach(async () => {
  repository?.close();
  repository = undefined;
  await deleteLearningDatabase(factory);
});

describe("IndexedDB schema V1", () => {
  it("creates every declared store and index", async () => {
    const database = await openLearningDatabase(factory);
    repository = new LearningRepository(database, IDBKeyRange);

    expect(database.version).toBe(LEARNING_DATABASE_VERSION);
    expect([...database.objectStoreNames].sort()).toEqual(SCHEMA_V1.map(({ name }) => name).sort());

    for (const definition of SCHEMA_V1) {
      const transaction = database.transaction(definition.name, "readonly");
      const store = transaction.objectStore(definition.name);
      const expectedIndexes = [
        ...definition.indexes,
        ...SCHEMA_V2_INDEXES[definition.name],
      ].map(({ name }) => name).sort();
      expect([...store.indexNames].sort()).toEqual(expectedIndexes);
    }
  });

  it("persists and retrieves typed card progress", async () => {
    const database = await openLearningDatabase(factory);
    repository = new LearningRepository(database, IDBKeyRange);
    const progress = createInitialProgress("card-1", new Date("2026-08-23T02:00:00.000Z"));

    await repository.put(STORE_NAMES.cardProgress, progress);

    await expect(repository.get(STORE_NAMES.cardProgress, "card-1")).resolves.toEqual(progress);
  });

  it("returns due cards in due-time order and respects the limit", async () => {
    const database = await openLearningDatabase(factory);
    repository = new LearningRepository(database, IDBKeyRange);
    const base = createInitialProgress("base", new Date("2026-08-23T00:00:00.000Z"));
    const records = [
      { ...base, cardId: "later", dueAt: "2026-08-23T03:00:00.000Z" },
      { ...base, cardId: "first", dueAt: "2026-08-23T01:00:00.000Z" },
      { ...base, cardId: "future", dueAt: "2026-08-24T01:00:00.000Z" },
    ];

    for (const record of records) await repository.put(STORE_NAMES.cardProgress, record);

    const due = await repository.getDueCardProgress(new Date("2026-08-23T04:00:00.000Z"), 2);
    expect(due.map(({ cardId }) => cardId)).toEqual(["first", "later"]);
  });

  it("opens the same schema repeatedly without destructive changes", async () => {
    const first = await openLearningDatabase(factory);
    repository = new LearningRepository(first, IDBKeyRange);
    const progress = createInitialProgress("card-keep", new Date("2026-08-23T02:00:00.000Z"));
    await repository.put(STORE_NAMES.cardProgress, progress);
    repository.close();
    repository = undefined;

    const second = await openLearningDatabase(factory);
    repository = new LearningRepository(second, IDBKeyRange);
    await expect(repository.get(STORE_NAMES.cardProgress, "card-keep")).resolves.toEqual(progress);
  });

  it("replaces and activates a dataset atomically", async () => {
    const database = await openLearningDatabase(factory);
    repository = new LearningRepository(database, IDBKeyRange);
    const first = makeCard("dataset-1", "card-1", "inform");
    const second = makeCard("dataset-1", "card-2", "meeting");
    await repository.replaceAndActivateDataset("dataset-1", [first, second], new Date("2026-08-23T02:00:00.000Z"));

    await expect(repository.getCardsByDataset("dataset-1")).resolves.toHaveLength(2);
    await expect(repository.get(STORE_NAMES.meta, ACTIVE_DATASET_META_KEY)).resolves.toMatchObject({
      value: "dataset-1",
    });

    await repository.replaceAndActivateDataset("dataset-1", [first], new Date("2026-08-24T02:00:00.000Z"));
    await expect(repository.getCardsByDataset("dataset-1")).resolves.toEqual([first]);
  });

  it("writes progress and its review event in one transaction", async () => {
    const database = await openLearningDatabase(factory);
    repository = new LearningRepository(database, IDBKeyRange);
    const progress = { ...createInitialProgress("card-1"), totalReviews: 1 };
    const event: ReviewEvent = {
      id: "event-1",
      cardId: "card-1",
      sessionId: "session-1",
      rating: "good",
      reviewedAt: "2026-08-23T02:00:00.000Z",
      previousIntervalDays: 0,
      nextIntervalDays: 3,
      nextDueAt: "2026-08-26T02:00:00.000Z",
      hintCount: 0,
      recallWithoutHint: true,
    };

    await repository.recordReview(progress, event);

    await expect(repository.get(STORE_NAMES.cardProgress, "card-1")).resolves.toEqual(progress);
    await expect(repository.get(STORE_NAMES.reviewEvents, "event-1")).resolves.toEqual(event);
  });

  it("queries unresolved mistakes through the V2 lapse index", async () => {
    const database = await openLearningDatabase(factory);
    repository = new LearningRepository(database, IDBKeyRange);
    const base = createInitialProgress("base", new Date("2026-08-23T02:00:00.000Z"));
    await repository.put(STORE_NAMES.cardProgress, {
      ...base, cardId: "resolved", state: "mastered", lapseCount: 3, lastReviewedAt: "2026-08-23T03:00:00.000Z",
    });
    await repository.put(STORE_NAMES.cardProgress, {
      ...base, cardId: "older", state: "review", lapseCount: 1, lastReviewedAt: "2026-08-22T03:00:00.000Z",
    });
    await repository.put(STORE_NAMES.cardProgress, {
      ...base, cardId: "newer", state: "learning", lapseCount: 2, lastReviewedAt: "2026-08-23T02:30:00.000Z",
    });

    await expect(repository.getMistakeCardProgress()).resolves.toMatchObject([
      { cardId: "newer" },
      { cardId: "older" },
    ]);
  });

  it("upgrades a V1 database to V2 without losing progress", async () => {
    const versionOne = await openVersionOneDatabase(factory);
    const oldRepository = new LearningRepository(versionOne, IDBKeyRange);
    const progress = {
      ...createInitialProgress("card-before-upgrade", new Date("2026-08-23T02:00:00.000Z")),
      lapseCount: 2,
    };
    await oldRepository.put(STORE_NAMES.cardProgress, progress);
    oldRepository.close();

    const upgraded = await openLearningDatabase(factory);
    repository = new LearningRepository(upgraded, IDBKeyRange);

    expect(upgraded.version).toBe(2);
    const transaction = upgraded.transaction(STORE_NAMES.cardProgress, "readonly");
    expect(transaction.objectStore(STORE_NAMES.cardProgress).indexNames.contains("byLapseCount")).toBe(true);
    await expect(repository.get(STORE_NAMES.cardProgress, "card-before-upgrade")).resolves.toEqual(progress);
  });

  it("stores node completion and its learner output atomically", async () => {
    const database = await openLearningDatabase(factory);
    repository = new LearningRepository(database, IDBKeyRange);
    const completedAt = new Date("2026-08-23T02:00:00.000Z");
    const progress = completeNodeProgress(undefined, "write-speak", completedAt);
    const output = {
      id: "output-1",
      cardId: "card-1",
      sessionId: "session-1",
      type: "sentence" as const,
      text: "I will inform the manager.",
      completed: true,
      createdAt: completedAt.toISOString(),
    };

    await repository.recordNodeCompletion(progress, output);

    await expect(repository.get(STORE_NAMES.nodeProgress, "write-speak")).resolves.toEqual(progress);
    await expect(repository.get(STORE_NAMES.learnerOutputs, "output-1")).resolves.toEqual(output);
  });

  it("stores a review and all coach outputs in one transaction", async () => {
    const database = await openLearningDatabase(factory);
    repository = new LearningRepository(database, IDBKeyRange);
    const progress = { ...createInitialProgress("card-1"), totalReviews: 1, currentCoachStep: 7 as const };
    const event: ReviewEvent = {
      id: "coach-review-1",
      cardId: "card-1",
      sessionId: "coach-session-1",
      rating: "good",
      reviewedAt: "2026-08-23T02:00:00.000Z",
      previousIntervalDays: 0,
      nextIntervalDays: 3,
      nextDueAt: "2026-08-26T02:00:00.000Z",
      hintCount: 1,
      recallWithoutHint: false,
    };
    const outputs = [
      { id: "prediction-1", cardId: "card-1", sessionId: "coach-session-1", type: "prediction" as const, text: "inform", completed: true, createdAt: event.reviewedAt },
      { id: "sentence-1", cardId: "card-1", sessionId: "coach-session-1", type: "sentence" as const, text: "Please inform me.", completed: true, createdAt: event.reviewedAt },
    ];

    await repository.recordReview(progress, event, outputs);

    await expect(repository.get(STORE_NAMES.cardProgress, "card-1")).resolves.toEqual(progress);
    await expect(repository.get(STORE_NAMES.reviewEvents, "coach-review-1")).resolves.toEqual(event);
    await expect(repository.get(STORE_NAMES.learnerOutputs, "prediction-1")).resolves.toEqual(outputs[0]);
    await expect(repository.get(STORE_NAMES.learnerOutputs, "sentence-1")).resolves.toEqual(outputs[1]);
  });

  it("reads every analytics source from one repository snapshot", async () => {
    const database = await openLearningDatabase(factory);
    repository = new LearningRepository(database, IDBKeyRange);
    const progress = { ...createInitialProgress("card-1"), totalReviews: 1 };
    const event: ReviewEvent = {
      id: "analytics-event", cardId: "card-1", sessionId: "analytics-session", rating: "good",
      reviewedAt: "2026-08-23T02:00:00.000Z", previousIntervalDays: 0, nextIntervalDays: 3,
      nextDueAt: "2026-08-26T02:00:00.000Z", hintCount: 0, recallWithoutHint: true,
    };
    const output = {
      id: "coach-output:sentence:analytics", cardId: "card-1", sessionId: "analytics-session",
      type: "sentence" as const, text: "Please inform me.", completed: true, createdAt: event.reviewedAt,
    };
    const node = completeNodeProgress(undefined, "write-speak", new Date(event.reviewedAt));
    await repository.recordReview(progress, event, [output]);
    await repository.put(STORE_NAMES.nodeProgress, node);

    await expect(repository.getAnalyticsRecords()).resolves.toMatchObject({
      cardProgress: [progress], reviewEvents: [event], learnerOutputs: [output], nodeProgress: [node],
    });
  });
});

function makeCard(datasetId: string, id: string, word: string): WordCard {
  return {
    id,
    word,
    definitionZh: "definition",
    source: { type: "user-csv", datasetId, importedAt: "2026-08-23T02:00:00.000Z" },
  };
}

function openVersionOneDatabase(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(LEARNING_DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.transaction) throw new Error("missing migration transaction");
      applySchemaV1(request.result, request.transaction);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
