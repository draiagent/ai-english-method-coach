import { describe, expect, it } from "vitest";
import {
  LEARNER_PROFILE_KEY,
  createDefaultProfile,
  readLearnerProfile,
  saveLearnerProfile,
} from "../lib/storage/profile-storage";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("learner profile storage", () => {
  it("creates the specified V1 defaults", () => {
    expect(createDefaultProfile(new Date("2026-08-23T02:00:00.000Z"))).toMatchObject({
      level: "elementary",
      goal: "business",
      dailyMinutes: 10,
      onboardingCompleted: false,
    });
  });

  it("round-trips a valid profile", () => {
    const storage = new MemoryStorage();
    const profile = { ...createDefaultProfile(), onboardingCompleted: true };
    saveLearnerProfile(storage, profile);
    expect(readLearnerProfile(storage)).toEqual(profile);
  });

  it("rejects malformed or unsupported values", () => {
    const storage = new MemoryStorage();
    storage.setItem(LEARNER_PROFILE_KEY, JSON.stringify({
      ...createDefaultProfile(),
      dailyMinutes: 999,
    }));
    expect(readLearnerProfile(storage)).toBeUndefined();
  });
});
