import { describe, it, expect } from "vitest";
import { selectNextDocuments } from "@/lib/services/documentPrioritization";
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

describe("selectNextDocuments", () => {
  const now = new Date("2026-01-10");

  it("excludes documents already past drafting (in review, signed, active)", () => {
    const documents = [
      doc({ id: "in-review", lifecycleStatus: "UNDER_PROFESSIONAL_REVIEW" }),
      doc({ id: "signed", lifecycleStatus: "SIGNED" }),
      doc({ id: "active", lifecycleStatus: "ACTIVE" }),
      doc({ id: "ready-for-sig", lifecycleStatus: "READY_FOR_SIGNATURE" }),
    ];
    expect(selectNextDocuments(documents, { now })).toHaveLength(0);
  });

  it("includes documents that need drafting or rework", () => {
    const documents = [
      doc({ id: "not-started", lifecycleStatus: "NOT_STARTED" }),
      doc({ id: "changes-required", lifecycleStatus: "CHANGES_REQUIRED" }),
    ];
    const result = selectNextDocuments(documents, { now });
    expect(result.map((r) => r.documentId).sort()).toEqual(["changes-required", "not-started"]);
  });

  it("excludes trigger-dependent and not-applicable documents", () => {
    const documents = [
      doc({ id: "trigger", applicabilityStatus: "TRIGGER_DEPENDENT" }),
      doc({ id: "na", applicabilityStatus: "NOT_APPLICABLE" }),
      doc({ id: "optional", requirementLevel: "OPTIONAL" }),
    ];
    expect(selectNextDocuments(documents, { now })).toHaveLength(0);
  });

  it("ranks required-for-launch P0 documents above ordinary ones", () => {
    const documents = [
      doc({ id: "ordinary", priority: "P2", requiredForLaunch: false }),
      doc({ id: "critical", priority: "P0", requiredForLaunch: true }),
    ];
    const result = selectNextDocuments(documents, { now });
    expect(result[0]!.documentId).toBe("critical");
  });

  it("respects the limit", () => {
    const documents = Array.from({ length: 10 }, (_, i) => doc({ id: `d${i}` }));
    expect(selectNextDocuments(documents, { now, limit: 3 })).toHaveLength(3);
  });
});
