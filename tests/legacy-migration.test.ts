import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LearningRepository, STORE_NAMES, deleteLearningDatabase, openLearningDatabase } from "../lib/storage/database";
import {
  CURRENT_UI_STATE_KEY,
  LEGACY_MIGRATION_META_KEY,
  LEGACY_PROGRESS_KEY,
  migrateLegacyLocalProgress,
  parseLegacyProgress,
} from "../lib/storage/legacy-migration";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

let factory: IDBFactory;
let repository: LearningRepository | undefined;

beforeEach(() => { factory = new IDBFactory(); });
afterEach(async () => {
  repository?.close();
  repository = undefined;
  await deleteLearningDatabase(factory);
});

describe("legacy localStorage migration", () => {
  it("validates old progress strictly", () => {
    expect(parseLegacyProgress('{"index":2,"counts":{"again":1,"hard":2,"good":3,"easy":4}}')).toEqual({
      index: 2,
      counts: { again: 1, hard: 2, good: 3, easy: 4 },
    });
    expect(parseLegacyProgress('{"index":-1,"counts":{"again":1,"hard":2,"good":3,"easy":4}}')).toBeNull();
    expect(parseLegacyProgress("not-json")).toBeNull();
  });

  it("copies valid progress, records migration and retains the rollback source", async () => {
    const database = await openLearningDatabase(factory);
    repository = new LearningRepository(database, IDBKeyRange);
    const storage = new MemoryStorage();
    const raw = '{"index":8,"counts":{"again":1,"hard":2,"good":3,"easy":4}}';
    storage.setItem(LEGACY_PROGRESS_KEY, raw);

    const result = await migrateLegacyLocalProgress(repository, storage, new Date("2026-08-23T02:00:00.000Z"));

    expect(result.status).toBe("migrated");
    expect(storage.getItem(LEGACY_PROGRESS_KEY)).toBe(raw);
    expect(storage.getItem(CURRENT_UI_STATE_KEY)).toBe(raw);
    await expect(repository.get(STORE_NAMES.meta, LEGACY_MIGRATION_META_KEY)).resolves.toMatchObject({
      value: { status: "migrated", progress: result.progress, sourceKey: LEGACY_PROGRESS_KEY },
    });
  });

  it("is idempotent and does not overwrite the saved migration", async () => {
    const database = await openLearningDatabase(factory);
    repository = new LearningRepository(database, IDBKeyRange);
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_PROGRESS_KEY, '{"index":3,"counts":{"again":0,"hard":0,"good":1,"easy":0}}');
    await migrateLegacyLocalProgress(repository, storage, new Date("2026-08-23T02:00:00.000Z"));
    storage.setItem(LEGACY_PROGRESS_KEY, '{"index":99,"counts":{"again":9,"hard":9,"good":9,"easy":9}}');

    const second = await migrateLegacyLocalProgress(repository, storage, new Date("2026-08-24T02:00:00.000Z"));

    expect(second).toMatchObject({ status: "already-migrated", progress: { index: 3 } });
  });

  it("records invalid data without deleting it", async () => {
    const database = await openLearningDatabase(factory);
    repository = new LearningRepository(database, IDBKeyRange);
    const storage = new MemoryStorage();
    storage.setItem(LEGACY_PROGRESS_KEY, "invalid-json");

    await expect(migrateLegacyLocalProgress(repository, storage)).resolves.toMatchObject({ status: "invalid" });
    expect(storage.getItem(LEGACY_PROGRESS_KEY)).toBe("invalid-json");
  });
});
