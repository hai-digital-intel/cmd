import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/db/client";
import { uploadFilePath } from "@/lib/storage";

// Only these types are safe to render inline in the browser. Anything else (especially
// text/html, image/svg+xml, application/xml, application/xhtml+xml) can carry an active
// script that would execute in this app's origin if opened inline — those are always forced
// to download as octet-stream instead, regardless of what the browser reported on upload.
const INLINE_SAFE_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "text/plain",
]);

function sanitizeFilename(name: string): string {
  // Strip characters that could break header parsing or inject additional headers.
  return name.replace(/[\r\n"]/g, "").slice(0, 200);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc?.filePath) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(uploadFilePath(doc.filePath));
    const safeName = sanitizeFilename(doc.originalFileName ?? doc.name);
    const inlineSafe = doc.mimeType != null && INLINE_SAFE_TYPES.has(doc.mimeType);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": inlineSafe ? doc.mimeType! : "application/octet-stream",
        "Content-Disposition": `${inlineSafe ? "inline" : "attachment"}; filename="${safeName}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}
