"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { setSetting } from "@/lib/actions/settings";
import { toast } from "sonner";

const CURRENCIES = ["AED", "USD", "EUR", "GBP", "SAR"];

export function PreferencesCard({ currency }: { currency: string }) {
  const [value, setValue] = useState(currency);
  const [, startTransition] = useTransition();

  return (
    <Card className="space-y-3 p-5">
      <h3 className="text-sm font-semibold text-foreground">Preferences</h3>
      <div className="max-w-xs space-y-1.5">
        <Label>Currency</Label>
        <Select
          value={value}
          onValueChange={(v) => {
            setValue(v);
            startTransition(async () => {
              await setSetting("currency", v);
              toast.success(`Currency set to ${v}`);
            });
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </Card>
  );
}
