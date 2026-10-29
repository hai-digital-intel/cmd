"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LifecycleBadge, PriorityBadge } from "@/components/documents/document-badges";
import { professionalReviewTypeLabel } from "@/lib/documentFormatting";
import { sendForProfessionalReview, approveProfessionalReview, markReviewChangesRequired } from "@/lib/actions/documents";
import { formatDate } from "@/lib/utils";
import type { DocumentListItem } from "@/lib/documentView";

/** Professional Review Queue (brief §37/§67) — grouped by reviewer type, one-click actions. */
export function ReviewQueue({ documents }: { documents: DocumentListItem[] }) {
  const reviewable = documents.filter((d) => d.requiresProfessionalReview && d.applicabilityStatus !== "NOT_APPLICABLE");

  const readyToSend = reviewable.filter((d) => d.lifecycleStatus === "DRAFT_COMPLETE" || d.lifecycleStatus === "UNDER_INTERNAL_REVIEW");
  const awaitingReviewer = reviewable.filter((d) => d.lifecycleStatus === "UNDER_PROFESSIONAL_REVIEW" || d.lifecycleStatus === "PROFESSIONAL_REVIEW_REQUIRED");
  const changesRequired = reviewable.filter((d) => d.lifecycleStatus === "CHANGES_REQUIRED");
  const notYetDrafted = reviewable.filter((d) => !["DRAFT_COMPLETE", "UNDER_INTERNAL_REVIEW", "UNDER_PROFESSIONAL_REVIEW", "PROFESSIONAL_REVIEW_REQUIRED", "CHANGES_REQUIRED", "ACTIVE", "SIGNED", "READY_FOR_SIGNATURE", "PARTIALLY_SIGNED"].includes(d.lifecycleStatus));

  if (reviewable.length === 0) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">No documents in this register require professional review.</Card>
    );
  }

  return (
    <div className="space-y-6">
      {changesRequired.length > 0 && (
        <ReviewSection title="Changes required — needs rework" items={changesRequired} action="changes" />
      )}
      {awaitingReviewer.length > 0 && (
        <ReviewSection title="Awaiting reviewer" items={awaitingReviewer} action="review" />
      )}
      {readyToSend.length > 0 && (
        <ReviewSection title="Ready to send for review" items={readyToSend} action="send" />
      )}
      {notYetDrafted.length > 0 && (
        <ReviewSection title="Will need review once drafted" items={notYetDrafted} action="none" />
      )}
    </div>
  );
}

function ReviewSection({
  title,
  items,
  action,
}: {
  title: string;
  items: DocumentListItem[];
  action: "send" | "review" | "changes" | "none";
}) {
  const byReviewer = new Map<string, DocumentListItem[]>();
  for (const d of items) {
    const key = professionalReviewTypeLabel(d.professionalReviewType);
    byReviewer.set(key, [...(byReviewer.get(key) ?? []), d]);
  }

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-foreground">
        {title} <span className="font-normal text-muted-foreground">({items.length})</span>
      </h3>
      <div className="space-y-4">
        {Array.from(byReviewer.entries()).map(([reviewer, docs]) => (
          <div key={reviewer}>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">{reviewer}</p>
            <div className="space-y-2">
              {docs.map((d) => (
                <ReviewRow key={d.id} doc={d} action={action} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReviewRow({ doc, action }: { doc: DocumentListItem; action: "send" | "review" | "changes" | "none" }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
      <div className="min-w-0">
        <Link href={`/documents/${doc.id}`} className="font-medium text-foreground hover:underline">
          {doc.name}
        </Link>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <PriorityBadge priority={doc.priority} />
          <LifecycleBadge status={doc.lifecycleStatus} />
          {doc.reviewerName && <span>{doc.reviewerName}</span>}
          {doc.reviewSentDate && <span>Sent {formatDate(doc.reviewSentDate)}</span>}
          {doc.requiredForLaunch && <Badge variant="outline">Launch pack</Badge>}
        </div>
      </div>
      <div className="flex shrink-0 gap-1.5">
        {action === "send" && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await sendForProfessionalReview(doc.id);
                toast.success(`Sent '${doc.name}' for review`);
              })
            }
          >
            Mark sent for review
          </Button>
        )}
        {action === "review" && (
          <>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await markReviewChangesRequired(doc.id);
                  toast.success("Marked as changes required");
                })
              }
            >
              Changes required
            </Button>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await approveProfessionalReview(doc.id);
                  toast.success("Review approved");
                })
              }
            >
              Approved
            </Button>
          </>
        )}
        {action === "changes" && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await sendForProfessionalReview(doc.id);
                toast.success("Resent for review");
              })
            }
          >
            Resend for review
          </Button>
        )}
      </div>
    </Card>
  );
}
