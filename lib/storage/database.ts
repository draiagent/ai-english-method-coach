import type {
  CardProgress,
  LearnerOutput,
  LearningSession,
  MetaRecord,
  NodeProgress,
  ReviewEvent,
  WordCard,
} from "../learning/types";
import type { AnalyticsRecords } from "../learning/analytics";

export const LEARNING_DATABASE_NAME = "ai-english-thinking-coach-v1";
export const LEARNING_DATABASE_VERSION = 2;
export const ACTIVE_DATASET_META_KEY = "activeDatasetId";

export const STORE_NAMES = {
  cards: "cards",
  cardProgress: "cardProgress",
  reviewEvents: "reviewEvents",
  learningSessions: "learningSessions",
  nodeProgress: "nodeProgress",
  learnerOutputs: "learnerOutputs",
  meta: "meta",
} as const;

export type LearningStoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];

export interface LearningStoreRecords {
  cards: WordCard;
  cardProgress: CardProgress;
  reviewEvents: ReviewEvent;
  learningSessions: LearningSession;
  nodeProgress: NodeProgress;
  learnerOutputs: LearnerOutput;
  meta: MetaRecord;
}

interface IndexDefinition {
  name: string;
  keyPath: string;
  options?: IDBIndexParameters;
}

interface StoreDefinition {
  name: LearningStoreName;
  options: IDBObjectStoreParameters;
  indexes: IndexDefinition[];
}

export const SCHEMA_V1: readonly StoreDefinition[] = [
  {
    name: STORE_NAMES.cards,
    options: { keyPath: "id" },
    indexes: [
      { name: "byWord", keyPath: "word" },
      { name: "byDatasetId", keyPath: "source.datasetId" },
      { name: "byCategory", keyPath: "category" },
      { name: "byLevel", keyPath: "level" },
    ],
  },
  {
    name: STORE_NAMES.cardProgress,
    options: { keyPath: "cardId" },
    indexes: [
      { name: "byDueAt", keyPath: "dueAt" },
      { name: "byState", keyPath: "state" },
      { name: "byUpdatedAt", keyPath: "updatedAt" },
    ],
  },
  {
    name: STORE_NAMES.reviewEvents,
    options: { keyPath: "id" },
    indexes: [
      { name: "byCardId", keyPath: "cardId" },
      { name: "bySessionId", keyPath: "sessionId" },
      { name: "byReviewedAt", keyPath: "reviewedAt" },
    ],
  },
  {
    name: STORE_NAMES.learningSessions,
    options: { keyPath: "id" },
    indexes: [
      { name: "byStatus", keyPath: "status" },
      { name: "byUpdatedAt", keyPath: "updatedAt" },
    ],
  },
  {
    name: STORE_NAMES.nodeProgress,
    options: { keyPath: "nodeId" },
    indexes: [
      { name: "byState", keyPath: "state" },
      { name: "byUpdatedAt", keyPath: "updatedAt" },
    ],
  },
  {
    name: STORE_NAMES.learnerOutputs,
    options: { keyPath: "id" },
    indexes: [
      { name: "byCardId", keyPath: "cardId" },
      { name: "bySessionId", keyPath: "sessionId" },
      { name: "byCreatedAt", keyPath: "createdAt" },
    ],
  },
  {
    name: STORE_NAMES.meta,
    options: { keyPath: "key" },
    indexes: [{ name: "byUpdatedAt", keyPath: "updatedAt" }],
  },
] as const;

export const SCHEMA_V2_INDEXES: Readonly<Record<LearningStoreName, readonly IndexDefinition[]>> = {
  cards: [],
  cardProgress: [
    { name: "byLapseCount", keyPath: "lapseCount" },
    { name: "byLastRating", keyPath: "lastRating" },
  ],
  reviewEvents: [],
  learningSessions: [],
  nodeProgress: [],
  learnerOutputs: [],
  meta: [],
};

export function openLearningDatabase(factory: IDBFactory = globalThis.indexedDB): Promise<IDBDatabase> {
  if (!factory) return Promise.reject(new Error("此瀏覽器不支援 IndexedDB"));

  return new Promise((resolve, reject) => {
    const request = factory.open(LEARNING_DATABASE_NAME, LEARNING_DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      const transaction = request.transaction;
      if (!transaction) throw new Error("IndexedDB migration transaction is unavailable");
      applySchemaV1(database, transaction);
      applySchemaV2(transaction);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("無法開啟學習資料庫"));
    request.onblocked = () => reject(new Error("學習資料庫升級被其他分頁阻擋"));
  });
}

export function applySchemaV2(transaction: IDBTransaction): void {
  for (const [storeName, indexes] of Object.entries(SCHEMA_V2_INDEXES) as Array<[
    LearningStoreName,
    readonly IndexDefinition[],
  ]>) {
    const store = transaction.objectStore(storeName);
    for (const index of indexes) {
      if (!store.indexNames.contains(index.name)) store.createIndex(index.name, index.keyPath, index.options);
    }
  }
}

export function applySchemaV1(database: IDBDatabase, transaction: IDBTransaction): void {
  for (const definition of SCHEMA_V1) {
    const store = database.objectStoreNames.contains(definition.name)
      ? transaction.objectStore(definition.name)
      : database.createObjectStore(definition.name, definition.options);

    for (const index of definition.indexes) {
      if (!store.indexNames.contains(index.name)) {
        store.createIndex(index.name, index.keyPath, index.options);
      }
    }
  }
}

export class LearningRepository {
  constructor(
    private readonly database: IDBDatabase,
    private readonly keyRange: typeof IDBKeyRange = globalThis.IDBKeyRange,
  ) {}

  put<K extends keyof LearningStoreRecords>(storeName: K, value: LearningStoreRecords[K]): Promise<IDBValidKey> {
    const transaction = this.database.transaction(storeName, "readwrite");
    const request = transaction.objectStore(storeName).put(value);
    return requestToPromise(request);
  }

  get<K extends keyof LearningStoreRecords>(
    storeName: K,
    key: IDBValidKey,
  ): Promise<LearningStoreRecords[K] | undefined> {
    const transaction = this.database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(key);
    return requestToPromise(request) as Promise<LearningStoreRecords[K] | undefined>;
  }

  getCardsByDataset(datasetId: string): Promise<WordCard[]> {
    const transaction = this.database.transaction(STORE_NAMES.cards, "readonly");
    const request = transaction.objectStore(STORE_NAMES.cards).index("byDatasetId").getAll(datasetId);
    return requestToPromise(request) as Promise<WordCard[]>;
  }

  getAllCardProgress(): Promise<CardProgress[]> {
    const transaction = this.database.transaction(STORE_NAMES.cardProgress, "readonly");
    const request = transaction.objectStore(STORE_NAMES.cardProgress).getAll();
    return requestToPromise(request) as Promise<CardProgress[]>;
  }

  getMistakeCardProgress(limit = 500): Promise<CardProgress[]> {
    if (!Number.isInteger(limit) || limit < 1) return Promise.reject(new RangeError("limit must be a positive integer"));
    if (!this.keyRange) return Promise.reject(new Error("此環境不支援 IndexedDB key ranges"));
    const transaction = this.database.transaction(STORE_NAMES.cardProgress, "readonly");
    const request = transaction.objectStore(STORE_NAMES.cardProgress)
      .index("byLapseCount")
      .getAll(this.keyRange.lowerBound(1));
    return requestToPromise(request).then((records) => (records as CardProgress[])
      .filter((progress) => progress.state !== "mastered")
      .sort((left, right) => (right.lastReviewedAt ?? "").localeCompare(left.lastReviewedAt ?? ""))
      .slice(0, limit));
  }

  getAllNodeProgress(): Promise<NodeProgress[]> {
    const transaction = this.database.transaction(STORE_NAMES.nodeProgress, "readonly");
    const request = transaction.objectStore(STORE_NAMES.nodeProgress).getAll();
    return requestToPromise(request) as Promise<NodeProgress[]>;
  }

  getAnalyticsRecords(): Promise<AnalyticsRecords> {
    const transaction = this.database.transaction([
      STORE_NAMES.cardProgress,
      STORE_NAMES.reviewEvents,
      STORE_NAMES.learnerOutputs,
      STORE_NAMES.nodeProgress,
    ], "readonly");
    return Promise.all([
      requestToPromise(transaction.objectStore(STORE_NAMES.cardProgress).getAll()),
      requestToPromise(transaction.objectStore(STORE_NAMES.reviewEvents).getAll()),
      requestToPromise(transaction.objectStore(STORE_NAMES.learnerOutputs).getAll()),
      requestToPromise(transaction.objectStore(STORE_NAMES.nodeProgress).getAll()),
    ]).then(([cardProgress, reviewEvents, learnerOutputs, nodeProgress]) => ({
      cardProgress: cardProgress as CardProgress[],
      reviewEvents: reviewEvents as ReviewEvent[],
      learnerOutputs: learnerOutputs as LearnerOutput[],
      nodeProgress: nodeProgress as NodeProgress[],
    }));
  }

  replaceDatasetCards(datasetId: string, cards: WordCard[]): Promise<void> {
    return this.replaceDataset(datasetId, cards, false, new Date());
  }

  replaceAndActivateDataset(datasetId: string, cards: WordCard[], activatedAt = new Date()): Promise<void> {
    return this.replaceDataset(datasetId, cards, true, activatedAt);
  }

  private replaceDataset(
    datasetId: string,
    cards: WordCard[],
    activate: boolean,
    activatedAt: Date,
  ): Promise<void> {
    if (cards.some((card) => card.source.datasetId !== datasetId)) {
      return Promise.reject(new Error("所有字卡都必須屬於相同 datasetId"));
    }
    if (Number.isNaN(activatedAt.getTime())) return Promise.reject(new RangeError("activatedAt must be a valid date"));

    if (!this.keyRange) return Promise.reject(new Error("此環境不支援 IndexedDB key ranges"));
    const stores: LearningStoreName[] = activate
      ? [STORE_NAMES.cards, STORE_NAMES.meta]
      : [STORE_NAMES.cards];
    const transaction = this.database.transaction(stores, "readwrite");
    const store = transaction.objectStore(STORE_NAMES.cards);
    const cursorRequest = store.index("byDatasetId").openKeyCursor(this.keyRange.only(datasetId));

    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (cursor) {
        store.delete(cursor.primaryKey);
        cursor.continue();
        return;
      }
      for (const card of cards) store.put(card);
      if (activate) {
        transaction.objectStore(STORE_NAMES.meta).put({
          key: ACTIVE_DATASET_META_KEY,
          value: datasetId,
          updatedAt: activatedAt.toISOString(),
        } satisfies MetaRecord);
      }
    };

    return transactionToPromise(transaction);
  }

  recordReview(progress: CardProgress, event: ReviewEvent, outputs: LearnerOutput[] = []): Promise<void> {
    if (progress.cardId !== event.cardId) return Promise.reject(new Error("評分事件與字卡進度不一致"));
    if (outputs.some((output) => output.cardId !== progress.cardId || output.sessionId !== event.sessionId)) {
      return Promise.reject(new Error("輸出證據與評分事件不一致"));
    }
    const stores: LearningStoreName[] = outputs.length
      ? [STORE_NAMES.cardProgress, STORE_NAMES.reviewEvents, STORE_NAMES.learnerOutputs]
      : [STORE_NAMES.cardProgress, STORE_NAMES.reviewEvents];
    const transaction = this.database.transaction(stores, "readwrite");
    transaction.objectStore(STORE_NAMES.cardProgress).put(progress);
    transaction.objectStore(STORE_NAMES.reviewEvents).add(event);
    if (outputs.length) {
      const outputStore = transaction.objectStore(STORE_NAMES.learnerOutputs);
      for (const output of outputs) outputStore.add(output);
    }
    return transactionToPromise(transaction);
  }

  recordNodeCompletion(progress: NodeProgress, output?: LearnerOutput): Promise<void> {
    const stores: LearningStoreName[] = output
      ? [STORE_NAMES.nodeProgress, STORE_NAMES.learnerOutputs]
      : [STORE_NAMES.nodeProgress];
    const transaction = this.database.transaction(stores, "readwrite");
    transaction.objectStore(STORE_NAMES.nodeProgress).put(progress);
    if (output) transaction.objectStore(STORE_NAMES.learnerOutputs).add(output);
    return transactionToPromise(transaction);
  }

  getDueCardProgress(now: Date, limit = 100): Promise<CardProgress[]> {
    if (Number.isNaN(now.getTime())) return Promise.reject(new RangeError("now must be a valid date"));
    if (!Number.isInteger(limit) || limit < 1) return Promise.reject(new RangeError("limit must be a positive integer"));

    const transaction = this.database.transaction(STORE_NAMES.cardProgress, "readonly");
    const index = transaction.objectStore(STORE_NAMES.cardProgress).index("byDueAt");
    if (!this.keyRange) return Promise.reject(new Error("此環境不支援 IndexedDB key ranges"));
    const request = index.openCursor(this.keyRange.upperBound(now.toISOString()));

    return new Promise((resolve, reject) => {
      const records: CardProgress[] = [];
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor || records.length >= limit) {
          resolve(records);
          return;
        }
        records.push(cursor.value as CardProgress);
        cursor.continue();
      };
      request.onerror = () => reject(request.error ?? new Error("無法讀取到期字卡"));
    });
  }

  close(): void {
    this.database.close();
  }
}

export function deleteLearningDatabase(factory: IDBFactory = globalThis.indexedDB): Promise<void> {
  if (!factory) return Promise.reject(new Error("此瀏覽器不支援 IndexedDB"));

  return new Promise((resolve, reject) => {
    const request = factory.deleteDatabase(LEARNING_DATABASE_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("無法刪除學習資料庫"));
    request.onblocked = () => reject(new Error("學習資料庫刪除被其他分頁阻擋"));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("IndexedDB transaction failed"));
    transaction.onabort = () => reject(transaction.error ?? new Error("IndexedDB transaction was aborted"));
  });
}
