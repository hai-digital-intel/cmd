"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Timer, MessageCircleQuestion } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Sidebar({
  archived,
  openBlockerCount,
  onOpenCopilot,
}: {
  archived: boolean;
  openBlockerCount: number;
  onOpenCopilot: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex items-center gap-2 px-5 pt-6 pb-4">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold">h.ai</div>
          <div className="text-[11px] text-muted-foreground">Setup Command Center</div>
        </div>
        {archived && (
          <Badge variant="success" className="ml-auto">
            Archived
          </Badge>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 px-3 py-2">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "focus-ring flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-surface-muted text-foreground"
                  : "text-muted-foreground hover:bg-surface-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
              {item.href === "/blockers" && openBlockerCount > 0 && (
                <span className="ml-auto rounded-full bg-blocked-bg px-1.5 py-0.5 text-[11px] font-semibold text-blocked-foreground">
                  {openBlockerCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1.5 border-t border-border p-3">
        <Link
          href="/focus"
          className="focus-ring flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Timer className="size-4" />
          Focus Mode
        </Link>
        <button
          onClick={onOpenCopilot}
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <MessageCircleQuestion className="size-4" />
          Ask Copilot
        </button>
        <div className="flex justify-center pt-1">
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
