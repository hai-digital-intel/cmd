import type { ScoredTask } from "@/lib/types";
import { isTaskActionable } from "@/lib/services/dependency";
import { computeGateStatus, type GateEvaluation } from "@/lib/services/launchGates";
import type { ScoredLaunchGate, ScoredMilestone } from "@/lib/types";

/**
 * Deterministic "Setup Copilot" answers — no LLM required, ever. Each function takes the
 * same flattened domain data the rest of lib/services uses and returns plain strings/lists
 * a component can render directly. An AI provider (lib/ai/provider.ts) could later polish
 * the phrasing, but the facts always come from here.
 */

export interface CopilotAnswer {
  summary: string;
  items: string[];
}

export function whatsBlockingLaunch(
  gates: ScoredLaunchGate[],
  milestones: ScoredMilestone[],
  tasks: ScoredTask[],
  taskTitleById: Map<string, string>,
): CopilotAnswer {
  const blockingTaskIds = new Set<string>();
  const evaluations: { gate: ScoredLaunchGate; evaluation: GateEvaluation }[] = [];
  for (const gate of gates) {
    const evaluation = computeGateStatus(gate, milestones, tasks);
    evaluations.push({ gate, evaluation });
    evaluation.blockingTaskIds.forEach((id) => blockingTaskIds.add(id));
  }

  const notReady = evaluations.filter((e) => e.evaluation.status !== "READY");
  if (notReady.length === 0) {
    return { summary: "Nothing — every launch gate is Ready.", items: [] };
  }

  const items = Array.from(blockingTaskIds)
    .map((id) => taskTitleById.get(id))
    .filter((t): t is string => !!t);

  return {
    summary: `${notReady.length} launch gate${notReady.length > 1 ? "s aren't" : " isn't"} ready yet: ${notReady.map((e) => e.gate.name).join(", ")}.`,
    items,
  };
}

export function fifteenMinuteWins(tasks: ScoredTask[], tasksById: Map<string, ScoredTask>): CopilotAnswer {
  const wins = tasks.filter((t) => isTaskActionable(t, tasksById) && t.estimatedMinutes != null && t.estimatedMinutes <= 15);
  return {
    summary: wins.length > 0 ? `${wins.length} task${wins.length > 1 ? "s" : ""} you could finish in 15 minutes or less.` : "Nothing actionable is estimated at 15 minutes or less right now.",
    items: wins.map((t) => t.title),
  };
}

export function whatsWaitingExternally(tasks: ScoredTask[]): CopilotAnswer {
  const waiting = tasks.filter((t) => t.status === "WAITING_EXTERNAL");
  return {
    summary: waiting.length > 0 ? `${waiting.length} task${waiting.length > 1 ? "s are" : " is"} parked waiting on someone else.` : "Nothing is currently waiting on someone else.",
    items: waiting.map((t) => t.title),
  };
}

export function tasksOwnedBy(tasks: ScoredTask[], ownerTaskIds: Set<string>): CopilotAnswer {
  const mine = tasks.filter((t) => ownerTaskIds.has(t.id) && t.status !== "DONE" && t.status !== "NOT_APPLICABLE");
  return {
    summary: mine.length > 0 ? `${mine.length} open task${mine.length > 1 ? "s" : ""} assigned.` : "No open tasks assigned to this person.",
    items: mine.map((t) => t.title),
  };
}

export function summarizeWeek(
  completedThisWeek: { title: string }[],
  readinessBefore: number,
  readinessAfter: number,
): CopilotAnswer {
  const delta = readinessAfter - readinessBefore;
  const direction = delta > 0 ? `up ${delta.toFixed(1)} points` : delta < 0 ? `down ${Math.abs(delta).toFixed(1)} points` : "unchanged";
  return {
    summary: `Readiness is ${direction} this week (${readinessBefore.toFixed(0)}% → ${readinessAfter.toFixed(0)}%). ${completedThisWeek.length} task${completedThisWeek.length === 1 ? "" : "s"} completed.`,
    items: completedThisWeek.map((t) => t.title),
  };
}
