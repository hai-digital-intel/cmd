import type { ScoredTask } from "@/lib/types";
import { isTaskActionable } from "@/lib/services/dependency";

export interface PrioritizationWeights {
  criticalPath: number;
  launchRequired: number;
  unlockCount: number;
  deadlineProximity: number;
  readinessImpact: number;
  effortBonus: number;
  waitingPenalty: number;
  blockedPenalty: number;
  agePerDay: number;
  agePerDayCap: number;
  manualOverrideBoost: number;
}

/**
 * Tuning knobs for "Your Next 3." Documented so a future pass can retune without touching
 * the scoring logic itself:
 *  - criticalPath / launchRequired: flat boosts for structurally important work.
 *  - unlockCount: per-downstream-task boost — a task that frees up 4 others outranks one
 *    that frees up none, even at equal effort.
 *  - deadlineProximity: scaled boost as a due date approaches/passes.
 *  - readinessImpact: multiplies a task's own effective weight so heavier setup items (e.g.
 *    "open business bank account") nose ahead of trivial ones (e.g. "add favicon") at parity.
 *  - effortBonus: rewards low-effort/high-unlock work — a 10-minute task should not lose to
 *    a 3-hour task just because the latter is technically required-for-launch.
 *  - waitingPenalty / blockedPenalty: waiting is heavily discounted (still visible if nothing
 *    else qualifies); blocked is excluded by isTaskActionable before scoring even runs, so
 *    this penalty is a defensive backstop, not the primary mechanism.
 *  - agePerDay (capped): a gentle nudge so nothing sits ignored forever, capped to avoid
 *    letting an ancient low-value task out-rank fresh critical-path work.
 *  - manualOverrideBoost: a founder-set priority always wins.
 */
export const DEFAULT_WEIGHTS: PrioritizationWeights = {
  criticalPath: 25,
  launchRequired: 20,
  unlockCount: 8,
  deadlineProximity: 20,
  readinessImpact: 6,
  effortBonus: 15,
  waitingPenalty: 60,
  blockedPenalty: 1000,
  agePerDay: 0.15,
  agePerDayCap: 60,
  manualOverrideBoost: 500,
};

export interface PriorityResult {
  taskId: string;
  score: number;
  reasons: string[];
}

export function scoreTask(
  task: ScoredTask,
  opts: { isCriticalPath: boolean; now?: Date; weights?: PrioritizationWeights },
): PriorityResult {
  const weights = opts.weights ?? DEFAULT_WEIGHTS;
  const now = opts.now ?? new Date();
  let score = 0;
  const reasons: string[] = [];

  if (task.priorityOverride != null) {
    score += weights.manualOverrideBoost + task.priorityOverride;
    reasons.push("Manually prioritized");
  }

  if (opts.isCriticalPath) {
    score += weights.criticalPath;
    reasons.push("On the critical path");
  }

  if (task.requiredForLaunch) {
    score += weights.launchRequired;
    reasons.push("Required for launch");
  }

  if (task.unlockCount > 0) {
    score += task.unlockCount * weights.unlockCount;
    reasons.push(`Unlocks ${task.unlockCount} task${task.unlockCount > 1 ? "s" : ""}`);
  }

  if (task.dueDate) {
    const daysUntil = (task.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (daysUntil <= 0) {
      score += weights.deadlineProximity * 2;
      reasons.push("Overdue");
    } else if (daysUntil <= 3) {
      score += weights.deadlineProximity * 1.5;
      reasons.push("Due within 3 days");
    } else if (daysUntil <= 7) {
      score += weights.deadlineProximity;
      reasons.push("Due this week");
    } else if (daysUntil <= 14) {
      score += weights.deadlineProximity * 0.4;
    }
  }

  score += task.effectiveWeight * weights.readinessImpact;

  if (task.estimatedMinutes != null && task.estimatedMinutes <= 15) {
    score += weights.effortBonus;
    reasons.push("15-minute win");
  } else if (task.estimatedMinutes != null && task.estimatedMinutes <= 30) {
    score += weights.effortBonus * 0.5;
  }

  const ageDays = (now.getTime() - task.createdAt.getTime()) / (1000 * 60 * 60 * 24);
  score += Math.min(ageDays, weights.agePerDayCap) * weights.agePerDay;

  if (task.status === "WAITING_EXTERNAL") {
    score -= weights.waitingPenalty;
    reasons.push("Waiting externally");
  }
  if (task.status === "BLOCKED") {
    score -= weights.blockedPenalty;
    reasons.push("Blocked");
  }

  return { taskId: task.id, score, reasons };
}

export interface PrioritizedTask extends PriorityResult {
  task: ScoredTask;
}

/**
 * "Your Next 3" (or any N). Blocked/waiting/done/N-A tasks are excluded by isTaskActionable
 * before scoring runs — a blocked task never occupies a slot just because chasing its
 * blocker is technically "an action," matching the product rule that Next 3 shows what the
 * founder can do right now, not what she's stuck on.
 */
export function selectNextActions(
  tasks: ScoredTask[],
  opts: {
    tasksById: Map<string, ScoredTask>;
    criticalPathIds: ReadonlySet<string>;
    now?: Date;
    limit?: number;
    weights?: PrioritizationWeights;
  },
): PrioritizedTask[] {
  const limit = opts.limit ?? 3;
  const eligible = tasks.filter((t) => isTaskActionable(t, opts.tasksById));
  const scored = eligible.map((t) => ({
    ...scoreTask(t, { isCriticalPath: opts.criticalPathIds.has(t.id), now: opts.now, weights: opts.weights }),
    task: t,
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/** Actionable, currently-doable tasks estimated at 15 minutes or less, ranked by impact. */
export function selectQuickWins(
  tasks: ScoredTask[],
  opts: {
    tasksById: Map<string, ScoredTask>;
    criticalPathIds: ReadonlySet<string>;
    now?: Date;
    limit?: number;
  },
): PrioritizedTask[] {
  const eligible = tasks.filter(
    (t) => isTaskActionable(t, opts.tasksById) && t.estimatedMinutes != null && t.estimatedMinutes <= 15,
  );
  const scored = eligible.map((t) => ({
    ...scoreTask(t, { isCriticalPath: opts.criticalPathIds.has(t.id), now: opts.now }),
    task: t,
  }));
  scored.sort((a, b) => b.score - a.score);
  return opts.limit ? scored.slice(0, opts.limit) : scored;
}
