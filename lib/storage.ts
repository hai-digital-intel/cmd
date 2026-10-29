import "server-only";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { validateUpload } from "@/lib/uploadPolicy";

export const UPLOADS_DIR = path.join(process.cwd(), "storage", "uploads");

/**
 * Every uploaded file gets a server-generated uuid filename; the original name is stored
 * only as metadata in the Document row, never used as a filesystem path. This is the whole
 * path-traversal defense — there's no user-controlled path segment to sanitize because none
 * of the original name ever reaches the filesystem.
 */
function safeExtension(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  // Keep it short and alnum-only; anything weird just gets dropped.
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : "";
}

export async function saveUpload(file: File): Promise<{
  relativePath: string;
  originalFileName: string;
  fileSizeBytes: number;
  mimeType: string;
}> {
  const refusal = validateUpload(file);
  if (refusal) throw new Error(refusal);
  await mkdir(UPLOADS_DIR, { recursive: true });
  const id = randomUUID();
  const ext = safeExtension(file.name);
  const fileName = `${id}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOADS_DIR, fileName), buffer);
  return {
    relativePath: fileName,
    originalFileName: file.name,
    fileSizeBytes: buffer.byteLength,
    mimeType: file.type || "application/octet-stream",
  };
}

export async function deleteUpload(relativePath: string): Promise<void> {
  // relativePath is always a uuid-derived filename we generated — never user input — but we
  // still refuse to touch anything that isn't a plain filename, defense in depth.
  if (relativePath.includes("/") || relativePath.includes("\\") || relativePath.includes("..")) {
    throw new Error("Invalid stored file path.");
  }
  await unlink(path.join(UPLOADS_DIR, relativePath)).catch(() => {
    /* already gone — fine */
  });
}

export function uploadFilePath(relativePath: string): string {
  return path.join(UPLOADS_DIR, relativePath);
}
