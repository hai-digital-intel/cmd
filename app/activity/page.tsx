// Always render fresh — this is a live operational dashboard, not cacheable content.
export const dynamic = "force-dynamic";

import { History } from "lucide-react";
import { prisma } from "@/lib/db/client";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

const ACTION_ICON_COLOR: Record<string, string> = {
  completed: "bg-success",
  reopened: "bg-waiting",
  status_changed: "bg-progress",
  evidence_added: "bg-accent",
  uploaded: "bg-accent",
  created: "bg-muted",
  deleted: "bg-blocked",
  resolved: "bg-success",
  archived: "bg-success",
};

export default async function ActivityPage() {
  const activities = await prisma.activity.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 150,
  });

  const byDay = new Map<string, typeof activities>();
  for (const a of activities) {
    const day = formatDate(a.createdAt) ?? "";
    const list = byDay.get(day) ?? [];
    list.push(a);
    byDay.set(day, list);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Activity</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">What changed, and when.</p>
      </header>

      {activities.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 p-10 text-center">
          <History className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
        </Card>
      ) : (
        Array.from(byDay.entries()).map(([day, items]) => (
          <section key={day}>
            <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{day}</h2>
            <Card className="divide-y divide-border p-0">
              {items.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                  <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${ACTION_ICON_COLOR[a.action] ?? "bg-muted"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{a.summary}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.actor?.name ?? "System"} · {new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(a.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </Card>
          </section>
        ))
      )}
    </div>
  );
}