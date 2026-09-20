"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { logActivity } from "@/lib/actions/activity";
import { wouldCreateCycle, buildTaskIndex } from "@/lib/services/dependency";
import { loadDomainSnapshot } from "@/lib/data/domain";
import type { TaskStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/status";

function refresh(taskId?: string) {
  revalidatePath("/");
  revalidatePath("/setup");
  revalidatePath("/readiness");
  revalidatePath("/roadmap");
  revalidatePath("/roadmap/map");
  revalidatePath("/blockers");
  revalidatePath("/focus");
  revalidatePath("/activity");
  if (taskId) revalidatePath(`/tasks/${taskId}`);
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
  opts?: { overrideReason?: string },
) {
  const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId } });

  await prisma.task.update({
    where: { id: taskId },
    data: {
      status,
      completedAt: status === "DONE" ? new Date() : null,
      overrideReason: opts?.overrideReason ?? task.overrideReason,
    },
  });

  await logActivity({
    entityType: "Task",
    entityId: taskId,
    taskId,
    action: status === "DONE" ? "completed" : "status_changed",
    summary:
      status === "DONE"
        ? `Marked '${task.title}' as Done.`
        : task.status === "DONE"
          ? `Reopened '${task.title}' (${STATUS_LABELS[task.status]} → ${STATUS_LABELS[status]}).`
          : `Changed '${task.title}' from ${STATUS_LABELS[task.status]} to ${STATUS_LABELS[status]}.`,
    metadata: opts?.overrideReason ? { overrideReason: opts.overrideReason } : undefined,
  });

  refresh(taskId);
}

export async function setPriorityOverride(taskId: string, priority: number | null) {
  const task = await prisma.task.update({ where: { id: taskId }, data: { priorityOverride: priority } });
  await logActivity({
    entityType: "Task",
    entityId: taskId,
    taskId,
    action: "priority_overridden",
    summary:
      priority == null
        ? `Cleared manual priority on '${task.title}'.`
        : `Manually prioritized '${task.title}'.`,
  });
  refresh(taskId);
}

export interface TaskFieldUpdate {
  title?: string;
  description?: string | null;
  ownerId?: string | null;
  estimatedMinutes?: number | null;
  dueDate?: Date | null;
  waitingOn?: string | null;
  externalWaitUntil?: Date | null;
  blockedReason?: string | null;
  weight?: number;
  requiredForLaunch?: boolean;
  verificationLevel?: "REQUIRED" | "RECOMMENDED" | "OPTIONAL" | "NEEDS_VERIFICATION" | "NOT_APPLICABLE";
}

export async function updateTaskFields(taskId: string, data: TaskFieldUpdate) {
  await prisma.task.update({ where: { id: taskId }, data });
  refresh(taskId);
}

export async function addChecklistItem(taskId: string, title: string) {
  const count = await prisma.checklistItem.count({ where: { taskId } });
  await prisma.checklistItem.create({ data: { taskId, title, sortOrder: count } });
  refresh(taskId);
}

export async function toggleChecklistItem(itemId: string, done: boolean) {
  const item = await prisma.checklistItem.update({ where: { id: itemId }, data: { done } });
  refresh(item.taskId);
}

export async function deleteChecklistItem(itemId: string) {
  const item = await prisma.checklistItem.delete({ where: { id: itemId } });
  refresh(item.taskId);
}

export async function addTaskDependency(taskId: string, dependsOnId: string) {
  if (taskId === dependsOnId) throw new Error("A task cannot depend on itself.");
  const { tasks } = await loadDomainSnapshot();
  if (wouldCreateCycle(tasks, { taskId, dependsOnId })) {
    throw new Error("That would create a circular dependency.");
  }
  await prisma.taskDependency.create({ data: { taskId, dependsOnId } }).catch((e) => {
    if (String(e).includes("Unique constraint")) return; // already exists
    throw e;
  });
  refresh(taskId);
}

export async function removeTaskDependency(taskId: string, dependsOnId: string) {
  await prisma.taskDependency.deleteMany({ where: { taskId, dependsOnId } });
  refresh(taskId);
}

export async function addNoteEvidence(taskId: string, note: string) {
  await prisma.evidence.create({ data: { taskId, type: "NOTE", note } });
  await logActivity({ entityType: "Task", entityId: taskId, taskId, action: "evidence_added", summary: "Added a note as evidence." });
  refresh(taskId);
}

export async function addUrlEvidence(taskId: string, url: string) {
  await prisma.evidence.create({ data: { taskId, type: "URL", url } });
  await logActivity({ entityType: "Task", entityId: taskId, taskId, action: "evidence_added", summary: `Linked ${url} as evidence.` });
  refresh(taskId);
}

/** Guard used by dependency.ts consumers — exported for the task detail UI to check availability. */
export async function getTaskAvailability(taskId: string) {
  const { tasks } = await loadDomainSnapshot();
  const byId = buildTaskIndex(tasks);
  const task = byId.get(taskId);
  if (!task) return { actionable: false, blockedByIds: [] as string[] };
  const blockedByIds = task.dependsOnIds.filter((id) => {
    const dep = byId.get(id);
    return dep && dep.status !== "DONE" && dep.status !== "NOT_APPLICABLE";
  });
  return { actionable: blockedByIds.length === 0, blockedByIds };
}
