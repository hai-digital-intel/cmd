import { prisma } from "@/lib/db/client";
import type {
  ScoredCategory,
  ScoredDocument,
  ScoredLaunchGate,
  ScoredMilestone,
  ScoredTask,
} from "@/lib/types";

/**
 * Single place that turns relational Prisma rows into the flattened, pure-data shapes the
 * lib/services functions operate on. Keeping this join/flatten logic in one spot means every
 * page and server action computes readiness/priority the same way.
 */
export async function loadDomainSnapshot() {
  const [tasks, milestones, categories, gates, documents] = await Promise.all([
    prisma.task.findMany({
      include: {
        dependsOn: { select: { dependsOnId: true } },
        milestone: { select: { weight: true } },
        category: { select: { key: true, weight: true } },
      },
    }),
    prisma.milestone.findMany(),
    prisma.category.findMany(),
    prisma.launchGate.findMany({ include: { categories: { select: { id: true } } } }),
    prisma.document.findMany(),
  ]);

  const unlockCounts = new Map<string, number>();
  for (const t of tasks) {
    for (const dep of t.dependsOn) {
      unlockCounts.set(dep.dependsOnId, (unlockCounts.get(dep.dependsOnId) ?? 0) + 1);
    }
  }

  const scoredTasks: ScoredTask[] = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    effectiveWeight: t.weight * t.milestone.weight * t.category.weight,
    requiredForLaunch: t.requiredForLaunch,
    verificationLevel: t.verificationLevel,
    categoryId: t.categoryId,
    categoryKey: t.category.key,
    milestoneId: t.milestoneId,
    estimatedMinutes: t.estimatedMinutes,
    dueDate: t.dueDate,
    externalWaitUntil: t.externalWaitUntil,
    priorityOverride: t.priorityOverride,
    createdAt: t.createdAt,
    dependsOnIds: t.dependsOn.map((d) => d.dependsOnId),
    unlockCount: unlockCounts.get(t.id) ?? 0,
  }));

  const scoredMilestones: ScoredMilestone[] = milestones.map((m) => ({
    id: m.id,
    categoryId: m.categoryId,
    requiredForLaunch: m.requiredForLaunch,
    weight: m.weight,
    taskIds: scoredTasks.filter((t) => t.milestoneId === m.id).map((t) => t.id),
  }));

  const scoredCategories: ScoredCategory[] = categories.map((c) => ({
    id: c.id,
    key: c.key,
    name: c.name,
    weight: c.weight,
    launchGateId: c.launchGateId,
  }));

  const scoredGates: ScoredLaunchGate[] = gates.map((g) => ({
    id: g.id,
    key: g.key,
    name: g.name,
    categoryIds: g.categories.map((c) => c.id),
  }));

  const scoredDocuments: ScoredDocument[] = documents.map((d) => ({
    id: d.id,
    name: d.name,
    category: d.category,
    priority: d.priority,
    requirementLevel: d.requirementLevel,
    lifecycleStatus: d.lifecycleStatus,
    applicabilityStatus: d.applicabilityStatus,
    requiredForLaunch: d.requiredForLaunch,
    launchGateId: d.launchGateId,
    createdAt: d.createdAt,
  }));

  return {
    tasks: scoredTasks,
    milestones: scoredMilestones,
    categories: scoredCategories,
    gates: scoredGates,
    documents: scoredDocuments,
  };
}
