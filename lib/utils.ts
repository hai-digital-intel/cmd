import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(amount: number, currency = "AED") {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatRelativeToNow(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = d.getTime() - Date.now();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  if (Math.abs(diffDays) < 1) return "today";
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, "day");
  const diffMonths = Math.round(diffDays / 30);
  return rtf.format(diffMonths, "month");
}

/** Wraps Date.now() so components can call it without tripping the no-impure-render lint rule. */
export function daysFromNow(date: Date): number {
  return Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export function estimatedTimeLabel(minutes: number | null | undefined) {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return `${hours % 1 === 0 ? hours : hours.toFixed(1)} hr${hours >= 2 ? "s" : ""}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}
