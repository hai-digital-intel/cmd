"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateTaskFields } from "@/lib/actions/tasks";
import { toast } from "sonner";
import type { VerificationLevel } from "@/lib/types";

export interface EditTaskDialogProps {
  taskId: string;
  title: string;
  description: string | null;
  ownerId: string | null;
  estimatedMinutes: number | null;
  dueDate: Date | null;
  weight: number;
  requiredForLaunch: boolean;
  verificationLevel: VerificationLevel;
  people: { id: string; name: string }[];
}

export function EditTaskDialog(props: EditTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(props.title);
  const [description, setDescription] = useState(props.description ?? "");
  const [ownerId, setOwnerId] = useState(props.ownerId ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(props.estimatedMinutes?.toString() ?? "");
  const [dueDate, setDueDate] = useState(props.dueDate ? props.dueDate.toISOString().slice(0, 10) : "");
  const [weight, setWeight] = useState(props.weight.toString());
  const [requiredForLaunch, setRequiredForLaunch] = useState(props.requiredForLaunch);
  const [verificationLevel, setVerificationLevel] = useState<VerificationLevel>(props.verificationLevel);

  function submit() {
    startTransition(async () => {
      await updateTaskFields(props.taskId, {
        title: title.trim() || props.title,
        description: description.trim() || null,
        ownerId: ownerId || null,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        weight: Number(weight) || 1,
        requiredForLaunch,
        verificationLevel,
      });
      setOpen(false);
      toast.success("Task updated");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="size-3.5" /> Edit
      </Button>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit task</DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input id="edit-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {props.people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-estimate">Estimated minutes</Label>
              <Input id="edit-estimate" type="number" min={0} value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-due">Due date</Label>
              <Input id="edit-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-weight">Readiness weight</Label>
              <Input id="edit-weight" type="number" min={0.5} step={0.5} value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Verification level</Label>
            <Select value={verificationLevel} onValueChange={(v) => setVerificationLevel(v as VerificationLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REQUIRED">Required</SelectItem>
                <SelectItem value="RECOMMENDED">Recommended</SelectItem>
                <SelectItem value="OPTIONAL">Optional</SelectItem>
                <SelectItem value="NEEDS_VERIFICATION">Needs verification</SelectItem>
                <SelectItem value="NOT_APPLICABLE">Not applicable</SelectItem>
              </SelectContent>
            </Select>
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
          <Button onClick={submit} disabled={pending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
