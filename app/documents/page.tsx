// Always render fresh — this is a live operational dashboard, not cacheable content.
export const dynamic = "force-dynamic";

import { AlertTriangle, FolderOpen } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { UploadDocumentDialog } from "@/components/documents/upload-dialog";
import { DocumentCard, type DocumentCardData } from "@/components/documents/document-card";
import { Card } from "@/components/ui/card";

export default async function DocumentsPage() {
  const [documents, people, tasks] = await Promise.all([
    prisma.document.findMany({ include: { owner: true, relatedTask: true }, orderBy: { createdAt: "desc" } }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    prisma.task.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);

  const toCard = (d: (typeof documents)[number]): DocumentCardData => ({
    id: d.id,
    name: d.name,
    category: d.category,
    version: d.version,
    ownerName: d.owner?.name ?? null,
    expiryDate: d.expiryDate,
    filePath: d.filePath,
    externalUrl: d.externalUrl,
    relatedTaskId: d.relatedTaskId,
    relatedTaskTitle: d.relatedTask?.title ?? null,
    notes: d.notes,
  });

  const now = new Date();
  const expiringSoon = documents.filter((d) => d.expiryDate && (d.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24) <= 60);

  const byCategory = new Map<string, typeof documents>();
  for (const d of documents) {
    const list = byCategory.get(d.category) ?? [];
    list.push(d);
    byCategory.set(d.category, list);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Documents</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">The setup document registry. Files stay local to this machine.</p>
        </div>
        <UploadDocumentDialog people={people.map((p) => ({ id: p.id, name: p.name }))} tasks={tasks} />
      </header>

      {expiringSoon.length > 0 && (
        <Card className="border-waiting bg-waiting-bg/40 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-waiting-foreground">
            <AlertTriangle className="size-4" /> {expiringSoon.length} document{expiringSoon.length > 1 ? "s" : ""} need renewal attention
          </div>
          <div className="mt-2 space-y-1">
            {expiringSoon.map((d) => (
              <div key={d.id} className="text-sm text-muted-foreground">
                {d.name}
              </div>
            ))}
          </div>
        </Card>
      )}

      {documents.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <FolderOpen className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No documents yet. Add your first one — licence, agreement, or policy.</p>
        </Card>
      ) : (
        Array.from(byCategory.entries()).map(([category, docs]) => (
          <section key={category}>
            <h2 className="mb-2 text-sm font-semibold text-foreground">
              {category} <span className="font-normal text-muted-foreground">({docs.length})</span>
            </h2>
            <div className="space-y-2">
              {docs.map((d) => (
                <DocumentCard key={d.id} doc={toCard(d)} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}