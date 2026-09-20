import type { LaunchGateStatus, ScoredLaunchGate, ScoredMilestone, ScoredTask } from "@/lib/types";

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
}

/**
 * A gate is READY only when every requiredForLaunch milestone in its categories is complete.
 * Optional milestones never block a gate. If every blocking task is only NEEDS_CONFIRMATION
 * (nothing outright incomplete/blocked), the gate is reported as NEEDS_CONFIRMATION rather
 * than a flat NOT_READY, since the remaining work is "go verify a fact," not "go do work."
 */
export function computeGateStatus(
  gate: ScoredLaunchGate,
  milestones: ScoredMilestone[],
  tasks: ScoredTask[],
): GateEvaluation {
  const gateMilestones = milestones.filter(
    (m) => gate.categoryIds.includes(m.categoryId) && m.requiredForLaunch,
  );
  if (gateMilestones.length === 0) {
    return { status: "READY", blockingTaskIds: [] };
  }

  const blockingTaskIds = gateMilestones
    .map((m) => computeMilestoneCompletion(m, tasks))
    .flatMap((c) => c.blockingTaskIds);

  if (blockingTaskIds.length === 0) {
    return { status: "READY", blockingTaskIds };
  }

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const blockingTasks = blockingTaskIds.map((id) => byId.get(id)).filter((t): t is ScoredTask => !!t);
  const allNeedConfirmation = blockingTasks.every((t) => t.status === "NEEDS_CONFIRMATION");

  return {
    status: allNeedConfirmation ? "NEEDS_CONFIRMATION" : "NOT_READY",
    blockingTaskIds,
  };
}

export function computeAllGateStatuses(
  gates: ScoredLaunchGate[],
  milestones: ScoredMilestone[],
  tasks: ScoredTask[],
): Record<string, GateEvaluation> {
  const result: Record<string, GateEvaluation> = {};
  for (const gate of gates) {
    result[gate.key] = computeGateStatus(gate, milestones, tasks);
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
