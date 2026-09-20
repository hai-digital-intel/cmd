// Always render fresh — this is a live operational dashboard, not cacheable content.
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/client";
import { getCurrency } from "@/lib/data/settings";
import { summarizeCosts } from "@/lib/services/cost";
import { SummaryBar } from "@/components/today/summary-bar";
import { NewCostDialog } from "@/components/costs/new-cost-dialog";
import { CostRow } from "@/components/costs/cost-row";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

export default async function CostsPage() {
  const [costs, categories, currency] = await Promise.all([
    prisma.costItem.findMany({ include: { category: true }, orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getCurrency(),
  ]);

  const summary = summarizeCosts(costs, currency);

  const oneTime = costs.filter((c) => c.type === "ONE_TIME");
  const recurring = costs.filter((c) => c.type === "RECURRING");

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">Costs</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Setup spend only — this isn&apos;t bookkeeping.</p>
        </div>
        <NewCostDialog categories={categories.map((c) => ({ id: c.id, name: c.name }))} currency={currency} />
      </header>

      <SummaryBar
        stats={[
          { label: "Spent to date", value: formatMoney(summary.spentToDate, currency) },
          { label: "Committed", value: formatMoney(summary.committedSpend, currency) },
          { label: "Planned", value: formatMoney(summary.plannedSpend, currency) },
          { label: "Remaining setup spend", value: formatMoney(summary.expectedRemainingSetupSpend, currency) },
          { label: "Monthly overhead", value: formatMoney(summary.expectedRecurringMonthlyOverhead, currency) },
        ]}
      />
      {summary.mixedCurrencyWarning && (
        <p className="text-xs text-muted-foreground">Some costs are in a different currency than {currency} — totals may not be fully accurate.</p>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">One-time ({oneTime.length})</h2>
        {oneTime.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No one-time costs logged yet.</Card>
        ) : (
          <div className="space-y-2">
            {oneTime.map((c) => (
              <CostRow
                key={c.id}
                cost={{
                  id: c.id,
                  vendor: c.vendor,
                  description: c.description,
                  amount: c.amount,
                  currency: c.currency,
                  type: c.type,
                  frequency: c.frequency,
                  status: c.status,
                  categoryName: c.category?.name ?? null,
                  notes: c.notes,
                }}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Recurring ({recurring.length})</h2>
        {recurring.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No recurring costs logged yet.</Card>
        ) : (
          <div className="space-y-2">
            {recurring.map((c) => (
              <CostRow
                key={c.id}
                cost={{
                  id: c.id,
                  vendor: c.vendor,
                  description: c.description,
                  amount: c.amount,
                  currency: c.currency,
                  type: c.type,
                  frequency: c.frequency,
                  status: c.status,
                  categoryName: c.category?.name ?? null,
                  notes: c.notes,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}