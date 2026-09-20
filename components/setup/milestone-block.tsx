import { ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TaskRow, type TaskRowData } from "@/components/setup/task-row";
import { AddTaskButton } from "@/components/setup/add-task-dialog";

export interface MilestoneBlockData {
  id: string;
  title: string;
  requiredForLaunch: boolean;
  readiness: number;
  doneCount: number;
  applicableTotal: number;
  activeTasks: TaskRowData[];
  doneTasks: TaskRowData[];
  categoryId: string;
  ownerOptions: { id: string; name: string }[];
}

export function MilestoneBlock({ milestone }: { milestone: MilestoneBlockData }) {
  return (
    <details className="group/milestone rounded-lg border border-border bg-surface">
      <summary className="focus-ring flex cursor-pointer list-none items-center gap-3 px-3 py-2.5">
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform group-open/milestone:rotate-90" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{milestone.title}</span>
        {milestone.requiredForLaunch && (
          <Badge variant="outline" className="hidden sm:inline-flex">
            Required
          </Badge>
        )}
        <span className="shrink-0 text-xs text-muted-foreground">
          {milestone.doneCount}/{milestone.applicableTotal}
        </span>
        <div className="w-16 shrink-0">
          <Progress value={milestone.readiness} />
        </div>
      </summary>

      <div className="space-y-0.5 border-t border-border p-2">
        {milestone.activeTasks.length === 0 && milestone.doneTasks.length === 0 && (
          <p className="px-2 py-2 text-xs text-muted-foreground">No tasks yet.</p>
        )}
        {milestone.activeTasks.map((task) => (
          <TaskRow key={task.id} task={task} />
        ))}

        {milestone.doneTasks.length > 0 && (
          <details className="pt-1">
            <summary className="focus-ring cursor-pointer list-none px-2 py-1 text-xs text-muted-foreground hover:text-foreground">
              {milestone.doneTasks.length} completed / not applicable
            </summary>
            <div className="mt-1 space-y-0.5">
              {milestone.doneTasks.map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </details>
        )}

        <div className="pt-1">
          <AddTaskButton categoryId={milestone.categoryId} milestoneId={milestone.id} ownerOptions={milestone.ownerOptions} />
        </div>
      </div>
    </details>
  );
}
