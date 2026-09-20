"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Download, Upload, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export function BackupRestore() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setConfirmOpen(true);
  }

  function confirmRestore() {
    if (!pendingFile) return;
    const formData = new FormData();
    formData.append("file", pendingFile);
    startTransition(async () => {
      const res = await fetch("/api/backup/import", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Restore failed");
      } else {
        toast.success("Restored from backup", { description: `Your previous data was saved to data/backups/${json.preRestoreFile}.` });
        router.refresh();
      }
      setConfirmOpen(false);
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Backup & restore</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Everything lives in ./data/hai-setup.db and ./storage/uploads. A JSON export covers all structured data —
          copy the storage folder separately to move uploaded files.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <a href="/api/backup/export" download>
            <Download className="size-4" /> Export JSON backup
          </a>
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="size-4" /> Restore from backup
        </Button>
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={onFileChosen} />
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-blocked" /> Replace all current data?
            </DialogTitle>
            <DialogDescription>
              This restores <strong>{pendingFile?.name}</strong> and replaces everything currently in the database. A
              safety backup of your current data is written automatically first, so this is reversible — but it
              overwrites what&apos;s here now.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmRestore} disabled={pending}>
              {pending ? "Restoring..." : "Restore and replace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
