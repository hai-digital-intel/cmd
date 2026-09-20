// Always render fresh — this is a live operational dashboard, not cacheable content.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { BlockerCard } from "@/components/blockers/blocker-card";
import { NewBlockerDialog } from "@/components/blockers/new-blocker-dialog";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function BlockersPage() {
  const [openBlockers, resolvedBlockers, waitingTasks, people, allTasks] = await Promise.all([
    prisma.blocker.findMany({
      where: { status: "OPEN" },
      include: { waitingOnPerson: true, relatedTasks: { include: { task: true } } },
      orderBy: { nextFollowUp: "asc" },
    }),
    prisma.blocker.findMany({
      where: { status: "RESOLVED" },
      include: { waitingOnPerson: true, relatedTasks: { include: { task: true } } },
      orderBy: { resolvedAt: "desc" },
      take: 20,
    }),
    prisma.task.findMany({ where: { status: "WAITING_EXTERNAL" }, include: { owner: true, category: true } }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    prisma.task.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Blockers</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">What&apos;s actually stopping progress, and who to chase.</p>
        </div>
        <NewBlockerDialog people={people.map((p) => ({ id: p.id, name: p.name }))} tasks={allTasks} />
      </header>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Open ({openBlockers.length})</h2>
        {openBlockers.length === 0 ? (
          <Card className="flex flex-col items-center gap-2 p-10 text-center">
            <CheckCircle2 className="size-6 text-success" />
            <p className="text-sm text-muted-foreground">Nothing is currently blocking launch.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {openBlockers.map((b) => (
              <BlockerCard
                key={b.id}
                blocker={{
                  id: b.id,
                  title: b.title,
                  description: b.description,
                  type: b.type,
                  waitingOnName: b.waitingOnPerson?.name ?? b.waitingOnText,
                  nextFollowUp: b.nextFollowUp,
                  startDate: b.startDate,
                  status: b.status,
                  relatedTasks: b.relatedTasks.map((rt) => ({ id: rt.task.id, title: rt.task.title })),
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Clock3 className="size-4" /> Waiting on others ({waitingTasks.length})
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Parked here so it doesn&apos;t clutter Your Next 3 — you can&apos;t move these forward yourself right now.
        </p>
        {waitingTasks.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nothing parked waiting on someone else.</Card>
        ) : (
          <div className="space-y-2">
            {waitingTasks.map((t) => (
              <Card key={t.id} className="flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <Link href={`/tasks/${t.id}`} className="focus-ring truncate text-sm font-medium text-foreground hover:underline">
                    {t.title}
                  </Link>
                  <div className="text-xs text-muted-foreground">
                    {t.category.name}
                    {t.waitingOn && ` · Waiting on ${t.waitingOn}`}
                  </div>
                </div>
                {t.externalWaitUntil && <span className="shrink-0 text-xs text-muted-foreground">Follow up {formatDate(t.externalWaitUntil)}</span>}
              </Card>
            ))}
          </div>
        )}
      </section>

      {resolvedBlockers.length > 0 && (
        <details>
          <summary className="focus-ring cursor-pointer list-none text-sm font-medium text-muted-foreground hover:text-foreground">
            {resolvedBlockers.length} resolved
          </summary>
          <div className="mt-3 space-y-3">
            {resolvedBlockers.map((b) => (
              <BlockerCard
                key={b.id}
                blocker={{
                  id: b.id,
                  title: b.title,
                  description: b.description,
                  type: b.type,
                  waitingOnName: b.waitingOnPerson?.name ?? b.waitingOnText,
                  nextFollowUp: b.nextFollowUp,
                  startDate: b.startDate,
                  status: b.status,
                  relatedTasks: b.relatedTasks.map((rt) => ({ id: rt.task.id, title: rt.task.title })),
                }}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}