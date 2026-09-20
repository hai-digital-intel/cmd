import { describe, it, expect } from "vitest";
import { selectNextActions, selectQuickWins, scoreTask } from "@/lib/services/prioritization";
import { buildTaskIndex } from "@/lib/services/dependency";
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

describe("selectNextActions", () => {
  it("never includes a BLOCKED task, even if nothing else qualifies", () => {
    const blocked = task({ id: "blocked", status: "BLOCKED", requiredForLaunch: true });
    const result = selectNextActions([blocked], { tasksById: buildTaskIndex([blocked]), criticalPathIds: new Set() });
    expect(result.find((r) => r.task.id === "blocked")).toBeUndefined();
  });

  it("excludes tasks whose prerequisites are not yet done", () => {
    const prereq = task({ id: "prereq", status: "NOT_STARTED" });
    const dependent = task({ id: "dependent", dependsOnIds: ["prereq"] });
    const tasks = [prereq, dependent];
    const result = selectNextActions(tasks, { tasksById: buildTaskIndex(tasks), criticalPathIds: new Set() });
    const ids = result.map((r) => r.task.id);
    expect(ids).toContain("prereq");
    expect(ids).not.toContain("dependent");
  });

  it("does not let WAITING_EXTERNAL tasks dominate the ranking over available work", () => {
    const waiting = task({ id: "waiting", status: "WAITING_EXTERNAL", requiredForLaunch: true, effectiveWeight: 10 });
    const available = task({ id: "available", status: "NOT_STARTED", effectiveWeight: 1 });
    // WAITING_EXTERNAL tasks are excluded from the actionable pool entirely.
    const tasks = [waiting, available];
    const result = selectNextActions(tasks, { tasksById: buildTaskIndex(tasks), criticalPathIds: new Set() });
    expect(result.map((r) => r.task.id)).toEqual(["available"]);
  });

  it("completing a dependency makes downstream work actionable without marking it done", () => {
    const prereq = task({ id: "prereq", status: "DONE" });
    const dependent = task({ id: "dependent", status: "NOT_STARTED", dependsOnIds: ["prereq"] });
    const tasks = [prereq, dependent];
    const result = selectNextActions(tasks, { tasksById: buildTaskIndex(tasks), criticalPathIds: new Set() });
    expect(result.map((r) => r.task.id)).toContain("dependent");
    expect(dependent.status).toBe("NOT_STARTED");
  });

  it("ranks critical-path and required-for-launch work above ordinary tasks", () => {
    const ordinary = task({ id: "ordinary" });
    const critical = task({ id: "critical", requiredForLaunch: true });
    const tasks = [ordinary, critical];
    const result = selectNextActions(tasks, {
      tasksById: buildTaskIndex(tasks),
      criticalPathIds: new Set(["critical"]),
      now: new Date("2026-01-10"),
    });
    expect(result[0]!.task.id).toBe("critical");
  });

  it("gives a manual priority override enough weight to win", () => {
    const normal = task({ id: "normal", requiredForLaunch: true });
    const overridden = task({ id: "overridden", priorityOverride: 1 });
    const tasks = [normal, overridden];
    const result = selectNextActions(tasks, { tasksById: buildTaskIndex(tasks), criticalPathIds: new Set() });
    expect(result[0]!.task.id).toBe("overridden");
  });

  it("respects the limit", () => {
    const tasks = Array.from({ length: 10 }, (_, i) => task({ id: `t${i}` }));
    const result = selectNextActions(tasks, { tasksById: buildTaskIndex(tasks), criticalPathIds: new Set(), limit: 3 });
    expect(result).toHaveLength(3);
  });
});

describe("selectQuickWins", () => {
  it("only includes actionable tasks estimated at 15 minutes or less", () => {
    const quick = task({ id: "quick", estimatedMinutes: 10 });
    const long = task({ id: "long", estimatedMinutes: 120 });
    const noEstimate = task({ id: "unestimated", estimatedMinutes: null });
    const tasks = [quick, long, noEstimate];
    const result = selectQuickWins(tasks, { tasksById: buildTaskIndex(tasks), criticalPathIds: new Set() });
    expect(result.map((r) => r.task.id)).toEqual(["quick"]);
  });
});

describe("scoreTask reasons", () => {
  it("surfaces a human-readable reason for each contributing factor", () => {
    const t = task({ id: "t1", requiredForLaunch: true, unlockCount: 2 });
    const result = scoreTask(t, { isCriticalPath: true, now: new Date("2026-01-01") });
    expect(result.reasons).toContain("On the critical path");
    expect(result.reasons).toContain("Required for launch");
    expect(result.reasons.some((r) => r.includes("Unlocks"))).toBe(true);
  });
});
