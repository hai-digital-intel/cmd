import { NextResponse } from "next/server";
import { exportBackupData } from "@/lib/backup";

export async function GET() {
  const backup = await exportBackupData();
  const dateStamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="hai-setup-backup-${dateStamp}.json"`,
    },
  });
}
