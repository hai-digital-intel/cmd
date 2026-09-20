"use client";

import { useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCost } from "@/lib/actions/costs";
import { COST_STATUSES, COST_TYPES } from "@/lib/types";
import { toast } from "sonner";

export function NewCostDialog({ categories, currency }: { categories: { id: string; name: string }[]; currency: string }) {
  const [open, setOpen] = useState(false);
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<(typeof COST_TYPES)[number]>("ONE_TIME");
  const [status, setStatus] = useState<(typeof COST_STATUSES)[number]>("PLANNED");
  const [frequency, setFrequency] = useState("monthly");
  const [categoryId, setCategoryId] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!vendor.trim() || !amount) return;
    startTransition(async () => {
      await createCost({
        vendor: vendor.trim(),
        description: description.trim() || undefined,
        amount: Number(amount),
        currency,
        type,
        status,
        frequency: type === "RECURRING" ? frequency : undefined,
        categoryId: categoryId || undefined,
      });
      setVendor("");
      setDescription("");
      setAmount("");
      setCategoryId("");
      setOpen(false);
      toast.success("Cost logged");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" /> Log cost
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a setup cost</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cost-vendor">Vendor</Label>
              <Input id="cost-vendor" value={vendor} onChange={(e) => setVendor(e.target.value)} autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost-amount">Amount ({currency})</Label>
              <Input id="cost-amount" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cost-description">Description</Label>
            <Input id="cost-description" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONE_TIME">One-time</SelectItem>
                  <SelectItem value="RECURRING">Recurring</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COST_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {type === "RECURRING" && (
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || !vendor.trim() || !amount}>
            Log cost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
