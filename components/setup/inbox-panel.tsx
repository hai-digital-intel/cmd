"use client";

import { useState } from "react";
import { useTransition } from "react";
import { ArrowRight, Inbox, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConvertNoteDialog } from "@/components/setup/convert-note-dialog";
import { archiveNote } from "@/lib/actions/notes";
import { formatRelativeToNow } from "@/lib/utils";

export interface InboxNoteData {
  id: string;
  rawText: string;
  createdAt: Date;
}

export function InboxPanel({
  notes,
  categories,
  people,
}: {
  notes: InboxNoteData[];
  categories: { id: string; name: string; milestones: { id: string; title: string }[] }[];
  people: { id: string; name: string }[];
}) {
  const [activeNote, setActiveNote] = useState<InboxNoteData | null>(null);
  const [pending, startTransition] = useTransition();

  if (notes.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-2 p-10 text-center">
        <Inbox className="size-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Nothing captured. Press &ldquo;C&rdquo; anywhere to jot something down.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {notes.map((note) => (
        <Card key={note.id} className="flex items-start justify-between gap-3 p-3.5">
          <div className="min-w-0">
            <p className="text-sm text-foreground">{note.rawText}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Captured {formatRelativeToNow(note.createdAt)}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => startTransition(() => archiveNote(note.id))} disabled={pending} aria-label="Dismiss">
              <X className="size-3.5" />
            </Button>
            <Button size="sm" onClick={() => setActiveNote(note)}>
              Convert <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </Card>
      ))}

      {activeNote && (
        <ConvertNoteDialog
          noteId={activeNote.id}
          rawText={activeNote.rawText}
          categories={categories}
          people={people}
          open={!!activeNote}
          onOpenChange={(open) => !open && setActiveNote(null)}
        />
      )}
    </div>
  );
}
