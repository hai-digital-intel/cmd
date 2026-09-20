import { describe, it, expect } from "vitest";
import {
  computeWeightedReadiness,
  computeOverallReadiness,
  computeCriticalPathReadiness,
  computeCategoryReadiness,
} from "@/lib/services/readiness";
import type { ScoredCategory, ScoredTask } from "@/lib/types";

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

describe("computeWeightedReadiness", () => {
  it("is 0 when there is nothing applicable (never a misleading 100)", () => {
    expect(computeWeightedReadiness([]).score).toBe(0);
  });

  it("weighs tasks, not just counts them", () => {
    const tasks = [
      task({ id: "heavy", status: "DONE", effectiveWeight: 9 }),
      task({ id: "light-1", status: "NOT_STARTED", effectiveWeight: 1 }),
    ];
    // 9 / 10 = 90%, even though only 1 of 2 tasks is done.
    expect(computeWeightedReadiness(tasks).score).toBeCloseTo(90);
  });

  it("excludes NOT_APPLICABLE tasks from the denominator entirely", () => {
    const tasks = [
      task({ id: "done", status: "DONE", effectiveWeight: 5 }),
      task({ id: "na", status: "NOT_APPLICABLE", effectiveWeight: 100 }),
    ];
    // The NOT_APPLICABLE task's huge weight must not dilute readiness.
    expect(computeWeightedReadiness(tasks).score).toBe(100);
  });

  it("does not count NEEDS_CONFIRMATION as complete", () => {
    const tasks = [
      task({ id: "confirm", status: "NEEDS_CONFIRMATION", effectiveWeight: 1 }),
      task({ id: "done", status: "DONE", effectiveWeight: 1 }),
    ];
    expect(computeWeightedReadiness(tasks).score).toBeCloseTo(50);
  });
});

describe("computeOverallReadiness / computeCriticalPathReadiness", () => {
  it("critical path readiness only considers tasks on the critical path", () => {
    const tasks = [
      task({ id: "critical-done", status: "DONE", effectiveWeight: 1 }),
      task({ id: "critical-todo", status: "NOT_STARTED", effectiveWeight: 1 }),
      task({ id: "noncritical-done", status: "DONE", effectiveWeight: 100 }),
    ];
    const criticalIds = new Set(["critical-done", "critical-todo"]);
    expect(computeCriticalPathReadiness(tasks, criticalIds)).toBeCloseTo(50);
    // Overall readiness is dominated by the heavy noncritical task, proving they're independent.
    expect(computeOverallReadiness(tasks)).toBeGreaterThan(95);
  });
});

describe("computeCategoryReadiness", () => {
  it("computes readiness per category independently", () => {
    const categories: ScoredCategory[] = [
      { id: "cat-a", key: "a", name: "A", weight: 1, launchGateId: null },
      { id: "cat-b", key: "b", name: "B", weight: 1, launchGateId: null },
    ];
    const tasks = [
      task({ id: "a1", categoryId: "cat-a", status: "DONE" }),
      task({ id: "b1", categoryId: "cat-b", status: "NOT_STARTED" }),
    ];
    const result = computeCategoryReadiness(tasks, categories);
    expect(result.a).toBe(100);
    expect(result.b).toBe(0);
  });
});
