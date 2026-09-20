"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { logActivity } from "@/lib/actions/activity";
import type { CostStatus, CostType } from "@/lib/types";

function refresh() {
  revalidatePath("/costs");
  revalidatePath("/");
}

export interface CostInput {
  vendor: string;
  description?: string;
  categoryId?: string;
  amount: number;
  currency?: string;
  vat?: number;
  type: CostType;
  frequency?: string;
  status: CostStatus;
  paymentDate?: Date;
  renewalDate?: Date;
  relatedTaskId?: string;
  notes?: string;
}

export async function createCost(input: CostInput) {
  const cost = await prisma.costItem.create({ data: { ...input, currency: input.currency ?? "AED" } });
  await logActivity({ entityType: "Cost", entityId: cost.id, action: "created", summary: `Logged cost '${cost.vendor} — ${cost.description ?? ""}'.` });
  refresh();
  return cost.id;
}

export async function updateCost(costId: string, input: Partial<CostInput>) {
  await prisma.costItem.update({ where: { id: costId }, data: input });
  refresh();
}

export async function deleteCost(costId: string) {
  await prisma.costItem.delete({ where: { id: costId } });
  refresh();
}
