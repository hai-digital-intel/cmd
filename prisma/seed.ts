/**
 * Seeds the initial h.ai setup plan. Idempotent: if a Company already exists we skip
 * entirely, so `npm run setup` is always safe to re-run without clobbering real data.
 *
 * Every fact here is either explicitly given in the product brief (service licence
 * received, 50/50 ownership, DSO/Dtec, haiconsulting.ae, the four services) or is marked
 * NEEDS_CONFIRMATION / NEEDS_VERIFICATION / UNKNOWN. Nothing about actual completion state
 * (bank chosen? VAT required? agreements signed?) is asserted as fact.
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, type TaskStatus, type VerificationLevel, type Phase, type BlockerType, type CostType, type CostStatus, type PortfolioStage } from "../generated/prisma/client";

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

interface CategorySeed {
  key: string;
  name: string;
  description: string;
  weight: number;
  sortOrder: number;
  gateKey: string;
}

interface GateSeed {
  key: string;
  name: string;
  description: string;
  sortOrder: number;
}

interface MilestoneSeed {
  key: string;
  categoryKey: string;
  title: string;
  description: string;
  requiredForLaunch: boolean;
  weight: number;
  phase: Phase;
  sortOrder: number;
}

interface TaskSeed {
  key: string;
  categoryKey: string;
  milestoneKey: string;
  title: string;
  description?: string;
  status: TaskStatus;
  weight: number;
  requiredForLaunch: boolean;
  verificationLevel: VerificationLevel;
  ownerKey?: string;
  estimatedMinutes?: number;
  dueDate?: Date;
  externalWaitUntil?: Date;
  waitingOn?: string;
  blockedReason?: string;
  evidenceRequired?: boolean;
  dependsOn?: string[];
  checklist?: string[];
}

async function main() {
  const existing = await prisma.company.count();
  if (existing > 0) {
    console.log("Database already has data — skipping seed (safe re-run).");
    return;
  }

  console.log("Seeding h.ai Setup Command Center...");

  // -------------------------------------------------------------------------
  // Launch gates
  // -------------------------------------------------------------------------
  const gates: GateSeed[] = [
    { key: "legal", name: "Corporate & Legal", description: "Licence, registration, and corporate records are in order.", sortOrder: 0 },
    { key: "finance", name: "Finance", description: "Business banking and accounting workflow are operational.", sortOrder: 1 },
    { key: "tax_compliance", name: "Tax & Compliance", description: "Tax position is assessed and any required registrations are filed.", sortOrder: 2 },
    { key: "governance", name: "Governance", description: "Shareholder governance and contract templates are in place.", sortOrder: 3 },
    { key: "brand", name: "Brand", description: "Brand foundation is consistent and ready to present.", sortOrder: 4 },
    { key: "digital", name: "Digital", description: "Website and social presence are live and on-brand.", sortOrder: 5 },
    { key: "commercial", name: "Commercial", description: "Offers, proposals, and proof of work are ready to sell.", sortOrder: 6 },
    { key: "operations", name: "Operations", description: "Operating stack and team roles are functional.", sortOrder: 7 },
    { key: "security", name: "Security", description: "Security and data-protection baseline is in place.", sortOrder: 8 },
  ];

  const gateRecords = new Map<string, string>();
  for (const g of gates) {
    const rec = await prisma.launchGate.create({ data: { key: g.key, name: g.name, description: g.description, sortOrder: g.sortOrder } });
    gateRecords.set(g.key, rec.id);
  }

  // -------------------------------------------------------------------------
  // Categories
  // -------------------------------------------------------------------------
  const categories: CategorySeed[] = [
    { key: "corporate-legal", name: "Corporate & Legal", description: "Licence, registration, and corporate records.", weight: 3, sortOrder: 0, gateKey: "legal" },
    { key: "banking-finance", name: "Banking & Finance", description: "Business bank account and accounting workflow.", weight: 3, sortOrder: 1, gateKey: "finance" },
    { key: "tax-compliance", name: "Tax & Compliance", description: "Corporate tax, VAT, and record-keeping obligations.", weight: 2.5, sortOrder: 2, gateKey: "tax_compliance" },
    { key: "governance-protection", name: "Governance & Protection", description: "Shareholder agreement, IP, and contract templates.", weight: 2.5, sortOrder: 3, gateKey: "governance" },
    { key: "brand-foundation", name: "Brand Foundation", description: "Positioning, visual identity, and core collateral.", weight: 1.5, sortOrder: 4, gateKey: "brand" },
    { key: "digital-presence", name: "Digital Presence", description: "Website, domain, email, and social profiles.", weight: 2, sortOrder: 5, gateKey: "digital" },
    { key: "commercial-readiness", name: "Commercial Readiness", description: "Offers, pricing, proposals, and sales infrastructure.", weight: 2, sortOrder: 6, gateKey: "commercial" },
    { key: "portfolio-proof", name: "Portfolio & Proof", description: "Demos and case studies that prove the work.", weight: 1.5, sortOrder: 7, gateKey: "commercial" },
    { key: "operating-stack", name: "Operating Stack", description: "The day-to-day tools the business runs on.", weight: 1, sortOrder: 8, gateKey: "operations" },
    { key: "security-data-protection", name: "Security & Data Protection", description: "Access control, backups, and data-handling basics.", weight: 1.5, sortOrder: 9, gateKey: "security" },
    { key: "team-people-readiness", name: "Team & People Readiness", description: "Founder/partner roles and collaborator processes.", weight: 1, sortOrder: 10, gateKey: "operations" },
  ];

  const categoryRecords = new Map<string, string>();
  for (const c of categories) {
    const rec = await prisma.category.create({
      data: {
        key: c.key,
        name: c.name,
        description: c.description,
        weight: c.weight,
        sortOrder: c.sortOrder,
        launchGateId: gateRecords.get(c.gateKey),
      },
    });
    categoryRecords.set(c.key, rec.id);
  }

  // -------------------------------------------------------------------------
  // Company & people
  // -------------------------------------------------------------------------
  const company = await prisma.company.create({
    data: {
      name: "h.ai",
      tagline: "Practical AI for Technical Businesses",
      description:
        "h.ai helps technical businesses — engineering, construction, maintenance, facilities, inspection, and other operations-heavy SMEs — automate reports, workflows, documents, knowledge, and operations using practical AI systems.",
      jurisdiction: "Dubai Silicon Oasis (Dtec), UAE",
      website: "haiconsulting.ae",
    },
  });

  const haya = await prisma.person.create({ data: { name: "Haya", type: "FOUNDER", isInternal: true } });
  const mohammad = await prisma.person.create({ data: { name: "Mohammad", type: "SHAREHOLDER", isInternal: true } });
  const accountant = await prisma.person.create({ data: { name: "Accountant (TBD)", type: "ACCOUNTANT", isInternal: false, notes: "NEEDS_CONFIRMATION — accountant not yet engaged." } });
  const bank = await prisma.person.create({ data: { name: "Business Bank (TBD)", type: "BANK", isInternal: false, notes: "NEEDS_CONFIRMATION — bank not yet selected." } });
  const lawyer = await prisma.person.create({ data: { name: "Lawyer (TBD)", type: "LAWYER", isInternal: false, notes: "NEEDS_CONFIRMATION — legal counsel not yet engaged." } });

  await prisma.ownership.create({ data: { companyId: company.id, personId: haya.id, percent: 50, role: "Founder" } });
  await prisma.ownership.create({ data: { companyId: company.id, personId: mohammad.id, percent: 50, role: "Shareholder" } });

  const people: Record<string, string> = {
    haya: haya.id,
    mohammad: mohammad.id,
    accountant: accountant.id,
    bank: bank.id,
    lawyer: lawyer.id,
  };

  // -------------------------------------------------------------------------
  // Milestones
  // -------------------------------------------------------------------------
  const milestones: MilestoneSeed[] = [
    { key: "corporate-records-verified", categoryKey: "corporate-legal", title: "Corporate records verified", description: "Licence, ownership, and registered-office details are on file and accurate.", requiredForLaunch: true, weight: 2, phase: "FOUNDATION", sortOrder: 0 },

    { key: "business-banking-ready", categoryKey: "banking-finance", title: "Business banking ready", description: "A business bank account is open and usable.", requiredForLaunch: true, weight: 2.5, phase: "LEGAL_FINANCE", sortOrder: 0 },
    { key: "accounting-workflow-ready", categoryKey: "banking-finance", title: "Accounting workflow ready", description: "Bookkeeping platform, accountant, and financial processes are functioning.", requiredForLaunch: true, weight: 2, phase: "LEGAL_FINANCE", sortOrder: 1 },

    { key: "tax-status-verified", categoryKey: "tax-compliance", title: "Tax status verified", description: "Corporate Tax and VAT position is known and any required registration is filed.", requiredForLaunch: true, weight: 2, phase: "LEGAL_FINANCE", sortOrder: 0 },

    { key: "shareholder-governance-ready", categoryKey: "governance-protection", title: "Shareholder governance ready", description: "Ownership, decision rights, and IP terms are formally agreed.", requiredForLaunch: true, weight: 2.5, phase: "LEGAL_FINANCE", sortOrder: 0 },
    { key: "contract-templates-ready", categoryKey: "governance-protection", title: "Contract templates ready", description: "Standard legal paper is drafted and ready to send.", requiredForLaunch: true, weight: 1.5, phase: "LEGAL_FINANCE", sortOrder: 1 },

    { key: "brand-system-ready", categoryKey: "brand-foundation", title: "Brand system ready", description: "Visual identity and core collateral are consistent and usable.", requiredForLaunch: true, weight: 1.5, phase: "BRAND_DIGITAL", sortOrder: 0 },

    { key: "website-launch-ready", categoryKey: "digital-presence", title: "Website launch-ready", description: "haiconsulting.ae is live, accurate, and complete.", requiredForLaunch: true, weight: 2, phase: "BRAND_DIGITAL", sortOrder: 0 },
    { key: "linkedin-ready", categoryKey: "digital-presence", title: "LinkedIn company page ready", description: "The company page and founder profile are aligned and active.", requiredForLaunch: true, weight: 1, phase: "BRAND_DIGITAL", sortOrder: 1 },

    { key: "proposal-invoice-infra-ready", categoryKey: "commercial-readiness", title: "Proposal & invoice infrastructure ready", description: "Offers can be priced, proposed, and invoiced end to end.", requiredForLaunch: true, weight: 2, phase: "COMMERCIAL_INFRASTRUCTURE", sortOrder: 0 },
    { key: "commercial-launch-kit-ready", categoryKey: "commercial-readiness", title: "Commercial launch kit ready", description: "CRM and sales collateral are ready to run outreach.", requiredForLaunch: true, weight: 1.5, phase: "COMMERCIAL_INFRASTRUCTURE", sortOrder: 1 },

    { key: "portfolio-ready", categoryKey: "portfolio-proof", title: "Portfolio ready", description: "At least one demo is polished enough to show a prospect.", requiredForLaunch: true, weight: 1.5, phase: "COMMERCIAL_INFRASTRUCTURE", sortOrder: 0 },

    { key: "operational-tooling-ready", categoryKey: "operating-stack", title: "Operational tooling ready", description: "The day-to-day stack (workspace, storage, source control) is set.", requiredForLaunch: false, weight: 1, phase: "OPERATIONAL_READINESS", sortOrder: 0 },

    { key: "security-baseline-ready", categoryKey: "security-data-protection", title: "Security baseline ready", description: "MFA, backups, and access basics are in place.", requiredForLaunch: true, weight: 1.5, phase: "OPERATIONAL_READINESS", sortOrder: 0 },

    { key: "founder-roles-ready", categoryKey: "team-people-readiness", title: "Founder & partner roles ready", description: "Who does what, and who approves what, is written down.", requiredForLaunch: true, weight: 1, phase: "OPERATIONAL_READINESS", sortOrder: 0 },
  ];

  const milestoneRecords = new Map<string, string>();
  for (const m of milestones) {
    const rec = await prisma.milestone.create({
      data: {
        categoryId: categoryRecords.get(m.categoryKey)!,
        title: m.title,
        description: m.description,
        requiredForLaunch: m.requiredForLaunch,
        weight: m.weight,
        phase: m.phase,
        sortOrder: m.sortOrder,
      },
    });
    milestoneRecords.set(m.key, rec.id);
  }

  await prisma.milestoneDependency.create({
    data: { milestoneId: milestoneRecords.get("accounting-workflow-ready")!, dependsOnId: milestoneRecords.get("business-banking-ready")! },
  });
  await prisma.milestoneDependency.create({
    data: { milestoneId: milestoneRecords.get("proposal-invoice-infra-ready")!, dependsOnId: milestoneRecords.get("accounting-workflow-ready")! },
  });
  await prisma.milestoneDependency.create({
    data: { milestoneId: milestoneRecords.get("website-launch-ready")!, dependsOnId: milestoneRecords.get("brand-system-ready")! },
  });
  await prisma.milestoneDependency.create({
    data: { milestoneId: milestoneRecords.get("linkedin-ready")!, dependsOnId: milestoneRecords.get("brand-system-ready")! },
  });
  await prisma.milestoneDependency.create({
    data: { milestoneId: milestoneRecords.get("commercial-launch-kit-ready")!, dependsOnId: milestoneRecords.get("proposal-invoice-infra-ready")! },
  });

  // -------------------------------------------------------------------------
  // Tasks
  // -------------------------------------------------------------------------
  const now = new Date();
  const daysFromNow = (n: number) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000);

  const tasks: TaskSeed[] = [
    // Corporate & Legal
    { key: "licence-on-file", categoryKey: "corporate-legal", milestoneKey: "corporate-records-verified", title: "Trade/service licence on file", description: "DSO/Dtec service licence has been received.", status: "DONE", weight: 3, requiredForLaunch: true, verificationLevel: "REQUIRED", evidenceRequired: true },
    { key: "licensed-activities-match", categoryKey: "corporate-legal", milestoneKey: "corporate-records-verified", title: "Confirm licensed activities match services offered", description: "Verify the licence's listed activities cover AI consulting, automation, and workflow services.", status: "NEEDS_CONFIRMATION", weight: 2, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", estimatedMinutes: 20, dependsOn: ["licence-on-file"] },
    { key: "shareholder-details-recorded", categoryKey: "corporate-legal", milestoneKey: "corporate-records-verified", title: "Shareholder details recorded", description: "Haya 50% / Mohammad 50% on file with Dtec.", status: "DONE", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED" },
    { key: "manager-signatory-details", categoryKey: "corporate-legal", milestoneKey: "corporate-records-verified", title: "Manager/signatory details on file", status: "NEEDS_CONFIRMATION", weight: 1.5, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", estimatedMinutes: 15 },
    { key: "registered-office-confirmed", categoryKey: "corporate-legal", milestoneKey: "corporate-records-verified", title: "Registered office address confirmed", description: "Dubai Silicon Oasis / Dtec.", status: "DONE", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED" },
    { key: "corporate-documents-organized", categoryKey: "corporate-legal", milestoneKey: "corporate-records-verified", title: "Organize corporate documents in the vault", description: "Upload licence, MOA, and registration certificates to the Document Vault.", status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 30, dependsOn: ["licence-on-file"] },
    { key: "ubo-documentation", categoryKey: "corporate-legal", milestoneKey: "corporate-records-verified", title: "UBO documentation where applicable", status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: false, verificationLevel: "NEEDS_VERIFICATION" },
    { key: "licence-renewal-tracked", categoryKey: "corporate-legal", milestoneKey: "corporate-records-verified", title: "Track licence renewal date", status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: false, verificationLevel: "RECOMMENDED", estimatedMinutes: 10 },

    // Banking & Finance — business banking ready
    { key: "compare-bank-options", categoryKey: "banking-finance", milestoneKey: "business-banking-ready", title: "Compare business bank options (Wio vs. traditional UAE bank)", status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 45, ownerKey: "haya" },
    { key: "submit-bank-application", categoryKey: "banking-finance", milestoneKey: "business-banking-ready", title: "Submit business bank application", status: "NOT_STARTED", weight: 2.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 60, dependsOn: ["compare-bank-options"] },
    { key: "bank-account-approval", categoryKey: "banking-finance", milestoneKey: "business-banking-ready", title: "Bank account approval", status: "WAITING_EXTERNAL", weight: 3, requiredForLaunch: true, verificationLevel: "REQUIRED", waitingOn: "Business Bank (TBD)", ownerKey: "bank", externalWaitUntil: daysFromNow(14), dependsOn: ["submit-bank-application"] },
    { key: "activate-account-cards", categoryKey: "banking-finance", milestoneKey: "business-banking-ready", title: "Activate account and order debit cards", status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 20, dependsOn: ["bank-account-approval"] },
    { key: "online-banking-access", categoryKey: "banking-finance", milestoneKey: "business-banking-ready", title: "Set up online banking access", status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 15, dependsOn: ["activate-account-cards"] },

    // Banking & Finance — accounting workflow ready
    { key: "choose-accounting-platform", categoryKey: "banking-finance", milestoneKey: "accounting-workflow-ready", title: "Choose accounting platform", status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 45 },
    { key: "engage-bookkeeper", categoryKey: "banking-finance", milestoneKey: "accounting-workflow-ready", title: "Engage bookkeeper/accountant", status: "NEEDS_CONFIRMATION", weight: 2, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", ownerKey: "accountant" },
    { key: "chart-of-accounts", categoryKey: "banking-finance", milestoneKey: "accounting-workflow-ready", title: "Set up chart of accounts", status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 30, dependsOn: ["choose-accounting-platform"] },
    { key: "expense-policy", categoryKey: "banking-finance", milestoneKey: "accounting-workflow-ready", title: "Define expense policy", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15 },
    { key: "invoice-numbering", categoryKey: "banking-finance", milestoneKey: "accounting-workflow-ready", title: "Set invoice numbering scheme", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 10, dependsOn: ["choose-accounting-platform"] },
    { key: "payment-terms", categoryKey: "banking-finance", milestoneKey: "accounting-workflow-ready", title: "Define standard payment terms", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 15 },
    { key: "setup-budget-documented", categoryKey: "banking-finance", milestoneKey: "accounting-workflow-ready", title: "Document the setup budget", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15 },

    // Tax & Compliance
    { key: "corporate-tax-assessment", categoryKey: "tax-compliance", milestoneKey: "tax-status-verified", title: "Corporate Tax assessment", description: "Determine Corporate Tax obligations with the accountant. NEEDS_CONFIRMATION.", status: "NEEDS_CONFIRMATION", weight: 2, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", ownerKey: "accountant" },
    { key: "corporate-tax-registration", categoryKey: "tax-compliance", milestoneKey: "tax-status-verified", title: "Corporate Tax registration (if required)", status: "NEEDS_CONFIRMATION", weight: 2, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", dependsOn: ["corporate-tax-assessment"] },
    { key: "vat-assessment", categoryKey: "tax-compliance", milestoneKey: "tax-status-verified", title: "VAT assessment", status: "NEEDS_CONFIRMATION", weight: 1.5, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", ownerKey: "accountant" },
    { key: "vat-registration", categoryKey: "tax-compliance", milestoneKey: "tax-status-verified", title: "VAT registration (if applicable)", status: "NEEDS_CONFIRMATION", weight: 1.5, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", dependsOn: ["vat-assessment"] },
    { key: "confirm-financial-year", categoryKey: "tax-compliance", milestoneKey: "tax-status-verified", title: "Confirm financial year end", status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", estimatedMinutes: 10, ownerKey: "accountant" },
    { key: "confirm-accounting-period", categoryKey: "tax-compliance", milestoneKey: "tax-status-verified", title: "Confirm first accounting period", status: "NEEDS_CONFIRMATION", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 10 },
    { key: "record-retention-policy", categoryKey: "tax-compliance", milestoneKey: "tax-status-verified", title: "Define record-retention policy", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15 },
    { key: "audit-requirement", categoryKey: "tax-compliance", milestoneKey: "tax-status-verified", title: "Determine audit requirements", status: "NEEDS_CONFIRMATION", weight: 0.5, requiredForLaunch: false, verificationLevel: "NEEDS_VERIFICATION" },

    // Governance & Protection — shareholder governance
    { key: "draft-shareholder-agreement", categoryKey: "governance-protection", milestoneKey: "shareholder-governance-ready", title: "Draft shareholder agreement", status: "IN_PROGRESS", weight: 2, requiredForLaunch: true, verificationLevel: "REQUIRED", ownerKey: "haya" },
    {
      key: "finalize-shareholder-agreement",
      categoryKey: "governance-protection",
      milestoneKey: "shareholder-governance-ready",
      title: "Finalize shareholder agreement",
      description: "Get the shareholder agreement reviewed, signed by both Haya and Mohammad, and stored as evidence.",
      status: "NOT_STARTED",
      weight: 3,
      requiredForLaunch: true,
      verificationLevel: "REQUIRED",
      estimatedMinutes: 30,
      evidenceRequired: true,
      dependsOn: ["draft-shareholder-agreement"],
      checklist: ["Review IP ownership clause", "Confirm decision-making thresholds", "Get Mohammad's signature", "Get Haya's signature", "Upload signed copy as evidence"],
    },
    { key: "founder-responsibilities", categoryKey: "governance-protection", milestoneKey: "shareholder-governance-ready", title: "Define founder responsibilities & signing authority", status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 30, dependsOn: ["draft-shareholder-agreement"] },
    { key: "decision-rights", categoryKey: "governance-protection", milestoneKey: "shareholder-governance-ready", title: "Define decision rights", status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 20, dependsOn: ["draft-shareholder-agreement"] },
    { key: "ip-ownership-terms", categoryKey: "governance-protection", milestoneKey: "shareholder-governance-ready", title: "Confirm IP ownership terms", status: "NEEDS_CONFIRMATION", weight: 1.5, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", ownerKey: "lawyer" },

    // Governance & Protection — contract templates
    { key: "nda-template", categoryKey: "governance-protection", milestoneKey: "contract-templates-ready", title: "NDA template", status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 30 },
    { key: "msa-template", categoryKey: "governance-protection", milestoneKey: "contract-templates-ready", title: "MSA template", status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 45 },
    { key: "sow-template", categoryKey: "governance-protection", milestoneKey: "contract-templates-ready", title: "SOW template", status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 30, dependsOn: ["msa-template"] },
    { key: "contractor-agreement-template", categoryKey: "governance-protection", milestoneKey: "contract-templates-ready", title: "Contractor agreement template", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30 },
    { key: "privacy-policy", categoryKey: "governance-protection", milestoneKey: "contract-templates-ready", title: "Draft privacy policy", description: "Needed before the website can publish its privacy page.", status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 45 },
    { key: "terms-of-service", categoryKey: "governance-protection", milestoneKey: "contract-templates-ready", title: "Draft terms of service", status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 45 },
    { key: "ai-usage-policy", categoryKey: "governance-protection", milestoneKey: "contract-templates-ready", title: "Draft AI usage / data-handling policy", status: "NOT_STARTED", weight: 1, requiredForLaunch: false, verificationLevel: "RECOMMENDED", estimatedMinutes: 30 },
    { key: "liability-insurance-review", categoryKey: "governance-protection", milestoneKey: "contract-templates-ready", title: "Review liability & insurance needs", status: "NEEDS_CONFIRMATION", weight: 0.5, requiredForLaunch: false, verificationLevel: "NEEDS_VERIFICATION", ownerKey: "lawyer" },

    // Brand Foundation
    { key: "positioning-tagline", categoryKey: "brand-foundation", milestoneKey: "brand-system-ready", title: "Positioning & tagline finalized", description: "\"Practical AI for Technical Businesses.\"", status: "DONE", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED" },
    { key: "company-description", categoryKey: "brand-foundation", milestoneKey: "brand-system-ready", title: "Company description finalized", status: "NEEDS_REVIEW", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 20 },
    { key: "logo-finalized", categoryKey: "brand-foundation", milestoneKey: "brand-system-ready", title: "Logo finalized", status: "NEEDS_REVIEW", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED" },
    { key: "colour-palette", categoryKey: "brand-foundation", milestoneKey: "brand-system-ready", title: "Colour palette defined", status: "NEEDS_REVIEW", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 15 },
    { key: "typography-defined", categoryKey: "brand-foundation", milestoneKey: "brand-system-ready", title: "Typography defined", status: "NEEDS_REVIEW", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 10 },
    { key: "brand-standards-doc", categoryKey: "brand-foundation", milestoneKey: "brand-system-ready", title: "Write brand standards document", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 45 },
    { key: "company-boilerplate", categoryKey: "brand-foundation", milestoneKey: "brand-system-ready", title: "Write company boilerplate paragraph", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 15 },
    { key: "email-signature", categoryKey: "brand-foundation", milestoneKey: "brand-system-ready", title: "Design email signature template", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15 },
    { key: "proposal-template-brand", categoryKey: "brand-foundation", milestoneKey: "brand-system-ready", title: "Design proposal template", status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 60, dependsOn: ["logo-finalized", "colour-palette"] },
    { key: "capability-statement", categoryKey: "brand-foundation", milestoneKey: "brand-system-ready", title: "Write capability statement / one-pager", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 45 },

    // Digital Presence — website
    { key: "domain-dns-confirmed", categoryKey: "digital-presence", milestoneKey: "website-launch-ready", title: "Domain & DNS confirmed", description: "haiconsulting.ae registered and resolving.", status: "DONE", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED" },
    { key: "business-email-setup", categoryKey: "digital-presence", milestoneKey: "website-launch-ready", title: "Business email on domain set up", status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", dependsOn: ["domain-dns-confirmed"] },
    { key: "website-infra-ready", categoryKey: "digital-presence", milestoneKey: "website-launch-ready", title: "Website infrastructure ready", description: "Site is being developed/refined.", status: "IN_PROGRESS", weight: 2, requiredForLaunch: true, verificationLevel: "REQUIRED", dependsOn: ["domain-dns-confirmed"] },
    { key: "website-copy-complete", categoryKey: "digital-presence", milestoneKey: "website-launch-ready", title: "Website copy complete", status: "NEEDS_REVIEW", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", dependsOn: ["website-infra-ready", "company-description"] },
    { key: "contact-form-working", categoryKey: "digital-presence", milestoneKey: "website-launch-ready", title: "Contact form working", status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", dependsOn: ["website-infra-ready"] },
    { key: "privacy-terms-published", categoryKey: "digital-presence", milestoneKey: "website-launch-ready", title: "Privacy & terms pages published", status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", dependsOn: ["website-infra-ready", "privacy-policy", "terms-of-service"] },
    { key: "analytics-installed", categoryKey: "digital-presence", milestoneKey: "website-launch-ready", title: "Analytics installed", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15, dependsOn: ["website-infra-ready"] },
    { key: "search-console-verified", categoryKey: "digital-presence", milestoneKey: "website-launch-ready", title: "Search Console verified", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15, dependsOn: ["website-infra-ready"] },
    { key: "seo-baseline", categoryKey: "digital-presence", milestoneKey: "website-launch-ready", title: "SEO baseline pass", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 45, dependsOn: ["website-copy-complete"] },

    // Digital Presence — LinkedIn
    { key: "linkedin-page-created", categoryKey: "digital-presence", milestoneKey: "linkedin-ready", title: "LinkedIn company page created", status: "IN_PROGRESS", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED" },
    { key: "founder-linkedin-aligned", categoryKey: "digital-presence", milestoneKey: "linkedin-ready", title: "Founder LinkedIn profile aligned with brand", status: "NEEDS_REVIEW", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 20 },
    { key: "other-social-profiles", categoryKey: "digital-presence", milestoneKey: "linkedin-ready", title: "Other social profiles created", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30 },
    { key: "launch-content-drafted", categoryKey: "digital-presence", milestoneKey: "linkedin-ready", title: "Draft launch announcement content", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30, dependsOn: ["linkedin-page-created", "website-infra-ready"] },

    // Commercial Readiness — proposal & invoice infra
    { key: "service-catalogue", categoryKey: "commercial-readiness", milestoneKey: "proposal-invoice-infra-ready", title: "Service catalogue defined", description: "AI Workflow Audit, AI Automation Sprint, AI Report/Proposal Generator, Monthly AI Support Retainer.", status: "DONE", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED" },
    { key: "offer-definitions", categoryKey: "commercial-readiness", milestoneKey: "proposal-invoice-infra-ready", title: "Write offer definitions per service", status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 90, dependsOn: ["service-catalogue"] },
    { key: "pricing-framework", categoryKey: "commercial-readiness", milestoneKey: "proposal-invoice-infra-ready", title: "Define pricing framework", status: "NEEDS_CONFIRMATION", weight: 1.5, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", dependsOn: ["offer-definitions"] },
    { key: "qualification-criteria", categoryKey: "commercial-readiness", milestoneKey: "proposal-invoice-infra-ready", title: "Define lead qualification criteria", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20 },
    { key: "discovery-workflow", categoryKey: "commercial-readiness", milestoneKey: "proposal-invoice-infra-ready", title: "Document discovery-call workflow", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20 },
    { key: "proposal-template-commercial", categoryKey: "commercial-readiness", milestoneKey: "proposal-invoice-infra-ready", title: "Build proposal template", status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 45, dependsOn: ["proposal-template-brand", "pricing-framework"] },
    { key: "scope-template", categoryKey: "commercial-readiness", milestoneKey: "proposal-invoice-infra-ready", title: "Build scope-of-work template", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 30, dependsOn: ["sow-template"] },
    { key: "pilot-template", categoryKey: "commercial-readiness", milestoneKey: "proposal-invoice-infra-ready", title: "Build pilot/sprint template", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30 },
    { key: "client-onboarding-checklist", categoryKey: "commercial-readiness", milestoneKey: "proposal-invoice-infra-ready", title: "Write client onboarding checklist", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30 },
    { key: "invoice-template-ready", categoryKey: "commercial-readiness", milestoneKey: "proposal-invoice-infra-ready", title: "Invoice template ready", status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 20, dependsOn: ["choose-accounting-platform", "invoice-numbering"] },
    { key: "payment-terms-published", categoryKey: "commercial-readiness", milestoneKey: "proposal-invoice-infra-ready", title: "Publish standard payment terms", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 10, dependsOn: ["payment-terms"] },

    // Commercial Readiness — launch kit
    { key: "crm-selected", categoryKey: "commercial-readiness", milestoneKey: "commercial-launch-kit-ready", title: "Select CRM", status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", estimatedMinutes: 45 },
    { key: "crm-setup", categoryKey: "commercial-readiness", milestoneKey: "commercial-launch-kit-ready", title: "Set up CRM with lead stages", status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 60, dependsOn: ["crm-selected"] },
    { key: "meeting-template", categoryKey: "commercial-readiness", milestoneKey: "commercial-launch-kit-ready", title: "Build meeting notes template", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15 },
    { key: "sales-deck", categoryKey: "commercial-readiness", milestoneKey: "commercial-launch-kit-ready", title: "Build sales deck", status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 90, dependsOn: ["proposal-template-brand"] },
    { key: "outreach-templates", categoryKey: "commercial-readiness", milestoneKey: "commercial-launch-kit-ready", title: "Draft outreach templates", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30 },

    // Portfolio & Proof
    { key: "identify-flagship-demo", categoryKey: "portfolio-proof", milestoneKey: "portfolio-ready", title: "Identify flagship demo project", status: "DONE", weight: 0.5, requiredForLaunch: true, verificationLevel: "REQUIRED" },
    { key: "build-demo-one", categoryKey: "portfolio-proof", milestoneKey: "portfolio-ready", title: "Build/polish demo #1", status: "IN_PROGRESS", weight: 2, requiredForLaunch: true, verificationLevel: "REQUIRED", dependsOn: ["identify-flagship-demo"] },
    { key: "case-study-demo-one", categoryKey: "portfolio-proof", milestoneKey: "portfolio-ready", title: "Write case study for demo #1", status: "NOT_STARTED", weight: 1, requiredForLaunch: false, verificationLevel: "RECOMMENDED", estimatedMinutes: 60, dependsOn: ["build-demo-one"] },
    { key: "architecture-diagram-demo-one", categoryKey: "portfolio-proof", milestoneKey: "portfolio-ready", title: "Draw architecture diagram for demo #1", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30, dependsOn: ["build-demo-one"] },
    { key: "portfolio-page-assembled", categoryKey: "portfolio-proof", milestoneKey: "portfolio-ready", title: "Assemble portfolio page on website", status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", dependsOn: ["build-demo-one", "website-infra-ready"] },

    // Operating Stack
    { key: "google-workspace", categoryKey: "operating-stack", milestoneKey: "operational-tooling-ready", title: "Google Workspace set up", status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: false, verificationLevel: "RECOMMENDED" },
    { key: "cloud-storage-conventions", categoryKey: "operating-stack", milestoneKey: "operational-tooling-ready", title: "Define cloud storage conventions", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20 },
    { key: "github-org", categoryKey: "operating-stack", milestoneKey: "operational-tooling-ready", title: "Create GitHub organisation", status: "NEEDS_CONFIRMATION", weight: 0.5, requiredForLaunch: false, verificationLevel: "RECOMMENDED", estimatedMinutes: 15 },
    { key: "source-control-standards", categoryKey: "operating-stack", milestoneKey: "operational-tooling-ready", title: "Document source-control standards", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20, dependsOn: ["github-org"] },
    { key: "password-manager-adopted", categoryKey: "operating-stack", milestoneKey: "operational-tooling-ready", title: "Adopt a password manager", status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: false, verificationLevel: "RECOMMENDED", estimatedMinutes: 15 },
    { key: "project-management-tool", categoryKey: "operating-stack", milestoneKey: "operational-tooling-ready", title: "Choose a project management tool", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20 },
    { key: "documentation-home", categoryKey: "operating-stack", milestoneKey: "operational-tooling-ready", title: "Set up documentation home", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20 },
    { key: "esignature-tool", categoryKey: "operating-stack", milestoneKey: "operational-tooling-ready", title: "Select e-signature tool", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15 },
    { key: "file-folder-conventions", categoryKey: "operating-stack", milestoneKey: "operational-tooling-ready", title: "Document file/folder conventions", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15 },
    { key: "backup-strategy-defined", categoryKey: "operating-stack", milestoneKey: "operational-tooling-ready", title: "Define backup strategy", status: "NOT_STARTED", weight: 1, requiredForLaunch: false, verificationLevel: "RECOMMENDED", estimatedMinutes: 15 },
    { key: "sops-drafted", categoryKey: "operating-stack", milestoneKey: "operational-tooling-ready", title: "Draft SOPs for core workflows", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 60 },

    // Security & Data Protection
    { key: "mfa-enabled", categoryKey: "security-data-protection", milestoneKey: "security-baseline-ready", title: "Enable MFA on core accounts", status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 15 },
    { key: "password-manager-rollout", categoryKey: "security-data-protection", milestoneKey: "security-baseline-ready", title: "Confirm password manager rollout", status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 10, dependsOn: ["password-manager-adopted"] },
    { key: "device-encryption", categoryKey: "security-data-protection", milestoneKey: "security-baseline-ready", title: "Enable device encryption", status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 15 },
    { key: "github-permissions-review", categoryKey: "security-data-protection", milestoneKey: "security-baseline-ready", title: "Review GitHub permissions", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15, dependsOn: ["github-org"] },
    { key: "cloud-storage-permissions-review", categoryKey: "security-data-protection", milestoneKey: "security-baseline-ready", title: "Review cloud storage permissions", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15 },
    { key: "secrets-handling-policy", categoryKey: "security-data-protection", milestoneKey: "security-baseline-ready", title: "Write secrets/API-key handling policy", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30 },
    { key: "backup-strategy-verified", categoryKey: "security-data-protection", milestoneKey: "security-baseline-ready", title: "Verify backup strategy actually works", status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 20, dependsOn: ["backup-strategy-defined"] },
    { key: "client-data-segregation", categoryKey: "security-data-protection", milestoneKey: "security-baseline-ready", title: "Define client-data segregation approach", status: "NEEDS_CONFIRMATION", weight: 0.5, requiredForLaunch: false, verificationLevel: "NEEDS_VERIFICATION" },
    { key: "ai-provider-privacy-review", categoryKey: "security-data-protection", milestoneKey: "security-baseline-ready", title: "Complete AI-provider privacy review", status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION" },
    { key: "contractor-access-process", categoryKey: "security-data-protection", milestoneKey: "security-baseline-ready", title: "Define contractor access process", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20 },
    { key: "incident-response-basics", categoryKey: "security-data-protection", milestoneKey: "security-baseline-ready", title: "Document incident-response basics", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30 },

    // Team & People Readiness
    { key: "founder-roles-documented", categoryKey: "team-people-readiness", milestoneKey: "founder-roles-ready", title: "Document Haya's founder role", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 15, ownerKey: "haya" },
    { key: "partner-responsibilities", categoryKey: "team-people-readiness", milestoneKey: "founder-roles-ready", title: "Document Mohammad's responsibilities", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 15, ownerKey: "mohammad", dependsOn: ["draft-shareholder-agreement"] },
    { key: "technical-collaborator-model", categoryKey: "team-people-readiness", milestoneKey: "founder-roles-ready", title: "Define technical collaborator model", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20 },
    { key: "contractor-onboarding-checklist", categoryKey: "team-people-readiness", milestoneKey: "founder-roles-ready", title: "Write contractor onboarding checklist", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20 },
    { key: "access-provisioning-process", categoryKey: "team-people-readiness", milestoneKey: "founder-roles-ready", title: "Define access provisioning process", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20 },
    { key: "approval-rights-documented", categoryKey: "team-people-readiness", milestoneKey: "founder-roles-ready", title: "Document approval rights", status: "NOT_STARTED", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 15, dependsOn: ["decision-rights"] },
  ];

  const taskRecords = new Map<string, string>();
  for (const t of tasks) {
    const rec = await prisma.task.create({
      data: {
        companyId: company.id,
        categoryId: categoryRecords.get(t.categoryKey)!,
        milestoneId: milestoneRecords.get(t.milestoneKey)!,
        title: t.title,
        description: t.description,
        status: t.status,
        weight: t.weight,
        requiredForLaunch: t.requiredForLaunch,
        verificationLevel: t.verificationLevel,
        ownerId: t.ownerKey ? people[t.ownerKey] : undefined,
        estimatedMinutes: t.estimatedMinutes,
        dueDate: t.dueDate,
        externalWaitUntil: t.externalWaitUntil,
        waitingOn: t.waitingOn,
        blockedReason: t.blockedReason,
        evidenceRequired: t.evidenceRequired ?? false,
        completedAt: t.status === "DONE" ? now : null,
      },
    });
    taskRecords.set(t.key, rec.id);
  }

  for (const t of tasks) {
    if (!t.dependsOn) continue;
    for (const depKey of t.dependsOn) {
      await prisma.taskDependency.create({
        data: { taskId: taskRecords.get(t.key)!, dependsOnId: taskRecords.get(depKey)! },
      });
    }
  }

  for (const t of tasks) {
    if (!t.checklist) continue;
    let sortOrder = 0;
    for (const item of t.checklist) {
      await prisma.checklistItem.create({
        data: { taskId: taskRecords.get(t.key)!, title: item, sortOrder: sortOrder++ },
      });
    }
  }

  // -------------------------------------------------------------------------
  // Blockers
  // -------------------------------------------------------------------------
  const bankBlocker = await prisma.blocker.create({
    data: {
      title: "Waiting on bank for account approval",
      description: "Business bank account application submitted; awaiting approval before banking can be finalized.",
      type: "BANK" as BlockerType,
      waitingOnPersonId: bank.id,
      nextFollowUp: daysFromNow(10),
      status: "OPEN",
    },
  });
  await prisma.blockerTask.create({ data: { blockerId: bankBlocker.id, taskId: taskRecords.get("bank-account-approval")! } });

  const shareholderBlocker = await prisma.blocker.create({
    data: {
      title: "Awaiting Mohammad's signature on shareholder agreement",
      description: "Draft is ready; needs both founders to review and sign before governance readiness can close out.",
      type: "PARTNER" as BlockerType,
      waitingOnPersonId: mohammad.id,
      nextFollowUp: daysFromNow(5),
      status: "OPEN",
    },
  });
  await prisma.blockerTask.create({ data: { blockerId: shareholderBlocker.id, taskId: taskRecords.get("finalize-shareholder-agreement")! } });

  const accountantBlocker = await prisma.blocker.create({
    data: {
      title: "Awaiting accountant guidance on tax timing",
      description: "Corporate Tax and VAT assessments need an engaged accountant before they can be resolved.",
      type: "ACCOUNTANT" as BlockerType,
      waitingOnPersonId: accountant.id,
      nextFollowUp: daysFromNow(7),
      status: "OPEN",
    },
  });
  await prisma.blockerTask.create({ data: { blockerId: accountantBlocker.id, taskId: taskRecords.get("corporate-tax-assessment")! } });
  await prisma.blockerTask.create({ data: { blockerId: accountantBlocker.id, taskId: taskRecords.get("vat-assessment")! } });

  // -------------------------------------------------------------------------
  // Quick-capture notes (inbox)
  // -------------------------------------------------------------------------
  await prisma.note.create({
    data: { rawText: "Need to ask accountant when our financial year ends.", status: "INBOX" },
  });
  await prisma.note.create({
    data: { rawText: "Check Wio vs traditional UAE bank.", status: "INBOX" },
  });

  // -------------------------------------------------------------------------
  // Costs (clearly-labeled placeholders — see notes on each item)
  // -------------------------------------------------------------------------
  const costs: Array<{
    vendor: string;
    description: string;
    categoryKey: string;
    amount: number;
    type: CostType;
    status: CostStatus;
    frequency?: string;
    notes: string;
  }> = [
    { vendor: "Dtec", description: "Service licence fee", categoryKey: "corporate-legal", amount: 0, type: "ONE_TIME", status: "UNKNOWN", notes: "NEEDS_CONFIRMATION — licence received; confirm actual fee from the paid invoice." },
    { vendor: "Business Bank (TBD)", description: "Minimum balance / account setup", categoryKey: "banking-finance", amount: 3000, type: "ONE_TIME", status: "PLANNED", notes: "Placeholder estimate — confirm against the chosen bank's actual requirements." },
    { vendor: "Accounting platform (TBD)", description: "Monthly subscription", categoryKey: "banking-finance", amount: 150, type: "RECURRING", status: "PLANNED", frequency: "monthly", notes: "Placeholder — confirm once a platform is chosen." },
    { vendor: "Domain & hosting", description: "haiconsulting.ae renewal", categoryKey: "digital-presence", amount: 200, type: "RECURRING", status: "PLANNED", frequency: "annual", notes: "Placeholder renewal estimate." },
    { vendor: "Insurer (TBD)", description: "Professional indemnity insurance", categoryKey: "governance-protection", amount: 0, type: "ONE_TIME", status: "UNKNOWN", notes: "NEEDS_CONFIRMATION — insurance requirement not yet assessed." },
    { vendor: "CRM (TBD)", description: "Monthly subscription", categoryKey: "commercial-readiness", amount: 100, type: "RECURRING", status: "PLANNED", frequency: "monthly", notes: "Placeholder pending CRM selection." },
  ];
  for (const c of costs) {
    await prisma.costItem.create({
      data: {
        vendor: c.vendor,
        description: c.description,
        categoryId: categoryRecords.get(c.categoryKey),
        amount: c.amount,
        currency: "AED",
        type: c.type,
        status: c.status,
        frequency: c.frequency,
        notes: c.notes,
      },
    });
  }

  // -------------------------------------------------------------------------
  // Portfolio placeholders
  // -------------------------------------------------------------------------
  const portfolioItems: Array<{ name: string; description: string; technology: string; targetSector: string; businessValue: string; stage: PortfolioStage }> = [
    {
      name: "AI Report Generator (demo)",
      description: "Turns raw inspection/maintenance data into a formatted client-ready PDF report.",
      technology: "Next.js, Claude API",
      targetSector: "Facilities Management / Inspection",
      businessValue: "Cuts report turnaround from hours to minutes.",
      stage: "PROTOTYPE",
    },
    {
      name: "Workflow Automation Sprint (sample)",
      description: "Sample of a short automation engagement: mapping a manual workflow and shipping the first automation.",
      technology: "n8n / Zapier-style automation, LLM step",
      targetSector: "Engineering / Technical SMEs",
      businessValue: "Illustrates the AI Automation Sprint offer end to end.",
      stage: "CONCEPT",
    },
  ];
  for (const p of portfolioItems) {
    await prisma.portfolioItem.create({ data: p });
  }

  // -------------------------------------------------------------------------
  // Settings
  // -------------------------------------------------------------------------
  await prisma.setting.create({ data: { key: "currency", value: JSON.stringify("AED") } });
  await prisma.setting.create({ data: { key: "companyArchived", value: JSON.stringify(false) } });
  await prisma.setting.create({ data: { key: "minutesPerDay", value: JSON.stringify(120) } });

  // -------------------------------------------------------------------------
  // Activity log seed entries
  // -------------------------------------------------------------------------
  await prisma.activity.create({
    data: {
      entityType: "System",
      action: "seeded",
      summary: "h.ai Setup Command Center initialized with the starting setup plan.",
    },
  });
  await prisma.activity.create({
    data: {
      actorId: haya.id,
      entityType: "Task",
      entityId: taskRecords.get("licence-on-file"),
      taskId: taskRecords.get("licence-on-file"),
      action: "completed",
      summary: "Marked 'Trade/service licence on file' as Done.",
    },
  });

  console.log(`Seeded: ${categories.length} categories, ${milestones.length} milestones, ${tasks.length} tasks.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
