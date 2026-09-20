import Link from "next/link";
import { ArrowRight, Clock, User, CalendarClock, Unlock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskCompleteButton } from "@/components/today/task-complete-button";
import { estimatedTimeLabel, formatDate } from "@/lib/utils";
import type { TaskStatus } from "@/lib/types";

export interface NextActionCardData {
  id: string;
  title: string;
  categoryName: string;
  reasons: string[];
  estimatedMinutes: number | null;
  ownerName: string | null;
  dueDate: Date | null;
  unlocksLabels: string[];
  status: TaskStatus;
}

export function NextActionCard({ task }: { task: NextActionCardData }) {
  const primaryReason = task.reasons[0] ?? "Ready to work on";
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-accent">{task.categoryName}</div>
          <Link href={`/tasks/${task.id}`} className="focus-ring mt-0.5 block text-base font-semibold leading-snug hover:underline">
            {task.title}
          </Link>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{primaryReason}</p>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {task.estimatedMinutes != null && (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" /> {estimatedTimeLabel(task.estimatedMinutes)}
          </span>
        )}
        {task.ownerName && (
          <span className="inline-flex items-center gap-1">
            <User className="size-3.5" /> {task.ownerName}
          </span>
        )}
        {task.dueDate && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="size-3.5" /> Due {formatDate(task.dueDate)}
          </span>
        )}
      </div>

      {task.unlocksLabels.length > 0 && (
        <div className="rounded-md bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Unlock className="size-3.5" /> Unlocks
          </span>
          <div className="mt-0.5">{task.unlocksLabels.join(", ")}</div>
        </div>
      )}

      <div className="mt-1 flex items-center gap-2">
        <TaskCompleteButton taskId={task.id} previousStatus={task.status} />
        <Button asChild variant="outline" size="sm">
          <Link href={`/tasks/${task.id}`}>
            Open <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
