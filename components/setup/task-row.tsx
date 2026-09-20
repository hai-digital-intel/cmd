import Link from "next/link";
import { Star, Paperclip, Lock } from "lucide-react";
import { TaskStatusSelect } from "@/components/setup/task-status-select";
import { estimatedTimeLabel, cn } from "@/lib/utils";
import type { TaskStatus } from "@/lib/types";

export interface TaskRowData {
  id: string;
  title: string;
  status: TaskStatus;
  requiredForLaunch: boolean;
  evidenceRequired: boolean;
  estimatedMinutes: number | null;
  ownerInitial: string | null;
  actionable: boolean;
}

export function TaskRow({ task }: { task: TaskRowData }) {
  const dimmed = task.status === "DONE" || task.status === "NOT_APPLICABLE";
  return (
    <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-muted">
      <Link
        href={`/tasks/${task.id}`}
        className={cn(
          "focus-ring min-w-0 flex-1 truncate text-sm",
          dimmed ? "text-muted-foreground line-through decoration-border" : "text-foreground",
        )}
      >
        {task.title}
      </Link>

      <div className="flex shrink-0 items-center gap-1.5">
        {!task.actionable && !dimmed && task.status !== "BLOCKED" && task.status !== "WAITING_EXTERNAL" && (
          <Lock className="size-3 text-muted-foreground" aria-label="Waiting on a dependency" />
        )}
        {task.requiredForLaunch && <Star className="size-3 fill-current text-accent" aria-label="Required for launch" />}
        {task.evidenceRequired && <Paperclip className="size-3 text-muted-foreground" aria-label="Evidence required" />}
        {task.estimatedMinutes != null && (
          <span className="hidden text-xs text-muted-foreground sm:inline">{estimatedTimeLabel(task.estimatedMinutes)}</span>
        )}
        {task.ownerInitial && (
          <span className="flex size-5 items-center justify-center rounded-full bg-surface-sunken text-[10px] font-medium text-muted-foreground">
            {task.ownerInitial}
          </span>
        )}
        <TaskStatusSelect taskId={task.id} status={task.status} />
      </div>
    </div>
  );
}
