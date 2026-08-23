import type { LearnerProfile, LearningGoal, LearnerLevel } from "../learning/types";
import type { StorageLike } from "./legacy-migration";

export const LEARNER_PROFILE_KEY = "ai-english-learner-profile-v1";

const LEVELS = new Set<LearnerLevel>(["beginner", "elementary", "intermediate", "advanced"]);
const GOALS = new Set<LearningGoal>(["business", "exam-prep", "daily", "teacher-custom"]);
const DAILY_MINUTES = new Set([5, 10, 15, 20]);

export function createDefaultProfile(now = new Date()): LearnerProfile {
  if (Number.isNaN(now.getTime())) throw new RangeError("now must be a valid date");
  const timestamp = now.toISOString();
  return {
    id: "local-user",
    level: "elementary",
    goal: "business",
    dailyMinutes: 10,
    onboardingCompleted: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function readLearnerProfile(storage: StorageLike): LearnerProfile | undefined {
  const raw = storage.getItem(LEARNER_PROFILE_KEY);
  if (!raw) return undefined;

  try {
    const value = JSON.parse(raw) as Partial<LearnerProfile>;
    if (
      value.id !== "local-user"
      || !LEVELS.has(value.level as LearnerLevel)
      || !GOALS.has(value.goal as LearningGoal)
      || !DAILY_MINUTES.has(value.dailyMinutes as number)
      || typeof value.onboardingCompleted !== "boolean"
      || typeof value.createdAt !== "string"
      || typeof value.updatedAt !== "string"
    ) return undefined;
    return value as LearnerProfile;
  } catch {
    return undefined;
  }
}

export function saveLearnerProfile(storage: StorageLike, profile: LearnerProfile): void {
  storage.setItem(LEARNER_PROFILE_KEY, JSON.stringify(profile));
}
