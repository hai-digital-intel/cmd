// Always render fresh — this is a live operational dashboard, not cacheable content.
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/client";
import { getCurrency, isCompanyArchived } from "@/lib/data/settings";
import { computeReadinessOverview } from "@/lib/data/computed";
import { isCompanyReady } from "@/lib/services/launchGates";
import { CompanyInfoForm } from "@/components/settings/company-info-form";
import { PeopleManager } from "@/components/settings/people-manager";
import { PreferencesCard } from "@/components/settings/preferences-card";
import { ArchiveControls } from "@/components/settings/archive-controls";
import { BackupRestore } from "@/components/settings/backup-restore";
import { AiStatusCard } from "@/components/settings/ai-status-card";

export default async function SettingsPage() {
  const [company, people, currency, archived, overview] = await Promise.all([
    prisma.company.findFirst(),
    prisma.person.findMany({ orderBy: { name: "asc" } }),
    getCurrency(),
    isCompanyArchived(),
    computeReadinessOverview(),
  ]);

  const companyReady = isCompanyReady(Object.values(overview.gateEvaluations), overview.openCriticalBlockerCount > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Settings</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          This is a single-user local app — its security depends on your Windows account and device security.
        </p>
      </header>

      {company && (
        <CompanyInfoForm
          company={{
            name: company.name,
            tagline: company.tagline,
            description: company.description,
            website: company.website,
            jurisdiction: company.jurisdiction,
          }}
        />
      )}

      <PeopleManager
        people={people.map((p) => ({ id: p.id, name: p.name, type: p.type, email: p.email, isInternal: p.isInternal }))}
      />

      <PreferencesCard currency={currency} />

      <AiStatusCard />

      <BackupRestore />

      <ArchiveControls archived={archived} companyReady={companyReady} />
    </div>
  );
}