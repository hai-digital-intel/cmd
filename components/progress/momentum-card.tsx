import { Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { MomentumSummary } from "@/lib/services/streaks";

export function MomentumCard({ momentum }: { momentum: MomentumSummary }) {
  const hasBaseline = momentum.rollingAveragePerActiveDay > 0;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Zap className="size-3.5" /> Today&apos;s momentum
      </div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-foreground">{momentum.completedToday}</span>
        <span className="text-sm text-muted-foreground">completed today</span>
      </div>
      <Progress value={Math.min(100, momentum.percentOfAverage)} className="mt-3" />
      <p className="mt-1.5 text-xs text-muted-foreground">
        {hasBaseline
          ? `${momentum.percentOfAverage}% of your typical pace (${momentum.rollingAveragePerActiveDay.toFixed(1)}/day over the last two weeks).`
          : "Complete a couple more days to see this against your normal pace."}
      </p>
    </Card>
  );
}
