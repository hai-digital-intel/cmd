import Link from "next/link";
import { AlertTriangle, CalendarClock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LifecycleBadge } from "@/components/documents/document-badges";
import { formatDate, daysFromNow } from "@/lib/utils";
import type { DocumentListItem } from "@/lib/documentView";

interface DatedEntry {
  doc: DocumentListItem;
  label: string;
  date: Date;
}

/** Renewals & review dates (brief §41) — expiry, review-due, and renewal-reminder are kept as
 * visibly distinct labels rather than merged into one "due date," since conflating review
 * and expiry was an explicit thing the brief warned against. */
export function RenewalsList({ documents }: { documents: DocumentListItem[] }) {
  const entries: DatedEntry[] = [];
  for (const d of documents) {
    if (d.expiryDate) entries.push({ doc: d, label: "Expires", date: d.expiryDate });
    if (d.reviewDueDate) entries.push({ doc: d, label: "Review due", date: d.reviewDueDate });
    if (d.renewalReminderDate) entries.push({ doc: d, label: "Renewal reminder", date: d.renewalReminderDate });
  }
  entries.sort((a, b) => a.date.getTime() - b.date.getTime());

  if (entries.length === 0) {
    return <Card className="p-6 text-sm text-muted-foreground">No documents have expiry, review, or renewal dates set yet.</Card>;
  }

  return (
    <div className="space-y-2">
      {entries.map((e, i) => {
        const daysLeft = daysFromNow(e.date);
        const overdue = daysLeft < 0;
        const soon = !overdue && daysLeft <= 60;
        return (
          <Card key={`${e.doc.id}-${e.label}-${i}`} className="flex flex-wrap items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <Link href={`/documents/${e.doc.id}`} className="font-medium text-foreground hover:underline">
                {e.doc.name}
              </Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <LifecycleBadge status={e.doc.lifecycleStatus} />
                <span>{e.label} {formatDate(e.date)}</span>
              </div>
            </div>
            <Badge variant={overdue ? "blocked" : soon ? "waiting" : "outline"}>
              {overdue ? <AlertTriangle className="size-3" /> : <CalendarClock className="size-3" />}
              {overdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
            </Badge>
          </Card>
        );
      })}
    </div>
  );
}
