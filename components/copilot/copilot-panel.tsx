"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { runCopilotQuery, type CopilotQueryKey } from "@/lib/actions/copilot";
import type { CopilotAnswer } from "@/lib/services/copilot";

const PROMPTS: { key: CopilotQueryKey; label: string }[] = [
  { key: "blocking-launch", label: "What is blocking launch?" },
  { key: "quick-wins", label: "Show me 15-minute wins" },
  { key: "waiting", label: "What are we waiting on?" },
  { key: "owned-by-haya", label: "What can only Haya complete?" },
  { key: "owned-by-mohammad", label: "What requires Mohammad?" },
  { key: "commercial-readiness", label: "What's preventing commercial readiness?" },
  { key: "week-summary", label: "Summarize this week's progress" },
];

export function CopilotPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [answer, setAnswer] = useState<CopilotAnswer | null>(null);
  const [activeLabel, setActiveLabel] = useState("");
  const [pending, startTransition] = useTransition();

  function ask(key: CopilotQueryKey, label: string) {
    setActiveLabel(label);
    startTransition(async () => {
      setAnswer(await runCopilotQuery(key));
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-1.5">
            <Sparkles className="size-4" /> Setup Copilot
          </SheetTitle>
          <SheetDescription>Answers come straight from your data — no AI required.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-1.5">
          {PROMPTS.map((p) => (
            <Button
              key={p.key}
              variant={activeLabel === p.label ? "secondary" : "outline"}
              size="sm"
              className="justify-start"
              onClick={() => ask(p.key, p.label)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        <div className="mt-4 space-y-2 text-xs text-muted-foreground">
          <p>
            Need to break a task down or draft a follow-up? Open a task&apos;s{" "}
            <Link href="/focus" className="text-accent hover:underline" onClick={() => onOpenChange(false)}>
              Focus Mode
            </Link>{" "}
            view, or use{" "}
            <Link href="/blockers" className="text-accent hover:underline" onClick={() => onOpenChange(false)}>
              Chase Now
            </Link>{" "}
            on a specific blocker.
          </p>
        </div>

        {(pending || answer) && (
          <Card className="mt-4 p-4">
            {pending ? (
              <p className="text-sm text-muted-foreground">Thinking...</p>
            ) : (
              answer && (
                <div>
                  <p className="text-sm font-medium text-foreground">{answer.summary}</p>
                  {answer.items.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {answer.items.map((item, i) => (
                        <li key={i} className="text-xs text-muted-foreground">
                          · {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            )}
          </Card>
        )}
      </SheetContent>
    </Sheet>
  );
}
