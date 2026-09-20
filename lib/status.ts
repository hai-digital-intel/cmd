import type { TaskStatus } from "@/lib/types";
import type { BadgeProps } from "@/components/ui/badge";

export const STATUS_LABELS: Record<TaskStatus, string> = {
  NOT_STARTED: "Not started",
  NEXT: "Next",
  IN_PROGRESS: "In progress",
  WAITING_EXTERNAL: "Waiting",
  BLOCKED: "Blocked",
  NEEDS_REVIEW: "Needs review",
  DONE: "Done",
  NOT_APPLICABLE: "Not applicable",
  NEEDS_CONFIRMATION: "Needs confirmation",
};

export const STATUS_BADGE_VARIANT: Record<TaskStatus, NonNullable<BadgeProps["variant"]>> = {
  NOT_STARTED: "default",
  NEXT: "progress",
  IN_PROGRESS: "progress",
  WAITING_EXTERNAL: "waiting",
  BLOCKED: "blocked",
  NEEDS_REVIEW: "confirm",
  DONE: "success",
  NOT_APPLICABLE: "na",
  NEEDS_CONFIRMATION: "confirm",
};

export const ALL_TASK_STATUSES: TaskStatus[] = [
  "NOT_STARTED",
  "NEXT",
  "IN_PROGRESS",
  "WAITING_EXTERNAL",
  "BLOCKED",
  "NEEDS_REVIEW",
  "DONE",
  "NOT_APPLICABLE",
  "NEEDS_CONFIRMATION",
];
