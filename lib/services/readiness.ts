import type { ScoredCategory, ScoredLaunchGate, ScoredTask } from "@/lib/types";

export interface ReadinessBreakdown {
  completedWeight: number;
  applicableWeight: number;
  /** 0-100. If there is nothing applicable to measure, this is 0, not a misleading 100. */
  score: number;
}

/**
 * Weighted readiness — never `completed / total`. NOT_APPLICABLE tasks are excluded from
 * the denominator entirely (they can't reduce readiness); NEEDS_CONFIRMATION tasks stay in
 * the denominator but never count toward the numerator (uncertainty isn't completion).
 */
export function computeWeightedReadiness(tasks: ScoredTask[]): ReadinessBreakdown {
  let completed = 0;
  let applicable = 0;
  for (const t of tasks) {
    if (t.status === "NOT_APPLICABLE") continue;
    applicable += t.effectiveWeight;
    if (t.status === "DONE") completed += t.effectiveWeight;
  }
  const score = applicable > 0 ? (completed / applicable) * 100 : 0;
  return { completedWeight: completed, applicableWeight: applicable, score };
}

export function computeOverallReadiness(tasks: ScoredTask[]): number {
  return computeWeightedReadiness(tasks).score;
}

export function computeCriticalPathReadiness(
  tasks: ScoredTask[],
  criticalPathIds: ReadonlySet<string>,
): number {
  return computeWeightedReadiness(tasks.filter((t) => criticalPathIds.has(t.id))).score;
}

export function computeCategoryReadiness(
  tasks: ScoredTask[],
  categories: ScoredCategory[],
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const cat of categories) {
    result[cat.key] = computeWeightedReadiness(tasks.filter((t) => t.categoryId === cat.id)).score;
  }
  return result;
}

export function computeLaunchGateReadiness(
  tasks: ScoredTask[],
  gates: ScoredLaunchGate[],
): Record<string, number> {
  const result: Record<string, number> = {};
  for (const gate of gates) {
    const gateTasks = tasks.filter((t) => gate.categoryIds.includes(t.categoryId));
    result[gate.key] = computeWeightedReadiness(gateTasks).score;
  }
  return result;
}
