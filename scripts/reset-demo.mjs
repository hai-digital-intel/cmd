#!/usr/bin/env node
/**
 * DESTRUCTIVE: wipes the local database and re-seeds it with the starting demo plan.
 * For development/demo use only — never run this against data you care about.
 * Requires typing "yes" to confirm, unless --yes is passed (e.g. for scripted demo resets).
 */
import { existsSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(import.meta.url), "..", "..");
const dbPath = path.join(rootDir, "data", "hai-setup.db");
const skipConfirm = process.argv.includes("--yes");

console.log(`
  ############################################################
  #  WARNING: this DELETES all local h.ai setup data          #
  #  (tasks, documents metadata, costs, blockers, activity)   #
  #  and replaces it with the fresh demo seed.                #
  #  Uploaded files in storage/uploads are NOT deleted, but   #
  #  their document records will be gone.                     #
  ############################################################
`);

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", cwd: rootDir, shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function doReset() {
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    const file = dbPath + suffix;
    if (existsSync(file)) rmSync(file);
  }
  console.log("Deleted local database.");
  run("npx", ["prisma", "migrate", "deploy"]);
  run("npx", ["tsx", "prisma/seed.ts"]);
  console.log("\nDemo data reset complete.");
}

if (skipConfirm) {
  doReset();
} else {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question('Type "yes" to permanently reset local demo data: ', (answer) => {
    rl.close();
    if (answer.trim().toLowerCase() === "yes") {
      doReset();
    } else {
      console.log("Cancelled — nothing was changed.");
    }
  });
}
