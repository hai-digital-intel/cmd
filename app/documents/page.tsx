// Always render fresh — this is a live operational dashboard, not cacheable content.
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/client";
import { computeReadinessOverview } from "@/lib/data/computed";
import { loadDocumentListItems } from "@/lib/data/documents";
import { selectNextDocuments } from "@/lib/services/documentPrioritization";
import { daysFromNow } from "@/lib/utils";
import { DocumentsWorkspace, type DocumentStats, type NextDocumentItem } from "@/components/documents/documents-workspace";

export default async function DocumentsPage() {
  const [items, people, tasks, gates, overview] = await Promise.all([
    loadDocumentListItems(),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    prisma.task.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
    prisma.launchGate.findMany({ select: { id: true, name: true }, orderBy: { sortOrder: "asc" } }),
    computeReadinessOverview(),
  ]);

  const itemsById = new Map(items.map((d) => [d.id, d]));

  const nextDocuments: NextDocumentItem[] = selectNextDocuments(overview.snapshot.documents, { limit: 5 })
    .map((r) => ({ doc: itemsById.get(r.documentId)!, reason: r.reason }))
    .filter((n) => n.doc);

  const stats: DocumentStats = {
    launchPackTotal: overview.launchDocumentHealth.totalLaunchCritical,
    launchPackComplete: overview.launchDocumentHealth.completedLaunchCritical,
    needsReview: items.filter(
      (d) => d.requiresProfessionalReview && d.applicabilityStatus !== "NOT_APPLICABLE" && !["ACTIVE", "SIGNED", "ARCHIVED", "SUPERSEDED"].includes(d.lifecycleStatus),
    ).length,
    needsSignature: items.filter((d) => d.requiresSignature && d.applicabilityStatus !== "NOT_APPLICABLE" && d.signatureStatus !== "SIGNED").length,
    expiringSoon: items.filter((d) => d.expiryDate && daysFromNow(d.expiryDate) <= 60).length,
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <DocumentsWorkspace
        documents={items}
        people={people.map((p) => ({ id: p.id, name: p.name }))}
        tasks={tasks}
        gates={gates}
        stats={stats}
        nextDocuments={nextDocuments}
        launchDocumentHealth={overview.launchDocumentHealth}
      />
    </div>
  );
}
