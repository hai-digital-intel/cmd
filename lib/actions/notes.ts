"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { logActivity } from "@/lib/actions/activity";

function refresh() {
  revalidatePath("/");
  revalidatePath("/setup");
  revalidatePath("/activity");
}

export async function captureNote(rawText: string) {
  const trimmed = rawText.trim();
  if (!trimmed) return;
  await prisma.note.create({ data: { rawText: trimmed, status: "INBOX" } });
  refresh();
}

export async function archiveNote(noteId: string) {
  await prisma.note.update({ where: { id: noteId }, data: { status: "ARCHIVED" } });
  refresh();
}

export interface ConvertNoteInput {
  title: string;
  description?: string;
  categoryId?: string;
  milestoneId: string;
  status: "NOT_STARTED" | "WAITING_EXTERNAL" | "NEEDS_CONFIRMATION";
  ownerId?: string;
  priorityOverride?: number;
  dueDate?: Date;
  waitingOn?: string;
}

/**
 * Turns an inbox capture into a real Task. If the founder marks it WAITING_EXTERNAL or
 * NEEDS_CONFIRMATION at conversion time, it lands straight in Waiting/Setup rather than
 * cluttering Next 3 — matching the acceptance scenario in the brief exactly.
 */
export async function convertNoteToTask(noteId: string, input: ConvertNoteInput) {
  const milestone = await prisma.milestone.findUniqueOrThrow({ where: { id: input.milestoneId } });
  const company = await prisma.company.findFirstOrThrow();

  const task = await prisma.task.create({
    data: {
      companyId: company.id,
      categoryId: input.categoryId ?? milestone.categoryId,
      milestoneId: input.milestoneId,
      title: input.title,
      description: input.description,
      status: input.status,
      requiredForLaunch: false,
      verificationLevel: input.status === "NEEDS_CONFIRMATION" ? "NEEDS_VERIFICATION" : "RECOMMENDED",
      ownerId: input.ownerId,
      priorityOverride: input.priorityOverride,
      dueDate: input.dueDate,
      waitingOn: input.waitingOn,
    },
  });

  await prisma.note.update({ where: { id: noteId }, data: { status: "CONVERTED", convertedTaskId: task.id } });
  await logActivity({
    entityType: "Note",
    entityId: noteId,
    taskId: task.id,
    action: "converted",
    summary: `Converted a captured note into task '${task.title}'.`,
  });

  refresh();
  return task.id;
}
