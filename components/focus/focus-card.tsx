"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, OctagonPause, Clock3, Hammer, StickyNote, Unlock, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ChecklistManager, type ChecklistItemData } from "@/components/tasks/checklist-manager";
import { InstructionsList } from "@/components/tasks/instructions-list";
import { FocusTimer } from "@/components/focus/focus-timer";
import { updateTaskFields, updateTaskStatus, addChecklistItem, addNoteEvidence } from "@/lib/actions/tasks";
import { estimatedTimeLabel } from "@/lib/utils";
import { toast } from "sonner";

export interface FocusTaskData {
  id: string;
  title: string;
  categoryName: string;
  reasons: string[];
  estimatedMinutes: number | null;
  unlocksLabels: string[];
  instructions: string | null;
  checklistItems: ChecklistItemData[];
  documentLinks: { name: string; url: string | null }[];
}

export function FocusCard({ task }: { task: FocusTaskData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [blockedOpen, setBlockedOpen] = useState(false);
  const [waitingOpen, setWaitingOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [reasonText, setReasonText] = useState("");
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [breakdownText, setBreakdownText] = useState("");

  function afterAction(message: string) {
    toast.success(message);
    router.refresh();
  }

  function markDone() {
    startTransition(async () => {
      await updateTaskStatus(task.id, "DONE");
      afterAction("Nice. Here's what's next.");
    });
  }

  function markBlocked() {
    startTransition(async () => {
      await updateTaskFields(task.id, { blockedReason: reasonText || undefined });
      await updateTaskStatus(task.id, "BLOCKED");
      setBlockedOpen(false);
      setReasonText("");
      afterAction("Marked blocked — logged for the Blockers page.");
    });
  }

  function markWaiting() {
    startTransition(async () => {
      await updateTaskFields(task.id, { waitingOn: reasonText || undefined });
      await updateTaskStatus(task.id, "WAITING_EXTERNAL");
      setWaitingOpen(false);
      setReasonText("");
      afterAction("Parked in Waiting — out of your way until it's actionable.");
    });
  }

  const firstOpenChecklistItem = task.checklistItems.find((c) => !c.done);

  return (
    <Card className="mx-auto w-full max-w-lg space-y-5 p-6 sm:p-8">
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-accent">{task.categoryName}</div>
        <h1 className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">{task.title}</h1>
      </div>

      <p className="text-sm text-muted-foreground">
        {task.reasons[0] ?? "This is the highest-value thing you can do right now."}
        {task.estimatedMinutes != null && ` · About ${estimatedTimeLabel(task.estimatedMinutes)}.`}
      </p>

      {task.unlocksLabels.length > 0 && (
        <div className="rounded-md bg-surface-muted px-3 py-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-medium text-foreground">
            <Unlock className="size-3.5" /> Unlocks
          </span>{" "}
          {task.unlocksLabels.join(", ")}
        </div>
      )}

      {task.instructions && (
        <div className="rounded-md border border-border bg-surface-muted px-3 py-3">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">How to do this</span>
          <InstructionsList text={task.instructions} />
        </div>
      )}

      {firstOpenChecklistItem && (
        <div className="rounded-md border border-dashed border-border-strong px-3 py-2 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Smallest next step</span>
          <div className="text-foreground">{firstOpenChecklistItem.title}</div>
        </div>
      )}

      {task.documentLinks.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Needed</span>
          {task.documentLinks.map((d, i) => (
            <div key={i} className="flex items-center gap-1.5 text-sm text-accent">
              <ExternalLink className="size-3.5" />
              {d.url ? (
                <a href={d.url} target="_blank" rel="noreferrer" className="hover:underline">
                  {d.name}
                </a>
              ) : (
                d.name
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Checklist</span>
        <ChecklistManager taskId={task.id} items={task.checklistItems} />
      </div>

      <div className="flex justify-center border-t border-border pt-4">
        <FocusTimer />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border pt-4">
        <Button onClick={markDone} disabled={pending} size="lg">
          <Check className="size-4" /> Done
        </Button>
        <Button variant="outline" onClick={() => setBlockedOpen(true)} disabled={pending}>
          <OctagonPause className="size-4" /> Blocked
        </Button>
        <Button variant="outline" onClick={() => setWaitingOpen(true)} disabled={pending}>
          <Clock3 className="size-4" /> Waiting
        </Button>
        <Button variant="ghost" size="sm" disabled={pending} onClick={() => setBreakdownOpen((o) => !o)}>
          <Hammer className="size-3.5" /> Break it down
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setNoteOpen(true)} disabled={pending}>
          <StickyNote className="size-3.5" /> Add note
        </Button>
      </div>

      {breakdownOpen && (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={breakdownText}
            onChange={(e) => setBreakdownText(e.target.value)}
            placeholder="Break this into a smaller step..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && breakdownText.trim()) {
                startTransition(async () => {
                  await addChecklistItem(task.id, breakdownText.trim());
                  setBreakdownText("");
                  router.refresh();
                });
              }
            }}
          />
        </div>
      )}

      <Dialog open={blockedOpen} onOpenChange={setBlockedOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What&apos;s blocking this?</DialogTitle>
          </DialogHeader>
          <Textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} placeholder="e.g. Waiting on the accountant to confirm..." rows={3} autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBlockedOpen(false)}>
              Cancel
            </Button>
            <Button onClick={markBlocked} disabled={pending}>
              Mark blocked
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={waitingOpen} onOpenChange={setWaitingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Who or what are you waiting on?</DialogTitle>
          </DialogHeader>
          <Input value={reasonText} onChange={(e) => setReasonText(e.target.value)} placeholder="e.g. Accountant" autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setWaitingOpen(false)}>
              Cancel
            </Button>
            <Button onClick={markWaiting} disabled={pending}>
              Mark waiting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a note</DialogTitle>
          </DialogHeader>
          <Textarea value={reasonText} onChange={(e) => setReasonText(e.target.value)} rows={3} autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoteOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={pending || !reasonText.trim()}
              onClick={() =>
                startTransition(async () => {
                  await addNoteEvidence(task.id, reasonText.trim());
                  setReasonText("");
                  setNoteOpen(false);
                  toast.success("Note added");
                })
              }
            >
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="text-center">
        <Link href={`/tasks/${task.id}`} className="focus-ring text-xs text-muted-foreground hover:text-foreground hover:underline">
          Open full task detail
        </Link>
      </div>
    </Card>
  );
}
