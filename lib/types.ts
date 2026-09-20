/**
 * Shared domain types for the scoring/services layer.
 *
 * These mirror the Prisma enums by string value but are declared independently so that
 * lib/services/* stays pure and testable with plain object literals — no Prisma Client
 * import, no database, no generated-code build step required to run `vitest`.
 */

export const TASK_STATUSES = [
  "NOT_STARTED",
  "NEXT",
  "IN_PROGRESS",
  "WAITING_EXTERNAL",
  "BLOCKED",
  "NEEDS_REVIEW",
  "DONE",
  "NOT_APPLICABLE",
  "NEEDS_CONFIRMATION",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const VERIFICATION_LEVELS = [
  "REQUIRED",
  "RECOMMENDED",
  "OPTIONAL",
  "NEEDS_VERIFICATION",
  "NOT_APPLICABLE",
] as const;
export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];

export const BLOCKER_TYPES = [
  "FOUNDER",
  "PARTNER",
  "AUTHORITY",
  "BANK",
  "ACCOUNTANT",
  "SUPPLIER",
  "LEGAL",
  "FINANCIAL",
  "TECHNICAL",
  "UNKNOWN",
] as const;
export type BlockerType = (typeof BLOCKER_TYPES)[number];

export const COST_TYPES = ["ONE_TIME", "RECURRING"] as const;
export type CostType = (typeof COST_TYPES)[number];

export const COST_STATUSES = ["PLANNED", "COMMITTED", "PAID", "UNKNOWN"] as const;
export type CostStatus = (typeof COST_STATUSES)[number];

export const LAUNCH_GATE_STATUSES = ["READY", "NOT_READY", "NEEDS_CONFIRMATION"] as const;
export type LaunchGateStatus = (typeof LAUNCH_GATE_STATUSES)[number];

/** A task flattened for scoring: prerequisite ids resolved, weights pre-multiplied. */
export interface ScoredTask {
  id: string;
  title: string;
  status: TaskStatus;
  /** category.weight * milestone.weight * task.weight — used by readiness math. */
  effectiveWeight: number;
  requiredForLaunch: boolean;
  verificationLevel: VerificationLevel;
  categoryId: string;
  categoryKey: string;
  milestoneId: string;
  estimatedMinutes: number | null;
  dueDate: Date | null;
  externalWaitUntil: Date | null;
  priorityOverride: number | null;
  createdAt: Date;
  /** ids of tasks that must be DONE/NOT_APPLICABLE before this one is actionable. */
  dependsOnIds: string[];
  /** count of tasks that directly depend on this one — precomputed for prioritization. */
  unlockCount: number;
}

export interface ScoredMilestone {
  id: string;
  categoryId: string;
  requiredForLaunch: boolean;
  weight: number;
  taskIds: string[];
}

export interface ScoredCategory {
  id: string;
  key: string;
  name: string;
  weight: number;
  launchGateId: string | null;
}

export interface ScoredLaunchGate {
  id: string;
  key: string;
  name: string;
  categoryIds: string[];
}

// ---------------------------------------------------------------------------
// Document Register & Governance
// ---------------------------------------------------------------------------

export const DOCUMENT_PRIORITIES = ["P0", "P1", "P2"] as const;
export type DocumentPriority = (typeof DOCUMENT_PRIORITIES)[number];

export const DOCUMENT_REQUIREMENT_LEVELS = [
  "REQUIRED",
  "RECOMMENDED",
  "OPTIONAL",
  "NEEDS_VERIFICATION",
  "TRIGGER_DEPENDENT",
  "NOT_APPLICABLE",
] as const;
export type DocumentRequirementLevel = (typeof DOCUMENT_REQUIREMENT_LEVELS)[number];

export const DOCUMENT_SOURCE_TYPES = [
  "AUTHORITY_ISSUED",
  "COMPANY_CREATED",
  "PROFESSIONAL_CREATED",
  "CLIENT_TEMPLATE",
  "VENDOR_ISSUED",
  "BANK_ISSUED",
  "OTHER",
] as const;
export type DocumentSourceType = (typeof DOCUMENT_SOURCE_TYPES)[number];

export const DOCUMENT_LIFECYCLE_STATUSES = [
  "NOT_STARTED",
  "DRAFT_REQUIRED",
  "DRAFTING",
  "DRAFT_COMPLETE",
  "UNDER_INTERNAL_REVIEW",
  "PROFESSIONAL_REVIEW_REQUIRED",
  "UNDER_PROFESSIONAL_REVIEW",
  "CHANGES_REQUIRED",
  "READY_FOR_SIGNATURE",
  "PARTIALLY_SIGNED",
  "SIGNED",
  "ACTIVE",
  "SUPERSEDED",
  "EXPIRED",
  "ARCHIVED",
  "NEEDS_CONFIRMATION",
  "NOT_APPLICABLE",
] as const;
export type DocumentLifecycleStatus = (typeof DOCUMENT_LIFECYCLE_STATUSES)[number];

export const PROFESSIONAL_REVIEW_TYPES = [
  "NONE",
  "LAWYER",
  "ACCOUNTANT",
  "TAX_ADVISER",
  "AUDITOR",
  "PRIVACY_SPECIALIST",
  "CYBERSECURITY_SPECIALIST",
  "INSURANCE_BROKER",
  "HR_EMPLOYMENT_SPECIALIST",
  "IP_COUNSEL",
  "OTHER",
] as const;
export type ProfessionalReviewType = (typeof PROFESSIONAL_REVIEW_TYPES)[number];

export const DOCUMENT_APPLICABILITY_STATUSES = ["APPLICABLE", "NOT_APPLICABLE", "NEEDS_CONFIRMATION", "TRIGGER_DEPENDENT"] as const;
export type DocumentApplicabilityStatus = (typeof DOCUMENT_APPLICABILITY_STATUSES)[number];

/** Computed, never stored — see lib/services/documentGovernance.ts. */
export const DOCUMENT_SIGNATURE_STATUSES = ["NOT_REQUIRED", "NOT_READY", "READY", "PARTIALLY_SIGNED", "SIGNED"] as const;
export type DocumentSignatureStatus = (typeof DOCUMENT_SIGNATURE_STATUSES)[number];

/** A document flattened for scoring — parallel to ScoredTask. */
export interface ScoredDocument {
  id: string;
  name: string;
  category: string;
  priority: DocumentPriority;
  requirementLevel: DocumentRequirementLevel;
  lifecycleStatus: DocumentLifecycleStatus;
  applicabilityStatus: DocumentApplicabilityStatus;
  requiredForLaunch: boolean;
  launchGateId: string | null;
  createdAt: Date;
}

export interface ScoredSignatory {
  personId: string;
  signed: boolean;
}
