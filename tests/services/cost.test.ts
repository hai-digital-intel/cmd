import { describe, it, expect } from "vitest";
import { summarizeCosts } from "@/lib/services/cost";

describe("summarizeCosts", () => {
  it("separates paid, committed, and planned one-time costs", () => {
    const summary = summarizeCosts([
      { amount: 100, status: "PAID", type: "ONE_TIME", currency: "AED" },
      { amount: 200, status: "COMMITTED", type: "ONE_TIME", currency: "AED" },
      { amount: 300, status: "PLANNED", type: "ONE_TIME", currency: "AED" },
    ]);
    expect(summary.spentToDate).toBe(100);
    expect(summary.committedSpend).toBe(200);
    expect(summary.plannedSpend).toBe(300);
    expect(summary.expectedRemainingSetupSpend).toBe(500);
  });

  it("normalizes recurring costs to a monthly figure", () => {
    const summary = summarizeCosts([
      { amount: 1200, status: "PAID", type: "RECURRING", frequency: "annual", currency: "AED" },
      { amount: 300, status: "COMMITTED", type: "RECURRING", frequency: "quarterly", currency: "AED" },
      { amount: 50, status: "PAID", type: "RECURRING", frequency: "monthly", currency: "AED" },
    ]);
    expect(summary.expectedRecurringMonthlyOverhead).toBeCloseTo(100 + 100 + 50);
  });

  it("excludes PLANNED/UNKNOWN recurring costs from monthly overhead (nothing committed yet)", () => {
    const summary = summarizeCosts([{ amount: 500, status: "PLANNED", type: "RECURRING", frequency: "monthly", currency: "AED" }]);
    expect(summary.expectedRecurringMonthlyOverhead).toBe(0);
  });

  it("flags mixed currencies instead of silently mis-summing them", () => {
    const summary = summarizeCosts(
      [
        { amount: 100, status: "PAID", type: "ONE_TIME", currency: "AED" },
        { amount: 50, status: "PAID", type: "ONE_TIME", currency: "USD" },
      ],
      "AED",
    );
    expect(summary.mixedCurrencyWarning).toBe(true);
  });

  it("returns zeros for an empty cost list", () => {
    const summary = summarizeCosts([]);
    expect(summary.spentToDate).toBe(0);
    expect(summary.expectedRemainingSetupSpend).toBe(0);
    expect(summary.expectedRecurringMonthlyOverhead).toBe(0);
  });
});
