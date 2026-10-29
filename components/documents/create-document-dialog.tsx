"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDocument } from "@/lib/actions/documents";
import { DOCUMENT_FOLDERS } from "@/lib/documentTaxonomy";
import { DOCUMENT_PRIORITIES, DOCUMENT_REQUIREMENT_LEVELS, PROFESSIONAL_REVIEW_TYPES } from "@/lib/types";
import { professionalReviewTypeLabel } from "@/lib/documentFormatting";
import type { DocumentPriority, DocumentRequirementLevel, ProfessionalReviewType } from "@/lib/types";
import { toast } from "sonner";
import { validateUpload } from "@/lib/uploadPolicy";

export function CreateDocumentDialog({
  people,
  tasks,
  gates,
}: {
  people: { id: string; name: string }[];
  tasks: { id: string; title: string }[];
  gates: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(DOCUMENT_FOLDERS[0]!.key);
  const [priority, setPriority] = useState<DocumentPriority>("P1");
  const [requirementLevel, setRequirementLevel] = useState<DocumentRequirementLevel>("RECOMMENDED");
  const [requiredForLaunch, setRequiredForLaunch] = useState(false);
  const [launchGateId, setLaunchGateId] = useState("");
  const [requiresProfessionalReview, setRequiresProfessionalReview] = useState(false);
  const [professionalReviewType, setProfessionalReviewType] = useState<ProfessionalReviewType>("NONE");
  const [requiresSignature, setRequiresSignature] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [relatedTaskId, setRelatedTaskId] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setDescription("");
    setExternalUrl("");
    setOwnerId("");
    setRelatedTaskId("");
    setNotes("");
    setFile(null);
    setRequiredForLaunch(false);
    setLaunchGateId("");
    setRequiresProfessionalReview(false);
    setProfessionalReviewType("NONE");
    setRequiresSignature(false);
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0] ?? null;
    const refusal = picked ? validateUpload(picked) : null;
    if (refusal) {
      toast.error(refusal);
      e.target.value = "";
      setFile(null);
      return;
    }
    setFile(picked);
  }

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createDocument({
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        priority,
        requirementLevel,
        requiredForLaunch,
        launchGateId: requiredForLaunch && launchGateId ? launchGateId : undefined,
        requiresProfessionalReview,
        professionalReviewType: requiresProfessionalReview ? professionalReviewType : "NONE",
        requiresSignature,
        externalUrl: externalUrl.trim() || undefined,
        ownerId: ownerId || undefined,
        relatedTaskId: relatedTaskId || undefined,
        notes: notes.trim() || undefined,
        file,
      });
      reset();
      setOpen(false);
      toast.success("Added to the document register");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Add document
      </Button>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a document to the register</DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="doc-name">Name</Label>
            <Input id="doc-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-description">Why this matters (optional)</Label>
            <Textarea id="doc-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_FOLDERS.map((f) => (
                    <SelectItem key={f.key} value={f.key}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as DocumentPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Requirement level</Label>
              <Select value={requirementLevel} onValueChange={(v) => setRequirementLevel(v as DocumentRequirementLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_REQUIREMENT_LEVELS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replace(/_/g, " ")}
                    </SelectItem>
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
                <SelectTrigger>
                  <SelectValue placeholder="Pick a gate — otherwise it won't hold any gate back" />
                </SelectTrigger>
                <SelectContent>
                  {gates.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5 rounded-md border border-border p-3">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={requiresProfessionalReview}
                onChange={(e) => setRequiresProfessionalReview(e.target.checked)}
                className="size-4 rounded border-border-strong"
              />
              Requires professional review
            </label>
            {requiresProfessionalReview && (
              <Select value={professionalReviewType} onValueChange={(v) => setProfessionalReviewType(v as ProfessionalReviewType)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROFESSIONAL_REVIEW_TYPES.filter((t) => t !== "NONE").map((t) => (
                    <SelectItem key={t} value={t}>
                      {professionalReviewTypeLabel(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <label className="flex items-center gap-2 pt-1 text-sm text-foreground">
              <input type="checkbox" checked={requiresSignature} onChange={(e) => setRequiresSignature(e.target.checked)} className="size-4 rounded border-border-strong" />
              Requires signature
            </label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-file">File (stored locally in storage/uploads)</Label>
            <Input id="doc-file" type="file" onChange={(e) => pickFile(e)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-url">Or an external URL</Label>
            <Input id="doc-url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label>Related task</Label>
              <Select value={relatedTaskId} onValueChange={setRelatedTaskId}>
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
          <div className="space-y-1.5">
            <Label htmlFor="doc-notes">Notes</Label>
            <Textarea id="doc-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !name.trim()}>
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
