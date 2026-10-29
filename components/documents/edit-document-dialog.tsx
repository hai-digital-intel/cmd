"use client";

import { useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateDocumentFields, deleteDocument } from "@/lib/actions/documents";
import { PROFESSIONAL_REVIEW_TYPES } from "@/lib/types";
import { professionalReviewTypeLabel } from "@/lib/documentFormatting";
import type { ProfessionalReviewType } from "@/lib/types";
import { toast } from "sonner";

const NO_GATE = "__none__"; // Radix Select forbids an empty-string item value

function toDateInput(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function EditDocumentDialog({
  documentId,
  initial,
  people,
  gates,
}: {
  documentId: string;
  initial: {
    description: string | null;
    reviewerName: string | null;
    ownerId: string | null;
    requiredForLaunch: boolean;
    launchGateId: string | null;
    requiresProfessionalReview: boolean;
    professionalReviewType: ProfessionalReviewType;
    requiresSignature: boolean;
    expiryDate: Date | null;
    reviewDueDate: Date | null;
    renewalReminderDate: Date | null;
    notes: string | null;
  };
  people: { id: string; name: string }[];
  gates: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState(initial.description ?? "");
  const [reviewerName, setReviewerName] = useState(initial.reviewerName ?? "");
  const [ownerId, setOwnerId] = useState(initial.ownerId ?? "");
  const [requiredForLaunch, setRequiredForLaunch] = useState(initial.requiredForLaunch);
  const [launchGateId, setLaunchGateId] = useState(initial.launchGateId ?? NO_GATE);
  const [requiresProfessionalReview, setRequiresProfessionalReview] = useState(initial.requiresProfessionalReview);
  const [professionalReviewType, setProfessionalReviewType] = useState<ProfessionalReviewType>(initial.professionalReviewType);
  const [requiresSignature, setRequiresSignature] = useState(initial.requiresSignature);
  const [expiryDate, setExpiryDate] = useState(toDateInput(initial.expiryDate));
  const [reviewDueDate, setReviewDueDate] = useState(toDateInput(initial.reviewDueDate));
  const [renewalReminderDate, setRenewalReminderDate] = useState(toDateInput(initial.renewalReminderDate));
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await updateDocumentFields(documentId, {
        description: description.trim() || null,
        reviewerName: reviewerName.trim() || null,
        ownerId: ownerId || null,
        requiredForLaunch,
        launchGateId: requiredForLaunch && launchGateId !== NO_GATE ? launchGateId : null,
        requiresProfessionalReview,
        professionalReviewType: requiresProfessionalReview ? professionalReviewType : "NONE",
        requiresSignature,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        reviewDueDate: reviewDueDate ? new Date(reviewDueDate) : null,
        renewalReminderDate: renewalReminderDate ? new Date(renewalReminderDate) : null,
        notes: notes.trim() || null,
      });
      setOpen(false);
      toast.success("Document updated");
    });
  }

  function remove() {
    if (!confirm("Remove this document from the register? This also deletes any uploaded files for it.")) return;
    startTransition(async () => {
      await deleteDocument(documentId);
      toast.success("Document removed");
      router.push("/documents");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <div className="flex gap-1.5">
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Pencil className="size-3.5" /> Edit
        </Button>
        <Button size="sm" variant="ghost" disabled={pending} onClick={remove} aria-label="Delete document">
          <Trash2 className="size-3.5" />
        </Button>
      </div>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit document</DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Why this matters</Label>
            <Textarea id="edit-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Owner</Label>
              <Select value={ownerId} onValueChange={setOwnerId}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
              <input type="checkbox" checked={requiredForLaunch} onChange={(e) => setRequiredForLaunch(e.target.checked)} className="size-4 rounded border-border-strong" />
              Required for launch
            </label>
          </div>
          {requiredForLaunch && (
            <div className="space-y-1.5">
              <Label>Launch gate it blocks</Label>
              <Select value={launchGateId} onValueChange={setLaunchGateId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_GATE}>No gate (counts toward launch health only)</SelectItem>
                  {gates.map((g) => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5 rounded-md border border-border p-3">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={requiresProfessionalReview} onChange={(e) => setRequiresProfessionalReview(e.target.checked)} className="size-4 rounded border-border-strong" />
              Requires professional review
            </label>
            {requiresProfessionalReview && (
              <>
                <Select value={professionalReviewType} onValueChange={(v) => setProfessionalReviewType(v as ProfessionalReviewType)}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROFESSIONAL_REVIEW_TYPES.filter((t) => t !== "NONE").map((t) => (
                      <SelectItem key={t} value={t}>{professionalReviewTypeLabel(t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input className="mt-1.5" value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} placeholder="Reviewer name, e.g. Al Tamimi & Co" />
              </>
            )}
            <label className="flex items-center gap-2 pt-1 text-sm text-foreground">
              <input type="checkbox" checked={requiresSignature} onChange={(e) => setRequiresSignature(e.target.checked)} className="size-4 rounded border-border-strong" />
              Requires signature
            </label>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-expiry">Expiry date</Label>
              <Input id="edit-expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-review-due">Review due</Label>
              <Input id="edit-review-due" type="date" value={reviewDueDate} onChange={(e) => setReviewDueDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-renewal">Renewal reminder</Label>
              <Input id="edit-renewal" type="date" value={renewalReminderDate} onChange={(e) => setRenewalReminderDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea id="edit-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
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
