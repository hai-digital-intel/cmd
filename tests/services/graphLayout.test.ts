import { describe, it, expect } from "vitest";
import { computeLayeredPositions } from "@/lib/services/graphLayout";

describe("computeLayeredPositions", () => {
  it("places a node with no dependencies at depth 0", () => {
    const positions = computeLayeredPositions([{ id: "a", dependsOnIds: [], sortKey: "a" }]);
    expect(positions.get("a")?.x).toBe(0);
  });

  it("places a dependent node strictly to the right of its prerequisite", () => {
    const positions = computeLayeredPositions([
      { id: "a", dependsOnIds: [], sortKey: "a" },
      { id: "b", dependsOnIds: ["a"], sortKey: "b" },
    ]);
    expect(positions.get("b")!.x).toBeGreaterThan(positions.get("a")!.x);
  });

  it("uses the longest chain when a node has multiple prerequisites at different depths", () => {
    const positions = computeLayeredPositions([
      { id: "a", dependsOnIds: [], sortKey: "a" },
      { id: "b", dependsOnIds: ["a"], sortKey: "b" },
      { id: "c", dependsOnIds: ["a", "b"], sortKey: "c" },
    ]);
    // c depends on both a (depth 0) and b (depth 1) -> c must be depth 2, past both.
    expect(positions.get("c")!.x).toBeGreaterThan(positions.get("b")!.x);
  });

  it("does not infinite-loop on a cyclic reference", () => {
    const positions = computeLayeredPositions([
      { id: "a", dependsOnIds: ["b"], sortKey: "a" },
      { id: "b", dependsOnIds: ["a"], sortKey: "b" },
    ]);
    expect(positions.size).toBe(2);
  });

  it("gives every node in the same layer a distinct y position", () => {
    const positions = computeLayeredPositions([
      { id: "a", dependsOnIds: [], sortKey: "a" },
      { id: "b", dependsOnIds: [], sortKey: "b" },
    ]);
    expect(positions.get("a")!.y).not.toBe(positions.get("b")!.y);
  });
});
