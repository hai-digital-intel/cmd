"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/client";
import type { PersonType } from "@/generated/prisma/client";

function refresh() {
  revalidatePath("/settings");
}

export async function createPerson(input: { name: string; type: PersonType; email?: string; isInternal?: boolean; notes?: string }) {
  const person = await prisma.person.create({ data: input });
  refresh();
  return person.id;
}

export async function updatePerson(id: string, input: { name?: string; type?: PersonType; email?: string; notes?: string }) {
  await prisma.person.update({ where: { id }, data: input });
  refresh();
}

export async function deletePerson(id: string) {
  await prisma.person.delete({ where: { id } });
  refresh();
}
