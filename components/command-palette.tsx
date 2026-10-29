"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Sun,
  ListChecks,
  Map as MapIcon,
  OctagonAlert,
  FileText,
  Wallet,
  Gauge,
  History,
  Settings as SettingsIcon,
  Timer,
  Plus,
  Zap,
  MessageCircleQuestion,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { documentFolderLabel } from "@/lib/documentTaxonomy";

export interface SearchableDocument {
  id: string;
  name: string;
  category: string;
  reviewerName: string | null;
}

export function CommandPalette({ onOpenCopilot, documents }: { onOpenCopilot: () => void; documents: SearchableDocument[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function go(href: string) {
    router.push(href);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-[15vh] backdrop-blur-[2px]" onClick={() => setOpen(false)}>
      <Command
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
        onClick={(e) => e.stopPropagation()}
        loop
      >
        <Command.Input
          autoFocus
          placeholder="Search tasks, documents, or jump somewhere..."
          className={cn(
            "focus-ring w-full border-b border-border bg-transparent px-4 py-3 text-sm outline-none placeholder:text-muted-foreground",
          )}
        />
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-2 py-6 text-center text-sm text-muted-foreground">No results.</Command.Empty>

          <Command.Group heading="Go to" className="text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            <PaletteItem icon={Sun} label="Today" onSelect={() => go("/")} />
            <PaletteItem icon={ListChecks} label="Setup" onSelect={() => go("/setup")} />
            <PaletteItem icon={MapIcon} label="Roadmap" onSelect={() => go("/roadmap")} />
            <PaletteItem icon={OctagonAlert} label="Blockers" onSelect={() => go("/blockers")} />
            <PaletteItem icon={FileText} label="Documents" onSelect={() => go("/documents")} />
            <PaletteItem icon={Wallet} label="Costs" onSelect={() => go("/costs")} />
            <PaletteItem icon={Gauge} label="Readiness" onSelect={() => go("/readiness")} />
            <PaletteItem icon={History} label="Activity" onSelect={() => go("/activity")} />
            <PaletteItem icon={SettingsIcon} label="Settings" onSelect={() => go("/settings")} />
          </Command.Group>

          <Command.Group heading="Actions" className="text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
            <PaletteItem icon={Timer} label="Start Focus Mode" onSelect={() => go("/focus")} />
            <PaletteItem icon={Plus} label="Capture a note" onSelect={() => { setOpen(false); window.dispatchEvent(new KeyboardEvent("keydown", { key: "c" })); }} />
            <PaletteItem icon={Zap} label="Show 15-minute wins" onSelect={() => go("/setup?filter=quick-wins")} />
            <PaletteItem icon={MessageCircleQuestion} label="Ask Copilot" onSelect={() => { setOpen(false); onOpenCopilot(); }} />
          </Command.Group>

          {documents.length > 0 && (
            <Command.Group heading="Documents" className="text-xs font-medium text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
              {documents.map((d) => (
                <Command.Item
                  key={d.id}
                  value={`${d.name} ${documentFolderLabel(d.category)} ${d.reviewerName ?? ""}`}
                  onSelect={() => go(`/documents/${d.id}`)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-surface-muted"
                >
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="min-w-0 flex-1 truncate">{d.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{documentFolderLabel(d.category)}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  );
}

function PaletteItem({
  icon: Icon,
  label,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm data-[selected=true]:bg-surface-muted"
    >
      <Icon className="size-4 text-muted-foreground" />
      {label}
    </Command.Item>
  );
}
