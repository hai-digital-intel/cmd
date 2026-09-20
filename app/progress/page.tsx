// Always render fresh — this is a live operational dashboard, not cacheable content.
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/client";
import { computeReadinessOverview } from "@/lib/data/computed";
import { computeStreaks, buildHeatmap, computeMomentum } from "@/lib/services/streaks";
import { computeNeglectedTasks } from "@/lib/services/neglect";
import { StreakSummaryCards } from "@/components/progress/streak-summary";
import { MomentumCard } from "@/components/progress/momentum-card";
import { Heatmap } from "@/components/progress/heatmap";
import { NeglectedList } from "@/components/progress/neglected-list";

export default async function ProgressPage() {
  const [completedActivities, overview] = await Promise.all([
    prisma.activity.findMany({ where: { action: "completed" }, select: { createdAt: true } }),
    computeReadinessOverview(),
  ]);

  const timestamps = completedActivities.map((a) => a.createdAt);
  const streak = computeStreaks(timestamps);
  const momentum = computeMomentum(timestamps);
  const heatmapDays = buildHeatmap(timestamps, 84);
  const neglected = computeNeglectedTasks(overview.snapshot.tasks, overview.tasksById);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Progress</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">A quiet record of momentum — not a scoreboard.</p>
      </header>

      <StreakSummaryCards streak={streak} />

      <MomentumCard momentum={momentum} />

      <Heatmap days={heatmapDays} />

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Sitting a while</h2>
        <p className="mb-3 text-xs text-muted-foreground">Actionable tasks open 14+ days, most-blocking first — just the facts, nothing more.</p>
        <NeglectedList items={neglected} />
      </section>
    </div>
  );
}
