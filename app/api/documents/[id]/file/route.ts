import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/db/client";
import { uploadFilePath } from "@/lib/storage";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc?.filePath) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const buffer = await readFile(uploadFilePath(doc.filePath));
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": doc.mimeType ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${(doc.originalFileName ?? doc.name).replace(/"/g, "")}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }
}
