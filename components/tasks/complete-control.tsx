"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { updateTaskStatus } from "@/lib/actions/tasks";
import { toast } from "sonner";
import type { TaskStatus } from "@/lib/types";

/**
 * Evidence-gated completion (brief section 28): a task marked evidenceRequired offers three
 * explicit paths instead of a single Done button — complete with evidence already attached,
 * complete manually, or override with a mandatory reason. Trivial tasks just get one button.
 */
export function CompleteControl({
  taskId,
  status,
  evidenceRequired,
  hasEvidence,
}: {
  taskId: string;
  status: TaskStatus;
  evidenceRequired: boolean;
  hasEvidence: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (status === "DONE") {
    return (
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => startTransition(() => updateTaskStatus(taskId, "NOT_STARTED"))}
      >
        Reopen
      </Button>
    );
  }

  function complete(withReason?: string) {
    startTransition(async () => {
      await updateTaskStatus(taskId, "DONE", withReason ? { overrideReason: withReason } : undefined);
      toast.success("Marked done");
    });
  }

  if (!evidenceRequired) {
    return (
      <Button disabled={pending} onClick={() => complete()}>
        <Check className="size-4" /> Mark done
      </Button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button disabled={pending || !hasEvidence} onClick={() => complete()}>
          <Check className="size-4" /> Complete with evidence
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" disabled={pending}>
              <ChevronDown className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => complete()}>Complete manually</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setOverrideOpen(true)} className="text-blocked-foreground">
              <ShieldAlert className="size-3.5" /> Override (requires reason)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {!hasEvidence && <p className="mt-1.5 text-xs text-muted-foreground">This task expects evidence — attach a file, link, or note below.</p>}

      <Dialog open={overrideOpen} onOpenChange={setOverrideOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Override completion</DialogTitle>
            <DialogDescription>This task normally requires evidence. Explain why you&apos;re marking it done without it.</DialogDescription>
          </DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for override..." rows={3} autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOverrideOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={!reason.trim() || pending}
              onClick={() => {
                complete(reason.trim());
                setOverrideOpen(false);
              }}
            >
              Override & complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
