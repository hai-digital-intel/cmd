import { describe, it, expect } from "vitest";
import { computeNeglectedTasks } from "@/lib/services/neglect";
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

describe("computeNeglectedTasks", () => {
  const now = new Date("2026-01-20"); // 19 days after the default createdAt above

  it("excludes tasks younger than the threshold", () => {
    const fresh = task({ id: "fresh", createdAt: new Date("2026-01-18") }); // 2 days old
    const result = computeNeglectedTasks([fresh], buildTaskIndex([fresh]), { now, thresholdDays: 14 });
    expect(result).toHaveLength(0);
  });

  it("includes old actionable tasks past the threshold", () => {
    const old = task({ id: "old", createdAt: new Date("2026-01-01") }); // 19 days old
    const result = computeNeglectedTasks([old], buildTaskIndex([old]), { now, thresholdDays: 14 });
    expect(result).toHaveLength(1);
    expect(result[0]!.ageDays).toBe(19);
  });

  it("excludes DONE, BLOCKED, and WAITING_EXTERNAL tasks — nothing actionable to nudge about", () => {
    const done = task({ id: "done", status: "DONE" });
    const blocked = task({ id: "blocked", status: "BLOCKED" });
    const waiting = task({ id: "waiting", status: "WAITING_EXTERNAL" });
    const tasks = [done, blocked, waiting];
    const result = computeNeglectedTasks(tasks, buildTaskIndex(tasks), { now, thresholdDays: 14 });
    expect(result).toHaveLength(0);
  });

  it("excludes a task whose prerequisite isn't done yet (not actionable, so not neglected)", () => {
    const prereq = task({ id: "prereq", status: "NOT_STARTED" });
    const dependent = task({ id: "dependent", dependsOnIds: ["prereq"] });
    const tasks = [prereq, dependent];
    const result = computeNeglectedTasks(tasks, buildTaskIndex(tasks), { now, thresholdDays: 14 });
    expect(result.map((r) => r.taskId)).toEqual(["prereq"]);
  });

  it("ranks tasks blocking more downstream work above merely-older tasks", () => {
    const blocksMany = task({ id: "blocks-many", createdAt: new Date("2026-01-01"), unlockCount: 5 });
    const olderButIsolated = task({ id: "older-isolated", createdAt: new Date("2025-12-01"), unlockCount: 0 });
    const tasks = [blocksMany, olderButIsolated];
    const result = computeNeglectedTasks(tasks, buildTaskIndex(tasks), { now, thresholdDays: 14 });
    expect(result[0]!.taskId).toBe("blocks-many");
  });

  it("respects the limit", () => {
    const tasks = Array.from({ length: 10 }, (_, i) => task({ id: `t${i}`, createdAt: new Date("2026-01-01") }));
    const result = computeNeglectedTasks(tasks, buildTaskIndex(tasks), { now, thresholdDays: 14, limit: 3 });
    expect(result).toHaveLength(3);
  });
});
