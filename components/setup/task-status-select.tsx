"use client";

import { useTransition } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateTaskStatus } from "@/lib/actions/tasks";
import { STATUS_LABELS, ALL_TASK_STATUSES } from "@/lib/status";
import type { TaskStatus } from "@/lib/types";
import { toast } from "sonner";

export function TaskStatusSelect({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const [pending, startTransition] = useTransition();

  return (
    <Select
      value={status}
      disabled={pending}
      onValueChange={(next) => {
        const previous = status;
        startTransition(async () => {
          await updateTaskStatus(taskId, next as TaskStatus);
          if (next === "DONE") {
            toast.success("Marked done", {
              action: { label: "Undo", onClick: () => startTransition(() => updateTaskStatus(taskId, previous)) },
            });
          }
        });
      }}
    >
      <SelectTrigger className="h-7 w-auto min-w-[9.5rem] gap-1.5 border-none bg-transparent px-2 text-xs shadow-none hover:bg-surface-muted">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ALL_TASK_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="text-xs">
            {STATUS_LABELS[s]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
