import { describe, expect, it } from "vitest";
import {
  MIND_MAP_BRANCHES,
  MIND_MAP_NODES,
  completeNodeProgress,
  createAvailableNodeProgress,
  getMindMapCompletion,
  startNodeProgress,
} from "../lib/learning/mind-map";

const NOW = new Date("2026-08-23T02:00:00.000Z");

describe("mind-map curriculum", () => {
  it("contains three branches and twelve unique nodes", () => {
    expect(MIND_MAP_BRANCHES).toHaveLength(3);
    expect(MIND_MAP_NODES).toHaveLength(12);
    expect(new Set(MIND_MAP_NODES.map(({ id }) => id)).size).toBe(12);
    for (const branch of MIND_MAP_BRANCHES) {
      expect(MIND_MAP_NODES.filter(({ branchId }) => branchId === branch.id)).toHaveLength(4);
    }
  });

  it("moves an available node through in-progress to completed", () => {
    const available = createAvailableNodeProgress("core-image", NOW);
    const started = startNodeProgress(available, "core-image", NOW);
    const completed = completeNodeProgress(started, "core-image", NOW);

    expect(available.state).toBe("available");
    expect(started.state).toBe("in_progress");
    expect(completed).toMatchObject({ state: "completed", completionCount: 1, lastCompletedAt: NOW.toISOString() });
  });

  it("keeps completed history and increments repeat completions", () => {
    const once = completeNodeProgress(undefined, "core-image", NOW);
    const twice = completeNodeProgress(once, "core-image", new Date("2026-08-24T02:00:00.000Z"));
    expect(twice.completionCount).toBe(2);
    expect(startNodeProgress(twice, "core-image", NOW).state).toBe("completed");
  });

  it("calculates completion using only known completed nodes", () => {
    const records = [
      completeNodeProgress(undefined, MIND_MAP_NODES[0].id, NOW),
      completeNodeProgress(undefined, MIND_MAP_NODES[1].id, NOW),
      completeNodeProgress(undefined, "unknown", NOW),
    ];
    expect(getMindMapCompletion(records)).toEqual({ completed: 2, total: 12, percent: 17 });
  });
});
