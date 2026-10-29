import Link from "next/link";
import { Card } from "@/components/ui/card";
import { LifecycleBadge, SignatureStatusBadge } from "@/components/documents/document-badges";
import { DocumentSignatories } from "@/components/documents/document-signatories";
import { formatDate } from "@/lib/utils";
import type { DocumentListItem, PersonOption } from "@/lib/documentView";

export function SignatureQueue({ documents, people }: { documents: DocumentListItem[]; people: PersonOption[] }) {
  const needsSignature = documents.filter((d) => d.requiresSignature && d.applicabilityStatus !== "NOT_APPLICABLE");

  if (needsSignature.length === 0) {
    return <Card className="p-6 text-sm text-muted-foreground">No documents currently require a signature.</Card>;
  }

  const outstanding = needsSignature.filter((d) => d.signatureStatus !== "SIGNED");
  const fullySigned = needsSignature.filter((d) => d.signatureStatus === "SIGNED");

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">
          Outstanding <span className="font-normal text-muted-foreground">({outstanding.length})</span>
        </h3>
        <div className="space-y-2">
          {outstanding.map((d) => (
            <SignatureRow key={d.id} doc={d} people={people} />
          ))}
        </div>
      </section>
      {fullySigned.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold text-foreground">
            Fully signed <span className="font-normal text-muted-foreground">({fullySigned.length})</span>
          </h3>
          <div className="space-y-2">
            {fullySigned.map((d) => (
              <SignatureRow key={d.id} doc={d} people={people} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SignatureRow({ doc, people }: { doc: DocumentListItem; people: PersonOption[] }) {
  return (
    <Card className="space-y-2.5 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/documents/${doc.id}`} className="font-medium text-foreground hover:underline">
          {doc.name}
        </Link>
        <div className="flex items-center gap-1.5">
          <LifecycleBadge status={doc.lifecycleStatus} />
          <SignatureStatusBadge status={doc.signatureStatus} />
        </div>
      </div>
      <DocumentSignatories documentId={doc.id} signatories={doc.signatories} people={people} />
      {doc.effectiveDate && <p className="text-xs text-muted-foreground">Effective {formatDate(doc.effectiveDate)}</p>}
    </Card>
  );
}
