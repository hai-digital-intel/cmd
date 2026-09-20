#!/usr/bin/env tsx
/**
 * CLI restore from a JSON backup (the same format Settings → Export JSON produces).
 * Always writes an automatic safety backup of current data before touching anything.
 * Usage: npm run restore -- path/to/backup.json [--yes]
 */
import "dotenv/config";
import { readFileSync } from "node:fs";
import readline from "node:readline";
import { isValidBackupFile, BACKUP_SCHEMA_VERSION } from "../lib/backupSchema";
import { writeAutomaticPreRestoreBackup, restoreFromBackupData } from "../lib/backup";

const filePath = process.argv[2];
const skipConfirm = process.argv.includes("--yes");

if (!filePath || filePath.startsWith("--")) {
  console.error("Usage: npm run restore -- path/to/backup.json [--yes]");
  process.exit(1);
}

let parsed: unknown;
try {
  parsed = JSON.parse(readFileSync(filePath, "utf-8"));
} catch (e) {
  console.error(`Could not read/parse ${filePath}: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
}

if (!isValidBackupFile(parsed)) {
  console.error("That doesn't look like a h.ai Setup Command Center backup file.");
  process.exit(1);
}

if (parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) {
  console.error(`Backup schema version ${parsed.schemaVersion} isn't compatible with this app's version ${BACKUP_SCHEMA_VERSION}.`);
  process.exit(1);
}

async function doRestore() {
  console.log("Writing a safety backup of current data first...");
  const preRestoreFile = await writeAutomaticPreRestoreBackup();
  console.log(`  saved to data/backups/${preRestoreFile}`);

  console.log("Restoring...");
  await restoreFromBackupData((parsed as { data: Record<string, unknown[]> }).data);
  console.log("\nRestore complete.");
}

if (skipConfirm) {
  doRestore();
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(`This replaces ALL current data with the contents of ${filePath}. Type "yes" to continue: `, (answer) => {
    rl.close();
    if (answer.trim().toLowerCase() === "yes") {
      doRestore();
    } else {
      console.log("Cancelled — nothing was changed.");
    }
  });
}
