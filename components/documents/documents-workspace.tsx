"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ClipboardList, ShieldCheck, PenLine, CalendarClock, Archive, FileStack } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CreateDocumentDialog } from "@/components/documents/create-document-dialog";
import { ExportMenu } from "@/components/documents/export-menu";
import { DocumentRow } from "@/components/documents/document-row";
import { ReviewQueue } from "@/components/documents/review-queue";
import { SignatureQueue } from "@/components/documents/signature-queue";
import { RenewalsList } from "@/components/documents/renewals-list";
import { documentFolderLabel, DOCUMENT_FOLDERS } from "@/lib/documentTaxonomy";
import { DOCUMENT_PRIORITIES } from "@/lib/types";
import type { DocumentPriority } from "@/lib/types";
import type { DocumentListItem, PersonOption } from "@/lib/documentView";
import type { LaunchDocumentHealth } from "@/lib/services/documentGovernance";

export interface DocumentStats {
  launchPackTotal: number;
  launchPackComplete: number;
  needsReview: number;
  needsSignature: number;
  expiringSoon: number;
}

export interface NextDocumentItem {
  doc: DocumentListItem;
  reason: string;
}

const HEALTH_VARIANT = { READY: "success", AT_RISK: "waiting", BLOCKED: "blocked" } as const;

export function DocumentsWorkspace({
  documents,
  people,
  tasks,
  gates,
  stats,
  nextDocuments,
  launchDocumentHealth,
}: {
  documents: DocumentListItem[];
  people: PersonOption[];
  tasks: { id: string; title: string }[];
  gates: { id: string; name: string }[];
  stats: DocumentStats;
  nextDocuments: NextDocumentItem[];
  launchDocumentHealth: LaunchDocumentHealth;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [priority, setPriority] = useState<DocumentPriority | "ALL">("ALL");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return documents.filter((d) => {
      if (category !== "ALL" && d.category !== category) return false;
      if (priority !== "ALL" && d.priority !== priority) return false;
      if (q) {
        const haystack = `${d.name} ${d.reviewerName ?? ""} ${d.notes ?? ""} ${d.categoryLabel}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [documents, search, category, priority]);

  const launchPack = useMemo(() => filtered.filter((d) => d.requiredForLaunch), [filtered]);
  const vault = useMemo(() => documents.filter((d) => d.filePath || d.externalUrl), [documents]);

  const byCategory = useMemo(() => groupByCategory(filtered), [filtered]);
  const launchPackByCategory = useMemo(() => groupByCategory(launchPack), [launchPack]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Documents</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            The document register, governance, and vault — what&apos;s required, where it lives, and what&apos;s blocking launch.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportMenu />
          <CreateDocumentDialog people={people} tasks={tasks} gates={gates} />
        </div>
      </header>

      <StatsBar stats={stats} launchDocumentHealth={launchDocumentHealth} />

      {nextDocuments.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Documents to produce next</h2>
          <div className="space-y-1.5">
            {nextDocuments.map(({ doc, reason }) => (
              <Link key={doc.id} href={`/documents/${doc.id}`} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface-muted">
                <span className="min-w-0 truncate font-medium text-foreground">{doc.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{reason}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Tabs defaultValue="register">
        <TabsList>
          <TabsTrigger value="register"><ClipboardList className="size-3.5" /> Register</TabsTrigger>
          <TabsTrigger value="launch-pack"><ShieldCheck className="size-3.5" /> Launch Pack</TabsTrigger>
          <TabsTrigger value="review"><FileStack className="size-3.5" /> Professional Review</TabsTrigger>
          <TabsTrigger value="signatures"><PenLine className="size-3.5" /> Signatures</TabsTrigger>
          <TabsTrigger value="renewals"><CalendarClock className="size-3.5" /> Renewals</TabsTrigger>
          <TabsTrigger value="vault"><Archive className="size-3.5" /> Vault</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="space-y-4">
          <FilterBar search={search} setSearch={setSearch} category={category} setCategory={setCategory} priority={priority} setPriority={setPriority} />
          <DocumentGroups groups={byCategory} emptyLabel="No documents match these filters." />
        </TabsContent>

        <TabsContent value="launch-pack" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The curated set of documents required before h.ai can legally, commercially, and securely take on clients — not simply every P0 item.
          </p>
          <DocumentGroups groups={launchPackByCategory} emptyLabel="No launch pack documents match these filters." />
        </TabsContent>

        <TabsContent value="review">
          <ReviewQueue documents={documents} />
        </TabsContent>

        <TabsContent value="signatures">
          <SignatureQueue documents={documents} people={people} />
        </TabsContent>

        <TabsContent value="renewals">
          <RenewalsList documents={documents} />
        </TabsContent>

        <TabsContent value="vault" className="space-y-2">
          {vault.length === 0 ? (
            <Card className="p-6 text-sm text-muted-foreground">No files uploaded or linked yet.</Card>
          ) : (
            vault.map((d) => <DocumentRow key={d.id} doc={d} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function groupByCategory(docs: DocumentListItem[]): Map<string, DocumentListItem[]> {
  const map = new Map<string, DocumentListItem[]>();
  for (const folder of DOCUMENT_FOLDERS) {
    const items = docs.filter((d) => d.category === folder.key);
    if (items.length) map.set(folder.key, items);
  }
  return map;
}

function DocumentGroups({ groups, emptyLabel }: { groups: Map<string, DocumentListItem[]>; emptyLabel: string }) {
  if (groups.size === 0) {
    return <Card className="p-6 text-sm text-muted-foreground">{emptyLabel}</Card>;
  }
  return (
    <div className="space-y-6">
      {Array.from(groups.entries()).map(([category, docs]) => (
        <section key={category}>
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            {documentFolderLabel(category)} <span className="font-normal text-muted-foreground">({docs.length})</span>
          </h2>
          <div className="space-y-2">
            {docs.map((d) => (
              <DocumentRow key={d.id} doc={d} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function FilterBar({
  search,
  setSearch,
  category,
  setCategory,
  priority,
  setPriority,
}: {
  search: string;
  setSearch: (v: string) => void;
  category: string;
  setCategory: (v: string) => void;
  priority: DocumentPriority | "ALL";
  setPriority: (v: DocumentPriority | "ALL") => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative min-w-48 flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents..." className="pl-8" />
      </div>
      <Select value={category} onValueChange={setCategory}>
        <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All categories</SelectItem>
          {DOCUMENT_FOLDERS.map((f) => (
            <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={priority} onValueChange={(v) => setPriority(v as DocumentPriority | "ALL")}>
        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All priorities</SelectItem>
          {DOCUMENT_PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function StatsBar({ stats, launchDocumentHealth }: { stats: DocumentStats; launchDocumentHealth: LaunchDocumentHealth }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <Badge variant={HEALTH_VARIANT[launchDocumentHealth.status]}>Launch documents: {launchDocumentHealth.status.replace("_", " ")}</Badge>
      <span className="text-muted-foreground">
        Launch Pack {stats.launchPackComplete}/{stats.launchPackTotal}
      </span>
      {stats.needsReview > 0 && <span className="text-muted-foreground">· Needs professional review: {stats.needsReview}</span>}
      {stats.needsSignature > 0 && <span className="text-muted-foreground">· Needs signature: {stats.needsSignature}</span>}
      {stats.expiringSoon > 0 && <span className="text-muted-foreground">· Expiring soon: {stats.expiringSoon}</span>}
    </div>
  );
}
