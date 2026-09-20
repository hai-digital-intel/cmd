import { formatDate, formatMoney } from "@/lib/utils";

export interface SummaryStat {
  label: string;
  value: string;
}

export function SummaryBar({ stats }: { stats: SummaryStat[] }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-surface px-4 py-3.5">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{stat.label}</div>
          <div className="mt-0.5 text-lg font-semibold text-foreground">{stat.value}</div>
        </div>
      ))}
    </div>
  );
}

export function buildSummaryStats(opts: {
  criticalPathReadiness: number;
  projectedReadyDate: Date;
  openBlockerCount: number;
  waitingCount: number;
  spentToDate: number;
  remainingCost: number;
  currency: string;
}): SummaryStat[] {
  return [
    { label: "Critical path", value: `${Math.round(opts.criticalPathReadiness)}%` },
    { label: "Projected ready", value: formatDate(opts.projectedReadyDate) ?? "—" },
    { label: "Open blockers", value: String(opts.openBlockerCount) },
    { label: "Waiting externally", value: String(opts.waitingCount) },
    { label: "Spent to date", value: formatMoney(opts.spentToDate, opts.currency) },
    { label: "Remaining setup cost", value: formatMoney(opts.remainingCost, opts.currency) },
  ];
}
