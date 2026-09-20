"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <AlertTriangle className="size-8 text-blocked" />
      <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        Your data is safe — this was a display error, not a data loss. Try again, or head back to Today.
      </p>
      <div className="mt-2 flex gap-2">
        <Button variant="outline" asChild>
          <Link href="/">Back to Today</Link>
        </Button>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
