import { describe, it, expect } from "vitest";
import { computeMilestoneNodeStatus } from "@/lib/services/milestoneStatus";
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
    milestoneId: "m1",
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

describe("computeMilestoneNodeStatus", () => {
  it("is DONE when the milestone is complete", () => {
    const tasks = [task({ id: "t1", status: "DONE" })];
    expect(computeMilestoneNodeStatus({ id: "m1" }, tasks, [], new Map())).toBe("DONE");
  });

  it("is BLOCKED even if other tasks in the milestone are done", () => {
    const tasks = [task({ id: "t1", status: "DONE" }), task({ id: "t2", status: "BLOCKED" })];
    expect(computeMilestoneNodeStatus({ id: "m1" }, tasks, [], new Map())).toBe("BLOCKED");
  });

  it("is WAITING when a task is waiting and nothing is blocked", () => {
    const tasks = [task({ id: "t1", status: "WAITING_EXTERNAL" })];
    expect(computeMilestoneNodeStatus({ id: "m1" }, tasks, [], new Map())).toBe("WAITING");
  });

  it("is NOT_STARTED while an unmet prerequisite milestone exists", () => {
    const tasks = [task({ id: "t1", status: "NOT_STARTED" })];
    const completion = new Map([["prereq-milestone", false]]);
    expect(computeMilestoneNodeStatus({ id: "m1" }, tasks, ["prereq-milestone"], completion)).toBe("NOT_STARTED");
  });

  it("is AVAILABLE when nothing has started and prerequisites are met", () => {
    const tasks = [task({ id: "t1", status: "NOT_STARTED" })];
    const completion = new Map([["prereq-milestone", true]]);
    expect(computeMilestoneNodeStatus({ id: "m1" }, tasks, ["prereq-milestone"], completion)).toBe("AVAILABLE");
  });

  it("is IN_PROGRESS once some work has started", () => {
    const tasks = [task({ id: "t1", status: "IN_PROGRESS" }), task({ id: "t2", status: "NOT_STARTED" })];
    expect(computeMilestoneNodeStatus({ id: "m1" }, tasks, [], new Map())).toBe("IN_PROGRESS");
  });
});
