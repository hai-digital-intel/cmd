import { describe, it, expect } from "vitest";
import {
  isDocumentCountable,
  isDocumentComplete,
  isDocumentOptional,
  computeDocumentReadiness,
  computeBlockingDocumentIds,
  computeSignatureStatus,
  computeLaunchDocumentHealth,
  documentWeight,
} from "@/lib/services/documentGovernance";
import type { ScoredDocument } from "@/lib/types";

function doc(overrides: Partial<ScoredDocument> & Pick<ScoredDocument, "id">): ScoredDocument {
  return {
    name: overrides.id,
    category: "GOVERNANCE",
    priority: "P1",
    requirementLevel: "REQUIRED",
    lifecycleStatus: "NOT_STARTED",
    applicabilityStatus: "APPLICABLE",
    requiredForLaunch: false,
    launchGateId: null,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("isDocumentCountable", () => {
  it("excludes NOT_APPLICABLE applicability", () => {
    expect(isDocumentCountable(doc({ id: "d1", applicabilityStatus: "NOT_APPLICABLE" }))).toBe(false);
  });

  it("excludes TRIGGER_DEPENDENT applicability — a SaaS EULA before h.ai sells SaaS", () => {
    expect(isDocumentCountable(doc({ id: "d1", applicabilityStatus: "TRIGGER_DEPENDENT" }))).toBe(false);
  });

  it("excludes TRIGGER_DEPENDENT requirement level even if applicability is APPLICABLE", () => {
    expect(isDocumentCountable(doc({ id: "d1", requirementLevel: "TRIGGER_DEPENDENT" }))).toBe(false);
  });

  it("counts a plain APPLICABLE/REQUIRED document", () => {
    expect(isDocumentCountable(doc({ id: "d1" }))).toBe(true);
  });

  it("counts NEEDS_CONFIRMATION applicability (uncertain, not excluded)", () => {
    expect(isDocumentCountable(doc({ id: "d1", applicabilityStatus: "NEEDS_CONFIRMATION" }))).toBe(true);
  });
});

describe("isDocumentComplete", () => {
  it("only ACTIVE and SIGNED count as complete", () => {
    expect(isDocumentComplete(doc({ id: "d1", lifecycleStatus: "ACTIVE" }))).toBe(true);
    expect(isDocumentComplete(doc({ id: "d1", lifecycleStatus: "SIGNED" }))).toBe(true);
    expect(isDocumentComplete(doc({ id: "d1", lifecycleStatus: "DRAFT_COMPLETE" }))).toBe(false);
    expect(isDocumentComplete(doc({ id: "d1", lifecycleStatus: "READY_FOR_SIGNATURE" }))).toBe(false);
  });

  it("NEEDS_CONFIRMATION never counts as complete", () => {
    expect(isDocumentComplete(doc({ id: "d1", lifecycleStatus: "NEEDS_CONFIRMATION" }))).toBe(false);
  });
});

describe("isDocumentOptional", () => {
  it("flags only OPTIONAL requirement level", () => {
    expect(isDocumentOptional(doc({ id: "d1", requirementLevel: "OPTIONAL" }))).toBe(true);
    expect(isDocumentOptional(doc({ id: "d1", requirementLevel: "RECOMMENDED" }))).toBe(false);
  });
});

describe("documentWeight", () => {
  it("weighs P0 heavier than P1 heavier than P2", () => {
    expect(documentWeight("P0")).toBeGreaterThan(documentWeight("P1"));
    expect(documentWeight("P1")).toBeGreaterThan(documentWeight("P2"));
  });
});

describe("computeDocumentReadiness", () => {
  it("is 0 with nothing countable — never a misleading 100", () => {
    expect(computeDocumentReadiness([]).score).toBe(0);
  });

  it("weighs by priority, not raw count — one active P0 can outweigh several incomplete P2s", () => {
    const documents = [
      doc({ id: "p0", priority: "P0", lifecycleStatus: "ACTIVE" }),
      doc({ id: "p2-a", priority: "P2", lifecycleStatus: "NOT_STARTED" }),
      doc({ id: "p2-b", priority: "P2", lifecycleStatus: "NOT_STARTED" }),
    ];
    expect(computeDocumentReadiness(documents).score).toBeGreaterThan(50);
  });

  it("excludes NOT_APPLICABLE and TRIGGER_DEPENDENT documents from the denominator entirely", () => {
    const documents = [
      doc({ id: "done", priority: "P0", lifecycleStatus: "ACTIVE" }),
      doc({ id: "na", priority: "P0", applicabilityStatus: "NOT_APPLICABLE", lifecycleStatus: "NOT_STARTED" }),
      doc({ id: "trigger", priority: "P0", applicabilityStatus: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_STARTED" }),
    ];
    expect(computeDocumentReadiness(documents).score).toBe(100);
  });

  it("does not calculate readiness from sheer document count", () => {
    const manyLowPriorityIncomplete = Array.from({ length: 20 }, (_, i) =>
      doc({ id: `p2-${i}`, priority: "P2", lifecycleStatus: "NOT_STARTED" }),
    );
    const oneHighPriorityDone = doc({ id: "p0", priority: "P0", lifecycleStatus: "ACTIVE" });
    const result = computeDocumentReadiness([oneHighPriorityDone, ...manyLowPriorityIncomplete]);
    // 20 P2s (weight 0.5 each = 10) outweigh one P0 (weight 3) by raw count, but the point is
    // the score reflects weighted completion, not "1 of 21 done" (~4.8%).
    expect(result.score).toBeCloseTo((3 / 13) * 100, 1);
  });
});

describe("computeBlockingDocumentIds", () => {
  it("blocks only documents required-for-launch and pointed at this exact gate", () => {
    const documents = [
      doc({ id: "d1", launchGateId: "gate-a", requiredForLaunch: true, lifecycleStatus: "DRAFTING" }),
      doc({ id: "d2", launchGateId: "gate-b", requiredForLaunch: true, lifecycleStatus: "DRAFTING" }),
      doc({ id: "d3", launchGateId: "gate-a", requiredForLaunch: false, lifecycleStatus: "DRAFTING" }),
    ];
    expect(computeBlockingDocumentIds("gate-a", documents)).toEqual(["d1"]);
  });

  it("does not block once the document is ACTIVE or SIGNED", () => {
    const documents = [doc({ id: "d1", launchGateId: "gate-a", requiredForLaunch: true, lifecycleStatus: "SIGNED" })];
    expect(computeBlockingDocumentIds("gate-a", documents)).toEqual([]);
  });
});

describe("computeSignatureStatus", () => {
  it("is NOT_REQUIRED when the document doesn't need signatures", () => {
    expect(computeSignatureStatus(false, [])).toBe("NOT_REQUIRED");
  });

  it("is NOT_READY when signatures are required but no signatories exist yet", () => {
    expect(computeSignatureStatus(true, [])).toBe("NOT_READY");
  });

  it("is READY when signatories exist but none have signed", () => {
    expect(computeSignatureStatus(true, [{ personId: "haya", signed: false }])).toBe("READY");
  });

  it("is PARTIALLY_SIGNED with a mix, and SIGNED only once everyone has signed", () => {
    expect(
      computeSignatureStatus(true, [
        { personId: "haya", signed: true },
        { personId: "mohammad", signed: false },
      ]),
    ).toBe("PARTIALLY_SIGNED");
    expect(
      computeSignatureStatus(true, [
        { personId: "haya", signed: true },
        { personId: "mohammad", signed: true },
      ]),
    ).toBe("SIGNED");
  });
});

describe("computeLaunchDocumentHealth", () => {
  it("is READY when every launch-critical document is complete", () => {
    const documents = [doc({ id: "d1", requiredForLaunch: true, lifecycleStatus: "ACTIVE" })];
    expect(computeLaunchDocumentHealth(documents).status).toBe("READY");
  });

  it("is READY with zero launch-critical documents (nothing to block it)", () => {
    expect(computeLaunchDocumentHealth([]).status).toBe("READY");
  });

  it("is AT_RISK when incomplete documents are still progressing normally", () => {
    const documents = [doc({ id: "d1", requiredForLaunch: true, lifecycleStatus: "DRAFTING" })];
    expect(computeLaunchDocumentHealth(documents).status).toBe("AT_RISK");
  });

  it("is BLOCKED when a launch-critical document is stalled on changes required", () => {
    const documents = [doc({ id: "d1", requiredForLaunch: true, lifecycleStatus: "CHANGES_REQUIRED" })];
    expect(computeLaunchDocumentHealth(documents).status).toBe("BLOCKED");
  });

  it("ignores non-launch-critical and trigger-dependent documents entirely", () => {
    const documents = [
      doc({ id: "critical", requiredForLaunch: true, lifecycleStatus: "ACTIVE" }),
      doc({ id: "future", requiredForLaunch: true, applicabilityStatus: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_STARTED" }),
      doc({ id: "optional", requiredForLaunch: true, requirementLevel: "OPTIONAL", lifecycleStatus: "NOT_STARTED" }),
    ];
    expect(computeLaunchDocumentHealth(documents).status).toBe("READY");
  });
});
