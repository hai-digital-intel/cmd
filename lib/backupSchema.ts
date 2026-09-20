/** Bumped whenever the shape of a backup file changes in a way restore needs to know about. */
export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupFile {
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  data: Record<string, unknown[]>;
}

/** Tables included in a backup, in an order safe for sequential re-insertion (parents first). */
export const BACKUP_TABLE_ORDER = [
  "setting",
  "launchGate",
  "category",
  "company",
  "person",
  "ownership",
  "milestone",
  "milestoneDependency",
  "task",
  "taskDependency",
  "checklistItem",
  "document",
  "evidence",
  "costItem",
  "blocker",
  "blockerTask",
  "note",
  "activity",
  "weeklyReview",
  "snapshot",
  "portfolioItem",
] as const;

export function isValidBackupFile(value: unknown): value is BackupFile {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.schemaVersion === "number" &&
    typeof v.exportedAt === "string" &&
    typeof v.data === "object" &&
    v.data !== null
  );
}
