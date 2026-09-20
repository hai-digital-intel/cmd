"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import { logActivity } from "@/lib/actions/activity";

export async function setSetting(key: string, value: unknown) {
  await prisma.setting.upsert({
    where: { key },
    update: { value: JSON.stringify(value) },
    create: { key, value: JSON.stringify(value) },
  });
  revalidatePath("/", "layout");
}

/** Company Ready → Archive Setup Project (section 52/53). Never deletes anything. */
export async function archiveCompany() {
  await prisma.company.updateMany({ data: { archived: true, archivedAt: new Date() } });
  await setSetting("companyArchived", true);
  await logActivity({ entityType: "Company", action: "archived", summary: "h.ai setup marked operationally ready and archived." });
  revalidatePath("/", "layout");
}

export async function updateCompanyInfo(input: { name: string; tagline?: string; description?: string; website?: string; jurisdiction?: string }) {
  const company = await prisma.company.findFirst();
  if (!company) return;
  await prisma.company.update({ where: { id: company.id }, data: input });
  revalidatePath("/", "layout");
}

export async function reopenCompany() {
  await prisma.company.updateMany({ data: { archived: false, archivedAt: null } });
  await setSetting("companyArchived", false);
  await logActivity({ entityType: "Company", action: "reopened", summary: "Setup project reopened from archive." });
  revalidatePath("/", "layout");
}
