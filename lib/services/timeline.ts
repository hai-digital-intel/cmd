import type { ScoredTask } from "@/lib/types";
import { computeCriticalPathIds } from "@/lib/services/dependency";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export interface TimelineProjection {
  projectedReadyDate: Date;
  remainingCriticalPathTaskIds: string[];
  /** Human-readable "currently driven by X, Y" explanation for the Roadmap page. */
  explanation: string;
  workMinutesRemaining: number;
  externalWaitUntil: Date | null;
}

/**
 * A deliberately simple estimator, not a promise: sum the effort of remaining critical-path
 * work, convert to calendar days at an assumed founder-attention rate, then push the date out
 * further if any critical-path task is waiting on an external party past that point.
 */
export function computeProjectedReadyDate(
  tasks: ScoredTask[],
  opts?: { now?: Date; minutesPerDay?: number; criticalPathIds?: ReadonlySet<string> },
): TimelineProjection {
  const now = opts?.now ?? new Date();
  const minutesPerDay = opts?.minutesPerDay ?? 120;
  const criticalPathIds = opts?.criticalPathIds ?? computeCriticalPathIds(tasks);

  const remaining = tasks.filter(
    (t) => criticalPathIds.has(t.id) && t.status !== "DONE" && t.status !== "NOT_APPLICABLE",
  );

  let workMinutes = 0;
  let externalWaitUntil: Date | null = null;
  const drivers: string[] = [];

  for (const t of remaining) {
    workMinutes += t.estimatedMinutes ?? 30;
    if (t.status === "WAITING_EXTERNAL" && t.externalWaitUntil) {
      if (!externalWaitUntil || t.externalWaitUntil > externalWaitUntil) {
        externalWaitUntil = t.externalWaitUntil;
      }
    }
    if (drivers.length < 3) drivers.push(t.title);
  }

  const workDays = Math.max(1, Math.ceil(workMinutes / minutesPerDay));
  let projected = remaining.length === 0 ? now : addDays(now, workDays);

  if (externalWaitUntil && externalWaitUntil > projected) {
    projected = externalWaitUntil;
  }

  const explanation =
    remaining.length === 0
      ? "No remaining critical-path work — readiness is limited only by confirmation/review items."
      : `Currently driven by: ${drivers.join(", ")}${remaining.length > drivers.length ? ", and more" : ""}.`;

  return {
    projectedReadyDate: projected,
    remainingCriticalPathTaskIds: remaining.map((t) => t.id),
    explanation,
    workMinutesRemaining: workMinutes,
    externalWaitUntil,
  };
}

/** Explainability line for when a projected date moves between two snapshots. */
export function explainDateShift(
  previousDate: Date | null,
  currentDate: Date,
  reason: string,
): string | null {
  if (!previousDate) return null;
  const prevDay = new Date(previousDate).toDateString();
  const curDay = new Date(currentDate).toDateString();
  if (prevDay === curDay) return null;
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(d);
  const direction = currentDate > previousDate ? "moved from" : "moved up from";
  return `Projected readiness ${direction} ${fmt(previousDate)} to ${fmt(currentDate)} because ${reason}.`;
}
