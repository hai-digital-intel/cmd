import { Badge } from "@/components/ui/badge";
import { STATUS_BADGE_VARIANT, STATUS_LABELS } from "@/lib/status";
import type { TaskStatus } from "@/lib/types";

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]} dot className={className}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
