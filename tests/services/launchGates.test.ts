import { describe, it, expect } from "vitest";
import { computeMilestoneCompletion, computeGateStatus, isCompanyReady } from "@/lib/services/launchGates";
import type { ScoredDocument, ScoredLaunchGate, ScoredMilestone, ScoredTask } from "@/lib/types";

function doc(overrides: Partial<ScoredDocument> & Pick<ScoredDocument, "id">): ScoredDocument {
  return {
    name: overrides.id,
    category: "GOVERNANCE",
    priority: "P0",
    requirementLevel: "REQUIRED",
    lifecycleStatus: "NOT_STARTED",
    applicabilityStatus: "APPLICABLE",
    requiredForLaunch: false,
    launchGateId: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

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

  it("is blocked by a required-for-launch document even with zero required milestones", () => {
    const documents = [doc({ id: "d1", launchGateId: "gate-1", requiredForLaunch: true, lifecycleStatus: "DRAFTING" })];
    const result = computeGateStatus(gate, [], [], documents);
    expect(result.status).toBe("NOT_READY");
    expect(result.blockingDocumentIds).toEqual(["d1"]);
  });

  it("is READY once a required document reaches ACTIVE", () => {
    const documents = [doc({ id: "d1", launchGateId: "gate-1", requiredForLaunch: true, lifecycleStatus: "ACTIVE" })];
    expect(computeGateStatus(gate, [], [], documents).status).toBe("READY");
  });

  it("is not blocked by a document pointed at a different gate", () => {
    const documents = [doc({ id: "d1", launchGateId: "some-other-gate", requiredForLaunch: true, lifecycleStatus: "DRAFTING" })];
    expect(computeGateStatus(gate, [], [], documents).status).toBe("READY");
  });

  it("optional (non-required) documents never block a gate", () => {
    const documents = [doc({ id: "d1", launchGateId: "gate-1", requiredForLaunch: false, lifecycleStatus: "NOT_STARTED" })];
    expect(computeGateStatus(gate, [], [], documents).status).toBe("READY");
  });

  it("a TRIGGER_DEPENDENT document never blocks a gate, even if marked requiredForLaunch", () => {
    const documents = [
      doc({ id: "d1", launchGateId: "gate-1", requiredForLaunch: true, applicabilityStatus: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_STARTED" }),
    ];
    expect(computeGateStatus(gate, [], [], documents).status).toBe("READY");
  });

  it("combines task and document blockers — both must clear for READY", () => {
    const milestones: ScoredMilestone[] = [{ id: "m1", categoryId: "cat-1", requiredForLaunch: true, weight: 1, taskIds: ["t1"] }];
    const tasks = [task({ id: "t1", milestoneId: "m1", status: "DONE" })];
    const documents = [doc({ id: "d1", launchGateId: "gate-1", requiredForLaunch: true, lifecycleStatus: "DRAFTING" })];
    const result = computeGateStatus(gate, milestones, tasks, documents);
    expect(result.status).toBe("NOT_READY");
    expect(result.blockingDocumentIds).toEqual(["d1"]);
    expect(result.blockingTaskIds).toEqual([]);
  });
});

describe("isCompanyReady", () => {
  it("requires every gate READY and no unresolved critical blocker", () => {
    expect(isCompanyReady([{ status: "READY", blockingTaskIds: [], blockingDocumentIds: [] }], false)).toBe(true);
    expect(isCompanyReady([{ status: "READY", blockingTaskIds: [], blockingDocumentIds: [] }], true)).toBe(false);
    expect(
      isCompanyReady(
        [
          { status: "READY", blockingTaskIds: [], blockingDocumentIds: [] },
          { status: "NOT_READY", blockingTaskIds: [], blockingDocumentIds: [] },
        ],
        false,
      ),
    ).toBe(false);
  });

  it("is never ready with zero gates configured", () => {
    expect(isCompanyReady([], false)).toBe(false);
  });
});
