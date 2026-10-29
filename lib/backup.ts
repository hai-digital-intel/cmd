// Note: deliberately no `import "server-only"` here — this module is also loaded directly
// by scripts/restore.ts via tsx outside Next's bundler, where that guard throws unconditionally.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/db/client";
import { BACKUP_SCHEMA_VERSION, type BackupFile } from "@/lib/backupSchema";

const BACKUPS_DIR = path.join(process.cwd(), "data", "backups");

export async function exportBackupData(): Promise<BackupFile> {
  const data: Record<string, unknown[]> = {
    setting: await prisma.setting.findMany(),
    launchGate: await prisma.launchGate.findMany(),
    category: await prisma.category.findMany(),
    company: await prisma.company.findMany(),
    person: await prisma.person.findMany(),
    ownership: await prisma.ownership.findMany(),
    milestone: await prisma.milestone.findMany(),
    milestoneDependency: await prisma.milestoneDependency.findMany(),
    task: await prisma.task.findMany(),
    taskDependency: await prisma.taskDependency.findMany(),
    checklistItem: await prisma.checklistItem.findMany(),
    document: await prisma.document.findMany(),
    documentVersion: await prisma.documentVersion.findMany(),
    documentSignatory: await prisma.documentSignatory.findMany(),
    evidence: await prisma.evidence.findMany(),
    costItem: await prisma.costItem.findMany(),
    blocker: await prisma.blocker.findMany(),
    blockerTask: await prisma.blockerTask.findMany(),
    note: await prisma.note.findMany(),
    activity: await prisma.activity.findMany(),
    weeklyReview: await prisma.weeklyReview.findMany(),
    snapshot: await prisma.snapshot.findMany(),
    portfolioItem: await prisma.portfolioItem.findMany(),
  };

  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: "0.1.0",
    data,
  };
}

/** Always runs before a destructive restore so a bad import can be undone by hand. */
export async function writeAutomaticPreRestoreBackup(): Promise<string> {
  await mkdir(BACKUPS_DIR, { recursive: true });
  const backup = await exportBackupData();
  const fileName = `pre-restore-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
  await writeFile(path.join(BACKUPS_DIR, fileName), JSON.stringify(backup, null, 2));
  return fileName;
}

/**
 * Wipes and re-inserts every table from a validated backup, inside one transaction so a
 * failure partway through leaves the previous data intact rather than half-restored.
 * Children are deleted before parents and re-created after them.
 */
export async function restoreFromBackupData(data: Record<string, unknown[]>): Promise<void> {
  await prisma.$transaction(async (tx) => {
    // Delete in reverse dependency order.
    await tx.activity.deleteMany();
    await tx.blockerTask.deleteMany();
    await tx.blocker.deleteMany();
    await tx.evidence.deleteMany();
    await tx.costItem.deleteMany();
    await tx.documentSignatory.deleteMany();
    await tx.documentVersion.deleteMany();
    await tx.document.deleteMany();
    await tx.checklistItem.deleteMany();
    await tx.taskDependency.deleteMany();
    await tx.task.deleteMany();
    await tx.milestoneDependency.deleteMany();
    await tx.milestone.deleteMany();
    await tx.ownership.deleteMany();
    await tx.note.deleteMany();
    await tx.portfolioItem.deleteMany();
    await tx.weeklyReview.deleteMany();
    await tx.snapshot.deleteMany();
    await tx.person.deleteMany();
    await tx.company.deleteMany();
    await tx.category.deleteMany();
    await tx.launchGate.deleteMany();
    await tx.setting.deleteMany();

    // Re-create in dependency order (parents first).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const asRows = (key: string) => (Array.isArray(data[key]) ? (data[key] as any[]) : []);

    if (asRows("setting").length) await tx.setting.createMany({ data: asRows("setting") });
    if (asRows("launchGate").length) await tx.launchGate.createMany({ data: asRows("launchGate") });
    if (asRows("category").length) await tx.category.createMany({ data: asRows("category") });
    if (asRows("company").length) await tx.company.createMany({ data: asRows("company") });
    if (asRows("person").length) await tx.person.createMany({ data: asRows("person") });
    if (asRows("ownership").length) await tx.ownership.createMany({ data: asRows("ownership") });
    if (asRows("milestone").length) await tx.milestone.createMany({ data: asRows("milestone") });
    if (asRows("milestoneDependency").length) await tx.milestoneDependency.createMany({ data: asRows("milestoneDependency") });
    if (asRows("task").length) await tx.task.createMany({ data: asRows("task") });
    if (asRows("taskDependency").length) await tx.taskDependency.createMany({ data: asRows("taskDependency") });
    if (asRows("checklistItem").length) await tx.checklistItem.createMany({ data: asRows("checklistItem") });
    if (asRows("document").length) await tx.document.createMany({ data: asRows("document") });
    if (asRows("documentVersion").length) await tx.documentVersion.createMany({ data: asRows("documentVersion") });
    if (asRows("documentSignatory").length) await tx.documentSignatory.createMany({ data: asRows("documentSignatory") });
    if (asRows("evidence").length) await tx.evidence.createMany({ data: asRows("evidence") });
    if (asRows("costItem").length) await tx.costItem.createMany({ data: asRows("costItem") });
    if (asRows("blocker").length) await tx.blocker.createMany({ data: asRows("blocker") });
    if (asRows("blockerTask").length) await tx.blockerTask.createMany({ data: asRows("blockerTask") });
    if (asRows("note").length) await tx.note.createMany({ data: asRows("note") });
    if (asRows("activity").length) await tx.activity.createMany({ data: asRows("activity") });
    if (asRows("weeklyReview").length) await tx.weeklyReview.createMany({ data: asRows("weeklyReview") });
    if (asRows("snapshot").length) await tx.snapshot.createMany({ data: asRows("snapshot") });
    if (asRows("portfolioItem").length) await tx.portfolioItem.createMany({ data: asRows("portfolioItem") });
  });
}
