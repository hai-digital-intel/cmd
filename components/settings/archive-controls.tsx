"use client";

import { useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { archiveCompany, reopenCompany } from "@/lib/actions/settings";
import { toast } from "sonner";

export function ArchiveControls({ archived, companyReady }: { archived: boolean; companyReady: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card className="space-y-3 p-5">
      <h3 className="text-sm font-semibold text-foreground">Archive</h3>
      <p className="text-xs text-muted-foreground">
        Archiving marks the setup project as complete. Nothing is deleted — every record, document, and activity stays
        browsable, and you can reopen it any time.
      </p>
      {archived ? (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await reopenCompany();
              toast.success("Setup reopened");
            })
          }
        >
          Reopen setup project
        </Button>
      ) : (
        <Button
          variant="outline"
          disabled={pending || !companyReady}
          onClick={() =>
            startTransition(async () => {
              await archiveCompany();
              toast.success("Setup archived");
            })
          }
        >
          Archive setup project
        </Button>
      )}
      {!archived && !companyReady && (
        <p className="text-xs text-muted-foreground">Available once every launch gate is Ready — check Readiness.</p>
      )}
    </Card>
  );
}
