import type { LaunchGateStatus, ScoredDocument, ScoredLaunchGate, ScoredMilestone, ScoredTask } from "@/lib/types";
import { computeBlockingDocumentIds } from "@/lib/services/documentGovernance";

export interface MilestoneCompletion {
  milestoneId: string;
  complete: boolean;
  blockingTaskIds: string[];
}

/**
 * A milestone "meets its criteria" when every non-optional, applicable task under it is
 * DONE. Optional tasks (verificationLevel OPTIONAL) and NOT_APPLICABLE tasks never block it.
 */
export function computeMilestoneCompletion(
  milestone: Pick<ScoredMilestone, "id">,
  tasks: ScoredTask[],
): MilestoneCompletion {
  const relevant = tasks.filter(
    (t) =>
      t.milestoneId === milestone.id &&
      t.verificationLevel !== "OPTIONAL" &&
      t.status !== "NOT_APPLICABLE",
  );
  const blocking = relevant.filter((t) => t.status !== "DONE");
  return {
    milestoneId: milestone.id,
    complete: blocking.length === 0,
    blockingTaskIds: blocking.map((t) => t.id),
  };
}

export interface GateEvaluation {
  status: LaunchGateStatus;
  blockingTaskIds: string[];
  blockingDocumentIds: string[];
}

/**
 * A gate is READY only when every requiredForLaunch milestone in its categories is complete
 * *and* every requiredForLaunch document pointed at it is complete. Optional milestones/
 * documents never block a gate. If everything blocking is only NEEDS_CONFIRMATION (task
 * status) or the document equivalent — nothing outright incomplete/blocked — the gate is
 * reported as NEEDS_CONFIRMATION rather than a flat NOT_READY, since the remaining work is
 * "go verify a fact," not "go do work."
 *
 * `documents` is optional and defaults to `[]` so every existing caller/test that doesn't
 * know about documents keeps working exactly as before — additive, not a breaking change.
 */
export function computeGateStatus(
  gate: ScoredLaunchGate,
  milestones: ScoredMilestone[],
  tasks: ScoredTask[],
  documents: ScoredDocument[] = [],
): GateEvaluation {
  const gateMilestones = milestones.filter(
    (m) => gate.categoryIds.includes(m.categoryId) && m.requiredForLaunch,
  );

  const blockingTaskIds = gateMilestones
    .map((m) => computeMilestoneCompletion(m, tasks))
    .flatMap((c) => c.blockingTaskIds);
  const blockingDocumentIds = computeBlockingDocumentIds(gate.id, documents);

  if (blockingTaskIds.length === 0 && blockingDocumentIds.length === 0) {
    return { status: "READY", blockingTaskIds, blockingDocumentIds };
  }

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const blockingTasks = blockingTaskIds.map((id) => byId.get(id)).filter((t): t is ScoredTask => !!t);
  const docsById = new Map(documents.map((d) => [d.id, d]));
  const blockingDocs = blockingDocumentIds.map((id) => docsById.get(id)).filter((d): d is ScoredDocument => !!d);

  const allTasksNeedConfirmation = blockingTasks.every((t) => t.status === "NEEDS_CONFIRMATION");
  const allDocsNeedConfirmation = blockingDocs.every(
    (d) => d.applicabilityStatus === "NEEDS_CONFIRMATION" || d.requirementLevel === "NEEDS_VERIFICATION" || d.lifecycleStatus === "NEEDS_CONFIRMATION",
  );

  return {
    status: allTasksNeedConfirmation && allDocsNeedConfirmation ? "NEEDS_CONFIRMATION" : "NOT_READY",
    blockingTaskIds,
    blockingDocumentIds,
  };
}

export function computeAllGateStatuses(
  gates: ScoredLaunchGate[],
  milestones: ScoredMilestone[],
  tasks: ScoredTask[],
  documents: ScoredDocument[] = [],
): Record<string, GateEvaluation> {
  const result: Record<string, GateEvaluation> = {};
  for (const gate of gates) {
    result[gate.key] = computeGateStatus(gate, milestones, tasks, documents);
  }
  return result;
}

/**
 * "h.ai is operationally ready" requires every launch gate READY *and* no unresolved
 * critical blocker outstanding — a gate can look READY on paper while a founder-level
 * blocker (e.g. an unsigned agreement) still needs resolving.
 */
export function isCompanyReady(
  gateEvaluations: GateEvaluation[],
  hasUnresolvedCriticalBlocker: boolean,
): boolean {
  if (gateEvaluations.length === 0) return false;
  return gateEvaluations.every((g) => g.status === "READY") && !hasUnresolvedCriticalBlocker;
}
