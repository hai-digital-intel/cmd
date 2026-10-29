# DATA_MODEL.md

Full schema: [`prisma/schema.prisma`](prisma/schema.prisma). This is a narrative summary —
if the two ever disagree, the schema file is authoritative.

## Hierarchy

```
Company ──< Ownership >── Person
Category ──< Milestone ──< Task ──< ChecklistItem
                │                │
                │                ├──< Evidence >── Document
                │                ├──< TaskDependency >── Task (self-referential)
                │                ├──< CostItem
                │                ├──< BlockerTask >── Blocker
                │                └──< Activity
                └──< MilestoneDependency >── Milestone (self-referential)

Category ──> LaunchGate (many categories can share one gate)
Note (quick capture, optionally converts into a Task)
PortfolioItem, WeeklyReview, Snapshot, Setting — standalone
```

Dependencies are always explicit join tables (`TaskDependency`, `MilestoneDependency`,
`BlockerTask`, `Ownership`) — never a comma-separated list of IDs in a text column.

## Entities

### Company
Single row in practice (single-tenant). `archived` + `archivedAt` implement the
setup → archived transition (section 52/53 of the brief) without a schema migration.

### Person
A stakeholder — not necessarily a login. `type` is one of `PersonType`
(FOUNDER, SHAREHOLDER, ACCOUNTANT, LAWYER, BANK, AUTHORITY, SUPPLIER, CONTRACTOR, OTHER).
`isInternal` distinguishes Haya/Mohammad from external parties like "Accountant (TBD)" —
internal people can't be deleted from the Settings UI.

### Ownership
Join table between `Company` and `Person`: `percent` + `role` (e.g. "Founder", "Shareholder").

### Category
A top-level setup area (Corporate & Legal, Banking & Finance, ...). Carries a `weight` used in
readiness math and an optional `launchGateId` — multiple categories can roll up into one gate
(e.g. Commercial Readiness + Portfolio & Proof both feed the "Commercial" gate).

### Milestone
Belongs to a `Category`. `requiredForLaunch` marks it as gating (see `computeGateStatus`).
`phase` (a `Phase` enum: FOUNDATION, LEGAL_FINANCE, BRAND_DIGITAL,
COMMERCIAL_INFRASTRUCTURE, OPERATIONAL_READINESS, LAUNCH_READY) drives the Roadmap page's
grouping. `MilestoneDependency` rows model milestone-level prerequisites for the Roadmap and
Setup Map — kept separate from task-level `TaskDependency` because a 100+ node task graph
would be unreadable on one canvas; the map renders one node per milestone.

### Task
The unit of work. Key fields beyond the obvious (`title`, `description`, `status`):

- `status` — `TaskStatus` enum: NOT_STARTED, NEXT, IN_PROGRESS, WAITING_EXTERNAL, BLOCKED,
  NEEDS_REVIEW, DONE, NOT_APPLICABLE, NEEDS_CONFIRMATION.
- `verificationLevel` — `VerificationLevel` enum: REQUIRED, RECOMMENDED, OPTIONAL,
  NEEDS_VERIFICATION, NOT_APPLICABLE. Distinct from `status`: a task can be `NOT_STARTED` and
  `OPTIONAL` at the same time. `OPTIONAL` and `NOT_APPLICABLE` tasks never block milestone
  completion (see `computeMilestoneCompletion`).
- `weight` — this task's own contribution before multiplying by milestone/category weight.
- `requiredForLaunch` — feeds the critical-path closure and the prioritization score; distinct
  from the milestone-level `requiredForLaunch` used for gate completion.
- `priorityOverride` — a founder-set manual priority that dominates the scoring formula.
- `evidenceRequired` — gates the "Complete with evidence" flow in the task detail page.
- `waitingOn` / `externalWaitUntil` / `blockedReason` — free-text + date context for
  WAITING_EXTERNAL / BLOCKED states, surfaced in Blockers → "Waiting on others" and the
  timeline projection.
- `overrideReason` — set when a task is marked done via the evidence-override path.

### TaskDependency / MilestoneDependency
`(taskId/milestoneId, dependsOnId)` pairs, unique per pair. A task/milestone is "the
dependent," `dependsOnId` is "the prerequisite." Cycle-checked at write time
(`wouldCreateCycle` in `lib/services/dependency.ts`) before a new edge is added.

### ChecklistItem
Sub-steps within a task ("Get Mohammad's signature", etc.) — used by both the task detail page
and Focus Mode's "smallest next step" prompt (the first unchecked item).

### Document (the Document Register)
Four concepts live on one row, and are deliberately kept apart:

- **Register** — *what must exist*: `name`, `description` (why it matters), `category` (one of the
  20 folder keys in `lib/documentTaxonomy.ts`, deliberately **not** the setup `Category` model —
  that one organises Tasks; `categoryId` is only an optional cross-link), `priority` (P0/P1/P2),
  `requirementLevel`, `sourceType`.
- **Governance** — *where it is in its life*: `lifecycleStatus` (17 states, NOT_STARTED →
  ACTIVE/ARCHIVED), `requiresProfessionalReview` + `professionalReviewType` + `reviewerName`,
  `reviewSentDate`, `reviewOutcomeNotes`, `requiresSignature`.
- **Readiness** — *what it blocks*: `requiredForLaunch` (curated Launch Pack membership — never
  derived from priority alone), `launchGateId`, `applicabilityStatus` + `triggerCondition`.
- **Vault** — *where the file is*: `filePath`/`originalFileName`/`fileSizeBytes`/`mimeType`
  (mirrored from whichever `DocumentVersion` is current) or an `externalUrl`.

Dates are separate concepts and never merged: `expiryDate` (hard expiry, e.g. a licence),
`reviewDueDate` (next periodic review), `renewalReminderDate`, plus `issueDate`, `effectiveDate`,
`signedDate`, `approvedDate`. `legalDisclaimer` shows the "not approved professional advice"
banner on the detail page. Signature status is **not stored** — see DocumentSignatory.

Enums (all mirrored as string-literal types in `lib/types.ts`): `DocumentPriority`,
`DocumentRequirementLevel` (REQUIRED / RECOMMENDED / OPTIONAL / NEEDS_VERIFICATION /
TRIGGER_DEPENDENT / NOT_APPLICABLE), `DocumentSourceType`, `DocumentLifecycleStatus`,
`ProfessionalReviewType`, `DocumentApplicabilityStatus`.

**What counts toward readiness** (`lib/services/documentGovernance.ts`): a document is countable
unless it is NOT_APPLICABLE or TRIGGER_DEPENDENT (by applicability *or* requirement level).
Only `ACTIVE` or `SIGNED` counts as complete — a finished draft or an approved-but-unsigned
agreement is progress, not completion; NEEDS_VERIFICATION/NEEDS_CONFIRMATION never count as
done. Weight comes from priority (P0 = 3, P1 = 1.5, P2 = 0.5), so readiness is never a raw
document count. OPTIONAL documents never block anything.

### DocumentVersion
Append-only history: `versionLabel` ("v0.2"), a human `statusLabel` ("Sent to lawyer"), file
metadata, `professionalReviewer`/`reviewOutcome`, and `isCurrent`. Adding a version flips the
previous row's `isCurrent` off and creates a new row with a new generated filename — the old
file is never overwritten or deleted (only deleting the whole document removes files).
`isCurrent` is a flag rather than a `Document.currentVersionId` pointer on purpose: a pointer
would make Document ↔ DocumentVersion circular, which complicates inserts and backup restore.

### DocumentSignatory
Join table `(documentId, personId)` unique, with `signed`, `signedDate`, `sortOrder`. This is a
**workflow tracker, not a digital-signature system.** The document's signature status
(`NOT_REQUIRED` / `NOT_READY` / `READY` / `PARTIALLY_SIGNED` / `SIGNED`) is computed from these
rows by `computeSignatureStatus`, never stored, so it can't drift.

### Evidence
Links a `Task` to proof of completion: a `Document`, a bare `url`, or a free-text `note`. A task
can have evidence without being `evidenceRequired`, and vice versa isn't enforced at the
database level — the UI is what nudges evidence-gated completion.

### CostItem
Setup spend only. `type` (ONE_TIME/RECURRING) × `status` (PLANNED/COMMITTED/PAID/UNKNOWN) ×
optional `frequency` (monthly/quarterly/annual) for recurring items — see
`lib/services/cost.ts` for how these combine into the Costs page summary. `currency` defaults
to "AED" but is per-row, not hardcoded. `relatedDocumentId` can point at the `Document` the
spend is for (e.g. a lawyer's fee for the Shareholders Agreement); the amount lives only on the
cost row, never duplicated onto the document. *(Schema-level link only — there is no UI for
setting it yet.)*

### Blocker / BlockerTask
A `Blocker` is a structured, ongoing obstacle (as opposed to a task simply being `BLOCKED`).
`waitingOnPersonId` or free-text `waitingOnText` identifies who it's on; `nextFollowUp` drives
the Blockers page sort order. `BlockerTask` links it to the task(s) it's actually holding up —
creating a blocker with related tasks also flips those tasks to `BLOCKED`. `relatedDocumentId`
optionally ties it to a `Document` — sending a document for professional review creates one
automatically (at most one open per document) and approving the review resolves it.

### Note
A quick-capture inbox item (`status`: INBOX → CONVERTED or ARCHIVED). `convertedTaskId` points
at the `Task` it became, if any. Deliberately has almost no structure at capture time — all the
categorization happens at conversion, matching the "get it out of your head first" UX goal.

### LaunchGate
One row per gate (legal, finance, tax_compliance, governance, brand, digital, commercial,
operations, security). Status isn't stored — it's always computed live from its categories'
milestones via `computeGateStatus`, so it can never drift out of sync with the underlying tasks.
Documents can also gate it: any `requiredForLaunch` document pointing at the gate (via
`Document.launchGateId`) that is countable, non-optional and not yet complete keeps the gate from
being READY, even if the gate has no milestones at all.

### Activity
An append-only human-readable log (`summary` is a full sentence, e.g. "Marked 'Finalize
shareholder agreement' as Done."). `metadata` holds JSON-encoded extra detail when useful
(e.g. an override reason). This is what powers the Activity page and per-task activity history.

### WeeklyReview / Snapshot
`Snapshot` records point-in-time readiness (`overallReadiness`, `criticalPathReadiness`,
per-category JSON, `projectedReadyDate`) — the raw material for explaining *why* a projected
date moved between two points in time (`explainDateShift` in `lib/services/timeline.ts`).
`WeeklyReview` is a lightweight rollup for the five-minute weekly-review workflow.

### PortfolioItem
Demo/case-study tracking (`stage`: CONCEPT → PROTOTYPE → DEMO_READY → CASE_STUDY_READY →
PUBLISHED). Deliberately has no relation to real client data.

### Setting
A generic `key`/JSON-`value` store for app-level config that doesn't warrant its own table:
`currency`, `companyArchived`, `minutesPerDay` (used by the timeline projection's effort → days
conversion) today; safe to add more without a migration.

## Portability

Every model uses `String @id @default(cuid())` and standard scalar types — nothing SQLite-
specific leaks into application code (no raw SQL, no SQLite-only column types). Moving to
PostgreSQL/Supabase later is a matter of changing `provider` in the `datasource` block and
`prisma.config.ts`, swapping the driver adapter in `lib/db/client.ts`, and re-running
`prisma migrate deploy` against the new database.
