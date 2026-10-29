"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  sendForProfessionalReview,
  markReviewChangesRequired,
  approveProfessionalReview,
  activateDocument,
  setApplicability,
  setLifecycleStatus,
} from "@/lib/actions/documents";
import type { DocumentLifecycleStatus, DocumentApplicabilityStatus } from "@/lib/types";

/**
 * Contextual next-action buttons for a document's detail page — what to do depends entirely
 * on where the document currently sits in the lifecycle, not a fixed toolbar.
 */
export function DocumentWorkflowActions({
  documentId,
  lifecycleStatus,
  applicabilityStatus,
  requiresProfessionalReview,
  requiresSignature,
}: {
  documentId: string;
  lifecycleStatus: DocumentLifecycleStatus;
  applicabilityStatus: DocumentApplicabilityStatus;
  requiresProfessionalReview: boolean;
  requiresSignature: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<void>, successMessage: string) {
    startTransition(async () => {
      await action();
      toast.success(successMessage);
    });
  }

  const buttons: React.ReactNode[] = [];

  if (applicabilityStatus === "NEEDS_CONFIRMATION") {
    buttons.push(
      <Button key="confirm-applicable" size="sm" disabled={pending} onClick={() => run(() => setApplicability(documentId, "APPLICABLE"), "Confirmed as applicable")}>
        Confirm applicable
      </Button>,
      <Button
        key="confirm-na"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => setApplicability(documentId, "NOT_APPLICABLE"), "Marked not applicable")}
      >
        Mark not applicable
      </Button>,
    );
  }

  if (lifecycleStatus === "NEEDS_CONFIRMATION") {
    buttons.push(
      <Button
        key="confirm-needed"
        size="sm"
        disabled={pending}
        onClick={() => run(() => setLifecycleStatus(documentId, "DRAFT_REQUIRED"), "Confirmed — now needs drafting")}
      >
        Confirmed — needs drafting
      </Button>,
    );
  }

  if (lifecycleStatus === "NOT_STARTED" || lifecycleStatus === "DRAFT_REQUIRED") {
    buttons.push(
      <Button key="start-drafting" size="sm" disabled={pending} onClick={() => run(() => setLifecycleStatus(documentId, "DRAFTING"), "Started drafting")}>
        Start drafting
      </Button>,
    );
  }

  if (lifecycleStatus === "DRAFTING" || lifecycleStatus === "CHANGES_REQUIRED") {
    buttons.push(
      <Button
        key="draft-complete"
        size="sm"
        disabled={pending}
        onClick={() => run(() => setLifecycleStatus(documentId, "DRAFT_COMPLETE"), "Marked draft complete")}
      >
        Mark draft complete
      </Button>,
    );
  }

  if (requiresProfessionalReview && (lifecycleStatus === "DRAFT_COMPLETE" || lifecycleStatus === "UNDER_INTERNAL_REVIEW")) {
    buttons.push(
      <Button key="send-review" size="sm" disabled={pending} onClick={() => run(() => sendForProfessionalReview(documentId), "Sent for professional review")}>
        Mark sent for review
      </Button>,
    );
  }

  if (lifecycleStatus === "UNDER_PROFESSIONAL_REVIEW" || lifecycleStatus === "PROFESSIONAL_REVIEW_REQUIRED") {
    buttons.push(
      <Button
        key="changes-required"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => run(() => markReviewChangesRequired(documentId), "Marked as changes required")}
      >
        Changes required
      </Button>,
      <Button key="approved" size="sm" disabled={pending} onClick={() => run(() => approveProfessionalReview(documentId), "Review approved")}>
        Review approved
      </Button>,
    );
  }

  if (lifecycleStatus === "CHANGES_REQUIRED" && requiresProfessionalReview) {
    buttons.push(
      <Button key="resend" size="sm" disabled={pending} onClick={() => run(() => sendForProfessionalReview(documentId), "Resent for review")}>
        Resend for review
      </Button>,
    );
  }

  if (!requiresSignature && !requiresProfessionalReview && (lifecycleStatus === "DRAFT_COMPLETE" || lifecycleStatus === "UNDER_INTERNAL_REVIEW")) {
    buttons.push(
      <Button key="activate" size="sm" disabled={pending} onClick={() => run(() => activateDocument(documentId), "Document activated")}>
        Activate
      </Button>,
    );
  }

  if (buttons.length === 0) return null;
  return <div className="flex flex-wrap gap-1.5">{buttons}</div>;
}
