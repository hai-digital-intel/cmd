"use client";

import { useTransition } from "react";
import Link from "next/link";
import { ExternalLink, FileText, Trash2, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteDocument } from "@/lib/actions/documents";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export interface DocumentCardData {
  id: string;
  name: string;
  category: string;
  version: string | null;
  ownerName: string | null;
  expiryDate: Date | null;
  filePath: string | null;
  externalUrl: string | null;
  relatedTaskId: string | null;
  relatedTaskTitle: string | null;
  notes: string | null;
}

function expiryStatus(expiryDate: Date | null): "expired" | "soon" | null {
  if (!expiryDate) return null;
  const days = (expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 0) return "expired";
  if (days <= 60) return "soon";
  return null;
}

export function DocumentCard({ doc }: { doc: DocumentCardData }) {
  const [pending, startTransition] = useTransition();
  const expiry = expiryStatus(doc.expiryDate);

  return (
    <Card className="flex items-start justify-between gap-3 p-4">
      <div className="flex min-w-0 gap-3">
        <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-medium text-foreground">{doc.name}</span>
            {doc.version && <span className="text-xs text-muted-foreground">v{doc.version}</span>}
            {expiry && (
              <Badge variant={expiry === "expired" ? "blocked" : "waiting"}>
                <AlertTriangle className="size-3" /> {expiry === "expired" ? "Expired" : `Expires ${formatDate(doc.expiryDate)}`}
              </Badge>
            )}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {doc.ownerName ?? "Unassigned"}
            {doc.relatedTaskId && (
              <>
                {" · "}
                <Link href={`/tasks/${doc.relatedTaskId}`} className="hover:underline">
                  {doc.relatedTaskTitle}
                </Link>
              </>
            )}
          </div>
          {doc.notes && <p className="mt-1 text-xs text-muted-foreground">{doc.notes}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {(doc.filePath || doc.externalUrl) && (
          <Button asChild size="sm" variant="outline">
            <a href={doc.filePath ? `/api/documents/${doc.id}/file` : doc.externalUrl!} target="_blank" rel="noreferrer">
              Open <ExternalLink className="size-3.5" />
            </a>
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await deleteDocument(doc.id);
              toast.success("Document removed");
            })
          }
          aria-label="Delete document"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </Card>
  );
}
