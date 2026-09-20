import type { ScoredTask } from "@/lib/types";

const TERMINAL_OR_UNAVAILABLE: ReadonlySet<ScoredTask["status"]> = new Set([
  "DONE",
  "NOT_APPLICABLE",
  "BLOCKED",
  "WAITING_EXTERNAL",
]);

/**
 * A task is actionable ("available") only when every task it depends on is DONE or
 * NOT_APPLICABLE. Completing a prerequisite therefore makes downstream work actionable
 * automatically on next read — nothing is ever auto-completed.
 */
export function isTaskActionable(
  task: ScoredTask,
  tasksById: Map<string, ScoredTask>,
): boolean {
  if (TERMINAL_OR_UNAVAILABLE.has(task.status)) return false;
  return task.dependsOnIds.every((depId) => {
    const dep = tasksById.get(depId);
    if (!dep) return true; // dangling reference — don't let bad data block everything
    return dep.status === "DONE" || dep.status === "NOT_APPLICABLE";
  });
}

export function buildTaskIndex(tasks: ScoredTask[]): Map<string, ScoredTask> {
  return new Map(tasks.map((t) => [t.id, t]));
}

/** Direct dependents (tasks unlocked when this task finishes). */
export function computeDownstream(tasks: ScoredTask[]): Map<string, string[]> {
  const downstream = new Map<string, string[]>();
  for (const t of tasks) {
    for (const depId of t.dependsOnIds) {
      const list = downstream.get(depId) ?? [];
      list.push(t.id);
      downstream.set(depId, list);
    }
  }
  return downstream;
}

/**
 * Critical path = every requiredForLaunch task plus the full transitive closure of its
 * prerequisites. This is the minimal set of tasks that must all reach DONE/NOT_APPLICABLE
 * for the company to be launch-ready, so it's a useful proxy for "what actually determines
 * the readiness date."
 */
export function computeCriticalPathIds(tasks: ScoredTask[]): Set<string> {
  const byId = buildTaskIndex(tasks);
  const result = new Set<string>();
  const stack = tasks.filter((t) => t.requiredForLaunch).map((t) => t.id);
  while (stack.length > 0) {
    const id = stack.pop();
    if (!id || result.has(id)) continue;
    result.add(id);
    const t = byId.get(id);
    if (!t) continue;
    for (const depId of t.dependsOnIds) {
      if (!result.has(depId)) stack.push(depId);
    }
  }
  return result;
}

/** Detects cycles in the dependency graph — used to guard the "add dependency" mutation. */
export function wouldCreateCycle(
  tasks: ScoredTask[],
  newEdge: { taskId: string; dependsOnId: string },
): boolean {
  const byId = buildTaskIndex(tasks);
  const adjacency = new Map<string, string[]>();
  for (const t of tasks) adjacency.set(t.id, [...t.dependsOnIds]);
  const existing = adjacency.get(newEdge.taskId) ?? [];
  adjacency.set(newEdge.taskId, [...existing, newEdge.dependsOnId]);

  const visiting = new Set<string>();
  const visited = new Set<string>();

  function dfs(id: string): boolean {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const depId of adjacency.get(id) ?? []) {
      if (!byId.has(depId)) continue;
      if (dfs(depId)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }

  return dfs(newEdge.taskId);
}
