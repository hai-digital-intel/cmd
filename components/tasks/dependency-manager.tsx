"use client";

import { useState, useTransition } from "react";
import { Link2, X, Plus, Lock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/status-badge";
import { addTaskDependency, removeTaskDependency } from "@/lib/actions/tasks";
import type { TaskStatus } from "@/lib/types";
import { toast } from "sonner";

export interface TaskRef {
  id: string;
  title: string;
  status: TaskStatus;
}

export function DependencyManager({
  taskId,
  dependsOn,
  dependents,
  candidateTasks,
}: {
  taskId: string;
  dependsOn: TaskRef[];
  dependents: TaskRef[];
  candidateTasks: TaskRef[];
}) {
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState("");

  const options = candidateTasks.filter((t) => t.id !== taskId && !dependsOn.some((d) => d.id === t.id));

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Lock className="size-3.5" /> Depends on
        </h3>
        <div className="space-y-1.5">
          {dependsOn.length === 0 && <p className="text-xs text-muted-foreground">Nothing — this can start any time.</p>}
          {dependsOn.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5">
              <Link href={`/tasks/${d.id}`} className="focus-ring truncate text-sm hover:underline">
                {d.title}
              </Link>
              <div className="flex shrink-0 items-center gap-1.5">
                <StatusBadge status={d.status} />
                <button
                  className="focus-ring text-muted-foreground hover:text-foreground"
                  disabled={pending}
                  onClick={() => startTransition(() => removeTaskDependency(taskId, d.id))}
                  aria-label="Remove dependency"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <Select value={selected} onValueChange={setSelected}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Add a dependency..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs">
                  {t.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={!selected || pending}
            onClick={() =>
              startTransition(async () => {
                try {
                  await addTaskDependency(taskId, selected);
                  setSelected("");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not add dependency");
                }
              })
            }
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      </div>

      <div>
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Link2 className="size-3.5" /> Unlocks
        </h3>
        <div className="space-y-1.5">
          {dependents.length === 0 && <p className="text-xs text-muted-foreground">Nothing depends on this yet.</p>}
          {dependents.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5">
              <Link href={`/tasks/${d.id}`} className="focus-ring truncate text-sm hover:underline">
                {d.title}
              </Link>
              <StatusBadge status={d.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
