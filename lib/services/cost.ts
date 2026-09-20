import type { CostStatus, CostType } from "@/lib/types";

export interface CostItemLike {
  amount: number;
  status: CostStatus;
  type: CostType;
  frequency?: string | null;
  currency: string;
}

export interface CostSummary {
  spentToDate: number;
  committedSpend: number;
  plannedSpend: number;
  /** committed + planned one-time spend still ahead. */
  expectedRemainingSetupSpend: number;
  expectedRecurringMonthlyOverhead: number;
  currency: string;
  mixedCurrencyWarning: boolean;
}

function toMonthly(amount: number, frequency: string | null | undefined): number {
  switch (frequency) {
    case "annual":
      return amount / 12;
    case "quarterly":
      return amount / 3;
    case "weekly":
      return amount * (52 / 12);
    default:
      return amount; // "monthly" or unspecified
  }
}

/**
 * Setup-cost aggregation only — never bookkeeping. `currency` is whatever the caller passes
 * (an app Setting, default AED); this function never hardcodes it.
 */
export function summarizeCosts(items: CostItemLike[], baseCurrency = "AED"): CostSummary {
  let spent = 0;
  let committed = 0;
  let planned = 0;
  let recurringMonthly = 0;
  let mixedCurrencyWarning = false;

  for (const item of items) {
    if (item.currency !== baseCurrency) mixedCurrencyWarning = true;
    if (item.type === "ONE_TIME") {
      if (item.status === "PAID") spent += item.amount;
      else if (item.status === "COMMITTED") committed += item.amount;
      else if (item.status === "PLANNED") planned += item.amount;
    } else {
      if (item.status === "PAID" || item.status === "COMMITTED") {
        recurringMonthly += toMonthly(item.amount, item.frequency);
      }
    }
  }

  return {
    spentToDate: spent,
    committedSpend: committed,
    plannedSpend: planned,
    expectedRemainingSetupSpend: committed + planned,
    expectedRecurringMonthlyOverhead: recurringMonthly,
    currency: baseCurrency,
    mixedCurrencyWarning,
  };
}
