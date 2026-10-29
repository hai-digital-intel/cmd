"use client";

import { useState } from "react";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { QuickCapture } from "@/components/quick-capture";
import { CommandPalette, type SearchableDocument } from "@/components/command-palette";
import { CopilotPanel } from "@/components/copilot/copilot-panel";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { NAV_ITEMS } from "@/lib/nav";
import { Badge } from "@/components/ui/badge";

export function AppShell({
  children,
  archived,
  openBlockerCount,
  inboxNoteCount,
  searchableDocuments,
}: {
  children: React.ReactNode;
  archived: boolean;
  openBlockerCount: number;
  inboxNoteCount: number;
  searchableDocuments: SearchableDocument[];
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-background">
      <Sidebar archived={archived} openBlockerCount={openBlockerCount} onOpenCopilot={() => setCopilotOpen(true)} />
      <MobileNav onMore={() => setMoreOpen(true)} />
      <CommandPalette onOpenCopilot={() => setCopilotOpen(true)} documents={searchableDocuments} />
      <CopilotPanel open={copilotOpen} onOpenChange={setCopilotOpen} />
      <QuickCapture />

      <main className="pb-20 lg:ml-60 lg:pb-8">
        {archived && (
          <div className="border-b border-border bg-success-bg px-4 py-2 text-center text-sm text-success-foreground">
            h.ai is operationally ready — this setup project is archived. Historical data is preserved and browsable.
          </div>
        )}
        {inboxNoteCount > 0 && (
          <Link
            href="/setup?tab=inbox"
            className="focus-ring block border-b border-border bg-surface-muted px-4 py-2 text-center text-xs text-muted-foreground hover:text-foreground lg:hidden"
          >
            {inboxNoteCount} captured note{inboxNoteCount > 1 ? "s" : ""} waiting to be triaged
          </Link>
        )}
        {children}
      </main>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Navigate</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className="focus-ring flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-muted"
                >
                  <Icon className="size-4" />
                  {item.label}
                  {item.href === "/blockers" && openBlockerCount > 0 && (
                    <Badge variant="blocked" className="ml-auto">
                      {openBlockerCount}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
