"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { PenLine, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addSignatory, removeSignatory, setSignatureStatus } from "@/lib/actions/documents";
import type { PersonOption } from "@/lib/documentView";

/** Signatory chips + add-signatory control — shared by the Signatures queue and the document detail page. */
export function DocumentSignatories({
  documentId,
  signatories,
  people,
  compact = false,
}: {
  documentId: string;
  signatories: { personId: string; personName: string; signed: boolean }[];
  people: PersonOption[];
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [addingId, setAddingId] = useState("");
  const available = people.filter((p) => !signatories.some((s) => s.personId === p.id));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {signatories.map((s) => (
          <div key={s.personId} className="flex items-center gap-0.5">
            <Button
              size="sm"
              variant={s.signed ? "default" : "outline"}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await setSignatureStatus(documentId, s.personId, !s.signed);
                  toast.success(s.signed ? `${s.personName}'s signature removed` : `${s.personName} signed`);
                })
              }
            >
              <PenLine className="size-3.5" />
              {s.personName}
              {s.signed ? " · Signed" : " · Not signed"}
            </Button>
            {!compact && (
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                aria-label={`Remove ${s.personName} as signatory`}
                onClick={() => startTransition(async () => { await removeSignatory(documentId, s.personId); })}
              >
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        ))}
        {signatories.length === 0 && <span className="text-xs text-muted-foreground">No signatories added yet.</span>}
      </div>

      {available.length > 0 && (
        <div className="flex items-center gap-1.5">
          <Select value={addingId} onValueChange={setAddingId}>
            <SelectTrigger className="h-8 w-48 text-xs">
              <SelectValue placeholder="Add a signatory..." />
            </SelectTrigger>
            <SelectContent>
              {available.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="outline"
            disabled={!addingId || pending}
            onClick={() =>
              startTransition(async () => {
                await addSignatory(documentId, addingId);
                setAddingId("");
              })
            }
          >
            Add
          </Button>
        </div>
      )}
    </div>
  );
}
