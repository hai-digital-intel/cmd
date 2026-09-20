"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sun, ListChecks, OctagonAlert, Timer, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Today", icon: Sun },
  { href: "/setup", label: "Setup", icon: ListChecks },
  { href: "/blockers", label: "Blockers", icon: OctagonAlert },
  { href: "/focus", label: "Focus", icon: Timer },
];

export function MobileNav({ onMore }: { onMore: () => void }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {ITEMS.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "focus-ring flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {item.label}
          </Link>
        );
      })}
      <button
        onClick={onMore}
        className="focus-ring flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
      >
        <Menu className="size-5" />
        More
      </button>
    </nav>
  );
}
