import type { LearningRepository } from "./database";
import { STORE_NAMES } from "./database";

export const LEGACY_PROGRESS_KEY = "english-card-progress-v1";
export const CURRENT_UI_STATE_KEY = "ai-english-ui-state-v1";
export const LEGACY_MIGRATION_META_KEY = "migration:legacy-progress-v1";

export interface LegacyCounts {
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export interface LegacyProgress {
  index: number;
  counts: LegacyCounts;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LegacyMigrationResult {
  status: "already-migrated" | "migrated" | "invalid" | "not-found";
  progress?: LegacyProgress;
}

export async function migrateLegacyLocalProgress(
  repository: LearningRepository,
  storage: StorageLike,
  migratedAt = new Date(),
): Promise<LegacyMigrationResult> {
  const existing = await repository.get(STORE_NAMES.meta, LEGACY_MIGRATION_META_KEY);
  if (existing) {
    const value = existing.value as { status?: string; progress?: LegacyProgress };
    return {
      status: "already-migrated",
      progress: value.progress,
    };
  }

  const raw = storage.getItem(LEGACY_PROGRESS_KEY);
  if (!raw) {
    await saveMigrationRecord(repository, "not-found", undefined, migratedAt);
    return { status: "not-found" };
  }

  const progress = parseLegacyProgress(raw);
  if (!progress) {
    await saveMigrationRecord(repository, "invalid", undefined, migratedAt);
    return { status: "invalid" };
  }

  await saveMigrationRecord(repository, "migrated", progress, migratedAt);
  storage.setItem(CURRENT_UI_STATE_KEY, JSON.stringify(progress));

  // Keep the legacy key untouched as a rollback source. It can be removed in a
  // later release only after the new storage path has been proven in production.
  return { status: "migrated", progress };
}

export function readCurrentUiState(storage: StorageLike): LegacyProgress | undefined {
  const raw = storage.getItem(CURRENT_UI_STATE_KEY);
  return raw ? parseLegacyProgress(raw) ?? undefined : undefined;
}

export function writeCurrentUiState(storage: StorageLike, progress: LegacyProgress): void {
  storage.setItem(CURRENT_UI_STATE_KEY, JSON.stringify(progress));
}

export function parseLegacyProgress(raw: string): LegacyProgress | null {
  try {
    const value = JSON.parse(raw) as { index?: unknown; counts?: Record<string, unknown> };
    if (!isNonNegativeInteger(value.index) || !value.counts) return null;
    const counts = value.counts;
    if (!["again", "hard", "good", "easy"].every((key) => isNonNegativeInteger(counts[key]))) return null;

    return {
      index: value.index,
      counts: {
        again: counts.again as number,
        hard: counts.hard as number,
        good: counts.good as number,
        easy: counts.easy as number,
      },
    };
  } catch {
    return null;
  }
}

async function saveMigrationRecord(
  repository: LearningRepository,
  status: "migrated" | "invalid" | "not-found",
  progress: LegacyProgress | undefined,
  migratedAt: Date,
): Promise<void> {
  if (Number.isNaN(migratedAt.getTime())) throw new RangeError("migratedAt must be a valid date");
  await repository.put(STORE_NAMES.meta, {
    key: LEGACY_MIGRATION_META_KEY,
    value: { status, progress, sourceKey: LEGACY_PROGRESS_KEY },
    updatedAt: migratedAt.toISOString(),
  });
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}
