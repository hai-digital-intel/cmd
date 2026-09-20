"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { slugify } from "@/lib/utils";
import { logActivity } from "@/lib/actions/activity";
import type { Phase } from "@/generated/prisma/client";
import type { TaskStatus, VerificationLevel } from "@/lib/types";

function refresh() {
  revalidatePath("/setup");
  revalidatePath("/");
  revalidatePath("/readiness");
  revalidatePath("/roadmap");
}

export async function createCategory(input: { name: string; description?: string; weight?: number }) {
  const key = slugify(input.name);
  const count = await prisma.category.count();
  const category = await prisma.category.create({
    data: { key: `${key}-${count}`, name: input.name, description: input.description, weight: input.weight ?? 1, sortOrder: count },
  });
  refresh();
  return category.id;
}

export async function createMilestone(input: {
  categoryId: string;
  title: string;
  description?: string;
  requiredForLaunch?: boolean;
  weight?: number;
  phase?: Phase;
}) {
  const count = await prisma.milestone.count({ where: { categoryId: input.categoryId } });
  const milestone = await prisma.milestone.create({
    data: {
      categoryId: input.categoryId,
      title: input.title,
      description: input.description,
      requiredForLaunch: input.requiredForLaunch ?? false,
      weight: input.weight ?? 1,
      phase: input.phase ?? "FOUNDATION",
      sortOrder: count,
    },
  });
  refresh();
  return milestone.id;
}

export interface CreateTaskInput {
  categoryId: string;
  milestoneId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  weight?: number;
  requiredForLaunch?: boolean;
  verificationLevel?: VerificationLevel;
  ownerId?: string;
  estimatedMinutes?: number;
  dueDate?: Date;
}

export async function createTask(input: CreateTaskInput) {
  const company = await prisma.company.findFirstOrThrow();
  const task = await prisma.task.create({
    data: {
      companyId: company.id,
      categoryId: input.categoryId,
      milestoneId: input.milestoneId,
      title: input.title,
      description: input.description,
      status: input.status ?? "NOT_STARTED",
      weight: input.weight ?? 1,
      requiredForLaunch: input.requiredForLaunch ?? false,
      verificationLevel: input.verificationLevel ?? "RECOMMENDED",
      ownerId: input.ownerId,
      estimatedMinutes: input.estimatedMinutes,
      dueDate: input.dueDate,
    },
  });
  await logActivity({ entityType: "Task", entityId: task.id, taskId: task.id, action: "created", summary: `Added task '${task.title}'.` });
  refresh();
  return task.id;
}

export async function deleteTask(taskId: string) {
  const task = await prisma.task.delete({ where: { id: taskId } });
  await logActivity({ entityType: "Task", action: "deleted", summary: `Deleted task '${task.title}'.` });
  refresh();
}
