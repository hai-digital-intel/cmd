import { describe, it, expect } from "vitest";
import { computeProjectedReadyDate, explainDateShift } from "@/lib/services/timeline";
import type { ScoredTask } from "@/lib/types";

function task(overrides: Partial<ScoredTask> & Pick<ScoredTask, "id">): ScoredTask {
  return {
    title: overrides.id,
    status: "NOT_STARTED",
    effectiveWeight: 1,
    requiredForLaunch: true,
    verificationLevel: "RECOMMENDED",
    categoryId: "cat-1",
    categoryKey: "cat-1",
    milestoneId: "ms-1",
    estimatedMinutes: 60,
    dueDate: null,
    externalWaitUntil: null,
    priorityOverride: null,
    createdAt: new Date("2026-01-01"),
    dependsOnIds: [],
    unlockCount: 0,
    ...overrides,
  };
}

describe("computeProjectedReadyDate", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("returns today when there is no remaining critical-path work", () => {
    const done = task({ id: "done", status: "DONE" });
    const result = computeProjectedReadyDate([done], { now, criticalPathIds: new Set(["done"]) });
    expect(result.projectedReadyDate.toDateString()).toBe(now.toDateString());
  });

  it("pushes the date out based on remaining estimated effort", () => {
    const t = task({ id: "t1", estimatedMinutes: 240 });
    const result = computeProjectedReadyDate([t], { now, minutesPerDay: 120, criticalPathIds: new Set(["t1"]) });
    expect(result.workMinutesRemaining).toBe(240);
    expect(result.projectedReadyDate.getTime()).toBeGreaterThan(now.getTime());
  });

  it("is pushed further out by an external wait date beyond the work estimate", () => {
    const farFuture = new Date("2026-06-01T00:00:00Z");
    const t = task({ id: "t1", status: "WAITING_EXTERNAL", externalWaitUntil: farFuture, estimatedMinutes: 30 });
    const result = computeProjectedReadyDate([t], { now, criticalPathIds: new Set(["t1"]) });
    expect(result.projectedReadyDate.getTime()).toBe(farFuture.getTime());
  });

  it("ignores tasks outside the critical path", () => {
    const critical = task({ id: "critical", status: "DONE" });
    const noise = task({ id: "noise", estimatedMinutes: 10000 });
    const result = computeProjectedReadyDate([critical, noise], { now, criticalPathIds: new Set(["critical"]) });
    expect(result.workMinutesRemaining).toBe(0);
  });
});

describe("explainDateShift", () => {
  it("returns null when there is no previous date to compare", () => {
    expect(explainDateShift(null, new Date(), "reason")).toBeNull();
  });

  it("returns null when the date hasn't actually moved", () => {
    const d = new Date("2026-01-01");
    expect(explainDateShift(d, new Date("2026-01-01"), "reason")).toBeNull();
  });

  it("describes a shift with the given reason", () => {
    const result = explainDateShift(new Date("2026-01-01"), new Date("2026-01-05"), "banking remains externally pending");
    expect(result).toContain("banking remains externally pending");
  });
});
