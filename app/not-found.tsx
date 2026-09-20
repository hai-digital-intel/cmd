import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <Compass className="size-8 text-muted-foreground" />
      <h1 className="text-lg font-semibold text-foreground">Can&apos;t find that page</h1>
      <p className="text-sm text-muted-foreground">
        The link might be stale, or the record it pointed to may have been removed.
      </p>
      <Button asChild className="mt-2">
        <Link href="/">Back to Today</Link>
      </Button>
    </div>
  );
}
