"use client";

import { useTransition } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChaseNowButton } from "@/components/blockers/chase-now-button";
import { resolveBlocker } from "@/lib/actions/blockers";
import { formatDate, formatRelativeToNow } from "@/lib/utils";
import { toast } from "sonner";

export interface BlockerCardData {
  id: string;
  title: string;
  description: string | null;
  type: string;
  waitingOnName: string | null;
  nextFollowUp: Date | null;
  startDate: Date;
  status: "OPEN" | "RESOLVED";
  relatedTasks: { id: string; title: string }[];
}

export function BlockerCard({ blocker }: { blocker: BlockerCardData }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{blocker.type}</Badge>
            {blocker.status === "OPEN" && blocker.nextFollowUp && (
              <span className="text-xs text-muted-foreground">Next follow-up {formatDate(blocker.nextFollowUp)}</span>
            )}
          </div>
          <h3 className="mt-1 font-medium text-foreground">{blocker.title}</h3>
          {blocker.description && <p className="mt-0.5 text-sm text-muted-foreground">{blocker.description}</p>}
          {blocker.waitingOnName && <p className="mt-1 text-xs text-muted-foreground">Waiting on {blocker.waitingOnName}</p>}
          {blocker.relatedTasks.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {blocker.relatedTasks.map((t) => (
                <Link key={t.id} href={`/tasks/${t.id}`} className="focus-ring rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground">
                  {t.title}
                </Link>
              ))}
            </div>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">Open since {formatRelativeToNow(blocker.startDate)}</p>
        </div>
      </div>

      {blocker.status === "OPEN" && (
        <div className="mt-3 flex gap-2 border-t border-border pt-3">
          <ChaseNowButton blockerId={blocker.id} />
          <Button
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await resolveBlocker(blocker.id);
                toast.success("Blocker resolved");
              })
            }
          >
            <CheckCircle2 className="size-3.5" /> Resolve
          </Button>
        </div>
      )}
    </Card>
  );
}
