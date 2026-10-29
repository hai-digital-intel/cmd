import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/db/client";
import { uploadFilePath } from "@/lib/storage";

// Mirrors app/api/documents/[id]/file/route.ts's inline-safety rules exactly — see that file
// for why only these types are allowed to render inline rather than force-download.
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
  return name.replace(/[\r\n"]/g, "").slice(0, 200);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; versionId: string }> }) {
  const { id, versionId } = await params;
  const version = await prisma.documentVersion.findFirst({ where: { id: versionId, documentId: id } });
  if (!version?.filePath) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(uploadFilePath(version.filePath));
    const safeName = sanitizeFilename(version.originalFileName ?? `${version.versionLabel}`);
    const inlineSafe = version.mimeType != null && INLINE_SAFE_TYPES.has(version.mimeType);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": inlineSafe ? version.mimeType! : "application/octet-stream",
        "Content-Disposition": `${inlineSafe ? "inline" : "attachment"}; filename="${safeName}"`,
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}
