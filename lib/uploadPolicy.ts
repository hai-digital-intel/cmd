export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

/**
 * A document vault has no legitimate reason to hold runnable programs. Uploaded files are
 * already served as downloads (never executed by this app), but refusing them outright keeps
 * the vault from becoming a place to pass malware between machines.
 */
export const BLOCKED_EXTENSIONS: ReadonlySet<string> = new Set([
  "exe", "msi", "bat", "cmd", "com", "scr", "ps1", "psm1", "vbs", "vbe", "js", "jse", "wsf", "wsh",
  "jar", "sh", "lnk", "dll", "reg", "hta", "cpl",
]);

/** Returns a user-facing reason the file is refused, or null when it is acceptable. */
export function validateUpload(file: { name: string; size: number }): string | null {
  if (file.size > MAX_UPLOAD_BYTES) {
    return `"${file.name}" is larger than ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`;
  }
  const lastDot = file.name.lastIndexOf(".");
  const ext = lastDot >= 0 ? file.name.slice(lastDot + 1).toLowerCase() : "";
  if (ext && BLOCKED_EXTENSIONS.has(ext)) {
    return `".${ext}" files can't be stored in the document vault.`;
  }
  return null;
}
