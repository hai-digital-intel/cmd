"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createBlocker } from "@/lib/actions/blockers";
import { BLOCKER_TYPES } from "@/lib/types";
import { toast } from "sonner";

export function NewBlockerDialog({ people, tasks }: { people: { id: string; name: string }[]; tasks: { id: string; title: string }[] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<(typeof BLOCKER_TYPES)[number]>("UNKNOWN");
  const [waitingOnPersonId, setWaitingOnPersonId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) return;
    startTransition(async () => {
      await createBlocker({
        title: title.trim(),
        description: description.trim() || undefined,
        type,
        waitingOnPersonId: waitingOnPersonId || undefined,
        relatedTaskIds: taskId ? [taskId] : undefined,
      });
      setTitle("");
      setDescription("");
      setWaitingOnPersonId("");
      setTaskId("");
      setOpen(false);
      toast.success("Blocker logged");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Log blocker
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a blocker</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="blocker-title">Title</Label>
            <Input id="blocker-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="blocker-description">Description</Label>
            <Textarea id="blocker-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BLOCKER_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Waiting on</Label>
              <Select value={waitingOnPersonId} onValueChange={setWaitingOnPersonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Related task (optional)</Label>
            <Select value={taskId} onValueChange={setTaskId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {tasks.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !title.trim()}>
            Log blocker
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
