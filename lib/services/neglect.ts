import type { ScoredTask } from "@/lib/types";
import { isTaskActionable } from "@/lib/services/dependency";

export interface NeglectedTask {
  taskId: string;
  title: string;
  ageDays: number;
  unlockCount: number;
}

/**
 * "Gentle stakes": a factual list of actionable tasks that have sat untouched for a while,
 * ranked by how much they're actually holding up (unlockCount) before raw age. This is
 * reporting, not shaming — the Progress page states the fact ("open 21 days, blocking 3
 * tasks") and lets the founder decide what to do with it, matching the brief's "no
 * dark-pattern urgency" constraint.
 */
export function computeNeglectedTasks(
  tasks: ScoredTask[],
  tasksById: Map<string, ScoredTask>,
  opts?: { now?: Date; thresholdDays?: number; limit?: number },
): NeglectedTask[] {
  const now = opts?.now ?? new Date();
  const thresholdDays = opts?.thresholdDays ?? 14;
  const limit = opts?.limit ?? 5;

  const neglected = tasks
    .filter((t) => isTaskActionable(t, tasksById))
    .map((t) => ({
      taskId: t.id,
      title: t.title,
      ageDays: Math.floor((now.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      unlockCount: t.unlockCount,
    }))
    .filter((t) => t.ageDays >= thresholdDays)
    .sort((a, b) => b.unlockCount - a.unlockCount || b.ageDays - a.ageDays);

  return neglected.slice(0, limit);
}
