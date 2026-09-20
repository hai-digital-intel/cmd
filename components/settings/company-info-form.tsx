"use client";

import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateCompanyInfo } from "@/lib/actions/settings";
import { toast } from "sonner";

export interface CompanyInfoData {
  name: string;
  tagline: string | null;
  description: string | null;
  website: string | null;
  jurisdiction: string | null;
}

export function CompanyInfoForm({ company }: { company: CompanyInfoData }) {
  const [name, setName] = useState(company.name);
  const [tagline, setTagline] = useState(company.tagline ?? "");
  const [description, setDescription] = useState(company.description ?? "");
  const [website, setWebsite] = useState(company.website ?? "");
  const [jurisdiction, setJurisdiction] = useState(company.jurisdiction ?? "");
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      await updateCompanyInfo({ name, tagline, description, website, jurisdiction });
      toast.success("Saved");
    });
  }

  return (
    <Card className="space-y-3 p-5">
      <h3 className="text-sm font-semibold text-foreground">Company</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="company-name">Name</Label>
          <Input id="company-name" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-tagline">Tagline</Label>
          <Input id="company-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-website">Website</Label>
          <Input id="company-website" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="company-jurisdiction">Jurisdiction</Label>
          <Input id="company-jurisdiction" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="company-description">Description</Label>
        <Textarea id="company-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={submit} disabled={pending}>
          Save
        </Button>
      </div>
    </Card>
  );
}
