"use client";

import { useTransition } from "react";
import { PartyPopper } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { archiveCompany } from "@/lib/actions/settings";
import { toast } from "sonner";

export function ArchiveCta() {
  const [pending, startTransition] = useTransition();

  return (
    <Card className="flex flex-col items-start gap-3 border-success bg-success-bg/40 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <PartyPopper className="mt-0.5 size-5 shrink-0 text-success" />
        <div>
          <div className="font-semibold text-foreground">h.ai is operationally ready.</div>
          <p className="text-sm text-muted-foreground">The initial company setup is complete. You can archive this project — nothing is deleted.</p>
        </div>
      </div>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await archiveCompany();
            toast.success("Setup archived", { description: "You can reopen it any time from Settings." });
          })
        }
      >
        Archive Setup Project
      </Button>
    </Card>
  );
}
