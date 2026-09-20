// Always render fresh — this is a live operational dashboard, not cacheable content.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { Map as MapIcon, CheckCircle2, Lock, Clock3, CircleDot, CircleDashed } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { computeReadinessOverview } from "@/lib/data/computed";
import { computeMilestoneCompletion } from "@/lib/services/launchGates";
import { computeMilestoneNodeStatus, MILESTONE_STATUS_LABEL, type MilestoneNodeStatus } from "@/lib/services/milestoneStatus";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

const PHASES = ["FOUNDATION", "LEGAL_FINANCE", "BRAND_DIGITAL", "COMMERCIAL_INFRASTRUCTURE", "OPERATIONAL_READINESS", "LAUNCH_READY"] as const;
const PHASE_LABELS: Record<(typeof PHASES)[number], string> = {
  FOUNDATION: "Foundation",
  LEGAL_FINANCE: "Legal & Finance",
  BRAND_DIGITAL: "Brand & Digital",
  COMMERCIAL_INFRASTRUCTURE: "Commercial Infrastructure",
  OPERATIONAL_READINESS: "Operational Readiness",
  LAUNCH_READY: "Launch Ready",
};

const STATUS_META: Record<MilestoneNodeStatus, { icon: typeof CheckCircle2; variant: "success" | "blocked" | "waiting" | "progress" | "default" | "outline" }> = {
  DONE: { icon: CheckCircle2, variant: "success" },
  BLOCKED: { icon: Lock, variant: "blocked" },
  WAITING: { icon: Clock3, variant: "waiting" },
  IN_PROGRESS: { icon: CircleDot, variant: "progress" },
  AVAILABLE: { icon: CircleDot, variant: "outline" },
  NOT_STARTED: { icon: CircleDashed, variant: "default" },
};

export default async function RoadmapPage() {
  const [overview, milestonesRaw] = await Promise.all([
    computeReadinessOverview(),
    prisma.milestone.findMany({
      include: {
        category: true,
        dependsOn: { select: { dependsOnId: true } },
      },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  const tasks = overview.snapshot.tasks;
  const completionByMilestoneId = new Map(
    milestonesRaw.map((m) => [m.id, computeMilestoneCompletion({ id: m.id }, tasks).complete]),
  );

  const milestonesWithStatus = milestonesRaw.map((m) => ({
    ...m,
    status: computeMilestoneNodeStatus(
      { id: m.id },
      tasks,
      m.dependsOn.map((d) => d.dependsOnId),
      completionByMilestoneId,
    ),
  }));

  const byPhase = new Map<(typeof PHASES)[number], typeof milestonesWithStatus>();
  for (const phase of PHASES) byPhase.set(phase, []);
  for (const m of milestonesWithStatus) {
    byPhase.get(m.phase)?.push(m);
  }

  const projection = overview.projection;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Roadmap</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Setup progression, phase by phase.</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/roadmap/map">
            <MapIcon className="size-4" /> Dependency map
          </Link>
        </Button>
      </header>

      <Card className="p-5">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Projected ready</div>
        <div className="mt-1 text-2xl font-semibold text-foreground">{formatDate(projection.projectedReadyDate)}</div>
        <p className="mt-1.5 text-sm text-muted-foreground">{projection.explanation}</p>
        <p className="mt-2 text-xs text-muted-foreground">This is an estimate based on remaining critical-path effort — not a guarantee.</p>
      </Card>

      <div className="space-y-6">
        {PHASES.map((phase) => {
          const milestones = byPhase.get(phase) ?? [];
          if (milestones.length === 0) return null;
          return (
            <section key={phase}>
              <h2 className="mb-3 text-sm font-semibold text-foreground">{PHASE_LABELS[phase]}</h2>
              <div className="space-y-2">
                {milestones.map((m) => {
                  const meta = STATUS_META[m.status];
                  const Icon = meta.icon;
                  return (
                    <Card key={m.id} className="flex items-center gap-3 p-3.5">
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-foreground">{m.title}</div>
                        <div className="text-xs text-muted-foreground">{m.category.name}</div>
                      </div>
                      <Badge variant={meta.variant}>{MILESTONE_STATUS_LABEL[m.status]}</Badge>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}