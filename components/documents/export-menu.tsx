"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ExportKind } from "@/lib/services/documentExport";

const EXPORTS: { kind: ExportKind; label: string }[] = [
  { kind: "register", label: "Document register" },
  { kind: "launch-pack", label: "Launch Pack status" },
  { kind: "review-queue", label: "Professional review queue" },
  { kind: "signature-queue", label: "Signature queue" },
  { kind: "renewals", label: "Renewal schedule" },
];

export function ExportMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download className="size-4" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {EXPORTS.map((e, i) => (
          <div key={e.kind}>
            {i > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel>{e.label}</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <a href={`/api/documents/export?kind=${e.kind}&format=csv`}>CSV</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`/api/documents/export?kind=${e.kind}&format=json`}>JSON</a>
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
