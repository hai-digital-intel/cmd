import { prisma } from "@/lib/db/client";

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.setting.findUnique({ where: { key } });
  if (!row) return fallback;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return fallback;
  }
}

export async function getCurrency(): Promise<string> {
  return getSetting("currency", "AED");
}

export async function isCompanyArchived(): Promise<boolean> {
  return getSetting("companyArchived", false);
}

export async function getMinutesPerDay(): Promise<number> {
  return getSetting("minutesPerDay", 120);
}
