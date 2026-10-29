import Link from "next/link";
import { FileText, ExternalLink, ShieldAlert } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LifecycleBadge, PriorityBadge, SignatureStatusBadge } from "@/components/documents/document-badges";
import { formatDate } from "@/lib/utils";
import type { DocumentListItem } from "@/lib/documentView";

/** Shared row for Register / Launch Pack / Vault — a compact link into the document's detail page. */
export function DocumentRow({ doc }: { doc: DocumentListItem }) {
  return (
    <Link href={`/documents/${doc.id}`}>
      <Card className="flex items-start justify-between gap-3 p-4 transition-colors hover:bg-surface-muted">
        <div className="flex min-w-0 gap-3">
          <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium text-foreground">{doc.name}</span>
              <PriorityBadge priority={doc.priority} />
              <LifecycleBadge status={doc.lifecycleStatus} />
              <SignatureStatusBadge status={doc.signatureStatus} />
              {doc.requiredForLaunch && <Badge variant="outline">Launch pack</Badge>}
              {doc.legalDisclaimer && <ShieldAlert className="size-3.5 text-waiting-foreground" aria-label="Not approved legal advice" />}
            </div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {doc.ownerName ?? "Unassigned"}
              {doc.reviewerName && ` · ${doc.reviewerName}`}
              {doc.expiryDate && ` · Expires ${formatDate(doc.expiryDate)}`}
              {doc.relatedTaskTitle && ` · ${doc.relatedTaskTitle}`}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {(doc.filePath || doc.externalUrl) && <ExternalLink className="size-3.5 text-muted-foreground" />}
        </div>
      </Card>
    </Link>
  );
}
