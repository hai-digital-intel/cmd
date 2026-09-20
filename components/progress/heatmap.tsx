import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HeatmapDay } from "@/lib/services/streaks";

function intensityClass(count: number): string {
  if (count === 0) return "bg-surface-sunken";
  if (count === 1) return "bg-success-bg";
  if (count <= 3) return "bg-success/50";
  return "bg-success";
}

/** A calm 12-week activity heatmap — intensity only, no numbers competing for attention. */
export function Heatmap({ days }: { days: HeatmapDay[] }) {
  const weeks: HeatmapDay[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <Card className="p-5">
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">Last 12 weeks</div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} task${day.count === 1 ? "" : "s"} completed`}
                className={cn("size-3 rounded-sm", intensityClass(day.count))}
              />
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
