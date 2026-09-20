"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { saveUpload, deleteUpload } from "@/lib/storage";
import { logActivity } from "@/lib/actions/activity";

function refresh() {
  revalidatePath("/documents");
  revalidatePath("/");
}

export interface UploadDocumentInput {
  name: string;
  category: string;
  categoryId?: string;
  documentType?: string;
  version?: string;
  issueDate?: Date;
  expiryDate?: Date;
  renewalReminderDate?: Date;
  ownerId?: string;
  externalUrl?: string;
  notes?: string;
  relatedTaskId?: string;
  file?: File | null;
}

export async function createDocument(input: UploadDocumentInput) {
  let fileMeta: Awaited<ReturnType<typeof saveUpload>> | null = null;
  if (input.file && input.file.size > 0) {
    fileMeta = await saveUpload(input.file);
  }

  const doc = await prisma.document.create({
    data: {
      name: input.name,
      category: input.category,
      categoryId: input.categoryId,
      documentType: input.documentType,
      version: input.version ?? "1.0",
      issueDate: input.issueDate,
      expiryDate: input.expiryDate,
      renewalReminderDate: input.renewalReminderDate,
      ownerId: input.ownerId,
      externalUrl: input.externalUrl,
      notes: input.notes,
      relatedTaskId: input.relatedTaskId,
      filePath: fileMeta?.relativePath,
      originalFileName: fileMeta?.originalFileName,
      fileSizeBytes: fileMeta?.fileSizeBytes,
      mimeType: fileMeta?.mimeType,
    },
  });

  if (input.relatedTaskId) {
    await prisma.evidence.create({
      data: { taskId: input.relatedTaskId, type: fileMeta ? "FILE" : "URL", documentId: doc.id, url: input.externalUrl },
    });
  }

  await logActivity({ entityType: "Document", entityId: doc.id, action: "uploaded", summary: `Added document '${doc.name}' to the vault.` });
  refresh();
  return doc.id;
}

export async function deleteDocument(documentId: string) {
  const doc = await prisma.document.delete({ where: { id: documentId } });
  if (doc.filePath) await deleteUpload(doc.filePath);
  await logActivity({ entityType: "Document", entityId: documentId, action: "deleted", summary: `Removed document '${doc.name}' from the vault.` });
  refresh();
}

export async function replaceDocumentVersion(documentId: string, newVersion: string, file?: File | null) {
  const existing = await prisma.document.findUniqueOrThrow({ where: { id: documentId } });
  let fileMeta: Awaited<ReturnType<typeof saveUpload>> | null = null;
  if (file && file.size > 0) {
    fileMeta = await saveUpload(file);
    if (existing.filePath) await deleteUpload(existing.filePath);
  }
  await prisma.document.update({
    where: { id: documentId },
    data: {
      version: newVersion,
      ...(fileMeta
        ? {
            filePath: fileMeta.relativePath,
            originalFileName: fileMeta.originalFileName,
            fileSizeBytes: fileMeta.fileSizeBytes,
            mimeType: fileMeta.mimeType,
          }
        : {}),
    },
  });
  await logActivity({ entityType: "Document", entityId: documentId, action: "version_replaced", summary: `Updated '${existing.name}' to version ${newVersion}.` });
  refresh();
}
