// Always render fresh — this is a live operational dashboard, not cacheable content.
export const dynamic = "force-dynamic";

import { CheckCircle2, CircleDashed, HelpCircle } from "lucide-react";
import { computeReadinessOverview } from "@/lib/data/computed";
import { CategoryChart } from "@/components/readiness/category-chart";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db/client";

const GATE_STATUS_META = {
  READY: { icon: CheckCircle2, variant: "success" as const, label: "Ready" },
  NOT_READY: { icon: CircleDashed, variant: "blocked" as const, label: "Not ready" },
  NEEDS_CONFIRMATION: { icon: HelpCircle, variant: "confirm" as const, label: "Needs confirmation" },
};

export default async function ReadinessPage() {
  const overview = await computeReadinessOverview();
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" } });
  const gates = await prisma.launchGate.findMany({ orderBy: { sortOrder: "asc" } });

  const chartData = categories
    .map((c) => ({ name: c.name, readiness: overview.byCategory[c.key] ?? 0 }))
    .sort((a, b) => a.readiness - b.readiness);

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Readiness</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">Weighted, not a raw task count — a favicon and a bank account don&apos;t count the same.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Overall readiness</div>
          <div className="mt-1 text-3xl font-semibold text-foreground">{Math.round(overview.overall)}%</div>
          <Progress value={overview.overall} className="mt-3" />
        </Card>
        <Card className="p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Critical path readiness</div>
          <div className="mt-1 text-3xl font-semibold text-foreground">{Math.round(overview.criticalPath)}%</div>
          <Progress value={overview.criticalPath} className="mt-3" />
        </Card>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">By category</h2>
        <Card className="p-4">
          <CategoryChart data={chartData} />
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Launch gates</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {gates.map((g) => {
            const evaluation = overview.gateEvaluations[g.key];
            const status = evaluation?.status ?? "NOT_READY";
            const meta = GATE_STATUS_META[status];
            const Icon = meta.icon;
            return (
              <Card key={g.id} className="flex items-start gap-3 p-4">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-foreground">{g.name}</span>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                  </div>
                  {g.description && <p className="mt-0.5 text-xs text-muted-foreground">{g.description}</p>}
                  <div className="mt-1.5 text-xs text-muted-foreground">{Math.round(overview.byGate[g.key] ?? 0)}% weighted readiness</div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <Card className="p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">How this is calculated</p>
        <p className="mt-1">
          Each task carries a weight (category × milestone × task). Readiness = weight of DONE tasks ÷ weight of all
          applicable tasks. Tasks marked Not Applicable are excluded entirely; tasks Needing Confirmation count
          against readiness until resolved. A launch gate is Ready only when every required milestone in its
          categories is fully done — optional tasks never block a gate.
        </p>
      </Card>
    </div>
  );
}