// Always render fresh — this is a live operational dashboard, not cacheable content.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { Zap, Timer, Inbox } from "lucide-react";
import { computeReadinessOverview } from "@/lib/data/computed";
import { getCurrency } from "@/lib/data/settings";
import { summarizeCosts } from "@/lib/services/cost";
import { prisma } from "@/lib/db/client";
import { SummaryBar, buildSummaryStats } from "@/components/today/summary-bar";
import { NextActionCard, type NextActionCardData } from "@/components/today/next-action-card";
import { ArchiveCta } from "@/components/today/archive-cta";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function TodayPage() {
  const [overview, currency, costItems, waitingCount, inboxCount] = await Promise.all([
    computeReadinessOverview(),
    getCurrency(),
    prisma.costItem.findMany(),
    prisma.task.count({ where: { status: "WAITING_EXTERNAL" } }),
    prisma.note.count({ where: { status: "INBOX" } }),
  ]);

  const costSummary = summarizeCosts(costItems, currency);

  const nextActionIds = overview.nextActions.map((a) => a.task.id);
  const fullTasks = nextActionIds.length
    ? await prisma.task.findMany({
        where: { id: { in: nextActionIds } },
        include: {
          category: true,
          owner: true,
          dependents: { include: { task: { select: { title: true } } } },
        },
      })
    : [];
  const fullTaskById = new Map(fullTasks.map((t) => [t.id, t]));

  const nextActionCards: NextActionCardData[] = overview.nextActions.map((a) => {
    const full = fullTaskById.get(a.task.id);
    return {
      id: a.task.id,
      title: a.task.title,
      categoryName: full?.category.name ?? "",
      reasons: a.reasons,
      estimatedMinutes: a.task.estimatedMinutes,
      ownerName: full?.owner?.name ?? null,
      dueDate: a.task.dueDate,
      unlocksLabels: full?.dependents.map((d) => d.task.title) ?? [],
      status: a.task.status,
    };
  });

  const stats = buildSummaryStats({
    criticalPathReadiness: overview.criticalPath,
    projectedReadyDate: overview.projection.projectedReadyDate,
    openBlockerCount: await prisma.blocker.count({ where: { status: "OPEN" } }),
    waitingCount,
    spentToDate: costSummary.spentToDate,
    remainingCost: costSummary.expectedRemainingSetupSpend,
    currency,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">h.ai Setup Command Center</h1>
        <p className="mt-1 text-2xl font-semibold text-foreground sm:text-3xl">
          h.ai is <span className="text-accent">{Math.round(overview.overall)}%</span> setup-ready
        </p>
      </header>

      {overview.companyReady && <ArchiveCta />}

      <SummaryBar stats={stats} />

      <section>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold text-foreground">Your Next 3</h2>
          <Link href="/setup?filter=quick-wins" className="focus-ring inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline">
            <Zap className="size-3.5" /> 15-minute wins
          </Link>
        </div>

        {nextActionCards.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing is immediately actionable right now — everything open is either waiting on someone else or
              blocked. Check{" "}
              <Link href="/blockers" className="text-accent hover:underline">
                Blockers
              </Link>{" "}
              to see what to chase.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {nextActionCards.map((task) => (
              <NextActionCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/focus" className="focus-ring block">
          <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-muted">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Timer className="size-4" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Enter Focus Mode</div>
              <div className="text-xs text-muted-foreground">One task at a time, nothing else on screen.</div>
            </div>
          </Card>
        </Link>
        {inboxCount > 0 && (
          <Link href="/setup?tab=inbox" className="focus-ring block">
            <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-muted">
              <div className="flex size-9 items-center justify-center rounded-lg bg-waiting-bg text-waiting-foreground">
                <Inbox className="size-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">{inboxCount} captured note{inboxCount > 1 ? "s" : ""} to triage</div>
                <div className="text-xs text-muted-foreground">Turn quick captures into real tasks.</div>
              </div>
            </Card>
          </Link>
        )}
      </div>

      {overview.snapshot.tasks.length === 0 && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          No setup data yet.{" "}
          <Button asChild variant="link" size="sm">
            <Link href="/setup">Go to Setup</Link>
          </Button>{" "}
          to add your first category.
        </Card>
      )}
    </div>
  );
}