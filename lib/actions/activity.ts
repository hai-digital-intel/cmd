import "server-only";
import { prisma } from "@/lib/db/client";

/**
 * Every mutation that matters to the founder writes one human-readable Activity row.
 * Not every field change (that would be noise) — just the events section 39 calls out:
 * completion, reopening, evidence, status changes, costs, blockers, readiness-relevant moves.
 */
export async function logActivity(params: {
  entityType: string;
  entityId?: string | null;
  action: string;
  summary: string;
  actorId?: string | null;
  taskId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await prisma.activity.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      action: params.action,
      summary: params.summary,
      actorId: params.actorId ?? null,
      taskId: params.taskId ?? null,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
    },
  });
}
