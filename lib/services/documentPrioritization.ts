import type { DocumentLifecycleStatus, ScoredDocument } from "@/lib/types";
import { documentWeight, isDocumentCountable, isDocumentOptional } from "@/lib/services/documentGovernance";

/** States where "go draft/redo this" is the actual next action — not review, not signature. */
const ACTIONABLE_STATES: ReadonlySet<DocumentLifecycleStatus> = new Set([
  "NOT_STARTED",
  "DRAFT_REQUIRED",
  "DRAFTING",
  "CHANGES_REQUIRED",
]);

export interface DocumentPriorityResult {
  documentId: string;
  score: number;
  reason: string;
}

/**
 * "Documents To Produce Next" (brief §40) — mirrors prioritization.ts's Next-3 engine but for
 * documents: only documents actually waiting on drafting work are eligible (a document
 * already sent for review or awaiting only a signature isn't "to produce," it's in flight).
 */
export function selectNextDocuments(
  documents: ScoredDocument[],
  opts?: { now?: Date; limit?: number },
): DocumentPriorityResult[] {
  const now = opts?.now ?? new Date();
  const limit = opts?.limit ?? 5;

  const eligible = documents.filter(
    (d) => isDocumentCountable(d) && !isDocumentOptional(d) && ACTIONABLE_STATES.has(d.lifecycleStatus),
  );

  const scored = eligible.map((d) => {
    let score = documentWeight(d.priority) * 10;
    const reasons: string[] = [];

    if (d.requiredForLaunch) {
      score += 20;
      reasons.push("Required for launch");
    }
    if (d.priority === "P0") reasons.push("P0 priority");

    const ageDays = Math.max(0, Math.floor((now.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
    score += Math.min(ageDays, 60) * 0.1;

    if (d.lifecycleStatus === "CHANGES_REQUIRED") {
      score += 8;
      reasons.push("Changes requested — needs rework");
    }

    return { documentId: d.id, score, reason: reasons[0] ?? "Not started yet" };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}
