/**
 * The Document Register's own 20-folder taxonomy — deliberately separate from the setup
 * `Category` model (which organizes Tasks for readiness scoring). A document's `category`
 * field holds one of these keys. See PLAN.md §10 for why these are kept distinct.
 */
export interface DocumentFolder {
  key: string;
  label: string;
  folderNumber: string; // matches the brief's logical export structure, e.g. "01"
}

export const DOCUMENT_FOLDERS: DocumentFolder[] = [
  { key: "CORPORATE", label: "Corporate & Statutory", folderNumber: "01" },
  { key: "GOVERNANCE", label: "Shareholder & Founder Governance", folderNumber: "02" },
  { key: "IP", label: "Intellectual Property", folderNumber: "03" },
  { key: "TAX_ACCOUNTING", label: "Corporate Tax & Accounting", folderNumber: "04" },
  { key: "BANKING", label: "Banking & Treasury", folderNumber: "05" },
  { key: "CLIENT_CONTRACTS", label: "Core Client Contracting", folderNumber: "06" },
  { key: "AI_LEGAL", label: "AI-Specific Client Contract Documents", folderNumber: "07" },
  { key: "PRIVACY", label: "Privacy & Data Protection", folderNumber: "08" },
  { key: "SECURITY", label: "Cybersecurity", folderNumber: "09" },
  { key: "AI_GOVERNANCE", label: "Responsible AI Governance", folderNumber: "10" },
  { key: "PROJECT_DELIVERY", label: "AI Project Delivery Templates", folderNumber: "11" },
  { key: "SALES_COMMERCIAL", label: "Sales & Commercial", folderNumber: "12" },
  { key: "BRAND_MARKETING", label: "Brand & Marketing", folderNumber: "13" },
  { key: "PEOPLE", label: "Employment", folderNumber: "14" },
  { key: "CONTRACTORS", label: "Contractors / Freelancers", folderNumber: "15" },
  { key: "VENDORS", label: "Vendors", folderNumber: "16" },
  { key: "PARTNERSHIPS", label: "Partnerships", folderNumber: "17" },
  { key: "ENTERPRISE_PROCUREMENT", label: "Government / Enterprise Procurement Readiness", folderNumber: "18" },
  { key: "RISK_INSURANCE", label: "Ethics, Insurance & Risk", folderNumber: "19" },
  { key: "INTERNAL_OPERATIONS", label: "Internal Operations", folderNumber: "20" },
];

export const DOCUMENT_FOLDER_LABEL: Record<string, string> = Object.fromEntries(
  DOCUMENT_FOLDERS.map((f) => [f.key, f.label]),
);

export function documentFolderLabel(key: string): string {
  return DOCUMENT_FOLDER_LABEL[key] ?? key;
}
