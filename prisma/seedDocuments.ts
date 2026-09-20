/**
 * Seeds the Document Register. Split out from seed.ts purely for file size — this is a large,
 * curated (not exhaustive) sample of the brief's full document list. See PLAN.md §10 for why
 * "curated" rather than "every single named document": the full list runs to several hundred
 * near-duplicate items across 20 categories, which would produce a shallow, low-quality
 * register and directly fights the brief's own "avoid overwhelming" / "not enterprise document
 * management software" constraints. What's here: the full curated Launch Pack (brief §32) close
 * to verbatim, plus a real, individually-considered sample from every remaining category.
 *
 * Nothing is marked ACTIVE/SIGNED/APPROVED unless the existing task seed already established
 * that fact (the trade licence, the 50/50 ownership, the service catalogue). Everything else
 * is DRAFT_REQUIRED / NOT_STARTED / NEEDS_CONFIRMATION / NEEDS_VERIFICATION / TRIGGER_DEPENDENT,
 * per brief §57 — never fabricated as complete or professionally approved.
 */
import type {
  PrismaClient,
  DocumentPriority,
  DocumentRequirementLevel,
  DocumentSourceType,
  DocumentLifecycleStatus,
  DocumentApplicabilityStatus,
  ProfessionalReviewType,
} from "../generated/prisma/client";

interface DocSeed {
  key: string;
  name: string;
  description?: string;
  category: string;
  subcategory?: string;
  priority: DocumentPriority;
  requirementLevel: DocumentRequirementLevel;
  lifecycleStatus: DocumentLifecycleStatus;
  sourceType?: DocumentSourceType;
  applicabilityStatus?: DocumentApplicabilityStatus;
  triggerCondition?: string;
  requiredForLaunch?: boolean;
  launchGateKey?: string;
  requiresProfessionalReview?: boolean;
  professionalReviewType?: ProfessionalReviewType;
  requiresSignature?: boolean;
  signatoryKeys?: string[]; // people keys, unsigned at seed time
  ownerKey?: string;
  relatedTaskKey?: string;
  relatedMilestoneKey?: string;
  relatedCategoryKey?: string; // setup Category key, for cross-linking
  notes?: string;
  legalDisclaimer?: boolean;
}

export interface SeedDocumentsContext {
  gateRecords: Map<string, string>;
  categoryRecords: Map<string, string>;
  milestoneRecords: Map<string, string>;
  taskRecords: Map<string, string>;
  people: Record<string, string>;
}

const DOCS: DocSeed[] = [
  // ===================== CORPORATE =====================
  { key: "trade-licence", name: "Trade / Service Licence", description: "The core legal document everything else depends on.", category: "CORPORATE", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "ACTIVE", sourceType: "AUTHORITY_ISSUED", requiredForLaunch: true, launchGateKey: "legal", relatedTaskKey: "licence-on-file", relatedCategoryKey: "corporate-legal" },
  { key: "cert-incorporation", name: "Certificate of Incorporation / Registration", category: "CORPORATE", priority: "P0", requirementLevel: "NEEDS_VERIFICATION", lifecycleStatus: "NEEDS_CONFIRMATION", sourceType: "AUTHORITY_ISSUED", applicabilityStatus: "NEEDS_CONFIRMATION", requiredForLaunch: true, launchGateKey: "legal", relatedCategoryKey: "corporate-legal", notes: "Confirm whether this exists as a document separate from the trade licence for a Dtec free-zone setup." },
  { key: "shareholder-register", name: "Shareholder Register", category: "CORPORATE", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NEEDS_CONFIRMATION", sourceType: "AUTHORITY_ISSUED", requiredForLaunch: true, launchGateKey: "legal", relatedTaskKey: "shareholder-details-recorded", relatedCategoryKey: "corporate-legal" },
  { key: "ubo-register", name: "UBO / Real Beneficiary Register", category: "CORPORATE", priority: "P0", requirementLevel: "NEEDS_VERIFICATION", lifecycleStatus: "NEEDS_CONFIRMATION", sourceType: "AUTHORITY_ISSUED", applicabilityStatus: "NEEDS_CONFIRMATION", requiredForLaunch: true, launchGateKey: "legal", relatedTaskKey: "ubo-documentation", relatedCategoryKey: "corporate-legal" },
  { key: "manager-register", name: "Manager / Director Register", category: "CORPORATE", priority: "P1", requirementLevel: "REQUIRED", lifecycleStatus: "NEEDS_CONFIRMATION", sourceType: "AUTHORITY_ISSUED", relatedTaskKey: "manager-signatory-details", relatedCategoryKey: "corporate-legal" },
  { key: "signatory-register", name: "Authorised Signatory Register", category: "CORPORATE", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NEEDS_CONFIRMATION", sourceType: "AUTHORITY_ISSUED", relatedCategoryKey: "corporate-legal" },
  { key: "ownership-chart", name: "Ownership Structure Chart", category: "CORPORATE", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "DRAFT_REQUIRED", relatedCategoryKey: "corporate-legal" },
  { key: "registered-office-agreement", name: "Registered Office / Workspace Agreement", description: "Dubai Silicon Oasis / Dtec.", category: "CORPORATE", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "ACTIVE", sourceType: "AUTHORITY_ISSUED", requiredForLaunch: true, launchGateKey: "legal", relatedTaskKey: "registered-office-confirmed", relatedCategoryKey: "corporate-legal" },
  { key: "corporate-doc-index", name: "Corporate Document Index", category: "CORPORATE", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "DRAFT_REQUIRED", relatedTaskKey: "corporate-documents-organized", relatedCategoryKey: "corporate-legal" },
  { key: "licence-activity-schedule", name: "Licence Activity Schedule", category: "CORPORATE", priority: "P1", requirementLevel: "NEEDS_VERIFICATION", lifecycleStatus: "NEEDS_CONFIRMATION", sourceType: "AUTHORITY_ISSUED", relatedTaskKey: "licensed-activities-match", relatedCategoryKey: "corporate-legal" },
  { key: "renewal-calendar", name: "Licence / Corporate Renewal Calendar", category: "CORPORATE", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "DRAFT_REQUIRED", relatedTaskKey: "licence-renewal-tracked", relatedCategoryKey: "corporate-legal" },
  { key: "corporate-kyc-pack", name: "Corporate KYC Pack", category: "CORPORATE", priority: "P1", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "Needed for bank account opening or enterprise client onboarding — build once one of those starts." },
  { key: "poa-template", name: "Power of Attorney Template", category: "CORPORATE", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "A founder needs to delegate signing authority while unavailable." },

  // ===================== GOVERNANCE =====================
  { key: "shareholders-agreement", name: "Shareholders Agreement", description: "Protects both founders if anything ever goes sideways — the single most important governance document given the 50/50 split.", category: "GOVERNANCE", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFTING", requiredForLaunch: true, launchGateKey: "governance", requiresProfessionalReview: true, professionalReviewType: "LAWYER", requiresSignature: true, signatoryKeys: ["haya", "mohammad"], relatedTaskKey: "draft-shareholder-agreement", relatedMilestoneKey: "shareholder-governance-ready", relatedCategoryKey: "governance-protection", legalDisclaimer: true },
  { key: "founder-roles-schedule", name: "Founder / Shareholder Roles & Responsibilities Schedule", category: "GOVERNANCE", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance", relatedTaskKey: "founder-responsibilities", relatedCategoryKey: "governance-protection" },
  { key: "reserved-matters", name: "Reserved Matters Schedule", category: "GOVERNANCE", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance", relatedCategoryKey: "governance-protection" },
  { key: "decision-matrix", name: "Decision Approval Matrix", category: "GOVERNANCE", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance", relatedTaskKey: "decision-rights", relatedCategoryKey: "governance-protection" },
  { key: "signing-authority-matrix", name: "Signing Authority Matrix", category: "GOVERNANCE", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance", relatedCategoryKey: "governance-protection" },
  { key: "deadlock-procedure", name: "Deadlock Resolution Procedure", description: "A 50/50 split makes a tie-breaking mechanism especially important — without one, a disagreement can freeze the company.", category: "GOVERNANCE", priority: "P0", requirementLevel: "RECOMMENDED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance", relatedCategoryKey: "governance-protection", notes: "Strategically important given the 50/50 ownership split — not automatically a legal requirement, but a real practical risk without it." },
  { key: "share-transfer-procedure", name: "Share Transfer Procedure", category: "GOVERNANCE", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "DRAFT_REQUIRED", relatedCategoryKey: "governance-protection" },
  { key: "preemption-rights", name: "Pre-emption Rights Schedule", category: "GOVERNANCE", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "DRAFT_REQUIRED", relatedCategoryKey: "governance-protection" },
  { key: "leaver-provisions", name: "Good Leaver / Bad Leaver Provisions", category: "GOVERNANCE", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED", relatedCategoryKey: "governance-protection" },
  { key: "succession-provisions", name: "Death / Incapacity Succession Provisions", category: "GOVERNANCE", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED", relatedCategoryKey: "governance-protection" },
  { key: "conflict-of-interest-policy", name: "Conflict of Interest Policy", category: "GOVERNANCE", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "DRAFT_REQUIRED", relatedCategoryKey: "governance-protection" },
  { key: "founder-confidentiality", name: "Founder Confidentiality Undertaking", category: "GOVERNANCE", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED", relatedCategoryKey: "governance-protection" },
  { key: "related-party-policy", name: "Related Party Transactions Policy", category: "GOVERNANCE", priority: "P2", requirementLevel: "OPTIONAL", lifecycleStatus: "NOT_STARTED", relatedCategoryKey: "governance-protection" },

  // ===================== IP =====================
  { key: "founder-ip-assignment", name: "Founder IP Assignment Agreement", category: "IP", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance", requiresSignature: true, signatoryKeys: ["haya", "mohammad"], relatedTaskKey: "ip-ownership-terms", relatedCategoryKey: "governance-protection" },
  { key: "background-ip-register", name: "Background IP Register", category: "IP", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance", relatedCategoryKey: "governance-protection" },
  { key: "company-ip-policy", name: "Company IP Policy", category: "IP", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "foreground-ip-register", name: "Foreground / Project IP Register", category: "IP", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "software-ownership-register", name: "Software / Code Ownership Register", category: "IP", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "domain-ownership-register", name: "Domain Ownership Register", category: "IP", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "DRAFT_REQUIRED", relatedTaskKey: "domain-dns-confirmed" },
  { key: "opensource-licence-register", name: "Open Source Licence Register", category: "IP", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "ai-provider-licence-register", name: "Third-Party AI Model / API Licence Register", category: "IP", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "trademark-register", name: "Trademark Register", category: "IP", priority: "P2", requirementLevel: "OPTIONAL", lifecycleStatus: "NOT_STARTED" },
  { key: "dataset-rights-register", name: "Dataset Rights / Licensing Register", category: "IP", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "A client project involves a licensed or third-party dataset." },

  // ===================== TAX_ACCOUNTING =====================
  { key: "corp-tax-position-memo", name: "Corporate Tax Position Memo", category: "TAX_ACCOUNTING", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NEEDS_CONFIRMATION", sourceType: "PROFESSIONAL_CREATED", requiredForLaunch: true, launchGateKey: "tax_compliance", requiresProfessionalReview: true, professionalReviewType: "ACCOUNTANT", relatedTaskKey: "corporate-tax-assessment" },
  { key: "corp-tax-registration-cert", name: "Corporate Tax Registration Certificate / TRN", category: "TAX_ACCOUNTING", priority: "P0", requirementLevel: "NEEDS_VERIFICATION", lifecycleStatus: "NEEDS_CONFIRMATION", sourceType: "AUTHORITY_ISSUED", applicabilityStatus: "NEEDS_CONFIRMATION", requiredForLaunch: true, launchGateKey: "tax_compliance", relatedTaskKey: "corporate-tax-registration", triggerCondition: "Corporate Tax assessment confirms registration is required." },
  { key: "qfzp-assessment", name: "QFZP Eligibility Assessment", description: "Never assume Qualifying Free Zone Person status — this has to come from the accountant.", category: "TAX_ACCOUNTING", priority: "P0", requirementLevel: "NEEDS_VERIFICATION", lifecycleStatus: "NEEDS_CONFIRMATION", sourceType: "PROFESSIONAL_CREATED", requiredForLaunch: true, launchGateKey: "tax_compliance" },
  { key: "sbr-assessment", name: "Small Business Relief Eligibility Assessment", category: "TAX_ACCOUNTING", priority: "P1", requirementLevel: "NEEDS_VERIFICATION", lifecycleStatus: "NEEDS_CONFIRMATION", sourceType: "PROFESSIONAL_CREATED" },
  { key: "financial-year-record", name: "Financial Year / Tax Period Record", category: "TAX_ACCOUNTING", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NEEDS_CONFIRMATION", relatedTaskKey: "confirm-financial-year" },
  { key: "chart-of-accounts-doc", name: "Chart of Accounts", category: "TAX_ACCOUNTING", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "finance", relatedTaskKey: "chart-of-accounts" },
  { key: "setup-budget-doc", name: "Setup Budget", category: "TAX_ACCOUNTING", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "finance", relatedTaskKey: "setup-budget-documented" },
  { key: "cash-flow-forecast", name: "Cash Flow Forecast", category: "TAX_ACCOUNTING", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "finance" },
  { key: "bookkeeper-engagement-letter", name: "Accountant / Bookkeeper Engagement Letter", category: "TAX_ACCOUNTING", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NEEDS_CONFIRMATION", sourceType: "PROFESSIONAL_CREATED", applicabilityStatus: "NEEDS_CONFIRMATION", requiredForLaunch: true, launchGateKey: "finance", relatedTaskKey: "engage-bookkeeper", triggerCondition: "An accountant/bookkeeper is selected and engaged." },
  { key: "accounting-policies-manual", name: "Accounting Policies Manual", category: "TAX_ACCOUNTING", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "monthly-close-checklist", name: "Monthly Close Checklist", category: "TAX_ACCOUNTING", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "record-retention-policy-doc", name: "Financial Record Retention Policy", category: "TAX_ACCOUNTING", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "DRAFT_REQUIRED", relatedTaskKey: "record-retention-policy" },
  { key: "audit-engagement-letter", name: "Audit Engagement Letter", category: "TAX_ACCOUNTING", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", sourceType: "PROFESSIONAL_CREATED", applicabilityStatus: "TRIGGER_DEPENDENT", relatedTaskKey: "audit-requirement", triggerCondition: "An audit is confirmed to be required." },
  { key: "vat-threshold-assessment", name: "VAT Registration Threshold Assessment", category: "TAX_ACCOUNTING", subcategory: "VAT", priority: "P0", requirementLevel: "NEEDS_VERIFICATION", lifecycleStatus: "NEEDS_CONFIRMATION", sourceType: "PROFESSIONAL_CREATED", requiredForLaunch: true, launchGateKey: "tax_compliance", relatedTaskKey: "vat-assessment" },
  { key: "vat-registration-cert", name: "VAT Registration Certificate", category: "TAX_ACCOUNTING", subcategory: "VAT", priority: "P1", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", sourceType: "AUTHORITY_ISSUED", applicabilityStatus: "TRIGGER_DEPENDENT", relatedTaskKey: "vat-registration", triggerCondition: "VAT threshold assessment confirms registration is required." },
  { key: "vat-invoice-template", name: "VAT Tax Invoice Template", category: "TAX_ACCOUNTING", subcategory: "VAT", priority: "P1", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "VAT registration is confirmed required." },
  { key: "vat-treatment-matrix", name: "VAT Treatment Matrix for h.ai Services", category: "TAX_ACCOUNTING", subcategory: "VAT", priority: "P1", requirementLevel: "NEEDS_VERIFICATION", lifecycleStatus: "NEEDS_CONFIRMATION", sourceType: "PROFESSIONAL_CREATED" },
  { key: "einvoicing-readiness-memo", name: "eInvoicing Readiness Memo", category: "TAX_ACCOUNTING", subcategory: "eInvoicing", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "UAE e-invoicing mandate timeline applies to h.ai." },
  { key: "asp-evaluation-checklist", name: "Accredited Service Provider Evaluation Checklist", category: "TAX_ACCOUNTING", subcategory: "eInvoicing", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "e-invoicing implementation begins." },

  // ===================== BANKING =====================
  { key: "bank-evaluation-matrix", name: "Business Bank Evaluation Matrix", category: "BANKING", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "finance", relatedTaskKey: "compare-bank-options" },
  { key: "bank-application-pack", name: "Bank Application Pack", category: "BANKING", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "finance", relatedTaskKey: "submit-bank-application" },
  { key: "bank-opening-resolution", name: "Bank Account Opening Resolution", category: "BANKING", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "finance", requiresSignature: true, signatoryKeys: ["haya", "mohammad"] },
  { key: "bank-signatory-resolution", name: "Bank Authorised Signatory Resolution", category: "BANKING", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "finance" },
  { key: "bank-kyc-pack", name: "Bank KYC Pack", category: "BANKING", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "finance" },
  { key: "bank-confirmation-letter", name: "Bank Account Confirmation / Letter", category: "BANKING", priority: "P0", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", sourceType: "BANK_ISSUED", applicabilityStatus: "TRIGGER_DEPENDENT", requiredForLaunch: true, launchGateKey: "finance", relatedTaskKey: "bank-account-approval", triggerCondition: "Bank approves and opens the account." },
  { key: "source-of-funds-pack", name: "Source of Funds Pack", category: "BANKING", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "payment-approval-matrix", name: "Payment Approval Matrix", category: "BANKING", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "treasury-policy", name: "Treasury / Cash Management Policy", category: "BANKING", priority: "P2", requirementLevel: "OPTIONAL", lifecycleStatus: "NOT_STARTED" },

  // ===================== CLIENT_CONTRACTS =====================
  { key: "mutual-nda", name: "Mutual NDA", category: "CLIENT_CONTRACTS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance", requiresProfessionalReview: true, professionalReviewType: "LAWYER", relatedTaskKey: "nda-template", relatedCategoryKey: "governance-protection" },
  { key: "msa", name: "Master Services Agreement", category: "CLIENT_CONTRACTS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance", requiresProfessionalReview: true, professionalReviewType: "LAWYER", relatedTaskKey: "msa-template", relatedCategoryKey: "governance-protection" },
  { key: "sow-template-doc", name: "Statement of Work Template", category: "CLIENT_CONTRACTS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance", relatedTaskKey: "sow-template", relatedCategoryKey: "governance-protection" },
  { key: "pilot-agreement", name: "Pilot / Proof of Concept Agreement", category: "CLIENT_CONTRACTS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "commercial", relatedTaskKey: "pilot-template" },
  { key: "proposal-template-doc", name: "Proposal Template", category: "CLIENT_CONTRACTS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFTING", requiredForLaunch: true, launchGateKey: "commercial", relatedTaskKey: "proposal-template-commercial" },
  { key: "quotation-template", name: "Quotation Template", category: "CLIENT_CONTRACTS", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "change-request-template", name: "Change Request / Variation Order", category: "CLIENT_CONTRACTS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "commercial" },
  { key: "acceptance-certificate", name: "Project Acceptance Certificate", category: "CLIENT_CONTRACTS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "commercial" },
  { key: "retainer-agreement", name: "Support / Retainer Agreement", description: "Backs the Monthly AI Support Retainer service.", category: "CLIENT_CONTRACTS", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "sla-template", name: "Service Level Agreement", category: "CLIENT_CONTRACTS", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "client-data-return-cert", name: "Client Data Return / Deletion Certificate", category: "CLIENT_CONTRACTS", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "case-study-permission", name: "Case Study / Testimonial Permission", category: "CLIENT_CONTRACTS", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "A completed client engagement is suitable for a case study." },
  { key: "saas-terms", name: "SaaS Terms of Service", category: "CLIENT_CONTRACTS", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "h.ai launches a software-as-a-service product." },
  { key: "saas-eula", name: "Software EULA", category: "CLIENT_CONTRACTS", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "h.ai launches a software-as-a-service product." },
  { key: "saas-sla", name: "SaaS Service Level Agreement", category: "CLIENT_CONTRACTS", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "h.ai launches a software-as-a-service product." },

  // ===================== AI_LEGAL =====================
  { key: "ai-services-schedule", name: "AI Services Schedule", category: "AI_LEGAL", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance", requiresProfessionalReview: true, professionalReviewType: "LAWYER" },
  { key: "ai-output-human-review-terms", name: "AI Output & Human Review Terms", category: "AI_LEGAL", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance", requiresProfessionalReview: true, professionalReviewType: "LAWYER" },
  { key: "client-data-use-schedule", name: "Client Data Use Schedule", category: "AI_LEGAL", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance", requiresProfessionalReview: true, professionalReviewType: "LAWYER" },
  { key: "bg-fg-ip-schedule", name: "Background vs Foreground IP Schedule", category: "AI_LEGAL", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance" },
  { key: "no-training-clause", name: "Model Training / No-Training Clause Options", category: "AI_LEGAL", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", sourceType: "PROFESSIONAL_CREATED", requiredForLaunch: true, launchGateKey: "governance", requiresProfessionalReview: true, professionalReviewType: "LAWYER" },
  { key: "ai-output-ownership-clause", name: "AI Output Ownership Clause", category: "AI_LEGAL", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance" },
  { key: "ai-limitations-schedule", name: "AI Limitations & Assumptions Schedule", category: "AI_LEGAL", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "ai-provider-disclosure-schedule", name: "AI Model / Provider Disclosure Schedule", category: "AI_LEGAL", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "hallucination-responsibility-terms", name: "Hallucination / Validation Responsibility Terms", category: "AI_LEGAL", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "human-in-loop-matrix", name: "Human-in-the-Loop Responsibility Matrix", category: "AI_LEGAL", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },

  // ===================== PRIVACY =====================
  { key: "website-privacy-policy", name: "Website Privacy Policy", description: "Covers both the website's privacy page and general privacy-policy obligations — one record, not duplicated across categories.", category: "PRIVACY", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance", requiresProfessionalReview: true, professionalReviewType: "PRIVACY_SPECIALIST", relatedTaskKey: "privacy-policy", relatedCategoryKey: "governance-protection" },
  { key: "internal-dpp", name: "Internal Data Protection Policy", category: "PRIVACY", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance" },
  { key: "dpa-template", name: "Data Processing Agreement", category: "PRIVACY", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance", requiresProfessionalReview: true, professionalReviewType: "PRIVACY_SPECIALIST" },
  { key: "data-retention-schedule", name: "Data Retention Schedule", category: "PRIVACY", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance" },
  { key: "data-deletion-procedure", name: "Data Deletion Procedure", category: "PRIVACY", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "governance" },
  { key: "personal-data-inventory", name: "Personal Data Inventory", category: "PRIVACY", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "governance" },
  { key: "website-terms-of-use", name: "Website Terms of Use", category: "PRIVACY", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "governance", relatedTaskKey: "terms-of-service" },
  { key: "cookie-policy", name: "Cookie Policy", category: "PRIVACY", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "subprocessor-dpa-template", name: "Subprocessor DPA Template", category: "PRIVACY", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "processing-activities-record", name: "Record of Processing Activities", category: "PRIVACY", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "data-subject-request-procedure", name: "Data Subject Request Procedure", category: "PRIVACY", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "cross-border-transfer-assessment", name: "Cross-Border Data Transfer Assessment", category: "PRIVACY", priority: "P1", requirementLevel: "NEEDS_VERIFICATION", lifecycleStatus: "NEEDS_CONFIRMATION", sourceType: "PROFESSIONAL_CREATED" },
  { key: "client-privacy-notice", name: "Client Privacy Notice", category: "PRIVACY", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "saas-privacy-notice", name: "SaaS Privacy Notice", category: "PRIVACY", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "h.ai launches a software-as-a-service product." },

  // ===================== SECURITY =====================
  { key: "info-security-policy", name: "Information Security Policy", category: "SECURITY", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "security" },
  { key: "access-control-policy", name: "Access Control Policy", category: "SECURITY", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "security" },
  { key: "password-mfa-policy", name: "Password & MFA Policy", category: "SECURITY", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "security", relatedTaskKey: "mfa-enabled" },
  { key: "secrets-policy-doc", name: "Secrets / API Key Management Policy", category: "SECURITY", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "security", relatedTaskKey: "secrets-handling-policy" },
  { key: "incident-response-plan", name: "Incident Response Plan", category: "SECURITY", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "security", relatedTaskKey: "incident-response-basics" },
  { key: "client-data-segregation-standard", name: "Client Data Segregation Standard", category: "SECURITY", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "security", relatedTaskKey: "client-data-segregation" },
  { key: "backup-policy", name: "Backup Policy", category: "SECURITY", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "security", relatedTaskKey: "backup-strategy-defined" },
  { key: "device-security-policy", name: "Device Security Policy", category: "SECURITY", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED", relatedTaskKey: "device-encryption" },
  { key: "backup-restoration-procedure", name: "Backup Restoration Procedure", category: "SECURITY", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED", relatedTaskKey: "backup-strategy-verified" },
  { key: "business-continuity-plan", name: "Business Continuity Plan", category: "SECURITY", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "cloud-ai-security-assessment", name: "Cloud / AI Provider Security Assessment", category: "SECURITY", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED", relatedTaskKey: "ai-provider-privacy-review" },
  { key: "vulnerability-disclosure-policy", name: "Vulnerability Disclosure Policy", category: "SECURITY", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "h.ai launches a software-as-a-service product." },

  // ===================== AI_GOVERNANCE =====================
  { key: "responsible-ai-policy", name: "Responsible AI Policy", category: "AI_GOVERNANCE", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "security" },
  { key: "ai-acceptable-use-policy", name: "AI Acceptable Use Policy", category: "AI_GOVERNANCE", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "security" },
  { key: "ai-project-risk-assessment", name: "AI Project Risk Assessment (template)", category: "AI_GOVERNANCE", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "security" },
  { key: "human-oversight-policy", name: "Human Oversight Policy", category: "AI_GOVERNANCE", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "security" },
  { key: "ai-evaluation-criteria", name: "AI Evaluation & Acceptance Criteria Template", category: "AI_GOVERNANCE", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "security" },
  { key: "dataset-provenance-register", name: "Dataset Provenance Register", category: "AI_GOVERNANCE", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "security" },
  { key: "ai-risk-classification", name: "AI Risk Classification Framework", category: "AI_GOVERNANCE", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "model-selection-standard", name: "Model / Provider Selection Standard", category: "AI_GOVERNANCE", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "ai-vendor-register", name: "AI Vendor Register", category: "AI_GOVERNANCE", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "model-card-template", name: "Model Card Template", category: "AI_GOVERNANCE", priority: "P2", requirementLevel: "OPTIONAL", lifecycleStatus: "NOT_STARTED" },

  // ===================== PROJECT_DELIVERY =====================
  { key: "ai-workflow-audit-template", name: "AI Workflow Audit Template", description: "Backs the AI Workflow Audit service directly.", category: "PROJECT_DELIVERY", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFTING", requiredForLaunch: true, launchGateKey: "commercial" },
  { key: "discovery-questionnaire", name: "Client Discovery Questionnaire", category: "PROJECT_DELIVERY", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "commercial", relatedTaskKey: "discovery-workflow" },
  { key: "workflow-map-template", name: "Current-State Workflow Map (template)", category: "PROJECT_DELIVERY", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "feasibility-assessment-template", name: "AI Feasibility Assessment (template)", category: "PROJECT_DELIVERY", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "architecture-doc-template", name: "System Architecture Document (template)", category: "PROJECT_DELIVERY", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "test-plan-template", name: "Test Plan (template)", category: "PROJECT_DELIVERY", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "uat-template", name: "User Acceptance Test Template", category: "PROJECT_DELIVERY", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "golive-checklist-template", name: "Deployment / Go-Live Checklist", category: "PROJECT_DELIVERY", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "handover-pack-template", name: "Handover Pack Template", category: "PROJECT_DELIVERY", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },

  // ===================== SALES_COMMERCIAL =====================
  { key: "service-catalogue-doc", name: "Service Catalogue", description: "AI Workflow Audit, AI Automation Sprint, AI Report/Proposal Generator, Monthly AI Support Retainer.", category: "SALES_COMMERCIAL", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "ACTIVE", requiredForLaunch: true, launchGateKey: "commercial", relatedTaskKey: "service-catalogue" },
  { key: "company-profile", name: "Company Profile", category: "SALES_COMMERCIAL", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "commercial" },
  { key: "capability-statement-doc", name: "Capability Statement", category: "SALES_COMMERCIAL", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "commercial", relatedTaskKey: "capability-statement" },
  { key: "client-onboarding-checklist-doc", name: "Client Onboarding Checklist", category: "SALES_COMMERCIAL", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "commercial", relatedTaskKey: "client-onboarding-checklist" },
  { key: "ideal-client-profile", name: "Ideal Client Profile", category: "SALES_COMMERCIAL", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "internal-pricing-framework", name: "Internal Pricing Framework", category: "SALES_COMMERCIAL", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NEEDS_CONFIRMATION", relatedTaskKey: "pricing-framework" },
  { key: "crm-stage-definitions", name: "CRM Stage Definitions", category: "SALES_COMMERCIAL", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },

  // ===================== BRAND_MARKETING =====================
  { key: "brand-standards-register", name: "Brand Standards", category: "BRAND_MARKETING", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "brand", relatedTaskKey: "brand-standards-doc" },
  { key: "company-boilerplate-doc", name: "Company Boilerplate", category: "BRAND_MARKETING", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "brand", relatedTaskKey: "company-boilerplate" },
  { key: "legal-website-footer", name: "Legal Website Footer Requirements", category: "BRAND_MARKETING", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "logo-usage-guide", name: "Logo Usage Guide", category: "BRAND_MARKETING", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NEEDS_CONFIRMATION", relatedTaskKey: "logo-finalized" },
  { key: "proposal-design-template", name: "Proposal Design Template", category: "BRAND_MARKETING", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED", relatedTaskKey: "proposal-template-brand" },
  { key: "presentation-template", name: "Presentation Template", category: "BRAND_MARKETING", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED", relatedTaskKey: "sales-deck" },
  { key: "linkedin-content-pack", name: "LinkedIn Company Page Content Pack", category: "BRAND_MARKETING", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "photo-video-release", name: "Photography / Video Release Form", category: "BRAND_MARKETING", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "A photo/video shoot involving people is planned." },

  // ===================== PEOPLE (Employment — trigger-dependent, no employees yet) =====================
  { key: "offer-letter-template", name: "Offer Letter Template", category: "PEOPLE", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "h.ai hires its first employee." },
  { key: "employment-contract-template", name: "Employment Contract Template", category: "PEOPLE", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", requiresProfessionalReview: true, professionalReviewType: "HR_EMPLOYMENT_SPECIALIST", triggerCondition: "h.ai hires its first employee." },
  { key: "employee-handbook", name: "Employee Handbook", category: "PEOPLE", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "h.ai hires its first employee." },
  { key: "employee-onboarding-checklist", name: "Employee Onboarding Checklist", category: "PEOPLE", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "h.ai hires its first employee." },

  // ===================== CONTRACTORS =====================
  { key: "contractor-agreement", name: "Independent Contractor Agreement", category: "CONTRACTORS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "operations", requiresProfessionalReview: true, professionalReviewType: "LAWYER" },
  { key: "contractor-nda", name: "Contractor NDA", category: "CONTRACTORS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "operations", relatedTaskKey: "contractor-agreement-template" },
  { key: "contractor-ip-assignment", name: "Contractor IP Assignment", category: "CONTRACTORS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "operations" },
  { key: "contractor-data-terms", name: "Contractor Data Processing Terms", category: "CONTRACTORS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "operations" },
  { key: "contractor-security-schedule", name: "Contractor Security Requirements Schedule", category: "CONTRACTORS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "operations" },
  { key: "contractor-onboarding-form", name: "Contractor Onboarding Form", category: "CONTRACTORS", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED", relatedTaskKey: "contractor-onboarding-checklist" },
  { key: "contractor-access-checklist", name: "Contractor Access Checklist", category: "CONTRACTORS", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED", relatedTaskKey: "contractor-access-process" },

  // ===================== VENDORS =====================
  { key: "vendor-register", name: "Vendor Register", category: "VENDORS", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "saas-register", name: "Software / SaaS Register", category: "VENDORS", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "saas-renewal-calendar", name: "SaaS Renewal Calendar", category: "VENDORS", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "vendor-dpa-template", name: "Vendor DPA", category: "VENDORS", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "A vendor processes personal data on h.ai's behalf." },

  // ===================== PARTNERSHIPS (trigger-dependent) =====================
  { key: "mou-template", name: "Memorandum of Understanding (template)", category: "PARTNERSHIPS", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "A partnership or referral relationship is being formalized." },
  { key: "referral-agreement-template", name: "Referral Agreement (template)", category: "PARTNERSHIPS", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "A partnership or referral relationship is being formalized." },
  { key: "reseller-agreement-template", name: "Reseller Agreement (template)", category: "PARTNERSHIPS", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "A reseller relationship is being formed." },

  // ===================== ENTERPRISE_PROCUREMENT (trigger-dependent) =====================
  { key: "enterprise-vendor-registration-pack", name: "Enterprise / Government Vendor Registration Pack", category: "ENTERPRISE_PROCUREMENT", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "h.ai pursues an enterprise or government client requiring vendor registration." },
  { key: "anti-bribery-policy", name: "Anti-Bribery & Anti-Corruption Policy", category: "ENTERPRISE_PROCUREMENT", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "technical-capability-matrix", name: "Technical Capability Matrix", category: "ENTERPRISE_PROCUREMENT", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "An enterprise client requests a formal capability submission." },
  { key: "client-reference-sheet", name: "Client Reference Sheet", category: "ENTERPRISE_PROCUREMENT", priority: "P2", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "h.ai has completed enough client work to reference." },

  // ===================== RISK_INSURANCE =====================
  { key: "corporate-risk-register", name: "Corporate Risk Register", category: "RISK_INSURANCE", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "operations" },
  { key: "insurance-needs-assessment", name: "Insurance Needs Assessment", category: "RISK_INSURANCE", priority: "P0", requirementLevel: "NEEDS_VERIFICATION", lifecycleStatus: "NEEDS_CONFIRMATION", sourceType: "PROFESSIONAL_CREATED", requiredForLaunch: true, launchGateKey: "operations", relatedTaskKey: "liability-insurance-review" },
  { key: "pi-insurance-policy", name: "Professional Indemnity Policy / Quote", category: "RISK_INSURANCE", priority: "P1", requirementLevel: "TRIGGER_DEPENDENT", lifecycleStatus: "NOT_APPLICABLE", sourceType: "VENDOR_ISSUED", applicabilityStatus: "TRIGGER_DEPENDENT", triggerCondition: "Insurance needs assessment recommends professional indemnity cover." },
  { key: "code-of-ethics", name: "Code of Ethics", category: "RISK_INSURANCE", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED" },
  { key: "whistleblowing-procedure", name: "Whistleblowing Procedure", category: "RISK_INSURANCE", priority: "P2", requirementLevel: "OPTIONAL", lifecycleStatus: "NOT_STARTED" },

  // ===================== INTERNAL_OPERATIONS =====================
  { key: "document-control-procedure", name: "Document Control Procedure", category: "INTERNAL_OPERATIONS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "DRAFT_REQUIRED", requiredForLaunch: true, launchGateKey: "operations" },
  { key: "sop-master-register", name: "SOP Master Register", category: "INTERNAL_OPERATIONS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "operations", relatedTaskKey: "sops-drafted" },
  { key: "organisation-chart", name: "Organisation Chart", category: "INTERNAL_OPERATIONS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "operations" },
  { key: "roles-responsibilities-matrix", name: "Roles & Responsibilities Matrix", category: "INTERNAL_OPERATIONS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "operations", relatedTaskKey: "founder-roles-documented" },
  { key: "company-backup-procedure", name: "Company Backup Procedure", category: "INTERNAL_OPERATIONS", priority: "P0", requirementLevel: "REQUIRED", lifecycleStatus: "NOT_STARTED", requiredForLaunch: true, launchGateKey: "operations" },
  { key: "document-naming-convention", name: "Document Naming Convention", category: "INTERNAL_OPERATIONS", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED", relatedTaskKey: "file-folder-conventions" },
  { key: "delegation-of-authority-matrix", name: "Delegation of Authority Matrix", category: "INTERNAL_OPERATIONS", priority: "P1", requirementLevel: "RECOMMENDED", lifecycleStatus: "NOT_STARTED", relatedTaskKey: "approval-rights-documented" },
  { key: "knowledge-management-policy", name: "Knowledge Management Policy", category: "INTERNAL_OPERATIONS", priority: "P2", requirementLevel: "OPTIONAL", lifecycleStatus: "NOT_STARTED", relatedTaskKey: "documentation-home" },
  { key: "annual-compliance-review-checklist", name: "Annual Compliance Review Checklist", category: "INTERNAL_OPERATIONS", priority: "P2", requirementLevel: "OPTIONAL", lifecycleStatus: "NOT_STARTED" },
];

export async function seedDocuments(prisma: PrismaClient, ctx: SeedDocumentsContext) {
  const documentRecords = new Map<string, string>();

  for (const d of DOCS) {
    const rec = await prisma.document.create({
      data: {
        name: d.name,
        description: d.description,
        category: d.category,
        subcategory: d.subcategory,
        priority: d.priority,
        requirementLevel: d.requirementLevel,
        lifecycleStatus: d.lifecycleStatus,
        sourceType: d.sourceType ?? "COMPANY_CREATED",
        applicabilityStatus: d.applicabilityStatus ?? "APPLICABLE",
        triggerCondition: d.triggerCondition,
        requiredForLaunch: d.requiredForLaunch ?? false,
        launchGateId: d.launchGateKey ? ctx.gateRecords.get(d.launchGateKey) : undefined,
        requiresProfessionalReview: d.requiresProfessionalReview ?? false,
        professionalReviewType: d.professionalReviewType ?? "NONE",
        requiresSignature: d.requiresSignature ?? false,
        categoryId: d.relatedCategoryKey ? ctx.categoryRecords.get(d.relatedCategoryKey) : undefined,
        ownerId: d.ownerKey ? ctx.people[d.ownerKey] : undefined,
        relatedTaskId: d.relatedTaskKey ? ctx.taskRecords.get(d.relatedTaskKey) : undefined,
        relatedMilestoneId: d.relatedMilestoneKey ? ctx.milestoneRecords.get(d.relatedMilestoneKey) : undefined,
        notes: d.notes,
        legalDisclaimer: d.legalDisclaimer ?? false,
        version: d.lifecycleStatus === "NOT_STARTED" ? undefined : "0.1",
      },
    });
    documentRecords.set(d.key, rec.id);

    if (d.signatoryKeys?.length) {
      let sortOrder = 0;
      for (const personKey of d.signatoryKeys) {
        const personId = ctx.people[personKey];
        if (!personId) continue;
        await prisma.documentSignatory.create({
          data: { documentId: rec.id, personId, sortOrder: sortOrder++ },
        });
      }
    }
  }

  return documentRecords;
}
