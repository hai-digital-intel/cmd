/*
  Warnings:

  - You are about to drop the column `status` on the `Document` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "statusLabel" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "filePath" TEXT,
    "originalFileName" TEXT,
    "fileSizeBytes" INTEGER,
    "mimeType" TEXT,
    "notes" TEXT,
    "createdById" TEXT,
    "professionalReviewer" TEXT,
    "reviewOutcome" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentSignatory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "signed" BOOLEAN NOT NULL DEFAULT false,
    "signedDate" DATETIME,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DocumentSignatory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DocumentSignatory_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Blocker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "ownerId" TEXT,
    "waitingOnPersonId" TEXT,
    "waitingOnText" TEXT,
    "relatedDocumentId" TEXT,
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActionDate" DATETIME,
    "nextFollowUp" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolvedAt" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Blocker_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Blocker_waitingOnPersonId_fkey" FOREIGN KEY ("waitingOnPersonId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Blocker_relatedDocumentId_fkey" FOREIGN KEY ("relatedDocumentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Blocker" ("createdAt", "description", "id", "lastActionDate", "nextFollowUp", "notes", "ownerId", "resolvedAt", "startDate", "status", "title", "type", "updatedAt", "waitingOnPersonId", "waitingOnText") SELECT "createdAt", "description", "id", "lastActionDate", "nextFollowUp", "notes", "ownerId", "resolvedAt", "startDate", "status", "title", "type", "updatedAt", "waitingOnPersonId", "waitingOnText" FROM "Blocker";
DROP TABLE "Blocker";
ALTER TABLE "new_Blocker" RENAME TO "Blocker";
CREATE TABLE "new_CostItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendor" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AED',
    "vat" REAL,
    "type" TEXT NOT NULL DEFAULT 'ONE_TIME',
    "frequency" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANNED',
    "paymentDate" DATETIME,
    "renewalDate" DATETIME,
    "relatedTaskId" TEXT,
    "relatedDocumentId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CostItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CostItem_relatedTaskId_fkey" FOREIGN KEY ("relatedTaskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "CostItem_relatedDocumentId_fkey" FOREIGN KEY ("relatedDocumentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_CostItem" ("amount", "categoryId", "createdAt", "currency", "description", "frequency", "id", "notes", "paymentDate", "relatedTaskId", "renewalDate", "status", "type", "updatedAt", "vat", "vendor") SELECT "amount", "categoryId", "createdAt", "currency", "description", "frequency", "id", "notes", "paymentDate", "relatedTaskId", "renewalDate", "status", "type", "updatedAt", "vat", "vendor" FROM "CostItem";
DROP TABLE "CostItem";
ALTER TABLE "new_CostItem" RENAME TO "CostItem";
CREATE TABLE "new_Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "documentType" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'COMPANY_CREATED',
    "priority" TEXT NOT NULL DEFAULT 'P1',
    "requirementLevel" TEXT NOT NULL DEFAULT 'RECOMMENDED',
    "lifecycleStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "applicabilityStatus" TEXT NOT NULL DEFAULT 'APPLICABLE',
    "triggerCondition" TEXT,
    "requiredForLaunch" BOOLEAN NOT NULL DEFAULT false,
    "launchGateId" TEXT,
    "requiresProfessionalReview" BOOLEAN NOT NULL DEFAULT false,
    "professionalReviewType" TEXT NOT NULL DEFAULT 'NONE',
    "reviewerName" TEXT,
    "reviewSentDate" DATETIME,
    "reviewDueDate" DATETIME,
    "reviewOutcomeNotes" TEXT,
    "requiresSignature" BOOLEAN NOT NULL DEFAULT false,
    "categoryId" TEXT,
    "ownerId" TEXT,
    "relatedTaskId" TEXT,
    "relatedMilestoneId" TEXT,
    "version" TEXT DEFAULT '1.0',
    "filePath" TEXT,
    "originalFileName" TEXT,
    "fileSizeBytes" INTEGER,
    "mimeType" TEXT,
    "externalUrl" TEXT,
    "issueDate" DATETIME,
    "effectiveDate" DATETIME,
    "expiryDate" DATETIME,
    "renewalReminderDate" DATETIME,
    "signedDate" DATETIME,
    "approvedDate" DATETIME,
    "notes" TEXT,
    "legalDisclaimer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "archivedAt" DATETIME,
    CONSTRAINT "Document_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Person" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_relatedTaskId_fkey" FOREIGN KEY ("relatedTaskId") REFERENCES "Task" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_relatedMilestoneId_fkey" FOREIGN KEY ("relatedMilestoneId") REFERENCES "Milestone" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Document_launchGateId_fkey" FOREIGN KEY ("launchGateId") REFERENCES "LaunchGate" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Document" ("category", "categoryId", "createdAt", "documentType", "expiryDate", "externalUrl", "filePath", "fileSizeBytes", "id", "issueDate", "mimeType", "name", "notes", "originalFileName", "ownerId", "relatedMilestoneId", "relatedTaskId", "renewalReminderDate", "updatedAt", "version") SELECT "category", "categoryId", "createdAt", "documentType", "expiryDate", "externalUrl", "filePath", "fileSizeBytes", "id", "issueDate", "mimeType", "name", "notes", "originalFileName", "ownerId", "relatedMilestoneId", "relatedTaskId", "renewalReminderDate", "updatedAt", "version" FROM "Document";
DROP TABLE "Document";
ALTER TABLE "new_Document" RENAME TO "Document";
CREATE INDEX "Document_lifecycleStatus_idx" ON "Document"("lifecycleStatus");
CREATE INDEX "Document_category_idx" ON "Document"("category");
CREATE INDEX "Document_requiredForLaunch_idx" ON "Document"("requiredForLaunch");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "DocumentVersion_documentId_idx" ON "DocumentVersion"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentSignatory_documentId_personId_key" ON "DocumentSignatory"("documentId", "personId");
