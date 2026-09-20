// Always render fresh — this is a live operational dashboard, not cacheable content.
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/client";
import { computeReadinessOverview } from "@/lib/data/computed";
import { computeWeightedReadiness } from "@/lib/services/readiness";
import { isTaskActionable } from "@/lib/services/dependency";
import { selectQuickWins } from "@/lib/services/prioritization";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CategorySection, type CategorySectionData } from "@/components/setup/category-section";
import { AddCategoryButton } from "@/components/setup/add-category-dialog";
import { InboxPanel } from "@/components/setup/inbox-panel";
import { TaskRow, type TaskRowData } from "@/components/setup/task-row";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; filter?: string }>;
}) {
  const params = await searchParams;
  const [overview, categoriesRaw, tasksRaw, inboxNotesRaw, peopleRaw] = await Promise.all([
    computeReadinessOverview(),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, include: { milestones: { orderBy: { sortOrder: "asc" } } } }),
    prisma.task.findMany({ include: { owner: true } }),
    prisma.note.findMany({ where: { status: "INBOX" }, orderBy: { createdAt: "desc" } }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
  ]);

  const tasksById = overview.tasksById;
  const taskFullById = new Map(tasksRaw.map((t) => [t.id, t]));

  function toRowData(taskId: string): TaskRowData {
    const full = taskFullById.get(taskId)!;
    const scored = tasksById.get(taskId)!;
    return {
      id: full.id,
      title: full.title,
      status: full.status,
      requiredForLaunch: full.requiredForLaunch,
      evidenceRequired: full.evidenceRequired,
      estimatedMinutes: full.estimatedMinutes,
      ownerInitial: full.owner?.name?.[0]?.toUpperCase() ?? null,
      actionable: isTaskActionable(scored, tasksById),
    };
  }

  const categories: CategorySectionData[] = categoriesRaw.map((cat) => {
    const catTasks = overview.snapshot.tasks.filter((t) => t.categoryId === cat.id);
    const readiness = computeWeightedReadiness(catTasks).score;

    const milestones = cat.milestones.map((m) => {
      const msTasks = overview.snapshot.tasks.filter((t) => t.milestoneId === m.id);
      const msReadiness = computeWeightedReadiness(msTasks).score;
      const applicable = msTasks.filter((t) => t.status !== "NOT_APPLICABLE");
      const doneCount = applicable.filter((t) => t.status === "DONE").length;
      const sortedTaskIds = msTasks
        .slice()
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
        .map((t) => t.id);
      const activeTasks = sortedTaskIds.filter((id) => {
        const s = tasksById.get(id)!.status;
        return s !== "DONE" && s !== "NOT_APPLICABLE";
      });
      const doneTasks = sortedTaskIds.filter((id) => {
        const s = tasksById.get(id)!.status;
        return s === "DONE" || s === "NOT_APPLICABLE";
      });
      return {
        id: m.id,
        title: m.title,
        requiredForLaunch: m.requiredForLaunch,
        readiness: msReadiness,
        doneCount,
        applicableTotal: applicable.length,
        activeTasks: activeTasks.map(toRowData),
        doneTasks: doneTasks.map(toRowData),
        categoryId: cat.id,
        ownerOptions: peopleRaw.map((p) => ({ id: p.id, name: p.name })),
      };
    });

    return { id: cat.id, name: cat.name, description: cat.description, readiness, milestones };
  });

  const quickWins = selectQuickWins(overview.snapshot.tasks, {
    tasksById,
    criticalPathIds: overview.criticalPathIds,
    limit: 12,
  });
  const quickWinRows: TaskRowData[] = quickWins.map((q) => toRowData(q.task.id));

  const categoryOptionsForInbox = categoriesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    milestones: c.milestones.map((m) => ({ id: m.id, title: m.title })),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Setup</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Every category, milestone, and task — expand only what you need.</p>
        </div>
        <AddCategoryButton />
      </header>

      <Tabs defaultValue={params.tab === "inbox" ? "inbox" : "setup"}>
        <TabsList>
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="inbox">
            Inbox {inboxNotesRaw.length > 0 && <Badge variant="waiting">{inboxNotesRaw.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-4">
          {quickWinRows.length > 0 && (
            <details open={params.filter === "quick-wins"} className="rounded-xl border border-border bg-surface">
              <summary className="focus-ring cursor-pointer list-none px-4 py-3 text-sm font-semibold text-foreground">
                ⚡ 15-minute wins ({quickWinRows.length})
              </summary>
              <div className="space-y-0.5 border-t border-border p-3">
                {quickWinRows.map((t) => (
                  <TaskRow key={t.id} task={t} />
                ))}
              </div>
            </details>
          )}

          {categories.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">No categories yet. Create your first one to get started.</Card>
          ) : (
            categories.map((cat) => <CategorySection key={cat.id} category={cat} />)
          )}
        </TabsContent>

        <TabsContent value="inbox">
          <InboxPanel
            notes={inboxNotesRaw.map((n) => ({ id: n.id, rawText: n.rawText, createdAt: n.createdAt }))}
            categories={categoryOptionsForInbox}
            people={peopleRaw.map((p) => ({ id: p.id, name: p.name }))}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}