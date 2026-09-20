import { describe, it, expect } from "vitest";
import { computeMilestoneCompletion, computeGateStatus, isCompanyReady } from "@/lib/services/launchGates";
import type { ScoredLaunchGate, ScoredMilestone, ScoredTask } from "@/lib/types";

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

describe("computeMilestoneCompletion", () => {
  it("is incomplete while a required task is blocked — the core acceptance rule", () => {
    const tasks = [
      task({ id: "t1", milestoneId: "m1", status: "DONE" }),
      task({ id: "t2", milestoneId: "m1", status: "BLOCKED" }),
    ];
    const result = computeMilestoneCompletion({ id: "m1" }, tasks);
    expect(result.complete).toBe(false);
    expect(result.blockingTaskIds).toEqual(["t2"]);
  });

  it("an OPTIONAL task left NOT_APPLICABLE must not reduce completion", () => {
    const tasks = [
      task({ id: "t1", milestoneId: "m1", status: "DONE" }),
      task({ id: "t2", milestoneId: "m1", status: "NOT_APPLICABLE", verificationLevel: "OPTIONAL" }),
    ];
    expect(computeMilestoneCompletion({ id: "m1" }, tasks).complete).toBe(true);
  });

  it("an OPTIONAL task that is merely incomplete (not NOT_APPLICABLE) also never blocks", () => {
    const tasks = [
      task({ id: "t1", milestoneId: "m1", status: "DONE" }),
      task({ id: "t2", milestoneId: "m1", status: "NOT_STARTED", verificationLevel: "OPTIONAL" }),
    ];
    expect(computeMilestoneCompletion({ id: "m1" }, tasks).complete).toBe(true);
  });

  it("is complete when every non-optional task is DONE", () => {
    const tasks = [task({ id: "t1", milestoneId: "m1", status: "DONE" })];
    expect(computeMilestoneCompletion({ id: "m1" }, tasks).complete).toBe(true);
  });
});

describe("computeGateStatus", () => {
  const gate: ScoredLaunchGate = { id: "gate-1", key: "legal", name: "Legal", categoryIds: ["cat-1"] };

  it("is READY when it has no required milestones (nothing to block it)", () => {
    const result = computeGateStatus(gate, [], []);
    expect(result.status).toBe("READY");
  });

  it("is NOT_READY when a required milestone has an outright incomplete task", () => {
    const milestones: ScoredMilestone[] = [{ id: "m1", categoryId: "cat-1", requiredForLaunch: true, weight: 1, taskIds: ["t1"] }];
    const tasks = [task({ id: "t1", milestoneId: "m1", status: "NOT_STARTED" })];
    expect(computeGateStatus(gate, milestones, tasks).status).toBe("NOT_READY");
  });

  it("is NEEDS_CONFIRMATION when every blocking task is only awaiting confirmation", () => {
    const milestones: ScoredMilestone[] = [{ id: "m1", categoryId: "cat-1", requiredForLaunch: true, weight: 1, taskIds: ["t1"] }];
    const tasks = [task({ id: "t1", milestoneId: "m1", status: "NEEDS_CONFIRMATION" })];
    expect(computeGateStatus(gate, milestones, tasks).status).toBe("NEEDS_CONFIRMATION");
  });

  it("optional milestones never block a gate", () => {
    const milestones: ScoredMilestone[] = [{ id: "m1", categoryId: "cat-1", requiredForLaunch: false, weight: 1, taskIds: ["t1"] }];
    const tasks = [task({ id: "t1", milestoneId: "m1", status: "NOT_STARTED" })];
    expect(computeGateStatus(gate, milestones, tasks).status).toBe("READY");
  });

  it("is READY only once every required milestone in its categories is complete", () => {
    const milestones: ScoredMilestone[] = [
      { id: "m1", categoryId: "cat-1", requiredForLaunch: true, weight: 1, taskIds: ["t1"] },
      { id: "m2", categoryId: "cat-1", requiredForLaunch: true, weight: 1, taskIds: ["t2"] },
    ];
    const tasks = [task({ id: "t1", milestoneId: "m1", status: "DONE" }), task({ id: "t2", milestoneId: "m2", status: "DONE" })];
    expect(computeGateStatus(gate, milestones, tasks).status).toBe("READY");
  });
});

describe("isCompanyReady", () => {
  it("requires every gate READY and no unresolved critical blocker", () => {
    expect(isCompanyReady([{ status: "READY", blockingTaskIds: [] }], false)).toBe(true);
    expect(isCompanyReady([{ status: "READY", blockingTaskIds: [] }], true)).toBe(false);
    expect(isCompanyReady([{ status: "READY", blockingTaskIds: [] }, { status: "NOT_READY", blockingTaskIds: [] }], false)).toBe(false);
  });

  it("is never ready with zero gates configured", () => {
    expect(isCompanyReady([], false)).toBe(false);
  });
});
