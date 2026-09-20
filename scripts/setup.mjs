#!/usr/bin/env node
/**
 * Cross-platform setup: creates runtime directories, copies .env if missing, applies
 * migrations, and seeds initial data if the database is empty. Safe to run repeatedly —
 * every step here is idempotent and never overwrites existing user data.
 */
import { existsSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(fileURLToPath(import.meta.url), "..", "..");

function log(step, message) {
  console.log(`\n[${step}] ${message}`);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", cwd: rootDir, shell: process.platform === "win32" });
  if (result.status !== 0) {
    console.error(`\nCommand failed: ${command} ${args.join(" ")}`);
    process.exit(result.status ?? 1);
  }
}

log("1/5", "Checking runtime directories...");
for (const dir of ["data", "data/backups", "storage/uploads"]) {
  const full = path.join(rootDir, dir);
  if (!existsSync(full)) {
    mkdirSync(full, { recursive: true });
    console.log(`  created ${dir}/`);
  } else {
    console.log(`  ${dir}/ already exists`);
  }
}

log("2/5", "Checking environment file...");
const envPath = path.join(rootDir, ".env");
const envExamplePath = path.join(rootDir, ".env.example");
if (!existsSync(envPath)) {
  if (existsSync(envExamplePath)) {
    copyFileSync(envExamplePath, envPath);
    console.log("  created .env from .env.example");
  } else {
    writeFileSync(envPath, 'DATABASE_URL="file:./data/hai-setup.db"\n');
    console.log("  created a default .env");
  }
} else {
  console.log("  .env already exists — leaving it alone");
}

log("3/5", "Generating Prisma Client...");
run("npx", ["prisma", "generate"]);

log("4/5", "Applying database migrations (safe to re-run — never drops existing data)...");
run("npx", ["prisma", "migrate", "deploy"]);

log("5/5", "Seeding initial setup data if the database is empty...");
run("npx", ["tsx", "prisma/seed.ts"]);

console.log(`
Setup complete.

  Database:        ./data/hai-setup.db
  Uploaded files:   ./storage/uploads

Next:
  npm run dev
  Then open http://localhost:3000
`);
