"use client";

import { useState, useTransition } from "react";
import { FileText, Link as LinkIcon, StickyNote, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addNoteEvidence, addUrlEvidence } from "@/lib/actions/tasks";
import { formatDate } from "@/lib/utils";

export interface EvidenceData {
  id: string;
  type: "FILE" | "URL" | "NOTE";
  url: string | null;
  note: string | null;
  documentName: string | null;
  documentPath: string | null;
  createdAt: Date;
}

export function EvidenceManager({ taskId, evidence }: { taskId: string; evidence: EvidenceData[] }) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<"none" | "url" | "note">("none");
  const [value, setValue] = useState("");

  function submit() {
    if (!value.trim()) return;
    startTransition(async () => {
      if (mode === "url") await addUrlEvidence(taskId, value.trim());
      if (mode === "note") await addNoteEvidence(taskId, value.trim());
      setValue("");
      setMode("none");
    });
  }

  return (
    <div className="space-y-2">
      {evidence.length === 0 && mode === "none" && <p className="text-xs text-muted-foreground">No evidence attached yet.</p>}
      {evidence.map((e) => (
        <div key={e.id} className="flex items-start gap-2 rounded-md border border-border px-2.5 py-2 text-sm">
          {e.type === "FILE" && <FileText className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />}
          {e.type === "URL" && <LinkIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />}
          {e.type === "NOTE" && <StickyNote className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />}
          <div className="min-w-0 flex-1">
            {e.type === "URL" && e.url && (
              <a href={e.url} target="_blank" rel="noreferrer" className="focus-ring inline-flex items-center gap-1 truncate text-accent hover:underline">
                {e.url} <ExternalLink className="size-3" />
              </a>
            )}
            {e.type === "NOTE" && <span>{e.note}</span>}
            {e.type === "FILE" && <span>{e.documentName ?? "Uploaded document"}</span>}
            <div className="text-[11px] text-muted-foreground">{formatDate(e.createdAt)}</div>
          </div>
        </div>
      ))}

      {mode === "none" ? (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setMode("url")}>
            <Plus className="size-3.5" /> Link
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMode("note")}>
            <Plus className="size-3.5" /> Note
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            value={value}
            onChange={(ev) => setValue(ev.target.value)}
            placeholder={mode === "url" ? "https://..." : "What's the evidence?"}
            onKeyDown={(ev) => ev.key === "Enter" && submit()}
          />
          <Button size="sm" onClick={submit} disabled={pending || !value.trim()}>
            Add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMode("none")}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
