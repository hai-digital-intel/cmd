import type { DocumentListItem } from "@/lib/documentView";
import { humanizeEnum, lifecycleStatusLabel, professionalReviewTypeLabel, signatureStatusLabel } from "@/lib/documentFormatting";

export const EXPORT_KINDS = ["register", "launch-pack", "review-queue", "signature-queue", "renewals"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

export interface ExportTable {
  columns: string[];
  rows: string[][];
}

const RETIRED_STATES = new Set(["ACTIVE", "SIGNED", "ARCHIVED", "SUPERSEDED"]);

function isoDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

const REGISTER_COLUMNS = [
  "Name",
  "Folder",
  "Subcategory",
  "Priority",
  "Requirement level",
  "Status",
  "Applicability",
  "Applies when",
  "Launch pack",
  "Launch gate",
  "Owner",
  "Professional review",
  "Reviewer type",
  "Reviewer",
  "Signature status",
  "Signatories",
  "Version",
  "Expiry date",
  "Review due",
  "Renewal reminder",
  "Notes",
];

function registerRow(d: DocumentListItem): string[] {
  return [
    d.name,
    d.categoryLabel,
    d.subcategory ?? "",
    d.priority,
    humanizeEnum(d.requirementLevel),
    lifecycleStatusLabel(d.lifecycleStatus),
    humanizeEnum(d.applicabilityStatus),
    d.triggerCondition ?? "",
    d.requiredForLaunch ? "Yes" : "No",
    d.launchGateName ?? "",
    d.ownerName ?? "",
    d.requiresProfessionalReview ? "Yes" : "No",
    d.requiresProfessionalReview ? professionalReviewTypeLabel(d.professionalReviewType) : "",
    d.reviewerName ?? "",
    d.requiresSignature ? signatureStatusLabel(d.signatureStatus) : "",
    d.signatories.map((s) => `${s.personName} (${s.signed ? "signed" : "not signed"})`).join("; "),
    d.version ?? "",
    isoDate(d.expiryDate),
    isoDate(d.reviewDueDate),
    isoDate(d.renewalReminderDate),
    d.notes ?? "",
  ];
}

export function buildExportTable(kind: ExportKind, documents: DocumentListItem[], now: Date = new Date()): ExportTable {
  if (kind === "renewals") {
    const entries: { doc: DocumentListItem; label: string; date: Date }[] = [];
    for (const d of documents) {
      if (d.expiryDate) entries.push({ doc: d, label: "Expires", date: d.expiryDate });
      if (d.reviewDueDate) entries.push({ doc: d, label: "Review due", date: d.reviewDueDate });
      if (d.renewalReminderDate) entries.push({ doc: d, label: "Renewal reminder", date: d.renewalReminderDate });
    }
    entries.sort((a, b) => a.date.getTime() - b.date.getTime());
    return {
      columns: ["Name", "Folder", "Date type", "Date", "Days remaining", "Status"],
      rows: entries.map((e) => [
        e.doc.name,
        e.doc.categoryLabel,
        e.label,
        isoDate(e.date),
        String(Math.round((e.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
        lifecycleStatusLabel(e.doc.lifecycleStatus),
      ]),
    };
  }

  let selected = documents;
  if (kind === "launch-pack") {
    selected = documents.filter((d) => d.requiredForLaunch);
  } else if (kind === "review-queue") {
    selected = documents.filter(
      (d) => d.requiresProfessionalReview && d.applicabilityStatus !== "NOT_APPLICABLE" && !RETIRED_STATES.has(d.lifecycleStatus),
    );
  } else if (kind === "signature-queue") {
    selected = documents.filter(
      (d) => d.requiresSignature && d.applicabilityStatus !== "NOT_APPLICABLE" && d.signatureStatus !== "SIGNED",
    );
  }

  return { columns: REGISTER_COLUMNS, rows: selected.map(registerRow) };
}

/**
 * Spreadsheet apps execute cells beginning with = + - @ (or a tab/CR) as formulas, and document
 * names/notes are free text — prefixing a single quote makes them inert literals.
 */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string): string {
  const safe = neutralizeFormula(value);
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Leading BOM so Excel reads the file as UTF-8 (document names contain em dashes etc.). */
export function toCsv(table: ExportTable): string {
  const lines = [table.columns, ...table.rows].map((row) => row.map(csvCell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

export function toJsonRecords(table: ExportTable): Record<string, string>[] {
  return table.rows.map((row) => Object.fromEntries(table.columns.map((col, i) => [col, row[i] ?? ""])));
}

export function isExportKind(value: string | null): value is ExportKind {
  return value !== null && (EXPORT_KINDS as readonly string[]).includes(value);
}
