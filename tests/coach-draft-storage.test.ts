import { describe, expect, it } from "vitest";
import { createCoachDraft } from "../lib/learning/coach";
import {
  COACH_DRAFTS_KEY,
  readCoachDraft,
  removeCoachDraft,
  writeCoachDraft,
} from "../lib/storage/coach-draft-storage";

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

describe("coach draft storage", () => {
  it("saves independent drafts per card and removes only the completed card", () => {
    const storage = new MemoryStorage();
    const first = { ...createCoachDraft("card-1"), step: 4 as const, selectedChunk: "inform someone" };
    const second = { ...createCoachDraft("card-2"), step: 6 as const, sentence: "A sentence." };
    writeCoachDraft(storage, first);
    writeCoachDraft(storage, second);

    expect(readCoachDraft(storage, "card-1")).toEqual(first);
    expect(readCoachDraft(storage, "card-2")).toEqual(second);

    removeCoachDraft(storage, "card-1");
    expect(readCoachDraft(storage, "card-1")).toBeUndefined();
    expect(readCoachDraft(storage, "card-2")).toEqual(second);
  });

  it("ignores malformed draft data safely", () => {
    const storage = new MemoryStorage();
    storage.setItem(COACH_DRAFTS_KEY, JSON.stringify({ "card-1": { cardId: "card-1", step: 99 } }));
    expect(readCoachDraft(storage, "card-1")).toBeUndefined();
  });
});
