// Always render fresh — this is a live operational dashboard, not cacheable content.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { computeReadinessOverview } from "@/lib/data/computed";
import { FocusCard, type FocusTaskData } from "@/components/focus/focus-card";
import { Button } from "@/components/ui/button";

export default async function FocusPage() {
  const overview = await computeReadinessOverview();
  const top = overview.nextActions[0];

  if (!top) {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-3 px-4 py-24 text-center">
        <CheckCircle2 className="size-8 text-success" />
        <h1 className="text-lg font-semibold text-foreground">Nothing urgent to focus on</h1>
        <p className="text-sm text-muted-foreground">
          Everything actionable is done, or what&apos;s left is waiting on someone else. Check{" "}
          <Link href="/blockers" className="text-accent hover:underline">
            Blockers
          </Link>{" "}
          to see what to chase.
        </p>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/">Back to Today</Link>
        </Button>
      </div>
    );
  }

  const full = await prisma.task.findUnique({
    where: { id: top.task.id },
    include: {
      category: true,
      checklistItems: { orderBy: { sortOrder: "asc" } },
      dependents: { include: { task: { select: { title: true } } } },
      documents: true,
      evidence: true,
    },
  });

  if (!full) return null;

  const taskData: FocusTaskData = {
    id: full.id,
    title: full.title,
    categoryName: full.category.name,
    reasons: top.reasons,
    estimatedMinutes: full.estimatedMinutes,
    unlocksLabels: full.dependents.map((d) => d.task.title),
    checklistItems: full.checklistItems,
    documentLinks: [
      ...full.documents.map((d) => ({ name: d.name, url: d.externalUrl })),
      ...full.evidence.filter((e) => e.type === "URL" && e.url).map((e) => ({ name: e.url!, url: e.url })),
    ],
  };

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-10">
      <FocusCard task={taskData} />
    </div>
  );
}