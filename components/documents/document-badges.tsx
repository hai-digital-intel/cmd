import { Badge } from "@/components/ui/badge";
import type { DocumentLifecycleStatus, DocumentPriority, DocumentApplicabilityStatus, DocumentSignatureStatus } from "@/lib/types";
import {
  lifecycleStatusLabel,
  humanizeEnum,
  LIFECYCLE_STATUS_VARIANT,
  PRIORITY_VARIANT,
  APPLICABILITY_VARIANT,
  SIGNATURE_STATUS_VARIANT,
  signatureStatusLabel,
} from "@/lib/documentFormatting";

export function LifecycleBadge({ status }: { status: DocumentLifecycleStatus }) {
  return <Badge variant={LIFECYCLE_STATUS_VARIANT[status]}>{lifecycleStatusLabel(status)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: DocumentPriority }) {
  return <Badge variant={PRIORITY_VARIANT[priority]}>{priority}</Badge>;
}

export function ApplicabilityBadge({ status }: { status: DocumentApplicabilityStatus }) {
  if (status === "APPLICABLE") return null;
  return <Badge variant={APPLICABILITY_VARIANT[status]}>{humanizeEnum(status)}</Badge>;
}

export function SignatureStatusBadge({ status }: { status: DocumentSignatureStatus }) {
  if (status === "NOT_REQUIRED") return null;
  return <Badge variant={SIGNATURE_STATUS_VARIANT[status]}>{signatureStatusLabel(status)}</Badge>;
}
