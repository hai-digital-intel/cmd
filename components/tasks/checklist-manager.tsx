"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { addChecklistItem, deleteChecklistItem, toggleChecklistItem } from "@/lib/actions/tasks";

export interface ChecklistItemData {
  id: string;
  title: string;
  done: boolean;
}

export function ChecklistManager({ taskId, items }: { taskId: string; items: ChecklistItemData[] }) {
  const [pending, startTransition] = useTransition();
  const [newItem, setNewItem] = useState("");

  return (
    <div className="space-y-1.5">
      {items.map((item) => (
        <div key={item.id} className="group flex items-center gap-2">
          <input
            type="checkbox"
            checked={item.done}
            disabled={pending}
            onChange={(e) => startTransition(() => toggleChecklistItem(item.id, e.target.checked))}
            className="size-4 rounded border-border"
          />
          <span className={item.done ? "flex-1 text-sm text-muted-foreground line-through" : "flex-1 text-sm text-foreground"}>
            {item.title}
          </span>
          <button
            className="focus-ring text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
            onClick={() => startTransition(() => deleteChecklistItem(item.id))}
            aria-label="Remove checklist item"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}
      <form
        className="flex items-center gap-2 pt-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (!newItem.trim()) return;
          startTransition(async () => {
            await addChecklistItem(taskId, newItem.trim());
            setNewItem("");
          });
        }}
      >
        <Plus className="size-3.5 text-muted-foreground" />
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add checklist item"
          className="h-7 border-none bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
      </form>
    </div>
  );
}
