import type {
  DocumentLifecycleStatus,
  DocumentPriority,
  DocumentApplicabilityStatus,
  DocumentSignatureStatus,
  ProfessionalReviewType,
} from "@/lib/types";

type BadgeVariant = "default" | "outline" | "success" | "progress" | "waiting" | "blocked" | "confirm" | "na";

/** Plain English label — the enum values are shouting-case for the schema, not for people. */
export function humanizeEnum(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

export function lifecycleStatusLabel(status: DocumentLifecycleStatus): string {
  return humanizeEnum(status);
}

export const LIFECYCLE_STATUS_VARIANT: Record<DocumentLifecycleStatus, BadgeVariant> = {
  NOT_STARTED: "default",
  DRAFT_REQUIRED: "default",
  DRAFTING: "progress",
  DRAFT_COMPLETE: "progress",
  UNDER_INTERNAL_REVIEW: "progress",
  PROFESSIONAL_REVIEW_REQUIRED: "waiting",
  UNDER_PROFESSIONAL_REVIEW: "waiting",
  CHANGES_REQUIRED: "blocked",
  READY_FOR_SIGNATURE: "progress",
  PARTIALLY_SIGNED: "progress",
  SIGNED: "success",
  ACTIVE: "success",
  SUPERSEDED: "na",
  EXPIRED: "blocked",
  ARCHIVED: "na",
  NEEDS_CONFIRMATION: "confirm",
  NOT_APPLICABLE: "na",
};

export const PRIORITY_VARIANT: Record<DocumentPriority, BadgeVariant> = {
  P0: "blocked",
  P1: "waiting",
  P2: "outline",
};

export const APPLICABILITY_VARIANT: Record<DocumentApplicabilityStatus, BadgeVariant> = {
  APPLICABLE: "default",
  NOT_APPLICABLE: "na",
  NEEDS_CONFIRMATION: "confirm",
  TRIGGER_DEPENDENT: "na",
};

export function signatureStatusLabel(status: DocumentSignatureStatus): string {
  switch (status) {
    case "NOT_REQUIRED": return "No signature required";
    case "NOT_READY": return "No signatories yet";
    case "READY": return "Ready to sign";
    case "PARTIALLY_SIGNED": return "Partially signed";
    case "SIGNED": return "Fully signed";
  }
}

export const SIGNATURE_STATUS_VARIANT: Record<DocumentSignatureStatus, BadgeVariant> = {
  NOT_REQUIRED: "na",
  NOT_READY: "default",
  READY: "waiting",
  PARTIALLY_SIGNED: "progress",
  SIGNED: "success",
};

export function professionalReviewTypeLabel(type: ProfessionalReviewType): string {
  switch (type) {
    case "NONE": return "None";
    case "LAWYER": return "Lawyer";
    case "ACCOUNTANT": return "Accountant";
    case "TAX_ADVISER": return "Tax adviser";
    case "AUDITOR": return "Auditor";
    case "PRIVACY_SPECIALIST": return "Privacy specialist";
    case "CYBERSECURITY_SPECIALIST": return "Cybersecurity specialist";
    case "INSURANCE_BROKER": return "Insurance broker";
    case "HR_EMPLOYMENT_SPECIALIST": return "HR / employment specialist";
    case "IP_COUNSEL": return "IP counsel";
    case "OTHER": return "Other professional";
  }
}

/** States where the document is genuinely done sitting in someone's inbox waiting on drafting. */
export const ACTIONABLE_DRAFTING_STATES: ReadonlySet<DocumentLifecycleStatus> = new Set([
  "NOT_STARTED",
  "DRAFT_REQUIRED",
  "DRAFTING",
  "CHANGES_REQUIRED",
]);
