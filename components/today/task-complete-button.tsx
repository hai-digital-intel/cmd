"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateTaskStatus } from "@/lib/actions/tasks";
import { toast } from "sonner";
import type { TaskStatus } from "@/lib/types";

export function TaskCompleteButton({
  taskId,
  previousStatus,
  label = "Done",
  size = "sm",
}: {
  taskId: string;
  previousStatus: TaskStatus;
  label?: string;
  size?: "sm" | "default";
}) {
  const [pending, startTransition] = useTransition();

  function complete() {
    startTransition(async () => {
      await updateTaskStatus(taskId, "DONE");
      toast.success("Marked done", {
        action: {
          label: "Undo",
          onClick: () => {
            startTransition(async () => {
              await updateTaskStatus(taskId, previousStatus);
            });
          },
        },
      });
    });
  }

  return (
    <Button size={size} onClick={complete} disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
      {label}
    </Button>
  );
}
