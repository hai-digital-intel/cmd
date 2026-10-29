import { describe, it, expect } from "vitest";
import { buildExportTable, toCsv, toJsonRecords, isExportKind } from "@/lib/services/documentExport";
import type { DocumentListItem } from "@/lib/documentView";

function doc(overrides: Partial<DocumentListItem> & Pick<DocumentListItem, "id">): DocumentListItem {
  return {
    name: overrides.id,
    description: null,
    category: "GOVERNANCE",
    categoryLabel: "Shareholder & Founder Governance",
    subcategory: null,
    priority: "P1",
    requirementLevel: "REQUIRED",
    lifecycleStatus: "NOT_STARTED",
    applicabilityStatus: "APPLICABLE",
    triggerCondition: null,
    requiredForLaunch: false,
    launchGateName: null,
    requiresProfessionalReview: false,
    professionalReviewType: "NONE",
    reviewerName: null,
    reviewSentDate: null,
    reviewDueDate: null,
    requiresSignature: false,
    signatureStatus: "NOT_REQUIRED",
    signatories: [],
    ownerId: null,
    ownerName: null,
    relatedTaskId: null,
    relatedTaskTitle: null,
    version: null,
    filePath: null,
    originalFileName: null,
    externalUrl: null,
    expiryDate: null,
    renewalReminderDate: null,
    signedDate: null,
    effectiveDate: null,
    notes: null,
    legalDisclaimer: false,
    createdAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("buildExportTable", () => {
  it("register exports every document", () => {
    const table = buildExportTable("register", [doc({ id: "a" }), doc({ id: "b" })]);
    expect(table.rows).toHaveLength(2);
  });

  it("prints human-readable enum labels, and leaves version blank when none exists", () => {
    const row = buildExportTable("register", [doc({ id: "a", requirementLevel: "TRIGGER_DEPENDENT", applicabilityStatus: "NEEDS_CONFIRMATION" })]).rows[0]!;
    expect(row[4]).toBe("Trigger Dependent");
    expect(row[5]).toBe("Not Started");
    expect(row[6]).toBe("Needs Confirmation");
    expect(row[16]).toBe("");
  });

  it("launch-pack keeps only launch-critical documents", () => {
    const table = buildExportTable("launch-pack", [doc({ id: "a", requiredForLaunch: true }), doc({ id: "b" })]);
    expect(table.rows.map((r) => r[0])).toEqual(["a"]);
  });

  it("review-queue excludes already-approved, retired, and not-applicable documents", () => {
    const table = buildExportTable("review-queue", [
      doc({ id: "pending", requiresProfessionalReview: true, lifecycleStatus: "UNDER_PROFESSIONAL_REVIEW" }),
      doc({ id: "done", requiresProfessionalReview: true, lifecycleStatus: "ACTIVE" }),
      doc({ id: "na", requiresProfessionalReview: true, applicabilityStatus: "NOT_APPLICABLE" }),
      doc({ id: "no-review" }),
    ]);
    expect(table.rows.map((r) => r[0])).toEqual(["pending"]);
  });

  it("signature-queue excludes fully signed documents", () => {
    const table = buildExportTable("signature-queue", [
      doc({ id: "open", requiresSignature: true, signatureStatus: "PARTIALLY_SIGNED" }),
      doc({ id: "signed", requiresSignature: true, signatureStatus: "SIGNED" }),
    ]);
    expect(table.rows.map((r) => r[0])).toEqual(["open"]);
  });

  it("renewals keeps expiry, review-due, and reminder as separate dated rows, soonest first", () => {
    const now = new Date("2026-06-01");
    const table = buildExportTable(
      "renewals",
      [
        doc({
          id: "licence",
          expiryDate: new Date("2026-12-01"),
          reviewDueDate: new Date("2026-07-01"),
          renewalReminderDate: new Date("2026-11-01"),
        }),
      ],
      now,
    );
    expect(table.rows.map((r) => r[2])).toEqual(["Review due", "Renewal reminder", "Expires"]);
    expect(table.rows[0]![4]).toBe("30");
  });
});

describe("toCsv", () => {
  it("quotes cells containing commas, quotes, and newlines", () => {
    const csv = toCsv({ columns: ["Name"], rows: [['He said "hi", twice'], ["line1\nline2"]] });
    expect(csv).toContain('"He said ""hi"", twice"');
    expect(csv).toContain('"line1\nline2"');
  });

  it("neutralizes spreadsheet formula injection", () => {
    const csv = toCsv({ columns: ["Name"], rows: [["=HYPERLINK(\"http://evil\")"], ["+cmd"], ["-1+2"], ["@SUM(A1)"]] });
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain("'+cmd");
    expect(csv).toContain("'-1+2");
    expect(csv).toContain("'@SUM(A1)");
  });

  it("leaves ordinary text and ISO dates untouched", () => {
    const csv = toCsv({ columns: ["Name", "Date"], rows: [["Shareholders Agreement", "2026-09-20"]] });
    expect(csv).toContain("Shareholders Agreement,2026-09-20");
  });
});

describe("toJsonRecords / isExportKind", () => {
  it("keys each row by column name", () => {
    expect(toJsonRecords({ columns: ["A", "B"], rows: [["1", "2"]] })).toEqual([{ A: "1", B: "2" }]);
  });

  it("only accepts known export kinds", () => {
    expect(isExportKind("register")).toBe(true);
    expect(isExportKind("../etc/passwd")).toBe(false);
    expect(isExportKind(null)).toBe(false);
  });
});
