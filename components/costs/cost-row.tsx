"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { deleteCost } from "@/lib/actions/costs";
import { formatMoney } from "@/lib/utils";
import type { CostStatus } from "@/lib/types";

const STATUS_VARIANT: Record<CostStatus, "success" | "progress" | "confirm" | "na"> = {
  PAID: "success",
  COMMITTED: "progress",
  PLANNED: "confirm",
  UNKNOWN: "na",
};

export interface CostRowData {
  id: string;
  vendor: string;
  description: string | null;
  amount: number;
  currency: string;
  type: "ONE_TIME" | "RECURRING";
  frequency: string | null;
  status: CostStatus;
  categoryName: string | null;
  notes: string | null;
}

export function CostRow({ cost }: { cost: CostRowData }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border px-3.5 py-2.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{cost.vendor}</span>
          <Badge variant={STATUS_VARIANT[cost.status]}>{cost.status}</Badge>
          {cost.type === "RECURRING" && <Badge variant="outline">{cost.frequency}</Badge>}
        </div>
        {cost.description && <p className="text-xs text-muted-foreground">{cost.description}</p>}
        {cost.notes && <p className="text-xs italic text-muted-foreground">{cost.notes}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="text-sm font-semibold text-foreground">{formatMoney(cost.amount, cost.currency)}</span>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => startTransition(() => deleteCost(cost.id))}
          aria-label="Delete cost"
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
