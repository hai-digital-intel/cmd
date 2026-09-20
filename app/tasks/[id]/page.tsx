// Always render fresh — this is a live operational dashboard, not cacheable content.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star, Weight, Clock, CalendarClock, User as UserIcon, ShieldCheck } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { StatusBadge } from "@/components/status-badge";
import { CompleteControl } from "@/components/tasks/complete-control";
import { EditTaskDialog } from "@/components/tasks/edit-task-dialog";
import { DependencyManager } from "@/components/tasks/dependency-manager";
import { ChecklistManager } from "@/components/tasks/checklist-manager";
import { EvidenceManager } from "@/components/tasks/evidence-manager";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { estimatedTimeLabel, formatDate } from "@/lib/utils";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const task = await prisma.task.findUnique({
    where: { id },
    include: {
      category: true,
      milestone: true,
      owner: true,
      checklistItems: { orderBy: { sortOrder: "asc" } },
      evidence: { include: { document: true }, orderBy: { createdAt: "desc" } },
      dependsOn: { include: { dependsOn: { select: { id: true, title: true, status: true } } } },
      dependents: { include: { task: { select: { id: true, title: true, status: true } } } },
      costItems: true,
      documents: true,
      blockers: { include: { blocker: true } },
      activities: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });

  if (!task) notFound();

  const [candidateTasksRaw, people] = await Promise.all([
    prisma.task.findMany({ select: { id: true, title: true, status: true }, orderBy: { title: "asc" } }),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
  ]);

  const openBlockers = task.blockers.map((bt) => bt.blocker).filter((b) => b.status === "OPEN");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <Link href="/setup" className="focus-ring inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to Setup
      </Link>

      <div className="space-y-3">
        <div className="text-xs font-medium uppercase tracking-wide text-accent">
          {task.category.name} / {task.milestone.title}
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{task.title}</h1>
          <EditTaskDialog
            taskId={task.id}
            title={task.title}
            description={task.description}
            ownerId={task.ownerId}
            estimatedMinutes={task.estimatedMinutes}
            dueDate={task.dueDate}
            weight={task.weight}
            requiredForLaunch={task.requiredForLaunch}
            verificationLevel={task.verificationLevel}
            people={people}
          />
        </div>
        {task.description && <p className="text-sm text-muted-foreground">{task.description}</p>}

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={task.status} />
          {task.requiredForLaunch && (
            <Badge variant="outline">
              <Star className="size-3 fill-current text-accent" /> Required for launch
            </Badge>
          )}
          {task.evidenceRequired && <Badge variant="outline">Evidence required</Badge>}
        </div>
      </div>

      {openBlockers.length > 0 && (
        <Card className="border-blocked bg-blocked-bg/40 p-4">
          <p className="text-sm font-medium text-blocked-foreground">Blocked</p>
          {openBlockers.map((b) => (
            <p key={b.id} className="text-sm text-muted-foreground">
              <Link href="/blockers" className="hover:underline">
                {b.title}
              </Link>
            </p>
          ))}
        </Card>
      )}

      <Card className="p-5">
        <CompleteControl
          taskId={task.id}
          status={task.status}
          evidenceRequired={task.evidenceRequired}
          hasEvidence={task.evidence.length > 0}
        />
      </Card>

      <Card className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
        <MetaField icon={UserIcon} label="Owner" value={task.owner?.name ?? "Unassigned"} />
        <MetaField icon={Clock} label="Estimated" value={estimatedTimeLabel(task.estimatedMinutes) ?? "—"} />
        <MetaField icon={CalendarClock} label="Due" value={formatDate(task.dueDate) ?? "—"} />
        <MetaField icon={Weight} label="Readiness weight" value={task.weight.toString()} />
        <MetaField icon={ShieldCheck} label="Verification" value={task.verificationLevel.replace(/_/g, " ").toLowerCase()} />
        {task.waitingOn && <MetaField icon={Clock} label="Waiting on" value={task.waitingOn} />}
      </Card>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Dependencies</h2>
        <DependencyManager
          taskId={task.id}
          dependsOn={task.dependsOn.map((d) => d.dependsOn)}
          dependents={task.dependents.map((d) => d.task)}
          candidateTasks={candidateTasksRaw}
        />
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Checklist</h2>
        <Card className="p-4">
          <ChecklistManager taskId={task.id} items={task.checklistItems} />
        </Card>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Evidence</h2>
        <Card className="p-4">
          <EvidenceManager
            taskId={task.id}
            evidence={task.evidence.map((e) => ({
              id: e.id,
              type: e.type,
              url: e.url,
              note: e.note,
              documentName: e.document?.name ?? null,
              documentPath: e.document?.filePath ?? null,
              createdAt: e.createdAt,
            }))}
          />
        </Card>
      </section>

      {task.activities.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Activity</h2>
          <Card className="divide-y divide-border p-0">
            {task.activities.map((a) => (
              <div key={a.id} className="px-4 py-2.5 text-sm">
                <span className="text-foreground">{a.summary}</span>
                <span className="ml-2 text-xs text-muted-foreground">{formatDate(a.createdAt)}</span>
              </div>
            ))}
          </Card>
        </section>
      )}

      <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground sm:grid-cols-4">
        <div>Created {formatDate(task.createdAt)}</div>
        <div>Updated {formatDate(task.updatedAt)}</div>
        {task.completedAt && <div>Completed {formatDate(task.completedAt)}</div>}
        {task.overrideReason && <div>Override: {task.overrideReason}</div>}
      </div>
    </div>
  );
}

function MetaField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="size-3" /> {label}
      </div>
      <div className="mt-0.5 truncate text-sm font-medium capitalize text-foreground">{value}</div>
    </div>
  );
}