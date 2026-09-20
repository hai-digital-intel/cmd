"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMilestone } from "@/lib/actions/structure";
import { toast } from "sonner";

export function AddMilestoneButton({ categoryId }: { categoryId: string }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [requiredForLaunch, setRequiredForLaunch] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!title.trim()) return;
    startTransition(async () => {
      await createMilestone({ categoryId, title: title.trim(), requiredForLaunch });
      setTitle("");
      setRequiredForLaunch(false);
      setOpen(false);
      toast.success("Milestone added");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" className="h-7 justify-start text-xs text-muted-foreground" onClick={() => setOpen(true)}>
        <Plus className="size-3.5" /> Add milestone
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add milestone</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="milestone-title">Title</Label>
            <Input id="milestone-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={requiredForLaunch} onChange={(e) => setRequiredForLaunch(e.target.checked)} className="size-4 rounded border-border" />
            Required for launch
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !title.trim()}>
            Add milestone
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
