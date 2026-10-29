// Always render fresh — this is a live operational dashboard, not cacheable content.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ShieldAlert, FileText, History } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LifecycleBadge, PriorityBadge, ApplicabilityBadge, SignatureStatusBadge } from "@/components/documents/document-badges";
import { DocumentSignatories } from "@/components/documents/document-signatories";
import { DocumentWorkflowActions } from "@/components/documents/document-workflow-actions";
import { AddVersionDialog } from "@/components/documents/add-version-dialog";
import { EditDocumentDialog } from "@/components/documents/edit-document-dialog";
import { computeSignatureStatus } from "@/lib/services/documentGovernance";
import { documentFolderLabel } from "@/lib/documentTaxonomy";
import { professionalReviewTypeLabel } from "@/lib/documentFormatting";
import { formatDate, formatRelativeToNow } from "@/lib/utils";

export default async function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: {
      owner: true,
      relatedTask: true,
      relatedMilestone: true,
      relatedCategory: true,
      launchGate: true,
      versions: { orderBy: { createdAt: "desc" }, include: { createdBy: true } },
      signatories: { include: { person: true }, orderBy: { sortOrder: "asc" } },
      evidenceFor: { include: { task: true } },
      costItems: true,
      blockers: true,
    },
  });

  if (!doc) notFound();

  const [people, gates, activities] = await Promise.all([
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    prisma.launchGate.findMany({ select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
    prisma.activity.findMany({ where: { entityType: "Document", entityId: id }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);

  const signatureStatus = computeSignatureStatus(doc.requiresSignature, doc.signatories.map((s) => ({ personId: s.personId, signed: s.signed })));
  const openBlockers = doc.blockers.filter((b) => b.status === "OPEN");
  const nextVersionNumber = doc.versions.length + 1;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/documents" className="focus-ring inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Documents
      </Link>

      {doc.legalDisclaimer && (
        <Card className="border-waiting bg-waiting-bg/40 p-3 text-sm text-waiting-foreground">
          <div className="flex items-center gap-2 font-medium">
            <ShieldAlert className="size-4" /> Internal draft — not approved legal, tax, or professional advice
          </div>
          <p className="mt-1 text-xs">This document has not been reviewed and approved by a qualified professional. Do not rely on it as final until its status shows Active or Signed.</p>
        </Card>
      )}

      {/* Header */}
      <div className="space-y-3">
        <div className="text-xs font-medium uppercase tracking-wide text-accent">
          {documentFolderLabel(doc.category)}
          {doc.subcategory && ` / ${doc.subcategory}`}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{doc.name}</h1>
          <EditDocumentDialog
            documentId={doc.id}
            people={people.map((p) => ({ id: p.id, name: p.name }))}
            gates={gates}
            initial={{
              description: doc.description,
              reviewerName: doc.reviewerName,
              ownerId: doc.ownerId,
              requiredForLaunch: doc.requiredForLaunch,
              launchGateId: doc.launchGateId,
              requiresProfessionalReview: doc.requiresProfessionalReview,
              professionalReviewType: doc.professionalReviewType,
              requiresSignature: doc.requiresSignature,
              expiryDate: doc.expiryDate,
              reviewDueDate: doc.reviewDueDate,
              renewalReminderDate: doc.renewalReminderDate,
              notes: doc.notes,
            }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <PriorityBadge priority={doc.priority} />
          <LifecycleBadge status={doc.lifecycleStatus} />
          <ApplicabilityBadge status={doc.applicabilityStatus} />
          <SignatureStatusBadge status={signatureStatus} />
          {doc.requiredForLaunch && <Badge variant="outline">Launch pack{doc.launchGate ? ` · ${doc.launchGate.name}` : ""}</Badge>}
        </div>
      </div>

      {/* Why this matters */}
      {(doc.description || doc.triggerCondition) && (
        <Card className="space-y-1.5 p-4">
          <h2 className="text-sm font-semibold text-foreground">Why this matters</h2>
          {doc.description && <p className="text-sm text-muted-foreground">{doc.description}</p>}
          {doc.triggerCondition && (
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Applies when:</span> {doc.triggerCondition}
            </p>
          )}
        </Card>
      )}

      {/* Current state */}
      <Card className="space-y-2 p-4 text-sm">
        <h2 className="text-sm font-semibold text-foreground">Current state</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <dt className="text-muted-foreground">Owner</dt>
          <dd className="text-foreground">{doc.owner?.name ?? "Unassigned"}</dd>
          {doc.requiresProfessionalReview && (
            <>
              <dt className="text-muted-foreground">Reviewer</dt>
              <dd className="text-foreground">{doc.reviewerName ?? professionalReviewTypeLabel(doc.professionalReviewType)}</dd>
            </>
          )}
          {doc.version && (
            <>
              <dt className="text-muted-foreground">Current version</dt>
              <dd className="text-foreground">{doc.version}</dd>
            </>
          )}
          {doc.expiryDate && (
            <>
              <dt className="text-muted-foreground">Expires</dt>
              <dd className="text-foreground">{formatDate(doc.expiryDate)}</dd>
            </>
          )}
          {doc.reviewDueDate && (
            <>
              <dt className="text-muted-foreground">Review due</dt>
              <dd className="text-foreground">{formatDate(doc.reviewDueDate)}</dd>
            </>
          )}
          {doc.effectiveDate && (
            <>
              <dt className="text-muted-foreground">Effective since</dt>
              <dd className="text-foreground">{formatDate(doc.effectiveDate)}</dd>
            </>
          )}
        </dl>

        {(doc.filePath || doc.externalUrl) && (
          <Button asChild size="sm" variant="outline" className="mt-2">
            <a href={doc.filePath ? `/api/documents/${doc.id}/file` : doc.externalUrl!} target="_blank" rel="noreferrer">
              <FileText className="size-3.5" /> Open current file <ExternalLink className="size-3.5" />
            </a>
          </Button>
        )}

        {doc.notes && <p className="mt-2 text-sm text-muted-foreground">{doc.notes}</p>}
      </Card>

      {/* Actions */}
      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-foreground">Actions</h2>
        <DocumentWorkflowActions
          documentId={doc.id}
          lifecycleStatus={doc.lifecycleStatus}
          applicabilityStatus={doc.applicabilityStatus}
          requiresProfessionalReview={doc.requiresProfessionalReview}
          requiresSignature={doc.requiresSignature}
        />
        {doc.requiresSignature && (
          <div>
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Signatories</p>
            <DocumentSignatories
              documentId={doc.id}
              signatories={doc.signatories.map((s) => ({ personId: s.personId, personName: s.person.name, signed: s.signed }))}
              people={people.map((p) => ({ id: p.id, name: p.name }))}
            />
          </div>
        )}
        {openBlockers.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Open blockers</p>
            {openBlockers.map((b) => (
              <Link key={b.id} href="/blockers" className="block text-sm text-foreground hover:underline">
                {b.title}
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Related setup */}
      {(doc.relatedTask || doc.relatedMilestone || doc.costItems.length > 0 || doc.evidenceFor.length > 0) && (
        <Card className="space-y-1.5 p-4 text-sm">
          <h2 className="text-sm font-semibold text-foreground">Related setup</h2>
          {doc.relatedTask && (
            <Link href={`/tasks/${doc.relatedTask.id}`} className="block text-foreground hover:underline">
              Task: {doc.relatedTask.title}
            </Link>
          )}
          {doc.relatedMilestone && <p className="text-muted-foreground">Milestone: {doc.relatedMilestone.title}</p>}
          {doc.costItems.length > 0 && (
            <Link href="/costs" className="block text-foreground hover:underline">
              {doc.costItems.length} linked cost item{doc.costItems.length > 1 ? "s" : ""}
            </Link>
          )}
        </Card>
      )}

      {/* Versions */}
      <Card className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <History className="size-4" /> Versions
          </h2>
          <AddVersionDialog documentId={doc.id} nextSuggestedLabel={`v0.${nextVersionNumber}`} />
        </div>
        {doc.versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No versions yet.</p>
        ) : (
          <div className="space-y-2">
            {doc.versions.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2.5 text-sm">
                <div className="min-w-0">
                  <span className="font-medium text-foreground">{v.versionLabel}</span>
                  <span className="text-muted-foreground"> · {v.statusLabel} · {formatDate(v.createdAt)}</span>
                  {v.professionalReviewer && <p className="text-xs text-muted-foreground">Reviewed by {v.professionalReviewer}: {v.reviewOutcome ?? "pending"}</p>}
                  {v.notes && <p className="text-xs text-muted-foreground">{v.notes}</p>}
                </div>
                {v.filePath && (
                  <Button asChild size="sm" variant="ghost">
                    <a href={`/api/documents/${doc.id}/versions/${v.id}/file`} target="_blank" rel="noreferrer">
                      Open <ExternalLink className="size-3.5" />
                    </a>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Activity */}
      <Card className="space-y-2 p-4">
        <h2 className="text-sm font-semibold text-foreground">Activity</h2>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity logged yet.</p>
        ) : (
          <div className="space-y-1.5">
            {activities.map((a) => (
              <div key={a.id} className="flex items-baseline justify-between gap-2 text-sm">
                <span className="text-foreground">{a.summary}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatRelativeToNow(a.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
