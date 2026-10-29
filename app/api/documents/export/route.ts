import { NextResponse } from "next/server";
import { loadDocumentListItems } from "@/lib/data/documents";
import { buildExportTable, isExportKind, toCsv, toJsonRecords } from "@/lib/services/documentExport";

export const dynamic = "force-dynamic";

/** GET /api/documents/export?kind=register|launch-pack|review-queue|signature-queue|renewals&format=csv|json */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const format = searchParams.get("format") ?? "csv";

  if (!isExportKind(kind)) {
    return NextResponse.json({ error: "Unknown export kind" }, { status: 400 });
  }
  if (format !== "csv" && format !== "json") {
    return NextResponse.json({ error: "format must be csv or json" }, { status: 400 });
  }

  const table = buildExportTable(kind, await loadDocumentListItems());
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `hai-documents-${kind}-${dateStamp}.${format}`;

  const body = format === "csv" ? toCsv(table) : JSON.stringify(toJsonRecords(table), null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": format === "csv" ? "text/csv; charset=utf-8" : "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
