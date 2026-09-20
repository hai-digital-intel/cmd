import { NextResponse } from "next/server";
import { isValidBackupFile, BACKUP_SCHEMA_VERSION } from "@/lib/backupSchema";
import { writeAutomaticPreRestoreBackup, restoreFromBackupData } from "@/lib/backup";
import { logActivity } from "@/lib/actions/activity";
import { isSameOriginRequest } from "@/lib/sameOrigin";

export async function POST(req: Request) {
  // This wipes and replaces the entire database — block any request that didn't originate
  // from this app's own page (see lib/sameOrigin.ts for why that matters even single-user).
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed for this endpoint." }, { status: 403 });
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    return NextResponse.json({ error: "That file isn't valid JSON." }, { status: 400 });
  }

  if (!isValidBackupFile(parsed)) {
    return NextResponse.json({ error: "That doesn't look like a h.ai Setup Command Center backup file." }, { status: 400 });
  }

  if (parsed.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return NextResponse.json(
      { error: `Backup schema version ${parsed.schemaVersion} isn't compatible with this app's version ${BACKUP_SCHEMA_VERSION}.` },
      { status: 400 },
    );
  }

  const preRestoreFile = await writeAutomaticPreRestoreBackup();

  try {
    await restoreFromBackupData(parsed.data);
  } catch (e) {
    return NextResponse.json(
      { error: `Restore failed and was rolled back: ${e instanceof Error ? e.message : "unknown error"}. Your previous data is safe in data/backups/${preRestoreFile}.` },
      { status: 500 },
    );
  }

  await logActivity({ entityType: "System", action: "restored", summary: `Restored from backup exported ${parsed.exportedAt}.` });

  return NextResponse.json({ ok: true, preRestoreFile });
}
