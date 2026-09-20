/**
 * Seeds the initial h.ai setup plan. Idempotent: if a Company already exists we skip
 * entirely, so `npm run setup` is always safe to re-run without clobbering real data.
 *
 * Every fact here is either explicitly given in the product brief (service licence
 * received, 50/50 ownership, DSO/Dtec, haiconsulting.ae, the four services) or is marked
 * NEEDS_CONFIRMATION / NEEDS_VERIFICATION / UNKNOWN. Nothing about actual completion state
 * (bank chosen? VAT required? agreements signed?) is asserted as fact.
 *
 * Every task carries both a `description` (why it matters) and `instructions` (numbered,
 * step-by-step "how do I actually do this" — see lib/services/copilot.ts's sibling concern:
 * this is content, not logic, so it lives entirely in this seed rather than in code).
 * Where the exact legal/tax/banking procedure isn't something this app can know for
 * certain, instructions say "confirm with [accountant/lawyer/bank]" rather than asserting
 * a specific procedure as fact.
 */
import "dotenv/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, type TaskStatus, type VerificationLevel, type Phase, type BlockerType, type CostType, type CostStatus, type PortfolioStage } from "../generated/prisma/client";
import { seedDocuments } from "./seedDocuments";

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
  description: string;
  instructions: string;
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
    // ===================== Corporate & Legal =====================
    {
      key: "licence-on-file",
      categoryKey: "corporate-legal",
      milestoneKey: "corporate-records-verified",
      title: "Trade/service licence on file",
      description: "The DSO/Dtec service licence has been received — this is the legal foundation everything else depends on.",
      instructions: "1. Confirm you have a digital copy (PDF) of the licence saved somewhere retrievable, not just the physical copy.\n2. Upload it to Documents under \"Corporate\" if it isn't there already (see \"Organize corporate documents in the vault\").\n3. Note the issue date and validity period for the renewal-tracking task.",
      status: "DONE", weight: 3, requiredForLaunch: true, verificationLevel: "REQUIRED", evidenceRequired: true,
    },
    {
      key: "licensed-activities-match",
      categoryKey: "corporate-legal",
      milestoneKey: "corporate-records-verified",
      title: "Confirm licensed activities match services offered",
      description: "If your licence's approved activities don't cover what you actually sell, every contract you sign is on shaky ground.",
      instructions: "1. Open your Dtec/DSO licence document and find the list of approved business activities.\n2. Compare it against what h.ai actually does: AI consulting, workflow automation, and report/document generation.\n3. If every service is covered, mark this Done.\n4. If something's missing, contact your Dtec account manager to ask whether an activity amendment is needed.\n5. Attach the activity list (or a screenshot) as evidence so you never have to re-check this.",
      status: "NEEDS_CONFIRMATION", weight: 2, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", estimatedMinutes: 20, dependsOn: ["licence-on-file"],
    },
    {
      key: "shareholder-details-recorded",
      categoryKey: "corporate-legal",
      milestoneKey: "corporate-records-verified",
      title: "Shareholder details recorded",
      description: "Haya 50% / Mohammad 50% on file with Dtec — the official record needs to match reality.",
      instructions: "1. Log into the Dtec/DSO portal.\n2. Under company details, confirm Haya is listed at 50% and Mohammad at 50%.\n3. If it matches, no action needed — this is just a verification record.",
      status: "DONE", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED",
    },
    {
      key: "manager-signatory-details",
      categoryKey: "corporate-legal",
      milestoneKey: "corporate-records-verified",
      title: "Manager/signatory details on file",
      description: "Banks, contracts, and the licence itself all care about who's legally authorized to sign on the company's behalf.",
      instructions: "1. Log into the Dtec/DSO portal (or check your licence certificate) and find the \"General Manager\"/signatory field.\n2. Confirm who's currently listed and whether they still have signing authority.\n3. If it needs to change, contact Dtec's business centre to request an amendment.\n4. Once confirmed, note who the signatory is in this task's notes and mark Done.",
      status: "NEEDS_CONFIRMATION", weight: 1.5, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", estimatedMinutes: 15,
    },
    {
      key: "registered-office-confirmed",
      categoryKey: "corporate-legal",
      milestoneKey: "corporate-records-verified",
      title: "Registered office address confirmed",
      description: "Dubai Silicon Oasis / Dtec — this address appears on contracts, invoices, and official correspondence.",
      instructions: "1. Confirm the registered address on file matches Dtec's records.\n2. No action needed unless the address changes — if it does, that's a formal amendment with Dtec, not just an internal note.",
      status: "DONE", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED",
    },
    {
      key: "corporate-documents-organized",
      categoryKey: "corporate-legal",
      milestoneKey: "corporate-records-verified",
      title: "Organize corporate documents in the vault",
      description: "Upload the licence, MOA, and registration certificates to the Document Vault so you're never digging through email for them.",
      instructions: "1. Go to Documents in this app and click \"Add document\".\n2. Upload the trade licence, Memorandum of Association (MOA), and Dtec registration certificate — one document entry each.\n3. Set each one's category to \"Corporate\" and link it to this task using \"Related task\".\n4. Once all three are uploaded, mark this task Done.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 30, dependsOn: ["licence-on-file"],
    },
    {
      key: "ubo-documentation",
      categoryKey: "corporate-legal",
      milestoneKey: "corporate-records-verified",
      title: "UBO documentation where applicable",
      description: "Ultimate Beneficial Owner disclosure may be required depending on your licence type — worth a five-minute check.",
      instructions: "1. Ask your Dtec company-setup contact or lawyer whether UBO disclosure applies to your licence type.\n2. If it applies, gather ID documents for Haya and Mohammad (passport copy, Emirates ID if applicable) and submit through the Dtec portal or your registered agent.\n3. Upload the confirmation/receipt to Documents.\n4. If it doesn't apply, mark this Not Applicable and note why.",
      status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: false, verificationLevel: "NEEDS_VERIFICATION",
    },
    {
      key: "licence-renewal-tracked",
      categoryKey: "corporate-legal",
      milestoneKey: "corporate-records-verified",
      title: "Track licence renewal date",
      description: "A lapsed licence quietly breaks everything else — banking, contracts, even this app's own premise.",
      instructions: "1. Find the issue date and validity period on your trade licence.\n2. Calculate the renewal deadline and set it as this task's Due date.\n3. Add a matching Expiry date on the licence document in Documents so you get a renewal reminder automatically.",
      status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: false, verificationLevel: "RECOMMENDED", estimatedMinutes: 10,
    },

    // ===================== Banking & Finance — business banking ready =====================
    {
      key: "compare-bank-options",
      categoryKey: "banking-finance",
      milestoneKey: "business-banking-ready",
      title: "Compare business bank options (Wio vs. traditional UAE bank)",
      description: "The bank you pick determines how fast you can actually get paid — this is worth an hour of real comparison, not a guess.",
      instructions: "1. Shortlist 2-3 banks that serve DSO/Dtec-licensed companies (e.g. Wio Bank, Mashreq NeoBiz, Emirates NBD, RAKBANK).\n2. For each, note: minimum balance, monthly fees, online-banking quality, and typical account-opening time for a new small company.\n3. Ask other Dtec founders which bank was fastest for them — this matters more than the marketing page.\n4. Pick one and write the reason in this task's description.\n5. Mark Done, then move to \"Submit business bank application\".",
      status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 45, ownerKey: "haya",
    },
    {
      key: "submit-bank-application",
      categoryKey: "banking-finance",
      milestoneKey: "business-banking-ready",
      title: "Submit business bank application",
      description: "This is the actual application — get the paperwork right the first time to avoid weeks of back-and-forth.",
      instructions: "1. Gather: trade licence, MOA, Dtec registration certificate, passport + visa copies for Haya and Mohammad, and proof of address.\n2. Book an appointment or start the online application with your chosen bank.\n3. Fill in the application listing both shareholders accurately.\n4. Submit and keep the reference/application number somewhere safe.\n5. Add the reference number as a note on this task.",
      status: "NOT_STARTED", weight: 2.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 60, dependsOn: ["compare-bank-options"],
    },
    {
      key: "bank-account-approval",
      categoryKey: "banking-finance",
      milestoneKey: "business-banking-ready",
      title: "Bank account approval",
      description: "This step is in the bank's hands — your job is to not be the reason it's slow.",
      instructions: "1. Respond within 24 hours to any document requests from the bank's compliance team — delayed replies are the #1 cause of slow approvals.\n2. Check in with your relationship manager every 5-7 business days if you haven't heard anything.\n3. Once approved, move straight to \"Activate account and order debit cards\".",
      status: "WAITING_EXTERNAL", weight: 3, requiredForLaunch: true, verificationLevel: "REQUIRED", waitingOn: "Business Bank (TBD)", ownerKey: "bank", externalWaitUntil: daysFromNow(14), dependsOn: ["submit-bank-application"],
    },
    {
      key: "activate-account-cards",
      categoryKey: "banking-finance",
      milestoneKey: "business-banking-ready",
      title: "Activate account and order debit cards",
      description: "An approved account you haven't activated is still an account you can't use.",
      instructions: "1. Visit the branch (or complete online activation) once approved.\n2. Deposit the minimum opening balance if required.\n3. Order a debit card for whoever handles day-to-day payments.\n4. Log in and confirm you can see a real balance before marking Done.",
      status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 20, dependsOn: ["bank-account-approval"],
    },
    {
      key: "online-banking-access",
      categoryKey: "banking-finance",
      milestoneKey: "business-banking-ready",
      title: "Set up online banking access",
      description: "You shouldn't need to visit a branch to check a balance or pay an invoice.",
      instructions: "1. Register for the bank's online/mobile banking using the credentials provided at activation.\n2. Set up two-factor authentication.\n3. Add Mohammad as a viewer/approver if the bank supports multi-user access.\n4. Do a small test transfer to confirm everything actually works end to end.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 15, dependsOn: ["activate-account-cards"],
    },

    // ===================== Banking & Finance — accounting workflow ready =====================
    {
      key: "choose-accounting-platform",
      categoryKey: "banking-finance",
      milestoneKey: "accounting-workflow-ready",
      title: "Choose accounting platform",
      description: "Every downstream finance task — invoicing, chart of accounts, VAT — depends on this one decision.",
      instructions: "1. Compare 2-3 UAE-friendly platforms (e.g. Zoho Books, Xero, QuickBooks) and confirm each supports AED and UAE VAT natively.\n2. Check pricing at your expected transaction volume.\n3. If you've already found a bookkeeper/accountant, confirm they're comfortable with your choice before deciding.\n4. Sign up and note the platform name in this task's description.",
      status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 45,
    },
    {
      key: "engage-bookkeeper",
      categoryKey: "banking-finance",
      milestoneKey: "accounting-workflow-ready",
      title: "Engage bookkeeper/accountant",
      description: "This person unblocks most of the Tax & Compliance category — the earlier they're engaged, the fewer surprises later.",
      instructions: "1. Ask your network or Dtec for accountant/bookkeeper recommendations experienced with free-zone companies.\n2. Get quotes from 2-3, covering monthly bookkeeping and annual filing.\n3. Confirm they can start before your first invoice goes out.\n4. Once engaged, replace \"Accountant (TBD)\" in Settings → People with their real details.",
      status: "NEEDS_CONFIRMATION", weight: 2, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", ownerKey: "accountant",
    },
    {
      key: "chart-of-accounts",
      categoryKey: "banking-finance",
      milestoneKey: "accounting-workflow-ready",
      title: "Set up chart of accounts",
      description: "The categories you set up now are what every future financial report will be organized by.",
      instructions: "1. In your accounting platform, start from its UAE/AED default chart of accounts template.\n2. Add h.ai-specific categories: e.g. \"AI Workflow Audit revenue\", \"AI Automation Sprint revenue\", \"Software subscriptions\", \"Contractor payments\".\n3. Review it with your accountant before your first real transaction.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 30, dependsOn: ["choose-accounting-platform"],
    },
    {
      key: "expense-policy",
      categoryKey: "banking-finance",
      milestoneKey: "accounting-workflow-ready",
      title: "Define expense policy",
      description: "One paragraph now prevents an awkward conversation later about what counts as a business expense.",
      instructions: "1. Decide what counts as a reimbursable business expense (software, travel, client meals) and any approval threshold.\n2. Write it as a short half-page policy.\n3. Share it with Mohammad and any contractors who'll incur expenses.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15,
    },
    {
      key: "invoice-numbering",
      categoryKey: "banking-finance",
      milestoneKey: "accounting-workflow-ready",
      title: "Set invoice numbering scheme",
      description: "Sequential, unambiguous invoice numbers matter for your own records and can matter for VAT compliance.",
      instructions: "1. Pick a format, e.g. HAI-2026-001, incrementing per invoice.\n2. Set it as the starting sequence in your accounting platform's invoice settings.\n3. Confirm with your accountant it matches any UAE tax-invoice numbering requirements.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 10, dependsOn: ["choose-accounting-platform"],
    },
    {
      key: "payment-terms",
      categoryKey: "banking-finance",
      milestoneKey: "accounting-workflow-ready",
      title: "Define standard payment terms",
      description: "Deciding this once means you're not negotiating it fresh with every new client.",
      instructions: "1. Decide default payment terms for clients (e.g. Net 15, 50% upfront for project work).\n2. Decide late-payment terms (grace period, reminder cadence).\n3. Write both down in one paragraph — this becomes the standard text on invoices and proposals.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 15,
    },
    {
      key: "setup-budget-documented",
      categoryKey: "banking-finance",
      milestoneKey: "accounting-workflow-ready",
      title: "Document the setup budget",
      description: "Having the full cost picture written down beats being surprised by it one invoice at a time.",
      instructions: "1. Go to Costs in this app.\n2. List every setup cost you can think of (licence, bank minimum balance, software subscriptions, insurance, domain).\n3. Mark each as Planned, Committed, or Paid as you go.\n4. Mark this Done once Costs reflects your best current estimate.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15,
    },

    // ===================== Tax & Compliance =====================
    {
      key: "corporate-tax-assessment",
      categoryKey: "tax-compliance",
      milestoneKey: "tax-status-verified",
      title: "Corporate Tax assessment",
      description: "Determine Corporate Tax obligations with the accountant — this single answer decides whether the next task is even needed.",
      instructions: "1. Share your business activities, expected revenue, and free-zone licence details with your accountant.\n2. Ask directly: does h.ai qualify for UAE Corporate Tax free-zone relief (0%), or does the standard 9% regime apply?\n3. Get the answer in writing (email is fine) and attach it as evidence on this task.",
      status: "NEEDS_CONFIRMATION", weight: 2, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", ownerKey: "accountant",
    },
    {
      key: "corporate-tax-registration",
      categoryKey: "tax-compliance",
      milestoneKey: "tax-status-verified",
      title: "Corporate Tax registration (if required)",
      description: "Only needed if the assessment says so — don't do this speculatively.",
      instructions: "1. Once your accountant confirms a Corporate Tax obligation, ask them to register h.ai with the Federal Tax Authority via the EmaraTax portal (or do it yourself if comfortable).\n2. Save the Tax Registration Number (TRN) as evidence on this task.\n3. If your accountant says registration isn't required yet, mark this Not Applicable and note the reason and date confirmed.",
      status: "NEEDS_CONFIRMATION", weight: 2, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", dependsOn: ["corporate-tax-assessment"],
    },
    {
      key: "vat-assessment",
      categoryKey: "tax-compliance",
      milestoneKey: "tax-status-verified",
      title: "VAT assessment",
      description: "Whether VAT registration is required depends entirely on projected revenue crossing a threshold — get the number from someone qualified.",
      instructions: "1. Ask your accountant whether your expected annual revenue crosses the UAE's mandatory VAT registration threshold (currently AED 375,000) or the voluntary threshold (AED 187,500).\n2. Get the answer in writing.\n3. This determines whether VAT registration is required now, later, or not yet.",
      status: "NEEDS_CONFIRMATION", weight: 1.5, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", ownerKey: "accountant",
    },
    {
      key: "vat-registration",
      categoryKey: "tax-compliance",
      milestoneKey: "tax-status-verified",
      title: "VAT registration (if applicable)",
      description: "If required, this has to be done before you can legally charge VAT on an invoice.",
      instructions: "1. If your accountant confirms VAT registration is required, register via the FTA's EmaraTax portal (or have your accountant do it).\n2. Save your VAT TRN and registration certificate as evidence.\n3. Once registered, make sure your invoice template calculates and displays VAT correctly.",
      status: "NEEDS_CONFIRMATION", weight: 1.5, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", dependsOn: ["vat-assessment"],
    },
    {
      key: "confirm-financial-year",
      categoryKey: "tax-compliance",
      milestoneKey: "tax-status-verified",
      title: "Confirm financial year end",
      description: "This date sets your Corporate Tax filing deadline (usually 9 months after year-end) — worth a two-minute email to confirm.",
      instructions: "1. Ask your accountant to confirm h.ai's financial year end (many UAE free-zone companies use 31 December, but check your licence/MOA — it may differ).\n2. Write the confirmed date in this task's description.",
      status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", estimatedMinutes: 10, ownerKey: "accountant",
    },
    {
      key: "confirm-accounting-period",
      categoryKey: "tax-compliance",
      milestoneKey: "tax-status-verified",
      title: "Confirm first accounting period",
      description: "Your first period may be a short \"stub\" period rather than a full 12 months.",
      instructions: "1. Confirm with your accountant whether your first accounting period is a full 12 months or a shorter stub period based on your incorporation date.\n2. Note the exact start and end date here.",
      status: "NEEDS_CONFIRMATION", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 10,
    },
    {
      key: "record-retention-policy",
      categoryKey: "tax-compliance",
      milestoneKey: "tax-status-verified",
      title: "Define record-retention policy",
      description: "UAE requires financial records to be kept for a minimum period — decide where they'll actually live.",
      instructions: "1. Note the UAE standard requirement to keep financial records for at least 5 years.\n2. Decide where records will live (accounting platform + a backed-up folder).\n3. Write one sentence confirming that decision.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15,
    },
    {
      key: "audit-requirement",
      categoryKey: "tax-compliance",
      milestoneKey: "tax-status-verified",
      title: "Determine audit requirements",
      description: "Some free-zone company structures require an annual audit — worth ruling in or out early.",
      instructions: "1. Ask your accountant whether your company size/structure requires an annual audit under UAE free-zone rules.\n2. If yes, get a recommendation for an auditor and note their name.\n3. If no, mark this Not Applicable.",
      status: "NEEDS_CONFIRMATION", weight: 0.5, requiredForLaunch: false, verificationLevel: "NEEDS_VERIFICATION",
    },

    // ===================== Governance & Protection — shareholder governance =====================
    {
      key: "draft-shareholder-agreement",
      categoryKey: "governance-protection",
      milestoneKey: "shareholder-governance-ready",
      title: "Draft shareholder agreement",
      description: "This document is what protects both founders if anything ever goes sideways — worth getting right, not fast.",
      instructions: "1. List the key terms to cover: ownership split (50/50), decision-making thresholds, what happens if one founder wants to leave, IP ownership, dispute resolution.\n2. Start from a template (ask a lawyer, or use a reputable free-zone shareholder agreement template) rather than a blank page.\n3. Fill in h.ai's specifics.\n4. Share the draft with Mohammad for initial comments before finalizing.",
      status: "IN_PROGRESS", weight: 2, requiredForLaunch: true, verificationLevel: "REQUIRED", ownerKey: "haya",
    },
    {
      key: "finalize-shareholder-agreement",
      categoryKey: "governance-protection",
      milestoneKey: "shareholder-governance-ready",
      title: "Finalize shareholder agreement",
      description: "Get the shareholder agreement reviewed, signed by both Haya and Mohammad, and stored as evidence.",
      instructions: "1. Incorporate Mohammad's comments into the draft.\n2. Have a lawyer review it (this pairs with \"Confirm IP ownership terms\" if that's still open).\n3. Prepare it for signature (print or e-signature tool).\n4. Both Haya and Mohammad sign.\n5. Scan/save the signed copy and use \"Complete with evidence\" to upload it here.",
      status: "NOT_STARTED", weight: 3, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 30, evidenceRequired: true, dependsOn: ["draft-shareholder-agreement"],
      checklist: ["Review IP ownership clause", "Confirm decision-making thresholds", "Get Mohammad's signature", "Get Haya's signature", "Upload signed copy as evidence"],
    },
    {
      key: "founder-responsibilities",
      categoryKey: "governance-protection",
      milestoneKey: "shareholder-governance-ready",
      title: "Define founder responsibilities & signing authority",
      description: "Ambiguity about who owns what decisions creates friction exactly when you can least afford it.",
      instructions: "1. List the main functional areas (sales, delivery, finance, hiring, tech).\n2. Assign a primary owner for each between Haya and Mohammad.\n3. Note which decisions need both signatures vs. either founder alone.\n4. Add this as a section in, or alongside, the shareholder agreement.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 30, dependsOn: ["draft-shareholder-agreement"],
    },
    {
      key: "decision-rights",
      categoryKey: "governance-protection",
      milestoneKey: "shareholder-governance-ready",
      title: "Define decision rights",
      description: "A simple rule for \"who can approve what\" prevents the same argument from happening every time it comes up.",
      instructions: "1. List decision types that matter (hiring, spending above a threshold, taking on new clients, changing pricing).\n2. For each, decide: single founder, both founders, or a spending limit that requires both above a certain amount.\n3. Write it down as one short table.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 20, dependsOn: ["draft-shareholder-agreement"],
    },
    {
      key: "ip-ownership-terms",
      categoryKey: "governance-protection",
      milestoneKey: "shareholder-governance-ready",
      title: "Confirm IP ownership terms",
      description: "Confirm code, deliverables, and any AI models/prompts h.ai builds actually belong to the company, not to individuals.",
      instructions: "1. Ask your lawyer to confirm the shareholder agreement's IP clause covers code, client deliverables, and any AI models/prompts h.ai builds.\n2. Confirm ownership transfers to h.ai by default, not to individual founders.\n3. Get written confirmation and attach it as evidence.",
      status: "NEEDS_CONFIRMATION", weight: 1.5, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", ownerKey: "lawyer",
    },

    // ===================== Governance & Protection — contract templates =====================
    {
      key: "nda-template",
      categoryKey: "governance-protection",
      milestoneKey: "contract-templates-ready",
      title: "NDA template",
      description: "You'll need this before the first serious conversation with a prospect — have it ready, not improvised.",
      instructions: "1. Find or ask your lawyer for a standard mutual NDA template suitable for UAE use.\n2. Replace placeholder fields with h.ai's details.\n3. Save it in Documents under \"Contracts\" so it's ready to send before any discovery call.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 30,
    },
    {
      key: "msa-template",
      categoryKey: "governance-protection",
      milestoneKey: "contract-templates-ready",
      title: "MSA template",
      description: "The Master Service Agreement is the legal backbone every future Statement of Work will point back to.",
      instructions: "1. Draft (or adapt a template for) a Master Service Agreement covering scope of engagement, payment terms, liability limits, termination, and confidentiality.\n2. Reference your standard payment terms.\n3. Have a lawyer do a quick review before first use.\n4. Save it to Documents.",
      status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 45,
    },
    {
      key: "sow-template",
      categoryKey: "governance-protection",
      milestoneKey: "contract-templates-ready",
      title: "SOW template",
      description: "This is what turns a verbal agreement into something both sides can point to if there's a disagreement about scope.",
      instructions: "1. Build a Statement of Work template with sections for objectives, deliverables, timeline, price, and assumptions.\n2. Reference the MSA rather than repeating all its legal terms.\n3. Save it to Documents so it's ready for the first real proposal.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 30, dependsOn: ["msa-template"],
    },
    {
      key: "contractor-agreement-template",
      categoryKey: "governance-protection",
      milestoneKey: "contract-templates-ready",
      title: "Contractor agreement template",
      description: "Anyone doing paid work for h.ai should sign something — this is that something, ready in advance.",
      instructions: "1. Draft a short agreement for any freelancer/contractor: scope, payment, confidentiality, and IP assignment to h.ai.\n2. Save it to Documents for reuse.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30,
    },
    {
      key: "privacy-policy",
      categoryKey: "governance-protection",
      milestoneKey: "contract-templates-ready",
      title: "Draft privacy policy",
      description: "Needed before the website can publish its privacy page.",
      instructions: "1. List what personal data h.ai actually collects (website contact form, client engagements).\n2. Use a UAE-appropriate privacy policy template or generator as a base.\n3. Mention any AI tools/providers used to process client data.\n4. Hand the final copy to whoever is building the website.",
      status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 45,
    },
    {
      key: "terms-of-service",
      categoryKey: "governance-protection",
      milestoneKey: "contract-templates-ready",
      title: "Draft terms of service",
      description: "Covers acceptable use of your website/services and sets basic liability limits.",
      instructions: "1. Draft terms covering acceptable use of your website/services and liability limitations.\n2. Keep it short and specific to a services business, not a generic SaaS/product template.\n3. Hand off to the website builder once approved.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 45,
    },
    {
      key: "ai-usage-policy",
      categoryKey: "governance-protection",
      milestoneKey: "contract-templates-ready",
      title: "Draft AI usage / data-handling policy",
      description: "A security-conscious client will ask this eventually — better to have the answer ready.",
      instructions: "1. Write one page explaining which AI providers/tools h.ai uses (e.g. Claude, OpenAI) and how client data is or isn't shared with them.\n2. This doubles as an internal policy and something to show a client who asks.\n3. Cross-check against \"Complete AI-provider privacy review\".",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: false, verificationLevel: "RECOMMENDED", estimatedMinutes: 30,
    },
    {
      key: "liability-insurance-review",
      categoryKey: "governance-protection",
      milestoneKey: "contract-templates-ready",
      title: "Review liability & insurance needs",
      description: "Worth a real assessment given h.ai delivers AI/automation advice and systems clients will rely on.",
      instructions: "1. Ask a lawyer or insurance broker whether professional indemnity insurance is advisable for this kind of work.\n2. Get a quote if recommended.\n3. Decide and record whether you're purchasing it now, later, or skipping it — with the reasoning.",
      status: "NEEDS_CONFIRMATION", weight: 0.5, requiredForLaunch: false, verificationLevel: "NEEDS_VERIFICATION", ownerKey: "lawyer",
    },

    // ===================== Brand Foundation =====================
    {
      key: "positioning-tagline",
      categoryKey: "brand-foundation",
      milestoneKey: "brand-system-ready",
      title: "Positioning & tagline finalized",
      description: "\"Practical AI for Technical Businesses.\" — locked in and ready to use everywhere.",
      instructions: "Reference only: use this exact phrase consistently across the website, proposals, and social profiles. No further action needed unless positioning changes.",
      status: "DONE", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED",
    },
    {
      key: "company-description",
      categoryKey: "brand-foundation",
      milestoneKey: "brand-system-ready",
      title: "Company description finalized",
      description: "This is the paragraph that ends up everywhere — website, LinkedIn, email signature. Worth getting right once.",
      instructions: "1. Write a 2-3 sentence description combining the tagline, target sectors (engineering, construction, maintenance, facilities, inspection), and what h.ai actually delivers.\n2. Use it as your LinkedIn \"About\", website hero copy, and email signature line.\n3. Get Mohammad's eyes on it before finalizing.",
      status: "NEEDS_REVIEW", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 20,
    },
    {
      key: "logo-finalized",
      categoryKey: "brand-foundation",
      milestoneKey: "brand-system-ready",
      title: "Logo finalized",
      description: "Every other brand asset (proposals, social, website) waits on this being locked.",
      instructions: "1. Review all existing logo drafts/variations.\n2. Pick the final version and export it in the formats you'll need: SVG/PNG for web, a square version for social avatars, a horizontal version for documents.\n3. Save all formats to Documents under \"Brand\".",
      status: "NEEDS_REVIEW", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED",
    },
    {
      key: "colour-palette",
      categoryKey: "brand-foundation",
      milestoneKey: "brand-system-ready",
      title: "Colour palette defined",
      description: "Locking in exact hex codes means every deck and page actually matches instead of drifting over time.",
      instructions: "1. Lock in a primary, secondary, and accent colour (with hex codes) based on existing brand exploration.\n2. Write them down in this task's description so anyone building a deck or the website can copy them exactly.",
      status: "NEEDS_REVIEW", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 15,
    },
    {
      key: "typography-defined",
      categoryKey: "brand-foundation",
      milestoneKey: "brand-system-ready",
      title: "Typography defined",
      description: "A named font choice, not \"whatever the tool defaults to\".",
      instructions: "1. Choose one heading font and one body font (or one family with weights).\n2. Confirm both are web-safe or available via Google Fonts / Adobe Fonts.\n3. Note the exact names here.",
      status: "NEEDS_REVIEW", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 10,
    },
    {
      key: "brand-standards-doc",
      categoryKey: "brand-foundation",
      milestoneKey: "brand-system-ready",
      title: "Write brand standards document",
      description: "What you'd hand a freelance designer so their work looks on-brand without you checking every detail.",
      instructions: "1. Combine logo usage rules, colours, and typography into a single one-page PDF.\n2. Save it to Documents under \"Brand\".",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 45,
    },
    {
      key: "company-boilerplate",
      categoryKey: "brand-foundation",
      milestoneKey: "brand-system-ready",
      title: "Write company boilerplate paragraph",
      description: "The standard \"About h.ai\" blurb used at the bottom of proposals and any press mention.",
      instructions: "1. Write the standard 2-4 sentence \"About h.ai\" paragraph, including the tagline.\n2. Save it somewhere easy to copy-paste from (this task's description works fine).",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 15,
    },
    {
      key: "email-signature",
      categoryKey: "brand-foundation",
      milestoneKey: "brand-system-ready",
      title: "Design email signature template",
      description: "A small, constant brand touchpoint on every email either founder sends.",
      instructions: "1. Design a simple signature: name, title, h.ai logo, tagline, website link, phone (optional).\n2. Set it up in Gmail/Outlook for both Haya and Mohammad.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15,
    },
    {
      key: "proposal-template-brand",
      categoryKey: "brand-foundation",
      milestoneKey: "brand-system-ready",
      title: "Design proposal template",
      description: "Every future proposal starts from this instead of being rebuilt from scratch under time pressure.",
      instructions: "1. Build a branded slide/document template (colours, logo, fonts from the brand system).\n2. Keep it to a cover page plus 3-4 reusable content slides (problem, approach, pricing, next steps).\n3. Save it as a template file.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 60, dependsOn: ["logo-finalized", "colour-palette"],
    },
    {
      key: "capability-statement",
      categoryKey: "brand-foundation",
      milestoneKey: "brand-system-ready",
      title: "Write capability statement / one-pager",
      description: "Something to attach to a cold email or hand out at an event without improvising.",
      instructions: "1. Write a one-pager: what h.ai does, sectors served, the four core services, and how to get in touch.\n2. Save it to Documents under \"Brand\".",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 45,
    },

    // ===================== Digital Presence — website =====================
    {
      key: "domain-dns-confirmed",
      categoryKey: "digital-presence",
      milestoneKey: "website-launch-ready",
      title: "Domain & DNS confirmed",
      description: "haiconsulting.ae registered and resolving — the address everything else (email, website) sits on top of.",
      instructions: "Reference only: haiconsulting.ae is registered and pointing correctly. No action needed unless DNS changes.",
      status: "DONE", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED",
    },
    {
      key: "business-email-setup",
      categoryKey: "digital-presence",
      milestoneKey: "website-launch-ready",
      title: "Business email on domain set up",
      description: "A @haiconsulting.ae address reads very differently to a prospect than a personal Gmail.",
      instructions: "1. Set up email hosting on the domain (Google Workspace or Microsoft 365) if not already done.\n2. Create at minimum hello@ or info@, plus personal addresses for Haya and Mohammad.\n3. Send a test email to confirm delivery both ways.",
      status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", dependsOn: ["domain-dns-confirmed"],
    },
    {
      key: "website-infra-ready",
      categoryKey: "digital-presence",
      milestoneKey: "website-launch-ready",
      title: "Website infrastructure ready",
      description: "Site is being developed/refined — this is the foundation every content task on the site depends on.",
      instructions: "1. Confirm hosting/platform is live and haiconsulting.ae points to it correctly.\n2. Check the site loads correctly on both desktop and mobile.\n3. Fix any broken links or placeholder (\"lorem ipsum\") sections before calling this Done.",
      status: "IN_PROGRESS", weight: 2, requiredForLaunch: true, verificationLevel: "REQUIRED", dependsOn: ["domain-dns-confirmed"],
    },
    {
      key: "website-copy-complete",
      categoryKey: "digital-presence",
      milestoneKey: "website-launch-ready",
      title: "Website copy complete",
      description: "No placeholder text anywhere a real visitor could see it.",
      instructions: "1. Make sure every page (home, services, about, contact) has final copy — no placeholders.\n2. Copy should reflect the four services and the finalized company description.\n3. Proofread once more before publishing.",
      status: "NEEDS_REVIEW", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", dependsOn: ["website-infra-ready", "company-description"],
    },
    {
      key: "contact-form-working",
      categoryKey: "digital-presence",
      milestoneKey: "website-launch-ready",
      title: "Contact form working",
      description: "A broken contact form silently loses every lead who tries to use it.",
      instructions: "1. Submit a real test message through the website's contact form.\n2. Confirm it arrives in your business inbox (check spam too).\n3. Fix the integration if it doesn't arrive within a few minutes.",
      status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", dependsOn: ["website-infra-ready"],
    },
    {
      key: "privacy-terms-published",
      categoryKey: "digital-presence",
      milestoneKey: "website-launch-ready",
      title: "Privacy & terms pages published",
      description: "Turns the drafted legal text into real, linked pages a visitor can actually reach.",
      instructions: "1. Take the finalized Privacy Policy and Terms of Service text.\n2. Publish them as real pages on the website, usually linked from the footer.\n3. Verify both links work from the live site.",
      status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", dependsOn: ["website-infra-ready", "privacy-policy", "terms-of-service"],
    },
    {
      key: "analytics-installed",
      categoryKey: "digital-presence",
      milestoneKey: "website-launch-ready",
      title: "Analytics installed",
      description: "You can't tell what's working on the site if you can't see who's visiting it.",
      instructions: "1. Set up Google Analytics (or a privacy-friendly alternative) on the website.\n2. Confirm it's tracking by checking real-time visitors while you browse the site yourself.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15, dependsOn: ["website-infra-ready"],
    },
    {
      key: "search-console-verified",
      categoryKey: "digital-presence",
      milestoneKey: "website-launch-ready",
      title: "Search Console verified",
      description: "Lets you see how (and whether) Google is actually indexing the site.",
      instructions: "1. Add haiconsulting.ae to Google Search Console.\n2. Verify ownership (DNS record or HTML file, whichever your host supports).\n3. Submit your sitemap.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15, dependsOn: ["website-infra-ready"],
    },
    {
      key: "seo-baseline",
      categoryKey: "digital-presence",
      milestoneKey: "website-launch-ready",
      title: "SEO baseline pass",
      description: "The minimum needed so search engines understand what h.ai actually does.",
      instructions: "1. Confirm each page has a unique title tag and meta description.\n2. Add basic alt text to images.\n3. Make sure the four services are named clearly somewhere crawlable on the page, not just inside an image.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 45, dependsOn: ["website-copy-complete"],
    },

    // ===================== Digital Presence — LinkedIn =====================
    {
      key: "linkedin-page-created",
      categoryKey: "digital-presence",
      milestoneKey: "linkedin-ready",
      title: "LinkedIn company page created",
      description: "The company page and founder profile are aligned and active — often the first place a prospect checks before replying.",
      instructions: "1. Finish filling in the LinkedIn Company Page: logo, cover image, \"About\" (use the company description), website link, industry, location.\n2. Publish it — LinkedIn pages start as unpublished drafts by default.",
      status: "IN_PROGRESS", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED",
    },
    {
      key: "founder-linkedin-aligned",
      categoryKey: "digital-presence",
      milestoneKey: "linkedin-ready",
      title: "Founder LinkedIn profile aligned with brand",
      description: "A mismatch between the personal and company page reads as unfinished to anyone checking both.",
      instructions: "1. Update Haya's (and Mohammad's, if applicable) personal LinkedIn to list their current role at h.ai.\n2. Make sure the headline and \"About\" section don't contradict the company page's positioning.",
      status: "NEEDS_REVIEW", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 20,
    },
    {
      key: "other-social-profiles",
      categoryKey: "digital-presence",
      milestoneKey: "linkedin-ready",
      title: "Other social profiles created",
      description: "Optional for a B2B technical consultancy, but worth reserving the handle even if you don't post yet.",
      instructions: "1. Decide which platforms actually matter for your audience — LinkedIn matters most for B2B technical buyers.\n2. Register the h.ai handle on any you choose, even before you post, to prevent squatting.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30,
    },
    {
      key: "launch-content-drafted",
      categoryKey: "digital-presence",
      milestoneKey: "linkedin-ready",
      title: "Draft launch announcement content",
      description: "Have the announcement ready to go the moment the website and LinkedIn page are both live.",
      instructions: "1. Draft a short LinkedIn post announcing h.ai is open for business, once the website and LinkedIn page are ready.\n2. Have Mohammad review before it goes out.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30, dependsOn: ["linkedin-page-created", "website-infra-ready"],
    },

    // ===================== Commercial Readiness — proposal & invoice infra =====================
    {
      key: "service-catalogue",
      categoryKey: "commercial-readiness",
      milestoneKey: "proposal-invoice-infra-ready",
      title: "Service catalogue defined",
      description: "AI Workflow Audit, AI Automation Sprint, AI Report/Proposal Generator, Monthly AI Support Retainer.",
      instructions: "Reference only: these four services are the foundation for offer definitions, pricing, and the website's services section.",
      status: "DONE", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED",
    },
    {
      key: "offer-definitions",
      categoryKey: "commercial-readiness",
      milestoneKey: "proposal-invoice-infra-ready",
      title: "Write offer definitions per service",
      description: "Turns four service names into something a prospect can actually understand and buy.",
      instructions: "1. For each of the four services, write what's included, typical duration, and the outcome a client gets.\n2. Keep each to a short paragraph.\n3. This becomes the \"Services\" section of the website and the first slide of every proposal.",
      status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 90, dependsOn: ["service-catalogue"],
    },
    {
      key: "pricing-framework",
      categoryKey: "commercial-readiness",
      milestoneKey: "proposal-invoice-infra-ready",
      title: "Define pricing framework",
      description: "Without this, every quote is improvised — and improvised quotes tend to undercharge.",
      instructions: "1. Decide a pricing model per service (fixed fee, day rate, or retainer).\n2. Research 2-3 comparable providers to sanity-check your numbers.\n3. Write a simple price list or ranges — doesn't need to be public, just decided.",
      status: "NEEDS_CONFIRMATION", weight: 1.5, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", dependsOn: ["offer-definitions"],
    },
    {
      key: "qualification-criteria",
      categoryKey: "commercial-readiness",
      milestoneKey: "proposal-invoice-infra-ready",
      title: "Define lead qualification criteria",
      description: "Saves you from spending hours on a call with a lead who was never going to be a good fit.",
      instructions: "1. Write 3-5 questions that quickly tell you whether a lead is a good fit (industry, company size, budget signal, urgency).\n2. Use these on the first call.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20,
    },
    {
      key: "discovery-workflow",
      categoryKey: "commercial-readiness",
      milestoneKey: "proposal-invoice-infra-ready",
      title: "Document discovery-call workflow",
      description: "A repeatable agenda beats reinventing the call structure every time.",
      instructions: "1. Write the standard agenda for a first discovery call: intro, their pain points, current workflow walkthrough, next steps.\n2. Keep it to bullet points you can glance at during the call.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20,
    },
    {
      key: "proposal-template-commercial",
      categoryKey: "commercial-readiness",
      milestoneKey: "proposal-invoice-infra-ready",
      title: "Build proposal template",
      description: "Combines the brand template with real pricing so the next proposal takes an hour instead of a day.",
      instructions: "1. Combine the branded proposal template with your finalized pricing framework.\n2. Build one full example proposal using a fictional client so you have a ready starting point.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 45, dependsOn: ["proposal-template-brand", "pricing-framework"],
    },
    {
      key: "scope-template",
      categoryKey: "commercial-readiness",
      milestoneKey: "proposal-invoice-infra-ready",
      title: "Build scope-of-work template",
      description: "The fillable version of the legal SOW template, ready to use on short notice.",
      instructions: "1. Adapt the SOW legal template into a fillable scope document with placeholders for objectives, deliverables, and dates.\n2. Test it by filling one out for a hypothetical project.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 30, dependsOn: ["sow-template"],
    },
    {
      key: "pilot-template",
      categoryKey: "commercial-readiness",
      milestoneKey: "proposal-invoice-infra-ready",
      title: "Build pilot/sprint template",
      description: "Makes it easy to offer a small, low-risk paid pilot instead of asking for a big commitment upfront.",
      instructions: "1. Write a one-page template: pilot goal, duration (e.g. 2 weeks), price, and what happens if the client wants to continue.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30,
    },
    {
      key: "client-onboarding-checklist",
      categoryKey: "commercial-readiness",
      milestoneKey: "proposal-invoice-infra-ready",
      title: "Write client onboarding checklist",
      description: "Nothing gets forgotten (like sending the invoice) when a new client signs.",
      instructions: "1. List everything that needs to happen when a new client signs: contract signed, invoice sent, kickoff call booked, access/credentials exchanged.\n2. Turn it into a simple checklist you can copy for each new client.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30,
    },
    {
      key: "invoice-template-ready",
      categoryKey: "commercial-readiness",
      milestoneKey: "proposal-invoice-infra-ready",
      title: "Invoice template ready",
      description: "The moment you can actually get paid depends on this being ready in advance.",
      instructions: "1. In your accounting platform, build an invoice template with the h.ai logo, invoice numbering scheme, and payment terms.\n2. Send yourself a test invoice to check it looks right and the numbers (and VAT, if registered) calculate correctly.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 20, dependsOn: ["choose-accounting-platform", "invoice-numbering"],
    },
    {
      key: "payment-terms-published",
      categoryKey: "commercial-readiness",
      milestoneKey: "proposal-invoice-infra-ready",
      title: "Publish standard payment terms",
      description: "Consistency here avoids confusion between what a proposal says and what the invoice says.",
      instructions: "1. Add your standard payment terms text to the proposal template, invoice template, and MSA.\n2. Confirm all three say the same thing.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 10, dependsOn: ["payment-terms"],
    },

    // ===================== Commercial Readiness — launch kit =====================
    {
      key: "crm-selected",
      categoryKey: "commercial-readiness",
      milestoneKey: "commercial-launch-kit-ready",
      title: "Select CRM",
      description: "Doesn't need to be fancy — it needs to exist so leads stop living in someone's inbox.",
      instructions: "1. Compare 2-3 simple CRMs (e.g. HubSpot free tier, Pipedrive) or a well-structured spreadsheet to start.\n2. Pick based on ease of use over features — you don't need a complex system yet.\n3. Note your choice and reasoning.",
      status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION", estimatedMinutes: 45,
    },
    {
      key: "crm-setup",
      categoryKey: "commercial-readiness",
      milestoneKey: "commercial-launch-kit-ready",
      title: "Set up CRM with lead stages",
      description: "Turns the chosen tool into something you'll actually use day to day.",
      instructions: "1. Set up your chosen CRM with pipeline stages matching your sales process (e.g. Lead → Discovery Booked → Proposal Sent → Won/Lost).\n2. Add any leads you already have.\n3. Confirm you and Mohammad both have access.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 60, dependsOn: ["crm-selected"],
    },
    {
      key: "meeting-template",
      categoryKey: "commercial-readiness",
      milestoneKey: "commercial-launch-kit-ready",
      title: "Build meeting notes template",
      description: "One template you duplicate every time beats starting from a blank page in every meeting.",
      instructions: "1. Build a simple notes template (attendees, discussion, action items, next steps) you can duplicate for every client/prospect meeting.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15,
    },
    {
      key: "sales-deck",
      categoryKey: "commercial-readiness",
      milestoneKey: "commercial-launch-kit-ready",
      title: "Build sales deck",
      description: "What you actually present live — different from the written proposal.",
      instructions: "1. Build an 8-12 slide deck using the brand template: who h.ai is, the problem, the four services, a case study/demo, pricing approach, next steps.\n2. Keep it visual — this is for talking through live, not reading.",
      status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 90, dependsOn: ["proposal-template-brand"],
    },
    {
      key: "outreach-templates",
      categoryKey: "commercial-readiness",
      milestoneKey: "commercial-launch-kit-ready",
      title: "Draft outreach templates",
      description: "Cuts the time it takes to reach out to a new prospect from twenty minutes to two.",
      instructions: "1. Draft 2-3 short cold-outreach templates (LinkedIn/email), each tailored to a different target sector (e.g. facilities management vs. construction).\n2. Keep each under 100 words with one clear call to action.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30,
    },

    // ===================== Portfolio & Proof =====================
    {
      key: "identify-flagship-demo",
      categoryKey: "portfolio-proof",
      milestoneKey: "portfolio-ready",
      title: "Identify flagship demo project",
      description: "The demo has been chosen — see Portfolio for details.",
      instructions: "Reference only: the flagship demo has been selected. See the Portfolio section for what it is.",
      status: "DONE", weight: 0.5, requiredForLaunch: true, verificationLevel: "REQUIRED",
    },
    {
      key: "build-demo-one",
      categoryKey: "portfolio-proof",
      milestoneKey: "portfolio-ready",
      title: "Build/polish demo #1",
      description: "This is the single most persuasive thing you can show a prospect — worth finishing properly.",
      instructions: "1. Finish building the demo to a state you'd be comfortable showing a real prospect live.\n2. Fix any rough edges in the UI or output quality.\n3. Prepare a 2-minute walkthrough script for when you demo it.",
      status: "IN_PROGRESS", weight: 2, requiredForLaunch: true, verificationLevel: "REQUIRED", dependsOn: ["identify-flagship-demo"],
    },
    {
      key: "case-study-demo-one",
      categoryKey: "portfolio-proof",
      milestoneKey: "portfolio-ready",
      title: "Write case study for demo #1",
      description: "Turns \"trust us\" into \"here's exactly what we did and what happened\".",
      instructions: "1. Write up the demo as a mini case study: the problem it solves, how it works, the outcome/impact.\n2. Keep it to half a page with one or two screenshots.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: false, verificationLevel: "RECOMMENDED", estimatedMinutes: 60, dependsOn: ["build-demo-one"],
    },
    {
      key: "architecture-diagram-demo-one",
      categoryKey: "portfolio-proof",
      milestoneKey: "portfolio-ready",
      title: "Draw architecture diagram for demo #1",
      description: "Reassures technical buyers you know what you're doing — keep it simple, not an engineering spec.",
      instructions: "1. Draw a simple diagram showing how data flows through the demo (input → processing/AI step → output).\n2. Keep it simple enough to explain in 30 seconds.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30, dependsOn: ["build-demo-one"],
    },
    {
      key: "portfolio-page-assembled",
      categoryKey: "portfolio-proof",
      milestoneKey: "portfolio-ready",
      title: "Assemble portfolio page on website",
      description: "Where all the proof-of-work lives so a prospect can check it before ever talking to you.",
      instructions: "1. Add a \"Work\" or \"Portfolio\" section to the website featuring the demo, its case study, and the architecture diagram.\n2. Link to a live demo or video walkthrough if possible.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", dependsOn: ["build-demo-one", "website-infra-ready"],
    },

    // ===================== Operating Stack =====================
    {
      key: "google-workspace",
      categoryKey: "operating-stack",
      milestoneKey: "operational-tooling-ready",
      title: "Google Workspace set up",
      description: "The shared email + drive foundation most of the operating stack sits on top of.",
      instructions: "1. Decide if you need Google Workspace (or Microsoft 365) for email + shared drive, or if a simpler setup covers it.\n2. Sign up on the haiconsulting.ae domain if so.\n3. Add both founders as users.",
      status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: false, verificationLevel: "RECOMMENDED",
    },
    {
      key: "cloud-storage-conventions",
      categoryKey: "operating-stack",
      milestoneKey: "operational-tooling-ready",
      title: "Define cloud storage conventions",
      description: "A folder structure decided once beats files scattered everywhere later.",
      instructions: "1. Decide on a folder structure (e.g. by client, by function: Legal/Finance/Brand/Clients).\n2. Create it once in your shared drive.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20,
    },
    {
      key: "github-org",
      categoryKey: "operating-stack",
      milestoneKey: "operational-tooling-ready",
      title: "Create GitHub organisation",
      description: "Keeps company code separate from personal accounts from day one.",
      instructions: "1. Create a GitHub organisation for h.ai, separate from personal accounts.\n2. Add Mohammad and any collaborators with appropriate roles.\n3. Move or start new project repos under it.",
      status: "NEEDS_CONFIRMATION", weight: 0.5, requiredForLaunch: false, verificationLevel: "RECOMMENDED", estimatedMinutes: 15,
    },
    {
      key: "source-control-standards",
      categoryKey: "operating-stack",
      milestoneKey: "operational-tooling-ready",
      title: "Document source-control standards",
      description: "Something to actually hand a contractor instead of explaining it fresh every time.",
      instructions: "1. Write a short note: branch naming, commit message style, when to open a PR.\n2. Keep it to what you'd actually want a contractor to follow.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20, dependsOn: ["github-org"],
    },
    {
      key: "password-manager-adopted",
      categoryKey: "operating-stack",
      milestoneKey: "operational-tooling-ready",
      title: "Adopt a password manager",
      description: "Shared logins living in someone's memory or a notes app is how access gets lost or leaked.",
      instructions: "1. Choose a password manager (1Password, Bitwarden, etc.) that supports a shared team vault.\n2. Set up accounts for Haya and Mohammad.\n3. Start migrating shared logins (bank portal, hosting, domain registrar) into it.",
      status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: false, verificationLevel: "RECOMMENDED", estimatedMinutes: 15,
    },
    {
      key: "project-management-tool",
      categoryKey: "operating-stack",
      milestoneKey: "operational-tooling-ready",
      title: "Choose a project management tool",
      description: "Many small teams don't need a second tool yet beyond this app — decide deliberately rather than by default.",
      instructions: "1. Decide if you need a tool beyond this app for internal work (e.g. Linear, Trello).\n2. If yes, set it up; if no, mark this Not Applicable.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20,
    },
    {
      key: "documentation-home",
      categoryKey: "operating-stack",
      milestoneKey: "operational-tooling-ready",
      title: "Set up documentation home",
      description: "Anywhere but \"in someone's head\" for internal how-tos and decisions.",
      instructions: "1. Pick one place for internal how-tos and decisions (Notion, Google Docs, or a docs folder).\n2. Create the first page: an index linking everything else.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20,
    },
    {
      key: "esignature-tool",
      categoryKey: "operating-stack",
      milestoneKey: "operational-tooling-ready",
      title: "Select e-signature tool",
      description: "Needed for contracts and the shareholder agreement itself.",
      instructions: "1. Choose an e-signature tool (DocuSign, Dropbox Sign, or similar).\n2. Send yourself a test document to confirm it works.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15,
    },
    {
      key: "file-folder-conventions",
      categoryKey: "operating-stack",
      milestoneKey: "operational-tooling-ready",
      title: "Document file/folder conventions",
      description: "So nothing ends up permanently living in someone's Downloads folder.",
      instructions: "1. Write one paragraph describing where different file types live (contracts in Documents, working files in shared drive, code in GitHub).\n2. Share it with anyone who joins.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15,
    },
    {
      key: "backup-strategy-defined",
      categoryKey: "operating-stack",
      milestoneKey: "operational-tooling-ready",
      title: "Define backup strategy",
      description: "Deciding this before you need it is the whole point.",
      instructions: "1. Decide what needs backing up: this app's database (Settings → Backup), the shared drive, and any client deliverables.\n2. Decide how often — this app's export is manual, so set a personal reminder (e.g. weekly).\n3. Write the plan down in one sentence.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: false, verificationLevel: "RECOMMENDED", estimatedMinutes: 15,
    },
    {
      key: "sops-drafted",
      categoryKey: "operating-stack",
      milestoneKey: "operational-tooling-ready",
      title: "Draft SOPs for core workflows",
      description: "Saves you from re-deciding the same steps every single time.",
      instructions: "1. Pick the 2-3 workflows you repeat most (e.g. onboarding a client, sending an invoice).\n2. Write each as a numbered checklist.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 60,
    },

    // ===================== Security & Data Protection =====================
    {
      key: "mfa-enabled",
      categoryKey: "security-data-protection",
      milestoneKey: "security-baseline-ready",
      title: "Enable MFA on core accounts",
      description: "The single highest-leverage security step available to a small company.",
      instructions: "1. Turn on two-factor/multi-factor authentication on: email, banking portal, GitHub, accounting platform, and the password manager.\n2. Use an authenticator app rather than SMS where possible.",
      status: "NOT_STARTED", weight: 1.5, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 15,
    },
    {
      key: "password-manager-rollout",
      categoryKey: "security-data-protection",
      milestoneKey: "security-baseline-ready",
      title: "Confirm password manager rollout",
      description: "Adopting the tool only helps once shared credentials actually live in it.",
      instructions: "1. Confirm every shared account (bank, hosting, domain, social media) has its password stored in the shared vault, not remembered or in a notes app.\n2. Remove any passwords that were shared over email/chat once they're in the vault.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 10, dependsOn: ["password-manager-adopted"],
    },
    {
      key: "device-encryption",
      categoryKey: "security-data-protection",
      milestoneKey: "security-baseline-ready",
      title: "Enable device encryption",
      description: "Protects client data if a laptop is ever lost or stolen.",
      instructions: "1. On Windows: enable BitLocker (Settings → Privacy & Security → Device encryption).\n2. On Mac: enable FileVault.\n3. Do this on every device that touches client data.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "REQUIRED", estimatedMinutes: 15,
    },
    {
      key: "github-permissions-review",
      categoryKey: "security-data-protection",
      milestoneKey: "security-baseline-ready",
      title: "Review GitHub permissions",
      description: "Access tends to accumulate — worth a periodic check.",
      instructions: "1. Review who has access to each repository in the GitHub org.\n2. Remove anyone who no longer needs it; set contractors to minimum required access.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15, dependsOn: ["github-org"],
    },
    {
      key: "cloud-storage-permissions-review",
      categoryKey: "security-data-protection",
      milestoneKey: "security-baseline-ready",
      title: "Review cloud storage permissions",
      description: "\"Anyone with the link\" is an easy setting to forget about.",
      instructions: "1. Check sharing settings on your shared drive folders.\n2. Make sure nothing client-sensitive is set to \"anyone with the link\" and fix any over-shared folders.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 15,
    },
    {
      key: "secrets-handling-policy",
      categoryKey: "security-data-protection",
      milestoneKey: "security-baseline-ready",
      title: "Write secrets/API-key handling policy",
      description: "One accidental commit of an API key to GitHub can be an expensive mistake — set the rule before it happens.",
      instructions: "1. Write down where API keys/secrets are allowed to live (password manager or environment variables) and where they're never allowed (committed to GitHub, shared over chat).\n2. Share this with any contractor before they touch code.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30,
    },
    {
      key: "backup-strategy-verified",
      categoryKey: "security-data-protection",
      milestoneKey: "security-baseline-ready",
      title: "Verify backup strategy actually works",
      description: "A backup you haven't tested isn't a backup — this is the step people skip.",
      instructions: "1. Actually run the backup process you defined (e.g. Settings → Export JSON backup in this app).\n2. Confirm the exported file opens and looks complete.",
      status: "NOT_STARTED", weight: 1, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 20, dependsOn: ["backup-strategy-defined"],
    },
    {
      key: "client-data-segregation",
      categoryKey: "security-data-protection",
      milestoneKey: "security-baseline-ready",
      title: "Define client-data segregation approach",
      description: "One client's files ending up mixed with another's is an easy, avoidable mistake.",
      instructions: "1. Decide how you'll keep one client's data/files separate from another's (separate folders at minimum, separate CRM records, never mixing files in one folder).\n2. Write down the rule you'll follow.",
      status: "NEEDS_CONFIRMATION", weight: 0.5, requiredForLaunch: false, verificationLevel: "NEEDS_VERIFICATION",
    },
    {
      key: "ai-provider-privacy-review",
      categoryKey: "security-data-protection",
      milestoneKey: "security-baseline-ready",
      title: "Complete AI-provider privacy review",
      description: "Feeds directly into the AI usage policy and into any client's own due-diligence questions.",
      instructions: "1. For each AI provider/tool h.ai uses, check their data-retention and training-use policy (do they use your prompts/data to train models?).\n2. Note which providers are safe to use with client data and which aren't.",
      status: "NEEDS_CONFIRMATION", weight: 1, requiredForLaunch: true, verificationLevel: "NEEDS_VERIFICATION",
    },
    {
      key: "contractor-access-process",
      categoryKey: "security-data-protection",
      milestoneKey: "security-baseline-ready",
      title: "Define contractor access process",
      description: "Both onboarding and offboarding need a rule, not an improvisation.",
      instructions: "1. Write down what a new contractor gets access to on day one versus what they don't.\n2. Write the offboarding step too: what gets revoked when they leave.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20,
    },
    {
      key: "incident-response-basics",
      categoryKey: "security-data-protection",
      milestoneKey: "security-baseline-ready",
      title: "Document incident-response basics",
      description: "You don't want to be improvising this during an actual incident.",
      instructions: "1. Write one page: if a laptop is lost, an account is compromised, or client data is exposed, who do you tell first and what do you do first (change passwords, notify the affected client)?\n2. Doesn't need to be formal — just enough to not be improvising.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 30,
    },

    // ===================== Team & People Readiness =====================
    {
      key: "founder-roles-documented",
      categoryKey: "team-people-readiness",
      milestoneKey: "founder-roles-ready",
      title: "Document Haya's founder role",
      description: "Keeps the informal reality and the written record consistent.",
      instructions: "1. Write 3-5 bullet points describing Haya's core responsibilities at h.ai (e.g. delivery, client relationships, product).\n2. Keep it consistent with \"Define founder responsibilities & signing authority\".",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 15, ownerKey: "haya",
    },
    {
      key: "partner-responsibilities",
      categoryKey: "team-people-readiness",
      milestoneKey: "founder-roles-ready",
      title: "Document Mohammad's responsibilities",
      description: "Written down and confirmed directly with Mohammad, not assumed.",
      instructions: "1. Write 3-5 bullet points describing Mohammad's core responsibilities.\n2. Confirm with Mohammad directly that this matches his own understanding.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 15, ownerKey: "mohammad", dependsOn: ["draft-shareholder-agreement"],
    },
    {
      key: "technical-collaborator-model",
      categoryKey: "team-people-readiness",
      milestoneKey: "founder-roles-ready",
      title: "Define technical collaborator model",
      description: "Decide the default arrangement before you're negotiating it under time pressure with a specific person.",
      instructions: "1. Decide how you'll bring in technical help beyond the two founders: contractors per project, or a more permanent arrangement.\n2. Write down the default arrangement (contract type, typical engagement length).",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20,
    },
    {
      key: "contractor-onboarding-checklist",
      categoryKey: "team-people-readiness",
      milestoneKey: "founder-roles-ready",
      title: "Write contractor onboarding checklist",
      description: "So bringing someone on is a checklist, not an ad-hoc scramble.",
      instructions: "1. List the steps for bringing on a new contractor: sign contractor agreement, grant access per the access-provisioning process, brief them on file/folder conventions.\n2. Turn it into a reusable checklist.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20,
    },
    {
      key: "access-provisioning-process",
      categoryKey: "team-people-readiness",
      milestoneKey: "founder-roles-ready",
      title: "Define access provisioning process",
      description: "A short, explicit rule beats re-deciding access on the spot for every new person.",
      instructions: "1. Write down, for a new hire/contractor, exactly what accounts/tools they get access to and who grants it.\n2. A simple table of tool → who requests → who approves is enough.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: false, verificationLevel: "OPTIONAL", estimatedMinutes: 20,
    },
    {
      key: "approval-rights-documented",
      categoryKey: "team-people-readiness",
      milestoneKey: "founder-roles-ready",
      title: "Document approval rights",
      description: "A one-page reference beats re-litigating \"can I approve this alone?\" every time it comes up.",
      instructions: "1. Take the decision-rights list and turn it into a one-page reference (\"Can I approve this alone or does it need both founders?\").\n2. Share it with Mohammad for sign-off.",
      status: "NOT_STARTED", weight: 0.5, requiredForLaunch: true, verificationLevel: "RECOMMENDED", estimatedMinutes: 15, dependsOn: ["decision-rights"],
    },
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
        instructions: t.instructions,
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
  // Document Register (Document Governance system — see PLAN.md §10)
  // -------------------------------------------------------------------------
  const documentRecords = await seedDocuments(prisma, {
    gateRecords,
    categoryRecords,
    milestoneRecords,
    taskRecords,
    people,
  });
  console.log(`Seeded ${documentRecords.size} document register entries.`);

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
