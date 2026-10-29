"use client";

import { useState, useTransition } from "react";
import { FilePlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addDocumentVersion } from "@/lib/actions/documents";
import { toast } from "sonner";
import { validateUpload } from "@/lib/uploadPolicy";

/** Adds a new version — never overwrites the previous file, per the brief's versioning rule. */
export function AddVersionDialog({ documentId, nextSuggestedLabel }: { documentId: string; nextSuggestedLabel: string }) {
  const [open, setOpen] = useState(false);
  const [versionLabel, setVersionLabel] = useState(nextSuggestedLabel);
  const [statusLabel, setStatusLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

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
    if (!versionLabel.trim() || !statusLabel.trim()) return;
    startTransition(async () => {
      await addDocumentVersion(documentId, {
        versionLabel: versionLabel.trim(),
        statusLabel: statusLabel.trim(),
        notes: notes.trim() || undefined,
        file,
      });
      setNotes("");
      setFile(null);
      setOpen(false);
      toast.success(`Added version ${versionLabel.trim()}`);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <FilePlus className="size-3.5" /> Add version
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a new version</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="version-label">Version label</Label>
              <Input id="version-label" value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} placeholder="v0.2" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status-label">Status label</Label>
              <Input id="status-label" value={statusLabel} onChange={(e) => setStatusLabel(e.target.value)} placeholder="Sent to lawyer" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="version-file">File (optional — keeps the previous version&apos;s file if left blank)</Label>
            <Input id="version-file" type="file" onChange={(e) => pickFile(e)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="version-notes">Notes</Label>
            <Textarea id="version-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !versionLabel.trim() || !statusLabel.trim()}>
            Add version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
