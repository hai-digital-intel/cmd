"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { logActivity } from "@/lib/actions/activity";
import type { BlockerType } from "@/lib/types";

function refresh() {
  revalidatePath("/");
  revalidatePath("/blockers");
  revalidatePath("/readiness");
  revalidatePath("/activity");
  revalidatePath("/documents");
}

export interface CreateBlockerInput {
  title: string;
  description?: string;
  type: BlockerType;
  waitingOnPersonId?: string;
  waitingOnText?: string;
  nextFollowUp?: Date;
  relatedTaskIds?: string[];
  relatedDocumentId?: string;
}

export async function createBlocker(input: CreateBlockerInput) {
  const blocker = await prisma.blocker.create({
    data: {
      title: input.title,
      description: input.description,
      type: input.type,
      waitingOnPersonId: input.waitingOnPersonId,
      waitingOnText: input.waitingOnText,
      nextFollowUp: input.nextFollowUp,
      relatedDocumentId: input.relatedDocumentId,
    },
  });
  if (input.relatedTaskIds?.length) {
    await prisma.blockerTask.createMany({
      data: input.relatedTaskIds.map((taskId) => ({ blockerId: blocker.id, taskId })),
    });
    await prisma.task.updateMany({ where: { id: { in: input.relatedTaskIds } }, data: { status: "BLOCKED" } });
  }
  await logActivity({ entityType: "Blocker", entityId: blocker.id, action: "created", summary: `Logged blocker '${blocker.title}'.` });
  refresh();
  return blocker.id;
}

export async function resolveBlocker(blockerId: string) {
  const blocker = await prisma.blocker.update({
    where: { id: blockerId },
    data: { status: "RESOLVED", resolvedAt: new Date() },
  });
  await logActivity({ entityType: "Blocker", entityId: blockerId, action: "resolved", summary: `Resolved blocker '${blocker.title}'.` });
  refresh();
}

export async function updateBlockerFollowUp(blockerId: string, nextFollowUp: Date, notes?: string) {
  await prisma.blocker.update({
    where: { id: blockerId },
    data: { nextFollowUp, lastActionDate: new Date(), notes },
  });
  refresh();
}

/**
 * "Chase Now" — drafts a plain-text follow-up message from the blocker's context. Never
 * sends anything; the founder copies it into whatever channel she actually uses.
 */
export async function draftChaseMessage(blockerId: string): Promise<string> {
  const blocker = await prisma.blocker.findUniqueOrThrow({
    where: { id: blockerId },
    include: { waitingOnPerson: true, relatedTasks: { include: { task: true } }, relatedDocument: true },
  });
  const who = blocker.waitingOnPerson?.name ?? blocker.waitingOnText ?? "there";
  const items = [
    ...blocker.relatedTasks.map((rt) => `- ${rt.task.title}`),
    ...(blocker.relatedDocument ? [`- ${blocker.relatedDocument.name}`] : []),
  ];
  const taskList = items.join("\n");
  const daysOpen = Math.max(1, Math.round((Date.now() - blocker.startDate.getTime()) / (1000 * 60 * 60 * 24)));

  return `Hi ${who.replace(/\s*\(TBD\)\s*$/, "")},

Following up on: ${blocker.title}${blocker.description ? `\n${blocker.description}` : ""}

This has been open for ${daysOpen} day${daysOpen === 1 ? "" : "s"} and is holding up:
${taskList || "- (no linked tasks)"}

Could you let me know the current status or what's needed from our side to move it forward?

Thanks,
Haya`;
}
