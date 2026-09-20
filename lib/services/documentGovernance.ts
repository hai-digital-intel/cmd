import type { DocumentPriority, ScoredDocument, ScoredSignatory, DocumentSignatureStatus } from "@/lib/types";

/**
 * Priority stands in for a document's weight in readiness math, the same way
 * category.weight × milestone.weight × task.weight does for tasks — P0 documents move the
 * needle, a social-media brand guide doesn't. No separate numeric "weight" column exists on
 * Document; deriving it from the authored priority avoids a second number that could drift
 * out of sync with what priority already says.
 */
const PRIORITY_WEIGHT: Record<DocumentPriority, number> = { P0: 3, P1: 1.5, P2: 0.5 };

export function documentWeight(priority: DocumentPriority): number {
  return PRIORITY_WEIGHT[priority];
}

/**
 * Whether a document counts toward readiness math at all. Mirrors the task rule exactly:
 * NOT_APPLICABLE is excluded outright (can't reduce readiness), and TRIGGER_DEPENDENT is
 * excluded until its trigger actually fires — a SaaS EULA sitting unwritten must not make
 * h.ai look less ready today when h.ai doesn't sell SaaS today.
 */
export function isDocumentCountable(doc: Pick<ScoredDocument, "applicabilityStatus" | "requirementLevel">): boolean {
  if (doc.applicabilityStatus === "NOT_APPLICABLE") return false;
  if (doc.applicabilityStatus === "TRIGGER_DEPENDENT") return false;
  if (doc.requirementLevel === "NOT_APPLICABLE") return false;
  if (doc.requirementLevel === "TRIGGER_DEPENDENT") return false;
  return true;
}

/** Only ACTIVE or SIGNED counts as "done" — a completed draft or an approved-but-unsigned
 * agreement is progress, not completion. NEEDS_CONFIRMATION never counts as complete. */
export function isDocumentComplete(doc: Pick<ScoredDocument, "lifecycleStatus">): boolean {
  return doc.lifecycleStatus === "ACTIVE" || doc.lifecycleStatus === "SIGNED";
}

/** Optional documents (by requirement level) never block anything, exactly like Task's OPTIONAL verificationLevel. */
export function isDocumentOptional(doc: Pick<ScoredDocument, "requirementLevel">): boolean {
  return doc.requirementLevel === "OPTIONAL";
}

export interface DocumentReadinessBreakdown {
  completedWeight: number;
  applicableWeight: number;
  score: number;
}

export function computeDocumentReadiness(documents: ScoredDocument[]): DocumentReadinessBreakdown {
  let completed = 0;
  let applicable = 0;
  for (const doc of documents) {
    if (!isDocumentCountable(doc)) continue;
    const w = documentWeight(doc.priority);
    applicable += w;
    if (isDocumentComplete(doc)) completed += w;
  }
  const score = applicable > 0 ? (completed / applicable) * 100 : 0;
  return { completedWeight: completed, applicableWeight: applicable, score };
}

/**
 * Documents that would block a specific launch gate: required-for-launch, pointed at that
 * gate, not optional/not-applicable/trigger-dependent, and not yet complete. Parallel to
 * `computeMilestoneCompletion`'s blockingTaskIds in launchGates.ts.
 */
export function computeBlockingDocumentIds(gateId: string, documents: ScoredDocument[]): string[] {
  return documents
    .filter(
      (d) =>
        d.launchGateId === gateId &&
        d.requiredForLaunch &&
        isDocumentCountable(d) &&
        !isDocumentOptional(d) &&
        !isDocumentComplete(d),
    )
    .map((d) => d.id);
}

/**
 * Signature status is computed from DocumentSignatory rows, never stored — the same rule
 * this codebase already applies to LaunchGate.status, for the same reason: one less place
 * for state to silently drift out of sync with reality.
 */
export function computeSignatureStatus(requiresSignature: boolean, signatories: ScoredSignatory[]): DocumentSignatureStatus {
  if (!requiresSignature) return "NOT_REQUIRED";
  if (signatories.length === 0) return "NOT_READY";
  const signedCount = signatories.filter((s) => s.signed).length;
  if (signedCount === 0) return "READY";
  if (signedCount === signatories.length) return "SIGNED";
  return "PARTIALLY_SIGNED";
}

/** P0 Launch Document Health (brief §59) — READY / AT_RISK / BLOCKED, with the reason. */
export interface LaunchDocumentHealth {
  status: "READY" | "AT_RISK" | "BLOCKED";
  totalLaunchCritical: number;
  completedLaunchCritical: number;
  overdueCount: number;
  reason: string;
}

export function computeLaunchDocumentHealth(documents: ScoredDocument[], now: Date = new Date()): LaunchDocumentHealth {
  const launchCritical = documents.filter((d) => d.requiredForLaunch && isDocumentCountable(d) && !isDocumentOptional(d));
  const completed = launchCritical.filter(isDocumentComplete);
  const incomplete = launchCritical.filter((d) => !isDocumentComplete(d));

  if (launchCritical.length === 0 || incomplete.length === 0) {
    return {
      status: "READY",
      totalLaunchCritical: launchCritical.length,
      completedLaunchCritical: completed.length,
      overdueCount: 0,
      reason: "Every currently-applicable launch-critical document is active or signed.",
    };
  }

  // "Overdue" here means stuck in a stalled state (changes required / needs confirmation)
  // rather than simply "not started yet" — a fresh DRAFT_REQUIRED isn't a red flag on its own.
  const stalled = incomplete.filter((d) => d.lifecycleStatus === "CHANGES_REQUIRED" || d.lifecycleStatus === "NEEDS_CONFIRMATION");
  void now; // reserved for a future overdue-by-date check once review/expiry dates are wired in here

  if (stalled.length > 0) {
    return {
      status: "BLOCKED",
      totalLaunchCritical: launchCritical.length,
      completedLaunchCritical: completed.length,
      overdueCount: stalled.length,
      reason: `${stalled.length} launch-critical document${stalled.length > 1 ? "s are" : " is"} stalled (changes required or needing confirmation).`,
    };
  }

  return {
    status: "AT_RISK",
    totalLaunchCritical: launchCritical.length,
    completedLaunchCritical: completed.length,
    overdueCount: 0,
    reason: `${incomplete.length} launch-critical document${incomplete.length > 1 ? "s" : ""} still in progress (drafting, review, or awaiting signature).`,
  };
}
