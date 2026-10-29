import type { Metadata, Viewport } from "next";
import "./globals.css";
import "@xyflow/react/dist/style.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/layout/app-shell";
import { isCompanyArchived } from "@/lib/data/settings";
import { prisma } from "@/lib/db/client";

// The sidebar's archived/blocker/inbox counts must reflect live data, not a build-time snapshot.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "h.ai Setup Command Center",
  description: "Practical AI for Technical Businesses — company setup, tracked to done.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [archived, openBlockerCount, inboxNoteCount, searchableDocuments] = await Promise.all([
    isCompanyArchived(),
    prisma.blocker.count({ where: { status: "OPEN" } }),
    prisma.note.count({ where: { status: "INBOX" } }),
    prisma.document.findMany({
      where: { archivedAt: null },
      select: { id: true, name: true, category: true, reviewerName: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
          <TooltipProvider delayDuration={200}>
            <AppShell
              archived={archived}
              openBlockerCount={openBlockerCount}
              inboxNoteCount={inboxNoteCount}
              searchableDocuments={searchableDocuments}
            >
              {children}
            </AppShell>
            <Toaster position="bottom-right" richColors closeButton />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
