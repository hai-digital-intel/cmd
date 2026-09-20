"use server";

import { prisma } from "@/lib/db/client";
import { loadDomainSnapshot } from "@/lib/data/domain";
import { buildTaskIndex } from "@/lib/services/dependency";
import * as copilot from "@/lib/services/copilot";
import type { CopilotAnswer } from "@/lib/services/copilot";

export type CopilotQueryKey =
  | "blocking-launch"
  | "quick-wins"
  | "waiting"
  | "owned-by-haya"
  | "owned-by-mohammad"
  | "commercial-readiness"
  | "week-summary";

export async function runCopilotQuery(key: CopilotQueryKey): Promise<CopilotAnswer> {
  const { tasks, milestones, gates } = await loadDomainSnapshot();
  const tasksById = buildTaskIndex(tasks);
  const taskTitleById = new Map(tasks.map((t) => [t.id, t.title]));

  switch (key) {
    case "blocking-launch":
      return copilot.whatsBlockingLaunch(gates, milestones, tasks, taskTitleById);
    case "quick-wins":
      return copilot.fifteenMinuteWins(tasks, tasksById);
    case "waiting":
      return copilot.whatsWaitingExternally(tasks);
    case "owned-by-haya":
    case "owned-by-mohammad": {
      const name = key === "owned-by-haya" ? "Haya" : "Mohammad";
      const person = await prisma.person.findFirst({ where: { name } });
      if (!person) return { summary: `No person named ${name} found.`, items: [] };
      const owned = await prisma.task.findMany({ where: { ownerId: person.id }, select: { id: true } });
      return copilot.tasksOwnedBy(tasks, new Set(owned.map((t) => t.id)));
    }
    case "commercial-readiness": {
      const commercialGate = gates.find((g) => g.key === "commercial");
      if (!commercialGate) return { summary: "No commercial launch gate configured.", items: [] };
      return copilot.whatsBlockingLaunch([commercialGate], milestones, tasks, taskTitleById);
    }
    case "week-summary": {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const completed = await prisma.task.findMany({
        where: { status: "DONE", completedAt: { gte: weekAgo } },
        select: { title: true },
      });
      const snapshots = await prisma.snapshot.findMany({ orderBy: { takenAt: "desc" }, take: 2 });
      const after = snapshots[0]?.overallReadiness ?? 0;
      const before = snapshots[1]?.overallReadiness ?? after;
      return copilot.summarizeWeek(completed, before, after);
    }
    default:
      return { summary: "Unknown question.", items: [] };
  }
}
