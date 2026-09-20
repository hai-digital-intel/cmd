"use client";

import { useMemo, useState, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { convertNoteToTask } from "@/lib/actions/notes";
import { toast } from "sonner";

export interface ConvertNoteDialogProps {
  noteId: string;
  rawText: string;
  categories: { id: string; name: string; milestones: { id: string; title: string }[] }[];
  people: { id: string; name: string }[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConvertNoteDialog({ noteId, rawText, categories, people, open, onOpenChange }: ConvertNoteDialogProps) {
  const [title, setTitle] = useState(rawText.slice(0, 120));
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [milestoneId, setMilestoneId] = useState(categories[0]?.milestones[0]?.id ?? "");
  const [status, setStatus] = useState<"NOT_STARTED" | "WAITING_EXTERNAL" | "NEEDS_CONFIRMATION">("NOT_STARTED");
  const [ownerId, setOwnerId] = useState("");
  const [waitingOn, setWaitingOn] = useState("");
  const [pending, startTransition] = useTransition();

  const milestoneOptions = useMemo(
    () => categories.find((c) => c.id === categoryId)?.milestones ?? [],
    [categories, categoryId],
  );

  function submit() {
    if (!title.trim() || !milestoneId) return;
    startTransition(async () => {
      await convertNoteToTask(noteId, {
        title: title.trim(),
        categoryId,
        milestoneId,
        status,
        ownerId: ownerId || undefined,
        waitingOn: status === "WAITING_EXTERNAL" ? waitingOn || undefined : undefined,
      });
      onOpenChange(false);
      toast.success("Converted to task");
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert to task</DialogTitle>
          <DialogDescription>&ldquo;{rawText}&rdquo;</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="convert-title">Title</Label>
            <Input id="convert-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={categoryId}
                onValueChange={(v) => {
                  setCategoryId(v);
                  setMilestoneId(categories.find((c) => c.id === v)?.milestones[0]?.id ?? "");
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Milestone</Label>
              <Select value={milestoneId} onValueChange={setMilestoneId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose milestone" />
                </SelectTrigger>
                <SelectContent>
                  {milestoneOptions.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NOT_STARTED">Not started</SelectItem>
                  <SelectItem value="WAITING_EXTERNAL">Waiting on someone</SelectItem>
                  <SelectItem value="NEEDS_CONFIRMATION">Needs confirmation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
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
          {status === "WAITING_EXTERNAL" && (
            <div className="space-y-1.5">
              <Label htmlFor="waiting-on">Waiting on</Label>
              <Input id="waiting-on" value={waitingOn} onChange={(e) => setWaitingOn(e.target.value)} placeholder="e.g. Accountant" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !title.trim() || !milestoneId}>
            Convert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
