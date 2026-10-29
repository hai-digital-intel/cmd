import type {
  DocumentPriority,
  DocumentRequirementLevel,
  DocumentLifecycleStatus,
  DocumentApplicabilityStatus,
  DocumentSignatureStatus,
  ProfessionalReviewType,
} from "@/lib/types";

/** Flattened, client-friendly shape for one Document row — built once on the server page. */
export interface DocumentListItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  categoryLabel: string;
  subcategory: string | null;
  priority: DocumentPriority;
  requirementLevel: DocumentRequirementLevel;
  lifecycleStatus: DocumentLifecycleStatus;
  applicabilityStatus: DocumentApplicabilityStatus;
  triggerCondition: string | null;
  requiredForLaunch: boolean;
  launchGateName: string | null;
  requiresProfessionalReview: boolean;
  professionalReviewType: ProfessionalReviewType;
  reviewerName: string | null;
  reviewSentDate: Date | null;
  reviewDueDate: Date | null;
  requiresSignature: boolean;
  signatureStatus: DocumentSignatureStatus;
  signatories: { personId: string; personName: string; signed: boolean }[];
  ownerId: string | null;
  ownerName: string | null;
  relatedTaskId: string | null;
  relatedTaskTitle: string | null;
  version: string | null;
  filePath: string | null;
  originalFileName: string | null;
  externalUrl: string | null;
  expiryDate: Date | null;
  renewalReminderDate: Date | null;
  signedDate: Date | null;
  effectiveDate: Date | null;
  notes: string | null;
  legalDisclaimer: boolean;
  createdAt: Date;
}

export interface PersonOption {
  id: string;
  name: string;
}
