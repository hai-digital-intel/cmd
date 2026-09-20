"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPerson, deletePerson } from "@/lib/actions/people";
import { toast } from "sonner";

const PERSON_TYPES = ["FOUNDER", "SHAREHOLDER", "ACCOUNTANT", "LAWYER", "BANK", "AUTHORITY", "SUPPLIER", "CONTRACTOR", "OTHER"] as const;

export interface PersonData {
  id: string;
  name: string;
  type: string;
  email: string | null;
  isInternal: boolean;
}

export function PeopleManager({ people }: { people: PersonData[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<(typeof PERSON_TYPES)[number]>("CONTRACTOR");
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createPerson({ name: name.trim(), type, email: email.trim() || undefined });
      setName("");
      setEmail("");
      setOpen(false);
      toast.success("Person added");
    });
  }

  return (
    <Card className="space-y-3 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">People & stakeholders</h3>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> Add
        </Button>
      </div>
      <div className="space-y-1.5">
        {people.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
            <div>
              <span className="text-sm font-medium text-foreground">{p.name}</span>
              {p.email && <span className="ml-2 text-xs text-muted-foreground">{p.email}</span>}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{p.type}</Badge>
              {!p.isInternal && (
                <button
                  className="text-muted-foreground hover:text-blocked"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      try {
                        await deletePerson(p.id);
                      } catch {
                        toast.error("Can't remove — this person is referenced elsewhere.");
                      }
                    })
                  }
                  aria-label="Remove person"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a stakeholder</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="person-name">Name</Label>
              <Input id="person-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERSON_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="person-email">Email</Label>
                <Input id="person-email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={pending || !name.trim()}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
