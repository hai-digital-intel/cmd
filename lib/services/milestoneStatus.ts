import type { ScoredTask } from "@/lib/types";
import { computeMilestoneCompletion } from "@/lib/services/launchGates";

export type MilestoneNodeStatus = "DONE" | "BLOCKED" | "WAITING" | "IN_PROGRESS" | "NOT_STARTED" | "AVAILABLE";

/**
 * Milestone-level status for the Roadmap and Setup Map (section 24/25). Priority order
 * matters: a milestone with one blocked task reads as Blocked even if three others are done,
 * because that's what actually determines whether a founder can move it forward today.
 */
export function computeMilestoneNodeStatus(
  milestone: { id: string },
  tasks: ScoredTask[],
  prerequisiteMilestoneIds: string[],
  completionByMilestoneId: Map<string, boolean>,
): MilestoneNodeStatus {
  const msTasks = tasks.filter((t) => t.milestoneId === milestone.id);
  const completion = computeMilestoneCompletion(milestone, tasks);

  if (completion.complete) return "DONE";
  if (msTasks.some((t) => t.status === "BLOCKED")) return "BLOCKED";
  if (msTasks.some((t) => t.status === "WAITING_EXTERNAL")) return "WAITING";

  const unmetPrerequisite = prerequisiteMilestoneIds.some((id) => completionByMilestoneId.get(id) === false);
  if (unmetPrerequisite) return "NOT_STARTED";

  const anyStarted = msTasks.some((t) => t.status === "IN_PROGRESS" || t.status === "NEEDS_REVIEW" || t.status === "DONE");
  if (anyStarted) return "IN_PROGRESS";

  return "AVAILABLE";
}

export const MILESTONE_STATUS_LABEL: Record<MilestoneNodeStatus, string> = {
  DONE: "Done",
  BLOCKED: "Blocked",
  WAITING: "Waiting",
  IN_PROGRESS: "In progress",
  NOT_STARTED: "Not started",
  AVAILABLE: "Available",
};
