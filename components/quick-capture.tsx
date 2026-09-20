"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { captureNote } from "@/lib/actions/notes";
import { toast } from "sonner";

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && ["INPUT", "TEXTAREA"].includes(target.tagName);
      if (!typing && e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function submit() {
    const value = text.trim();
    if (!value) return;
    startTransition(async () => {
      await captureNote(value);
      setText("");
      setOpen(false);
      toast.success("Captured", { description: "Find it later in Setup → Inbox, or convert it now from there." });
    });
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="icon"
        className="fixed bottom-20 right-5 z-30 size-12 rounded-full shadow-lg lg:bottom-6 lg:right-6"
        aria-label="Quick capture"
      >
        <Plus className="size-5" />
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (next) setTimeout(() => textareaRef.current?.focus(), 50);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick capture</DialogTitle>
            <DialogDescription>
              Get it out of your head. You can turn it into a task, blocker, or note later — this just needs to exist somewhere safe.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Need to ask accountant when our financial year ends."
            rows={4}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !text.trim()}>
              Capture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
