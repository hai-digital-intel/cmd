import { describe, it, expect } from "vitest";
import { computeStreaks, buildHeatmap, computeMomentum } from "@/lib/services/streaks";

const day = (offsetFromNow: number, now: Date) => new Date(now.getTime() + offsetFromNow * 24 * 60 * 60 * 1000);

describe("computeStreaks", () => {
  const now = new Date("2026-01-10T12:00:00Z");

  it("is all zero with no completions", () => {
    expect(computeStreaks([], now)).toEqual({ currentStreak: 0, longestStreak: 0, lastBrokenStreak: null, activeDayCount: 0 });
  });

  it("counts a streak that includes today", () => {
    const completions = [day(0, now), day(-1, now), day(-2, now)];
    const result = computeStreaks(completions, now);
    expect(result.currentStreak).toBe(3);
  });

  it("keeps the streak alive if only yesterday (not yet today) has activity", () => {
    const completions = [day(-1, now), day(-2, now), day(-3, now)];
    const result = computeStreaks(completions, now);
    expect(result.currentStreak).toBe(3);
  });

  it("reports a broken streak as 0 current, with the prior length noted", () => {
    // Gap: nothing yesterday or today, but a 4-day run ending 3 days ago.
    const completions = [day(-3, now), day(-4, now), day(-5, now), day(-6, now)];
    const result = computeStreaks(completions, now);
    expect(result.currentStreak).toBe(0);
    expect(result.lastBrokenStreak).toBe(4);
  });

  it("tracks the longest streak even after it's broken", () => {
    const completions = [
      day(-10, now), day(-9, now), day(-8, now), day(-7, now), day(-6, now), // 5-day run, long ago
      day(0, now), // today, streak of 1
    ];
    const result = computeStreaks(completions, now);
    expect(result.longestStreak).toBe(5);
    expect(result.currentStreak).toBe(1);
  });

  it("only counts one active day per calendar day regardless of how many completions happened", () => {
    const now2 = new Date("2026-01-10T08:00:00Z");
    const completions = [
      new Date("2026-01-10T09:00:00Z"),
      new Date("2026-01-10T15:00:00Z"),
      new Date("2026-01-10T20:00:00Z"),
    ];
    expect(computeStreaks(completions, now2).activeDayCount).toBe(1);
  });
});

describe("computeMomentum", () => {
  const now = new Date("2026-01-15T12:00:00Z");

  it("is all zero with no history", () => {
    expect(computeMomentum([], now)).toEqual({ completedToday: 0, rollingAveragePerActiveDay: 0, percentOfAverage: 0 });
  });

  it("counts only today's completions for completedToday", () => {
    const completions = [day(0, now), day(0, now), day(-1, now)];
    expect(computeMomentum(completions, now).completedToday).toBe(2);
  });

  it("compares today against the trailing-window average, not an arbitrary target", () => {
    // 2 active days in the window (excluding today), 1 completion each -> average 1/day.
    const completions = [day(-1, now), day(-2, now), day(0, now), day(0, now)];
    const result = computeMomentum(completions, now, 14);
    expect(result.rollingAveragePerActiveDay).toBe(1);
    expect(result.percentOfAverage).toBe(200); // 2 today vs average of 1
  });

  it("ignores completions outside the trailing window", () => {
    const farPast = day(-100, now);
    const completions = [farPast, day(0, now)];
    const result = computeMomentum(completions, now, 14);
    expect(result.rollingAveragePerActiveDay).toBe(0);
    expect(result.percentOfAverage).toBe(100); // no baseline yet, but something happened today
  });
});

describe("buildHeatmap", () => {
  it("returns exactly `days` entries, oldest first, ending today", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    const result = buildHeatmap([], 7, now);
    expect(result).toHaveLength(7);
    expect(result[6]!.date).toBe("2026-01-10");
    expect(result[0]!.date).toBe("2026-01-04");
  });

  it("counts multiple completions on the same day", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    const completions = [new Date("2026-01-09T09:00:00Z"), new Date("2026-01-09T15:00:00Z")];
    const result = buildHeatmap(completions, 7, now);
    const jan9 = result.find((d) => d.date === "2026-01-09");
    expect(jan9?.count).toBe(2);
  });
});
