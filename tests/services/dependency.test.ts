import { describe, it, expect } from "vitest";
import { isTaskActionable, buildTaskIndex, computeCriticalPathIds, computeDownstream, wouldCreateCycle } from "@/lib/services/dependency";
import type { ScoredTask } from "@/lib/types";

function task(overrides: Partial<ScoredTask> & Pick<ScoredTask, "id">): ScoredTask {
  return {
    title: overrides.id,
    status: "NOT_STARTED",
    effectiveWeight: 1,
    requiredForLaunch: false,
    verificationLevel: "RECOMMENDED",
    categoryId: "cat-1",
    categoryKey: "cat-1",
    milestoneId: "ms-1",
    estimatedMinutes: null,
    dueDate: null,
    externalWaitUntil: null,
    priorityOverride: null,
    createdAt: new Date("2026-01-01"),
    dependsOnIds: [],
    unlockCount: 0,
    ...overrides,
  };
}

describe("isTaskActionable", () => {
  it("is actionable when it has no dependencies", () => {
    const t = task({ id: "a" });
    expect(isTaskActionable(t, buildTaskIndex([t]))).toBe(true);
  });

  it("is not actionable while a prerequisite is incomplete", () => {
    const prereq = task({ id: "prereq", status: "NOT_STARTED" });
    const dependent = task({ id: "dependent", dependsOnIds: ["prereq"] });
    const index = buildTaskIndex([prereq, dependent]);
    expect(isTaskActionable(dependent, index)).toBe(false);
  });

  it("becomes actionable automatically once the prerequisite is DONE, without anything marking it complete", () => {
    const prereq = task({ id: "prereq", status: "DONE" });
    const dependent = task({ id: "dependent", status: "NOT_STARTED", dependsOnIds: ["prereq"] });
    const index = buildTaskIndex([prereq, dependent]);
    expect(isTaskActionable(dependent, index)).toBe(true);
    expect(dependent.status).toBe("NOT_STARTED"); // never auto-completed
  });

  it("treats a NOT_APPLICABLE prerequisite as satisfied", () => {
    const prereq = task({ id: "prereq", status: "NOT_APPLICABLE" });
    const dependent = task({ id: "dependent", dependsOnIds: ["prereq"] });
    expect(isTaskActionable(dependent, buildTaskIndex([prereq, dependent]))).toBe(true);
  });

  it("is never actionable while BLOCKED, regardless of dependencies", () => {
    const t = task({ id: "a", status: "BLOCKED" });
    expect(isTaskActionable(t, buildTaskIndex([t]))).toBe(false);
  });

  it("is never actionable while WAITING_EXTERNAL", () => {
    const t = task({ id: "a", status: "WAITING_EXTERNAL" });
    expect(isTaskActionable(t, buildTaskIndex([t]))).toBe(false);
  });

  it("is not actionable once DONE (nothing to do)", () => {
    const t = task({ id: "a", status: "DONE" });
    expect(isTaskActionable(t, buildTaskIndex([t]))).toBe(false);
  });
});

describe("computeCriticalPathIds", () => {
  it("includes required tasks and their full transitive prerequisite chain", () => {
    const root = task({ id: "root" });
    const middle = task({ id: "middle", dependsOnIds: ["root"] });
    const required = task({ id: "required", requiredForLaunch: true, dependsOnIds: ["middle"] });
    const unrelated = task({ id: "unrelated" });
    const ids = computeCriticalPathIds([root, middle, required, unrelated]);
    expect(ids.has("root")).toBe(true);
    expect(ids.has("middle")).toBe(true);
    expect(ids.has("required")).toBe(true);
    expect(ids.has("unrelated")).toBe(false);
  });
});

describe("computeDownstream", () => {
  it("maps a task to everything that directly depends on it", () => {
    const a = task({ id: "a" });
    const b = task({ id: "b", dependsOnIds: ["a"] });
    const c = task({ id: "c", dependsOnIds: ["a"] });
    const downstream = computeDownstream([a, b, c]);
    expect(downstream.get("a")).toEqual(expect.arrayContaining(["b", "c"]));
  });
});

describe("wouldCreateCycle", () => {
  it("detects a direct cycle", () => {
    const a = task({ id: "a" });
    const b = task({ id: "b", dependsOnIds: ["a"] });
    expect(wouldCreateCycle([a, b], { taskId: "a", dependsOnId: "b" })).toBe(true);
  });

  it("allows a valid new edge that doesn't cycle", () => {
    const a = task({ id: "a" });
    const b = task({ id: "b" });
    expect(wouldCreateCycle([a, b], { taskId: "b", dependsOnId: "a" })).toBe(false);
  });
});
