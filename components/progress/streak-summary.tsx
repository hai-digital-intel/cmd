import { Flame, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { StreakSummary } from "@/lib/services/streaks";

export function StreakSummaryCards({ streak }: { streak: StreakSummary }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <Card className="p-5">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Flame className="size-3.5" /> Current streak
        </div>
        <div className="mt-1 text-3xl font-semibold text-foreground">
          {streak.currentStreak}
          <span className="ml-1 text-base font-normal text-muted-foreground">day{streak.currentStreak === 1 ? "" : "s"}</span>
        </div>
        {streak.currentStreak === 0 && streak.lastBrokenStreak != null && (
          <p className="mt-1 text-xs text-muted-foreground">Last streak ended at {streak.lastBrokenStreak} days.</p>
        )}
        {streak.currentStreak === 0 && streak.lastBrokenStreak == null && (
          <p className="mt-1 text-xs text-muted-foreground">Complete a task today to start one.</p>
        )}
      </Card>
      <Card className="p-5">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Trophy className="size-3.5" /> Longest streak
        </div>
        <div className="mt-1 text-3xl font-semibold text-foreground">
          {streak.longestStreak}
          <span className="ml-1 text-base font-normal text-muted-foreground">day{streak.longestStreak === 1 ? "" : "s"}</span>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Your best run so far.</p>
      </Card>
      <Card className="p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active days</div>
        <div className="mt-1 text-3xl font-semibold text-foreground">{streak.activeDayCount}</div>
        <p className="mt-1 text-xs text-muted-foreground">Days with at least one task completed.</p>
      </Card>
    </div>
  );
}
