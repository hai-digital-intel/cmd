"use client";

import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createDocument } from "@/lib/actions/documents";
import { toast } from "sonner";

const DOCUMENT_CATEGORIES = ["Corporate", "Legal", "Finance", "Tax", "Governance", "Brand", "Contracts", "Policies", "Technology", "Security"];

export function UploadDocumentDialog({
  people,
  tasks,
}: {
  people: { id: string; name: string }[];
  tasks: { id: string; title: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [externalUrl, setExternalUrl] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [relatedTaskId, setRelatedTaskId] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createDocument({
        name: name.trim(),
        category: category!,
        externalUrl: externalUrl.trim() || undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        ownerId: ownerId || undefined,
        relatedTaskId: relatedTaskId || undefined,
        notes: notes.trim() || undefined,
        file,
      });
      setName("");
      setExternalUrl("");
      setExpiryDate("");
      setOwnerId("");
      setRelatedTaskId("");
      setNotes("");
      setFile(null);
      setOpen(false);
      toast.success("Document added");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Upload className="size-4" /> Add document
      </Button>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add document</DialogTitle>
        </DialogHeader>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">
          <div className="space-y-1.5">
            <Label htmlFor="doc-name">Name</Label>
            <Input id="doc-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="doc-expiry">Expiry date</Label>
              <Input id="doc-expiry" type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-file">File (stored locally in storage/uploads)</Label>
            <Input id="doc-file" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
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
