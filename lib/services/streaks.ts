/**
 * Streak math for the Progress page. Deliberately built on Activity log timestamps rather
 * than a new schema field — "did something count as progress today" is already exactly what
 * an Activity row with action "completed" means, so there's nothing new to keep in sync.
 *
 * Calm by design: a streak doesn't break until a full day has passed with zero completions
 * (today staying unfinished isn't a broken streak yet), and a broken streak is reported as a
 * plain fact ("ended at N days"), never as a scolding message.
 */

function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysBetweenKeys(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24));
}

export interface StreakSummary {
  currentStreak: number;
  longestStreak: number;
  /** Length of the most recent streak that already ended, if the current streak is 0. */
  lastBrokenStreak: number | null;
  activeDayCount: number;
}

export function computeStreaks(completionTimestamps: Date[], now: Date = new Date()): StreakSummary {
  const activeDays = Array.from(new Set(completionTimestamps.map(toDayKey))).sort();

  if (activeDays.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastBrokenStreak: null, activeDayCount: 0 };
  }

  // Find every maximal run of consecutive days.
  const runs: { start: string; end: string; length: number }[] = [];
  let runStart = activeDays[0]!;
  let prev = activeDays[0]!;
  for (let i = 1; i < activeDays.length; i++) {
    const day = activeDays[i]!;
    if (daysBetweenKeys(prev, day) === 1) {
      prev = day;
      continue;
    }
    runs.push({ start: runStart, end: prev, length: daysBetweenKeys(runStart, prev) + 1 });
    runStart = day;
    prev = day;
  }
  runs.push({ start: runStart, end: prev, length: daysBetweenKeys(runStart, prev) + 1 });

  const longestStreak = Math.max(...runs.map((r) => r.length));

  const today = toDayKey(now);
  const yesterday = toDayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const lastRun = runs[runs.length - 1]!;

  // The streak is still "alive" if its last active day was today or yesterday.
  const isAlive = lastRun.end === today || lastRun.end === yesterday;
  const currentStreak = isAlive ? lastRun.length : 0;
  const lastBrokenStreak = !isAlive && runs.length > 0 ? lastRun.length : null;

  return { currentStreak, longestStreak, lastBrokenStreak, activeDayCount: activeDays.length };
}

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
}

/** Last `days` calendar days (oldest first) with a completion count per day, for a calendar heatmap. */
export function buildHeatmap(completionTimestamps: Date[], days: number, now: Date = new Date()): HeatmapDay[] {
  const counts = new Map<string, number>();
  for (const ts of completionTimestamps) {
    const key = toDayKey(ts);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const result: HeatmapDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = toDayKey(d);
    result.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return result;
}
