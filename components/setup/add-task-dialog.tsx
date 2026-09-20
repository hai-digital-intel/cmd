"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createTask } from "@/lib/actions/structure";
import { toast } from "sonner";

export function AddTaskButton({
  categoryId,
  milestoneId,
  ownerOptions,
}: {
  categoryId: string;
  milestoneId: string;
  ownerOptions: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [requiredForLaunch, setRequiredForLaunch] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) return;
    startTransition(async () => {
      await createTask({
        categoryId,
        milestoneId,
        title: title.trim(),
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : undefined,
        ownerId: ownerId || undefined,
        requiredForLaunch,
      });
      setTitle("");
      setEstimatedMinutes("");
      setOwnerId("");
      setRequiredForLaunch(false);
      setOpen(false);
      toast.success("Task added");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 justify-start text-xs text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Plus className="size-3.5" /> Add task
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add task</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Confirm renewal date with Dtec"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="task-estimate">Estimated minutes</Label>
              <Input
                id="task-estimate"
                type="number"
                min={0}
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
                placeholder="15"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {ownerOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={requiredForLaunch}
              onChange={(e) => setRequiredForLaunch(e.target.checked)}
              className="size-4 rounded border-border"
            />
            Required for launch
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !title.trim()}>
            Add task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
