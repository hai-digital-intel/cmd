"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { logActivity } from "@/lib/actions/activity";
import { createBlocker, resolveBlocker } from "@/lib/actions/blockers";
import { computeSignatureStatus } from "@/lib/services/documentGovernance";
import type {
  DocumentPriority,
  DocumentRequirementLevel,
  DocumentSourceType,
  DocumentLifecycleStatus,
  ProfessionalReviewType,
  DocumentApplicabilityStatus,
  BlockerType,
} from "@/lib/types";

function refresh(documentId?: string) {
  revalidatePath("/documents");
  revalidatePath("/");
  revalidatePath("/readiness");
  revalidatePath("/blockers");
  if (documentId) revalidatePath(`/documents/${documentId}`);
}

/** Which kind of blocker a pending professional review becomes, reusing the Blockers page's existing types. */
const REVIEW_TYPE_TO_BLOCKER_TYPE: Record<ProfessionalReviewType, BlockerType> = {
  NONE: "UNKNOWN",
  LAWYER: "LEGAL",
  IP_COUNSEL: "LEGAL",
  ACCOUNTANT: "ACCOUNTANT",
  TAX_ADVISER: "ACCOUNTANT",
  AUDITOR: "ACCOUNTANT",
  PRIVACY_SPECIALIST: "TECHNICAL",
  CYBERSECURITY_SPECIALIST: "TECHNICAL",
  INSURANCE_BROKER: "SUPPLIER",
  HR_EMPLOYMENT_SPECIALIST: "UNKNOWN",
  OTHER: "UNKNOWN",
};

const REVIEW_TYPE_LABEL: Record<ProfessionalReviewType, string> = {
  NONE: "the reviewer",
  LAWYER: "the lawyer",
  ACCOUNTANT: "the accountant",
  TAX_ADVISER: "the tax adviser",
  AUDITOR: "the auditor",
  PRIVACY_SPECIALIST: "the privacy specialist",
  CYBERSECURITY_SPECIALIST: "the security specialist",
  INSURANCE_BROKER: "the insurance broker",
  HR_EMPLOYMENT_SPECIALIST: "the HR/employment specialist",
  IP_COUNSEL: "IP counsel",
  OTHER: "the reviewer",
};

// ---------------------------------------------------------------------------
// Register: create / edit / delete
// ---------------------------------------------------------------------------

export interface CreateDocumentInput {
  name: string;
  description?: string;
  category: string; // one of lib/documentTaxonomy.ts's folder keys
  subcategory?: string;
  documentType?: string;
  sourceType?: DocumentSourceType;
  priority?: DocumentPriority;
  requirementLevel?: DocumentRequirementLevel;
  applicabilityStatus?: DocumentApplicabilityStatus;
  triggerCondition?: string;
  requiredForLaunch?: boolean;
  launchGateId?: string;
  requiresProfessionalReview?: boolean;
  professionalReviewType?: ProfessionalReviewType;
  reviewerName?: string;
  requiresSignature?: boolean;
  categoryId?: string;
  ownerId?: string;
  relatedTaskId?: string;
  relatedMilestoneId?: string;
  externalUrl?: string;
  notes?: string;
  legalDisclaimer?: boolean;
  expiryDate?: Date;
  reviewDueDate?: Date;
  renewalReminderDate?: Date;
  file?: File | null;
}

export async function createDocument(input: CreateDocumentInput) {
  let fileMeta: Awaited<ReturnType<typeof saveUpload>> | null = null;
  if (input.file && input.file.size > 0) {
    fileMeta = await saveUpload(input.file);
  }

  const doc = await prisma.document.create({
    data: {
      name: input.name,
      description: input.description,
      category: input.category,
      subcategory: input.subcategory,
      documentType: input.documentType,
      sourceType: input.sourceType ?? "COMPANY_CREATED",
      priority: input.priority ?? "P1",
      requirementLevel: input.requirementLevel ?? "RECOMMENDED",
      applicabilityStatus: input.applicabilityStatus ?? "APPLICABLE",
      triggerCondition: input.triggerCondition,
      requiredForLaunch: input.requiredForLaunch ?? false,
      launchGateId: input.launchGateId,
      requiresProfessionalReview: input.requiresProfessionalReview ?? false,
      professionalReviewType: input.professionalReviewType ?? "NONE",
      reviewerName: input.reviewerName,
      requiresSignature: input.requiresSignature ?? false,
      categoryId: input.categoryId,
      ownerId: input.ownerId,
      relatedTaskId: input.relatedTaskId,
      relatedMilestoneId: input.relatedMilestoneId,
      externalUrl: input.externalUrl,
      notes: input.notes,
      legalDisclaimer: input.legalDisclaimer ?? false,
      expiryDate: input.expiryDate,
      reviewDueDate: input.reviewDueDate,
      renewalReminderDate: input.renewalReminderDate,
      filePath: fileMeta?.relativePath,
      originalFileName: fileMeta?.originalFileName,
      fileSizeBytes: fileMeta?.fileSizeBytes,
      mimeType: fileMeta?.mimeType,
      lifecycleStatus: fileMeta ? "DRAFT_COMPLETE" : "NOT_STARTED",
      version: fileMeta ? "v1.0" : null,
    },
  });

  if (fileMeta) {
    await prisma.documentVersion.create({
      data: {
        documentId: doc.id,
        versionLabel: "v1.0",
        statusLabel: "Initial upload",
        isCurrent: true,
        filePath: fileMeta.relativePath,
        originalFileName: fileMeta.originalFileName,
        fileSizeBytes: fileMeta.fileSizeBytes,
        mimeType: fileMeta.mimeType,
      },
    });
  }

  if (input.relatedTaskId) {
    await prisma.evidence.create({
      data: { taskId: input.relatedTaskId, type: fileMeta ? "FILE" : "URL", documentId: doc.id, url: input.externalUrl },
    });
  }

  await logActivity({ entityType: "Document", entityId: doc.id, action: "created", summary: `Added '${doc.name}' to the register.` });
  refresh(doc.id);
  return doc.id;
}

export interface DocumentFieldUpdate {
  name?: string;
  description?: string | null;
  category?: string;
  subcategory?: string | null;
  documentType?: string | null;
  sourceType?: DocumentSourceType;
  priority?: DocumentPriority;
  requirementLevel?: DocumentRequirementLevel;
  triggerCondition?: string | null;
  requiredForLaunch?: boolean;
  launchGateId?: string | null;
  requiresProfessionalReview?: boolean;
  professionalReviewType?: ProfessionalReviewType;
  reviewerName?: string | null;
  requiresSignature?: boolean;
  ownerId?: string | null;
  relatedTaskId?: string | null;
  relatedMilestoneId?: string | null;
  externalUrl?: string | null;
  notes?: string | null;
  legalDisclaimer?: boolean;
  issueDate?: Date | null;
  effectiveDate?: Date | null;
  expiryDate?: Date | null;
  reviewDueDate?: Date | null;
  renewalReminderDate?: Date | null;
}

export async function updateDocumentFields(documentId: string, input: DocumentFieldUpdate) {
  await prisma.document.update({ where: { id: documentId }, data: input });
  refresh(documentId);
}

export async function deleteDocument(documentId: string) {
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: documentId }, include: { versions: true } });
  for (const v of doc.versions) {
    if (v.filePath) await deleteUpload(v.filePath);
  }
  await prisma.document.delete({ where: { id: documentId } });
  await logActivity({ entityType: "Document", action: "deleted", summary: `Removed '${doc.name}' from the register.` });
  refresh();
}

// ---------------------------------------------------------------------------
// Applicability / raw status (the escape hatch alongside the guided workflow below)
// ---------------------------------------------------------------------------

export async function setApplicability(documentId: string, applicabilityStatus: DocumentApplicabilityStatus, triggerCondition?: string) {
  const doc = await prisma.document.update({
    where: { id: documentId },
    data: { applicabilityStatus, triggerCondition },
  });
  await logActivity({
    entityType: "Document",
    entityId: documentId,
    action: "applicability_changed",
    summary: `Marked '${doc.name}' as ${applicabilityStatus.replace(/_/g, " ").toLowerCase()}.`,
  });
  refresh(documentId);
}

export async function setLifecycleStatus(documentId: string, status: DocumentLifecycleStatus) {
  const doc = await prisma.document.update({ where: { id: documentId }, data: { lifecycleStatus: status } });
  await logActivity({
    entityType: "Document",
    entityId: documentId,
    action: "status_changed",
    summary: `Changed '${doc.name}' status to ${status.replace(/_/g, " ").toLowerCase()}.`,
  });
  refresh(documentId);
}

// ---------------------------------------------------------------------------
// Versioning — never overwrites a previous version's file
// ---------------------------------------------------------------------------

export interface AddVersionInput {
  versionLabel: string;
  statusLabel: string;
  notes?: string;
  professionalReviewer?: string;
  reviewOutcome?: string;
  createdById?: string;
  file?: File | null;
}

export async function addDocumentVersion(documentId: string, input: AddVersionInput) {
  const existing = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  let fileMeta: Awaited<ReturnType<typeof saveUpload>> | null = null;
  if (input.file && input.file.size > 0) {
    fileMeta = await saveUpload(input.file);
  }

  await prisma.$transaction([
    prisma.documentVersion.updateMany({ where: { documentId }, data: { isCurrent: false } }),
    prisma.documentVersion.create({
      data: {
        documentId,
        versionLabel: input.versionLabel,
        statusLabel: input.statusLabel,
        isCurrent: true,
        filePath: fileMeta?.relativePath ?? existing.filePath,
        originalFileName: fileMeta?.originalFileName ?? existing.originalFileName,
        fileSizeBytes: fileMeta?.fileSizeBytes ?? existing.fileSizeBytes,
        mimeType: fileMeta?.mimeType ?? existing.mimeType,
        notes: input.notes,
        professionalReviewer: input.professionalReviewer,
        reviewOutcome: input.reviewOutcome,
        createdById: input.createdById,
      },
    }),
    prisma.document.update({
      where: { id: documentId },
      data: {
        version: input.versionLabel,
        ...(fileMeta
          ? { filePath: fileMeta.relativePath, originalFileName: fileMeta.originalFileName, fileSizeBytes: fileMeta.fileSizeBytes, mimeType: fileMeta.mimeType }
          : {}),
      },
    }),
  ]);

  await logActivity({ entityType: "Document", entityId: documentId, action: "version_added", summary: `Added version ${input.versionLabel} to '${existing.name}'.` });
  refresh(documentId);
}

// ---------------------------------------------------------------------------
// Professional review workflow
// ---------------------------------------------------------------------------

export async function sendForProfessionalReview(documentId: string, opts?: { reviewerName?: string; nextFollowUpDays?: number }) {
  const doc = await prisma.document.update({
    where: { id: documentId },
    data: {
      lifecycleStatus: "UNDER_PROFESSIONAL_REVIEW",
      reviewSentDate: new Date(),
      reviewerName: opts?.reviewerName || undefined,
      requiresProfessionalReview: true,
    },
  });

  const existingOpenBlocker = await prisma.blocker.findFirst({ where: { relatedDocumentId: documentId, status: "OPEN" } });
  if (!existingOpenBlocker) {
    const reviewerLabel = doc.reviewerName || REVIEW_TYPE_LABEL[doc.professionalReviewType];
    await createBlocker({
      title: `Waiting on ${reviewerLabel.replace(/^(the|IP counsel)\b\s?/, "") || "reviewer"} — ${doc.name}`,
      description: `'${doc.name}' was sent for professional review.`,
      type: REVIEW_TYPE_TO_BLOCKER_TYPE[doc.professionalReviewType],
      waitingOnText: doc.reviewerName ?? undefined,
      nextFollowUp: new Date(Date.now() + (opts?.nextFollowUpDays ?? 7) * 24 * 60 * 60 * 1000),
      relatedDocumentId: documentId,
    });
  }

  await logActivity({
    entityType: "Document",
    entityId: documentId,
    action: "sent_for_review",
    summary: `Sent '${doc.name}' to ${REVIEW_TYPE_LABEL[doc.professionalReviewType]} for review.`,
  });
  refresh(documentId);
}

export async function markReviewChangesRequired(documentId: string, notes?: string) {
  const doc = await prisma.document.update({
    where: { id: documentId },
    data: { lifecycleStatus: "CHANGES_REQUIRED", reviewOutcomeNotes: notes },
  });
  await logActivity({ entityType: "Document", entityId: documentId, action: "changes_required", summary: `Changes requested on '${doc.name}'.` });
  refresh(documentId);
}

export async function approveProfessionalReview(documentId: string, notes?: string) {
  const doc = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  const nextStatus: DocumentLifecycleStatus = doc.requiresSignature ? "READY_FOR_SIGNATURE" : "ACTIVE";

  await prisma.document.update({
    where: { id: documentId },
    data: {
      lifecycleStatus: nextStatus,
      approvedDate: new Date(),
      reviewOutcomeNotes: notes ?? doc.reviewOutcomeNotes,
      effectiveDate: nextStatus === "ACTIVE" ? (doc.effectiveDate ?? new Date()) : doc.effectiveDate,
    },
  });

  const openBlocker = await prisma.blocker.findFirst({ where: { relatedDocumentId: documentId, status: "OPEN" } });
  if (openBlocker) await resolveBlocker(openBlocker.id);

  await logActivity({ entityType: "Document", entityId: documentId, action: "review_approved", summary: `Review approved for '${doc.name}'.` });
  refresh(documentId);
}

// ---------------------------------------------------------------------------
// Signature tracking
// ---------------------------------------------------------------------------

export async function addSignatory(documentId: string, personId: string) {
  const count = await prisma.documentSignatory.count({ where: { documentId } });
  await prisma.documentSignatory
    .create({ data: { documentId, personId, sortOrder: count } })
    .catch((e) => {
      if (String(e).includes("Unique constraint")) return;
      throw e;
    });
  await prisma.document.update({ where: { id: documentId }, data: { requiresSignature: true } });
  refresh(documentId);
}

export async function removeSignatory(documentId: string, personId: string) {
  await prisma.documentSignatory.deleteMany({ where: { documentId, personId } });
  refresh(documentId);
}

export async function setSignatureStatus(documentId: string, personId: string, signed: boolean) {
  await prisma.documentSignatory.updateMany({
    where: { documentId, personId },
    data: { signed, signedDate: signed ? new Date() : null },
  });

  const doc = await prisma.document.findUniqueOrThrow({ where: { id: documentId }, include: { signatories: true } });
  const status = computeSignatureStatus(
    doc.requiresSignature,
    doc.signatories.map((s) => ({ personId: s.personId, signed: s.signed })),
  );

  if (status === "SIGNED") {
    await prisma.document.update({ where: { id: documentId }, data: { lifecycleStatus: "SIGNED", signedDate: new Date() } });
  } else if (status === "PARTIALLY_SIGNED" && ["READY_FOR_SIGNATURE", "PARTIALLY_SIGNED", "SIGNED"].includes(doc.lifecycleStatus)) {
    await prisma.document.update({ where: { id: documentId }, data: { lifecycleStatus: "PARTIALLY_SIGNED" } });
  }

  const person = await prisma.person.findUnique({ where: { id: personId } });
  await logActivity({
    entityType: "Document",
    entityId: documentId,
    action: signed ? "signature_added" : "signature_removed",
    summary: signed ? `${person?.name ?? "Someone"} signed '${doc.name}'.` : `${person?.name ?? "Someone"}'s signature removed from '${doc.name}'.`,
  });
  refresh(documentId);
}

// ---------------------------------------------------------------------------
// Activation — a deliberate, explicit step, never automatic
// ---------------------------------------------------------------------------

export async function activateDocument(documentId: string) {
  const existing = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  const doc = await prisma.document.update({
    where: { id: documentId },
    data: {
      lifecycleStatus: "ACTIVE",
      effectiveDate: existing.effectiveDate ?? new Date(),
    },
  });
  await logActivity({ entityType: "Document", entityId: documentId, action: "activated", summary: `'${doc.name}' is now active.` });
  refresh(documentId);
}
