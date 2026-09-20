#!/usr/bin/env node
/**
 * Full backup: zips the SQLite database plus every uploaded file in storage/uploads into
 * one archive under data/backups/. For structured-data-only portability (e.g. moving to a
 * different machine's fresh install), use `npm run dev` + Settings → Export JSON instead.
 */
import { existsSync, mkdirSync, createWriteStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZipArchive } from "archiver";

const rootDir = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const dbPath = path.join(rootDir, "data", "hai-setup.db");
const uploadsDir = path.join(rootDir, "storage", "uploads");
const backupsDir = path.join(rootDir, "data", "backups");

if (!existsSync(dbPath)) {
  console.error(`No database found at ${dbPath}. Run "npm run setup" first.`);
  process.exit(1);
}

mkdirSync(backupsDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outPath = path.join(backupsDir, `hai-full-backup-${timestamp}.zip`);
const output = createWriteStream(outPath);
const archive = new ZipArchive({ zlib: { level: 9 } });

output.on("close", () => {
  console.log(`\nFull backup written to:\n  ${outPath}\n  (${(archive.pointer() / 1024 / 1024).toFixed(2)} MB)`);
});

archive.on("warning", (err) => console.warn(err.message));
archive.on("error", (err) => {
  throw err;
});

archive.pipe(output);
archive.file(dbPath, { name: "hai-setup.db" });
if (existsSync(uploadsDir)) {
  archive.directory(uploadsDir, "storage/uploads");
}
archive.finalize();
