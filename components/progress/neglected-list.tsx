import Link from "next/link";
import { Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { NeglectedTask } from "@/lib/services/neglect";

/** States facts, not judgment — "open 21 days, blocking 3 tasks", never a scold. */
export function NeglectedList({ items }: { items: NeglectedTask[] }) {
  if (items.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">Nothing has been sitting untouched for a while. Good pace.</Card>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Card key={item.taskId} className="flex items-center justify-between gap-3 p-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Clock className="size-4 shrink-0 text-muted-foreground" />
            <Link href={`/tasks/${item.taskId}`} className="focus-ring truncate text-sm font-medium text-foreground hover:underline">
              {item.title}
            </Link>
          </div>
          <div className="shrink-0 text-xs text-muted-foreground">
            Open {item.ageDays} days{item.unlockCount > 0 ? ` · blocking ${item.unlockCount}` : ""}
          </div>
        </Card>
      ))}
    </div>
  );
}
