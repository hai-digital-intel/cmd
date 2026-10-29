import { prisma } from "@/lib/db/client";
import { computeSignatureStatus } from "@/lib/services/documentGovernance";
import { documentFolderLabel } from "@/lib/documentTaxonomy";
import type { DocumentListItem } from "@/lib/documentView";

/** Loads every document with the relations the register, queues, and exports all need, flattened once. */
export async function loadDocumentListItems(): Promise<DocumentListItem[]> {
  const documents = await prisma.document.findMany({
    include: {
      owner: true,
      relatedTask: true,
      launchGate: true,
      signatories: { include: { person: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  return documents.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    category: d.category,
    categoryLabel: documentFolderLabel(d.category),
    subcategory: d.subcategory,
    priority: d.priority,
    requirementLevel: d.requirementLevel,
    lifecycleStatus: d.lifecycleStatus,
    applicabilityStatus: d.applicabilityStatus,
    triggerCondition: d.triggerCondition,
    requiredForLaunch: d.requiredForLaunch,
    launchGateName: d.launchGate?.name ?? null,
    requiresProfessionalReview: d.requiresProfessionalReview,
    professionalReviewType: d.professionalReviewType,
    reviewerName: d.reviewerName,
    reviewSentDate: d.reviewSentDate,
    reviewDueDate: d.reviewDueDate,
    requiresSignature: d.requiresSignature,
    signatureStatus: computeSignatureStatus(
      d.requiresSignature,
      d.signatories.map((s) => ({ personId: s.personId, signed: s.signed })),
    ),
    signatories: d.signatories.map((s) => ({ personId: s.personId, personName: s.person.name, signed: s.signed })),
    ownerId: d.ownerId,
    ownerName: d.owner?.name ?? null,
    relatedTaskId: d.relatedTaskId,
    relatedTaskTitle: d.relatedTask?.title ?? null,
    version: d.version,
    filePath: d.filePath,
    originalFileName: d.originalFileName,
    externalUrl: d.externalUrl,
    expiryDate: d.expiryDate,
    renewalReminderDate: d.renewalReminderDate,
    signedDate: d.signedDate,
    effectiveDate: d.effectiveDate,
    notes: d.notes,
    legalDisclaimer: d.legalDisclaimer,
    createdAt: d.createdAt,
  }));
}
