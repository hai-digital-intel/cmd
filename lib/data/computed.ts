import { prisma } from "@/lib/db/client";
import { loadDomainSnapshot } from "@/lib/data/domain";
import { buildTaskIndex, computeCriticalPathIds } from "@/lib/services/dependency";
import {
  computeCategoryReadiness,
  computeCriticalPathReadiness,
  computeLaunchGateReadiness,
  computeOverallReadiness,
} from "@/lib/services/readiness";
import { computeAllGateStatuses, isCompanyReady } from "@/lib/services/launchGates";
import { selectNextActions, selectQuickWins } from "@/lib/services/prioritization";
import { computeProjectedReadyDate } from "@/lib/services/timeline";
import { computeDocumentReadiness, computeLaunchDocumentHealth } from "@/lib/services/documentGovernance";

/**
 * The one function most pages call: loads the relational data once, then runs every pure
 * scoring function over it. Nothing in here is cached beyond the lifetime of a single
 * request — the dataset is small (a few hundred rows at most) so recomputing on every read
 * is simpler and cheaper than invalidation logic.
 */
export async function computeReadinessOverview() {
  const snapshot = await loadDomainSnapshot();
  const tasksById = buildTaskIndex(snapshot.tasks);
  const criticalPathIds = computeCriticalPathIds(snapshot.tasks);

  const overall = computeOverallReadiness(snapshot.tasks);
  const criticalPath = computeCriticalPathReadiness(snapshot.tasks, criticalPathIds);
  const byCategory = computeCategoryReadiness(snapshot.tasks, snapshot.categories);
  const byGate = computeLaunchGateReadiness(snapshot.tasks, snapshot.gates);
  const gateEvaluations = computeAllGateStatuses(snapshot.gates, snapshot.milestones, snapshot.tasks, snapshot.documents);
  const documentReadiness = computeDocumentReadiness(snapshot.documents);
  const launchDocumentHealth = computeLaunchDocumentHealth(snapshot.documents);

  const openCriticalBlockerCount = await prisma.blocker.count({
    where: { status: "OPEN", type: { in: ["FOUNDER", "PARTNER"] } },
  });

  const companyReady = isCompanyReady(Object.values(gateEvaluations), openCriticalBlockerCount > 0);

  const nextActions = selectNextActions(snapshot.tasks, { tasksById, criticalPathIds, limit: 3 });
  const quickWins = selectQuickWins(snapshot.tasks, { tasksById, criticalPathIds });
  const projection = computeProjectedReadyDate(snapshot.tasks, { criticalPathIds });

  return {
    snapshot,
    tasksById,
    criticalPathIds,
    overall,
    criticalPath,
    byCategory,
    byGate,
    gateEvaluations,
    documentReadiness,
    launchDocumentHealth,
    companyReady,
    openCriticalBlockerCount,
    nextActions,
    quickWins,
    projection,
  };
}

export type ReadinessOverview = Awaited<ReturnType<typeof computeReadinessOverview>>;
