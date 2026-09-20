// Always render fresh — this is a live operational dashboard, not cacheable content.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { computeReadinessOverview } from "@/lib/data/computed";
import { computeMilestoneCompletion } from "@/lib/services/launchGates";
import { computeMilestoneNodeStatus } from "@/lib/services/milestoneStatus";
import { SetupMap, type MapMilestoneData } from "@/components/roadmap/setup-map";

export default async function SetupMapPage() {
  const [overview, milestonesRaw] = await Promise.all([
    computeReadinessOverview(),
    prisma.milestone.findMany({
      include: { category: true, dependsOn: { select: { dependsOnId: true } } },
    }),
  ]);

  const tasks = overview.snapshot.tasks;
  const completionByMilestoneId = new Map(
    milestonesRaw.map((m) => [m.id, computeMilestoneCompletion({ id: m.id }, tasks).complete]),
  );

  const milestones: MapMilestoneData[] = milestonesRaw.map((m) => {
    const msTasks = tasks.filter((t) => t.milestoneId === m.id);
    const applicable = msTasks.filter((t) => t.status !== "NOT_APPLICABLE");
    return {
      id: m.id,
      title: m.title,
      categoryName: m.category.name,
      status: computeMilestoneNodeStatus(
        { id: m.id },
        tasks,
        m.dependsOn.map((d) => d.dependsOnId),
        completionByMilestoneId,
      ),
      requiredForLaunch: m.requiredForLaunch,
      taskCount: applicable.length,
      doneTaskCount: applicable.filter((t) => t.status === "DONE").length,
      dependsOnIds: m.dependsOn.map((d) => d.dependsOnId),
      isCriticalPath: msTasks.some((t) => overview.criticalPathIds.has(t.id)),
    };
  });

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/roadmap" className="focus-ring inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Roadmap
      </Link>
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Setup map</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">How milestones unlock each other. Click a node for detail.</p>
      </header>
      <SetupMap milestones={milestones} />
    </div>
  );
}