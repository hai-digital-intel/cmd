"use client";

import { useState, useTransition } from "react";
import { MessageSquareText, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { draftChaseMessage } from "@/lib/actions/blockers";
import { toast } from "sonner";

export function ChaseNowButton({ blockerId }: { blockerId: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [pending, startTransition] = useTransition();

  function openDialog() {
    setOpen(true);
    startTransition(async () => {
      setDraft(await draftChaseMessage(blockerId));
    });
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={openDialog}>
        <MessageSquareText className="size-3.5" /> Chase now
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Draft follow-up</DialogTitle>
            <DialogDescription>Nothing is sent automatically — copy this into email, WhatsApp, or wherever you actually talk to them.</DialogDescription>
          </DialogHeader>
          <Textarea value={pending ? "Drafting..." : draft} onChange={(e) => setDraft(e.target.value)} rows={10} className="font-mono text-xs" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                navigator.clipboard.writeText(draft);
                toast.success("Copied to clipboard");
              }}
            >
              <Copy className="size-3.5" /> Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
